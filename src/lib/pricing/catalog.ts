// ─────────────────────────────────────────────────────────────
// Şantiyem AI — Plan / fiyat / deneme kataloğu.
// TEK DOĞRULUK KAYNAĞI. Landing, kayıt, Plan ve Kullanım,
// yükseltme sayfaları ve checkout burayı okur.
//
// Public planlar: Ücretsiz · Başlangıç · Profesyonel · İşletme · Kurumsal
// Yeni kayıt: 14 günlük Profesyonel deneme (kart gerekmez).
// Deneme bitince otomatik olarak Ücretsiz plana dönülür, veri silinmez.
// ─────────────────────────────────────────────────────────────

/** Frontend plan anahtarları (public). */
export type PlanKey = "free" | "starter" | "professional" | "business" | "enterprise";

/** Veritabanı / faturalama anahtarları. */
export type InternalPlanKey = "free" | "starter_paid" | "pro" | "team" | "enterprise";

export const TRIAL_DAYS = 14;
export const TRIAL_PLAN: PlanKey = "professional";

/** Ek kullanıcı fiyatı (aylık, kullanıcı başına). */
export const EXTRA_USER_PRICE_MONTHLY = 590;

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "professional", "business", "enterprise"];

/** Masaüstü kart sırası (Kurumsal ayrı bölümde gösterilir). */
export const DESKTOP_CARD_ORDER: PlanKey[] = ["free", "starter", "professional", "business"];

/** Mobil kart sırası — önerilen plan önce. */
export const MOBILE_CARD_ORDER: PlanKey[] = ["professional", "free", "starter", "business", "enterprise"];

export interface PlanLimitsCopy {
  users: string;
  projects: string;
  aiMonthly: string;
  voice: string;
  storage: string;
}

