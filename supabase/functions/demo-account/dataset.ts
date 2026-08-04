// Demo tenant dataset — deterministic, fictional but interconnected
// construction data for demo@santiyem.ai. Everything is derived from the
// helpers below so the dashboard computes its numbers from real records.

export const DEMO_EMAIL = "demo@santiyem.ai";
export const DEMO_PASSWORD = "123456";
export const DEMO_COMPANY = "Şantiyem AI Demo İnşaat A.Ş.";

export const day = (offset: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
export const ts = (offset: number) => {
  const d = new Date();
  d.setHours(9, 30, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

export const PROJECTS = [
  {
    key: "arsuz",
    name: "Arsuz Sahil Konutları",
    client: "Arsuz Yapı Kooperatifi",
    location: "Hatay / Arsuz",
    manager: "Mehmet Kaya",
    site_responsible: "Osman Şahin",
    description: "3 blok, 96 daireli sahil konut projesi. Kaba yapı devam ediyor.",
    budget: "185000000",
    contract_amount: 185000000,
    status: "Devam Ediyor",
    status_color: "#22C55E",
    progress: 46,
    start: -320,
    end: 260,
  },
  {
    key: "antakya",
    name: "Antakya Ticaret Merkezi",
    client: "Antakya Ticaret A.Ş.",
    location: "Hatay / Antakya",
    manager: "Ayşe Demir",
    site_responsible: "Recep Aydın",
    description: "12.000 m² kapalı alan ticaret merkezi. İnce işler aşamasında.",
    budget: "240000000",
    contract_amount: 240000000,
    status: "Devam Ediyor",
    status_color: "#22C55E",
    progress: 68,
    start: -450,
    end: 150,
  },
  {
    key: "iskenderun",
    name: "İskenderun Villa Projesi",
    client: "Deniz Ailesi",
    location: "Hatay / İskenderun",
    manager: "Elif Öztürk",
    site_responsible: "İbrahim Koç",
    description: "6 adet müstakil villa. Kalıp ve betonarme imalatları sürüyor.",
    budget: "48000000",
    contract_amount: 48000000,
    status: "Devam Ediyor",
    status_color: "#22C55E",
    progress: 27,
    start: -140,
    end: 320,
  },
  {
    key: "defne",
    name: "Defne Okul Binası",
    client: "Hatay İl Milli Eğitim Md.",
    location: "Hatay / Defne",
    manager: "Hasan Çelik",
    site_responsible: "Serkan Yıldız",
    description: "24 derslikli okul binası. Geçici kabul tamamlandı.",
    budget: "62000000",
    contract_amount: 62000000,
    status: "Tamamlandı",
    status_color: "#3B82F6",
    progress: 100,
    start: -700,
    end: -40,
  },
] as const;

export const WAREHOUSES = [
  {
    key: "merkez",
    code: "DP-01",
    name: "Merkez Depo - Antakya",
    warehouse_type: "merkez",
    manager_name: "Kadir Uzun",
    location: "Antakya Organize Sanayi",
    capacity_type: "alan",
    capacity_value: 2400,
    capacity_unit: "m2",
  },
  {
    key: "saha",
    code: "DP-02",
    name: "Arsuz Şantiye Deposu",
    warehouse_type: "saha",
    manager_name: "Osman Şahin",
    location: "Arsuz Sahil Şantiyesi",
    projectKey: "arsuz",
    capacity_type: "alan",
    capacity_value: 800,
    capacity_unit: "m2",
  },
] as const;

export const MATERIALS = [
  { key: "demir12", code: "MLZ-001", name: "İnşaat Demiri Ø12", unit: "ton", category: "Demir", stock_type: "stockable", min_stock: 12, safety_stock: 10, reorder_point: 18, supplier: "Çelik Demir Ltd.", cost: 24500 },
  { key: "demir16", code: "MLZ-002", name: "İnşaat Demiri Ø16", unit: "ton", category: "Demir", stock_type: "stockable", min_stock: 10, safety_stock: 8, reorder_point: 15, supplier: "Çelik Demir Ltd.", cost: 24200 },
  { key: "cimento", code: "MLZ-003", name: "Portland Çimento CEM I 42.5", unit: "ton", category: "Bağlayıcı", stock_type: "stockable", min_stock: 20, safety_stock: 15, reorder_point: 30, supplier: "Nurçim A.Ş.", cost: 3850 },
  { key: "tugla", code: "MLZ-004", name: "Yatay Delikli Tuğla 19cm", unit: "adet", category: "Duvar", stock_type: "stockable", min_stock: 4000, safety_stock: 3000, reorder_point: 6000, supplier: "Toprak Tuğla", cost: 18.5 },
  { key: "xps", code: "MLZ-005", name: "XPS Isı Yalıtım 5cm", unit: "m2", category: "Yalıtım", stock_type: "stockable", min_stock: 500, safety_stock: 400, reorder_point: 800, supplier: "İzoTeknik", cost: 165 },
  { key: "kereste", code: "MLZ-006", name: "Kalıp Kerestesi", unit: "m3", category: "Kalıp", stock_type: "stockable", min_stock: 8, safety_stock: 6, reorder_point: 12, supplier: "Ahşap Yapı", cost: 12800 },
  { key: "kablo", code: "MLZ-007", name: "NYM Kablo 3x2.5", unit: "m", category: "Elektrik", stock_type: "stockable", min_stock: 800, safety_stock: 600, reorder_point: 1200, supplier: "Elektromax", cost: 42 },
  { key: "boya", code: "MLZ-008", name: "İç Cephe Plastik Boya", unit: "kg", category: "Boya", stock_type: "stockable", min_stock: 300, safety_stock: 250, reorder_point: 500, supplier: "Renk Boya", cost: 96 },
  // Ready-mix concrete is explicitly non-stock: consumption is tracked from deliveries.
  { key: "beton", code: "MLZ-009", name: "Hazır Beton C30/37", unit: "m3", category: "Beton", stock_type: "non_stock", min_stock: 0, safety_stock: 0, reorder_point: 0, supplier: "BetonPlus A.Ş.", cost: 2450 },
] as const;

export const PERSONNEL = [
  { full_name: "Mehmet Kaya", occupation: "İnşaat Mühendisi", title: "Şantiye Şefi", employment_type: "monthly_salary", monthly_salary: 92000, daily_wage: 0, projectKey: "arsuz" },
  { full_name: "Ayşe Demir", occupation: "İnşaat Mühendisi", title: "Proje Sorumlusu", employment_type: "monthly_salary", monthly_salary: 78000, daily_wage: 0, projectKey: "antakya" },
  { full_name: "Elif Öztürk", occupation: "Mimar", title: "Proje Mimarı", employment_type: "monthly_salary", monthly_salary: 74000, daily_wage: 0, projectKey: "iskenderun" },
  { full_name: "Hasan Çelik", occupation: "Şantiye Müdürü", title: "Şantiye Md.", employment_type: "monthly_salary", monthly_salary: 105000, daily_wage: 0, projectKey: "antakya" },
  { full_name: "Serkan Yıldız", occupation: "Elektrik Mühendisi", title: "Mühendis", employment_type: "monthly_salary", monthly_salary: 71000, daily_wage: 0, projectKey: "antakya" },
  { full_name: "Osman Şahin", occupation: "Formen", title: "Kalıp Formeni", employment_type: "monthly_salary", monthly_salary: 48000, daily_wage: 0, projectKey: "arsuz" },
  { full_name: "Recep Aydın", occupation: "Formen", title: "Demir Formeni", employment_type: "monthly_salary", monthly_salary: 47000, daily_wage: 0, projectKey: "antakya" },
  { full_name: "İbrahim Koç", occupation: "Formen", title: "Beton Formeni", employment_type: "monthly_salary", monthly_salary: 46000, daily_wage: 0, projectKey: "iskenderun" },
  { full_name: "Ali Yavuz", occupation: "Kalıpçı", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2300, projectKey: "arsuz" },
  { full_name: "Veli Kurt", occupation: "Kalıpçı", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2300, projectKey: "arsuz" },
  { full_name: "Ahmet Doğan", occupation: "Demirci", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2450, projectKey: "arsuz" },
  { full_name: "Mustafa Kılıç", occupation: "Demirci", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2450, projectKey: "antakya" },
  { full_name: "Halil İnce", occupation: "Betoncu", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2150, projectKey: "arsuz" },
  { full_name: "Cem Erdem", occupation: "Duvarcı", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2100, projectKey: "antakya" },
  { full_name: "Sinan Polat", occupation: "Sıvacı", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2100, projectKey: "antakya" },
  { full_name: "Kadir Uzun", occupation: "Depo Sorumlusu", title: "Depo Şefi", employment_type: "monthly_salary", monthly_salary: 42000, daily_wage: 0, projectKey: "antakya" },
  { full_name: "Emre Güneş", occupation: "Elektrikçi", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2400, projectKey: "antakya" },
  { full_name: "Onur Bayram", occupation: "Tesisatçı", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2400, projectKey: "iskenderun" },
  { full_name: "Fatih Yalçın", occupation: "Kaynakçı", title: "", employment_type: "daily_wage", monthly_salary: 0, daily_wage: 2600, projectKey: "iskenderun" },
  { full_name: "Barış Aksoy", occupation: "Sürveyan", title: "Sürveyan", employment_type: "monthly_salary", monthly_salary: 52000, daily_wage: 0, projectKey: "arsuz" },
] as const;

/** Subcontractor crews (taşeron) — contract + partial payments. */
export const SUBCONTRACTORS = [
  { key: "ahmetyapi", name: "Ahmet Yapı", specialty: "Kaba İnşaat / Kalıp-Demir", contact_person: "Ahmet Bozkurt", phone: "0532 415 22 10", projectKey: "arsuz", contract_amount: 28500000, paid: [4500000, 3200000, 2800000], planned: [{ amount: 3500000, offset: 4 }, { amount: 4000000, offset: 22 }] },
  { key: "izoteknik", name: "İzoTeknik Yalıtım", specialty: "Isı ve Su Yalıtımı", contact_person: "Selim Kurt", phone: "0555 318 44 55", projectKey: "antakya", contract_amount: 9200000, paid: [1800000, 1500000], planned: [{ amount: 1200000, offset: 9 }] },
  { key: "elektromax", name: "Elektromax Tesisat", specialty: "Elektrik Tesisatı", contact_person: "Yavuz Şen", phone: "0532 244 55 66", projectKey: "antakya", contract_amount: 12400000, paid: [2600000, 1900000], planned: [{ amount: 2100000, offset: 15 }] },
  { key: "akarsu", name: "AkarSu Mekanik", specialty: "Sıhhi Tesisat / Mekanik", contact_person: "Kemal Bulut", phone: "0533 555 66 77", projectKey: "iskenderun", contract_amount: 6800000, paid: [1400000], planned: [{ amount: 900000, offset: -6 }] },
  { key: "cephe", name: "Cephe A.Ş.", specialty: "Dış Cephe Kaplama", contact_person: "Barış Yıldırım", phone: "0532 777 88 99", projectKey: "antakya", contract_amount: 15600000, paid: [3200000, 2400000], planned: [{ amount: 2800000, offset: 27 }] },
] as const;

/** Suppliers (tedarikçi) used by procurement + material entries. */
export const SUPPLIERS = [
  { name: "BetonPlus A.Ş.", specialty: "Hazır Beton", contact_person: "Murat Bilgin", phone: "0532 111 22 33" },
  { name: "Çelik Demir Ltd.", specialty: "İnşaat Demiri", contact_person: "Hakan Öz", phone: "0533 222 33 44" },
  { name: "Nurçim A.Ş.", specialty: "Çimento", contact_person: "Nuri Çamlı", phone: "0532 909 11 22" },
  { name: "Toprak Tuğla", specialty: "Tuğla / Duvar", contact_person: "Erdem Toprak", phone: "0533 404 55 66" },
  { name: "İzoTeknik", specialty: "Yalıtım Malzemesi", contact_person: "Selim Kurt", phone: "0555 333 44 55" },
  { name: "Ahşap Yapı", specialty: "Kalıp Kerestesi", contact_person: "Yusuf Ekinci", phone: "0532 616 77 88" },
  { name: "Elektromax", specialty: "Elektrik Malzemesi", contact_person: "Yavuz Şen", phone: "0532 444 55 66" },
  { name: "Renk Boya", specialty: "Boya", contact_person: "Deniz Yılmaz", phone: "0555 666 77 88" },
  { name: "Klimatek", specialty: "Havalandırma", contact_person: "Erol Taş", phone: "0533 888 99 00" },
] as const;
