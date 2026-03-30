import { useState, useRef, useEffect, useCallback } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput, { Attachment } from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import WeatherPanel from "@/components/WeatherPanel";
import NewsPanel from "@/components/NewsPanel";
import EventsPanel from "@/components/EventsPanel";
import CalculatorsPanel from "@/components/CalculatorsPanel";
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
import DesktopSettingsPage from "@/components/desktop/DesktopSettingsPage";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/muhendis-logo.png";
import {
  RotateCcw, MessageSquare, CloudRain, Newspaper, Calendar,
  Calculator, Paintbrush, CalendarClock, Menu, X,
  Home, FolderOpen, Camera, Zap, FileText, BookOpen,
  Lightbulb, BarChart3, Settings, LogOut, User, Plus
} from "lucide-react";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";

type Tab = "chat" | "weather" | "news" | "events" | "calc" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects" | "hakedis" | "settings";

// Desktop tab bar items (kept for mobile)
const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Ana", icon: Home },
  { id: "chat", label: "Sohbet", shortLabel: "Sohbet", icon: MessageSquare },
  { id: "projects", label: "Projeler", shortLabel: "Proje", icon: FolderOpen },
  { id: "hakedis", label: "Hakediş", shortLabel: "Hakediş", icon: FileText },
  { id: "daily", label: "Günlük Bilgi", shortLabel: "Bilgi", icon: Lightbulb },
  { id: "weather", label: "Hava Durumu", shortLabel: "Hava", icon: CloudRain },
  { id: "news", label: "Haberler", shortLabel: "Haber", icon: Newspaper },
  { id: "events", label: "Etkinlikler", shortLabel: "Etkinlik", icon: Calendar },
  { id: "calc", label: "Hesap", shortLabel: "Hesap", icon: Calculator },
  { id: "render", label: "Render", shortLabel: "Render", icon: Paintbrush },
  { id: "reminders", label: "Hatırlatıcı", shortLabel: "Hatırlat", icon: CalendarClock },
  { id: "pricing", label: "Planlar", shortLabel: "Plan", icon: Zap },
  { id: "settings", label: "Ayarlar", shortLabel: "Ayar", icon: Settings },
];

// Mobile drawer menu items
const DRAWER_ITEMS: { id: Tab | string; label: string; emoji: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", emoji: "🏠", icon: Home },
  { id: "chat", label: "AI Asistan", emoji: "💬", icon: MessageSquare },
  { id: "projects", label: "Proje Yönetimi", emoji: "📁", icon: FolderOpen },
  { id: "hakedis", label: "Hakediş Yönetimi", emoji: "🧾", icon: FileText },
  { id: "daily", label: "Günlük Bilgi", emoji: "💡", icon: Lightbulb },
  { id: "calc", label: "Hesap Araçları", emoji: "🧮", icon: Calculator },
  { id: "render", label: "Render / Görselleştirme", emoji: "📸", icon: Camera },
  { id: "weather", label: "Hava Durumu", emoji: "🌤️", icon: CloudRain },
  { id: "news", label: "Haberler & Piyasa", emoji: "📊", icon: BarChart3 },
  { id: "events", label: "Etkinlikler", emoji: "📅", icon: Calendar },
  { id: "reminders", label: "Hatırlatıcı", emoji: "📋", icon: CalendarClock },
  { id: "pricing", label: "Planlar", emoji: "💎", icon: Zap },
  { id: "settings", label: "Ayarlar", emoji: "⚙️", icon: Settings },
];

const TAB_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  chat: "AI Asistan",
  daily: "Günlük Bilgi",
  weather: "Fotoğraf Analizi",
  news: "Belge Arşivi",
  events: "Hesap Araçları",
  calc: "EKB Hesaplama",
  render: "Proje Analizi",
  reminders: "Mevzuat Arama",
  pricing: "Planlar",
  projects: "Proje Yönetimi",
  hakedis: "Hakediş Yönetimi",
  settings: "Ayarlar",
  hakkimizda: "Hakkımızda",
};

