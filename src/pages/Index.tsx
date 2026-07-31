import { BrandHomeLink } from "@/components/brand/BrandHomeLink";
import { SantiyemMark } from "@/components/brand/SantiyemLogo";
import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import OnboardingModal, { shouldShowOnboarding, markOnboardingDone } from "@/components/desktop/OnboardingModal";
import FirstRunWizard, { isFirstRunDone, shouldShowWelcomeBrief, clearWelcomeBrief } from "@/components/desktop/FirstRunWizard";
import { useProjects } from "@/hooks/useProjects";
import ThemeSelectionModal, { shouldShowThemeModal, markThemeModalDone } from "@/components/desktop/ThemeSelectionModal";
import AIHome from "@/components/ai/AIHome";
import AIThinkingStages from "@/components/ai/AIThinkingStages";
import AIResponseActions from "@/components/ai/AIResponseActions";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput, { Attachment } from "@/components/ChatInput";

import RenderPanel from "@/components/RenderPanel";
import RemindersPanel from "@/components/RemindersPanel";
import PricingPanel from "@/components/PricingPanel";
import DailyKnowledgePanel from "@/components/DailyKnowledgePanel";
import UsageLimitBanner from "@/components/UsageLimitBanner";
import { QuotaWarningBanner } from "@/components/billing/QuotaWarningBanner";
import DesktopSidebar from "@/components/desktop/DesktopSidebar";
import DesktopTopBar from "@/components/desktop/DesktopTopBar";
import DesktopDashboard from "@/components/desktop/DesktopDashboard";
import DesktopChatLayout from "@/components/desktop/DesktopChatLayout";
import DesktopProjectsPage from "@/components/desktop/DesktopProjectsPage";
import ComingSoonScreen from "@/components/desktop/ComingSoonScreen";

// Sprint 17.2 — Heavy pages (recharts, jspdf, xlsx, wizards) are lazy-loaded
// so the dashboard opens instantly. Each pulls its own vendor chunk on demand.
const DesktopHakedisPage = lazy(() => import("@/components/desktop/DesktopHakedisPage"));
const SiteDiaryPage = lazy(() => import("@/components/desktop/SiteDiaryPage"));
const DesktopContractsPage = lazy(() => import("@/components/desktop/DesktopContractsPage"));
const PaymentsKasaPage = lazy(() => import("@/components/desktop/PaymentsKasaPage"));
const MaterialsPage = lazy(() => import("@/components/desktop/MaterialsPage"));
const EInvoicesPage = lazy(() => import("@/components/desktop/EInvoicesPage"));
const PersonnelPage = lazy(() => import("@/pages/PersonnelPage"));
const DesktopSettingsPage = lazy(() => import("@/components/desktop/DesktopSettingsPage"));
const MeetingCenterPage = lazy(() => import("@/components/meetings/MeetingCenterPage"));
const CommunicationCenterPage = lazy(() => import("@/components/communication/CommunicationCenterPage"));
const ProcurementPage = lazy(() => import("@/components/desktop/ProcurementPage"));
const WarehousePage = lazy(() => import("@/components/desktop/WarehousePage"));
const FleetPage = lazy(() => import("@/components/desktop/FleetPage"));
const ReportsPage = lazy(() => import("@/components/desktop/ReportsPage"));
import LockedPage from "@/components/desktop/LockedPage";
import { useAccessGuard, useAccessSnapshotSync } from "@/lib/accessControl";

const TabFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <div className="w-6 h-6 border-2 border-t-[#FF6B2B] border-white/10 rounded-full animate-spin" />
  </div>
);



