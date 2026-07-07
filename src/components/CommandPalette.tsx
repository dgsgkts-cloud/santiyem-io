// Sprint 23 — Global Command Palette (⌘K / Ctrl+K)
// Sprint 23.1 — Contextual AI suggestions per current page, frequency-sorted,
// with recently used list and hover descriptions. No backend, no schema.

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
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home, FolderOpen, FileText, MessageSquare, WalletCards, BookOpen,
  Package, HardHat, BarChart3, Settings, Sparkles, Plus, TrendingUp,
  ShieldAlert, Wallet, Users, Zap, Clock, ShoppingCart, Send, Truck, Warehouse, ArrowLeftRight, Wrench, ClipboardCheck, Fuel,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { usePersonnel } from "@/hooks/usePersonnel";
import {
  getSuggestionsForTab, getRecentSuggestions, recordSuggestionUse,
  sortByFrequency, type AISuggestion,
} from "@/lib/aiSuggestions";
import { useAccessGuard, type GuardTab } from "@/lib/accessControl";
import { toast } from "sonner";

const ACTIVE_TAB_KEY = "santiyem_active_tab";

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
  { id: "procurement", label: "Satın Alma", icon: ShoppingCart, hint: "Talep / RFQ / Sipariş" },
  { id: "warehouse", label: "Depo & Envanter", icon: Warehouse, hint: "Stok / Transfer / Zimmet" },
  { id: "fleet", label: "Makine & Ekipman", icon: Truck, hint: "Filo / Bakım / Yakıt / Operatör" },
  { id: "reports", label: "Raporlar", icon: BarChart3 },
  { id: "chat", label: "AI Asistan", icon: MessageSquare },
  { id: "settings", label: "Ayarlar", icon: Settings },
];

const AI_SHORTCUTS = [
  { label: "Finansal analiz", prompt: "Şirketimin güncel finansal durumunu analiz et.", icon: TrendingUp },
  { label: "Risk raporu", prompt: "Şirketimdeki finansal ve operasyonel riskleri listele.", icon: ShieldAlert },
  { label: "Nakit tahmini", prompt: "Önümüzdeki 30 gün için nakit akışı tahmini oluştur.", icon: Wallet },
  { label: "CEO Modu", prompt: "CEO modu: gelir, gider, nakit, kâr, proje sağlığı, riskler ve önerileri tek ekranda özetle.", icon: Zap },
  { label: "Satın alma özeti", prompt: "Bu ayki satın alma performansını ve tedarikçi puanlarını özetle.", icon: ShoppingCart },
  { label: "Teklif karşılaştır", prompt: "Aktif RFQ'lardaki teklifleri karşılaştır ve en iyi tedarikçiyi öner.", icon: Send },
  { label: "Depo özeti", prompt: "Depo envanterini, kritik stokları ve tüketim trendini özetle.", icon: Warehouse },
  { label: "Kritik stokları listele", prompt: "Kritik ve tükenmiş stok kalemlerini önceliklendirerek listele.", icon: ShieldAlert },
  { label: "Filo dashboard aç", prompt: "Filo dashboard: bakım riskleri, yakıt, kullanım oranı ve atıl ekipmanları özetle.", icon: Truck },
  { label: "Bakım gereken ekipmanlar", prompt: "Önümüzdeki 7 gün içinde bakım gerektirecek tüm ekipmanları listele.", icon: Wrench },
];

const CREATE_ACTIONS = [
  { label: "Yeni Proje", tab: "projects", icon: FolderOpen },
  { label: "Yeni Ödeme", tab: "payments-kasa", icon: WalletCards },
  { label: "Yeni Personel", tab: "personnel", icon: HardHat },
  { label: "Yeni Malzeme", tab: "materials", icon: Package },
  { label: "Yeni Fatura", tab: "e-invoices", icon: FileText },
  { label: "Yeni Hakediş", tab: "hakedis", icon: FileText },
  { label: "Yeni Satın Alma Talebi", tab: "procurement", icon: ShoppingCart },
  { label: "Yeni Tedarikçi", tab: "procurement", icon: Users },
  { label: "Yeni Sipariş", tab: "procurement", icon: Truck },
  { label: "Malzeme Girişi", tab: "warehouse", icon: Package },
  { label: "Stok Transferi", tab: "warehouse", icon: ArrowLeftRight },
  { label: "Ekipman Zimmetle", tab: "warehouse", icon: Wrench },
  { label: "Stok Sayımı Başlat", tab: "warehouse", icon: ClipboardCheck },
  { label: "Yakıt Kaydı Ekle", tab: "fleet", icon: Fuel },
  { label: "Bakım Oluştur", tab: "fleet", icon: Wrench },
  { label: "Operatör Ata", tab: "fleet", icon: Users },
  { label: "Ekipman Transferi", tab: "fleet", icon: ArrowLeftRight },
];

