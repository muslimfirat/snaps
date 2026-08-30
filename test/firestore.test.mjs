/**
 * Firestore subcollection migration + delta-sync + security-rules tests.
 *
 * Requires the Firebase emulator. Run via:  npm run test:rules
 * (which wraps this file in `firebase emulators:exec`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

import {
  syncUserDataToFirestore,
  syncCollectionDelta,
  fetchAllCollections,
  migrateUserToSubcollections,
} from '../src/lib/firestoreSync.ts';
import {
  createInstitution,
  seedDemoInstitution,
  fetchMyInstitution,
  syncInstitutionToFirestore,
} from '../src/lib/institutionStore.ts';

const PROJECT_ID = 'siapp-e1be9';

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

const aliceDb = testEnv.authenticatedContext('alice').firestore();
const bobDb = testEnv.authenticatedContext('bob').firestore();

test.afterEach(async () => {
  await testEnv.clearFirestore();
});

test.after(async () => {
  await testEnv.cleanup();
});

const snap = (id, withImage = false) => ({
  id,
  timestamp: '2026-08-30T10:00:00.000Z',
  subject: 'Matematik',
  topic: 'Türev',
  questionSummary: `soru ${id}`,
  correctOption: 'A',
  ...(withImage ? { imageUrl: 'data:image/png;base64,' + 'A'.repeat(5000) } : {}),
});

test('scenario 1: legacy single-doc user is migrated into subcollections', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', 'alice'), {
      userId: 'alice',
      profile: { name: 'Alice', targetExam: 'KPSS' },
      snaps: [snap('s1'), snap('s2')],
      mistakes: [{ id: 'm1', title: 'x', subject: 'M', topic: 'T', examType: 'KPSS' }],
      mockExams: [],
    });
  });

  const migrated = await migrateUserToSubcollections('alice', aliceDb);
  assert.equal(migrated, true);

  const main = await getDoc(doc(aliceDb, 'users', 'alice'));
  assert.equal(main.data().snaps, undefined, 'snaps array dropped from main doc');
  assert.equal(main.data().mistakes, undefined, 'mistakes array dropped');
  assert.equal(main.data().mockExams, undefined, 'empty mockExams array dropped');
  assert.deepEqual(main.data().profile, { name: 'Alice', targetExam: 'KPSS' });

  const snaps = await getDocs(collection(aliceDb, 'users', 'alice', 'snaps'));
  assert.equal(snaps.size, 2);
  const mistakes = await getDocs(collection(aliceDb, 'users', 'alice', 'mistakes'));
  assert.equal(mistakes.size, 1);

  // Second run is a no-op.
  const again = await migrateUserToSubcollections('alice', aliceDb);
  assert.equal(again, false);
});

test('scenario 1b: user with no legacy arrays needs no migration', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', 'alice'), {
      userId: 'alice',
      profile: { name: 'Alice', targetExam: 'KPSS' },
    });
  });
  assert.equal(await migrateUserToSubcollections('alice', aliceDb), false);
});

test('scenario 2: many photo snaps become one image-free doc each', async () => {
  const snaps = Array.from({ length: 25 }, (_, i) => snap(`s${i}`, true));
  await syncUserDataToFirestore('alice', { snaps }, aliceDb);

  const stored = await getDocs(collection(aliceDb, 'users', 'alice', 'snaps'));
  assert.equal(stored.size, 25);
  for (const d of stored.docs) {
    assert.equal(d.data().imageUrl, undefined, 'base64 image stripped before cloud write');
    assert.ok(JSON.stringify(d.data()).length < 900_000);
  }
});

test('scenario 3: full-list sync deletes removed items; second device reads them', async () => {
  await syncUserDataToFirestore('alice', { snaps: [snap('a'), snap('b'), snap('c')] }, aliceDb);

  // Device A removes "b".
  await syncUserDataToFirestore('alice', { snaps: [snap('a'), snap('c')] }, aliceDb);

  const ids = (await getDocs(collection(aliceDb, 'users', 'alice', 'snaps'))).docs
    .map((d) => d.id)
    .sort();
  assert.deepEqual(ids, ['a', 'c']);

  // Device B (same user) pulls the full picture.
  const cloud = await fetchAllCollections('alice', aliceDb);
  assert.deepEqual(cloud.snaps.map((s) => s.id).sort(), ['a', 'c']);
});

test('scenario 3b: syncCollectionDelta applies an explicit upsert + delete', async () => {
  await syncCollectionDelta('alice', 'flashcards', [
    { id: 'f1', category: 'c', front: 'a', back: 'b', tag: 't' },
    { id: 'f2', category: 'c', front: 'a', back: 'b', tag: 't' },
  ], [], aliceDb);
  await syncCollectionDelta('alice', 'flashcards', [], ['f1'], aliceDb);

  const cloud = await fetchAllCollections('alice', aliceDb);
  assert.deepEqual(cloud.flashcards.map((f) => f.id), ['f2']);
});

test('scenario 4: another user cannot touch someone else\'s subcollection', async () => {
  await syncUserDataToFirestore('alice', { snaps: [snap('secret')] }, aliceDb);

  await assertFails(getDoc(doc(bobDb, 'users', 'alice', 'snaps', 'secret')));
  await assertFails(
    setDoc(doc(bobDb, 'users', 'alice', 'snaps', 'x'), { id: 'x', hacked: true }),
  );
  await assertSucceeds(getDoc(doc(aliceDb, 'users', 'alice', 'snaps', 'secret')));
});

test('fetchAllCollections returns null for a brand-new user with nothing stored', async () => {
  const ghostDb = testEnv.authenticatedContext('ghost').firestore();
  assert.equal(await fetchAllCollections('ghost', ghostDb), null);
});

// --- Faz 3b: institution portal membership -------------------------------------

const CREATE_FORM = {
  name: 'Zafer VIP Kursu',
  branch: 'Çayyolu',
  directorName: 'K. Vural',
  phone: '0312 000 00 00',
};

test('institution: owner creates it, a non-member cannot read it', async () => {
  const account = await createInstitution('alice', 'alice@example.com', CREATE_FORM, aliceDb);
  assert.equal(account.ownerUid, 'alice');
  assert.deepEqual(account.memberUids, ['alice']);
  assert.equal(account.classGroups.length, 1);

  // Owner reads their own institution back via the array-contains query.
  const mine = await fetchMyInstitution('alice', aliceDb);
  assert.equal(mine?.id, account.id);
  assert.equal(mine?.name, 'Zafer VIP Kursu');

  // Bob is not a member → get denied, and the query returns nothing.
  await assertFails(getDoc(doc(bobDb, 'institutions', account.id)));
  assert.equal(await fetchMyInstitution('bob', bobDb), null);
});

test('institution: added member reads it but cannot change the owner', async () => {
  const account = await createInstitution('alice', 'alice@example.com', CREATE_FORM, aliceDb);

  // Alice adds Bob as a member (allowed: owner unchanged, still a member herself).
  await assertSucceeds(
    updateDoc(doc(aliceDb, 'institutions', account.id), { memberUids: ['alice', 'bob'] }),
  );

  const bobView = await fetchMyInstitution('bob', bobDb);
  assert.equal(bobView?.id, account.id);

  // Bob (a member) may edit content...
  await assertSucceeds(syncInstitutionToFirestore(account.id, { phone: '0312 111 11 11' }, bobDb));

  // ...but may not seize ownership.
  await assertFails(
    updateDoc(doc(bobDb, 'institutions', account.id), { ownerUid: 'bob' }),
  );
});

test('institution: cannot be created claiming someone else as owner', async () => {
  await assertFails(
    setDoc(doc(collection(bobDb, 'institutions')), {
      ownerUid: 'alice',
      memberUids: ['alice'],
      ownerEmail: 'alice@example.com',
      name: 'Fake',
    }),
  );
  // ...nor with an owner who is not in memberUids.
  await assertFails(
    setDoc(doc(collection(bobDb, 'institutions')), {
      ownerUid: 'bob',
      memberUids: ['someone-else'],
      ownerEmail: 'bob@example.com',
      name: 'Fake',
    }),
  );
});

test('institution: seedDemoInstitution fills sample class/student/exam data', async () => {
  const carolDb = testEnv.authenticatedContext('carol').firestore();
  const account = await seedDemoInstitution('carol', 'carol@example.com', carolDb);
  assert.ok(account.classGroups.length >= 1);
  assert.ok(account.students.length >= 1);
  assert.ok(account.institutionExams.length >= 1);

  const stored = await fetchMyInstitution('carol', carolDb);
  assert.equal(stored?.students.length, account.students.length);
});
