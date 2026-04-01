import { useSEO } from "@/hooks/useSEO";
import LegalPage from "./LegalPage";

const sections = [
  {
    title: "Abonelik İptali",
    content: (
      <>
        <p>Aboneliğinizi istediğiniz zaman platform üzerindeki "Ayarlar → Planımı Yönet → İptal Et" adımlarını takip ederek iptal edebilirsiniz.</p>
        <p>İptal işlemi gerçekleştirildikten sonra:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Mevcut ödeme döneminin sonuna kadar platforma erişiminiz devam eder</li>
          <li>Bir sonraki dönem için ücretlendirme yapılmaz</li>
          <li>Kalan süre için iade yapılmaz</li>
        </ul>
      </>
    ),
  },
  {
    title: "İade Koşulları",
    content: (
      <>
        <p>Aşağıdaki durumlarda iade talebinde bulunabilirsiniz:</p>
        <p><strong>İlk abonelik ödemesinde:</strong> Ödeme tarihinden itibaren 3 gün içinde talepte bulunulması ve platformun hiç kullanılmamış olması halinde tam iade yapılır.</p>
        <p><strong>Teknik sorun halinde:</strong> Platform kaynaklı kesintinin 48 saati aşması durumunda orantılı iade değerlendirilebilir.</p>
      </>
    ),
  },
  {
    title: "İade Süreci",
    content: <p>İade talebi için info@goktasglobal.com adresine e-posta gönderin. Talepler 5 iş günü içinde değerlendirilir. Onaylanan iadeler 7-10 iş günü içinde ödeme yönteminize iade edilir.</p>,
  },
  {
    title: "Ücretsiz Deneme",
    content: <p>14 günlük ücretsiz deneme süresi kapsamında herhangi bir ücret alınmaz. Deneme süresi sonunda otomatik ücretlendirme yapılmaz; kullanıcı bilinçli olarak plan seçmelidir.</p>,
  },
  {
    title: "Plan Değişikliği",
    content: <p>Üst plana geçişte fark tutarı anlık olarak tahsil edilir. Alt plana geçişte değişiklik bir sonraki dönemden itibaren geçerli olur. İletişim: info@goktasglobal.com</p>,
  },
];

const IptalIadePolitikasi = () => { useSEO({ title: "İptal ve İade Politikası | MühendisAI" }); return <LegalPage title="İptal ve İade Politikası" sections={sections} />; };
export default IptalIadePolitikasi;
