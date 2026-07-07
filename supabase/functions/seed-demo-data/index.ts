// Sprint 10.1 — Demo Company seeder.
// Inserts realistic Şantiyem demo data under the caller's user_id.
// All demo rows are tagged with the marker "[DEMO]" (in name/title/description)
// so they can be safely cleaned up later via action=clean.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_TAG = "[DEMO]";

// -------- Data catalogs --------
const PROJECT_TEMPLATES = [
  // Active (12)
  { name: "Villa Projesi - Çeşme", client: "Yılmaz Ailesi", location: "İzmir/Çeşme", stage: 25, budget: "8500000", status: "Devam Ediyor" },
  { name: "Ofis Kompleksi - Levent", client: "ABC Yapı A.Ş.", location: "İstanbul/Levent", stage: 62, budget: "45000000", status: "Devam Ediyor" },
  { name: "Rezidans Blok A", client: "Mavi Deniz İnşaat", location: "İstanbul/Ataşehir", stage: 45, budget: "62000000", status: "Devam Ediyor" },
  { name: "Rezidans Blok B", client: "Mavi Deniz İnşaat", location: "İstanbul/Ataşehir", stage: 30, budget: "58000000", status: "Devam Ediyor" },
  { name: "Endüstriyel Depo - Gebze", client: "Öztürk Lojistik", location: "Kocaeli/Gebze", stage: 78, budget: "22000000", status: "Devam Ediyor" },
  { name: "Otel Yenileme - Antalya", client: "Deniz Turizm", location: "Antalya/Kemer", stage: 55, budget: "18000000", status: "Devam Ediyor" },
  { name: "AVM Ek Bina", client: "Vadi AVM Ltd.", location: "Ankara/Çankaya", stage: 15, budget: "34000000", status: "Devam Ediyor" },
  { name: "Fabrika Genişleme", client: "Egepan A.Ş.", location: "İzmir/Torbalı", stage: 40, budget: "28000000", status: "Devam Ediyor" },
  { name: "Konut Sitesi - 3 Blok", client: "Nurhak Yapı", location: "Bursa/Nilüfer", stage: 68, budget: "72000000", status: "Devam Ediyor" },
  { name: "Sağlık Merkezi Tadilat", client: "Hayat Hastanesi", location: "İstanbul/Kadıköy", stage: 85, budget: "9500000", status: "Devam Ediyor" },
  { name: "Okul Yapımı", client: "Milli Eğitim İl Md.", location: "Hatay/Arsuz", stage: 22, budget: "38000000", status: "Devam Ediyor" },
  { name: "Villa Tadilatı - Bodrum", client: "Aksoy Ailesi", location: "Muğla/Bodrum", stage: 90, budget: "4200000", status: "Devam Ediyor" },
  // Completed (6)
  { name: "Site Ortak Alan Yenileme", client: "Site Yönetimi", location: "İstanbul/Beylikdüzü", stage: 100, budget: "1800000", status: "Tamamlandı" },
  { name: "Mağaza Dekorasyon", client: "Zen Butik", location: "İstanbul/Nişantaşı", stage: 100, budget: "950000", status: "Tamamlandı" },
  { name: "Cami Yapımı", client: "İl Müftülüğü", location: "Adana/Seyhan", stage: 100, budget: "12000000", status: "Tamamlandı" },
  { name: "Villa - Sarıyer", client: "Demir Ailesi", location: "İstanbul/Sarıyer", stage: 100, budget: "15500000", status: "Tamamlandı" },
  { name: "Ofis Katı Yenileme", client: "Fintek A.Ş.", location: "İstanbul/Maslak", stage: 100, budget: "3400000", status: "Tamamlandı" },
  { name: "Depo Yapımı", client: "GK Lojistik", location: "İstanbul/Hadımköy", stage: 100, budget: "8900000", status: "Tamamlandı" },
];

