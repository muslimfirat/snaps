/**
 * ⚠️ DEMO ONLY — NOT REAL AUTHENTICATION
 *
 * This module implements the institution ("dershane") portal as a fully client-side
 * demo. Passwords are stored in plaintext in localStorage and compared in the
 * browser; there is no server, no session token, and no data isolation beyond the
 * current browser profile. Seed accounts and all student records
 * ([institutionData.ts]) are fictional sample data.
 *
 * Do NOT use this for real institutions or real student PII. Turning the portal
 * into a real feature is tracked as "Faz 3 → Gerçek özellik" in fazlar.md
 * (move accounts to Firestore + Firebase Auth, protect student data with rules).
 */
import {
  InstitutionAccount,
  InstitutionAuthSession,
  InstitutionConfig,
  ClassGroup,
  StudentRecord,
  InstitutionExam
} from '../types';
import { 
  DEFAULT_INSTITUTION_CONFIG, 
  DEFAULT_CLASS_GROUPS, 
  DEFAULT_STUDENTS, 
  DEFAULT_INSTITUTION_EXAMS 
} from '../data/institutionData';

const AUTH_STORAGE_KEYS = {
  ACCOUNTS: 'snaps_institution_accounts_list',
  CURRENT_SESSION: 'snaps_current_institution_session_v2',
};

