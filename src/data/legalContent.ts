/**
 * Yasal metinler — KVKK Aydınlatma Metni, Gizlilik Politikası ve Kullanım Koşulları.
 *
 * ÖNEMLİ: Bu metinler uygulamanın gerçekte yaptığı veri işlemesine göre hazırlanmış
 * bir taslaktır. Yayına çıkmadan önce köşeli parantezli alanları ([Şirket Adı],
 * [e-posta] vb.) doldurun ve bir hukuk danışmanına inceletin.
 */

/** Onay kutusu bu sürümü kaydeder; metin önemli ölçüde değişirse artırın. */
export const LEGAL_VERSION = '2026-08-31';

export const LEGAL_COMPANY = {
  name: '[Şirket / Veri Sorumlusu Adı]',
  contactEmail: '[iletisim@ornek.com]',
  address: '[Açık adres]',
};

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  id: 'privacy' | 'terms';
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY_DOC: LegalDoc = {
  id: 'privacy',
  title: 'Gizlilik Politikası & KVKK Aydınlatma Metni',
  updated: LEGAL_VERSION,
  intro:
    `Snaps ("Uygulama"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında ` +
    `veri sorumlusu sıfatıyla ${LEGAL_COMPANY.name} tarafından işletilir. Bu metin, Uygulamayı ` +
    `kullanırken hangi verilerin, hangi amaçla işlendiğini ve haklarınızı açıklar.`,
  sections: [
    {
      heading: '1. İşlenen Veriler',
      body: [
        '• Profil bilgileri: ad/hitap şekliniz, hedef sınav, hedef puan, sınav tarihi, günlük çalışma hedefleri.',
        '• Çalışma verileri: çözdüğünüz soru sayısı, çalışma süreleri, çalışma serisi (streak), deneme sonuçları, hata defteri kayıtları, konu ilerlemesi, ders notu ilerlemesi.',
        '• Yapay zekaya gönderdiğiniz içerik: soru çözümü için yüklediğiniz fotoğraflar/metinler ve koça yazdığınız mesajlar.',
        '• Hesap açarsanız (Google ile giriş): Google hesabınızın adı, e-posta adresi ve profil fotoğrafı bağlantısı.',
        '• Teknik veriler: yalnızca uygulamanın çalışması için gerekli, anonim hata kayıtları (isteğe bağlı olarak kapatılabilir).',
      ],
    },
    {
      heading: '2. Verilerin Saklandığı Yer',
      body: [
        '• Hesap açmazsanız tüm verileriniz yalnızca kullandığınız cihazın tarayıcısında (localStorage / IndexedDB) saklanır; sunucularımıza gönderilmez.',
        '• Google ile giriş yaparsanız profil ve çalışma verileriniz, cihazlar arası yedekleme amacıyla Google Firebase (Firestore) üzerinde hesabınıza bağlı olarak saklanır. Yüklediğiniz görseller buluta gönderilmez, yalnızca yükleme yaptığınız cihazda kalır.',
      ],
    },
    {
      heading: '3. Yapay Zeka İşlemesi',
      body: [
        'Soru çözümü ve koçluk özellikleri için gönderdiğiniz metin ve görseller, yanıt üretilmesi amacıyla Google (Gemini API) altyapısına iletilir. Bu içerik yalnızca ilgili yanıtın üretilmesi için kullanılır; kalıcı olarak profilinize bağlı biçimde saklanmaz.',
        'Lütfen soru görsellerinde kimlik bilgisi, sınav giriş belgesi gibi kişisel/hassas verilerin görünmemesine dikkat edin.',
      ],
    },
    {
      heading: '4. İşleme Amaçları ve Hukuki Sebep',
      body: [
        '• Uygulamanın temel işlevlerinin sunulması (KVKK m.5/2-c ve m.5/2-f: sözleşmenin ifası ve meşru menfaat).',
        '• Çalışma istatistikleri, geri sayım, istikrar analizi ve kişisel çalışma planı üretimi.',
        '• Google ile giriş yapıldığında verilerin cihazlar arası senkronizasyonu (açık rızanız).',
      ],
    },
    {
      heading: '5. Üçüncü Taraflar',
      body: [
        '• Google Firebase (kimlik doğrulama ve bulut yedekleme).',
        '• Google Gemini API (yapay zeka yanıtları).',
        'Bu sağlayıcılar verileri yalnızca hizmetin sunulması için işler. Verileriniz pazarlama amacıyla üçüncü taraflara satılmaz veya kiralanmaz.',
      ],
    },
    {
      heading: '6. Saklama Süresi',
      body: [
        'Cihazınızdaki veriler siz silene kadar saklanır. Bulut hesabınızdaki veriler, hesabınız aktif olduğu sürece; hesabınızı silmeniz halinde makul süre içinde silinir.',
      ],
    },
    {
      heading: '7. Haklarınız (KVKK m.11)',
      body: [
        'Kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini/silinmesini isteme, işlemenin sınırlandırılmasını talep etme ve verilerinizin taşınmasını isteme haklarına sahipsiniz.',
        `Talepleriniz için: ${LEGAL_COMPANY.contactEmail}`,
        'Uygulama içinde: hesap açmadan tüm yerel verilerinizi tarayıcı ayarlarından; hesabınız varsa profil ekranından silebilirsiniz.',
      ],
    },
    {
      heading: '8. 18 Yaş Altı Kullanıcılar',
      body: [
        'Uygulama sınav hazırlığı amacıyla 18 yaş altındaki kullanıcılar tarafından da kullanılabilir. 18 yaşından küçükseniz, Uygulamayı ebeveyn/vasi bilgisi ve onayı ile kullanmanız gerekir.',
      ],
    },
    {
      heading: '9. Değişiklikler',
      body: [
        'Bu metin güncellenebilir. Önemli değişikliklerde uygulama içinde tekrar onayınız istenir.',
      ],
    },
  ],
};