const PERSONNEL_TEMPLATES = [
  // Engineers
  { full_name: "Mehmet Kaya", occupation: "İnşaat Mühendisi", title: "Şantiye Şefi", employment_type: "monthly_salary", monthly_salary: 85000, daily_wage: 0 },
  { full_name: "Ayşe Demir", occupation: "İnşaat Mühendisi", title: "Proje Sorumlusu", employment_type: "monthly_salary", monthly_salary: 72000, daily_wage: 0 },
  { full_name: "Serkan Yıldız", occupation: "Elektrik Mühendisi", title: "Mühendis", employment_type: "monthly_salary", monthly_salary: 68000, daily_wage: 0 },
  { full_name: "Elif Öztürk", occupation: "Mimar", title: "Proje Mimarı", employment_type: "monthly_salary", monthly_salary: 78000, daily_wage: 0 },
  { full_name: "Burak Aslan", occupation: "Makine Mühendisi", title: "Mekanik Sorumlusu", employment_type: "monthly_salary", monthly_salary: 70000, daily_wage: 0 },
  // Site managers / foremen
  { full_name: "Hasan Çelik", occupation: "Şantiye Müdürü", title: "Şantiye Md.", employment_type: "monthly_salary", monthly_salary: 95000, daily_wage: 0 },
  { full_name: "Osman Şahin", occupation: "Formen", title: "Kalıp Formeni", employment_type: "monthly_salary", monthly_salary: 45000, daily_wage: 0 },
  { full_name: "Recep Aydın", occupation: "Formen", title: "Demir Formeni", employment_type: "monthly_salary", monthly_salary: 44000, daily_wage: 0 },
  { full_name: "İbrahim Koç", occupation: "Formen", title: "Beton Formeni", employment_type: "monthly_salary", monthly_salary: 46000, daily_wage: 0 },
  // Workers (daily wage)
  { full_name: "Ali Yavuz", occupation: "Kalıpçı", employment_type: "daily_wage", daily_wage: 2200, monthly_salary: 0 },
  { full_name: "Veli Kurt", occupation: "Kalıpçı", employment_type: "daily_wage", daily_wage: 2200, monthly_salary: 0 },
  { full_name: "Ahmet Doğan", occupation: "Demirci", employment_type: "daily_wage", daily_wage: 2400, monthly_salary: 0 },
  { full_name: "Mustafa Kılıç", occupation: "Demirci", employment_type: "daily_wage", daily_wage: 2400, monthly_salary: 0 },
  { full_name: "Halil İnce", occupation: "Betoncu", employment_type: "daily_wage", daily_wage: 2100, monthly_salary: 0 },
  { full_name: "Cem Erdem", occupation: "Duvarcı", employment_type: "daily_wage", daily_wage: 2000, monthly_salary: 0 },
  { full_name: "Sinan Polat", occupation: "Sıvacı", employment_type: "daily_wage", daily_wage: 2000, monthly_salary: 0 },
  { full_name: "Kadir Uzun", occupation: "Boyacı", employment_type: "daily_wage", daily_wage: 1900, monthly_salary: 0 },
  { full_name: "Emre Güneş", occupation: "Elektrikçi", employment_type: "daily_wage", daily_wage: 2300, monthly_salary: 0 },
  { full_name: "Onur Bayram", occupation: "Tesisatçı", employment_type: "daily_wage", daily_wage: 2300, monthly_salary: 0 },
  { full_name: "Fatih Yalçın", occupation: "Kaynakçı", employment_type: "daily_wage", daily_wage: 2500, monthly_salary: 0 },
];

const SUBCONTRACTORS = [
  { name: "BetonPlus A.Ş.", specialty: "Hazır Beton", phone: "0532 111 22 33", contact_person: "Murat Bilgin" },
  { name: "Çelik Demir Ltd.", specialty: "İnşaat Demiri", phone: "0533 222 33 44", contact_person: "Hakan Öz" },
  { name: "İzoTeknik", specialty: "Isı Yalıtım", phone: "0555 333 44 55", contact_person: "Selim Kurt" },
  { name: "Elektromax", specialty: "Elektrik Tesisatı", phone: "0532 444 55 66", contact_person: "Yavuz Şen" },
  { name: "AkarSu Tesisat", specialty: "Sıhhi Tesisat", phone: "0533 555 66 77", contact_person: "Kemal Bulut" },
  { name: "Renk Boya", specialty: "Boya İşleri", phone: "0555 666 77 88", contact_person: "Deniz Yılmaz" },
  { name: "Cephe A.Ş.", specialty: "Dış Cephe Kaplama", phone: "0532 777 88 99", contact_person: "Barış Aksoy" },
  { name: "Klimatek", specialty: "Klima/Havalandırma", phone: "0533 888 99 00", contact_person: "Erol Taş" },
];

