import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import OnboardingModal, { shouldShowOnboarding, markOnboardingDone } from "@/components/desktop/OnboardingModal";
import FirstRunWizard, { isFirstRunDone, shouldShowWelcomeBrief, clearWelcomeBrief } from "@/components/desktop/FirstRunWizard";
import { useProjects } from "@/hooks/useProjects";
import ThemeSelectionModal, { shouldShowThemeModal, markThemeModalDone } from "@/components/desktop/ThemeSelectionModal";
import WelcomeScreen from "@/components/WelcomeScreen";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput, { Attachment } from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";

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


type Tab = "chat" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects" | "hakedis" | "settings" | "site-diary" | "payments-kasa" | "contracts" | "materials" | "e-invoices" | "personnel" | "meetings" | "communication" | "reports" | "procurement" | "warehouse" | "company-memory" | "company-kb" | "ai-decisions" | "decision-history" | "company-docs";

// Sprint 15.2 Production Polish — Company Brain sekmeleri sadeleşen menüden
// kaldırıldı. Eski derin linkler geldiğinde kullanıcıyı sessizce Dashboard'a
// yönlendiriyoruz; hiçbir 404 gösterilmiyor.
const DEPRECATED_TABS = new Set<Tab>([
  "company-memory", "company-kb", "ai-decisions", "decision-history", "company-docs",
  "meetings", "communication", "contracts", "reminders", "daily", "render",
]);
const coerceTab = (t: Tab): Tab => (DEPRECATED_TABS.has(t) ? "dashboard" : t);

// Visible tab chips (tablet) + shared tab metadata
const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Ana", icon: Home },
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

// Mobile drawer menu items
const DRAWER_ITEMS: { id: Tab | string; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "chat", label: "AI Asistan", icon: MessageSquare },
  { id: "projects", label: "Proje Yönetimi", icon: FolderOpen },
  { id: "hakedis", label: "Hakediş Yönetimi", icon: FileText },
  { id: "contracts", label: "Sözleşmeler", icon: FileText },
  { id: "payments-kasa", label: "Ödemeler & Kasa", icon: WalletCards },
  { id: "site-diary", label: "Şantiye Günlüğü", icon: BookOpen },
  { id: "materials", label: "Malzeme Takibi", icon: Package },
  { id: "personnel", label: "Personel & Puantaj", icon: HardHat },
  { id: "meetings", label: "Toplantı Merkezi", icon: MessageSquare },
  { id: "e-invoices", label: "E-Fatura / E-Arşiv", icon: FileText },
  { id: "communication", label: "İletişim Merkezi", icon: Radio },
  { id: "reports", label: "Raporlar", icon: BarChart3 },
  { id: "settings", label: "Ayarlar", icon: Settings },
];

