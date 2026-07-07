// MSY Yapı A.Ş. — Premium demo seeder
// Load and remove a rich, interconnected demo workspace showcasing every feature.
// All rows are scoped to the caller's user_id. The demo project id is the only
// hard anchor; everything is deleted through that anchor or via marker fields.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_TAG = "[MSY_DEMO]";
const ANCHOR_CATEGORY = "__msy_demo_anchor__";

type Sb = ReturnType<typeof createClient>;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAhead(n: number): string {
  return daysAgo(-n);
}
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}
function rnd(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

async function chunkInsert(sb: Sb, table: string, rows: any[]) {
  const size = 300;
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    const { error } = await sb.from(table).insert(slice);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

async function findAnchor(sb: Sb, uid: string): Promise<string | null> {
  const { data } = await sb
    .from("company_memories")
    .select("content")
    .eq("user_id", uid)
    .eq("category", ANCHOR_CATEGORY)
    .maybeSingle();
  return (data as any)?.content ?? null;
}

async function removeDemo(sb: Sb, uid: string) {
  const projectId = await findAnchor(sb, uid);
  const counts: Record<string, number> = {};
  const add = (k: string, n: number) => { counts[k] = (counts[k] || 0) + (n || 0); };

  // Communication (tagged via metadata.is_demo)
  const { data: msgs } = await sb
    .from("communication_messages")
    .select("id")
    .eq("user_id", uid)
    .filter("metadata->>is_demo", "eq", "true");
  const msgIds = (msgs ?? []).map((m: any) => m.id);
  if (msgIds.length) {
    await sb.from("communication_delivery_attempts").delete().in("message_id", msgIds);
    const r = await sb.from("communication_messages").delete({ count: "exact" }).in("id", msgIds);
    add("communication_messages", r.count || msgIds.length);
  }

  // Meetings tagged in tags array
  const { data: mts } = await sb
    .from("meetings")
    .select("id")
    .eq("user_id", uid)
    .contains("tags", ["msy_demo"]);
  const mtIds = (mts ?? []).map((m: any) => m.id);
  if (mtIds.length) {
    await sb.from("meeting_action_items").delete().in("meeting_id", mtIds);
    await sb.from("meeting_transcripts").delete().in("meeting_id", mtIds);
    await sb.from("meeting_analyses").delete().in("meeting_id", mtIds);
    await sb.from("meeting_participants").delete().in("meeting_id", mtIds);
    const r = await sb.from("meetings").delete({ count: "exact" }).in("id", mtIds);
    add("meetings", r.count || mtIds.length);
  }

  if (projectId) {
    // Hakediş
    const { data: hks } = await sb.from("project_hakedis").select("id").eq("user_id", uid).eq("project_id", projectId);
    const hkIds = (hks ?? []).map((h: any) => h.id);
    if (hkIds.length) {
      await sb.from("hakedis_items").delete().in("hakedis_id", hkIds);
      await sb.from("hakedis_deductions").delete().in("hakedis_id", hkIds);
      const r = await sb.from("project_hakedis").delete({ count: "exact" }).in("id", hkIds);
      add("project_hakedis", r.count || 0);
    }
    // Contracts
    const { data: cts } = await sb.from("contracts").select("id").eq("user_id", uid).eq("project_id", projectId);
    const ctIds = (cts ?? []).map((c: any) => c.id);
    if (ctIds.length) {
      await sb.from("contract_items").delete().in("contract_id", ctIds);
      const r = await sb.from("contracts").delete({ count: "exact" }).in("id", ctIds);
      add("contracts", r.count || 0);
    }
    // Diary photos + entries
    const { data: diaries } = await sb.from("site_diary_entries").select("id").eq("user_id", uid).eq("project_id", projectId);
    const diaryIds = (diaries ?? []).map((d: any) => d.id);
    if (diaryIds.length) {
      await sb.from("site_diary_photos").delete().in("diary_entry_id", diaryIds);
      const r = await sb.from("site_diary_entries").delete({ count: "exact" }).in("id", diaryIds);
      add("site_diary_entries", r.count || 0);
    }

    // Materials
    const { data: mats } = await sb.from("materials").select("id").eq("user_id", uid).eq("project_id", projectId);
    const matIds = (mats ?? []).map((m: any) => m.id);
    if (matIds.length) {
      await sb.from("material_entries").delete().in("material_id", matIds);
      await sb.from("material_exits").delete().in("material_id", matIds);
      const r = await sb.from("materials").delete({ count: "exact" }).in("id", matIds);
      add("materials", r.count || 0);
    }

    // Project-scoped rows
    const projectChildren = [
      "attendance_records","worker_attendance","tasks",
      "project_expenses","project_notes","project_files","project_milestones",
      "cash_collections","cash_payments","subcontractor_payments","e_invoices",
    ];
    for (const t of projectChildren) {
      // tasks has no user_id column; scope only by project_id (+ created_by for extra safety)
      const q = sb.from(t).delete({ count: "exact" }).eq("project_id", projectId);
      const r = t === "tasks" ? await q.eq("created_by", uid) : await q.eq("user_id", uid);
      if (r.count) add(t, r.count);
    }

    // Personnel scoped to project via assignments
    const { data: pas } = await sb
      .from("personnel_project_assignments")
      .select("personnel_id")
      .eq("user_id", uid)
      .eq("project_id", projectId);
    const persIds = Array.from(new Set((pas ?? []).map((r: any) => r.personnel_id)));
    if (persIds.length) {
      const a = await sb.from("personnel_project_assignments").delete({ count: "exact" }).in("personnel_id", persIds);
      add("personnel_project_assignments", a.count || 0);
      const p = await sb.from("personnel").delete({ count: "exact" }).in("id", persIds).eq("user_id", uid);
      add("personnel", p.count || 0);
    }

    // Subcontractors
    const s = await sb
      .from("subcontractors")
      .delete({ count: "exact" })
      .eq("user_id", uid)
      .or(`project_id.eq.${projectId},project_ids.cs.{${projectId}}`);
    if (s.count) add("subcontractors", s.count);

    // Finally the project
    const pr = await sb.from("projects").delete({ count: "exact" }).eq("id", projectId).eq("user_id", uid);
    add("projects", pr.count || 1);
  }

  // ---- Safety-net sweeps (idempotent — catch orphans from earlier partial cleans) ----
  const like = `${DEMO_TAG}%`;
  const tagSweeps: Array<[string, string]> = [
    ["cash_accounts", "name"],
    ["reminders", "title"],
    ["cash_payments", "description"],
    ["cash_collections", "description"],
    ["subcontractor_payments", "note"],
    ["project_expenses", "note"],
    ["e_invoices", "notes"],
    ["subcontractors", "notes"],
    ["personnel", "note"],
  ];
  for (const [t, c] of tagSweeps) {
    const r = await sb.from(t).delete({ count: "exact" }).eq("user_id", uid).ilike(c, like);
    if (r.count) add(t, r.count);
  }
  // tasks (no user_id column) — sweep by created_by + [MSY_DEMO] tag
  {
    const r = await sb.from("tasks").delete({ count: "exact" }).eq("created_by", uid).ilike("description", like);
    if (r.count) add("tasks", r.count);
    const r2 = await sb.from("tasks").delete({ count: "exact" }).eq("created_by", uid).ilike("title", like);
    if (r2.count) add("tasks", r2.count);
  }

  // Company memories (demo-tagged, incl. anchor)
  const cm = await sb
    .from("company_memories")
    .delete({ count: "exact" })
    .eq("user_id", uid)
    .filter("metadata->>is_demo", "eq", "true");
  if (cm.count) add("company_memories", cm.count);

  // ---- Integrity check ----
  const leftovers = await integrityCheck(sb, uid);
  const total_deleted = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, leftovers, total_deleted, verified: leftovers.total === 0 };
}

/** Counts remaining [MSY_DEMO]-tagged rows across every affected table. */
async function integrityCheck(sb: Sb, uid: string) {
  const like = `${DEMO_TAG}%`;
  const probes: Array<[string, string]> = [
    ["projects", "description"],
    ["personnel", "note"],
    ["subcontractors", "notes"],
    ["cash_accounts", "name"],
    ["cash_payments", "description"],
    ["cash_collections", "description"],
    ["subcontractor_payments", "note"],
    ["e_invoices", "notes"],
    ["project_expenses", "note"],
    ["reminders", "title"],
  ];
  const per: Record<string, number> = {};
  let total = 0;
  for (const [t, c] of probes) {
    const { count } = await sb
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .ilike(c, like);
    if (count) { per[t] = count; total += count; }
  }
  // Anchor / memory
  const anchor = await sb.from("company_memories").select("id", { count: "exact", head: true })
    .eq("user_id", uid).filter("metadata->>is_demo", "eq", "true");
  if (anchor.count) { per["company_memories"] = anchor.count; total += anchor.count; }
  // Communication (metadata)
  const comm = await sb.from("communication_messages").select("id", { count: "exact", head: true })
    .eq("user_id", uid).filter("metadata->>is_demo", "eq", "true");
  if (comm.count) { per["communication_messages"] = comm.count; total += comm.count; }
  // Meetings (tags)
  const mt = await sb.from("meetings").select("id", { count: "exact", head: true })
    .eq("user_id", uid).contains("tags", ["msy_demo"]);
  if (mt.count) { per["meetings"] = mt.count; total += mt.count; }
  return { per_table: per, total };
}


async function loadDemo(sb: Sb, uid: string) {
  // If already loaded, remove first for a clean reload
  const existing = await findAnchor(sb, uid);
  if (existing) await removeDemo(sb, uid);

  const counts: Record<string, number> = {};

  // ---- Project ----
  const desc =
    `${DEMO_TAG}\n24 lüks villa, 6 farklı villa tipi. Club House, açık ve kapalı havuz, ` +
    `fitness, tenis kortu, basketbol sahası, çocuk parkı, yürüyüş parkuru, peyzaj. ` +
    `MSY Yapı A.Ş. — Ballıca Panorama Villaları — Arsuz / Hatay.`;
  const { data: proj, error: pErr } = await sb
    .from("projects")
    .insert({
      user_id: uid,
      name: "MSY Yapı — Ballıca Panorama Villaları",
      client: "MSY Yapı A.Ş.",
      location: "Hatay / Arsuz",
      manager: "Mehmet Serhat Yılmaz",
      site_responsible: "İnş. Müh. Kaan Demir",
      description: desc,
      budget: "245000000",
      start_date: "2026-01-12",
      end_date: "2027-04-30",
      status: "Devam Ediyor",
      status_color: "#22C55E",
      progress: 41,
      contract_amount: 245000000,
    })
    .select("id")
    .single();
  if (pErr) throw new Error("project insert: " + pErr.message);
  const projectId = (proj as any).id as string;
  counts.project = 1;

  // Anchor
  await sb.from("company_memories").insert({
    user_id: uid,
    type: "other",
    category: ANCHOR_CATEGORY,
    title: "MSY Demo Project Anchor",
    content: projectId,
    metadata: { is_demo: true },
    source: "seed",
    confidence: 1,
    pinned: false,
    user_confirmed: false,
  });

  // ---- Personnel ----
  const personnelSpecs = [
    { name: "Mehmet Serhat Yılmaz", title: "Proje Müdürü", occ: "İnşaat Mühendisi", type: "monthly_salary", pay: 180000 },
    { name: "Kaan Demir", title: "Şantiye Şefi", occ: "İnşaat Mühendisi", type: "monthly_salary", pay: 140000 },
    { name: "Ahmet Yıldız", title: "İnşaat Mühendisi", occ: "İnşaat Mühendisi", type: "monthly_salary", pay: 95000 },
    { name: "Zeynep Kaya", title: "İnşaat Mühendisi", occ: "İnşaat Mühendisi", type: "monthly_salary", pay: 92000 },
    { name: "Burak Şahin", title: "İnşaat Mühendisi", occ: "İnşaat Mühendisi", type: "monthly_salary", pay: 88000 },
    { name: "Elif Aksoy", title: "İnşaat Mühendisi", occ: "İnşaat Mühendisi", type: "monthly_salary", pay: 86000 },
    { name: "Merve Öztürk", title: "Mimar", occ: "Mimar", type: "monthly_salary", pay: 95000 },
    { name: "Cenk Arslan", title: "Mimar", occ: "Mimar", type: "monthly_salary", pay: 92000 },
    { name: "Mert Polat", title: "Makine Mühendisi", occ: "Makine Mühendisi", type: "monthly_salary", pay: 98000 },
    { name: "Selin Doğan", title: "Elektrik Mühendisi", occ: "Elektrik Mühendisi", type: "monthly_salary", pay: 96000 },
    { name: "Onur Çelik", title: "Harita Mühendisi", occ: "Harita Mühendisi", type: "monthly_salary", pay: 85000 },
    { name: "Hasan Koç", title: "İSG Uzmanı", occ: "A Sınıfı İSG", type: "monthly_salary", pay: 78000 },
    { name: "Deniz Aydın", title: "Satın Alma Uzmanı", occ: "Satın Alma", type: "monthly_salary", pay: 72000 },
    { name: "Fatma Güneş", title: "Depo Sorumlusu", occ: "Depo", type: "monthly_salary", pay: 55000 },
    { name: "Aylin Erdem", title: "İK Uzmanı", occ: "İnsan Kaynakları", type: "monthly_salary", pay: 68000 },
    { name: "Serkan Uçar", title: "Muhasebeci", occ: "SMMM", type: "monthly_salary", pay: 82000 },
    { name: "İbrahim Kara", title: "Kalıp Formeni", occ: "Formen", type: "monthly_salary", pay: 60000 },
    { name: "Osman Yalçın", title: "Demir Formeni", occ: "Formen", type: "monthly_salary", pay: 60000 },
    { name: "Yusuf Bayram", title: "Beton Formeni", occ: "Formen", type: "monthly_salary", pay: 60000 },
    { name: "Ramazan Ateş", title: "İnce İş Formeni", occ: "Formen", type: "monthly_salary", pay: 58000 },
    { name: "Halil Sarı", title: "Peyzaj Formeni", occ: "Formen", type: "monthly_salary", pay: 55000 },
    { name: "Bekir Türk", title: "Mekanik Formen", occ: "Formen", type: "monthly_salary", pay: 62000 },
  ];
  const workerNames = [
    "Ali Vural","Mustafa Demirci","Hakan Er","Emre Şen","Ferhat Yılmaz","Sinan Kılıç","Barış Öz",
    "Kemal Aksu","Cengiz Boz","Uğur Tan","Fırat Doğan","Yaşar Kaplan","Turgay Sezer","Erdal Güngör",
    "Tolga İnce","Selim Erol","Volkan Bulut","Aziz Şimşek","Şükrü Yavuz","Kadir Karaca",
  ];
  workerNames.forEach((n, i) =>
    personnelSpecs.push({
      name: n,
      title: "İşçi",
      occ: pick(["Kalıpçı", "Demirci", "Betoncu", "Sıvacı", "Fayansçı", "Boyacı"], i),
      type: "daily_wage",
      pay: 2200 + (i % 5) * 100,
    } as any),
  );

  const personnelRows = personnelSpecs.map((p, i) => ({
    user_id: uid,
    full_name: p.name,
    phone: `+9053${(30 + i).toString().padStart(2, "0")}${(1000000 + i * 137).toString().slice(-7)}`,
    occupation: p.occ,
    title: p.title,
    employment_type: p.type,
    daily_wage: p.type === "daily_wage" ? p.pay : 0,
    monthly_salary: p.type === "monthly_salary" ? p.pay : 0,
    is_active: true,
    note: `${DEMO_TAG} ${p.title} — sertifikalar: ${
      p.title.includes("Mühendis") ? "SMM, ÇATÇEV" : p.title === "İSG Uzmanı" ? "A Sınıfı İSG" : "İSG Temel"
    } · yetenekler: ${p.occ}`,
  }));
  const { data: persIns, error: prErr } = await sb.from("personnel").insert(personnelRows).select("id, full_name");
  if (prErr) throw new Error("personnel: " + prErr.message);
  const personnel = persIns as { id: string; full_name: string }[];
  counts.personnel = personnel.length;

  await chunkInsert(
    sb,
    "personnel_project_assignments",
    personnel.map((p) => ({
      user_id: uid,
      personnel_id: p.id,
      project_id: projectId,
      salary_share_percent: 100,
      is_active: true,
    })),
  );

  // ---- Attendance (last 60 days) ----
  const statuses = ["full_day", "full_day", "full_day", "full_day", "half_day", "absent", "leave"];
  const attRows: any[] = [];
  const R = rnd(42);
  for (let d = 1; d <= 60; d++) {
    const date = daysAgo(d);
    // skip Sundays (JS: 0)
    if (new Date(date).getDay() === 0) continue;
    for (const p of personnel) {
      const status = statuses[Math.floor(R() * statuses.length)];
      attRows.push({
        user_id: uid,
        personnel_id: p.id,
        project_id: projectId,
        work_date: date,
        status,
        source: "manual",
      });
    }
  }
  await chunkInsert(sb, "attendance_records", attRows);
  counts.attendance_records = attRows.length;

  // Today worker_attendance (74 workers on site — extra QR entries beyond personnel)
  const todayIso = daysAgo(0);
  const waRows: any[] = [];
  for (let i = 0; i < 74; i++) {
    const p = personnel[i % personnel.length];
    waRows.push({
      user_id: uid,
      project_id: projectId,
      qr_token: `msy_demo_${i}`,
      full_name: p.full_name,
      occupation: pick(["Kalıpçı", "Demirci", "Betoncu", "Sıvacı", "Fayansçı", "Boyacı", "İşçi"], i),
      title: "İşçi",
      entry_type: "individual",
      team_size: 1,
      check_in: `${todayIso}T07:${(10 + (i % 40)).toString().padStart(2, "0")}:00Z`,
    });
  }
  await chunkInsert(sb, "worker_attendance", waRows);
  counts.worker_attendance = waRows.length;

  // ---- Subcontractors (18) ----
  const trades = [
    "Elektrik","Mekanik","Boya","Sıva","Seramik","Çatı","Peyzaj","Hafriyat","Beton","Çelik",
    "Cephe","PVC Pencere","Mobilya","HVAC","Asansör","Yangın","Otomasyon","Altyapı",
  ];
  const subRows = trades.map((t, i) => {
    const amt = 3_500_000 + i * 850_000;
    return {
      user_id: uid,
      name: `${t} — ${["Yılmaz","Doğan","Karadeniz","Ege","Anadolu","Star","Ünal","Vira","Nova","Mert","Uzman","Prime","Elit","Kral","Turkuaz","Panorama","Öz","Best"][i]} Yapı Ltd.`,
      phone: `+90212${(4000000 + i * 3113).toString().slice(-7)}`,
      specialty: t,
      contact_person: pick(["Ahmet Bey","Mehmet Bey","Osman Bey","Selim Bey","Kaya Bey","Erdem Bey"], i),
      project_id: projectId,
      project_ids: [projectId],
      contract_amount: amt,
      description: t,
      notes: `${DEMO_TAG} whatsapp: +90533${(1000000 + i * 271).toString().slice(-7)} · e-posta: ${t.toLowerCase().replace(/\s/g,"")}${i}@msydemo.com · performans: ${(78 + (i % 22))}/100 · aktif iş: ${1 + (i % 4)}`,
    };
  });
  const { data: subsIns } = await sb.from("subcontractors").insert(subRows).select("id, name, contract_amount");
  const subcontractors = (subsIns as any[]) ?? [];
  counts.subcontractors = subcontractors.length;

  // Subcontractor payments (~60% paid)
  const subPayRows: any[] = [];
  for (const s of subcontractors) {
    const paid = s.contract_amount * (0.55 + (Math.random() * 0.15));
    const chunks = 4;
    for (let i = 0; i < chunks; i++) {
      subPayRows.push({
        user_id: uid,
        subcontractor_id: s.id,
        amount: Math.round(paid / chunks),
        payment_date: daysAgo(90 - i * 20),
        project_id: projectId,
        payment_method: "havale",
        status: "odendi",
        description: `${s.name} — ${i + 1}. hakediş ödemesi`,
        note: DEMO_TAG,
      });
    }
  }
  await chunkInsert(sb, "subcontractor_payments", subPayRows);
  counts.subcontractor_payments = subPayRows.length;

  // ---- Cash accounts ----
  const cashAccs = [
    { name: `${DEMO_TAG} MSY Merkez Kasa`, account_type: "nakit_kasa", balance: 425000, bank_name: null, iban: null },
    { name: `${DEMO_TAG} Ziraat Bankası — Ana Hesap`, account_type: "banka", balance: 12_800_000, bank_name: "Ziraat Bankası", iban: "TR00 0001 0000 0000 0000 0000 01" },
    { name: `${DEMO_TAG} Garanti BBVA — Proje Hesabı`, account_type: "banka", balance: 4_650_000, bank_name: "Garanti BBVA", iban: "TR00 0006 2000 0000 0000 0000 02" },
  ];
  const { data: accsIns } = await sb.from("cash_accounts").insert(cashAccs).select("id, name");
  const accounts = (accsIns as any[]) ?? [];
  counts.cash_accounts = accounts.length;
  const mainAcc = accounts[1]?.id;

  // ---- Materials (100 items) ----
  const suppliers = [
    "Akçansa Hazır Beton","Batıçim","Kardemir","İçdaş","Erdemir","Bilecik Tuğla","Ytong","Filli Boya","Marshall",
    "Kale Seramik","VitrA","Eczacıbaşı","Isıpan İzolasyon","Doğtaş Kapı","Adopen PVC","Schneider Electric","Philips",
    "Ece Banyo","Ford Kamyon","Kiralık Ekipman A.Ş.","Petrol Ofisi","Shell",
  ];
  const materialTypes = [
    { name: "C25/30 Hazır Beton", unit: "m³", price: 1850 },
    { name: "C30/37 Hazır Beton", unit: "m³", price: 1950 },
    { name: "S420 Nervürlü Demir Ø12", unit: "ton", price: 26500 },
    { name: "S420 Nervürlü Demir Ø14", unit: "ton", price: 26400 },
    { name: "S420 Nervürlü Demir Ø16", unit: "ton", price: 26300 },
    { name: "Yapı Çeliği S275JR", unit: "ton", price: 32000 },
    { name: "AAC Bims 25cm", unit: "m³", price: 2100 },
    { name: "Tuğla 19cm Yatay", unit: "adet", price: 12 },
    { name: "Alçı Sıva", unit: "torba", price: 145 },
    { name: "Filli Boya İç Cephe 20L", unit: "kova", price: 1850 },
    { name: "Marshall Dış Cephe 15L", unit: "kova", price: 2200 },
    { name: "60x60 Granit Seramik", unit: "m²", price: 320 },
    { name: "Su Yalıtım Membranı", unit: "m²", price: 145 },
    { name: "XPS 5cm", unit: "m²", price: 165 },
    { name: "Amerikan Kapı", unit: "adet", price: 4200 },
    { name: "PVC Pencere Isıcamlı", unit: "m²", price: 2100 },
    { name: "3x2.5 NYA Kablo", unit: "m", price: 42 },
    { name: "LED Panel 60x60", unit: "adet", price: 480 },
    { name: "Vitra Klozet Set", unit: "adet", price: 4500 },
    { name: "Kalıp Kontrplak 18mm", unit: "m²", price: 380 },
  ];
  // repeat variations to reach ~100 rows
  const matList: any[] = [];
  for (let i = 0; i < 100; i++) {
    const t = materialTypes[i % materialTypes.length];
    matList.push({
      user_id: uid,
      project_id: projectId,
      name: i < materialTypes.length ? t.name : `${t.name} — ${["A","B","C","D","E"][Math.floor(i / materialTypes.length) - 1] ?? "X"} Serisi`,
      unit: t.unit,
      min_stock: [5, 10, 20, 50][i % 4],
    });
  }
  const { data: matIns } = await sb.from("materials").insert(matList).select("id, name, unit");
  const materials = (matIns as any[]) ?? [];
  counts.materials = materials.length;

  // Material entries and exits (purchase history + usage)
  const matEntries: any[] = [];
  const matExits: any[] = [];
  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    const t = materialTypes[i % materialTypes.length];
    const sup = suppliers[i % suppliers.length];
    for (let j = 0; j < 3; j++) {
      const qty = Math.round((50 + (i * 7) % 200) * (t.unit === "ton" ? 0.2 : 1));
      const price = Math.round(t.price * (0.95 + j * 0.05));
      matEntries.push({
        user_id: uid,
        material_id: m.id,
        entry_date: daysAgo(60 - j * 20),
        quantity: qty,
        unit_price: price,
        total_amount: qty * price,
        supplier: sup,
        note: `${DEMO_TAG} ${sup} — irsaliye #${1000 + i * 3 + j}`,
      });
    }
    for (let j = 0; j < 2; j++) {
      matExits.push({
        user_id: uid,
        material_id: m.id,
        exit_date: daysAgo(30 - j * 10),
        quantity: Math.round(20 + (i * 3) % 60),
        location: `Villa ${((i % 24) + 1)}`,
        note: DEMO_TAG,
      });
    }
  }
  await chunkInsert(sb, "material_entries", matEntries);
  await chunkInsert(sb, "material_exits", matExits);
  counts.material_entries = matEntries.length;
  counts.material_exits = matExits.length;

  // ---- Site Diary (60 daily entries) ----
  const weathers = [
    ["☀️", 31, "normal"],
    ["🌤️", 28, "normal"],
    ["⛅", 26, "normal"],
    ["🌧️", 18, "normal"],
    ["🌦️", 22, "normal"],
  ] as const;
  const diaryRows: any[] = [];
  for (let d = 0; d < 60; d++) {
    const [icon, temp] = weathers[d % weathers.length];
    diaryRows.push({
      user_id: uid,
      project_id: projectId,
      entry_date: daysAgo(d),
      weather_icon: icon,
      weather_temp: temp,
      work_status: "normal",
      crews: [
        { crew: "Kalıp Ekibi", count: 12 },
        { crew: "Demir Ekibi", count: 10 },
        { crew: "Beton Ekibi", count: 8 },
        { crew: "İnce İş", count: 15 },
      ],
      work_done: `${118 - (d % 20)} m³ beton döküldü, ${(68 - (d % 10) * 0.1).toFixed(1)} ton demir işlendi, ${420 - (d % 30) * 5} m² kalıp kuruldu.`,
      materials: [],
      machines: [
        { name: "Kule Vinç", hours: 8 },
        { name: "Beton Pompası", hours: 6 },
      ],
      special_events: [],
      general_note: `${DEMO_TAG} Gün genel değerlendirmesi — plan içi ilerleme.`,
      status: "published",
    });
  }
  await chunkInsert(sb, "site_diary_entries", diaryRows);
  counts.site_diary_entries = diaryRows.length;

  // ---- Tasks (448) ----
  const taskTemplates = [
    "Villa {n} temel kazısı","Villa {n} temel donatısı","Villa {n} temel betonu","Villa {n} bodrum perde kalıbı",
    "Villa {n} kolon donatısı","Villa {n} döşeme betonu","Villa {n} çatı ahşap iskele","Villa {n} sıva",
    "Villa {n} seramik döşeme","Villa {n} elektrik tesisatı","Villa {n} mekanik tesisat","Villa {n} boya",
    "Villa {n} cephe kaplama","Villa {n} peyzaj","Havuz izolasyon","Club House kaba yapı","Fitness ekipman montajı",
    "Tenis kortu zemin","Basketbol sahası çizim","Yürüyüş parkuru serimi",
  ];
  const priorities = ["low", "normal", "normal", "normal", "high"];
  const tasks: any[] = [];
  const push = (n: number, status: string, dueOffset: number, priority?: string) => {
    for (let i = 0; i < n; i++) {
      const tmpl = pick(taskTemplates, i);
      tasks.push({
        project_id: projectId,
        title: tmpl.replace("{n}", String(((i % 24) + 1))),
        description: `${DEMO_TAG} ${tmpl}`,
        status,
        created_by: uid,
        assigned_to: null,
        priority: priority ?? pick(priorities, i),
        due_date: daysAhead(dueOffset - (i % 20)),
        sort_order: i,
      });
    }
  };
  push(340, "done", -60);
  push(78, "in_progress", 14);
  push(16, "in_progress", -3); // delayed = past due, still in progress
  push(14, "todo", 7, "urgent");
  await chunkInsert(sb, "tasks", tasks);
  counts.tasks = tasks.length;

  // ---- Hakediş (4) ----
  const hakedisList = [
    { period: "2026-02", gross: 18_500_000 },
    { period: "2026-03", gross: 22_400_000 },
    { period: "2026-04", gross: 26_800_000 },
    { period: "2026-05", gross: 31_000_000 },
  ];
  for (const h of hakedisList) {
    const kdv = Math.round(h.gross * 0.2);
    const stopaj = Math.round(h.gross * 0.05);
    const net = h.gross + kdv - stopaj;
    const { data: hkIns } = await sb
      .from("project_hakedis")
      .insert({
        user_id: uid,
        project_id: projectId,
        period: h.period,
        amount: h.gross,
        kdv,
        net,
        gross_total: h.gross,
        deductions_total: stopaj,
        net_total: net,
        status: "Onaylandı",
        status_color: "#22C55E",
        approval_status: "onaylandi",
        payment_date: daysAgo(30),
      })
      .select("id")
      .single();
    const hid = (hkIns as any).id;
    await sb.from("hakedis_items").insert([
      { hakedis_id: hid, user_id: uid, description: "Kaba yapı imalatları", unit: "götürü", quantity: 1, unit_price: h.gross * 0.55, total_price: h.gross * 0.55, sort_order: 1 },
      { hakedis_id: hid, user_id: uid, description: "İnce yapı imalatları", unit: "götürü", quantity: 1, unit_price: h.gross * 0.35, total_price: h.gross * 0.35, sort_order: 2 },
      { hakedis_id: hid, user_id: uid, description: "Peyzaj ve altyapı", unit: "götürü", quantity: 1, unit_price: h.gross * 0.10, total_price: h.gross * 0.10, sort_order: 3 },
    ]);
    await sb.from("hakedis_deductions").insert([
      { hakedis_id: hid, user_id: uid, deduction_type: "stopaj", label: "Gelir Vergisi Stopajı %5", rate: 5, amount: stopaj, sort_order: 1 },
    ]);
    // Collection
    await sb.from("cash_collections").insert({
      user_id: uid,
      collection_date: daysAgo(28),
      sender: "MSY Yapı A.Ş.",
      collection_type: "hakedis",
      project_id: projectId,
      amount: net,
      payment_type: "havale",
      status: "tahsil_edildi",
      account_id: mainAcc,
      hakedis_id: hid,
      description: `${DEMO_TAG} ${h.period} hakediş tahsilatı`,
    });
  }
  counts.hakedis = hakedisList.length;

  // ---- Cash Payments (payroll, supplier, tax, fuel, misc) reconciling to ~current cost ----
  const cashPayRows: any[] = [];
  // payroll monthly x 4
  for (let m = 0; m < 4; m++) {
    cashPayRows.push({
      user_id: uid,
      payment_date: daysAgo(30 * m + 5),
      recipient: "Personel Bordrosu",
      category: "Personel",
      project_id: projectId,
      amount: 3_200_000,
      payment_type: "havale",
      status: "odendi",
      account_id: mainAcc,
      description: `${DEMO_TAG} ${m + 1}. ay bordro ödemeleri`,
    });
  }
  // supplier ready-mix, steel, misc
  const supPay = [
    { r: "Akçansa Hazır Beton", c: "Malzeme", a: 4_200_000 },
    { r: "Kardemir Demir", c: "Malzeme", a: 3_850_000 },
    { r: "Filli Boya", c: "Malzeme", a: 780_000 },
    { r: "Kale Seramik", c: "Malzeme", a: 1_150_000 },
    { r: "Shell Yakıt", c: "Yakıt", a: 620_000 },
    { r: "Kiralık Ekipman A.Ş.", c: "Kira", a: 1_450_000 },
    { r: "SGK Ödemesi", c: "Vergi", a: 2_100_000 },
    { r: "KDV Beyanname", c: "Vergi", a: 1_800_000 },
  ];
  supPay.forEach((s, i) =>
    cashPayRows.push({
      user_id: uid,
      payment_date: daysAgo(15 + i * 3),
      recipient: s.r,
      category: s.c,
      project_id: projectId,
      amount: s.a,
      payment_type: "havale",
      status: "odendi",
      account_id: mainAcc,
      description: `${DEMO_TAG} ${s.r}`,
    }),
  );
  await chunkInsert(sb, "cash_payments", cashPayRows);
  counts.cash_payments = cashPayRows.length;

  // ---- Project Expenses (extra granularity) ----
  const expRows: any[] = [];
  for (let i = 0; i < 40; i++) {
    expRows.push({
      user_id: uid,
      project_id: projectId,
      category: pick(["Malzeme", "İşçilik", "Kira", "Nakliye", "Diğer"], i),
      description: pick(
        ["Beton alımı", "Demir alımı", "Nakliye gideri", "Yakıt", "Küçük onarım", "Ofis sarf"],
        i,
      ),
      amount: 25_000 + (i % 20) * 8000,
      expense_date: daysAgo(60 - i),
      has_invoice: i % 3 === 0,
      note: DEMO_TAG,
    });
  }
  await chunkInsert(sb, "project_expenses", expRows);
  counts.project_expenses = expRows.length;

  // ---- E-Invoices (a few overdue for AI demo) ----
  const eInvRows: any[] = [];
  for (let i = 0; i < 12; i++) {
    const inbound = i % 2 === 0;
    const sub = 120_000 + i * 45_000;
    eInvRows.push({
      user_id: uid,
      direction: inbound ? "gelen" : "giden",
      invoice_type: "e_fatura",
      invoice_no: `MSY-2026-${(1000 + i).toString()}`,
      invoice_date: daysAgo(45 - i * 3),
      due_date: daysAgo(15 - i * 3),
      counterparty_name: inbound ? pick(suppliers, i) : "MSY Yapı A.Ş.",
      subtotal: sub,
      kdv_total: Math.round(sub * 0.2),
      grand_total: Math.round(sub * 1.2),
      status: i < 4 ? "beklemede" : (inbound ? "odendi" : "tahsil_edildi"),
      project_id: projectId,
      notes: DEMO_TAG,
      items: [{ name: "Malzeme/Hizmet", qty: 1, price: sub }],
    });
  }
  await chunkInsert(sb, "e_invoices", eInvRows);
  counts.e_invoices = eInvRows.length;

  // ---- Contracts + items ----
  const contractRows = subcontractors.slice(0, 8).map((s: any) => ({
    user_id: uid,
    project_id: projectId,
    name: `${s.name} — Alt Yüklenici Sözleşmesi`,
    counterparty: s.name,
    amount: s.contract_amount,
    start_date: daysAgo(180),
    end_date: daysAhead(365),
    contract_type: "yapim_isleri",
    notes: DEMO_TAG,
    status: "aktif",
  }));
  const { data: ctIns } = await sb.from("contracts").insert(contractRows).select("id, name, amount");
  const contracts = (ctIns as any[]) ?? [];
  const contractItems: any[] = [];
  for (const c of contracts) {
    for (let i = 0; i < 4; i++) {
      contractItems.push({
        contract_id: c.id,
        user_id: uid,
        poz_no: `${i + 1}.01`,
        description: pick(["Kaba imalat", "İnce imalat", "Malzeme temini", "İşçilik"], i),
        unit: "götürü",
        quantity: 1,
        unit_price: Math.round(c.amount / 4),
        total_price: Math.round(c.amount / 4),
        sort_order: i,
      });
    }
  }
  await chunkInsert(sb, "contract_items", contractItems);
  counts.contracts = contracts.length;

  // ---- Meetings (24) ----
  const meetingTitles = [
    "Haftalık Şantiye Toplantısı","Alt Yüklenici Koordinasyon","İSG Aylık Değerlendirme","Malzeme Tedarik Toplantısı",
    "Hakediş Ön Görüşme","Yatırımcı Bilgilendirme","Peyzaj Konsept Sunumu","Elektrik Projesi Revizyon",
  ];
  const meetingIds: string[] = [];
  for (let i = 0; i < 24; i++) {
    const { data: m } = await sb
      .from("meetings")
      .insert({
        user_id: uid,
        title: pick(meetingTitles, i) + ` — ${daysAgo(i * 3)}`,
        status: "completed",
        started_at: `${daysAgo(i * 3)}T09:00:00Z`,
        ended_at: `${daysAgo(i * 3)}T10:15:00Z`,
        duration_seconds: 4500,
        language: "tr",
        tags: ["msy_demo"],
        location: "Şantiye Ofisi",
        metadata: { is_demo: true },
      })
      .select("id")
      .single();
    const mid = (m as any).id;
    meetingIds.push(mid);
    await sb.from("meeting_participants").insert(
      personnel.slice(0, 5).map((p) => ({
        meeting_id: mid,
        user_id: uid,
        display_name: p.full_name,
        role: "attendee",
        attended: true,
      })),
    );
    await sb.from("meeting_transcripts").insert([
      { meeting_id: mid, user_id: uid, seq: 1, speaker_label: "PM", text: "Bu hafta 4 villada beton döküm tamamlandı.", started_at_ms: 0, ended_at_ms: 5000 },
      { meeting_id: mid, user_id: uid, seq: 2, speaker_label: "Şef", text: "Elektrik alt yüklenici Cuma günü sahaya giriyor.", started_at_ms: 5000, ended_at_ms: 12000 },
    ]);
    await sb.from("meeting_analyses").insert({
      meeting_id: mid,
      user_id: uid,
      summary: `Toplantıda haftalık ilerleme, alt yüklenici koordinasyonu ve malzeme tedariki konuşuldu. Ana karar: ${pick(["Beton dökümüne devam","Cephe iskele planı","Elektrik projesi revizyon","Peyzaj konseptinin onayı"], i)}.`,
      decisions: [{ text: "Haftalık beton programı onaylandı", owner: "PM" }],
      risks: [{ text: "Yağmur riski nedeniyle Salı-Çarşamba beton programı taşınabilir" }],
      action_items: [{ title: "Beton pompası ek rezervasyon", owner: "Satın Alma", due: daysAhead(3) }],
      questions: [],
      numbers: [{ label: "Beton (m³)", value: 118 }],
      generated_at: new Date().toISOString(),
    });
    await sb.from("meeting_action_items").insert({
      meeting_id: mid,
      user_id: uid,
      title: `Aksiyon — ${pick(["Beton pompası","Malzeme siparişi","Ek işçi talebi","İSG denetimi"], i)}`,
      status: i % 3 === 0 ? "done" : "pending",
      priority: "medium",
      due_date: daysAhead(7),
    });
  }
  counts.meetings = meetingIds.length;

  // ---- Company Memory (rich knowledge base) ----
  const memoryEntries: any[] = [
    { type: "company", title: "MSY Yapı A.Ş. — Şirket Profili", content: "MSY Yapı A.Ş. 2013 yılında Hatay'da kuruldu. 128 çalışan, 7 aktif proje, 46 tamamlanmış proje, yıllık ciro 420.000.000 TL. Uzmanlık: konut, villa ve altyapı." },
    { type: "company", title: "Organizasyon Şeması", content: "Yönetim Kurulu → Genel Müdür → Proje Müdürleri (Ballıca, İzmir, Ankara ofis) → Şantiye Şefi → Formenler → İşçiler. Destek birimleri: İK, Satın Alma, Muhasebe, İSG." },
    { type: "company", title: "Çalışan El Kitabı Özeti", content: "Mesai 08:00-17:30. Fazla mesai onayla. Yıllık izin 14-26 gün. İSG eğitimi zorunlu. Şantiyeye baret ve iş ayakkabısı olmadan giriş yasak." },
    { type: "company", title: "Satın Alma Politikası", content: "10.000 TL üzeri her alım 3 teklif ile karşılaştırılır. 100.000 TL üzeri alım Genel Müdür onayı gerekir. Tedarikçi puanı yılda 2 kez değerlendirilir." },
    { type: "company", title: "Kalite Prosedürü", content: "Beton dökümü öncesi donatı ve kalıp kontrolü zorunludur. Her villada her katta bağımsız beton numunesi alınır. 7 ve 28 gün kırım testi yapılır." },
    { type: "company", title: "İSG Prosedürü", content: "Günlük İSG toolbox meeting yapılır. Her ay tam denetim raporu. Yaralanma sıfır politikası. Yüksekte çalışma için paraşüt tipi emniyet kemeri zorunlu." },
    { type: "project", title: "Ballıca Panorama — Teknik Şartname", content: "24 villa, C30/37 beton, S420 donatı, çift camlı ısıcamlı pencere, XPS ısı yalıtımı, doğal taş cephe. Isı yalıtım TS 825 sınıf B. Depremsel bölge 3." },
    { type: "project", title: "Ballıca Panorama — Metodoloji", content: "Kaba yapı önce A ve B bloklarda, sonra C ve D. Cephe kaplama katta yukarıdan aşağıya. Peyzaj en son. Ortak alanlar (havuz, club house, kortlar) 2027 Q1'de tamamlanacak." },
    { type: "supplier", title: "Akçansa Hazır Beton — Anlaşma", content: "Sabit fiyat 1.850 TL/m³ (C25/30), 1.950 TL/m³ (C30/37). Sipariş 24 saat önce. Ödeme fatura tarihinden 30 gün sonra. Yıllık toplam alım hedefi 5.000 m³." },
    { type: "supplier", title: "Kardemir Demir — Anlaşma", content: "S420 nervürlü demir 26.400-26.500 TL/ton bandında. Aylık teslimat. 60 gün vadeli." },
    { type: "decision", title: "Cephe Malzemesi Kararı", content: "12 Şubat 2026 toplantısında traverten kaplama kararı verildi. Bütçe fark +%3.5. Onaylayan: MS Yılmaz." },
    { type: "preference", title: "Toplantı Kuralları", content: "Toplantılar 45 dk ile sınırlı. Aksiyon maddesi olmayan konu gündeme alınmaz. Toplantı özeti aynı gün paylaşılır." },
    { type: "other", title: "Ekipman Kılavuzu — Kule Vinç Potain MDT 178", content: "Günlük ön kontrol listesi: fren, kablo, kanca. Yükleme diyagramı ofiste. Operatör vardiyası 8 saat." },
    { type: "other", title: "Yangın Prosedürü", content: "Şantiye içi 6 yangın söndürme dolabı. Ayda bir tatbikat. Acil toplanma noktası: Kapı 1 önü." },
  ];
  await chunkInsert(
    sb,
    "company_memories",
    memoryEntries.map((m) => ({
      user_id: uid,
      type: m.type,
      title: m.title,
      content: m.content,
      metadata: { is_demo: true },
      source: "seed",
      confidence: 0.95,
      pinned: false,
      user_confirmed: true,
    })),
  );
  counts.company_memories = memoryEntries.length;

  // ---- Reminders ----
  const remRows = [
    "Yapı denetim aylık ziyareti","İş güvenliği eğitimi","SGK ödemesi","KDV beyannamesi",
    "Ziraat kredi taksidi","Belediye ruhsat yenileme","Alt yüklenici sözleşme uzatma",
    "Yatırımcı sunumu","Peyzaj tasarım revizyon","Elektrik kabul","Havuz izolasyon testi","Cephe iskele kurulumu",
  ].map((t, i) => ({
    user_id: uid,
    title: `${DEMO_TAG} ${t}`,
    reminder_date: daysAhead(3 + i * 2),
    note: `${t} takip et.`,
  }));
  await chunkInsert(sb, "reminders", remRows);
  counts.reminders = remRows.length;

  // ---- Communication messages ----
  const commRows: any[] = [];
  for (let i = 0; i < 24; i++) {
    const channel = i % 2 === 0 ? "email" : "whatsapp";
    commRows.push({
      user_id: uid,
      channel,
      recipient: channel === "email" ? `partner${i}@msydemo.com` : `+9053300000${(10 + i).toString().padStart(2, "0")}`,
      recipient_name: pick(["Akçansa", "Kardemir", "Filli Boya", "Kale Seramik", "Yapı Denetim", "İSG Ekibi"], i),
      subject: channel === "email" ? pick(["Ödeme Hatırlatma", "Sevkiyat Bilgisi", "Toplantı Daveti", "Duyuru"], i) : null,
      body: pick(
        ["Merhaba, bugünkü sevkiyatı teyit eder misiniz?","Ödeme planımıza göre bu haftaki ödeme yapılacaktır.","Yarınki koordinasyon toplantısı 09:00'da.","İSG denetimi Cuma günü yapılacaktır."],
        i,
      ),
      status: i < 20 ? "sent" : "queued",
      priority: "normal",
      sent_at: i < 20 ? new Date(Date.now() - i * 86400000).toISOString() : null,
      metadata: { is_demo: true },
    });
  }
  const { data: commIns } = await sb.from("communication_messages").insert(commRows).select("id, status");
  for (const c of (commIns as any[]) ?? []) {
    if (c.status === "sent") {
      await sb.from("communication_delivery_attempts").insert({
        message_id: c.id,
        status: "sent",
        provider: "seed",
      });
    }
  }
  counts.communication_messages = commRows.length;

  // ---- Project notes & milestones ----
  await sb.from("project_notes").insert([
    { user_id: uid, project_id: projectId, content: `${DEMO_TAG} Ballıca Panorama — Genel plan notları. Yatırımcı: MSY Yapı A.Ş.` },
    { user_id: uid, project_id: projectId, content: `${DEMO_TAG} Kritik yol: kaba yapı → cephe → ince iş → peyzaj.` },
  ]);
  await sb.from("project_milestones").insert([
    { user_id: uid, project_id: projectId, title: "Temel Tamamlandı", milestone_date: "2026-03-15", completed: true, sort_order: 1 },
    { user_id: uid, project_id: projectId, title: "Kaba Yapı %50", milestone_date: "2026-08-15", completed: false, sort_order: 2 },
    { user_id: uid, project_id: projectId, title: "İnce İş Başlangıç", milestone_date: "2026-11-01", completed: false, sort_order: 3 },
    { user_id: uid, project_id: projectId, title: "Teslim", milestone_date: "2027-04-30", completed: false, sort_order: 4 },
  ]);

  return { project_id: projectId, counts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Missing authorization");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Resolve user from JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userRes?.user) throw new Error("Not authenticated");
    const uid = userRes.user.id;

    // Admin client for inserts (bypasses RLS but we manually scope to uid)
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const action = body.action ?? "load";

    if (action === "remove") {
      const result = await removeDemo(sb, uid);
      if (!result.verified) {
        return new Response(JSON.stringify({
          ok: false,
          action: "remove",
          error: `Cleanup incomplete: ${result.leftovers.total} [MSY_DEMO] rows remain`,
          counts: result.counts,
          leftovers: result.leftovers,
          total_deleted: result.total_deleted,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        ok: true, action: "remove",
        counts: result.counts,
        total_deleted: result.total_deleted,
        verified: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await loadDemo(sb, uid);
    return new Response(JSON.stringify({ ok: true, action: "load", ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