const MEMORIES = [
  { type: "supplier", category: "supplier", title: "Tercih edilen beton tedarikçisi", content: "BetonPlus A.Ş. hazır beton için tercih ediliyor — kalite ve teslimat süresi tutarlı." },
  { type: "supplier", category: "supplier", title: "Demir tedarikçisi", content: "Çelik Demir Ltd. inşaat demirinde standart tedarikçi. Fiyat müzakeresi genelde 30 gün vade ile yapılır." },
  { type: "preference", category: "material", title: "Beton sınıfı standardı", content: "Perde ve kolonlarda C30, döşemede C25 standarttır. Değişiklik için şantiye şefi onayı gerekir." },
  { type: "preference", category: "material", title: "Yalıtım tercihi", content: "Cephe yalıtımında 5 cm XPS + karbonlu EPS kullanılır. İzoTeknik'ten alınır." },
  { type: "company", category: "rule", title: "Ödeme kuralları", content: "Tedarikçi ödemeleri her ayın 15 ve 30'unda toplu yapılır. Acil ödemeler için genel müdür onayı gerekir." },
  { type: "company", category: "rule", title: "İSG kuralı", content: "Baret ve iş ayakkabısı zorunludur. 3 uyarı sonrası şantiyeden çıkarılır." },
  { type: "company", category: "rule", title: "Puantaj kuralı", content: "Sabah 08:00'de puantaj alınır. Geç kalan yevmiye alamaz, öğleden sonra 0.5 yevmiye sayılır." },
  { type: "decision", category: "decision", title: "Cephe kaplama seçimi", content: "Rezidans projelerinde Cephe A.Ş. ile alüminyum kompozit tercih edildi. Kilogram fiyatı üzerinden anlaşma." },
  { type: "decision", category: "decision", title: "Taşeron değerlendirme", content: "Renk Boya taşeronu kalite sorunları nedeniyle iki projede uyarı aldı. Yeni işlerde alternatif değerlendirilecek." },
  { type: "project", category: "project", title: "Villa Projesi standartları", content: "Villa projelerinde bordo/krem renk paleti, tam masif meşe kapı, doğal taş cephe standarttır." },
  { type: "preference", category: "supplier", title: "Elektrik malzemesi markası", content: "Şalter/priz Legrand veya Viko, kablo Öznur veya HES markası tercih edilir." },
  { type: "preference", category: "material", title: "Sıva kalınlığı", content: "İç sıva 2 cm, dış sıva 3 cm standart. Alçı sıva ıslak hacimlerde kullanılmaz." },
];

// -------- Helpers --------
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]) => arr[rand(arr.length)];
const money = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

