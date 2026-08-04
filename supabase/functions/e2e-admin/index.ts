// GEÇİCİ E2E YÖNETİM FONKSİYONU — yalnızca izole E2E kiracısı için.
//
// Doğrulama testleri bittiğinde bu fonksiyon silinir (teardown adımı).
// Erişim, E2E_ADMIN_TOKEN paylaşılan sırrı ile korunur ve tüm işlemler
// yalnızca E2E_DEPO_FINAL etiketli sentetik kayıtlar üzerinde çalışır.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TAG = "E2E_DEPO_FINAL";
const ROLES = ["admin", "source", "dest", "readonly", "outsider"] as const;
type Role = (typeof ROLES)[number];
const email = (r: Role) => `e2e-final-${r}@santiyem-e2e.invalid`;
const OFFICE_ROLE: Record<Role, string | null> = {
  admin: "owner", source: "editor", dest: "editor", readonly: "viewer", outsider: null,
};
const LIFECYCLE = [
  "requested", "pending_approval", "approved", "ready_to_dispatch",
  "partially_dispatched", "in_transit", "partially_received", "received",
  "discrepancy", "rejected", "cancelled",
] as const;
const TRANSFER_COUNT = 53;
const BUCKET = "transfer-documents";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const GATE = Deno.env.get("E2E_ADMIN_TOKEN") ?? "";

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const randomPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return "E2e!" + btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, "").slice(0, 28);
};

/** E2E kullanıcı kimlikleri (varsa) — e-posta listesinden çözülür. */
async function findUsers(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      const r = ROLES.find((x) => email(x) === u.email);
      if (r) out[r] = u.id;
    }
    if (data.users.length < 200) break;
  }
  return out;
}

