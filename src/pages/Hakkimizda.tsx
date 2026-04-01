import { useSEO } from "@/hooks/useSEO";
import LegalPage from "./LegalPage";

const sections = [
  {
    title: "Hakkımızda",
    content: (
      <>
        <p>
          MühendisAI, Türk mimar, mühendis ve müteahhitlerin günlük iş süreçlerini yapay zeka teknolojisiyle
          kolaylaştırmak amacıyla GÖKTAŞ GLOBAL MÜHENDİSLİK İNŞAAT İÇ VE DIŞ TİC. LİM. ŞİRKETİ tarafından
          geliştirilmiştir.
        </p>
        <p>
          Türkiye'nin inşaat ve mühendislik sektörüne özel olarak tasarlanan platformumuz; TBDY, İmar
          Yönetmelikleri ve TS standartlarına dayalı AI asistan, proje yönetimi, hakediş takibi, EKB ön
          hesaplama ve belge yönetimi gibi araçları tek çatı altında sunar.
        </p>
        <p>
          Amacımız, mühendislik ofislerinin ve saha ekiplerinin idari iş yükünü azaltarak teknik işlere daha
          fazla zaman ayırmasını sağlamaktır.
        </p>
      </>
    ),
  },
  {
    title: "Şirket Bilgileri",
    content: (
      <div className="space-y-1.5">
        <p><strong>Şirket Unvanı:</strong> GÖKTAŞ GLOBAL MÜHENDİSLİK İNŞAAT İÇ VE DIŞ TİC. LİM. ŞİRKETİ</p>
        <p><strong>Vergi Dairesi:</strong> AKDENİZ</p>
        <p><strong>Vergi Numarası:</strong> 4060719380</p>
        <p><strong>Mersis No:</strong> 0406071938000001</p>
        <p><strong>Adres:</strong> ULUÇINAR MAH. 12 ÖZGÜRKENT SK. NO:4 ARSUZ/HATAY</p>
        <p><strong>E-posta:</strong> INFO@GOKTASGLOBAL.COM</p>
        <p><strong>Telefon:</strong> +90 (533) 377 11 56</p>
      </div>
    ),
  },
  {
    title: "İletişim",
    content: (
      <div className="space-y-3">
        <p>Bizimle iletişime geçmek için aşağıdaki formu kullanabilir veya doğrudan e-posta gönderebilirsiniz.</p>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); }}>
          <input placeholder="Ad Soyad" required className="w-full rounded-lg px-3 text-sm outline-none h-10" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
          <input type="email" placeholder="E-posta" required className="w-full rounded-lg px-3 text-sm outline-none h-10" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
          <input placeholder="Konu" required className="w-full rounded-lg px-3 text-sm outline-none h-10" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
          <textarea placeholder="Mesajınız" required rows={4} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
          <button type="submit" className="px-6 rounded-lg text-sm font-semibold text-white h-10" style={{ backgroundColor: "#FF6B2B" }}>
            Gönder
          </button>
        </form>
      </div>
    ),
  },
];

const Hakkimizda = () => { useSEO({ title: "Hakkımızda | MühendisAI" }); return <LegalPage title="Hakkımızda" sections={sections} />; };
export default Hakkimizda;
