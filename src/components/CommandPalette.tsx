// Sprint 23 — Global Command Palette (⌘K / Ctrl+K)
// Raycast/Linear-inspired workspace command center. Searches navigation,
// projects, personnel, subcontractors, quick actions and AI shortcuts.
// Uses existing `navigate-tab` CustomEvent bus so no router changes required.

import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home, FolderOpen, FileText, MessageSquare, WalletCards, BookOpen,
  Package, HardHat, BarChart3, Settings, Sparkles, Plus, TrendingUp,
  ShieldAlert, Wallet, Users, Zap,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { usePersonnel } from "@/hooks/usePersonnel";

const nav = (tab: string) =>
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));

const askAI = (prompt: string) => {
  nav("chat");
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text: prompt } }));
  }, 150);
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home, hint: "Ana ekran" },
  { id: "projects", label: "Projeler", icon: FolderOpen },
  { id: "hakedis", label: "Hakediş", icon: FileText },
  { id: "payments-kasa", label: "Ödemeler & Kasa", icon: WalletCards },
  { id: "site-diary", label: "Şantiye Günlüğü", icon: BookOpen },
  { id: "materials", label: "Malzeme", icon: Package },
  { id: "personnel", label: "Personel", icon: HardHat },
  { id: "e-invoices", label: "E-Fatura", icon: FileText },
  { id: "reports", label: "Raporlar", icon: BarChart3 },
  { id: "chat", label: "AI Asistan", icon: MessageSquare },
  { id: "settings", label: "Ayarlar", icon: Settings },
];

const AI_ACTIONS = [
  { label: "Finansal analiz", prompt: "Şirketimin güncel finansal durumunu analiz et.", icon: TrendingUp },
  { label: "Risk raporu", prompt: "Şirketimdeki finansal ve operasyonel riskleri listele.", icon: ShieldAlert },
  { label: "Nakit tahmini", prompt: "Önümüzdeki 30 gün için nakit akışı tahmini oluştur.", icon: Wallet },
  { label: "Günlük özet", prompt: "Bugün odaklanmam gereken en önemli 5 konu nedir?", icon: Sparkles },
  { label: "CEO Modu", prompt: "CEO modu: gelir, gider, nakit, kâr, proje sağlığı, riskler ve önerileri tek ekranda özetle.", icon: Zap },
  { label: "Proje kârlılık", prompt: "Tüm projelerin kârlılık sıralamasını göster.", icon: TrendingUp },
  { label: "Gecikmiş ödemeler", prompt: "Vadesi geçmiş tüm ödemeleri listele.", icon: ShieldAlert },
];

const CREATE_ACTIONS = [
  { label: "Yeni Proje", tab: "projects", icon: FolderOpen },
  { label: "Yeni Ödeme", tab: "payments-kasa", icon: WalletCards },
  { label: "Yeni Personel", tab: "personnel", icon: HardHat },
  { label: "Yeni Malzeme", tab: "materials", icon: Package },
  { label: "Yeni Fatura", tab: "e-invoices", icon: FileText },
  { label: "Yeni Hakediş", tab: "hakedis", icon: FileText },
];

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { projects } = useProjects();
  const { subcontractors } = useSubcontractors();
  const { personnel } = usePersonnel();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openEv = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", openEv);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", openEv);
    };
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
    setQ("");
  };

  const projectItems = useMemo(() => (projects || []).slice(0, 8), [projects]);
  const subItems = useMemo(() => (subcontractors || []).slice(0, 6), [subcontractors]);
  const personnelItems = useMemo(() => (personnel || []).slice(0, 6), [personnel]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Ara: proje, personel, tedarikçi, komut, AI eylemi…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList className="max-h-[480px]">
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

        <CommandGroup heading="AI Eylemleri">
          {AI_ACTIONS.map((a) => (
            <CommandItem key={a.label} onSelect={() => run(() => askAI(a.prompt))}>
              <a.icon className="mr-2 h-4 w-4 text-[#FF6B2B]" />
              <span>{a.label}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">AI</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Oluştur">
          {CREATE_ACTIONS.map((c) => (
            <CommandItem key={c.label} onSelect={() => run(() => nav(c.tab))}>
              <Plus className="mr-2 h-4 w-4" />
              <span>{c.label}</span>
              <c.icon className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Sayfalar">
          {NAV_ITEMS.map((n) => (
            <CommandItem key={n.id} onSelect={() => run(() => nav(n.id))}>
              <n.icon className="mr-2 h-4 w-4" />
              <span>{n.label}</span>
              {n.hint && <span className="ml-auto text-[10px] text-muted-foreground">{n.hint}</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        {projectItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projeler">
              {projectItems.map((p: any) => (
                <CommandItem key={p.id} value={`proje ${p.name}`} onSelect={() => run(() => nav("projects"))}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span className="truncate">{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {subItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tedarikçiler / Taşeronlar">
              {subItems.map((s: any) => (
                <CommandItem key={s.id} value={`tedarikci ${s.name}`} onSelect={() => run(() => nav("payments-kasa"))}>
                  <Users className="mr-2 h-4 w-4" />
                  <span className="truncate">{s.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {personnelItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Personel">
              {personnelItems.map((p: any) => (
                <CommandItem key={p.id} value={`personel ${p.full_name}`} onSelect={() => run(() => nav("personnel"))}>
                  <HardHat className="mr-2 h-4 w-4" />
                  <span className="truncate">{p.full_name}</span>
                  {p.title && <span className="ml-auto text-[10px] text-muted-foreground">{p.title}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {q.trim().length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="AI'a sor">
              <CommandItem value={`ai ${q}`} onSelect={() => run(() => askAI(q))}>
                <Sparkles className="mr-2 h-4 w-4 text-[#FF6B2B]" />
                <span className="truncate">"{q}" → AI'a sor</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