async function bootstrap() {
  // 1) Kullanıcılar — varsa yeniden kullanılır, parola yenilenir.
  const existing = await findUsers();
  const creds: { role: Role; email: string; password: string }[] = [];
  const ids: Record<string, string> = {};

  for (const role of ROLES) {
    const password = randomPassword();
    if (existing[role]) {
      const { error } = await admin.auth.admin.updateUserById(existing[role], {
        password, email_confirm: true,
      });
      if (error) throw new Error(`updateUser(${role}): ${error.message}`);
      ids[role] = existing[role];
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: email(role), password, email_confirm: true,
        user_metadata: { full_name: `E2E ${role}`, e2e_tag: TAG },
      });
      if (error) throw new Error(`createUser(${role}): ${error.message}`);
      ids[role] = data.user!.id;
    }
    creds.push({ role, email: email(role), password });
  }

  // 2) Profiller — plan pro, deneme/limit engeli olmadan.
  for (const role of ROLES) {
    await admin.from("profiles").upsert(
      { user_id: ids[role], full_name: `E2E ${role}`, title: TAG, city: TAG, plan: "pro", email: email(role) },
      { onConflict: "user_id" },
    );
  }

  // 3) Ofis ekibi (izole şirket) ve üyelikler.
  let teamId: string;
  const { data: teamFound } = await admin.from("office_teams")
    .select("id").eq("owner_id", ids.admin).eq("name", `${TAG} Şirket`).maybeSingle();
  if (teamFound) teamId = teamFound.id;
  else {
    const { data, error } = await admin.from("office_teams")
      .insert({ owner_id: ids.admin, name: `${TAG} Şirket`, max_members: 25 })
      .select("id").single();
    if (error) throw new Error(`office_teams: ${error.message}`);
    teamId = data.id;
  }
  ids.team = teamId;
  const team = { id: teamId };


  for (const role of ROLES) {
    const or = OFFICE_ROLE[role];
    if (!or) continue;
    await admin.from("office_members").upsert(
      { team_id: team.id, user_id: ids[role], role: or, status: "active" },
      { onConflict: "team_id,user_id" },
    );
  }

  // 4) Depolar ve malzeme (sahibi admin).
  const whDefs = [
    { code: `${TAG}-WH-S`, name: `${TAG} Kaynak Depo`, warehouse_type: "merkez" },
    { code: `${TAG}-WH-D`, name: `${TAG} Hedef Depo`, warehouse_type: "saha" },
  ];
  const whIds: string[] = [];
  for (const w of whDefs) {
    const { data: found } = await admin.from("warehouses")
      .select("id").eq("user_id", ids.admin).eq("code", w.code).maybeSingle();
    if (found) { whIds.push(found.id); continue; }
    const { data, error } = await admin.from("warehouses")
      .insert({ ...w, user_id: ids.admin, is_active: true, notes: TAG }).select("id").single();
    if (error) throw new Error(`warehouses: ${error.message}`);
    whIds.push(data.id);
  }
  ids.source_warehouse = whIds[0];
  ids.dest_warehouse = whIds[1];

  const { data: matFound } = await admin.from("materials")
    .select("id").eq("user_id", ids.admin).eq("code", `${TAG}-MAT-1`).maybeSingle();
  if (matFound) ids.material = matFound.id;
  else {
    const { data, error } = await admin.from("materials").insert({
      user_id: ids.admin, project_id: TAG, name: `${TAG} Çimento`, code: `${TAG}-MAT-1`,
      unit: "adet", allowed_units: ["adet"], stock_type: "stockable", category: "test",
      min_stock: 0, is_active: true,
    }).select("id").single();
    if (error) throw new Error(`materials: ${error.message}`);
    ids.material = data.id;
  }

  // 5) Açılış stoğu (yalnızca yoksa) — değişmez defter kuralları korunur.
  const { count: mvCount } = await admin.from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("material_id", ids.material).eq("project_id", TAG);
  if (!mvCount) {
    const { error } = await admin.from("stock_movements").insert({
      user_id: ids.admin, movement_type: "goods_receipt", direction: 1,
      material_id: ids.material, warehouse_id: ids.source_warehouse,
      quantity: 100000, unit: "adet", unit_cost: 100, total_cost: 10000000,
      project_id: TAG, reason: TAG, actor_id: ids.admin, notes: TAG,
    });
    if (error) throw new Error(`stock_movements: ${error.message}`);
  }

  // 6) Transfer fikstürleri — 53 kayıt (sayfa boyutu 20 → 3 sayfa).
  const { count: trCount } = await admin.from("inventory_transfers")
    .select("id", { count: "exact", head: true }).eq("reason", TAG);
  const lifecycle: Record<string, string> = {};

  if ((trCount ?? 0) < TRANSFER_COUNT) {
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < TRANSFER_COUNT - (trCount ?? 0); i++) {
      const status = LIFECYCLE[i] ?? "pending_approval";
      const q = 100;
      const base: Record<string, unknown> = {
        user_id: ids.admin, material_id: ids.material, unit: "adet",
        requested_quantity: q, source_warehouse_id: ids.source_warehouse,
        dest_warehouse_id: ids.dest_warehouse, project_id: TAG,
        requester_id: ids.source, reason: TAG, status,
        dispatched_quantity: 0, in_transit_quantity: 0, received_quantity: 0,
        damaged_quantity: 0, missing_quantity: 0, rejected_quantity: 0,
        notes: `${TAG} #${i + 1}`,
        required_date: new Date(Date.now() + (i - 5) * 86400000).toISOString().slice(0, 10),
        requested_at: new Date(Date.now() - i * 3600000).toISOString(),
      };
      if (["approved", "ready_to_dispatch", "partially_dispatched", "in_transit",
           "partially_received", "received", "discrepancy"].includes(status)) {
        base.approver_id = ids.admin;
        base.approved_at = new Date().toISOString();
      }
      if (status === "partially_dispatched") { base.dispatched_quantity = 40; base.in_transit_quantity = 40; base.dispatcher_id = ids.source; base.dispatched_at = new Date().toISOString(); }
      if (status === "in_transit") { base.dispatched_quantity = q; base.in_transit_quantity = q; base.dispatcher_id = ids.source; base.dispatched_at = new Date().toISOString(); }
      if (status === "partially_received") { base.dispatched_quantity = q; base.in_transit_quantity = 30; base.received_quantity = 70; base.receiver_id = ids.dest; base.dispatched_at = new Date().toISOString(); }
      if (status === "received") { base.dispatched_quantity = q; base.received_quantity = q; base.receiver_id = ids.dest; base.received_at = new Date().toISOString(); base.dispatched_at = new Date().toISOString(); }
      if (status === "discrepancy") { base.dispatched_quantity = q; base.received_quantity = 80; base.damaged_quantity = 10; base.missing_quantity = 5; base.rejected_quantity = 5; base.discrepancy_note = "E2E fark"; base.receiver_id = ids.dest; base.received_at = new Date().toISOString(); base.dispatched_at = new Date().toISOString(); }
      if (status === "rejected") { base.rejection_reason = "E2E red"; base.approver_id = ids.admin; }
      if (status === "cancelled") { base.cancel_reason = "E2E iptal"; base.cancelled_by = ids.admin; base.cancelled_at = new Date().toISOString(); }
      rows.push(base);
    }
    for (let i = 0; i < rows.length; i += 25) {
      const { error } = await admin.from("inventory_transfers").insert(rows.slice(i, i + 25));
      if (error) throw new Error(`inventory_transfers: ${error.message}`);
    }
  }

  const { data: trs, error: trErr } = await admin.from("inventory_transfers")
    .select("id,status").eq("reason", TAG).order("created_at", { ascending: true });
  if (trErr) throw new Error(`transfers read: ${trErr.message}`);
  for (const t of trs ?? []) if (!lifecycle[t.status]) lifecycle[t.status] = t.id;

  // 7) Transfer olay kaydı (detay geçmişi için).
  const anchor = lifecycle.in_transit ?? trs?.[0]?.id;
  if (anchor) {
    const { count } = await admin.from("inventory_transfer_events")
      .select("id", { count: "exact", head: true }).eq("transfer_id", anchor);
    if (!count) {
      await admin.from("inventory_transfer_events").insert([
        { user_id: ids.admin, transfer_id: anchor, status: "pending_approval", action: "create", actor_id: ids.source, actor_name: "E2E source", note: TAG },
        { user_id: ids.admin, transfer_id: anchor, status: "in_transit", action: "dispatch", actor_id: ids.source, actor_name: "E2E source", note: TAG },
      ]);
    }
  }

  // 8) Bildirim fikstürü (admin) — kanonik transfer rotasına yönlendirir.
  if (anchor) {
    const { count } = await admin.from("notification_history")
      .select("id", { count: "exact", head: true }).eq("user_id", ids.admin).eq("body", TAG);
    if (!count) {
      await admin.from("notification_history").insert({
        user_id: ids.admin, title: "Transfer sevk edildi", body: TAG,
        notification_type: "info", click_url: `/depo/transferler/${anchor}`,
        metadata: { e2e: TAG, transfer_id: anchor },
      });
    }
  }

  // 9) Özel belge fikstürü (transfer-documents kovası — imzalı URL zorunlu).
  const docTransfer = lifecycle.received ?? anchor;
  if (docTransfer) {
    const { count } = await admin.from("inventory_transfer_documents")
      .select("id", { count: "exact", head: true }).eq("transfer_id", docTransfer).is("deleted_at", null);
    if (!count) {
      const path = `${ids.admin}/${docTransfer}/e2e_irsaliye.pdf`;
      const pdf = new TextEncoder().encode("%PDF-1.4\n% E2E_DEPO_FINAL fixture\n%%EOF\n");
      await admin.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
      const { error } = await admin.from("inventory_transfer_documents").insert({
        user_id: ids.admin, transfer_id: docTransfer, doc_type: "waybill",
        file_name: "e2e_irsaliye.pdf", file_path: path,
        mime_type: "application/pdf", file_size: pdf.byteLength, uploaded_by: ids.admin,
      });
      if (error) throw new Error(`documents: ${error.message}`);
      ids.document_path = path;
    }
  }

  // 10) Oturumlar — her rol için gerçek giriş; storageState üretimi için.
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const sessions: Record<string, unknown> = {};
  for (const c of creds) {
    const { data, error } = await anon.auth.signInWithPassword({ email: c.email, password: c.password });
    if (error || !data.session) throw new Error(`signIn(${c.role}): ${error?.message ?? "oturum yok"}`);
    sessions[c.role] = data.session;
  }

  return { ok: true, ids, lifecycle, creds, sessions, transfer_total: (trs ?? []).length };
}