import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import {
  RotateCcw, MessageSquare,
  Calculator, Paintbrush, CalendarClock, Menu, X,
  Home, FolderOpen, Camera, Zap, FileText, BookOpen,
  Lightbulb, Settings, LogOut, User, Plus, Bell, HardHat, Package, WalletCards,
  BarChart3, Radio
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { streamChat } from "@/lib/streamChat";
import { useMemoryExtractor } from "@/hooks/useMemoryExtractor";
import { MemorySuggestionBanner } from "@/components/memory/MemorySuggestionBanner";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import Footer from "@/components/Footer";
import CommandPalette from "@/components/CommandPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { isNativeApp } from "@/lib/nativeGuards";
import { usePrimaryProjectRole } from "@/hooks/usePrimaryProjectRole";
import { getMobileTabsForRole, getAllowedDrawerIdsForRole } from "@/lib/mobileTabs";
import { getCompanyProfile } from "@/lib/companyProfile";

// Sprint 18.4: localized role labels (extend as roles land)
const ROLE_LABELS: Record<string, string> = {
  admin: "Yönetici",
  owner: "Sahip",
  site_chief: "Şantiye Şefi",
  site_engineer: "Şantiye Mühendisi",
  accountant: "Muhasebe",
  purchasing: "Satın Alma",
  personnel: "Personel",
  manager: "Yönetici",
  member: "Üye",
  viewer: "İzleyici",
  worker: "Personel",
  landowner: "Arsa Sahibi",
  subcontractor: "Taşeron",
};


type Tab = "chat" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects" | "hakedis" | "settings" | "site-diary" | "payments-kasa" | "contracts" | "materials" | "e-invoices" | "personnel" | "meetings" | "communication" | "reports" | "procurement" | "warehouse" | "fleet" | "company-memory" | "company-kb" | "ai-decisions" | "decision-history" | "company-docs";

// Sprint 15.2 Production Polish — Company Brain sekmeleri sadeleşen menüden
// kaldırıldı. Eski derin linkler geldiğinde kullanıcıyı sessizce Dashboard'a
// yönlendiriyoruz; hiçbir 404 gösterilmiyor.
// NOT: Sidebar'da görünen ve gerçek bir sayfa bileşeni olan sekmeler (Toplantılar,
// İletişim Merkezi, Sözleşmeler) buraya EKLENMEZ — aksi halde tıklama sessizce
// Dashboard'a düşer.
const DEPRECATED_TABS = new Set<Tab>([
  "company-memory", "company-kb", "ai-decisions", "decision-history", "company-docs",
  "reminders", "daily", "render",
]);
const coerceTab = (t: Tab): Tab => (DEPRECATED_TABS.has(t) ? "dashboard" : t);

// Visible tab chips (tablet) + shared tab metadata
const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Ana Sayfa", shortLabel: "Ana", icon: Home },
  { id: "projects", label: "Projeler", shortLabel: "Proje", icon: FolderOpen },
  { id: "hakedis", label: "Hakediş", shortLabel: "Hakediş", icon: FileText },
  { id: "chat", label: "AI Asistan", shortLabel: "AI", icon: MessageSquare },
  { id: "payments-kasa", label: "Ödemeler & Kasa", shortLabel: "Kasa", icon: FileText },
  { id: "site-diary", label: "Şantiye Günlüğü", shortLabel: "Günlük", icon: BookOpen },
];

const NAVIGABLE_TABS: Tab[] = [
  "dashboard",
  "chat",
  "reminders",
  "pricing",
  "daily",
  "projects",
  "hakedis",
  "settings",
  "site-diary",
  "payments-kasa",
  "contracts",
  "materials",
  "e-invoices",
  "personnel",
  "meetings",
  "communication",
  "reports",
  "procurement",
  "warehouse",
  "fleet",
  "company-memory",
  "company-kb",
  "ai-decisions",
  "decision-history",
  "company-docs",
];

const COMPANY_BRAIN_TABS = new Set<Tab>([
  "company-memory", "company-kb", "ai-decisions", "decision-history", "company-docs",
]);
const TAB_TO_BRAIN_SECTION: Record<string, "memory" | "knowledge-base" | "ai-decisions" | "decision-history" | "documents"> = {
  "company-memory": "memory",
  "company-kb": "knowledge-base",
  "ai-decisions": "ai-decisions",
  "decision-history": "decision-history",
  "company-docs": "documents",
};
const BRAIN_SECTION_TO_TAB: Record<string, Tab> = {
  "memory": "company-memory",
  "knowledge-base": "company-kb",
  "ai-decisions": "ai-decisions",
  "decision-history": "decision-history",
  "documents": "company-docs",
};

// Mobile drawer menu — grouped navigation (SPRINT 40)
type DrawerItem = { id: Tab | string; label: string; icon: React.ElementType };

const DRAWER_GROUPS: { title: string; items: DrawerItem[] }[] = [
  {
    title: "ANA",
    items: [
      { id: "dashboard", label: "Ana Sayfa", icon: Home },
      { id: "chat", label: "AI Asistan", icon: MessageSquare },
    ],
  },
  {
    title: "OPERASYON",
    items: [
      { id: "projects", label: "Projeler", icon: FolderOpen },
      { id: "site-diary", label: "Şantiye Günlüğü", icon: BookOpen },
      { id: "personnel", label: "Personel & Puantaj", icon: HardHat },
      { id: "materials", label: "Malzeme Takibi", icon: Package },
    ],
  },
  {
    title: "FİNANS",
    items: [
      { id: "hakedis", label: "Hakediş", icon: FileText },
      { id: "payments-kasa", label: "Ödemeler & Kasa", icon: WalletCards },
      { id: "contracts", label: "Sözleşmeler", icon: FileText },
      { id: "e-invoices", label: "E-Fatura / E-Arşiv", icon: FileText },
    ],
  },
  {
    title: "İLETİŞİM",
    items: [
      { id: "communication", label: "İletişim Merkezi", icon: Radio },
      { id: "meetings", label: "Toplantı Merkezi", icon: MessageSquare },
    ],
  },
  {
    title: "ANALİZ",
    items: [
      { id: "reports", label: "Raporlar", icon: BarChart3 },
      { id: "settings", label: "Ayarlar", icon: Settings },
    ],
  },
];

