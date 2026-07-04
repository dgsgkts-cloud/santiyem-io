// Owner-only organization admin panel:
// - lists members (uses existing office_members roles)
// - lets the owner set/expire per-organization feature and limit overrides.
// No hardcoded plan names — everything is keyed off feature/limit strings.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/hooks/useTeam";
import { useOrgPlan, effectiveFeature, effectiveLimit } from "@/hooks/useOrgPlan";
import { PlanBadge } from "./PlanBadge";

const FEATURE_KEYS = [
  "voice_copilot", "executive_brief", "company_memory", "knowledge_base",
  "communication_hub", "email_accounts", "whatsapp", "meetings",
  "hakedis_ai", "contracts_ai", "gayrimenkul360", "demo_seed",
  "advanced_reports", "api_access", "sso",
];

const LIMIT_KEYS = [
  "users", "projects", "storage_mb", "kb_storage_mb",
  "ai_requests_month", "voice_minutes_month",
  "comm_messages_month", "company_memory_writes_month",
];

export function OrgAdminPanel() {
  const { team, members, isOwner } = useTeam();
  const { summary, refresh } = useOrgPlan();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [limitDraft, setLimitDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!summary) return;
    const next: Record<string, string> = {};
    for (const k of LIMIT_KEYS) {
      const spec = effectiveLimit(summary, k);
      next[k] = spec ? String(spec.limit) : "";
    }
    setLimitDraft(next);
  }, [summary]);

  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of members) c[m.role] = (c[m.role] ?? 0) + 1;
    return c;
  }, [members]);

  if (!team) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Kuruluş</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Henüz bir kuruluşa (takıma) ait değilsiniz. Kuruluş yönetimi için Ofis planında bir takım oluşturun.
        </CardContent>
      </Card>
    );
  }

  const setFeature = async (key: string, enabled: boolean) => {
    if (!isOwner || !team) return;
    setSavingKey(`feature:${key}`);
    const { error } = await supabase
      .from("organization_feature_overrides")
      .upsert({ team_id: team.id, feature_key: key, enabled, reason: "admin" },
              { onConflict: "team_id,feature_key" });
    setSavingKey(null);
    if (error) return toast.error(error.message);
    toast.success("Özellik güncellendi");
    refresh();
  };

  const clearFeatureOverride = async (key: string) => {
    if (!isOwner || !team) return;
    setSavingKey(`feature:${key}`);
    await supabase.from("organization_feature_overrides")
      .delete().eq("team_id", team.id).eq("feature_key", key);
    setSavingKey(null);
    refresh();
  };

  const saveLimit = async (key: string) => {
    if (!isOwner || !team) return;
    const raw = limitDraft[key];
    const n = Number(raw);
    if (!Number.isFinite(n)) return toast.error("Geçersiz değer");
    setSavingKey(`limit:${key}`);
    const { error } = await supabase.from("organization_limit_overrides").upsert({
      team_id: team.id, limit_key: key, limit_value: Math.round(n), reason: "admin",
    }, { onConflict: "team_id,limit_key" });
    setSavingKey(null);
    if (error) return toast.error(error.message);
    toast.success("Sınır güncellendi");
    refresh();
  };

  const clearLimit = async (key: string) => {
    if (!isOwner || !team) return;
    setSavingKey(`limit:${key}`);
    await supabase.from("organization_limit_overrides")
      .delete().eq("team_id", team.id).eq("limit_key", key);
    setSavingKey(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Kuruluş — {team.name}
          </CardTitle>
          <PlanBadge />
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {Object.entries(roleCounts).map(([r, n]) => (
              <Badge key={r} variant="outline">{r}: {n}</Badge>
            ))}
          </div>
          {!isOwner && (
            <div className="text-xs text-muted-foreground">
              Yalnızca kuruluş sahibi özellik ve sınırları değiştirebilir.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Özellik geçersiz kılmaları</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {FEATURE_KEYS.map((k) => {
            const enabled = effectiveFeature(summary, k);
            const overridden = !!summary?.feature_overrides?.[k];
            return (
              <div key={k} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex flex-col">
                  <span className="font-mono text-xs">{k}</span>
                  {overridden && <span className="text-[10px] text-primary">geçersiz kılma aktif</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enabled}
                    disabled={!isOwner || savingKey === `feature:${k}`}
                    onCheckedChange={(v) => setFeature(k, v)}
                  />
                  {overridden && isOwner && (
                    <Button size="sm" variant="ghost" onClick={() => clearFeatureOverride(k)}>
                      Sıfırla
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sınır geçersiz kılmaları</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {LIMIT_KEYS.map((k) => {
            const overridden = !!summary?.limit_overrides?.[k];
            return (
              <div key={k} className="rounded-md border p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs">{k}</Label>
                  {overridden && <Badge variant="outline">geçersiz kılma</Badge>}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={limitDraft[k] ?? ""}
                    disabled={!isOwner}
                    onChange={(e) => setLimitDraft((d) => ({ ...d, [k]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={!isOwner || savingKey === `limit:${k}`}
                    onClick={() => saveLimit(k)}
                  >Kaydet</Button>
                  {overridden && isOwner && (
                    <Button size="sm" variant="ghost" onClick={() => clearLimit(k)}>Sıfırla</Button>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">-1 = sınırsız</div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
