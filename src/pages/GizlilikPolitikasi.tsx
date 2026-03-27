import LegalPage from "./LegalPage";

const sections = [
  {
    title: "Toplanan Veriler",
    content: (
      <>
        <p>MühendisAI aşağıdaki kişisel verileri toplar:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Kayıt sırasında:</strong> Ad soyad, e-posta adresi, unvan, il bilgisi</li>
          <li><strong>Kullanım sırasında:</strong> Platform üzerinde gerçekleştirilen işlemler, yüklenen dosyalar, sohbet geçmişi</li>
          <li><strong>Ödeme sırasında:</strong> Ödeme işlemleri iyzico altyapısı üzerinden gerçekleştirilir. Kart bilgileri platformumuzda saklanmaz.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Verilerin Kullanım Amacı",
    content: (
      <>
        <p>Toplanan veriler şu amaçlarla kullanılır:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Hizmetin sunulması ve kişiselleştirilmesi</li>
          <li>Hesap yönetimi ve güvenliği</li>
          <li>Faturalama ve ödeme işlemleri</li>
          <li>Platform iyileştirmeleri</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        </ul>
      </>
    ),
  },
  {
    title: "Verilerin Saklanması",
    content: <p>Kişisel veriler, hizmetin sunulması için gerekli olduğu süre boyunca saklanır. Hesap silme talebinde veriler yasal saklama süresi sonunda silinir.</p>,
  },
  {
    title: "Verilerin Paylaşımı",
    content: (
      <>
        <p>Kişisel verileriniz üçüncü taraflarla şu durumlar dışında paylaşılmaz:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Ödeme altyapısı sağlayıcısı (iyzico) — sadece ödeme işlemleri için</li>
          <li>Yapay zeka hizmet sağlayıcısı (Anthropic) — sadece içerik üretimi için, kişisel veri aktarımı yapılmaz</li>
          <li>Yasal zorunluluk halleri</li>
        </ul>
      </>
    ),
  },
  {
    title: "Çerezler",
    content: <p>Platform oturum yönetimi ve kullanıcı deneyimini iyileştirmek amacıyla çerez kullanır. Tarayıcı ayarlarından çerezleri devre dışı bırakabilirsiniz.</p>,
  },
  {
    title: "KVKK Kapsamındaki Haklarınız",
    content: (
      <>
        <p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında şu haklara sahipsiniz:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse bilgi talep etme</li>
          <li>İşlenme amacını öğrenme</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
          <li>Silinmesini veya yok edilmesini isteme</li>
          <li>Otomatik sistemler aracılığıyla aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
        </ul>
        <p>Talepler için: info@goktasglobal.com</p>
      </>
    ),
  },
  {
    title: "Veri Güvenliği",
    content: <p>Platform, kişisel verilerin güvenliği için SSL şifreleme ve güvenli sunucu altyapısı kullanır. İletişim: info@goktasglobal.com</p>,
  },
];

const GizlilikPolitikasi = () => <LegalPage title="Gizlilik Politikası" sections={sections} />;
export default GizlilikPolitikasi;
