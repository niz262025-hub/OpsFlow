export type LocaleCode = 'en' | 'ms' | 'zh-CN' | 'ta';

export const SUPPORTED_LOCALES: LocaleCode[] = ['en', 'ms', 'zh-CN', 'ta'];
export const DEFAULT_LOCALE: LocaleCode = 'en';

export const localeLabels: Record<LocaleCode, string> = {
  en: 'English',
  ms: 'Bahasa Melayu',
  'zh-CN': '简体中文',
  ta: 'தமிழ்',
};

export const localeOptions = SUPPORTED_LOCALES.map((code) => ({ code, label: localeLabels[code] }));

export const translations: Record<LocaleCode, Record<string, string>> = {
  en: {
    'common.language': 'Language',
    'common.returning': 'Returning…',
    'common.returnMyops': 'Return to MYOPS',
    'common.search': 'Search',
    'common.signOut': 'Sign Out',
    'common.signingOut': 'Signing out...',
    'common.continue': 'Continue',
    'nav.features': 'Features',
    'nav.access': 'Access',
    'nav.howItWorks': 'How It Works',
    'nav.contact': 'Contact',
    'nav.login': 'Login with MYOPS',
    'nav.openApp': 'Open OpsFlow',
    'nav.demo': 'View Live Demo',
    'home.eyebrow': 'All-in-one business operations for Malaysian SMEs',
    'home.title': 'Run Your Business Smarter with OpsFlow',
    'home.subtitle': 'POS, Purchase, Inventory, Finance & Reports in one cloud-based system built for boutiques, kiosks, and growing small businesses.',
    'home.primaryCta': 'Continue with MYOPS',
    'home.secondaryCta': 'View Live Demo',
    'home.badge.web': 'Web',
    'home.badge.sync': 'Cloud Sync',
    'home.badge.trial': 'No Credit Card Required',
    'home.section.title1': 'Everything you need to run daily operations',
    'home.section.title2': 'Why businesses choose OpsFlow',
    'home.section.title3': 'Simple pricing, built for launch',
    'home.section.title4': 'How it works',
    'home.cta.title': 'Ready to simplify your business?',
    'home.cta.subtitle': 'Sign in once at MYOPS. Your package determines which apps you can open.',
    'home.footer.privacy': 'Privacy Policy',
    'home.footer.terms': 'Terms of Service',
    'home.footer.contact': 'Contact',
    'home.footer.support': 'WhatsApp Support',
    'login.title': 'Sign in through MYOPS',
    'login.subtitle': 'Use your MYOPS account to open OpsFlow. Your MYOPS package controls app access.',
    'login.primary': 'Continue to MYOPS',
    'login.back': 'Back to OpsFlow',
    'register.title': 'Create your account through MYOPS',
    'register.subtitle': 'Create your MYOPS account and choose the package that includes OpsFlow.',
    'register.primary': 'Continue to MYOPS',
    'register.back': 'Back to OpsFlow',
  },
  ms: {
    'common.language': 'Bahasa',
    'common.returning': 'Sedang kembali…',
    'common.returnMyops': 'Kembali ke MYOPS',
    'common.search': 'Cari',
    'common.signOut': 'Log Keluar',
    'common.signingOut': 'Sedang log keluar...',
    'common.continue': 'Teruskan',
    'nav.features': 'Ciri-ciri',
    'nav.access': 'Akses',
    'nav.howItWorks': 'Cara Kerja',
    'nav.contact': 'Hubungi',
    'nav.login': 'Log masuk MYOPS',
    'nav.openApp': 'Buka OpsFlow',
    'nav.demo': 'Lihat Demo Langsung',
    'home.eyebrow': 'Operasi perniagaan serba lengkap untuk PKS Malaysia',
    'home.title': 'Jalankan Perniagaan Anda dengan Lebih Pintar bersama OpsFlow',
    'home.subtitle': 'POS, Pembelian, Inventori, Kewangan & Laporan dalam satu sistem berasaskan awan untuk butik, kios dan perniagaan kecil yang berkembang.',
    'home.primaryCta': 'Teruskan dengan MYOPS',
    'home.secondaryCta': 'Lihat Demo Langsung',
    'home.badge.web': 'Web',
    'home.badge.sync': 'Sync Awan',
    'home.badge.trial': 'Tiada Kad Kredit Diperlukan',
    'home.section.title1': 'Semua yang anda perlukan untuk operasi harian',
    'home.section.title2': 'Kenapa perniagaan memilih OpsFlow',
    'home.section.title3': 'Harga mudah, dibina untuk permulaan',
    'home.section.title4': 'Cara ia berfungsi',
    'home.cta.title': 'Sedia memudahkan perniagaan anda?',
    'home.cta.subtitle': 'Log masuk sekali di MYOPS. Pakej anda menentukan aplikasi yang boleh dibuka.',
    'home.footer.privacy': 'Dasar Privasi',
    'home.footer.terms': 'Syarat Perkhidmatan',
    'home.footer.contact': 'Hubungi',
    'home.footer.support': 'Sokongan WhatsApp',
    'login.title': 'Log masuk melalui MYOPS',
    'login.subtitle': 'Gunakan akaun MYOPS anda untuk membuka OpsFlow. Pakej MYOPS anda mengawal akses aplikasi.',
    'login.primary': 'Teruskan ke MYOPS',
    'login.back': 'Kembali ke OpsFlow',
    'register.title': 'Cipta akaun anda melalui MYOPS',
    'register.subtitle': 'Cipta akaun MYOPS anda dan pilih pakej yang termasuk OpsFlow.',
    'register.primary': 'Teruskan ke MYOPS',
    'register.back': 'Kembali ke OpsFlow',
  },
  'zh-CN': {
    'common.language': '语言',
    'common.returning': '正在返回…',
    'common.returnMyops': '返回 MYOPS',
    'common.search': '搜索',
    'common.signOut': '退出登录',
    'common.signingOut': '正在退出...',
    'common.continue': '继续',
    'nav.features': '功能',
    'nav.access': '访问',
    'nav.howItWorks': '工作方式',
    'nav.contact': '联系',
    'nav.login': '使用 MYOPS 登录',
    'nav.openApp': '打开 OpsFlow',
    'nav.demo': '查看演示',
    'home.eyebrow': '面向马来西亚中小企业的一体化业务运营方案',
    'home.title': '让 OpsFlow 助力您的业务更智能',
    'home.subtitle': 'POS、采购、库存、财务与报表一体化云端系统，适用于精品店、快闪店和成长型小企业。',
    'home.primaryCta': '继续使用 MYOPS',
    'home.secondaryCta': '查看演示',
    'home.badge.web': 'Web',
    'home.badge.sync': '云端同步',
    'home.badge.trial': '无需信用卡',
    'home.section.title1': '满足日常运营的一切需求',
    'home.section.title2': '为什么企业选择 OpsFlow',
    'home.section.title3': '简洁定价，适合启动',
    'home.section.title4': '它如何运作',
    'home.cta.title': '准备好简化您的业务了吗？',
    'home.cta.subtitle': '在 MYOPS 中登录一次。您的套餐决定可打开哪些应用。',
    'home.footer.privacy': '隐私政策',
    'home.footer.terms': '服务条款',
    'home.footer.contact': '联系',
    'home.footer.support': 'WhatsApp 支持',
    'login.title': '通过 MYOPS 登录',
    'login.subtitle': '使用您的 MYOPS 账号打开 OpsFlow。您的 MYOPS 套餐控制应用访问权限。',
    'login.primary': '继续前往 MYOPS',
    'login.back': '返回 OpsFlow',
    'register.title': '通过 MYOPS 创建账号',
    'register.subtitle': '创建您的 MYOPS 账号，并选择包含 OpsFlow 的套餐。',
    'register.primary': '继续前往 MYOPS',
    'register.back': '返回 OpsFlow',
  },
  ta: {
    'common.language': 'மொழி',
    'common.returning': 'திரும்புகிறது…',
    'common.returnMyops': 'MYOPS க்குத் திரும்பு',
    'common.search': 'தேடு',
    'common.signOut': 'வெளியேறு',
    'common.signingOut': 'வெளியேறுகிறது...',
    'common.continue': 'தொடர்க',
    'nav.features': 'அம்சங்கள்',
    'nav.access': 'அணுகல்',
    'nav.howItWorks': 'இது எப்படி வேலை செய்கிறது',
    'nav.contact': 'தொடர்பு',
    'nav.login': 'MYOPS மூலம் உள்நுழை',
    'nav.openApp': 'OpsFlow ஐ திற',
    'nav.demo': 'லைவ் டெமோவைப் பார்க்க',
    'home.eyebrow': 'மலேசிய SMEக்களுக்கு ஒருங்கிணைந்த வணிக நடவடிக்கைகள்',
    'home.title': 'OpsFlow உடன் உங்கள் வணிகத்தைச் smarter ஆக இயக்குங்கள்',
    'home.subtitle': 'POS, கொள்முதல், இருப்பு, நிதி & அறிக்கைகள் — சிறிய கடைகள், கூண்டு கடைகள், வளர்ந்து வரும் வணிகங்களுக்கு ஏற்ற ஒரே கிளவுட் அமைப்பு.',
    'home.primaryCta': 'MYOPS உடன் தொடரவும்',
    'home.secondaryCta': 'லைவ் டெமோவைப் பார்க்க',
    'home.badge.web': 'Web',
    'home.badge.sync': 'கிளவுட் ஒத்திசைவு',
    'home.badge.trial': 'கிரெடிட் கார்டு தேவையில்லை',
    'home.section.title1': 'நாள்தோறும் இயக்குவதற்குத் தேவையான அனைத்தும்',
    'home.section.title2': 'வணிகங்கள் ஏன் OpsFlow ஐத் தேர்வு செய்கின்றன',
    'home.section.title3': 'தொடக்கத்திற்கான எளிய விலை',
    'home.section.title4': 'இது எப்படி செயல்படுகிறது',
    'home.cta.title': 'உங்கள் வணிகத்தை எளிதாக்கத் தயாரா?',
    'home.cta.subtitle': 'MYOPS இல் ஒருமுறை உள்நுழையுங்கள். உங்கள் தொகுப்பு எந்தப் பயன்பாடுகளைத் திறக்க முடியும் என்பதை தீர்மானிக்கும்.',
    'home.footer.privacy': 'தனியுரிமைக் கொள்கை',
    'home.footer.terms': 'சேவை விதிமுறைகள்',
    'home.footer.contact': 'தொடர்பு',
    'home.footer.support': 'WhatsApp ஆதரவு',
    'login.title': 'MYOPS மூலம் உள்நுழையுங்கள்',
    'login.subtitle': 'OpsFlow ஐ திறக்க உங்கள் MYOPS கணக்கைப் பயன்படுத்தவும். உங்கள் MYOPS தொகுப்பு பயன்பாட்டு அணுகலை நிர்வகிக்கிறது.',
    'login.primary': 'MYOPS க்கு தொடரவும்',
    'login.back': 'OpsFlow க்கு திரும்பு',
    'register.title': 'MYOPS மூலம் உங்கள் கணக்கை உருவாக்கவும்',
    'register.subtitle': 'உங்கள் MYOPS கணக்கை உருவாக்கி, OpsFlow ஐ உள்ளடக்கிய தொகுப்பைத் தேர்ந்தெடுக்கவும்.',
    'register.primary': 'MYOPS க்கு தொடரவும்',
    'register.back': 'OpsFlow க்கு திரும்பு',
  },
};