const getActiveTab = (): string => {
  try { return localStorage.getItem(ACTIVE_TAB_KEY) ?? "dashboard"; }
  catch { return "dashboard"; }
};

const SuggestionRow = ({ s, onRun }: { s: AISuggestion; onRun: (s: AISuggestion) => void }) => (
  <TooltipProvider delayDuration={250}>
    <Tooltip>
      <TooltipTrigger asChild>
        <CommandItem value={`ai ${s.label}`} onSelect={() => onRun(s)} className="group">
          <Sparkles className="mr-2 h-4 w-4 text-[#FF6B2B]" />
          <span className="truncate">{s.label}</span>
          <span className="ml-auto text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">AI</span>
        </CommandItem>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[280px] text-xs leading-snug">
        {s.description}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [currentTab, setCurrentTab] = useState<string>(getActiveTab());
  const [recentTick, setRecentTick] = useState(0);
  const { projects } = useProjects();
  const { subcontractors } = useSubcontractors();
  const { personnel } = usePersonnel();
  const guard = useAccessGuard();

  // Sprint 28.6 — guarded navigation. Locked commands still open the tab
  // (LockedPage renders) and a toast explains why for immediate feedback.
  const guardedNav = (tab: string) => {
    const d = guard.check(tab as GuardTab);
    if (!d.ok) {
      toast.error("Bu özellik mevcut planınızda kullanılamıyor.", {
        description: d.reason === "setup-required" ? "Önce şirket kurulumunu tamamlayın." : "Planı yükselterek erişim sağlayın.",
      });
    }
    nav(tab);
  };



  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openEv = () => { setCurrentTab(getActiveTab()); setOpen(true); };
    const navEv = (e: Event) => setCurrentTab((e as CustomEvent).detail);
    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", openEv);
    window.addEventListener("navigate-tab", navEv);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", openEv);
      window.removeEventListener("navigate-tab", navEv);
    };
  }, []);

  useEffect(() => {
    if (open) setCurrentTab(getActiveTab());
  }, [open]);

  const runSuggestion = (s: AISuggestion) => {
    recordSuggestionUse(s);
    setRecentTick((t) => t + 1);
    askAI(s.prompt);
    setOpen(false);
    setQ("");
  };

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
    setQ("");
  };

  const pageSuggestions = useMemo(
    () => sortByFrequency(getSuggestionsForTab(currentTab)),
    [currentTab, open, recentTick],
  );
  const recent = useMemo(
    () => getRecentSuggestions(),
    [open, recentTick],
  );

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
      <CommandList className="max-h-[520px]">
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

        {pageSuggestions.length > 0 && (
          <CommandGroup heading="Bu sayfa için öneriler">
            {pageSuggestions.map((s) => (
              <SuggestionRow key={s.id} s={s} onRun={runSuggestion} />
            ))}
          </CommandGroup>
        )}

        {recent.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Son Kullanılanlar">
              {recent.map((s) => (
                <CommandItem
                  key={`recent-${s.id}`}
                  value={`recent ${s.label}`}
                  onSelect={() => runSuggestion(s)}
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{s.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="AI Kısayolları">
          {AI_SHORTCUTS.map((a) => (
            <CommandItem key={a.label} onSelect={() => run(() => askAI(a.prompt))}>
              <a.icon className="mr-2 h-4 w-4 text-[#FF6B2B]" />
              <span>{a.label}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">AI</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Oluştur">
          {CREATE_ACTIONS.map((c) => {
            const d = guard.check(c.tab as GuardTab);
            return (
              <CommandItem key={c.label} onSelect={() => run(() => guardedNav(c.tab))} className={d.ok ? "" : "opacity-50"}>
                <Plus className="mr-2 h-4 w-4" />
                <span>{c.label}</span>
                {!d.ok && <Lock className="ml-2 h-3 w-3 text-muted-foreground" aria-label="Bu özellik mevcut planınızda kullanılamıyor." />}
                <c.icon className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Sayfalar">
          {NAV_ITEMS.map((n) => {
            const d = guard.check(n.id as GuardTab);
            return (
              <CommandItem key={n.id} onSelect={() => run(() => guardedNav(n.id))} className={d.ok ? "" : "opacity-50"}>
                <n.icon className="mr-2 h-4 w-4" />
                <span>{n.label}</span>
                {!d.ok && <Lock className="ml-2 h-3 w-3 text-muted-foreground" aria-label="Bu özellik mevcut planınızda kullanılamıyor." />}
                {n.hint && <span className="ml-auto text-[10px] text-muted-foreground">{n.hint}</span>}
              </CommandItem>
            );
          })}
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
              <CommandItem value={`ai-ask ${q}`} onSelect={() => run(() => askAI(q))}>
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
