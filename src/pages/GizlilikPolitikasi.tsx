import { useSEO } from "@/hooks/useSEO";
import LegalPage from "./LegalPage";

const sections = [
  {
    title: "Veri Sorumlusu",
    content: <p>GÖKTAŞ GLOBAL MÜHENDİSLİK İNŞAAT İÇ VE DIŞ TİC. LİM. ŞİRKETİ, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla hareket etmektedir.</p>,
  },
  {
    title: "İşlenen Kişisel Veriler",
    content: (
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>Kimlik verileri:</strong> Ad, soyad, unvan</li>
        <li><strong>İletişim verileri:</strong> E-posta adresi, telefon numarası</li>
        <li><strong>Konum verileri:</strong> İl bilgisi</li>
        <li><strong>İşlem güvenliği verileri:</strong> Şifre (şifrelenmiş), giriş logları</li>
        <li><strong>Finansal veriler:</strong> Ödeme işlemleri iyzico altyapısı üzerinden gerçekleştirilir; kart bilgileri platformumuzda saklanmaz</li>
        <li><strong>Kullanım verileri:</strong> Platform üzerinde gerçekleştirilen işlemler, yüklenen dosyalar</li>
      </ul>
    ),
  },
  {
    title: "Kişisel Verilerin İşlenme Amacı",
    content: (
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Hizmetin sunulması ve kişiselleştirilmesi</li>
        <li>Üyelik ve hesap yönetimi</li>
        <li>Ödeme ve faturalama işlemleri</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        <li>Platform güvenliği ve dolandırıcılık önleme</li>
      </ul>
    ),
  },
  {
    title: "Verilerin Aktarıldığı Taraflar",
    content: (
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>iyzico Ödeme Hizmetleri A.Ş.</strong> — ödeme işlemleri için</li>
        <li><strong>Anthropic PBC</strong> — yapay zeka hizmeti için (kişisel veri aktarımı yapılmaz, yalnızca içerik işlenir)</li>
        <li>Yasal yükümlülük halleri (mahkeme, savcılık vb.)</li>
      </ul>
    ),
  },
  {
    title: "Haklarınız (KVKK Madde 11)",
    content: (
      <>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse bilgi talep etme</li>
          <li>İşlenme amacını öğrenme ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
          <li>Silinmesini veya yok edilmesini isteme</li>
          <li>Otomatik sistemler aracılığıyla aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
          <li>Zarara uğramanız halinde zararın giderilmesini talep etme</li>
        </ul>
        <p className="mt-2">Talepler için: INFO@GOKTASGLOBAL.COM</p>
      </>
    ),
  },
  {
    title: "Çerezler (Cookie)",
    content: (
      <>
        <p>Platform oturum yönetimi ve kullanıcı deneyimi için zorunlu çerezler kullanır.</p>
        <p>Analitik çerezler kullanılmaz. Üçüncü taraf reklam çerezleri kullanılmaz.</p>
      </>
    ),
  },
];

const GizlilikPolitikasi = () => { useSEO({ title: "Gizlilik Politikası | Şantiyem" }); return <LegalPage title="Gizlilik Sözleşmesi (KVKK Aydınlatma Metni)" sections={sections} />; };
export default GizlilikPolitikasi;
