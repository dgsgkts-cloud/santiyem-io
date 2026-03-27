import LegalPage from "./LegalPage";

const sections = [
  {
    title: "Genel",
    content: <p>MühendisAI ("Platform"), Göktaş Global Mühendislik İnşaat İç ve Dış Ticaret Limited Şirketi tarafından işletilmektedir. Platforma erişim sağlayarak aşağıdaki kullanım şartlarını kabul etmiş sayılırsınız.</p>,
  },
  {
    title: "Hizmetin Kapsamı",
    content: (
      <>
        <p>MühendisAI, Türk mimar, mühendis ve müteahhitlere yönelik yapay zeka destekli bir bilgi ve araç platformudur. Platform aşağıdaki hizmetleri sunar:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Sektöre özel yapay zeka destekli soru-cevap asistanı</li>
          <li>Proje ve belge analizi</li>
          <li>Fotoğraf analizi</li>
          <li>EKB ön hesaplama</li>
          <li>İnşaat maliyet hesaplama</li>
          <li>Hakediş yönetimi</li>
          <li>Belge ve şablon arşivi</li>
          <li>Mevzuat arama</li>
          <li>Günlük teknik içerik</li>
        </ul>
      </>
    ),
  },
  {
    title: "Sorumluluk Reddi",
    content: (
      <>
        <p>Platform tarafından sunulan tüm içerikler, hesaplamalar ve analizler yalnızca genel bilgi ve rehberlik amaçlıdır. Hiçbir içerik mesleki danışmanlık, hukuki tavsiye veya teknik onay niteliği taşımaz.</p>
        <p>Kullanıcı, platform çıktılarını esas alarak vereceği mesleki kararların sorumluluğunun tamamen kendisine ait olduğunu kabul eder. Platform, kullanıcıların platform çıktılarına dayanarak aldığı kararlar sonucunda oluşabilecek hiçbir zarar, kayıp veya yükümlülükten sorumlu tutulamaz.</p>
        <p>Resmi EKB belgesi, yapısal hesap raporu ve benzeri yasal zorunluluk taşıyan belgeler yalnızca yetkili kurum ve uzmanlar tarafından düzenlenebilir; platform bu nitelikte belgeler üretmemektedir.</p>
      </>
    ),
  },
  {
    title: "Abonelik ve Ödeme",
    content: <p>Ücretli planlar aylık veya yıllık olarak faturalandırılır. Ödemeler iyzico altyapısı üzerinden güvenli şekilde alınır. Fiyatlar KDV dahildir. Platform, önceden bildirimde bulunmak kaydıyla fiyatları değiştirme hakkını saklı tutar.</p>,
  },
  {
    title: "Hesap Güvenliği",
    content: <p>Kullanıcı, hesap bilgilerinin gizliliğinden ve hesabı üzerinden gerçekleştirilen tüm işlemlerden sorumludur. Hesap bilgilerinin yetkisiz kişilerle paylaşılması yasaktır.</p>,
  },
  {
    title: "Yasaklı Kullanımlar",
    content: (
      <>
        <p>Aşağıdaki kullanımlar kesinlikle yasaktır:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Platformun içeriklerini izinsiz çoğaltmak veya dağıtmak</li>
          <li>Otomatik araçlarla platforma erişim sağlamak (bot, scraper vb.)</li>
          <li>Platformu kötüye kullanmak veya sistemlere zarar vermek</li>
          <li>Başkasının hesabını kullanmak</li>
        </ul>
      </>
    ),
  },
  {
    title: "Fikri Mülkiyet",
    content: <p>Platform üzerindeki tüm içerik, tasarım, kod ve materyaller Göktaş Global Mühendislik İnşaat İç ve Dış Ticaret Limited Şirketi'ne aittir. İzinsiz kullanım yasaktır.</p>,
  },
  {
    title: "Değişiklikler",
    content: <p>Platform, kullanım şartlarını önceden bildirimde bulunarak değiştirme hakkını saklı tutar. Değişiklikler platform üzerinden duyurulur.</p>,
  },
  {
    title: "Uygulanacak Hukuk",
    content: <p>Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İskenderun Mahkemeleri ve İcra Daireleri yetkilidir. İletişim: info@goktasglobal.com</p>,
  },
];

const KullanimSartlari = () => <LegalPage title="Kullanım Şartları" sections={sections} />;
export default KullanimSartlari;