export const TERMS_DOC: LegalDoc = {
  id: 'terms',
  title: 'Kullanım Koşulları',
  updated: LEGAL_VERSION,
  intro:
    'Snaps uygulamasını kullanarak aşağıdaki koşulları kabul etmiş olursunuz.',
  sections: [
    {
      heading: '1. Hizmetin Niteliği',
      body: [
        'Snaps, KPSS ve YKS adaylarına yönelik bir çalışma ve koçluk aracıdır. Sunulan yapay zeka çözümleri, çalışma planları ve tahminler yol gösterici niteliktedir; resmî kaynak veya garanti değildir. Sınav sonuçlarınızdan Uygulama sorumlu tutulamaz.',
      ],
    },
    {
      heading: '2. Kullanıcının Yükümlülükleri',
      body: [
        '• Doğru bilgi girmek ve hesabınızın güvenliğini korumak sizin sorumluluğunuzdadır.',
        '• Uygulamayı hukuka aykırı amaçlarla, telif hakkı ihlali oluşturacak şekilde veya sistemin işleyişini bozacak biçimde kullanamazsınız.',
        '• Yüklediğiniz içeriklerin paylaşım hakkına sahip olduğunuzu beyan edersiniz.',
      ],
    },
    {
      heading: '3. Fikri Mülkiyet',
      body: [
        'Uygulamanın tasarımı, yazılımı ve özgün içerikleri ilgili hak sahiplerine aittir. Ders notları ve müfredat içerikleri yalnızca kişisel çalışma amacıyla kullanılabilir.',
      ],
    },
    {
      heading: '4. Hizmet Kesintileri ve Değişiklikler',
      body: [
        'Hizmet "olduğu gibi" sunulur. Özellikler önceden bildirilmeksizin değiştirilebilir, askıya alınabilir veya sonlandırılabilir.',
      ],
    },
    {
      heading: '5. Sorumluluğun Sınırlandırılması',
      body: [
        'Yürürlükteki mevzuatın izin verdiği azami ölçüde, Uygulamanın kullanımından doğan dolaylı zararlardan sorumluluk kabul edilmez.',
      ],
    },
    {
      heading: '6. İletişim',
      body: [`Sorularınız için: ${LEGAL_COMPANY.contactEmail}`],
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [PRIVACY_DOC, TERMS_DOC];