const DRAWER_ITEMS: DrawerItem[] = DRAWER_GROUPS.flatMap((g) => g.items);


const TAB_TITLES: Record<string, string> = {
  dashboard: "Ana Sayfa",
  chat: "AI Asistan",
  daily: "Günlük Bilgi",
  
  render: "Proje Analizi",
  reminders: "Hatırlatıcı",
  pricing: "Planlar",
  projects: "Proje Yönetimi",
  hakedis: "Hakediş Yönetimi",
  "site-diary": "Şantiye Günlüğü",
  contracts: "Sözleşme Takibi",
  "payments-kasa": "Ödemeler & Kasa",
  materials: "Malzeme Takibi",
  "e-invoices": "E-Fatura / E-Arşiv",
  personnel: "Puantaj & Personel",
  meetings: "Toplantı Merkezi",
  communication: "İletişim Merkezi",
  procurement: "Satın Alma",
  warehouse: "Depo & Envanter",
  fleet: "Makine & Ekipman",
  settings: "Ayarlar",
  "company-memory": "🧠 Company Memory",
  "company-kb": "🧠 Knowledge Base",
  "ai-decisions": "🧠 AI Decisions",
  "decision-history": "🧠 Decision History",
  "company-docs": "🧠 Documents",
  
  hakkimizda: "Hakkımızda",
};

const ACTIVE_TAB_KEY = "santiyem_active_tab";

const TAB_TO_PATH: Record<string, string> = {
  dashboard: "/dashboard",
  projects: "/projeler",
  hakedis: "/hakedis",
  "site-diary": "/gunluk",
  chat: "/ai-asistan",
  "payments-kasa": "/odemeler-kasa",
  contracts: "/sozlesmeler",
  materials: "/malzemeler",
  "e-invoices": "/e-fatura",
  personnel: "/personel",
  procurement: "/satin-alma",
  warehouse: "/depo",
  fleet: "/makine-ekipman",
  reminders: "/hatirlatici",
  pricing: "/planlar",
  daily: "/gunluk-bilgi",
  settings: "/settings",
  reports: "/raporlar",
  meetings: "/toplantilar",
  "company-memory": "/company-brain/memory",
  "company-kb": "/company-brain/knowledge-base",
  "ai-decisions": "/company-brain/ai-decisions",
  "decision-history": "/company-brain/decision-history",
  "company-docs": "/company-brain/documents",
  "communication": "/iletisim-merkezi",
};

const PATH_TO_TAB: Record<string, Tab> = Object.entries(TAB_TO_PATH).reduce(
  (acc, [tab, path]) => {
    acc[path] = tab as Tab;
    return acc;
  },
  {} as Record<string, Tab>
);

const getInitialTab = (): Tab => {
  if (typeof window === "undefined") return "dashboard";
  const pathTab = PATH_TO_TAB[window.location.pathname];
  if (pathTab) return pathTab;
  try {
    const stored = localStorage.getItem(ACTIVE_TAB_KEY);
    if (stored && NAVIGABLE_TABS.includes(stored as Tab)) {
      return stored as Tab;
    }
  } catch (e) {
    console.warn("Failed to read active tab from localStorage", e);
  }
  return "dashboard";
};

