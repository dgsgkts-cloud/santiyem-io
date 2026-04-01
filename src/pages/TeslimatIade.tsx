import { useSEO } from "@/hooks/useSEO";
import LegalPage from "./LegalPage";

const sections = [
  {
    title: "Hizmet Teslimatı",
    content: <p>MühendisAI dijital bir hizmet platformudur. Fiziksel teslimat söz konusu değildir. Abonelik satın alımı tamamlandıktan sonra hizmetlere anında ve kesintisiz erişim sağlanır. Hizmet erişimi 7/24 aktiftir.</p>,
  },
  {
    title: "Ücretsiz Deneme",
    content: <p>Yeni üyelerimize 14 günlük ücretsiz Pro plan denemesi sunulmaktadır. Deneme süresi boyunca herhangi bir ücret tahsil edilmez. Deneme süresi sonunda otomatik ücretlendirme yapılmaz.</p>,
  },
  {
    title: "Abonelik ve Yenileme",
    content: <p>Abonelikler aylık veya yıllık olarak otomatik yenilenir. Yenileme tarihinden en az 24 saat önce iptal edilmediği takdirde abonelik bir sonraki dönem için otomatik olarak yenilenir ve ücret tahsil edilir.</p>,
  },
  {
    title: "İptal",
    content: <p>Aboneliğinizi istediğiniz zaman "Ayarlar → Abonelik → İptal Et" adımlarını takip ederek iptal edebilirsiniz. İptal işlemi gerçekleştirildikten sonra mevcut dönem sonuna kadar hizmete erişiminiz devam eder.</p>,
  },
  {
    title: "İade Koşulları",
    content: (
      <>
        <p><strong>İlk abonelik ödemesinde iade:</strong> Ödeme tarihinden itibaren 3 (üç) gün içinde talepte bulunulması ve platformun aktif olarak kullanılmamış olması koşuluyla tam iade yapılır.</p>
        <p><strong>Teknik sorun kaynaklı iade:</strong> Platform kaynaklı kesintinin 48 saati aşması durumunda orantılı iade değerlendirilebilir.</p>
        <p><strong>Yıllık aboneliklerde kalan ay iadesi:</strong> Yıllık aboneliğin ilk ayı içinde iptal talebinde bulunulması halinde kalan aylara orantılı iade yapılır.</p>
      </>
    ),
  },
  {
    title: "İade Süreci",
    content: <p>İade talebi için INFO@GOKTASGLOBAL.COM adresine e-posta gönderin. Talepler 5 iş günü içinde değerlendirilir. Onaylanan iadeler 7-10 iş günü içinde ödeme yönteminize iade edilir.</p>,
  },
];

const TeslimatIade = () => <LegalPage title="Teslimat ve İade Şartları" sections={sections} />;
export default TeslimatIade;
