// Shared investor demo account operations.
// Authorized callers: a Şantiyem AI administrator JWT, or an internal
// bootstrap token (x-demo-token). Service-role credentials never leave here.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { DEMO_COMPANY, DEMO_EMAIL, DEMO_PASSWORD } from "./dataset.ts";
import { seedDemoTenant } from "./seed.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOOTSTRAP_TOKEN = Deno.env.get("DEMO_ADMIN_TOKEN") ?? "";

const DEMO_PLAN = "demo_full_access";

/** Child-first delete order so FKs never block a reset. */
const RESET_TABLES = [
  "purchase_order_delivery_items",
  "purchase_order_payments",
  "purchase_order_items",
  "purchase_order_deliveries",
  "purchase_orders",
  "hakedis_items",
  "project_hakedis",
  "subcontractor_payments",
  "subcontractors",
  "cash_checks",
  "cash_collections",
  "cash_payments",
  "cash_accounts",
  "inventory_transfers",
  "materials",
  "warehouses",
  "worker_attendance",
  "attendance_records",
  "personnel_project_assignments",
  "personnel",
  "site_diary_photos",
  "site_diary_entries",
  "documents",
  "tasks",
  "project_milestones",
  "project_expenses",
  "project_files",
  "project_notes",
  "reminders",
  "notification_history",
  "projects",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function authorize(req: Request): Promise<{ ok: boolean; who: string }> {
  const token = req.headers.get("x-demo-token");
  if (BOOTSTRAP_TOKEN && token && token === BOOTSTRAP_TOKEN) return { ok: true, who: "bootstrap" };

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, who: "" };
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const jwt = authHeader.slice(7);
  const { data, error } = await sb.auth.getClaims(jwt);
  const uid = data?.claims?.sub as string | undefined;
  if (error || !uid) return { ok: false, who: "" };
  const { data: prof } = await admin()
    .from("profiles").select("role").eq("user_id", uid).maybeSingle();
  if (prof?.role !== "admin") return { ok: false, who: uid };
  return { ok: true, who: uid };
}

async function findDemoUser(sb: ReturnType<typeof admin>) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === DEMO_EMAIL);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(sb: ReturnType<typeof admin>) {
  const existing = await findDemoUser(sb);
  if (existing) {
    // Keep the documented password valid and the address confirmed.
    await sb.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    return { userId: existing.id, created: false };
  }
  const { data, error } = await sb.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Admin", company_name: DEMO_COMPANY, is_demo: true },
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  return { userId: data.user.id, created: true };
}

async function ensureTenant(sb: ReturnType<typeof admin>, userId: string) {
  // Profile: demo-only entitlement, company-level owner role (never platform admin).
  const { error: pErr } = await sb.from("profiles").upsert({
    user_id: userId,
    email: DEMO_EMAIL,
    full_name: "Demo Admin",
    title: "Genel Müdür",
    city: "Hatay",
    plan: DEMO_PLAN,
    role: "office",
  }, { onConflict: "user_id" });
  if (pErr) throw new Error(`profiles: ${pErr.message}`);

  // Independent company (team) owned by the demo user.
  let { data: team } = await sb.from("office_teams")
    .select("id, name").eq("owner_id", userId).maybeSingle();
  if (!team) {
    const ins = await sb.from("office_teams")
      .insert({ owner_id: userId, name: DEMO_COMPANY, max_members: 25 })
      .select("id, name").single();
    if (ins.error) throw new Error(`office_teams: ${ins.error.message}`);
    team = ins.data;
  } else if (team.name !== DEMO_COMPANY) {
    await sb.from("office_teams").update({ name: DEMO_COMPANY }).eq("id", team.id);
    team.name = DEMO_COMPANY;
  }

  const { error: mErr } = await sb.from("office_members").upsert(
    { team_id: team.id, user_id: userId, role: "owner", status: "active" },
    { onConflict: "team_id,user_id" },
  );
  if (mErr) throw new Error(`office_members: ${mErr.message}`);

  const { data: demoRow, error: dErr } = await sb.from("demo_accounts").upsert({
    user_id: userId,
    email: DEMO_EMAIL,
    company_name: DEMO_COMPANY,
    team_id: team.id,
    is_demo_account: true,
    is_active: true,
    access_days: 7,
  }, { onConflict: "user_id" }).select("*").single();
  if (dErr) throw new Error(`demo_accounts: ${dErr.message}`);

  return { teamId: team.id as string, teamName: team.name as string, demoRow };
}

