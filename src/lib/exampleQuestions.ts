// Sprint 10.1 — 50+ example questions grouped by category
// Used in the Chat welcome screen so new users can try Şantiyem AI immediately.

export interface ExampleQuestionGroup {
  label: string;
  emoji: string;
  questions: string[];
}

export const EXAMPLE_QUESTION_GROUPS: ExampleQuestionGroup[] = [
  {
    label: "Yönetim Özeti",
    emoji: "🧭",
    questions: [
      "Bugünkü şantiye özetini ver",
      "Bu haftanın en kritik 3 riskini göster",
      "Aktif projelerin sağlık skorunu karşılaştır",
      "Bu ay biten ve devam eden işleri özetle",
      "Yönetim brief'imi güncelle",
      "Şu an dikkatimi çekmesi gereken 5 konu nedir?",
    ],
  },
  {
    label: "Finans & Kasa",
    emoji: "💰",
    questions: [
      "Bu ay ne kadar ödeme yapıldı, ne kadar tahsilat geldi?",
      "Vadesi gelen çekleri listele",
      "Bekleyen tahsilatlarım neler?",
      "Villa Projesi'nin nakit akışını göster",
      "Kasalardaki toplam bakiye ne kadar?",
      "En büyük 5 gideri kategorilere göre listele",
      "Bu hafta ödenecek fatura ve çekler neler?",
    ],
  },
  {
    label: "Personel & Puantaj",
    emoji: "👷",
    questions: [
      "Bugün şantiyede kaç kişi var?",
      "Bu hafta en çok yevmiye alan 5 işçi kim?",
      "Geç kalan personel var mı?",
      "Kalıpçıların puantaj özetini ver",
      "Bu ay personel maliyetim ne kadar?",
      "Yeni bir kalıpçı ekle: Mehmet Öztürk, günlük 2200",
    ],
  },
  {
    label: "Proje & Görev",
    emoji: "📋",
    questions: [
      "En geride kalan projem hangisi?",
      "Villa Projesi hakkında ne biliyorsun?",
      "Vadesi geçmiş görevleri listele",
      "Ofis Kompleksi'ne yeni görev ekle: İskele denetimi, yarın",
      "En yüksek ilerlemeli 3 projeyi göster",
      "Ataşehir Rezidans için milestone öner",
    ],
  },
  {
    label: "Malzeme & Stok",
    emoji: "📦",
    questions: [
      "Stoku azalan malzemeleri göster",
      "Bu ay hangi malzemelerden ne kadar tüketildi?",
      "Demir stoğu ne durumda?",
      "Villa Projesi'nde beton hakediş vs fiili tüketimi karşılaştır",
      "Bu hafta hangi tedarikçilerden malzeme geldi?",
    ],
  },
  {
    label: "Taşeron & Tedarikçi",
    emoji: "🤝",
    questions: [
      "En çok çalıştığım 5 taşeronu listele",
      "BetonPlus'a bu yıl ne kadar ödedim?",
      "Elektrik taşeronu kim önerirsin?",
      "Bu ay hangi tedarikçiye ne kadar borcum var?",
      "Renk Boya'nın performansı hakkında ne biliyorsun?",
    ],
  },
  {
    label: "Belgeler & Bilgi",
    emoji: "📚",
    questions: [
      "TS 500'e göre beton örtü kalınlığı ne olmalı?",
      "İSG mevzuatında yüksekte çalışma kuralları neler?",
      "C30 betonun 28 günlük mukavemet şartı nedir?",
      "Yalıtım şartnamemi özetle",
      "Hangi belgelerim var? Kategorilere göre listele",
    ],
  },
  {
    label: "Hakediş & Sözleşme",
    emoji: "📄",
    questions: [
      "Bu ay onaylanmış hakediş toplamım ne kadar?",
      "Bekleyen hakedişleri göster",
      "Rezidans A blok için yeni hakediş oluştur",
      "Aktif sözleşmelerimi listele",
      "Sözleşme sürelerini kontrol et — biten var mı?",
    ],
  },
  {
    label: "İletişim & Aksiyon",
    emoji: "✉️",
    questions: [
      "BetonPlus'a beton teslimatını hatırlatan bir WhatsApp mesajı hazırla",
      "Elif Öztürk'e proje raporu için e-posta taslağı yaz",
      "Ali Yavuz'a yarınki puantaj için hatırlatma oluştur",
      "Vadesi gelen çek için bankaya bir SMS taslağı hazırla",
    ],
  },
];

export const ALL_EXAMPLE_QUESTIONS = EXAMPLE_QUESTION_GROUPS.flatMap((g) => g.questions);
