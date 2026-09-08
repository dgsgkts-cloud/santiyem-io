// Şantiyem AI — INTERNAL ADMIN PANEL
// Yalnızca platform yöneticileri erişir. Tüm veriler sunucu tarafında
// yetki kontrolü yapan RPC'lerden gelir; kimlik bilgisi/secret gösterilmez.
// Bu sayfa müşteri navigasyonundan tamamen ayrıdır.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Building2,
  ChevronLeft,
  FolderKanban,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import {
  logAdminAction,
  useAdminAiOps,
  useAdminAudit,
  useAdminCompanies,
  useAdminCompanyDetail,
  useAdminHealth,
  useAdminOverview,
  useAdminProjects,
  useAdminUsers,
  useAdminWhatsApp,
  useIsPlatformAdmin,
} from "@/hooks/useAdminPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Section = "overview" | "companies" | "users" | "projects" | "whatsapp" | "ai" | "health";

const SECTIONS: { id: Section; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Genel Bakış", icon: LayoutDashboard },
  { id: "companies", label: "Firmalar", icon: Building2 },
  { id: "users", label: "Kullanıcılar", icon: Users },
  { id: "projects", label: "Projeler", icon: FolderKanban },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "health", label: "Sistem Durumu", icon: Activity },
];

const fmtDate = (v?: string | null) =>
  v && !v.startsWith("1970")
    ? new Date(v).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

const Kpi = ({ label, value, tone }: { label: string; value: string | number; tone?: "warn" | "bad" }) => (
  <div className="rounded-xl border border-border bg-card p-3.5">
    <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    <p
      className="mt-1 text-[22px] font-semibold leading-none"
      style={{ color: tone === "bad" ? "#EF4444" : tone === "warn" ? "#EAB308" : undefined }}
    >
      {value}
    </p>
  </div>
);

const Dot = ({ ok, warn }: { ok: boolean; warn?: boolean }) => (
  <span
    className="inline-block w-2 h-2 rounded-full shrink-0"
    style={{ background: ok ? "#22C55E" : warn ? "#EAB308" : "#EF4444" }}
  />
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">{children}</div>
);

const Line = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
    <span className="text-muted-foreground shrink-0">{k}</span>
    <span className="text-foreground text-right min-w-0 break-words">{v}</span>
  </div>
);

const SearchBar = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="Ara…"
    className="h-11 text-[16px] sm:text-[13.5px] max-w-sm"
  />
);