async function residual() {
  const ids = await findUsers();
  const userIds = Object.values(ids);
  const c = async (table: string, q: (b: any) => any) => {
    const { count, error } = await q(admin.from(table).select("id", { count: "exact", head: true }));
    return error ? `hata: ${error.message}` : (count ?? 0);
  };
  const { data: objs } = await admin.storage.from(BUCKET).list("", { limit: 1000 });
  const e2eObjects: string[] = [];
  for (const uid of userIds) {
    const { data } = await admin.storage.from(BUCKET).list(uid, { limit: 1000 });
    for (const d of data ?? []) {
      const { data: inner } = await admin.storage.from(BUCKET).list(`${uid}/${d.name}`, { limit: 1000 });
      for (const f of inner ?? []) e2eObjects.push(`${uid}/${d.name}/${f.name}`);
    }
  }
  return {
    auth_users: userIds.length,
    profiles: userIds.length ? await c("profiles", (b: any) => b.in("user_id", userIds)) : 0,
    teams: await c("office_teams", (b: any) => b.eq("name", `${TAG} Şirket`)),
    memberships: userIds.length ? await c("office_members", (b: any) => b.in("user_id", userIds)) : 0,
    warehouses: await c("warehouses", (b: any) => b.eq("notes", TAG)),
    materials: await c("materials", (b: any) => b.eq("code", `${TAG}-MAT-1`)),
    transfers: await c("inventory_transfers", (b: any) => b.eq("reason", TAG)),
    transfer_events: await c("inventory_transfer_events", (b: any) => b.eq("note", TAG)),
    stock_movements: await c("stock_movements", (b: any) => b.eq("project_id", TAG)),
    notifications: await c("notification_history", (b: any) => b.eq("body", TAG)),
    transfer_documents: userIds.length ? await c("inventory_transfer_documents", (b: any) => b.in("user_id", userIds)) : 0,
    storage_objects: e2eObjects.length,
    root_objects: (objs ?? []).length,
  };
}