export interface PlanDefinition {
  key: PlanKey;
  internalKey: InternalPlanKey;
  /** Checkout/edge function planKey (mevcut iyzico entegrasyonu). */
  billingKey: string | null;
  name: string;
  audience: string;
  cardCopy: string;
  monthly: number | null;
  yearly: number | null;
  badge: string | null;
  featured: boolean;
  cta: string;
  ctaTo?: string;
  /** Sadece kartta gösterilen kısa liste. */
  features: string[];
  notIncluded?: string[];
  limits: PlanLimitsCopy;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    internalKey: "free",
    billingKey: null,
    name: "Ücretsiz",
    audience: "Tek başına çalışan mühendisler ve ürünü kendi projesinde denemek isteyen kullanıcılar için.",
    cardCopy: "Kendi projenizde temel şantiye takibi için.",
    monthly: 0,
    yearly: 0,
    badge: null,
    featured: false,
    cta: "Ücretsiz Başla",
    ctaTo: "/register",
    features: [
      "1 kullanıcı · 1 aktif proje",
      "Web ve mobil erişim",
      "Temel proje yönetimi ve görev takibi",
      "Şantiye günlüğü",
      "Temel personel ve malzeme kayıtları",
      "Ayda 20 yazılı AI sorusu",
      "WhatsApp mesaj taslağı",
      "Standart destek",
    ],
    notIncluded: [
      "Sesli AI asistan",
      "Kullanıcı daveti, rol ve yetkilendirme",
      "Doküman analizi",
      "Gelişmiş hakediş, finans ve raporlar",
    ],
    limits: {
      users: "1 kullanıcı",
      projects: "1 aktif proje",
      aiMonthly: "20 yazılı AI sorusu / ay",
      voice: "Sesli AI yok",
      storage: "250 MB dosya alanı",
    },
  },
  starter: {
    key: "starter",
    internalKey: "starter_paid",
    billingKey: "starter_paid",
    name: "Başlangıç",
    audience: "Bağımsız mühendisler ve küçük yükleniciler için.",
    cardCopy: "Tek projeyi daha kapsamlı yöneten profesyoneller için.",
    monthly: 1290,
    yearly: 12900,
    badge: null,
    featured: false,
    cta: "Başlangıcı Seç",
    features: [
      "1 kullanıcı · 1 aktif proje",
      "Temel proje ve saha yönetimi",
      "Yüksek şantiye günlüğü kaydı limiti",
      "Hakediş takibi",
      "Kasa ve ödeme takibi",
      "Gelişmiş malzeme ve stok",
      "PDF ve Excel raporları",
      "Ayda 500 yazılı AI sorusu",
      "WhatsApp mesaj taslakları",
      "Standart destek",
    ],
    notIncluded: ["Sesli AI asistan", "Kullanıcı daveti"],
    limits: {
      users: "1 kullanıcı",
      projects: "1 aktif proje",
      aiMonthly: "500 yazılı AI sorusu / ay",
      voice: "Sesli AI yok",
      storage: "5 GB dosya alanı",
    },
  },
  professional: {
    key: "professional",
    internalKey: "pro",
    billingKey: "pro",
    name: "Profesyonel",
    audience: "Birden fazla projeyi ve ekibi yöneten şirketler için.",
    cardCopy: "Birden fazla projeyi ve ekibi yöneten şirketler için.",
    monthly: 2990,
    yearly: 29900,
    badge: "En Çok Tercih Edilen",
    featured: true,
    cta: "Profesyoneli Seç",
    features: [
      "3 kullanıcı",
      "Birden fazla aktif proje",
      "Tüm operasyon modülleri",
      "OpenAI sesli asistan",
      "AI yönetici özetleri",
      "Gelişmiş AI analizleri",
      "Doküman analizi",
      "Roller ve yetkilendirme",
      "Gelişmiş raporlama",
      "WhatsApp iletişim planlama",
      "Öncelikli destek",
    ],
    limits: {
      users: "3 kullanıcı",
      projects: "10 aktif proje",
      aiMonthly: "3.000 yazılı AI sorusu / ay",
      voice: "300 dakika sesli AI / ay",
      storage: "25 GB dosya alanı",
    },
  },
  business: {
    key: "business",
    internalKey: "team",
    billingKey: "team",
    name: "İşletme",
    audience: "Operasyonlarını şirket genelinde standartlaştıran ekipler için.",
    cardCopy: "Operasyonlarını şirket genelinde standartlaştıran ekipler için.",
    monthly: 5990,
    yearly: 59900,
    badge: null,
    featured: false,
    cta: "İşletmeyi Seç",
    features: [
      "10 kullanıcı",
      "Yüksek aktif proje limiti",
      "Tüm modüller",
      "Çoklu ekip yönetimi",
      "Gelişmiş rol ve yetkilendirme",
      "Gelişmiş AI iş akışları",
      "WhatsApp otomasyonları",
      "Yönetici raporları",
      "Denetim kayıtları",
      "Öncelikli onboarding ve destek",
    ],
    limits: {
      users: "10 kullanıcı",
      projects: "50 aktif proje",
      aiMonthly: "15.000 yazılı AI sorusu / ay",
      voice: "1.500 dakika sesli AI / ay",
      storage: "100 GB dosya alanı",
    },
  },
  enterprise: {
    key: "enterprise",
    internalKey: "enterprise",
    billingKey: null,
    name: "Kurumsal",
    audience: "10+ kullanıcılı, özel gereksinimleri olan kurumlar için.",
    cardCopy: "Özel limit, entegrasyon ve SLA ihtiyacı olan kurumlar için.",
    monthly: null,
    yearly: null,
    badge: null,
    featured: false,
    cta: "Satış Ekibiyle Görüş",
    ctaTo: "/iletisim",
    features: [
      "10+ kullanıcı",
      "Özel proje limitleri",
      "Özel AI ve ses kotaları",
      "Özel WhatsApp kotaları",
      "API ve entegrasyonlar",
      "Özel roller",
      "Onboarding ve eğitim",
      "SLA ve gelişmiş güvenlik gereksinimleri",
    ],
    limits: {
      users: "10+ kullanıcı",
      projects: "Özel",
      aiMonthly: "Özel",
      voice: "Özel",
      storage: "Özel",
    },
  },
};

