// Kurulum Merkezi — sade, otomatik kontrol eden kontrol listesi.
// Kullanıcıdan zaten kayıtlı olan bilgiyi tekrar istemez; her madde
// kullanıcıyı doğru ekrana götürür.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/hooks/useProjects";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { getCompanyProfile } from "@/lib/companyProfile";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  id: string;
  label: string;
  done: boolean;
  action?: { label: string; run: () => void };
}

const Row = ({ item }: { item: Item }) => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3.5 py-3">
    <span
      className="flex items-center justify-center rounded-full shrink-0"
      style={{
        width: 22,
        height: 22,
        background: item.done ? "hsl(var(--success, 142 71% 45%) / 0.15)" : "transparent",
        border: item.done ? "none" : "1.5px solid hsl(var(--border))",
      }}
    >
      {item.done && <Check className="w-3.5 h-3.5" style={{ color: "#22C55E" }} strokeWidth={3} />}
    </span>
    <span className={`flex-1 min-w-0 text-[13.5px] ${item.done ? "text-muted-foreground" : "text-foreground font-medium"}`}>
      {item.label}
    </span>
    {!item.done && item.action && (
      <button
        onClick={item.action.run}
        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 text-[12.5px] font-semibold text-primary-foreground"
        style={{ height: 40, minHeight: 40, background: "hsl(var(--primary))" }}
      >
        {item.action.label}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export default function SetupChecklist() {
  const navigate = useNavigate();
  const { user, profile } = useUser();
  const { projects } = useProjects();
  const { connection } = useWhatsAppConnection();
  const [hasBudget, setHasBudget] = useState<boolean | null>(null);

  const company = (() => {
    try { return getCompanyProfile(); } catch { return null; }
  })();

  useEffect(() => {
    if (!user || projects.length === 0) { setHasBudget(false); return; }
    let alive = true;
    (async () => {
      const { count } = await supabase
        .from("cost_code_budgets")
        .select("id", { count: "exact", head: true })
        .in("project_id", projects.map((p) => p.id));
      if (alive) setHasBudget((count ?? 0) > 0);
    })();
    return () => { alive = false; };
  }, [user, projects]);

  const whatsappConnected = connection?.status === "connected";

  const items: Item[] = [
    {
      id: "profile",
      label: "Profil bilgileri",
      done: !!profile?.full_name,
      action: {
        label: "Doldur",
        run: () => window.dispatchEvent(new CustomEvent("open-profile-tab")),
      },
    },
    {
      id: "company",
      label: "Şirket bilgileri",
      done: !!company?.companyName,
      action: {
        label: "Doldur",
        run: () => window.dispatchEvent(new CustomEvent("open-profile-tab")),
      },
    },
    {
      id: "project",
      label: "İlk proje",
      done: projects.length > 0,
      action: { label: "Proje Ekle", run: () => navigate("/projeler") },
    },
    {
      id: "budget",
      label: "İlk proje bütçesi",
      done: !!hasBudget,
      action: { label: "Bütçe Gir", run: () => navigate("/projeler") },
    },
    {
      id: "whatsapp",
      label: whatsappConnected ? "WhatsApp bağlı" : "WhatsApp bağlantısı",
      done: whatsappConnected,
      action: { label: "WhatsApp'ı Bağla", run: () => navigate("/entegrasyonlar") },
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold text-foreground">Kurulum Merkezi</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {doneCount === items.length
            ? "Kurulumunuz tamamlandı."
            : `${doneCount}/${items.length} adım tamamlandı.`}
        </p>
      </div>
      <div className="space-y-2">
        {items.map((i) => <Row key={i.id} item={i} />)}
      </div>
    </div>
  );
}
