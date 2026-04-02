import { useSEO } from "@/hooks/useSEO";
import LegalPage from "./LegalPage";

const sections = [
  {
    title: "TARAFLAR",
    content: (
      <div className="space-y-1.5">
        <p><strong>Satıcı:</strong></p>
        <p>Şirket Unvanı: GÖKTAŞ GLOBAL MÜHENDİSLİK İNŞAAT İÇ VE DIŞ TİC. LİM. ŞİRKETİ</p>
        <p>Vergi Dairesi: AKDENİZ | Vergi Numarası: 4060719380</p>
        <p>Mersis No: 0406071938000001</p>
        <p>Adres: ULUÇINAR MAH. 12 ÖZGÜRKENT SK. NO:4 ARSUZ/HATAY</p>
        <p className="mt-2"><strong>Alıcı:</strong> Platforma kayıt sırasında bildirilen ad, soyad ve e-posta adresi sahibi kişi.</p>
      </div>
    ),
  },
  {
    title: "KONU",
    content: <p>İşbu sözleşme, Alıcı'nın Şantiyem platformunda satın aldığı dijital abonelik hizmetine ilişkin tarafların hak ve yükümlülüklerini düzenlemektedir.</p>,
  },
  {
    title: "HİZMET BİLGİLERİ",
    content: (
      <>
        <p><strong>Hizmet Adı:</strong> Şantiyem Dijital Abonelik</p>
        <p><strong>Hizmet Türü:</strong> Dijital hizmet — çevrimiçi yazılım aboneliği (SaaS)</p>
        <p><strong>Abonelik Dönemi:</strong> Aylık veya Yıllık (Alıcı tarafından seçilir)</p>
        <p><strong>Hizmet Kapsamı:</strong> AI asistan, hesap araçları, fotoğraf analizi, hakediş yönetimi, proje yönetimi, şantiye günlüğü ve diğer platform özellikleri</p>
        <p className="mt-2"><strong>Planlar:</strong></p>
        <p>Başlangıç: Ücretsiz</p>
        <p>Profesyonel: 499 ₺/ay + KDV (yıllık: 4.788 ₺ + KDV)</p>
        <p>Ekip: 1.499 ₺/ay + KDV (yıllık: 14.388 ₺ + KDV)</p>
        <p>Kurumsal: 4.999 ₺/ay + KDV (yıllık: 47.988 ₺ + KDV)</p>
      </>
    ),
  },
  {
    title: "ÖDEME",
    content: (
      <>
        <p>Ödemeler iyzico Ödeme Hizmetleri A.Ş. altyapısı üzerinden güvenli biçimde tahsil edilir.</p>
        <p><strong>Kabul edilen ödeme yöntemleri:</strong> Kredi kartı (Visa, MasterCard), banka kartı.</p>
        <p><strong>Faturalama:</strong> Her dönem başında otomatik olarak gerçekleşir.</p>
        <p><strong>E-fatura:</strong> Her ödeme için otomatik olarak Alıcı'nın e-posta adresine gönderilir.</p>
      </>
    ),
  },
  {
    title: "TESLİMAT",
    content: <p>Hizmet, ödemenin onaylanmasının ardından derhal aktive edilir. Dijital hizmet niteliğinde olduğundan fiziksel teslimat söz konusu değildir.</p>,
  },
  {
    title: "CAYMA HAKKI",
    content: (
      <>
        <p>6502 sayılı Tüketicinin Korunması Hakkında Kanun'un 49. maddesi uyarınca, dijital içerik ve hizmetlerde tüketici, sözleşmenin kurulduğu tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.</p>
        <p>Ancak Alıcı'nın cayma hakkı süresi dolmadan önce, Alıcı'nın onayı ile hizmetin ifasına başlanılmış olması halinde cayma hakkı kullanılamaz.</p>
        <p>Cayma hakkı kullanımı için: INFO@GOKTASGLOBAL.COM</p>
      </>
    ),
  },
  {
    title: "İPTAL VE İADE",
    content: (
      <>
        <p>Platform üzerinden veya e-posta ile talep edilebilir.</p>
        <p>İlk ödeme tarihinden itibaren 3 gün içinde ve hizmet kullanılmamışsa tam iade yapılır.</p>
        <p>Onaylanan iadeler 7-10 iş günü içinde ödeme yönteminize aktarılır.</p>
      </>
    ),
  },
  {
    title: "UYUŞMAZLIK ÇÖZÜMÜ",
    content: (
      <>
        <p>İşbu sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır.</p>
        <p>Tüketici şikayetleri için: Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>
        <p>Şikayetlerinizi ayrıca e-Devlet üzerinden Tüketici Bilgi Sistemi'ne (TÜBİS) iletebilirsiniz.</p>
        <p className="mt-2">Alıcı, işbu sözleşmeyi elektronik ortamda onaylamakla sözleşme hükümlerini okuduğunu ve kabul ettiğini beyan eder.</p>
      </>
    ),
  },
];

const MesafeliSatisSozlesmesi = () => { useSEO({ title: "Mesafeli Satış Sözleşmesi | Şantiyem" }); return <LegalPage title="Mesafeli Satış Sözleşmesi" sections={sections} />; };
export default MesafeliSatisSozlesmesi;