async function seed(supabase: any, userId: string) {
  const summary: Record<string, number> = {};

  // 1. Projects
  const projectRows = PROJECT_TEMPLATES.map((p) => ({
    user_id: userId,
    name: `${DEMO_TAG} ${p.name}`,
    client: p.client,
    location: p.location,
    manager: "Mehmet Kaya",
    site_responsible: "Hasan Çelik",
    description: `Demo projesi — ${p.stage}% ilerleme durumunda`,
    budget: p.budget,
    contract_amount: Number(p.budget),
    start_date: daysAgo(p.stage < 100 ? 60 + rand(120) : 180 + rand(180)),
    end_date: p.stage === 100 ? daysAgo(rand(30)) : "",
    progress: p.stage,
    status: p.status,
    status_color: p.status === "Tamamlandı" ? "#22C55E" : "#F59E0B",
  }));
  const { data: projects, error: pErr } = await supabase.from("projects").insert(projectRows).select("id, name");
  if (pErr) throw pErr;
  summary.projects = projects.length;
  const activeProjects = projects.slice(0, 12);

  // 2. Personnel
  const personRows = PERSONNEL_TEMPLATES.map((p) => ({
    user_id: userId,
    full_name: `${DEMO_TAG} ${p.full_name}`,
    occupation: p.occupation,
    title: p.title ?? null,
    phone: `05${30 + rand(9)}${String(rand(10000000)).padStart(7, "0")}`,
    employment_type: p.employment_type,
    daily_wage: p.daily_wage ?? 0,
    monthly_salary: p.monthly_salary ?? 0,
    is_active: true,
    note: "Demo personel kaydı",
  }));
  const { data: personnel, error: perErr } = await supabase.from("personnel").insert(personRows).select("id");
  if (perErr) throw perErr;
  summary.personnel = personnel.length;

  // 3. Assignments — first 8 personnel spread across active projects
  const assignments = [];
  for (let i = 0; i < personnel.length; i++) {
    const proj = activeProjects[i % activeProjects.length];
    assignments.push({
      user_id: userId,
      personnel_id: personnel[i].id,
      project_id: proj.id,
      salary_share_percent: 100,
      is_active: true,
    });
  }
  await supabase.from("personnel_project_assignments").insert(assignments);
  summary.assignments = assignments.length;

  // 4. Subcontractors
  const subRows = SUBCONTRACTORS.map((s) => ({
    user_id: userId,
    name: `${DEMO_TAG} ${s.name}`,
    specialty: s.specialty,
    phone: s.phone,
    contact_person: s.contact_person,
    description: `Demo tedarikçi/taşeron — ${s.specialty}`,
    project_id: activeProjects[rand(activeProjects.length)].id,
    project_ids: [activeProjects[rand(activeProjects.length)].id],
    contract_amount: money(500000, 5000000),
    payment_schedule: [],
    notes: "Demo",
  }));
  const { data: subs, error: sErr } = await supabase.from("subcontractors").insert(subRows).select("id, name");
  if (sErr) throw sErr;
  summary.subcontractors = subs.length;

  // 5. Cash accounts (3)
  const accRows = [
    { user_id: userId, name: `${DEMO_TAG} Merkez Kasa`, account_type: "nakit_kasa", balance: 185000 },
    { user_id: userId, name: `${DEMO_TAG} Ziraat Bankası TL`, account_type: "banka_hesabi", balance: 2340000, bank_name: "Ziraat Bankası", iban: "TR33 0006 4000 0011 2345 6789 01" },
    { user_id: userId, name: `${DEMO_TAG} İş Bankası TL`, account_type: "banka_hesabi", balance: 1120000, bank_name: "İş Bankası", iban: "TR64 0006 4000 0011 9876 5432 10" },
  ];
  const { data: accs } = await supabase.from("cash_accounts").insert(accRows).select("id, name");
  summary.cash_accounts = accs?.length ?? 0;

  // 6. Cash payments (30) & collections (20)
  const payments = [];
  const paymentCats = ["Malzeme", "İşçilik", "Taşeron", "Nakliye", "Kira", "Diğer"];
  for (let i = 0; i < 30; i++) {
    payments.push({
      user_id: userId,
      payment_date: daysAgo(rand(90)),
      recipient: `${DEMO_TAG} ${pick(SUBCONTRACTORS).name}`,
      category: pick(paymentCats),
      project_id: pick(activeProjects).id,
      amount: money(15000, 350000),
      payment_type: pick(["nakit", "havale", "cek"]),
      status: "odendi",
      description: "Demo ödeme",
      account_id: accs?.[rand(accs?.length ?? 1)]?.id,
    });
  }
  await supabase.from("cash_payments").insert(payments);
  summary.cash_payments = payments.length;

  const collections = [];
  for (let i = 0; i < 20; i++) {
    collections.push({
      user_id: userId,
      collection_date: daysAgo(rand(90)),
      sender: `${DEMO_TAG} ${pick(PROJECT_TEMPLATES.slice(0, 8)).client}`,
      collection_type: pick(["hakedis", "avans", "diger"]),
      project_id: pick(activeProjects).id,
      amount: money(50000, 800000),
      payment_type: pick(["havale", "cek"]),
      status: pick(["tahsil_edildi", "bekleniyor"]),
      description: "Demo tahsilat",
      account_id: accs?.[0]?.id,
    });
  }
  await supabase.from("cash_collections").insert(collections);
  summary.cash_collections = collections.length;

  // 7. Cash checks (15)
  const checks = [];
  for (let i = 0; i < 15; i++) {
    const isPayable = i % 2 === 0;
    checks.push({
      user_id: userId,
      check_type: isPayable ? "verilen" : "alinan",
      check_no: `${100000 + i}`,
      bank_name: pick(["Ziraat", "İş Bankası", "Garanti", "Akbank", "Vakıfbank"]),
      counterparty: `${DEMO_TAG} ${isPayable ? pick(SUBCONTRACTORS).name : pick(PROJECT_TEMPLATES.slice(0, 8)).client}`,
      amount: money(25000, 500000),
      due_date: daysAgo(-rand(90)),
      project_id: pick(activeProjects).id,
      status: pick(["bekliyor", "odendi", "tahsil_edildi"]),
    });
  }
  await supabase.from("cash_checks").insert(checks);
  summary.cash_checks = checks.length;

  // 8. Materials (5 per active project first 6) + entries + exits
  const materialCatalog = [
    { name: "Hazır Beton C30", unit: "m³", min_stock: 20 },
    { name: "İnşaat Demiri Ø12", unit: "kg", min_stock: 500 },
    { name: "Çimento", unit: "torba", min_stock: 50 },
    { name: "Tuğla 8.5 lik", unit: "adet", min_stock: 1000 },
    { name: "XPS Yalıtım 5cm", unit: "m²", min_stock: 100 },
  ];
  const materials = [];
  for (const proj of activeProjects.slice(0, 6)) {
    for (const m of materialCatalog) {
      materials.push({
        user_id: userId,
        project_id: proj.id,
        name: `${DEMO_TAG} ${m.name}`,
        unit: m.unit,
        min_stock: m.min_stock,
      });
    }
  }
  const { data: mats } = await supabase.from("materials").insert(materials).select("id");
  summary.materials = mats?.length ?? 0;

  const entries = [];
  const exits = [];
  for (const m of (mats ?? []).slice(0, 20)) {
    entries.push({
      user_id: userId,
      material_id: m.id,
      entry_date: daysAgo(rand(30)),
      quantity: money(50, 300),
      unit_price: money(200, 3000),
      total_amount: money(20000, 200000),
      supplier: pick(SUBCONTRACTORS).name,
      note: "Demo giriş",
    });
    exits.push({
      user_id: userId,
      material_id: m.id,
      exit_date: daysAgo(rand(20)),
      quantity: money(20, 150),
      location: "Şantiye deposu",
      note: "Demo çıkış",
    });
  }
  await supabase.from("material_entries").insert(entries);
  await supabase.from("material_exits").insert(exits);
  summary.material_entries = entries.length;
  summary.material_exits = exits.length;

  // 9. Tasks (per active project — 3 each)
  const tasks = [];
  const taskTemplates = [
    { title: "Kalıp söküm işi", priority: "high" },
    { title: "Demir bağlama kontrolü", priority: "normal" },
    { title: "Beton dökümü planlaması", priority: "urgent" },
    { title: "Tesisat çalışması", priority: "normal" },
    { title: "İSG denetimi", priority: "high" },
    { title: "Malzeme siparişi", priority: "normal" },
  ];
  for (const proj of activeProjects) {
    for (let i = 0; i < 3; i++) {
      const t = pick(taskTemplates);
      tasks.push({
        project_id: proj.id,
        title: `${DEMO_TAG} ${t.title} — ${proj.name.replace(DEMO_TAG, "").trim()}`,
        description: "Demo görev",
        status: pick(["todo", "in_progress", "done"]),
        priority: t.priority,
        due_date: daysAgo(-rand(21)),
        created_by: userId,
        sort_order: i,
      });
    }
  }
  await supabase.from("tasks").insert(tasks);
  summary.tasks = tasks.length;

  // 10. Site diary (last 10 days for 4 projects)
  const diary = [];
  for (const proj of activeProjects.slice(0, 4)) {
    for (let d = 1; d <= 10; d++) {
      diary.push({
        user_id: userId,
        project_id: proj.id,
        entry_date: daysAgo(d),
        weather_icon: pick(["☀️", "⛅", "🌧️", "☁️"]),
        weather_temp: 15 + rand(20),
        work_status: "normal",
        crews: [{ occupation: "Kalıpçı", count: 4 + rand(6) }, { occupation: "Demirci", count: 3 + rand(4) }],
        work_done: `${DEMO_TAG} ${pick(["Kalıp söküldü", "Demir bağlandı", "Beton döküldü", "Tesisat yapıldı", "Sıva çekildi"])}`,
        materials: [],
        machines: [],
        special_events: [],
        general_note: "Demo günlük",
        status: "published",
      });
    }
  }
  await supabase.from("site_diary_entries").insert(diary);
  summary.site_diary = diary.length;

  // 11. Worker attendance (today + 5 days) — 8 workers per project first 4
  const attendance = [];
  for (const proj of activeProjects.slice(0, 4)) {
    for (let d = 0; d < 6; d++) {
      for (let w = 0; w < 8; w++) {
        const person = pick(PERSONNEL_TEMPLATES.slice(9)); // workers
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() - d);
        checkIn.setHours(8, rand(30), 0, 0);
        const checkOut = new Date(checkIn);
        checkOut.setHours(17, 30, 0, 0);
        attendance.push({
          project_id: proj.id,
          user_id: userId,
          qr_token: `demo-${proj.id}`,
          full_name: `${DEMO_TAG} ${person.full_name}`,
          occupation: person.occupation,
          check_in: checkIn.toISOString(),
          check_out: checkOut.toISOString(),
          duration_minutes: 9 * 60 + rand(60),
          entry_type: "individual",
          team_size: 1,
        });
      }
    }
  }
  await supabase.from("worker_attendance").insert(attendance);
  summary.attendance = attendance.length;

  // 12. Project expenses (5 per project, first 8)
  const expenses = [];
  const expCats = ["Malzeme", "İşçilik", "Nakliye", "Kira", "Diğer"];
  for (const proj of activeProjects.slice(0, 8)) {
    for (let i = 0; i < 5; i++) {
      expenses.push({
        project_id: proj.id,
        user_id: userId,
        category: pick(expCats),
        description: `${DEMO_TAG} ${pick(["Beton alımı", "İşçilik hakedişi", "Nakliye faturası", "Elektrik", "Su"])}`,
        amount: money(5000, 120000),
        expense_date: daysAgo(rand(60)),
        has_invoice: Math.random() > 0.4,
        source: "manual",
      });
    }
  }
  await supabase.from("project_expenses").insert(expenses);
  summary.project_expenses = expenses.length;

  // 13. Reminders (10, some upcoming)
  const reminders = [];
  const reminderTitles = [
    "Beton dökümü onayı", "Hakediş imzası", "İSG toplantısı", "Malzeme teslim alma",
    "Taşeron ödeme günü", "Belediye kontrolü", "Elektrik ruhsatı", "Yalıtım denetimi",
    "Sözleşme yenileme", "Fatura ödeme",
  ];
  for (let i = 0; i < 10; i++) {
    reminders.push({
      user_id: userId,
      title: `${DEMO_TAG} ${reminderTitles[i]}`,
      reminder_date: daysAgo(-rand(14)),
      note: "Demo hatırlatma",
      done: false,
    });
  }
  await supabase.from("reminders").insert(reminders);
  summary.reminders = reminders.length;

  // 14. Company memories
  const memRows = MEMORIES.map((m) => ({
    user_id: userId,
    type: m.type,
    category: m.category,
    title: `${DEMO_TAG} ${m.title}`,
    content: m.content,
    source: "demo_seed",
    created_from: "demo_seed",
    confidence: 0.9,
    pinned: m.type === "company",
    user_confirmed: true,
  }));
  await supabase.from("company_memories").insert(memRows);
  summary.company_memories = memRows.length;

  return summary;
}