const TAB_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
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
  reminders: "/hatirlatici",
  pricing: "/planlar",
  daily: "/gunluk-bilgi",
  settings: "/settings",
  "company-memory": "/company-brain/memory",
  "company-kb": "/company-brain/knowledge-base",
  "ai-decisions": "/company-brain/ai-decisions",
  "decision-history": "/company-brain/decision-history",
  "company-docs": "/company-brain/documents",
  "communication": "/iletisim",
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
  const visibleDrawerItems = allowedDrawerIds
    ? DRAWER_ITEMS.filter((it) => allowedDrawerIds.has(String(it.id)))
    : DRAWER_ITEMS;
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const [isLg, setIsLg] = useState(isDesktop);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const { projects, loading: projectsLoading } = useProjects();
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissedIds } = useNotifications();

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

  // First-run wizard: empty workspace + not completed
  useEffect(() => {
    if (!user || projectsLoading) return;
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
  }, [user, projects.length, projectsLoading]);

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
      <div className="flex h-screen bg-background">
        <CommandPalette />
        <FirstRunWizard open={showFirstRun} onClose={handleFirstRunClose} />
        <OnboardingModal open={showOnboarding} onClose={handleOnboardingClose} />
        <ThemeSelectionModal open={showThemeModal} onClose={() => setShowThemeModal(false)} />
        <DesktopSidebar activeTab={activeTab} onTabChange={handleDesktopTabChange} />

        <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
          {/* Top bar - not for chat (it has its own header) */}
          {activeTab !== "chat" && (
            <DesktopTopBar
              title={TAB_TITLES[activeTab] || "Dashboard"}
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
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-background">
              <div className="flex min-h-full flex-col">
                <div className="flex-1 pb-12">
                <Suspense fallback={<TabFallback />}>
                {activeTab === "dashboard" ? (
                  <DesktopDashboard onTabChange={(t) => handleDesktopTabChange(t as Tab)} onSend={(text) => { handleDesktopTabChange("chat"); setTimeout(() => handleSend(text), 100); }} onProjectSelect={(id) => { setSelectedProjectId(id); handleDesktopTabChange("projects"); }} />
                ) : activeTab === "projects" ? (
                  <DesktopProjectsPage initialProjectId={selectedProjectId} onProjectIdClear={() => setSelectedProjectId(null)} />
                ) : activeTab === "hakedis" ? (
                  <DesktopHakedisPage />
                ) : activeTab === "contracts" ? (
                  <DesktopContractsPage />
                ) : activeTab === "site-diary" ? (
                  <SiteDiaryPage />
                ) : activeTab === "payments-kasa" ? (
                  <PaymentsKasaPage />
                ) : activeTab === "materials" ? (
                  <MaterialsPage />
                ) : activeTab === "e-invoices" ? (
                  <EInvoicesPage />
                ) : activeTab === "personnel" ? (
                  <PersonnelPage />
                ) : activeTab === "meetings" ? (
                  <MeetingCenterPage />
                ) : activeTab === "communication" ? (
                  <CommunicationCenterPage />
                ) : activeTab === "procurement" ? (
                  <ProcurementPage />
                ) : activeTab === "reports" ? (
                  <ComingSoonScreen
                    title="Raporlar"
                    description="Kar-zarar, nakit akışı ve karar geçmişi raporları hazırlanıyor. Yakında burada olacak."
                  />
                ) : COMPANY_BRAIN_TABS.has(activeTab) ? (
                  <ComingSoonScreen
                    title="Company Brain"
                    description="Şirket Belleği ve AI Karar Geçmişi modülleri yeniden tasarlanıyor. Bu sürede AI Copilot üzerinden aynı bilgilere erişebilirsiniz."
                  />
                ) : activeTab === "settings" ? (
                  <DesktopSettingsPage />
                ) : activeTab === "pricing" ? (
                  <div className="bg-background"><PricingPanel /></div>
                ) : activeTab === "daily" ? (
                  <DailyKnowledgePanel />
                ) : activeTab === "render" ? (
                  <RenderPanel />
                ) : (
                  <RemindersPanel />
                )}
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
        className="lg:hidden sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menüyü aç"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer pl-0.5" onClick={() => goToTab("dashboard")}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <HardHat className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-sm font-bold text-foreground">Şantiyem</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Mobile notification bell */}
          <div className="relative">
            <button
              onClick={() => setMobileNotifOpen(!mobileNotifOpen)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
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
                <div className="absolute right-0 top-11 z-50 w-[280px] rounded-xl shadow-2xl max-h-[350px] flex flex-col" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
                  <div className="p-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid #1E2732" }}>
                    <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>Bildirimler</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[11px] font-medium" style={{ color: "#FF6B2B" }}>Tümünü Oku</button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-[12px]" style={{ color: "#64748B" }}>Bildirim yok</p>
                      </div>
                    ) : (
                      notifications.map((n, i) => {
                        const isRead = dismissedIds.includes(n.id);
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              markAsRead([n.id]);
                              if (n.targetTab === "projects" && n.targetProjectId) {
                                setSelectedProjectId(n.targetProjectId);
                              }
                              setActiveTab(n.targetTab as Tab);
                              setMobileNotifOpen(false);
                            }}
                            className="w-full text-left px-3 py-3 transition-colors"
                            style={{
                              borderBottom: i < notifications.length - 1 ? "1px solid #1E2732" : undefined,
                              backgroundColor: isRead ? "transparent" : "rgba(255,107,43,0.04)",
                            }}
                          >
                            <p className="text-[12px] font-medium truncate" style={{ color: isRead ? "#94A3B8" : "#F1F5F9" }}>{n.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: isRead ? "#475569" : "#94A3B8" }}>{n.message}</p>
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
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-[101] w-[82%] max-w-[320px] flex flex-col transform transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#0F1419", paddingTop: "env(safe-area-inset-top, 0px)", boxShadow: drawerOpen ? "8px 0 40px -12px rgba(0,0,0,0.6)" : "none" }}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-3 right-3 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          style={{ minWidth: 44, minHeight: 44, marginTop: "env(safe-area-inset-top, 0px)" }}
          aria-label="Menüyü kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile card — single source of role identity */}
        {(() => {
          const displayName = profile?.full_name || user?.user_metadata?.full_name || (user ? "Kullanıcı" : "Misafir");
          const title = profile?.title || "İnşaat Mühendisi";
          let companyShort = "";
          try { companyShort = getCompanyProfile().companyName.split(" ").slice(0, 2).join(" "); } catch {}
          const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          const roleLabel = ROLE_LABELS[String(role || "").toLowerCase()] || (isAdmin ? "Yönetici" : "");
          return (
            <div className="px-5 pt-8 pb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E]" style={{ width: 42, height: 42 }}>
                  {user ? (
                    <span className="text-white font-bold text-[13px]">{initials}</span>
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
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

        <div className="mx-5 h-px bg-white/[0.06]" />

        <nav
          className="flex-1 min-h-0 px-3 py-4 space-y-0.5"
          style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
        >
          {visibleDrawerItems.map((item) => {
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
                <span className={`text-[13.5px] ${isActive ? "font-semibold" : "font-normal"}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mx-5 h-px bg-white/[0.06]" />

        <div className="px-3 py-4">
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
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col">
          <div className="flex-1 pb-8 md:pb-10">
          <Suspense fallback={<TabFallback />}>

          {activeTab === "dashboard" ? (
            <DesktopDashboard onTabChange={(t) => setActiveTab(t as Tab)} onSend={(text) => { setActiveTab("chat"); setTimeout(() => handleSend(text), 100); }} onProjectSelect={(id) => { setSelectedProjectId(id); setActiveTab("projects"); }} />
          ) : activeTab === "chat" ? (
            messages.length === 0 ? (
              <WelcomeScreen onSuggestionClick={handleSend} />
            ) : (
              <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-3 sm:space-y-4">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {isTyping && <TypingIndicator />}
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

        {activeTab !== "chat" && !Capacitor.isNativePlatform() && <Footer minimal />}
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

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav
        className="md:hidden shrink-0 border-t border-border bg-card/95 backdrop-blur-md shadow-lg"
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
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200 active:scale-[0.94]"
                style={{
                  minHeight: 56,
                  color: isActive ? "#FF6B2B" : "#94A3B8",
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
              >
                <Icon className="w-5 h-5 transition-transform duration-200" strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[11px] leading-tight transition-all" style={{ fontWeight: isActive ? 600 : 500 }}>
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
