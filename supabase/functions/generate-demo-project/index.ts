// Generate a rich demo construction project for the authenticated user.
// Uses service role for inserts but authorizes via JWT + asymmetric getClaims.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_PROJECT_NAME = "Arsuz Modern Villas";

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const money = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) / 500) * 500;
const dateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user via asymmetric keys (getClaims) — MUST pass the JWT explicitly,
    // same pattern as the chat function (getClaims() with no arg reads a non-existent session → 401).
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(jwt);
    const uid: string | undefined = claimsData?.claims?.sub;
    if (claimsErr || !uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const confirm: boolean = !!body?.confirm;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Existence check
    const { data: existing } = await admin
      .from("projects")
      .select("id,name")
      .eq("user_id", uid)
      .eq("name", DEMO_PROJECT_NAME)
      .maybeSingle();

    if (existing && !confirm) {
      return new Response(
        JSON.stringify({ status: "confirm_required", message: "Demo veri zaten mevcut. Yeni bir demo proje daha eklemek istiyor musunuz?" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------------- PROJECT ----------------
    const projectName = existing ? `${DEMO_PROJECT_NAME} (${new Date().toISOString().slice(0, 10)})` : DEMO_PROJECT_NAME;
    const { data: project, error: pErr } = await admin
      .from("projects")
      .insert({
        user_id: uid,
        name: projectName,
        client: "Arsuz Yapı A.Ş.",
        location: "Hatay / Arsuz",
        manager: "Doğuş Göktaş",
        site_responsible: "Mustafa Yılmaz",
        description: "Deniz manzaralı 4 blokluk modern villa projesi (A, B, C, D Blok). Toplam 48 daire.",
        budget: "185000000",
        contract_amount: 185000000,
        start_date: "2026-02-03",
        end_date: "2026-12-30",
        status: "Devam Ediyor",
        status_color: "#22C55E",
        progress: 42,
      })
      .select("id")
      .single();
    if (pErr) throw pErr;
    const projectId: string = project.id;
    const projectIdText = projectId;

    const counts: Record<string, number> = { project: 1 };

    // ---------------- SUBCONTRACTORS ----------------
    const subDefs = [
      { name: "Mehmet Kalıp İnş. Ltd.", contact: "Mehmet Aksoy", phone: "05321112201", specialty: "Kalıp", amount: 8500000 },
      { name: "Ali Demir Donatı", contact: "Ali Kaya", phone: "05321112202", specialty: "Demir Donatı", amount: 12500000 },
      { name: "ABC Beton A.Ş.", contact: "Serkan Öztürk", phone: "05321112203", specialty: "Hazır Beton", amount: 18000000 },
      { name: "XYZ Elektrik", contact: "Hakan Demir", phone: "05321112204", specialty: "Elektrik Tesisatı", amount: 9500000 },
      { name: "Delta Mekanik", contact: "Emre Aydın", phone: "05321112205", specialty: "Mekanik Tesisat", amount: 11000000 },
      { name: "Atlas Cephe Sistemleri", contact: "Barış Şen", phone: "05321112206", specialty: "Cephe Kaplama", amount: 14500000 },
      { name: "Zirve Boya Uygulama", contact: "Kemal Yıldız", phone: "05321112207", specialty: "Boya", amount: 4800000 },
      { name: "Ege Seramik Uyg.", contact: "Yusuf Arslan", phone: "05321112208", specialty: "Seramik", amount: 6200000 },
      { name: "Yıldız Alçı", contact: "Osman Çelik", phone: "05321112209", specialty: "Alçı & Sıva", amount: 5400000 },
      { name: "Güven İskele", contact: "İbrahim Doğan", phone: "05321112210", specialty: "İskele", amount: 3200000 },
      { name: "Nur Peyzaj", contact: "Ayhan Kurt", phone: "05321112211", specialty: "Peyzaj", amount: 2800000 },
      { name: "Marmara Asansör", contact: "Fatih Erdem", phone: "05321112212", specialty: "Asansör", amount: 4200000 },
    ];
    const subRows = subDefs.map((s) => ({
      user_id: uid,
      name: s.name,
      contact_person: s.contact,
      phone: s.phone,
      specialty: s.specialty,
      contract_amount: s.amount,
      project_id: projectIdText,
      project_ids: [projectIdText],
      description: `${s.specialty} işleri — ${projectName}`,
      notes: `Sözleşme: 03.02.2026 - 30.12.2026`,
    }));
    const { data: subs, error: sErr } = await admin.from("subcontractors").insert(subRows).select("id,name,specialty,contract_amount");
    if (sErr) throw sErr;
    counts.subcontractors = subs?.length ?? 0;

    // ---------------- CONTRACTS (per subcontractor) ----------------
    const contractRows = subs!.map((s) => ({
      user_id: uid,
      project_id: projectIdText,
      name: `${s.specialty} Sözleşmesi — ${s.name}`,
      counterparty: s.name,
      amount: s.contract_amount,
      start_date: "2026-02-03",
      end_date: "2026-12-30",
      contract_type: "taseron",
      status: "aktif",
      notes: "Demo sözleşme",
    }));
    const { data: contracts } = await admin.from("contracts").insert(contractRows).select("id,counterparty,amount");
    counts.contracts = contracts?.length ?? 0;

    // ---------------- PERSONNEL ----------------
    const persDefs = [
      { name: "Doğuş Göktaş", title: "Proje Müdürü", occ: "Proje Müdürü", type: "monthly_salary", salary: 95000, phone: "05331000101" },
      { name: "Mustafa Yılmaz", title: "Şantiye Şefi", occ: "Şantiye Şefi", type: "monthly_salary", salary: 78000, phone: "05331000102" },
      { name: "Cem Aksoy", title: "İnşaat Mühendisi", occ: "İnşaat Mühendisi", type: "monthly_salary", salary: 62000, phone: "05331000103" },
      { name: "Elif Şen", title: "İnşaat Mühendisi", occ: "İnşaat Mühendisi", type: "monthly_salary", salary: 58000, phone: "05331000104" },
      { name: "Zeynep Kaya", title: "Mimar", occ: "Mimar", type: "monthly_salary", salary: 55000, phone: "05331000105" },
      { name: "Serhat Öz", title: "Makine Mühendisi", occ: "Makine Mühendisi", type: "monthly_salary", salary: 60000, phone: "05331000106" },
      { name: "Barış Kurt", title: "Elektrik Mühendisi", occ: "Elektrik Mühendisi", type: "monthly_salary", salary: 60000, phone: "05331000107" },
      { name: "Ayşe Demir", title: "Metraj Mühendisi", occ: "Metraj/Hakediş", type: "monthly_salary", salary: 52000, phone: "05331000108" },
      { name: "Kerem Yıldız", title: "İSG Uzmanı", occ: "İş Güvenliği", type: "monthly_salary", salary: 48000, phone: "05331000109" },
      { name: "Osman Arslan", title: "Kalıp Ustabaşı", occ: "Ustabaşı", type: "daily_wage", wage: 2500, phone: "05331000110" },
      { name: "Halil Çelik", title: "Demir Ustabaşı", occ: "Ustabaşı", type: "daily_wage", wage: 2500, phone: "05331000111" },
      { name: "Ramazan Doğan", title: "Beton Ustabaşı", occ: "Ustabaşı", type: "daily_wage", wage: 2400, phone: "05331000112" },
      { name: "Fatma Uçar", title: "Şantiye Sekreteri", occ: "Sekreter", type: "monthly_salary", salary: 32000, phone: "05331000113" },
      { name: "Hüseyin Kılıç", title: "Depo Sorumlusu", occ: "Depo", type: "monthly_salary", salary: 34000, phone: "05331000114" },
      { name: "Mehmet Şahin", title: "Kalıp Ustası", occ: "Kalıpçı", type: "daily_wage", wage: 1800, phone: "05331000115" },
      { name: "Ali Yavuz", title: "Demir Ustası", occ: "Demirci", type: "daily_wage", wage: 1800, phone: "05331000116" },
      { name: "İbrahim Aslan", title: "Duvar Ustası", occ: "Duvarcı", type: "daily_wage", wage: 1700, phone: "05331000117" },
      { name: "Yusuf Koç", title: "Düz İşçi", occ: "İşçi", type: "daily_wage", wage: 1200, phone: "05331000118" },
    ];
    const persRows = persDefs.map((p) => ({
      user_id: uid,
      full_name: p.name,
      phone: p.phone,
      title: p.title,
      occupation: p.occ,
      employment_type: p.type,
      monthly_salary: p.type === "monthly_salary" ? p.salary : 0,
      daily_wage: p.type === "daily_wage" ? p.wage : 0,
      is_active: true,
    }));
    const { data: pers } = await admin.from("personnel").insert(persRows).select("id,full_name");
    counts.personnel = pers?.length ?? 0;

    // Assign all personnel to the project
    if (pers?.length) {
      await admin.from("personnel_project_assignments").insert(
        pers.map((p) => ({ user_id: uid, personnel_id: p.id, project_id: projectId, is_active: true })),
      );
    }

    // ---------------- MATERIALS ----------------
    const matDefs = [
      { name: "C30 Beton", unit: "m³", price: 3200, in: 850, out: 620 },
      { name: "C35 Beton", unit: "m³", price: 3400, in: 420, out: 300 },
      { name: "Nervürlü Demir Ø12", unit: "ton", price: 28500, in: 42, out: 32 },
      { name: "Nervürlü Demir Ø16", unit: "ton", price: 28500, in: 55, out: 40 },
      { name: "Nervürlü Demir Ø20", unit: "ton", price: 28500, in: 38, out: 25 },
      { name: "CEM I 42,5 Çimento", unit: "ton", price: 3800, in: 120, out: 95 },
      { name: "Tuğla (19'luk)", unit: "adet", price: 12, in: 85000, out: 55000 },
      { name: "Ytong Bloktaş", unit: "m³", price: 2200, in: 340, out: 220 },
      { name: "Seramik Kaplama", unit: "m²", price: 380, in: 4200, out: 1800 },
      { name: "İç Cephe Boyası", unit: "kg", price: 95, in: 1800, out: 850 },
      { name: "XPS Isı Yalıtım", unit: "m²", price: 165, in: 3800, out: 2100 },
    ];
    const matRows = matDefs.map((m) => ({ user_id: uid, project_id: projectIdText, name: m.name, unit: m.unit, min_stock: 0 }));
    const { data: mats } = await admin.from("materials").insert(matRows).select("id,name");
    counts.materials = mats?.length ?? 0;

    // Material entries + exits
    if (mats?.length) {
      const entries: any[] = [];
      const exits: any[] = [];
      mats.forEach((m, idx) => {
        const def = matDefs[idx];
        entries.push({
          user_id: uid, material_id: m.id,
          entry_date: dateStr(2026, ri(2, 5), ri(1, 28)),
          quantity: def.in, unit_price: def.price, total_amount: def.in * def.price,
          supplier: rand(["Yıldız Yapı Malzeme", "Ege İnşaat", "Marmara Ticaret", "Hatay Malzeme"]),
          waybill_no: `IRS-${ri(10000, 99999)}`,
        });
        exits.push({
          user_id: uid, material_id: m.id,
          exit_date: dateStr(2026, ri(3, 7), ri(1, 28)),
          quantity: def.out, location: rand(["A Blok", "B Blok", "C Blok", "D Blok"]),
          note: "Şantiye kullanımı",
        });
      });
      await admin.from("material_entries").insert(entries);
      await admin.from("material_exits").insert(exits);
      counts.material_movements = entries.length + exits.length;
    }

    // ---------------- SUBCONTRACTOR PAYMENTS + CASH ----------------
    const subPaymentRows: any[] = [];
    const cashRows: any[] = [];
    for (const s of subs!) {
      const paidCount = ri(2, 4);
      const perPay = Math.round(Number(s.contract_amount) * 0.15);
      for (let i = 0; i < paidCount; i++) {
        const pd = dateStr(2026, ri(2, 7), ri(1, 28));
        const method = rand(["havale", "cek", "nakit"]);
        subPaymentRows.push({
          user_id: uid, subcontractor_id: s.id, amount: perPay,
          payment_date: pd, payment_method: method, project_id: projectIdText,
          status: "odendi", description: `${s.name} ara ödeme #${i + 1}`,
        });
      }
    }
    const { data: subPays } = await admin.from("subcontractor_payments").insert(subPaymentRows).select("id,subcontractor_id,amount,payment_date,payment_method,description");
    counts.subcontractor_payments = subPays?.length ?? 0;

    // Mirror cash rows for subcontractor payments (as "Taşeron Ödemesi")
    if (subPays?.length) {
      const subMap = new Map(subs!.map((s) => [s.id, s.name]));
      for (const p of subPays) {
        cashRows.push({
          user_id: uid, recipient: subMap.get(p.subcontractor_id) || "Taşeron",
          category: "Taşeron Ödemesi", amount: p.amount, payment_date: p.payment_date,
          payment_type: p.payment_method === "cek" ? "cek" : p.payment_method === "havale" ? "havale" : "nakit",
          project_id: projectIdText, status: "odendi",
          description: p.description, source_type: "subcontractor_payment", source_id: p.id,
        });
      }
    }

    // Additional non-subcontractor cash payments to reach ~60 total
    const otherCats = [
      { cat: "Malzeme", recipients: ["Yıldız Yapı Malzeme", "Ege İnşaat Ltd.", "Marmara Ticaret"] },
      { cat: "Ekipman Kirası", recipients: ["Kule Vinç Kiralama", "İskele Kiralama A.Ş."] },
      { cat: "Yakıt", recipients: ["Opet Petrol", "Shell Arsuz"] },
      { cat: "Personel", recipients: ["Maaş Ödemesi", "SGK Primi"] },
      { cat: "Resmi Ödeme", recipients: ["Belediye Harç", "Vergi Dairesi", "SGK"] },
      { cat: "Ofis Gideri", recipients: ["Kırtasiye", "Telefon Faturası", "İnternet"] },
    ];
    const otherNeeded = Math.max(0, 60 - (subPays?.length ?? 0));
    for (let i = 0; i < otherNeeded; i++) {
      const bucket = rand(otherCats);
      cashRows.push({
        user_id: uid,
        recipient: rand(bucket.recipients),
        category: bucket.cat,
        amount: money(5000, 250000),
        payment_date: dateStr(2026, ri(2, 7), ri(1, 28)),
        payment_type: rand(["nakit", "havale", "kredi_karti"]),
        project_id: projectIdText,
        status: "odendi",
        description: `${bucket.cat} — demo`,
      });
    }
    await admin.from("cash_payments").insert(cashRows);
    counts.cash_payments = cashRows.length;

    // ---------------- HAKEDİŞ ----------------
    const hakStatuses = [
      { s: "Ödendi", c: "#22C55E", approval: "onaylandi", paid: true },
      { s: "Onaylandı", c: "#3B82F6", approval: "onaylandi", paid: false },
      { s: "Bekliyor", c: "#F59E0B", approval: "gonderildi", paid: false },
      { s: "Taslak", c: "#64748B", approval: "taslak", paid: false },
    ];
    const hakRows: any[] = [];
    for (let i = 0; i < 15; i++) {
      const sub = rand(subs!);
      const stat = rand(hakStatuses);
      const gross = money(400000, 2500000);
      const kdv = Math.round(gross * 0.2);
      const deductions = Math.round(gross * 0.05);
      const net = gross + kdv - deductions;
      hakRows.push({
        user_id: uid, project_id: projectIdText,
        period: `2026-${String(ri(2, 7)).padStart(2, "0")} #${i + 1}`,
        amount: gross, kdv, net: gross - deductions,
        gross_total: gross, deductions_total: deductions, net_total: net,
        status: stat.s, status_color: stat.c, approval_status: stat.approval,
        payment_date: stat.paid ? dateStr(2026, ri(3, 7), ri(1, 28)) : null,
        client_email: "info@arsuzyapi.com",
      });
    }
    await admin.from("project_hakedis").insert(hakRows);
    counts.hakedis = hakRows.length;

    // ---------------- TASKS ----------------
    const taskDefs = [
      "Temel kazısı - A Blok", "Temel kazısı - B Blok", "Temel betonu - A Blok", "Temel betonu - B Blok",
      "Kolonlar - A Blok Zemin", "Kolonlar - B Blok Zemin", "Perde duvarlar - A Blok",
      "Kalıp işleri - A Blok 1. Kat", "Demir donatı - A Blok 1. Kat", "Beton dökümü - A Blok 1. Kat",
      "Kalıp işleri - B Blok 1. Kat", "Beton dökümü - B Blok 1. Kat",
      "C Blok temel kazısı", "C Blok temel betonu", "D Blok kazı",
      "Tuğla duvar - A Blok Zemin", "Tuğla duvar - A Blok 1. Kat", "Tuğla duvar - B Blok",
      "Elektrik kaba tesisat - A Blok", "Elektrik kaba tesisat - B Blok",
      "Mekanik tesisat - A Blok", "Mekanik tesisat - B Blok",
      "Çatı imalatı - A Blok", "Çatı imalatı - B Blok",
      "İç sıva - A Blok", "Dış cephe mantolama - A Blok",
      "Boya - A Blok iç mekan", "Seramik döşeme - A Blok banyolar",
      "Cephe kaplama - A Blok", "Peyzaj başlangıç - Ortak alan",
      "Merdiven imalatı - A Blok", "Asansör kuyusu - A Blok",
      "Yangın tesisatı - A Blok", "Doğalgaz tesisatı - A Blok",
      "Isı yalıtım - B Blok", "Su yalıtımı - A Blok teras",
      "Alçıpan tavan - A Blok", "Parke döşeme - A Blok",
      "Mutfak dolapları montaj - A Blok", "Kapı montajı - A Blok",
      "Bahçe duvarı", "Otopark asfaltı", "Kaldırım imalatı",
      "Site giriş kapısı", "Güvenlik kabini", "Ortak alan aydınlatma",
      "İnce işler - A Blok kontrolleri", "Temizlik - A Blok",
      "Genel kontroller ve iskan başvurusu hazırlığı", "Kesin hesap ve kapanış",
    ];
    const taskStatuses = ["done", "in_progress", "todo", "todo"];
    const taskRows = taskDefs.slice(0, 50).map((t, i) => ({
      project_id: projectIdText, title: t, created_by: uid,
      status: i < 20 ? "done" : rand(taskStatuses),
      priority: rand(["low", "normal", "normal", "high"]),
      due_date: dateStr(2026, ri(2, 12), ri(1, 28)),
      description: "Demo görev",
      sort_order: i,
    }));
    await admin.from("tasks").insert(taskRows);
    counts.tasks = taskRows.length;

    // ---------------- SITE DIARY ----------------
    const diaryTopics = [
      { done: "A Blok 1. kat beton dökümü tamamlandı. 45 m³ C30 beton kullanıldı.", event: "Beton dökümü" },
      { done: "Yağış nedeniyle dış imalatlar durduruldu. İç işlere devam edildi.", event: "Yağmur" },
      { done: "Demir malzemesi teslim alındı — 8 ton Ø16.", event: "Malzeme teslimatı" },
      { done: "Belediye teknik ekibi denetimi yapıldı. Uygun raporu verildi.", event: "Denetim" },
      { done: "Kule vinç operasyonu — B Blok kalıp taşıma işleri.", event: "Vinç operasyonu" },
      { done: "İSG haftalık sahaya iniş yaptı, uyarılar tebliğ edildi.", event: "Güvenlik denetimi" },
      { done: "Müşteri saha ziyareti — ilerleme gösterildi.", event: "Müşteri ziyareti" },
    ];
    const diaryRows: any[] = [];
    const usedDates = new Set<string>();
    let attempts = 0;
    while (diaryRows.length < 35 && attempts < 200) {
      attempts++;
      const m = ri(2, 7);
      const d = ri(1, 28);
      const key = `${m}-${d}`;
      if (usedDates.has(key)) continue;
      usedDates.add(key);
      const t = rand(diaryTopics);
      diaryRows.push({
        user_id: uid, project_id: projectId,
        entry_date: dateStr(2026, m, d),
        weather_icon: rand(["☀️", "⛅", "🌧️", "☁️"]),
        weather_temp: ri(8, 32),
        work_status: t.event === "Yağmur" ? "durdu" : "normal",
        work_stopped_reason: t.event === "Yağmur" ? "Yağmur" : null,
        work_done: t.done,
        crews: [{ name: rand(["Kalıp", "Demir", "Beton", "Elektrik"]), count: ri(4, 20) }],
        materials: [],
        machines: [{ name: rand(["Kule Vinç", "Beton Pompası", "Ekskavatör"]), hours: ri(2, 10) }],
        special_events: [{ text: t.event }],
        general_note: "Demo günlük",
      });
    }
    // Insert one-by-one to avoid unique conflict aborting the batch
    for (const r of diaryRows) {
      await admin.from("site_diary_entries").insert(r);
    }
    counts.site_diary = diaryRows.length;

    // ---------------- NOTES (incl. risks) ----------------
    const noteContents = [
      "Hava durumu: Bu hafta yağış bekleniyor, dış imalat programı revize edilecek.",
      "Beton tedarikinde 1 günlük gecikme yaşandı, ABC Beton ile toplantı yapıldı.",
      "Steel fiyatlarında %8 artış — bütçe revizyonu değerlendirilmeli.",
      "Müşteri toplantısı: A Blok cephe rengi kararlaştırıldı (Antrasit gri).",
      "Denetim: İSG eksiklikleri giderildi, rapor onaylandı.",
      "Elektrik projesi revize edildi — priz noktaları arttırıldı.",
      "Peyzaj planı için ek görüşme yapılacak.",
      "RİSK: Yoğun yağış sezonu — Kasım/Aralık iş planı öne çekilmeli.",
      "RİSK: Demir donatı tedarik gecikmesi olasılığı — alternatif tedarikçi araştırılıyor.",
      "RİSK: İşçi yetersizliği — bayram dönemi ek personel gerekebilir.",
      "RİSK: Steel fiyat artışları — sözleşmede escalation clause değerlendirilmeli.",
      "RİSK: Malzeme teslimat gecikmesi — kritik yol etkilenebilir.",
      "Şantiye şefi ile haftalık toplantı — tamamlanma %42.",
      "A Blok temel demir metrajı %5 fazla çıktı, hakedişte belirtilecek.",
      "Kule vinç bakımı planlandı — hafta sonu.",
      "İskele malzemesi kontrol edildi, güvenli.",
      "Sözleşme: Delta Mekanik ek işleri onaylandı.",
      "Konut kredisi görüşmeleri için müşteriye rapor gönderildi.",
      "Belediye onayı: iskele kurulum izni tamamlandı.",
      "Doğalgaz projesi onayı bekleniyor.",
      "Site sekreteryası dosya arşivi güncellendi.",
      "Beton numuneleri lab sonuçları alındı — tümü uygun.",
      "Fatura süreç yönetimi: bu ay 4 fatura beklemede.",
      "İşçi sağlık taramaları tamamlandı.",
      "Elektrik projesi teslim edildi.",
      "Mimari proje revizyonu istendi.",
      "Peyzaj sözleşmesi hazırlığı.",
      "Otopark tasarımı finalize edildi.",
      "Depo yönetimi: stok sayımı yapıldı.",
      "Kesin hesap için doküman toplama başladı.",
    ];
    const noteRows = noteContents.map((c) => ({ project_id: projectIdText, user_id: uid, content: c }));
    await admin.from("project_notes").insert(noteRows);
    counts.notes = noteRows.length;

    // ---------------- EXPENSES with invoices (representing "invoices") ----------------
    const invRows: any[] = [];
    for (let i = 0; i < 25; i++) {
      invRows.push({
        project_id: projectIdText, user_id: uid,
        category: rand(["Malzeme", "Ekipman", "Yakıt", "Ofis Gideri"]),
        description: `${rand(["Yıldız Yapı", "Ege İnşaat", "Marmara Tic.", "Opet"])} — Fatura #${1000 + i}`,
        amount: money(3000, 180000),
        expense_date: dateStr(2026, ri(2, 7), ri(1, 28)),
        has_invoice: true,
        invoice_no: `FTR-2026-${String(1000 + i)}`,
        source: "manual",
        note: i % 3 === 0 ? "Ödenmedi" : "Ödendi",
      });
    }
    await admin.from("project_expenses").insert(invRows);
    counts.invoices = invRows.length;

    // ---------------- DOCUMENTS ----------------
    const docNames = [
      "Ana Sözleşme - Arsuz Yapı A.Ş.pdf",
      "Yapı Ruhsatı.pdf",
      "Statik Proje - Genel.pdf",
      "Mimari Proje - A Blok.pdf",
      "Mimari Proje - B Blok.pdf",
      "Elektrik Projesi.pdf",
      "Mekanik Projesi.pdf",
      "Zemin Etüdü Raporu.pdf",
      "Şantiye Toplantı Tutanağı - Şubat.pdf",
      "Şantiye Toplantı Tutanağı - Mart.pdf",
      "Belediye Denetim Raporu.pdf",
      "İSG Risk Değerlendirme.pdf",
    ];
    await admin.from("documents").insert(docNames.map((n) => ({
      user_id: uid, name: n, file_size: ri(80000, 3500000), page_count: ri(2, 40), status: "processed", is_global: false,
    })));
    counts.documents = docNames.length;

    return new Response(JSON.stringify({ status: "ok", project_id: projectId, project_name: projectName, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-demo-project error:", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