// Initial Seed Accounts for Multiple Institutions
export const INITIAL_INSTITUTION_ACCOUNTS: InstitutionAccount[] = [
  {
    id: 'inst-hedef',
    email: 'hedef@akademi.k12.tr',
    password: 'hedef2026',
    name: 'Hedef Akademi VIP Hazırlık',
    branch: 'Kızılay Merkez Şube / VIP Koçluk',
    directorName: 'Uzm. Psk. Dan. Mehmet Kaya',
    phone: '0 (312) 419 00 00',
    logoText: 'HA',
    themeColor: '#4f46e5',
    config: {
      ...DEFAULT_INSTITUTION_CONFIG,
      name: 'Hedef Akademi VIP Hazırlık',
      branch: 'Kızılay Merkez Şube / VIP Koçluk',
      directorName: 'Uzm. Psk. Dan. Mehmet Kaya',
      phone: '0 (312) 419 00 00',
      logoText: 'HA',
      themeColor: '#4f46e5',
    },
    classGroups: DEFAULT_CLASS_GROUPS,
    students: DEFAULT_STUDENTS,
    institutionExams: DEFAULT_INSTITUTION_EXAMS,
    createdAt: '2025-08-01',
    lastLoginAt: '2026-08-24 10:15',
  },
  {
    id: 'inst-ozdebir',
    email: 'ozdebir@bilim.k12.tr',
    password: 'ozdebir2026',
    name: 'Özdebir & Pegem Bilim Kursu',
    branch: 'Kadıköy Şubesi / Fen & Anadolu',
    directorName: 'Dr. Serdar Yılmaz (Kurucu Müdür)',
    phone: '0 (216) 345 67 89',
    logoText: 'ÖP',
    themeColor: '#0284c7',
    config: {
      name: 'Özdebir & Pegem Bilim Kursu',
      branch: 'Kadıköy Şubesi / Fen & Anadolu',
      slogan: 'Bilim ve Başarının Buluştuğu Adres',
      logoText: 'ÖP',
      themeColor: '#0284c7',
      directorName: 'Dr. Serdar Yılmaz (Kurucu Müdür)',
      phone: '0 (216) 345 67 89',
      announcement: '📌 12. Sınıflar için AYT Matematik Kampı haftaya Cumartesi başlıyor.',
      customExamWeights: true,
      activePlanId: 'plan-annual-enterprise',
      studentQuota: 120,
      planBillingCycle: 'ANNUAL',
      planExpiryDate: '15.10.2027',
    },
    classGroups: [
      {
        id: 'grp-oz-1',
        name: '12-EA Hukuk & Psikoloji Derece',
        examType: 'YKS_ESITAGIRLIK',
        coachTeacher: 'Bahar Hoca (Matematik)',
        roomNumber: 'Derslik 101',
        targetScoreAverage: '88.5 Net',
      },
      {
        id: 'grp-oz-2',
        name: 'KPSS Eğitim Bilimleri & ÖABT VIP',
        examType: 'KPSS_LISANS',
        coachTeacher: 'Cem Hoca (Gelişim Psikolojisi)',
        roomNumber: 'Derslik 204',
        targetScoreAverage: '91.0',
      },
      {
        id: 'grp-oz-3',
        name: '12-SAY Tıp & Mühendislik Grubu',
        examType: 'YKS_SAYISAL',
        coachTeacher: 'Tarık Hoca (Fizik)',
        roomNumber: 'Derslik 302',
        targetScoreAverage: '104.0 Net',
      },
    ],
    students: [
      {
        id: 'std-oz-1',
        studentNumber: '302601',
        name: 'Selim Yıldız',
        classGroupId: 'grp-oz-1',
        targetExam: 'YKS_ESITAGIRLIK',
        targetScore: '92.0 Net',
        phone: '0535 777 88 99',
        attendancePercent: 98,
        totalQuestionsSolved: 1680,
        averageNet: 89.25,
        latestMockNet: 91.5,
        latestMockTitle: 'Özdebir EA TG-4',
        errorCount: 11,
        weakSubjects: ['Matematik (Trigonometri)', 'Edebiyat (Cumhuriyet Dönemi)'],
        coachNotes: 'Edebiyat hafıza kartlarını bitirdi, netleri düzenli artıyor.',
        status: 'HIGH',
        joinedDate: '01.09.2025',
      },
      {
        id: 'std-oz-2',
        studentNumber: '302602',
        name: 'Derya Çelik',
        classGroupId: 'grp-oz-1',
        targetExam: 'YKS_ESITAGIRLIK',
        targetScore: '87.5 Net',
        phone: '0541 333 22 11',
        attendancePercent: 94,
        totalQuestionsSolved: 1340,
        averageNet: 83.5,
        latestMockNet: 85.75,
        latestMockTitle: 'Özdebir EA TG-4',
        errorCount: 22,
        weakSubjects: ['Tarih (Çağdaş Türk)', 'Coğrafya (Harita Bilgisi)'],
        coachNotes: 'Paragraf hız pratiklerini her sabah 20 soru olarak yapıyor.',
        status: 'HIGH',
        joinedDate: '05.09.2025',
      },
      {
        id: 'std-oz-3',
        studentNumber: '302603',
        name: 'Tolga Arslan',
        classGroupId: 'grp-oz-2',
        targetExam: 'KPSS_LISANS',
        targetScore: '88.0',
        phone: '0506 999 88 77',
        attendancePercent: 82,
        totalQuestionsSolved: 820,
        averageNet: 73.0,
        latestMockNet: 70.5,
        latestMockTitle: 'Pegem Pro Deneme-2',
        errorCount: 35,
        weakSubjects: ['Eğitim (Öğrenme Psikolojisi)', 'Vatandaşlık'],
        coachNotes: 'Haftalık etüt saatlerine daha düzenli katılması gerekiyor.',
        status: 'NEEDS_ATTENTION',
        joinedDate: '12.09.2025',
      },
      {
        id: 'std-oz-4',
        studentNumber: '302604',
        name: 'Merve Bulut',
        classGroupId: 'grp-oz-3',
        targetExam: 'YKS_SAYISAL',
        targetScore: '106.0 Net',
        phone: '0552 444 66 88',
        attendancePercent: 96,
        totalQuestionsSolved: 2350,
        averageNet: 101.5,
        latestMockNet: 103.75,
        latestMockTitle: 'Özdebir SAY TG-4',
        errorCount: 14,
        weakSubjects: ['AYT Kimya (Organik)', 'AYT Fizik (Modern Fizik)'],
        coachNotes: 'Derece grubu öğrencisi, AYT denemelerinde istikrarlı.',
        status: 'HIGH',
        joinedDate: '01.09.2025',
      },
      {
        id: 'std-oz-5',
        studentNumber: '302605',
        name: 'Kaan Koç',
        classGroupId: 'grp-oz-3',
        targetExam: 'YKS_SAYISAL',
        targetScore: '98.0 Net',
        phone: '0530 111 44 77',
        attendancePercent: 90,
        totalQuestionsSolved: 1420,
        averageNet: 88.0,
        latestMockNet: 89.25,
        latestMockTitle: 'Özdebir SAY TG-4',
        errorCount: 20,
        weakSubjects: ['AYT Biyoloji (Sistemler)', 'Geometri (Analitik)'],
        coachNotes: 'Haftalık 300 soru hedefini eksiksiz tamamlıyor.',
        status: 'STABLE',
        joinedDate: '10.09.2025',
      },
    ],
    institutionExams: [
      {
        id: 'inst-exam-oz-1',
        title: 'Özdebir Türkiye Geneli EA TG-4 Denemesi',
        examType: 'YKS_ESITAGIRLIK',
        classGroupId: 'grp-oz-1',
        date: '2026-08-15',
        participantCount: 28,
        averageNet: 85.4,
        highestNet: 97.25,
        lowestNet: 62.0,
        sectionAverages: [
          { name: 'TYT Türkçe (40 Soru)', avgNet: 32.4, targetNet: 35.0, successRate: 81.0 },
          { name: 'TYT Matematik (40 Soru)', avgNet: 28.1, targetNet: 32.0, successRate: 70.2 },
          { name: 'AYT Matematik (40 Soru)', avgNet: 26.5, targetNet: 30.0, successRate: 66.2 },
          { name: 'AYT Edebiyat-Sosyal (40 Soru)', avgNet: 31.2, targetNet: 34.0, successRate: 78.0 },
        ],
        weakTopics: [
          'AYT Matematik: İntegral ve Alan (Başarı: %45)',
          'Edebiyat: Divan Edebiyatı Nazım Şekilleri (Başarı: %52)',
        ],
      },
    ],
    createdAt: '2025-08-15',
    lastLoginAt: '2026-08-23 14:20',
  },
  {
    id: 'inst-kuzey',
    email: 'kuzey@vipkurs.com',
    password: 'kuzey2026',
    name: 'Kuzey VIP Sınav Kursu',
    branch: 'Beşiktaş VIP Şube',
    directorName: 'Canan Koç (Rehberlik Koordinatörü)',
    phone: '0 (212) 259 88 99',
    logoText: 'KV',
    themeColor: '#059669',
    config: {
      name: 'Kuzey VIP Sınav Kursu',
      branch: 'Beşiktaş VIP Şube',
      slogan: 'Birebir VIP Koçluk ve Yüksek Net Garantisi',
      logoText: 'KV',
      themeColor: '#059669',
      directorName: 'Canan Koç (Rehberlik Koordinatörü)',
      phone: '0 (212) 259 88 99',
      announcement: '📢 Sınav stratejileri ve zaman yönetimi semineri bu Cuma saat 18:00\'de.',
      customExamWeights: true,
      activePlanId: 'plan-50',
      studentQuota: 50,
      planBillingCycle: 'ANNUAL',
      planExpiryDate: '30.06.2027',
    },
    classGroups: [
      {
        id: 'grp-kz-1',
        name: 'VIP Sayısal Derece Grubu',
        examType: 'YKS_SAYISAL',
        coachTeacher: 'Eren Hoca (Geometri)',
        roomNumber: 'VIP Salon 1',
        targetScoreAverage: '108.0 Net',
      },
    ],
    students: [
      {
        id: 'std-kz-1',
        studentNumber: '402601',
        name: 'Batuhan Kaya',
        classGroupId: 'grp-kz-1',
        targetExam: 'YKS_SAYISAL',
        targetScore: '110.0 Net',
        phone: '0543 888 11 22',
        attendancePercent: 100,
        totalQuestionsSolved: 2800,
        averageNet: 105.5,
        latestMockNet: 108.25,
        latestMockTitle: 'Kuzey VIP TYT-5',
        errorCount: 8,
        weakSubjects: ['AYT Fizik (Dalga Mekaniği)'],
        coachNotes: 'Türkiye geneli ilk 1000 potansiyeli yüksek.',
        status: 'HIGH',
        joinedDate: '01.08.2025',
      },
      {
        id: 'std-kz-2',
        studentNumber: '402602',
        name: 'Buse Şengül',
        classGroupId: 'grp-kz-1',
        targetExam: 'YKS_SAYISAL',
        targetScore: '102.0 Net',
        phone: '0531 555 77 99',
        attendancePercent: 95,
        totalQuestionsSolved: 1900,
        averageNet: 96.0,
        latestMockNet: 98.5,
        latestMockTitle: 'Kuzey VIP TYT-5',
        errorCount: 16,
        weakSubjects: ['TYT Türkçe (Cümlede Anlam)'],
        coachNotes: 'Hız testlerinde süreyi 5 dakika daha iyileştirdi.',
        status: 'HIGH',
        joinedDate: '10.08.2025',
      },
    ],
    institutionExams: [],
    createdAt: '2025-08-20',
    lastLoginAt: '2026-08-24 09:30',
  },
];