export function resolveLocale(locale?: string | null): LocaleCode {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.toLowerCase().replace(/_/g, '-');
  if (normalized === 'zh' || normalized === 'zh-cn') return 'zh-CN';
  if (normalized === 'ms' || normalized === 'ms-my' || normalized === 'bm') return 'ms';
  if (normalized === 'ta' || normalized === 'ta-in') return 'ta';
  if (normalized === 'en' || normalized === 'en-us' || normalized === 'en-gb') return 'en';
  return SUPPORTED_LOCALES.includes(locale as LocaleCode) ? (locale as LocaleCode) : DEFAULT_LOCALE;
}

export function getTranslation(locale: string | null | undefined, key: string): string {
  const resolvedLocale = resolveLocale(locale);
  const candidates: LocaleCode[] = [resolvedLocale, 'en', 'ms'];

  for (const candidate of candidates) {
    const value = translations[candidate]?.[key];
    if (value) {
      return value;
    }
  }

  return key;
}

export function getMissingTranslationKeys(): Record<string, string[]> {
  const referenceKeys = Object.keys(translations.en).sort();
  const missingByLocale: Record<string, string[]> = {};

  for (const locale of SUPPORTED_LOCALES) {
    const localeKeys = Object.keys(translations[locale] ?? {}).sort();
    const missing = referenceKeys.filter((key) => !localeKeys.includes(key));
    if (missing.length > 0) {
      missingByLocale[locale] = missing;
    }
  }

  return missingByLocale;
}

export function formatNumber(value: number, locale?: string | null, options?: Intl.NumberFormatOptions): string {
  const resolved = resolveLocale(locale);
  return new Intl.NumberFormat(resolved, options).format(value);
}

export function formatCurrency(value: number, locale?: string | null, currency = 'MYR'): string {
  const resolved = resolveLocale(locale);
  return new Intl.NumberFormat(resolved, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: Date | string | number, locale?: string | null, options?: Intl.DateTimeFormatOptions): string {
  const resolved = resolveLocale(locale);
  return new Intl.DateTimeFormat(resolved, options).format(new Date(value));
}