/**
 * Sprint 18.2 — Full cleanup with integrity verification.
 * Deletes every table this seeder writes to, in FK-safe order, then verifies
 * that zero [DEMO]-tagged rows remain for this user.
 */
async function clean(supabase: any, userId: string) {
  const like = `${DEMO_TAG}%`;
  const summary: Record<string, number> = {};
  const add = (t: string, n: number) => { summary[t] = (summary[t] || 0) + (n || 0); };

  // ---- Resolve demo entity ids ----
  const { data: projs } = await supabase.from("projects").select("id").eq("user_id", userId).ilike("name", like);
  const projectIds: string[] = (projs || []).map((p: any) => p.id);

  const { data: persons } = await supabase.from("personnel").select("id").eq("user_id", userId).ilike("full_name", like);
  const personnelIds: string[] = (persons || []).map((p: any) => p.id);

  const matByName = await supabase.from("materials").select("id").eq("user_id", userId).ilike("name", like);
  let materialIds: string[] = (matByName.data || []).map((m: any) => m.id);
  if (projectIds.length) {
    const matByProj = await supabase.from("materials").select("id").eq("user_id", userId).in("project_id", projectIds);
    materialIds = Array.from(new Set([...materialIds, ...((matByProj.data || []).map((m: any) => m.id))]));
  }

  // ---- Child rows first ----
  if (materialIds.length) {
    const e = await supabase.from("material_entries").delete({ count: "exact" }).in("material_id", materialIds);
    add("material_entries", e.count || 0);
    const x = await supabase.from("material_exits").delete({ count: "exact" }).in("material_id", materialIds);
    add("material_exits", x.count || 0);
  }
  if (personnelIds.length) {
    const a = await supabase.from("personnel_project_assignments").delete({ count: "exact" }).in("personnel_id", personnelIds);
    add("personnel_project_assignments", a.count || 0);
  }

  // ---- Tag-scoped deletes ----
  const del = async (table: string, col: string) => {
    const { count } = await supabase.from(table).delete({ count: "exact" }).eq("user_id", userId).ilike(col, like);
    add(table, count || 0);
  };
  await del("company_memories", "title");
  await del("reminders", "title");
  await del("cash_checks", "counterparty");
  await del("cash_collections", "sender");
  await del("cash_payments", "recipient");
  await del("cash_accounts", "name");
  // tasks has no user_id column — scope by created_by
  {
    const { count } = await supabase.from("tasks").delete({ count: "exact" }).eq("created_by", userId).ilike("title", like);
    add("tasks", count || 0);
  }
  await del("site_diary_entries", "work_done");
  await del("worker_attendance", "full_name");
  await del("project_expenses", "description");
  await del("subcontractors", "name");

  if (materialIds.length) {
    const m = await supabase.from("materials").delete({ count: "exact" }).in("id", materialIds).eq("user_id", userId);
    add("materials", m.count || 0);
  }
  if (personnelIds.length) {
    const p = await supabase.from("personnel").delete({ count: "exact" }).in("id", personnelIds).eq("user_id", userId);
    add("personnel", p.count || 0);
  }

  // ---- Project-scoped sweep (safety net for any remaining child rows) ----
  if (projectIds.length) {
    const projectChildren = [
      "tasks","site_diary_entries","site_diary_photos","project_expenses","project_notes","project_milestones","project_files",
      "cash_payments","cash_collections","cash_checks","subcontractor_payments","e_invoices",
      "worker_attendance","attendance_records","personnel_project_assignments",
    ];
    for (const t of projectChildren) {
      const { count } = await supabase.from(t).delete({ count: "exact" }).eq("user_id", userId).in("project_id", projectIds);
      if (count) add(t, count);
    }
    const pr = await supabase.from("projects").delete({ count: "exact" }).in("id", projectIds).eq("user_id", userId);
    add("projects", pr.count || 0);
  }

  // ---- Integrity check: no [DEMO] rows may remain ----
  const leftovers = await integrityCheck(supabase, userId);
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  return { summary, leftovers, total_deleted: total, verified: leftovers.total === 0 };
}