/**
 * Loads all institution accounts from localStorage, seeding with initial accounts if empty.
 */
export function getInstitutionAccounts(): InstitutionAccount[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.ACCOUNTS);
    if (raw) {
      const parsed: InstitutionAccount[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load institution accounts:', e);
  }

  // Seed default accounts
  saveInstitutionAccounts(INITIAL_INSTITUTION_ACCOUNTS);
  return INITIAL_INSTITUTION_ACCOUNTS;
}

/**
 * Saves all institution accounts to localStorage.
 */
export function saveInstitutionAccounts(accounts: InstitutionAccount[]): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save institution accounts:', e);
  }
}

/**
 * Returns current authenticated institution session, or null if logged out.
 */
export function getCurrentInstitutionSession(): InstitutionAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_SESSION);
    if (!raw) return null;
    const session: InstitutionAuthSession = JSON.parse(raw);
    if (session && session.isAuthenticated && session.institutionId) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sets or clears the active institution session in localStorage.
 */
export function setCurrentInstitutionSession(session: InstitutionAuthSession | null): void {
  try {
    if (session) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_SESSION);
    }
  } catch (e) {
    console.error('Failed to update institution auth session:', e);
  }
}

/**
 * Authenticates an institution by email and password.
 */
export function loginInstitution(
  email: string, 
  password: string
): { success: boolean; account?: InstitutionAccount; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, error: 'Lütfen kurumsal e-posta ve şifrenizi giriniz.' };
  }

  const accounts = getInstitutionAccounts();
  const found = accounts.find((acc) => acc.email.toLowerCase() === cleanEmail);

  if (!found) {
    return { 
      success: false, 
      error: 'Bu kurumsal e-posta ile kayıtlı bir dershane bulunamadı. Lütfen e-postanızı kontrol edin veya yeni kurum kaydı oluşturun.' 
    };
  }

  if (found.password !== cleanPassword) {
    return { 
      success: false, 
      error: 'Hatalı şifre girdiniz. Lütfen kurum şifrenizi kontrol edip tekrar deneyiniz.' 
    };
  }

  // Login successful -> Create Session and update lastLogin
  const updatedAccounts = accounts.map((acc) => {
    if (acc.id === found.id) {
      return {
        ...acc,
        lastLoginAt: new Date().toLocaleString('tr-TR'),
      };
    }
    return acc;
  });
  saveInstitutionAccounts(updatedAccounts);

  const session: InstitutionAuthSession = {
    isAuthenticated: true,
    institutionId: found.id,
    email: found.email,
    name: found.name,
    branch: found.branch,
    directorName: found.directorName,
    loginTimestamp: Date.now(),
  };
  setCurrentInstitutionSession(session);

  return { success: true, account: found };
}