export const PRICE_LABEL_ENTERPRISE = "Teklif Alın";

/** ₺1.290 biçiminde fiyat metni. */
export function formatPlanPrice(value: number | null): string {
  if (value === null) return PRICE_LABEL_ENTERPRISE;
  if (value === 0) return "₺0";
  return `₺${value.toLocaleString("tr-TR")}`;
}

export function planPriceLabel(plan: PlanDefinition, yearly: boolean): { price: string; period: string; note: string | null } {
  if (plan.monthly === null) return { price: PRICE_LABEL_ENTERPRISE, period: "", note: null };
  if (plan.monthly === 0) return { price: "₺0", period: "/ay", note: "Süresiz ücretsiz" };
  if (yearly && plan.yearly) {
    return {
      price: formatPlanPrice(plan.yearly),
      period: "/yıl",
      note: `Aylık ${formatPlanPrice(Math.round(plan.yearly / 12))} karşılığı`,
    };
  }
  return { price: formatPlanPrice(plan.monthly), period: "/ay", note: null };
}

export const EXTRA_USER_LABEL = `₺${EXTRA_USER_PRICE_MONTHLY.toLocaleString("tr-TR")} / kullanıcı / ay`;

/** Internal DB anahtarından public plan anahtarına. */
const INTERNAL_TO_PUBLIC: Record<string, PlanKey> = {
  free: "free",
  starter_paid: "starter",
  starter: "starter",
  pro: "professional",
  office_pro: "professional",
  professional: "professional",
  team: "business",
  business: "business",
  enterprise: "enterprise",
  admin: "enterprise",
};

export function toPlanKey(internal?: string | null): PlanKey {
  if (!internal) return "free";
  return INTERNAL_TO_PUBLIC[internal.toLowerCase()] ?? "free";
}

export function planName(key: PlanKey): string {
  return PLANS[key].name;
}

export function planRank(key: PlanKey): number {
  return PLAN_ORDER.indexOf(key);
}

// ─────────────────────────────────────────────────────────────
// Deneme metinleri
// ─────────────────────────────────────────────────────────────
export const TRIAL_COPY = {
  title: "Profesyonel Deneme",
  body: `${TRIAL_DAYS} gün boyunca Profesyonel plan özelliklerini deneyin.`,
  noCard: "Kart gerekmez.",
  noCharge: "Onayınız olmadan ücretlendirme yapılmaz.",
  landingLine1: `${TRIAL_DAYS} gün Profesyonel deneme`,
  landingLine2: "Kart gerekmez",
  landingLine3: "Onay olmadan ücretlendirme yapılmaz",
  landingAfter: "Deneme sonunda ücretsiz planla devam edebilirsiniz.",
  registerTitle: `Şantiyem AI'yı ${TRIAL_DAYS} gün boyunca Profesyonel özelliklerle deneyin.`,
  registerBody:
    "Kart gerekmez. Deneme sonunda ücretsiz planla devam edebilir veya ücretli bir plan seçebilirsiniz.",
  registerCta: "Ücretsiz Denemeyi Başlat",
  expiredTitle: "Profesyonel denemeniz sona erdi.",
  expiredBody:
    "Verileriniz korunuyor. Ücretsiz planla temel özellikleri kullanmaya devam edebilirsiniz.",
  expiredPrimary: "Ücretsiz Planla Devam Et",
  expiredSecondary: "Planları İncele",
  badgeActive: "Profesyonel Deneme",
  badgeDays: (d: number) => `Deneme · ${d} gün kaldı`,
} as const;

export const LIMIT_COPY = {
  reachedTitle: "Bu plan sınırına ulaştınız. Mevcut verileriniz korunuyor.",
  reachedPrimary: "Planı İncele",
  reachedSecondary: "Kapat",
  projectTitle: "Ücretsiz plan bir aktif proje destekler.",
  projectArchive: "Mevcut Projeyi Arşivle",
  inviteTitle: "Ekip davetleri Profesyonel planla kullanılabilir.",
  downgradeProjects:
    "Ücretsiz planda yalnızca bir aktif proje kullanabilirsiniz. Diğer projeleriniz korunacak ancak arşivlenmiş olarak kalacaktır.",
} as const;