async function teardown() {
  const ids = await findUsers();
  const userIds = Object.values(ids);
  const notes: string[] = [];

  // Depolama nesneleri
  for (const uid of userIds) {
    const { data: dirs } = await admin.storage.from(BUCKET).list(uid, { limit: 1000 });
    const paths: string[] = [];
    for (const d of dirs ?? []) {
      const { data: files } = await admin.storage.from(BUCKET).list(`${uid}/${d.name}`, { limit: 1000 });
      for (const f of files ?? []) paths.push(`${uid}/${d.name}/${f.name}`);
    }
    if (paths.length) {
      const { error } = await admin.storage.from(BUCKET).remove(paths);
      if (error) notes.push(`storage: ${error.message}`);
    }
  }

  const del = async (table: string, apply: (b: any) => any) => {
    const { error } = await apply(admin.from(table).delete());
    if (error) notes.push(`${table}: ${error.message}`);
  };

  if (userIds.length) await del("inventory_transfer_documents", (b: any) => b.in("user_id", userIds));
  await del("notification_history", (b: any) => b.eq("body", TAG));
  await del("inventory_transfer_events", (b: any) => b.eq("note", TAG));
  await del("inventory_transfers", (b: any) => b.eq("reason", TAG));
  // stock_movements: değişmez defter — silme tetikleyicisi engeller.
  // Bu kayıtlar teardown migrasyonuyla (yalnızca E2E etiketli) temizlenir.
  const { count: mv } = await admin.from("stock_movements")
    .select("id", { count: "exact", head: true }).eq("project_id", TAG);
  if (mv) notes.push(`stock_movements: ${mv} kayıt değişmez defter tetikleyicisi nedeniyle API ile silinemez`);

  await del("warehouses", (b: any) => b.eq("notes", TAG));
  await del("materials", (b: any) => b.eq("code", `${TAG}-MAT-1`));
  if (userIds.length) await del("office_members", (b: any) => b.in("user_id", userIds));
  await del("office_teams", (b: any) => b.eq("name", `${TAG} Şirket`));
  if (userIds.length) await del("profiles", (b: any) => b.in("user_id", userIds));

  for (const uid of userIds) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) notes.push(`deleteUser(${uid.slice(0, 8)}): ${error.message}`);
  }

  return { ok: true, notes, residual: await residual() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!GATE) return json({ error: "E2E_ADMIN_TOKEN tanımlı değil" }, 503);
  if (req.headers.get("x-e2e-token") !== GATE) return json({ error: "yetkisiz" }, 401);

  let action = "";
  try { action = (await req.json())?.action ?? ""; } catch { /* boş gövde */ }

  try {
    if (action === "bootstrap") return json(await bootstrap());
    if (action === "teardown") return json(await teardown());
    if (action === "residual") return json(await residual());
    return json({ error: "geçersiz action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
