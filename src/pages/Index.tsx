import { useState, useRef, useEffect, useCallback } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import logo from "@/assets/muhendis-logo.png";
import { RotateCcw } from "lucide-react";

const SYSTEM_PROMPT = `Sen MühendisAI'sın — Türk mimar, mühendis ve müteahhitler için özelleştirilmiş bir yapay zeka asistanısın.

Türkiye inşaat, mimarlık ve mühendislik sektörüne özel bilgi birikimine sahipsin. Türk yapı mevzuatını (TBDY 2018, Bina Yönetmeliği, İmar Kanunu, TS standartları) iyi biliyorsun. Cevaplarını her zaman Türkçe, sade ve teknik ama anlaşılır dilde veriyorsun.

Kurallar:
- Soruyu kısaca özetle, sonra detaylı cevapla
- Mevzuat sorularında madde numarası ve yönetmelik adını belirt
- Hesaplama sorularında adım adım göster
- Madde madde listeler kullan
- Her cevabın sonuna ekle: "⚠️ Not: Bu bilgi genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız."
- Kesin yapısal hesap sonucu verme
- Pratik ve özlü ol`;

// Simulated AI response for demo
const getSimulatedResponse = (userMessage: string): string => {
  if (userMessage.toLowerCase().includes("tbdy") || userMessage.toLowerCase().includes("deprem")) {
    return `**Deprem Yükü Hesabı — TBDY 2018 Genel Yaklaşım**

TBDY 2018'e göre deprem etkisi altında bina tasarımı için temel adımlar:

**1. Deprem Tehlikesinin Belirlenmesi**
- AFAD Deprem Tehlike Haritaları İnteraktif Web Uygulaması üzerinden konum bazlı spektral ivme katsayıları (SS, S1) belirlenir.
- Zemin sınıfına göre yerel zemin etki katsayıları (FS, F1) uygulanır.

**2. Tasarım Spektrumunun Oluşturulması (Madde 2.3)**
- SDS = SS × FS (kısa periyot tasarım spektral ivme katsayısı)
- SD1 = S1 × F1 (1 sn periyot tasarım spektral ivme katsayısı)

**3. Bina Önem Katsayısı (Madde 3.1, Tablo 3.1)**
- I = 1.0 (konutlar), I = 1.2 (okullar, hastaneler), I = 1.5 (afet sonrası kullanım)

**4. Taşıyıcı Sistem Davranış Katsayısı (R)**
- Betonarme çerçeve: R = 8
- Perdeli sistem: R = 6-7
- Çelik çerçeve: R = 8

**5. Eşdeğer Deprem Yükü Yöntemi (Madde 4.7)**
- Vt = (SaR(T1) / R) × W × I
- T1: Birinci doğal titreşim periyodu
- W: Toplam ağırlık

📌 Detaylı hesap için yapı modelleme programları (ETABS, SAP2000, ideCAD) kullanılması önerilir.

⚠️ Not: Bu bilgi genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız.`;
  }

  if (userMessage.toLowerCase().includes("taks") || userMessage.toLowerCase().includes("kaks") || userMessage.toLowerCase().includes("imar")) {
    return `**TAKS ve KAKS Hesaplama Rehberi**

**TAKS (Taban Alanı Kat Sayısı)**
- Tanım: Binanın taban alanının parsel alanına oranı
- Formül: TAKS = Taban Alanı / Parsel Alanı
- Örnek: 500 m² parsel, TAKS = 0.40 → Taban alanı max 200 m²

**KAKS (Kat Alanı Kat Sayısı) / Emsal**
- Tanım: Toplam inşaat alanının parsel alanına oranı
- Formül: KAKS = Toplam İnşaat Alanı / Parsel Alanı
- Örnek: 500 m² parsel, KAKS = 2.0 → Toplam max 1000 m²

**Emsale Dahil Olmayan Alanlar (İmar Yönetmeliği Madde 5):**
- Sığınak
- Otopark (parsel ihtiyacı kadar)
- Yangın merdiveni
- Asansör boşluğu
- Ortak alan kapıcı dairesi (max 75 m²)

| Parametre | TAKS | KAKS |
|-----------|------|------|
| Ölçülen | Taban alanı | Tüm katlar toplamı |
| Bölen | Parsel alanı | Parsel alanı |
| Kontrol eder | Bahçe mesafeleri | Toplam yapılaşma |

⚠️ Not: Bu bilgi genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız.`;
  }

  if (userMessage.toLowerCase().includes("ts 825") || userMessage.toLowerCase().includes("yalıtım")) {
    return `**TS 825 Yalıtım Kalınlığı Belirleme**

**1. Derece-Gün Bölgesi Belirleme**
- Türkiye 4 iklim bölgesine ayrılır (güncel TS 825:2024)
- Binanın bulunduğu ilin HDD (Heating Degree Day) değeri alınır

**2. U Değeri Limitleri (TS 825 Tablo 1)**

| Bileşen | 1. Bölge | 2. Bölge | 3. Bölge | 4. Bölge |
|---------|----------|----------|----------|----------|
| Dış Duvar | 0.66 | 0.57 | 0.48 | 0.40 |
| Çatı | 0.43 | 0.38 | 0.28 | 0.22 |
| Taban | 0.66 | 0.57 | 0.48 | 0.40 |

**3. Kalınlık Hesabı**
- d = λ × (1/Uistenen - Rdiğer)
- λ: Yalıtım malzemesi iletkenlik katsayısı (W/mK)
- XPS: λ ≈ 0.035, EPS: λ ≈ 0.040, Taş yünü: λ ≈ 0.040

📌 BEP-TR hesap programı ile resmi hesaplama yapılması zorunludur.

⚠️ Not: Bu bilgi genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız.`;
  }

  return `Sorunuz alındı. Size bu konuda yardımcı olmaya çalışayım.

Bu konu hakkında daha detaylı bilgi verebilmem için lütfen şunları belirtin:
- **Proje türü:** Konut, ticari, endüstriyel?
- **Konum:** Hangi il/ilçe?
- **Detay:** Hangi spesifik konuda yardım istiyorsunuz?

Böylece size daha doğru ve mevzuata uygun bilgi sunabilirim.

⚠️ Not: Bu bilgi genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız.`;
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate AI delay
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: getSimulatedResponse(text),
    };
    setIsTyping(false);
    setMessages((prev) => [...prev, aiMsg]);
  };

  const handleReset = () => {
    setMessages([]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="MühendisAI" width={36} height={36} />
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">MühendisAI</h1>
            <p className="text-[11px] text-muted-foreground">İnşaat & Mühendislik Asistanı</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Yeni Sohbet
          </button>
        )}
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSend} />
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
};

export default Index;