/**
 * Registers a new institution account with isolated data.
 */
export function registerInstitution(newInstitutionData: {
  name: string;
  branch: string;
  directorName: string;
  email: string;
  password: string;
  phone: string;
  logoText?: string;
  themeColor?: string;
}): { success: boolean; account?: InstitutionAccount; error?: string } {
  const { name, branch, directorName, email, password, phone } = newInstitutionData;
  const cleanEmail = email.trim().toLowerCase();

  if (!name.trim() || !cleanEmail || !password.trim()) {
    return { success: false, error: 'Kurum adı, kurumsal e-posta ve şifre zorunludur.' };
  }

  if (password.trim().length < 4) {
    return { success: false, error: 'Şifre en az 4 karakter olmalıdır.' };
  }

  const accounts = getInstitutionAccounts();
  const exists = accounts.some((acc) => acc.email.toLowerCase() === cleanEmail);

  if (exists) {
    return { success: false, error: 'Bu e-posta adresi ile zaten kayıtlı bir dershane bulunmaktadır.' };
  }

  const newId = `inst-${Date.now()}`;
  const logoText = newInstitutionData.logoText || name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'KD';

  const newConfig: InstitutionConfig = {
    name: name.trim(),
    branch: branch.trim() || 'Merkez Şube',
    slogan: 'Snaps Yapay Zeka Destekli Kurumsal Sınav Hazırlık',
    logoText,
    themeColor: newInstitutionData.themeColor || '#4f46e5',
    directorName: directorName.trim() || 'Kurum Müdürü',
    phone: phone.trim() || '0212 000 00 00',
    announcement: '📢 Kurumumuza hoş geldiniz! Deneme sınavlarınızı ve öğrenci listelerinizi bu panelden yönetebilirsiniz.',
    customExamWeights: true,
    activePlanId: 'plan-annual-enterprise',
    studentQuota: 100,
    planBillingCycle: 'ANNUAL',
    planExpiryDate: '01.09.2027',
  };

  // Create initial sample class for the new institution
  const initialClass: ClassGroup = {
    id: `grp-${newId}-1`,
    name: `${name} 1. Sınıf & Zümre`,
    examType: 'YKS_SAYISAL',
    coachTeacher: directorName.trim() || 'Rehberlik Servisi',
    roomNumber: 'Derslik 101',
    targetScoreAverage: '85.0 Net',
  };

  const newAccount: InstitutionAccount = {
    id: newId,
    email: cleanEmail,
    password: password.trim(),
    name: name.trim(),
    branch: branch.trim() || 'Merkez Şube',
    directorName: directorName.trim() || 'Kurum Yöneticisi',
    phone: phone.trim() || '0212 000 00 00',
    logoText,
    themeColor: newInstitutionData.themeColor || '#4f46e5',
    config: newConfig,
    classGroups: [initialClass],
    students: [],
    institutionExams: [],
    createdAt: new Date().toISOString().split('T')[0],
    lastLoginAt: new Date().toLocaleString('tr-TR'),
  };

  const updatedAccounts = [...accounts, newAccount];
  saveInstitutionAccounts(updatedAccounts);

  // Auto-login newly registered institution
  const session: InstitutionAuthSession = {
    isAuthenticated: true,
    institutionId: newAccount.id,
    email: newAccount.email,
    name: newAccount.name,
    branch: newAccount.branch,
    directorName: newAccount.directorName,
    loginTimestamp: Date.now(),
  };
  setCurrentInstitutionSession(session);

  return { success: true, account: newAccount };
}

