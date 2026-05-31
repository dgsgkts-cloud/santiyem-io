import { useState, useRef, useEffect, useCallback } from "react";
import OnboardingModal, { shouldShowOnboarding, markOnboardingDone } from "@/components/desktop/OnboardingModal";
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
import DesktopSidebar from "@/components/desktop/DesktopSidebar";
import DesktopTopBar from "@/components/desktop/DesktopTopBar";
import DesktopDashboard from "@/components/desktop/DesktopDashboard";
import DesktopChatLayout from "@/components/desktop/DesktopChatLayout";
import DesktopProjectsPage from "@/components/desktop/DesktopProjectsPage";
import DesktopHakedisPage from "@/components/desktop/DesktopHakedisPage";
import SiteDiaryPage from "@/components/desktop/SiteDiaryPage";

import DesktopContractsPage from "@/components/desktop/DesktopContractsPage";
import PaymentsKasaPage from "@/components/desktop/PaymentsKasaPage";
import MaterialsPage from "@/components/desktop/MaterialsPage";
import EInvoicesPage from "@/components/desktop/EInvoicesPage";
import DesktopSettingsPage from "@/components/desktop/DesktopSettingsPage";

import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/muhendis-logo.png";
import {
  RotateCcw, MessageSquare,
  Calculator, Paintbrush, CalendarClock, Menu, X,
  Home, FolderOpen, Camera, Zap, FileText, BookOpen,
  Lightbulb, Settings, LogOut, User, Plus, Bell
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import Footer from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { isNativeApp } from "@/lib/nativeGuards";


type Tab = "chat" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects" | "hakedis" | "settings" | "site-diary" | "payments-kasa" | "contracts" | "materials" | "e-invoices";

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
  "dashboard",
  "projects",
  "hakedis",
  "settings",
  "site-diary",
  "payments-kasa",
  "contracts",
  "materials",
  "e-invoices",
];