const Index = () => {
  const { user, profile, plan, role, signOut, incrementUsage, canUse, isAdmin } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(() => coerceTab(getInitialTab()));
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { role: primaryRole } = usePrimaryProjectRole();
  const allowedDrawerIds = getAllowedDrawerIdsForRole(primaryRole);
  const visibleDrawerGroups = DRAWER_GROUPS.map((g) => ({
    title: g.title,
    items: allowedDrawerIds ? g.items.filter((it) => allowedDrawerIds.has(String(it.id))) : g.items,
  })).filter((g) => g.items.length > 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const [isLg, setIsLg] = useState(isDesktop);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const { projects, loading: projectsLoading } = useProjects();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isRead, hasValidDestination, bulkRunning } = useNotifications();
  const guard = useAccessGuard();
  useAccessSnapshotSync();

  // Persist active tab
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    } catch (e) {
      console.warn("Failed to save active tab to localStorage", e);
    }
  }, [activeTab]);

  // Sync URL → active tab
  useEffect(() => {
    const pathTab = PATH_TO_TAB[location.pathname];
    if (pathTab && pathTab !== activeTab) {
      setActiveTab(pathTab);
    }
  }, [location.pathname]);

  // First-run wizard: empty workspace + not completed.
  // Super Admins are exempted per Sprint 28.6 (no onboarding, no setup banners).
  useEffect(() => {
    if (!user || projectsLoading) return;
    if (isAdmin) return;
    if (!isFirstRunDone() && projects.length === 0) {
      setShowFirstRun(true);
      return;
    }
    // Legacy time-based fallback for users already past first-run
    if (user?.created_at && shouldShowOnboarding(user.created_at) && isFirstRunDone()) {
      setShowOnboarding(true);
    } else if (user && shouldShowThemeModal()) {
      setShowThemeModal(true);
    }
  }, [user, isAdmin, projects.length, projectsLoading]);

  // Initialize push notifications (native only, respects user preference)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("notification_preferences")
          .select("push_enabled")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.push_enabled !== false) {
          const { initPushNotifications } = await import("@/lib/pushNotifications");
          await initPushNotifications(user.id);
        }
      } catch (e) {
        console.warn("[push] init skipped", e);
      }
    })();
  }, [user?.id]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    // After onboarding, show theme modal if not yet shown
    if (shouldShowThemeModal()) {
      setTimeout(() => setShowThemeModal(true), 300);
    }
  };

  const handleFirstRunClose = () => {
    setShowFirstRun(false);
    if (shouldShowThemeModal()) {
      setTimeout(() => setShowThemeModal(true), 300);
    }
  };

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsLg(mql.matches);
    mql.addEventListener("change", handler);
    setIsLg(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Listen for navigate-tab custom events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (NAVIGABLE_TABS.includes(tab as Tab)) {
        const path = TAB_TO_PATH[tab as Tab];
        if (path) navigate(path);
        else setActiveTab(tab as Tab);
      }
    };
    window.addEventListener("navigate-tab", handler);
    return () => window.removeEventListener("navigate-tab", handler);
  }, [navigate]);


  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  // Only auto-scroll to the bottom while the Chat tab is active AND there are
  // messages to follow. Previously this ran on every mount and jumped the
  // shared scroll container (which also wraps the Dashboard) to its bottom,
  // making the Dashboard open at the footer on load.
  useEffect(() => {
    if (activeTab !== "chat") return;
    if (messages.length === 0 && !isTyping) return;
    scrollToBottom();
  }, [activeTab, messages, isTyping, scrollToBottom]);

  // SPRINT 36 — every page opens from the top. Chat is the only exception
  // (it follows the conversation tail via scrollToBottom above).
  useEffect(() => {
    if (activeTab === "chat") return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "auto" });
    // Also reset the window in case a module renders its own document flow.
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);


  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const memoryExtractor = useMemoryExtractor();

  const handleSend = async (text: string, attachments?: Attachment[]) => {
    // Check photo analysis limit if attachments present
    if (attachments && attachments.length > 0 && !canUse("photoAnalysis")) {
      toast.error("Günlük fotoğraf analizi limitine ulaştınız. Planınızı yükseltin.");
      return;
    }
    if (attachments && attachments.length > 0) {
      incrementUsage("photoAnalysis");
    }

    // Sprint 28.6 — AI access awareness. If the user asks to open a module
    // that is currently locked, respond immediately with a locked-state
    // reply instead of round-tripping the model.
    const lowered = text.toLowerCase();
    const openMatchers: { pat: RegExp; tab: any; name: string }[] = [
      { pat: /(depo|envanter)/, tab: "warehouse", name: "Depo" },
      { pat: /(satın\s*alma|satin\s*alma|procurement)/, tab: "procurement", name: "Satın Alma" },
      { pat: /(makine|ekipman|filo|fleet)/, tab: "fleet", name: "Makine & Ekipman" },
      { pat: /(fatura|e-\s*fatura)/, tab: "e-invoices", name: "E-Fatura" },
      { pat: /(kasa|ödeme|odeme|nakit)/, tab: "payments-kasa", name: "Ödemeler & Kasa" },
      { pat: /(hakediş|hakedis)/, tab: "hakedis", name: "Hakediş" },
      { pat: /(rapor)/, tab: "reports", name: "Raporlar" },
    ];
    if (/(aç|ac|göster|goster|open)/i.test(lowered)) {
      const m = openMatchers.find(o => o.pat.test(lowered));
      if (m) {
        const d = guard.check(m.tab);
        if (!d.ok) {
          const why = d.reason === "setup-required"
            ? "Önce şirket kurulumunuzu tamamlayın."
            : "Mevcut planınızda bu modüle erişim yok. Planı yükseltmeniz gerekiyor.";
          const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, attachments };
          const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: `${m.name} modülü mevcut planınızda aktif değil. ${why}` };
          setMessages(prev => [...prev, userMsg, aiMsg]);
          return;
        }
      }
    }
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, attachments };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let assistantContent = "";
    const assistantId = (Date.now() + 1).toString();

    const chatMessages = [...messages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      attachments: m.attachments?.map((a) => ({ base64: a.base64, type: a.type })),
    }));

    try {
      await streamChat({
        messages: chatMessages,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.id === assistantId) {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantContent } : m
              );
            }
            return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
          });
        },
        onDone: () => {
          setIsTyping(false);
          window.dispatchEvent(new CustomEvent("executive-brief-refresh"));
          if (assistantContent) memoryExtractor.extractFromTurn(text, assistantContent);
        },
        onError: (error) => {
          setIsTyping(false);
          toast.error(error);
        },
      });
    } catch (e) {
      setIsTyping(false);
      toast.error("Bağlantı hatası oluştu.");
      console.error(e);
    }
  };

  // After first-run completion, auto-ask the AI to summarize what it knows
  useEffect(() => {
    if (!user || showFirstRun || isTyping) return;
    if (!shouldShowWelcomeBrief()) return;
    clearWelcomeBrief();
    const prompt = "Kurulumum yeni tamamlandı. Lütfen kısaca özetle: (1) şu ana kadar şirketim, projelerim, personelim, tedarikçilerim ve belgelerim hakkında ne biliyorsun, (2) verimli çalışmam için hâlâ neler eksik, (3) sonraki 3 önerilen adım nedir?";
    setTimeout(() => {
      goToTab("chat");
      setTimeout(() => handleSend(prompt), 400);
    }, 300);
  }, [user, showFirstRun, isTyping]);

  const handleReset = () => {
    setMessages([]);
    setIsTyping(false);
  };

  const goToTab = useCallback((rawTab: Tab) => {
    const tab = coerceTab(rawTab);
    const path = TAB_TO_PATH[tab];
    if (path && location.pathname !== path) {
      navigate(path);
    } else {
      setActiveTab(tab);
    }
  }, [navigate, location.pathname]);

  const handleDrawerNav = (id: string) => {
    if (NAVIGABLE_TABS.includes(id as Tab)) {
      goToTab(id as Tab);
    }
    setDrawerOpen(false);
  };

  const handleDesktopTabChange = (tab: Tab) => {
    goToTab(tab);
  };

  // Desktop layout
  if (isLg) {
    return (
      <div className="flex h-dvh bg-background">
        <CommandPalette />
        <FirstRunWizard open={showFirstRun} onClose={handleFirstRunClose} />
        <OnboardingModal open={showOnboarding} onClose={handleOnboardingClose} />
        <ThemeSelectionModal open={showThemeModal} onClose={() => setShowThemeModal(false)} />
        <DesktopSidebar activeTab={activeTab} onTabChange={handleDesktopTabChange} />

        <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
          {/* Top bar - not for chat (it has its own header) */}
          {activeTab !== "chat" && (
            <DesktopTopBar
              title={TAB_TITLES[activeTab] || "Ana Sayfa"}
              onTabChange={(t) => handleDesktopTabChange(t as Tab)}
              onProjectSelect={(id) => { setSelectedProjectId(id); handleDesktopTabChange("projects"); }}
            />
          )}

          {/* Content */}
          {activeTab === "chat" ? (
            <div className="flex-1 min-h-0 overflow-hidden bg-background">
              <DesktopChatLayout scrollRef={scrollRef} />
            </div>
          ) : (
            <div ref={scrollRef} data-app-scroll className="flex-1 min-h-0 overflow-y-auto smooth-scroll bg-background">
              <div className="flex min-h-full flex-col">
                <div className="flex-1 pb-12">
                <Suspense fallback={<TabFallback />}>
                {(() => {
                  // Sprint 28.6 — Centralized access guard. Any tab in
                  // SETUP_REQUIRED / PREMIUM_TABS routes through LockedPage
                  // instead of its real component when locked. Admin bypass
                  // and always-allowed tabs (dashboard/settings/pricing/chat/
                  // reminders/daily/render) short-circuit inside the guard.
                  const decision = guard.check(activeTab as any);
                  if (!decision.ok && decision.reason !== "loading" && decision.reason !== "ok") {
                    return (
                      <LockedPage
                        reason={decision.reason as any}
                        moduleName={decision.label}
                        setupPercent={guard.setupPercent}
                      />
                    );
                  }
                  if (activeTab === "dashboard") return <DesktopDashboard onTabChange={(t) => handleDesktopTabChange(t as Tab)} onSend={(text) => { handleDesktopTabChange("chat"); setTimeout(() => handleSend(text), 100); }} onProjectSelect={(id) => { setSelectedProjectId(id); handleDesktopTabChange("projects"); }} />;
                  if (activeTab === "projects") return <DesktopProjectsPage initialProjectId={selectedProjectId} onProjectIdClear={() => setSelectedProjectId(null)} />;
                  if (activeTab === "hakedis") return <DesktopHakedisPage />;
                  if (activeTab === "contracts") return <DesktopContractsPage />;
                  if (activeTab === "site-diary") return <SiteDiaryPage />;
                  if (activeTab === "payments-kasa") return <PaymentsKasaPage />;
                  if (activeTab === "materials") return <MaterialsPage />;
                  if (activeTab === "e-invoices") return <EInvoicesPage />;
                  if (activeTab === "personnel") return <PersonnelPage />;
                  if (activeTab === "meetings") return <MeetingCenterPage />;
                  if (activeTab === "communication") return <CommunicationCenterPage />;
                  if (activeTab === "procurement") return <ProcurementPage />;
                  if (activeTab === "warehouse") return <WarehousePage />;
                  if (activeTab === "fleet") return <FleetPage />;
                  if (activeTab === "reports") return <ReportsPage />;
                  if (COMPANY_BRAIN_TABS.has(activeTab)) return (
                    <ComingSoonScreen
                      title="Company Brain"
                      description="Şirket Belleği ve AI Karar Geçmişi modülleri yeniden tasarlanıyor. Bu sürede AI Copilot üzerinden aynı bilgilere erişebilirsiniz."
                    />
                  );
                  if (activeTab === "settings") return <DesktopSettingsPage />;
                  if (activeTab === "pricing") return <div className="bg-background"><PricingPanel /></div>;
                  if (activeTab === "daily") return <DailyKnowledgePanel />;
                  if (activeTab === "render") return <RenderPanel />;
                  return <RemindersPanel />;
                })()}
                </Suspense>
                </div>

              </div>
              {!Capacitor.isNativePlatform() && <Footer minimal />}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Bottom tab bar — role-aware on native (mobile RBAC)
  const BOTTOM_TABS = getMobileTabsForRole(primaryRole);
  const PRIMARY_TAB_IDS = new Set(
    BOTTOM_TABS.filter((t) => t.id !== "more").map((t) => t.id as string),
  );

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background md:[padding-bottom:env(safe-area-inset-bottom,0px)]">
      <FirstRunWizard open={showFirstRun} onClose={handleFirstRunClose} />
      {/* ── MOBILE HEADER ── */}
      <header
        className="lg:hidden sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md shrink-0"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          minHeight: "calc(4rem + env(safe-area-inset-top, 0px))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="h-16 flex items-center justify-between">
        <div className="flex items-center gap-[15px]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menüyü aç"
            className="w-11 h-11 -ml-1 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <BrandHomeLink
            className="min-w-[44px] min-h-[44px] justify-center"
            onNavigate={() => { setDrawerOpen(false); goToTab("dashboard"); }}
          >
            <SantiyemMark px={34} />
          </BrandHomeLink>


        </div>
        <div className="flex items-center gap-1">
          {/* Mobile notification bell */}
          <div className="relative">
            <button
              onClick={() => setMobileNotifOpen(!mobileNotifOpen)}
              aria-label={unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : "Bildirimler"}
              aria-expanded={mobileNotifOpen}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5" style={{ backgroundColor: "#EF4444" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </button>
            {mobileNotifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileNotifOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-[300px] rounded-xl shadow-2xl max-h-[60vh] flex flex-col" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", paddingBottom: "env(safe-area-inset-bottom)" }}>
                  <div className="px-3 py-2 flex items-center justify-between gap-2 shrink-0" style={{ borderBottom: "1px solid #1E2732" }}>
                    <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>Bildirimler</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => void markAllAsRead()}
                        disabled={bulkRunning}
                        aria-label="Tüm bildirimleri okundu yap"
                        className="text-[11px] font-medium min-h-[44px] px-2 rounded-lg disabled:opacity-50"
                        style={{ color: "#FF6B2B" }}
                      >
                        Tümünü okundu yap
                      </button>
                    )}
                  </div>
                  <span className="sr-only" role="status" aria-live="polite">
                    {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Okunmamış bildirim yok"}
                  </span>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-[12px]" style={{ color: "#64748B" }}>Henüz bildiriminiz yok</p>
                      </div>
                    ) : (
                      notifications.map((n, i) => {
                        const read = isRead(n.id);
                        return (
                          <button
                            key={n.id}
                            aria-label={`${read ? "Okunmuş bildirim" : "Okunmamış bildirim"}: ${n.title}. ${n.message}`}
                            onClick={() => {
                              void markAsRead([n.id]);
                              if (!hasValidDestination(n)) {
                                toast.info("İlgili kayıt artık mevcut değil.");
                                return;
                              }
                              if (n.targetTab === "projects" && n.targetProjectId) {
                                setSelectedProjectId(n.targetProjectId);
                              }
                              setActiveTab(n.targetTab as Tab);
                              setMobileNotifOpen(false);
                            }}
                            className="w-full text-left px-3 py-3 flex items-start gap-2 transition-colors"
                            style={{
                              minHeight: 56,
                              borderBottom: i < notifications.length - 1 ? "1px solid #1E2732" : undefined,
                              backgroundColor: read ? "transparent" : "rgba(255,107,43,0.06)",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] truncate" style={{ color: read ? "#CBD5E1" : "#F1F5F9", fontWeight: read ? 400 : 600 }}>{n.title}</p>
                              <p className="text-[11.5px] mt-0.5" style={{ color: "#94A3B8" }}>{n.message}</p>
                            </div>
                            <span
                              aria-hidden
                              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                              style={{ backgroundColor: read ? "transparent" : "#FF6B2B" }}
                            />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
          {activeTab === "chat" && messages.length > 0 && (
            <button
              onClick={handleReset}
              aria-label="Sohbeti sıfırla"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
        </div>
      </header>


      {/* ── TABLET TAB BAR ── */}
      <div className="hidden md:block lg:hidden border-b border-border bg-card/80 backdrop-blur-sm shrink-0 overflow-x-auto">
        <div className="flex items-center px-4 py-1 gap-1" style={{ minWidth: "max-content" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => goToTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      <div
        className={`lg:hidden fixed inset-0 z-[100] bg-black/50 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      {/* ── MOBILE DRAWER PANEL ── */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-[101] w-[86%] max-w-[360px] flex flex-col transform transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#0F1419", paddingTop: "env(safe-area-inset-top, 0px)", boxShadow: drawerOpen ? "8px 0 40px -12px rgba(0,0,0,0.6)" : "none" }}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-2 right-2 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-muted/60 transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label="Menüyü kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile card — single source of role identity (max 116px tall) */}
        {(() => {
          const displayName = profile?.full_name || user?.user_metadata?.full_name || (user ? "Kullanıcı" : "Misafir");
          const title = profile?.title || "İnşaat Mühendisi";
          let companyShort = "";
          try { companyShort = getCompanyProfile().companyName.split(" ").slice(0, 2).join(" "); } catch {}
          const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          const roleLabel = ROLE_LABELS[String(role || "").toLowerCase()] || (isAdmin ? "Yönetici" : "");
          return (
            <div className="px-4 pt-5 pb-4" style={{ maxHeight: 116 }}>
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E]" style={{ width: 42, height: 42 }}>
                  {user ? (
                    <span className="text-white font-bold text-[13px]">{initials}</span>
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-10">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-[14px] truncate">{displayName}</p>
                    {roleLabel && (
                      <span
                        className="text-[9px] font-medium px-1.5 py-[1px] rounded shrink-0"
                        style={{ backgroundColor: "rgba(255,107,43,0.12)", color: "#FFB088" }}
                      >
                        {roleLabel}
                      </span>
                    )}
                  </div>
                  {user && (
                    <p className="text-[11px] text-white/50 truncate mt-0.5">
                      {title}{companyShort ? ` • ${companyShort}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mx-4 h-px bg-white/[0.06]" />

        <nav
          className="flex-1 min-h-0 px-3 py-3"
          style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
        >
          {visibleDrawerGroups.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              <p className="px-3 mb-1 text-[10px] font-semibold tracking-[0.12em] text-white/35">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleDrawerNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 rounded-lg transition-all duration-200 active:scale-[0.98] ${
                        isActive
                          ? "bg-[#FF6B2B]/12 text-[#FF6B2B]"
                          : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      style={{ minHeight: "44px" }}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                      <span className={`text-[14px] ${isActive ? "font-semibold" : "font-normal"}`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>


        <div className="mx-4 h-px bg-white/[0.06]" />

        <div className="px-3 pt-3 shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
          {user ? (
            <button
              onClick={() => { signOut(); setDrawerOpen(false); }}
              className="w-full flex items-center gap-3 px-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              style={{ minHeight: "48px" }}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Çıkış Yap</span>
            </button>
          ) : (
            <button
              onClick={() => { navigate("/login"); setDrawerOpen(false); }}
              className="w-full flex items-center gap-3 px-3 rounded-xl text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-colors"
              style={{ minHeight: "48px" }}
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Giriş Yap</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div ref={scrollRef} data-app-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain smooth-scroll">
        <div className="flex min-h-full flex-col">
          <div className="flex-1 pb-8 md:pb-10">
          <Suspense fallback={<TabFallback />}>

          {activeTab === "dashboard" ? (
            <DesktopDashboard onTabChange={(t) => setActiveTab(t as Tab)} onSend={(text) => { setActiveTab("chat"); setTimeout(() => handleSend(text), 100); }} onProjectSelect={(id) => { setSelectedProjectId(id); setActiveTab("projects"); }} />
          ) : activeTab === "chat" ? (
            messages.length === 0 ? (
              <AIHome onSend={handleSend} />
            ) : (
              <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-3 sm:space-y-4">
                {messages.map((msg, i) => {
                  const isLastAssistant =
                    msg.role === "assistant" && i === messages.length - 1 && !isTyping;
                  return (
                    <div key={msg.id}>
                      <ChatMessage message={msg} />
                      {isLastAssistant && msg.content && (
                        <AIResponseActions content={msg.content} />
                      )}
                    </div>
                  );
                })}
                {isTyping && <AIThinkingStages />}
              </div>
            )
          ) : activeTab === "projects" ? (
            <DesktopProjectsPage initialProjectId={selectedProjectId} onProjectIdClear={() => setSelectedProjectId(null)} />
          ) : activeTab === "hakedis" ? (
            <DesktopHakedisPage />
          ) : activeTab === "contracts" ? (
            <DesktopContractsPage />
          ) : activeTab === "payments-kasa" ? (
            <PaymentsKasaPage />
          ) : activeTab === "site-diary" ? (
            <SiteDiaryPage />
          ) : activeTab === "materials" ? (
            <MaterialsPage />
          ) : activeTab === "e-invoices" ? (
            <EInvoicesPage />
          ) : activeTab === "personnel" ? (
            <PersonnelPage />
          ) : activeTab === "warehouse" ? (
            <WarehousePage />
          ) : activeTab === "procurement" ? (
            <ProcurementPage />
          ) : activeTab === "fleet" ? (
            <FleetPage />
          ) : activeTab === "reports" ? (
            <ReportsPage />
          ) : activeTab === "meetings" ? (
            <MeetingCenterPage />
          ) : activeTab === "communication" ? (
            <CommunicationCenterPage />
          ) : activeTab === "settings" ? (
            <DesktopSettingsPage />
          ) : activeTab === "render" ? (
            <RenderPanel />
          ) : activeTab === "pricing" ? (
            <PricingPanel />
          ) : activeTab === "daily" ? (
            <DailyKnowledgePanel />
          ) : (
            <RemindersPanel />
          )}
          </Suspense>
        </div>
        </div>

        {activeTab !== "chat" && !Capacitor.isNativePlatform() && (
          <div className="hidden md:block">
            <Footer minimal />
          </div>
        )}
      </div>

      {activeTab === "chat" && (
        <>
          {memoryExtractor.proposals.length > 0 && (
            <div className="px-4 pt-3">
              <MemorySuggestionBanner
                proposals={memoryExtractor.proposals}
                busy={memoryExtractor.busy}
                onRemember={memoryExtractor.remember}
                onDismiss={memoryExtractor.dismiss}
                onNeverAgain={memoryExtractor.neverAgain}
              />
            </div>
          )}
          <QuotaWarningBanner onUpgrade={() => goToTab("pricing")} />
          <UsageLimitBanner type="aiQuestions" />
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </>
      )}

      {/* ── MOBILE BOTTOM TAB BAR (Sprint 41 — compact, 4 items) ── */}
      <nav
        className="md:hidden shrink-0 border-t border-border/70 bg-card/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Alt navigasyon"
      >
        <div className="flex items-stretch">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  goToTab(tab.id as Tab);
                }}
                className="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-200 active:opacity-70"
                style={{
                  height: 60,
                  color: isActive ? "#FF6B2B" : "#8A94A6",
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
              >
                <Icon style={{ width: 23, height: 23 }} strokeWidth={isActive ? 2.3 : 1.9} />
                <span className="text-[11px] leading-none" style={{ fontWeight: isActive ? 600 : 500 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
};

export default Index;