const Index = () => {
  const { user, plan, signOut } = useUser();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const [isLg, setIsLg] = useState(isDesktop);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsLg(mql.matches);
    mql.addEventListener("change", handler);
    setIsLg(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Default tab is already dashboard

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

  const handleDrawerNav = (id: string) => {
    if (TABS.some(t => t.id === id)) {
      setActiveTab(id as Tab);
    }
    setDrawerOpen(false);
  };

  const handleDesktopTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Desktop layout
  if (isLg) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: "#0A0E13" }}>
        <DesktopSidebar activeTab={activeTab} onTabChange={handleDesktopTabChange} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar - not for chat (it has its own header) */}
          {activeTab !== "chat" && (
            <DesktopTopBar
              title={TAB_TITLES[activeTab] || "Dashboard"}
            />
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: "#0F1419" }}>
            <div className="flex-1 pb-12">
              {activeTab === "dashboard" ? (
                <DesktopDashboard onTabChange={(t) => handleDesktopTabChange(t as Tab)} onSend={(text) => { handleDesktopTabChange("chat"); setTimeout(() => handleSend(text), 100); }} onProjectSelect={(id) => { setSelectedProjectId(id); handleDesktopTabChange("projects"); }} />
              ) : activeTab === "chat" ? (
                <DesktopChatLayout scrollRef={scrollRef} />
              ) : activeTab === "projects" ? (
                <DesktopProjectsPage initialProjectId={selectedProjectId} onProjectIdClear={() => setSelectedProjectId(null)} />
              ) : activeTab === "hakedis" ? (
                <DesktopHakedisPage />
              ) : activeTab === "settings" ? (
                <DesktopSettingsPage />
              ) : activeTab === "pricing" ? (
                <div style={{ backgroundColor: "#0F1419" }}><PricingPanel /></div>
              ) : activeTab === "daily" ? (
                <DailyKnowledgePanel />
              ) : activeTab === "weather" ? (
                <WeatherPanel />
              ) : activeTab === "news" ? (
                <NewsPanel />
              ) : activeTab === "events" ? (
                <EventsPanel />
              ) : activeTab === "calc" ? (
                <CalculatorsPanel />
              ) : activeTab === "render" ? (
                <RenderPanel />
              ) : (
                <RemindersPanel />
              )}
            </div>
            {activeTab !== "chat" && <Footer />}
          </div>
        </div>
      </div>
    );
  }

  // Mobile/Tablet layout (unchanged)
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── MOBILE HEADER ── */}
      <header className="lg:hidden border-b border-border bg-card/60 backdrop-blur-sm px-3 py-2.5 flex items-center justify-between shrink-0">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          style={{ backgroundColor: "hsl(var(--accent))", color: "white" }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
          <img src={logo} alt="MühendisAI" className="w-7 h-7" />
          <h1 className="text-sm font-bold text-foreground">MühendisAI</h1>
        </div>
        <div className="w-10">
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
                onClick={() => setActiveTab(tab.id)}
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
        style={{ backgroundColor: "#0F1419" }}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{user ? (user.user_metadata?.full_name || "Kullanıcı") : "Misafir"}</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                plan === "pro" ? "bg-[#FF6B2B]/20 text-[#FF6B2B]" :
                plan === "office" ? "bg-blue-500/20 text-blue-400" :
                "bg-white/10 text-white/50"
              }`}>
                {plan === "pro" ? "Pro Plan" : plan === "office" ? "Ofis Plan" : "Ücretsiz"}
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col">
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
          ) : activeTab === "settings" ? (
            <DesktopSettingsPage />
          ) : activeTab === "weather" ? (
            <WeatherPanel />
          ) : activeTab === "news" ? (
            <NewsPanel />
          ) : activeTab === "events" ? (
            <EventsPanel />
          ) : activeTab === "calc" ? (
            <CalculatorsPanel />
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
        {activeTab !== "chat" && <Footer />}
      </div>

      {activeTab === "chat" && (
        <>
          <UsageLimitBanner type="aiQuestions" />
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </>
      )}
    </div>
  );
};

export default Index;