/**
 * Logs out the active institution session.
 */
export function logoutInstitution(): void {
  setCurrentInstitutionSession(null);
}

/**
 * Synchronizes and persists data for a specific institution into the accounts store.
 */
export function syncInstitutionData(
  institutionId: string, 
  data: {
    config?: InstitutionConfig;
    classGroups?: ClassGroup[];
    students?: StudentRecord[];
    institutionExams?: InstitutionExam[];
  }
): void {
  const accounts = getInstitutionAccounts();
  const updated = accounts.map((acc) => {
    if (acc.id === institutionId) {
      return {
        ...acc,
        config: data.config ? data.config : acc.config,
        classGroups: data.classGroups ? data.classGroups : acc.classGroups,
        students: data.students ? data.students : acc.students,
        institutionExams: data.institutionExams ? data.institutionExams : acc.institutionExams,
        name: data.config?.name || acc.name,
        branch: data.config?.branch || acc.branch,
        directorName: data.config?.directorName || acc.directorName,
        phone: data.config?.phone || acc.phone,
        logoText: data.config?.logoText || acc.logoText,
        themeColor: data.config?.themeColor || acc.themeColor,
      };
    }
    return acc;
  });
  saveInstitutionAccounts(updated);
}

/**
 * Gets a specific institution account by ID.
 */
export function getInstitutionAccountById(institutionId: string): InstitutionAccount | undefined {
  const accounts = getInstitutionAccounts();
  return accounts.find((acc) => acc.id === institutionId);
}
