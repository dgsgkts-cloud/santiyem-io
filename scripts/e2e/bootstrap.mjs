#!/usr/bin/env node
// DEPO E2E — bootstrap / teardown / residual sürücüsü.
//
// Sırlar depoya yazılmaz: token yalnızca E2E_ADMIN_TOKEN ortam değişkeninden
// okunur, üretilen oturum durumları depo dışındaki E2E_STATE_DIR'e (0600)
// yazılır. Kullanım:
//   E2E_ADMIN_TOKEN=... E2E_STATE_DIR=/tmp/e2e node scripts/e2e/bootstrap.mjs bootstrap
//   ... teardown | residual

import fs from "node:fs";
import path from "node:path";

const action = process.argv[2] ?? "bootstrap";
const token = process.env.E2E_ADMIN_TOKEN;
const stateDir = process.env.E2E_STATE_DIR;
const projectRef = process.env.E2E_PROJECT_REF;
const fnUrl = process.env.E2E_FN_URL ?? `https://${projectRef}.supabase.co/functions/v1/e2e-admin`;
const anon = process.env.E2E_ANON_KEY ?? "";

if (!token) { console.error("E2E_ADMIN_TOKEN gerekli."); process.exit(2); }
if (!stateDir) { console.error("E2E_STATE_DIR gerekli."); process.exit(2); }
if (!projectRef && !process.env.E2E_FN_URL) { console.error("E2E_PROJECT_REF gerekli."); process.exit(2); }

const res = await fetch(fnUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-e2e-token": token,
    ...(anon ? { Authorization: `Bearer ${anon}`, apikey: anon } : {}),
  },
  body: JSON.stringify({ action }),
});

const text = await res.text();
let body;
try { body = JSON.parse(text); } catch { console.error("Geçersiz yanıt:", text.slice(0, 400)); process.exit(1); }
if (!res.ok || body.error) { console.error("Hata:", body.error ?? res.status); process.exit(1); }

if (action !== "bootstrap") {
  console.log(JSON.stringify({ ...body, creds: undefined, sessions: undefined }, null, 2));
  process.exit(0);
}

fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
const storageKey = `sb-${projectRef}-auth-token`;
const origin = process.env.E2E_BASE_URL ?? "http://localhost:8080";

for (const [role, session] of Object.entries(body.sessions)) {
  const state = {
    cookies: [],
    origins: [{ origin, localStorage: [{ name: storageKey, value: JSON.stringify(session) }] }],
  };
  const file = path.join(stateDir, `state-${role}.json`);
  fs.writeFileSync(file, JSON.stringify(state), { mode: 0o600 });
}
fs.writeFileSync(path.join(stateDir, "transfers.json"), JSON.stringify({ lifecycle: body.lifecycle }), { mode: 0o600 });

// Parolalar yalnızca yenileme için diskte (0600), asla stdout'a yazılmaz.
fs.writeFileSync(path.join(stateDir, "creds.json"), JSON.stringify(body.creds), { mode: 0o600 });

console.log(JSON.stringify({
  ok: true,
  roles: Object.keys(body.sessions),
  transfer_total: body.transfer_total,
  lifecycle_statuses: Object.keys(body.lifecycle).length,
  state_dir: stateDir,
}, null, 2));