async function purge(sb: ReturnType<typeof admin>, userId: string) {
  const removed: Record<string, number> = {};
  // Immutable ledger: only the isolated demo tenant is purged.
  const { data: n, error: sErr } = await sb.rpc("demo_purge_stock_movements", { _user: userId });
  if (sErr) throw new Error(`demo_purge_stock_movements: ${sErr.message}`);
  removed.stock_movements = Number(n ?? 0);

  for (const table of RESET_TABLES) {
    const { data, error } = await sb.from(table).delete().eq("user_id", userId).select("id");
    if (error) {
      // Tables without a user_id column or not present are simply skipped.
      if (/column .* does not exist|does not exist/i.test(error.message)) continue;
      throw new Error(`${table}: ${error.message}`);
    }
    removed[table] = data?.length ?? 0;
  }

  // Uploaded demo files.
  for (const bucket of ["project-files", "documents", "signed-contracts", "site-diary-photos", "transfer-documents"]) {
    try {
      const { data } = await sb.storage.from(bucket).list(userId, { limit: 1000 });
      if (data?.length) {
        await sb.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
        removed[`storage:${bucket}`] = data.length;
      }
    } catch (_) { /* bucket may not exist */ }
  }
  return removed;
}

async function seed(sb: ReturnType<typeof admin>, userId: string) {
  const result = await seedDemoTenant(sb, userId);
  await sb.from("demo_accounts").update({ seeded_at: new Date().toISOString() }).eq("user_id", userId);
  return result;
}

async function state(sb: ReturnType<typeof admin>, userId: string) {
  const { data } = await sb.from("demo_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return {
    ...data,
    expired: !!data.expires_at && new Date(data.expires_at).getTime() < Date.now(),
    blocked: !data.is_active || (!!data.expires_at && new Date(data.expires_at).getTime() < Date.now()),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authorize(req);
    if (!auth.ok) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");
    const sb = admin();

    if (action === "provision") {
      const { userId, created } = await ensureUser(sb);
      const tenant = await ensureTenant(sb, userId);
      let seedResult: unknown = null;
      let seeded = !!tenant.demoRow?.seeded_at;
      if (!seeded || body.reseed === true) {
        if (body.reseed === true) await purge(sb, userId);
        seedResult = await seed(sb, userId);
        seeded = true;
      }
      return json({
        ok: true, action, user_created: created, user_id: userId,
        email: DEMO_EMAIL, company: tenant.teamName, team_id: tenant.teamId,
        plan: DEMO_PLAN, role: "office", seeded, seed: seedResult,
        state: await state(sb, userId),
      });
    }

    // Every other action needs an existing demo user.
    const user = await findDemoUser(sb);
    if (!user) return json({ error: "Demo hesabı henüz oluşturulmadı." }, 404);
    const userId = user.id;

    switch (action) {
      case "status":
        return json({ ok: true, action, user_id: userId, email: DEMO_EMAIL, state: await state(sb, userId) });

      case "seed": {
        const seedResult = await seed(sb, userId);
        return json({ ok: true, action, ...seedResult, state: await state(sb, userId) });
      }

      case "reset": {
        const removed = await purge(sb, userId);
        const seedResult = await seed(sb, userId);
        const patch: Record<string, unknown> = { reset_count: undefined };
        const { data: cur } = await sb.from("demo_accounts").select("reset_count").eq("user_id", userId).single();
        patch.reset_count = (cur?.reset_count ?? 0) + 1;
        if (body.restart_period === true) { patch.first_login_at = null; patch.expires_at = null; }
        await sb.from("demo_accounts").update(patch).eq("user_id", userId);
        return json({ ok: true, action, removed, ...seedResult, state: await state(sb, userId) });
      }

      case "extend": {
        const days = Number(body.days ?? 7);
        if (!Number.isFinite(days) || days <= 0 || days > 365) return json({ error: "Geçersiz gün sayısı." }, 400);
        const cur = await state(sb, userId);
        const base = cur?.expires_at && new Date(cur.expires_at).getTime() > Date.now()
          ? new Date(cur.expires_at) : new Date();
        const next = new Date(base.getTime() + days * 86400000).toISOString();
        await sb.from("demo_accounts").update({ expires_at: next, is_active: true }).eq("user_id", userId);
        return json({ ok: true, action, days, state: await state(sb, userId) });
      }

      case "restart_period":
        await sb.from("demo_accounts")
          .update({ first_login_at: null, expires_at: null, is_active: true }).eq("user_id", userId);
        return json({ ok: true, action, state: await state(sb, userId) });

      case "activate":
      case "deactivate": {
        await sb.from("demo_accounts")
          .update({ is_active: action === "activate" }).eq("user_id", userId);
        return json({ ok: true, action, state: await state(sb, userId) });
      }

      case "set_password": {
        const password = String(body.password ?? "");
        if (password.length < 6) return json({ error: "Şifre en az 6 karakter olmalı." }, 400);
        const { error } = await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, action });
      }

      default:
        return json({ error: `Bilinmeyen işlem: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[demo-account]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