// ─────────────────────────────────────────────────────────────
// Kilitli özellikler (upgrade sheet metinleri)
// ─────────────────────────────────────────────────────────────
export type GatedFeature =
  | "voice_copilot"
  | "document_analysis"
  | "team_invite"
  | "roles_permissions"
  | "multi_project"
  | "advanced_finance"
  | "whatsapp_automation"
  | "advanced_reports"
  | "export_premium"
  | "ai_actions"
  | "meetings"
  | "communication_hub";

export interface GateCopy {
  title: string;
  description: string;
  minPlan: PlanKey;
}

export const GATE_COPY: Record<GatedFeature, GateCopy> = {
  voice_copilot: {
    title: "Sesli AI, Profesyonel planla kullanılabilir.",
    description:
      "OpenAI destekli sesli asistanla proje verilerinizi konuşarak sorgulayabilirsiniz.",
    minPlan: "professional",
  },
  document_analysis: {
    title: "Doküman analizi, Profesyonel planla kullanılabilir.",
    description: "Sözleşme, hakediş ve teknik dosyalarınızı yükleyip AI ile analiz edin.",
    minPlan: "professional",
  },
  team_invite: {
    title: LIMIT_COPY.inviteTitle,
    description: "Ekip üyelerini davet edin, rolleriyle birlikte aynı projede çalışın.",
    minPlan: "professional",
  },
  roles_permissions: {
    title: "Rol ve yetkilendirme, Profesyonel planla kullanılabilir.",
    description: "Kullanıcılara proje bazlı roller ve yetkiler tanımlayın.",
    minPlan: "professional",
  },
  multi_project: {
    title: "Birden fazla aktif proje, Profesyonel planla kullanılabilir.",
    description: "Aynı anda birden fazla şantiyeyi tek panelden yönetin.",
    minPlan: "professional",
  },
  advanced_finance: {
    title: "Gelişmiş finans, Başlangıç planla kullanılabilir.",
    description: "Kasa, ödeme, hakediş ve nakit akışı takibini tam kapsamıyla kullanın.",
    minPlan: "starter",
  },
  whatsapp_automation: {
    title: "WhatsApp otomasyonu, İşletme planla kullanılabilir.",
    description: "Saha iletişimini otomatik akışlarla planlayın ve ölçeklendirin.",
    minPlan: "business",
  },
  advanced_reports: {
    title: "Gelişmiş raporlar, Profesyonel planla kullanılabilir.",
    description: "Yönetici raporları ve markalı rapor formatlarına erişin.",
    minPlan: "professional",
  },
  export_premium: {
    title: "Markalı rapor çıktıları, Başlangıç planla kullanılabilir.",
    description: "PDF ve Excel raporlarını firma başlığıyla dışa aktarın.",
    minPlan: "starter",
  },
  ai_actions: {
    title: "AI aksiyonları, Profesyonel planla kullanılabilir.",
    description: "AI asistanın sizin adınıza kayıt oluşturmasına izin verin.",
    minPlan: "professional",
  },
  meetings: {
    title: "Toplantı özetleri, Profesyonel planla kullanılabilir.",
    description: "Toplantı kayıtlarını AI ile özetleyip aksiyon maddelerine dönüştürün.",
    minPlan: "professional",
  },
  communication_hub: {
    title: "İletişim Merkezi, Profesyonel planla kullanılabilir.",
    description: "Saha iletişimini planlayın, mesajları tek yerden yönetin.",
    minPlan: "professional",
  },
};

export const GATE_ACTIONS = {
  primary: (plan: PlanKey) => `${PLANS[plan].name}'i İncele`,
  secondary: "Şimdi Değil",
} as const;