// Mobile drawer menu items
const DRAWER_ITEMS: { id: Tab | string; label: string; emoji: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", emoji: "🏠", icon: Home },
  { id: "chat", label: "AI Asistan", emoji: "💬", icon: MessageSquare },
  { id: "projects", label: "Proje Yönetimi", emoji: "📁", icon: FolderOpen },
  { id: "hakedis", label: "Hakediş Yönetimi", emoji: "🧾", icon: FileText },
  { id: "contracts", label: "Sözleşme Takibi", emoji: "📑", icon: FileText },
  { id: "payments-kasa", label: "Ödemeler & Kasa", emoji: "💰", icon: FileText },
  { id: "site-diary", label: "Şantiye Günlüğü", emoji: "📔", icon: FileText },
  { id: "materials", label: "Malzeme Takibi", emoji: "📦", icon: FileText },
  { id: "e-invoices", label: "E-Fatura / E-Arşiv", emoji: "🧾", icon: FileText },
  { id: "daily", label: "Günlük Bilgi", emoji: "💡", icon: Lightbulb },
  
  
  { id: "reminders", label: "Hatırlatıcı", emoji: "📋", icon: CalendarClock },
  ...(isNativeApp() ? [] : [{ id: "pricing", label: "Planlar", emoji: "💎", icon: Zap } as const]),
  { id: "settings", label: "Ayarlar", emoji: "⚙️", icon: Settings },
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
  settings: "Ayarlar",
  
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
  reminders: "/hatirlatici",
  pricing: "/planlar",
  daily: "/gunluk-bilgi",
  settings: "/settings",
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
  const { user, plan, signOut, incrementUsage, canUse, isAdmin } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const [isLg, setIsLg] = useState(isDesktop);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
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

  // Show onboarding for new users
  useEffect(() => {
    if (user?.created_at && shouldShowOnboarding(user.created_at)) {
      setShowOnboarding(true);
    } else if (user && shouldShowThemeModal()) {
      setShowThemeModal(true);
    }
  }, [user]);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

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
        onDone: () => setIsTyping(false),
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

  const handleReset = () => {
    setMessages([]);
    setIsTyping(false);
  };

  const goToTab = useCallback((tab: Tab) => {
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
                </div>
              </div>
              {!Capacitor.isNativePlatform() && <Footer />}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Bottom tab bar items (mobile only)
  const BOTTOM_TABS: { id: Tab | "more"; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Ana Sayfa", icon: Home },
    { id: "projects", label: "Projeler", icon: FolderOpen },
    { id: "hakedis", label: "Hakediş", icon: FileText },
    { id: "site-diary", label: "Günlük", icon: BookOpen },
    { id: "more", label: "Daha Fazla", icon: Menu },
  ];
  const PRIMARY_TAB_IDS = new Set(["dashboard", "projects", "hakedis", "site-diary"]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background md:[padding-bottom:env(safe-area-inset-bottom,0px)]">
      {/* ── MOBILE HEADER ── */}
      <header
        className="lg:hidden sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => goToTab("dashboard")}>
          <img src={logo} alt="Şantiyem" className="w-7 h-7" />
          <h1 className="text-sm font-bold text-foreground">Şantiyem</h1>
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
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[100] bg-black/50 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER PANEL ── */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-[101] w-[80%] max-w-[320px] transform transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#0F1419", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-3 right-3 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          style={{ minWidth: 44, minHeight: 44, marginTop: "env(safe-area-inset-top, 0px)" }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAdmin ? "bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA]" : "bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E]"}`}>
                <User className="w-6 h-6 text-white" />
              </div>
              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#8B5CF6", border: "2px solid #0F1419" }}>
                  <Zap className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-sm">{user ? (user.user_metadata?.full_name || "Kullanıcı") : "Misafir"}</p>
                {isAdmin && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: "rgba(139,92,246,0.25)", color: "#A78BFA" }}>ADMIN</span>}
              </div>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isAdmin ? "bg-[#8B5CF6]/20 text-[#A78BFA]" :
                plan === "pro" || plan === "plus" ? "bg-[#FF6B2B]/20 text-[#FF6B2B]" :
                plan === "office_free" || plan === "office_pro" || plan === "office_custom" ? "bg-blue-500/20 text-blue-400" :
                "bg-white/10 text-white/50"
              }`}>
                {isAdmin ? "Tam Erişim ⚡" : plan === "pro" ? "Pro Plan" : plan === "plus" ? "Plus Plan" : plan === "office_pro" ? "Kurumsal Pro" : plan === "office_free" ? "Kurumsal Ücretsiz" : plan === "office_custom" ? "Özel Kurumsal" : "Ücretsiz"}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-5 h-px bg-white/10" />

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {DRAWER_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleDrawerNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-[#FF6B2B]/15 text-[#FF6B2B]"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
                style={{ minHeight: "48px" }}
              >
                <span className="text-lg w-6 text-center">{item.emoji}</span>
                <span className={`text-sm ${isActive ? "font-semibold" : "font-normal"}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mx-5 h-px bg-white/10" />

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
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <div className="flex-1 pb-8 md:pb-10">
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
        </div>
        </div>
        {activeTab !== "chat" && !Capacitor.isNativePlatform() && <Footer />}
      </div>

      {activeTab === "chat" && (
        <>
          <UsageLimitBanner type="aiQuestions" />
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav
        className="md:hidden shrink-0 border-t border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Alt navigasyon"
      >
        <div className="flex items-stretch">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.id === "more"
                ? drawerOpen || !PRIMARY_TAB_IDS.has(activeTab as string)
                : activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "more") {
                    setDrawerOpen(true);
                  } else {
                    setDrawerOpen(false);
                    goToTab(tab.id as Tab);
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
                style={{
                  minHeight: 56,
                  color: isActive ? "#FF6B2B" : "#94A3B8",
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[11px] leading-tight" style={{ fontWeight: isActive ? 600 : 500 }}>
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