const Pager = ({
  page,
  total,
  pageSize,
  onPage,
}: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) => {
  const last = Math.max(Math.ceil(total / pageSize) - 1, 0);
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <span className="text-[12px] text-muted-foreground">
        {total} kayıt · sayfa {page + 1}/{last + 1}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-10 min-h-[40px]" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          Önceki
        </Button>
        <Button variant="outline" size="sm" className="h-10 min-h-[40px]" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Sonraki
        </Button>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const { data: isAdmin, isLoading: checking } = useIsPlatformAdmin();
  const [section, setSection] = useState<Section>("overview");
  const [companySearch, setCompanySearch] = useState("");
  const [companyPage, setCompanyPage] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(0);
  const [openUnit, setOpenUnit] = useState<string | null>(null);

  const allowed = !!isAdmin;

  useEffect(() => {
    document.title = "Admin Panel • Şantiyem";
  }, []);

  useEffect(() => {
    if (allowed) logAdminAction("admin_panel_view", "section", section);
  }, [allowed, section]);

  const overview = useAdminOverview(allowed && section === "overview");
  const companies = useAdminCompanies(allowed && section === "companies", companySearch, companyPage);
  const users = useAdminUsers(allowed && section === "users", userSearch, userPage);
  const projects = useAdminProjects(allowed && section === "projects", projectSearch, projectPage);
  const whatsapp = useAdminWhatsApp(allowed && section === "whatsapp");
  const ai = useAdminAiOps(allowed && section === "ai");
  const health = useAdminHealth(allowed && section === "health");
  const audit = useAdminAudit(allowed && section === "health");
  const detail = useAdminCompanyDetail(openUnit);

  const healthRows = useMemo(() => {
    const h = health.data;
    if (!h) return [];
    const fresh = (v?: string | null, hours = 48) =>
      !!v && Date.now() - new Date(v).getTime() < hours * 3600 * 1000;
    return [
      { name: "Profit Engine (bütçe kayıtları)", at: h.profit_engine_last_budget_at, ok: fresh(h.profit_engine_last_budget_at, 24 * 30) },
      { name: "Risk Engine", at: h.risk_engine_last_detect_at, ok: fresh(h.risk_engine_last_detect_at, 24 * 7) },
      { name: "Forecast snapshot", at: h.forecast_snapshot_last_at, ok: fresh(h.forecast_snapshot_last_at, 24 * 7) },
      { name: "Profit/Risk Agent", at: h.agent_last_run_at, ok: fresh(h.agent_last_run_at, 48) },
      {
        name: `Evolution bağlantı (${h.evolution_connected}/${h.evolution_connections_total} bağlı)`,
        at: h.evolution_last_health_check,
        ok: h.evolution_connected > 0,
      },
      {
        name: `WhatsApp gönderim (24s hata: ${h.scheduler_failed_24h})`,
        at: h.scheduler_last_send_at,
        ok: h.scheduler_failed_24h === 0,
      },
    ];
  }, [health.data]);

  if (loading || checking) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-3">
          <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="text-[17px] font-semibold text-foreground">Erişim reddedildi</h1>
          <p className="text-[13px] text-muted-foreground">
            Bu bölüm yalnızca Şantiyem ekibine açıktır.
          </p>
          <Button className="h-11 min-h-[44px]" onClick={() => navigate("/")}>
            Uygulamaya dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background overflow-x-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="w-4 h-4" /> Uygulama
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-[14px] font-semibold text-foreground">Admin Panel</span>
          <span className="ml-auto text-[11.5px] text-muted-foreground truncate max-w-[45%]">{user.email}</span>
        </div>
        <div className="mx-auto max-w-[1200px] px-3 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium whitespace-nowrap ${
                  active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ height: 40, minHeight: 40 }}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-5 space-y-4">
        {section === "overview" && (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <Kpi label="Toplam Firma" value={overview.data?.total_companies ?? "—"} />
            <Kpi label="Kullanıcı" value={overview.data?.total_users ?? "—"} />
            <Kpi label="Son 30 Gün Aktif" value={overview.data?.active_users_30d ?? "—"} />
            <Kpi label="Aktif Proje" value={overview.data?.active_projects ?? "—"} />
            <Kpi label="Kârlılık Hazır Proje" value={overview.data?.profit_ready_projects ?? "—"} />
            <Kpi label="Bağlı WhatsApp" value={overview.data?.whatsapp_connected ?? "—"} />
            <Kpi label="24s AI Analizi" value={overview.data?.ai_insights_24h ?? "—"} />
            <Kpi
              label="24s Gönderim Hatası"
              value={overview.data?.failed_messages_24h ?? "—"}
              tone={(overview.data?.failed_messages_24h ?? 0) > 0 ? "bad" : undefined}
            />
          </div>
        )}

        {section === "companies" && (
          <div className="space-y-3">
            <SearchBar value={companySearch} onChange={(v) => { setCompanySearch(v); setCompanyPage(0); }} />
            <div className="grid gap-2.5 md:grid-cols-2">
              {(companies.data?.rows ?? []).map((c) => (
                <button key={c.unit_id} onClick={() => setOpenUnit(c.unit_id)} className="text-left">
                  <Card>
                    <div className="flex items-center gap-2">
                      <Dot ok={!!c.whatsapp_connected} warn />
                      <span className="text-[13.5px] font-semibold text-foreground truncate">{c.unit_name}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{c.account_status}</span>
                    </div>
                    <Line k="Sahibi" v={c.owner_name || c.owner_email || "—"} />
                    <Line k="Kullanıcı / Proje" v={`${c.user_count} / ${c.project_count}`} />
                    <Line k="Aktif proje" v={c.active_project_count} />
                    <Line k="Kârlılık hazır" v={c.profit_ready_count} />
                    <Line k="Son aktivite" v={fmtDate(c.last_activity)} />
                  </Card>
                </button>
              ))}
              {companies.isFetched && (companies.data?.rows ?? []).length === 0 && (
                <p className="text-[13px] text-muted-foreground">Kayıt bulunamadı.</p>
              )}
            </div>
            <Pager page={companyPage} total={companies.data?.total ?? 0} pageSize={25} onPage={setCompanyPage} />
          </div>
        )}

        {section === "users" && (
          <div className="space-y-3">
            <SearchBar value={userSearch} onChange={(v) => { setUserSearch(v); setUserPage(0); }} />
            <div className="grid gap-2.5 md:grid-cols-2">
              {(users.data?.rows ?? []).map((u) => (
                <Card key={u.user_id}>
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-foreground truncate">{u.full_name || "İsimsiz"}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{u.role}</span>
                  </div>
                  <Line k="E-posta" v={u.email || "—"} />
                  <Line k="Firma" v={u.company || "—"} />
                  <Line k="Plan / Durum" v={`${u.plan} · ${u.account_status}`} />
                  <Line k="Son aktivite" v={fmtDate(u.last_activity)} />
                </Card>
              ))}
            </div>
            <Pager page={userPage} total={users.data?.total ?? 0} pageSize={25} onPage={setUserPage} />
          </div>
        )}

        {section === "projects" && (
          <div className="space-y-3">
            <SearchBar value={projectSearch} onChange={(v) => { setProjectSearch(v); setProjectPage(0); }} />
            <div className="grid gap-2.5 md:grid-cols-2">
              {(projects.data?.rows ?? []).map((p) => (
                <Card key={p.id}>
                  <div className="flex items-center gap-2">
                    <Dot ok={p.budget_ready && p.snapshot_ready} warn={p.budget_ready} />
                    <span className="text-[13.5px] font-semibold text-foreground truncate">{p.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{p.status || "—"}</span>
                  </div>
                  <Line k="Firma" v={p.company || "—"} />
                  <Line k="Bütçe / Snapshot" v={`${p.budget_ready ? "var" : "yok"} · ${p.snapshot_ready ? "var" : "yok"}`} />
                  <Line k="Açık risk" v={p.open_risks} />
                  <Line k="Son snapshot" v={fmtDate(p.last_snapshot_at)} />
                </Card>
              ))}
            </div>
            <Pager page={projectPage} total={projects.data?.total ?? 0} pageSize={25} onPage={setProjectPage} />
          </div>
        )}

        {section === "whatsapp" && (
          <div className="grid gap-2.5 md:grid-cols-2">
            {(whatsapp.data?.rows ?? []).map((w) => (
              <Card key={w.id}>
                <div className="flex items-center gap-2">
                  <Dot ok={w.status === "connected"} warn={w.status === "connecting" || w.status === "reconnecting"} />
                  <span className="text-[13.5px] font-semibold text-foreground truncate">{w.company || "—"}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{w.status}</span>
                </div>
                <Line k="Kullanıcı" v={w.user_name || "—"} />
                <Line k="Numara" v={w.number_masked || "—"} />
                <Line k="Son sağlık kontrolü" v={fmtDate(w.last_health_check)} />
                <Line k="Son başarılı mesaj" v={fmtDate(w.last_message_at)} />
                <Line k="Son hata" v={w.last_error || "—"} />
              </Card>
            ))}
            {whatsapp.isFetched && (whatsapp.data?.rows ?? []).length === 0 && (
              <p className="text-[13px] text-muted-foreground">Henüz WhatsApp bağlantısı yok.</p>
            )}
          </div>
        )}

        {section === "ai" && (
          <div className="grid gap-2.5 md:grid-cols-2">
            {(ai.data?.rows ?? []).map((r, i) => (
              <Card key={`${r.run_hour}-${i}`}>
                <div className="flex items-center gap-2">
                  <Dot ok={r.failed_count === 0} />
                  <span className="text-[13.5px] font-semibold text-foreground truncate">{r.company || "—"}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{fmtDate(r.last_run_at)}</span>
                </div>
                <Line k="Proje" v={r.project_name || "Portföy"} />
                <Line k="Üretilen içgörü" v={r.insight_count} />
                <Line k="Model" v={r.model_version || "—"} />
                <Line k="Hata" v={r.failed_count} />
              </Card>
            ))}
            {ai.isFetched && (ai.data?.rows ?? []).length === 0 && (
              <p className="text-[13px] text-muted-foreground">Henüz AI analizi kaydı yok.</p>
            )}
          </div>
        )}

        {section === "health" && (
          <div className="space-y-4">
            <div className="grid gap-2.5 md:grid-cols-2">
              {healthRows.map((h) => (
                <Card key={h.name}>
                  <div className="flex items-center gap-2">
                    <Dot ok={h.ok} warn={!h.ok && !!h.at} />
                    <span className="text-[13.5px] font-semibold text-foreground">{h.name}</span>
                  </div>
                  <Line k="Son çalışma" v={fmtDate(h.at)} />
                </Card>
              ))}
            </div>
            <div>
              <h2 className="mb-2 text-[13.5px] font-semibold text-foreground">Denetim Kaydı</h2>
              <div className="space-y-1.5">
                {(audit.data?.rows ?? []).map((a) => (
                  <div key={a.id} className="rounded-lg border border-border bg-card px-3 py-2 text-[12.5px]">
                    <span className="text-foreground">{a.admin_name || "—"}</span>
                    <span className="text-muted-foreground"> · {a.action}</span>
                    {a.target_id && <span className="text-muted-foreground"> · {a.target_type}:{a.target_id}</span>}
                    <span className="text-muted-foreground"> · {fmtDate(a.created_at)}</span>
                  </div>
                ))}
                {audit.isFetched && (audit.data?.rows ?? []).length === 0 && (
                  <p className="text-[13px] text-muted-foreground">Kayıt yok.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Firma detayı */}
      <Sheet open={!!openUnit} onOpenChange={(o) => !o && setOpenUnit(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[15px]">{detail.data?.name || "Firma"}</SheetTitle>
          </SheetHeader>
          {detail.isLoading ? (
            <p className="mt-4 text-[13px] text-muted-foreground">Yükleniyor…</p>
          ) : (
            <div className="mt-4 space-y-4">
              <Card>
                <Line k="Tür" v={detail.data?.kind === "team" ? "Ofis ekibi" : "Tek kullanıcı"} />
                <Line k="Oluşturulma" v={fmtDate(detail.data?.created_at)} />
                <Line k="Sahibi" v={detail.data?.owner?.name || detail.data?.owner?.email || "—"} />
                <Line k="Plan" v={detail.data?.owner?.plan || "—"} />
              </Card>
              <div>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-foreground">Kullanıcılar</h3>
                <div className="space-y-1.5">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(detail.data?.users ?? []).map((u: any) => (
                    <div key={u.user_id} className="rounded-lg border border-border px-3 py-2 text-[12.5px]">
                      <span className="text-foreground">{u.name || u.email}</span>
                      <span className="text-muted-foreground"> · {u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-foreground">Projeler</h3>
                <div className="space-y-1.5">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(detail.data?.projects ?? []).map((p: any) => (
                    <div key={p.id} className="rounded-lg border border-border px-3 py-2 text-[12.5px]">
                      <div className="text-foreground">{p.name}</div>
                      <div className="text-muted-foreground">
                        {p.status || "—"} · kârlılık {p.profit_ready ? "hazır" : "hazır değil"} · açık risk {p.open_risks} ·
                        snapshot {fmtDate(p.last_snapshot_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-foreground">WhatsApp</h3>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(detail.data?.whatsapp ?? []).map((w: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border px-3 py-2 text-[12.5px]">
                    {w.status} · {w.number_masked || "—"} · sağlık {fmtDate(w.last_health_check)}
                  </div>
                ))}
                {(detail.data?.whatsapp ?? []).length === 0 && (
                  <p className="text-[12.5px] text-muted-foreground">Bağlantı yok.</p>
                )}
              </div>
              <Card>
                <Line k="Son AI analizi" v={fmtDate(detail.data?.ai?.last_run_at)} />
                <Line k="İçgörü sayısı" v={detail.data?.ai?.insight_count ?? 0} />
                <Line k="Model" v={detail.data?.ai?.model_version || "—"} />
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminPanel;