/**
 * Counts any remaining [DEMO]-tagged rows for this user across every affected table.
 * Returns per-table counts and grand total. verified == (total === 0).
 */
async function integrityCheck(supabase: any, userId: string) {
  const like = `${DEMO_TAG}%`;
  const probes: Array<[string, string]> = [
    ["projects", "name"],
    ["personnel", "full_name"],
    ["subcontractors", "name"],
    ["cash_accounts", "name"],
    ["cash_payments", "recipient"],
    ["cash_collections", "sender"],
    ["cash_checks", "counterparty"],
    ["materials", "name"],
    ["tasks", "title"],
    ["site_diary_entries", "work_done"],
    ["worker_attendance", "full_name"],
    ["project_expenses", "description"],
    ["reminders", "title"],
    ["company_memories", "title"],
  ];
  const per: Record<string, number> = {};
  let total = 0;
  for (const [t, c] of probes) {
    const { count } = await supabase.from(t).select("id", { count: "exact", head: true }).eq("user_id", userId).ilike(c, like);
    if (count) { per[t] = count; total += count; }
  }
  return { per_table: per, total };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: uErr } = await supabase.auth.getUser(jwt);
    if (uErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const action = body.action === "clean" ? "clean" : "seed";

    if (action === "clean") {
      const result = await clean(supabase, user.id);
      if (!result.verified) {
        return new Response(JSON.stringify({
          ok: false,
          action,
          error: `Cleanup incomplete: ${result.leftovers.total} [DEMO] rows remain`,
          summary: result.summary,
          leftovers: result.leftovers,
          total_deleted: result.total_deleted,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        ok: true, action,
        summary: result.summary,
        total_deleted: result.total_deleted,
        verified: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const summary = await seed(supabase, user.id);
    return new Response(JSON.stringify({ ok: true, action, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
