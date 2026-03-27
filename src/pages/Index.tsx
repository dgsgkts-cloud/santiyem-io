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
import logo from "@/assets/muhendis-logo.png";
import { RotateCcw, MessageSquare, CloudRain, Newspaper, Calendar, Calculator, Paintbrush, CalendarClock } from "lucide-react";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";

type Tab = "chat" | "weather" | "news" | "events" | "calc" | "render" | "reminders";

const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Sohbet", shortLabel: "Sohbet", icon: MessageSquare },
  { id: "weather", label: "Hava Durumu", shortLabel: "Hava", icon: CloudRain },
  { id: "news", label: "Haberler", shortLabel: "Haber", icon: Newspaper },
  { id: "events", label: "Etkinlikler", shortLabel: "Etkinlik", icon: Calendar },
  { id: "calc", label: "Hesap", shortLabel: "Hesap", icon: Calculator },
  { id: "render", label: "Render", shortLabel: "Render", icon: Paintbrush },
  { id: "reminders", label: "Hatırlatıcı", shortLabel: "Hatırlat", icon: CalendarClock },
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={logo} alt="MühendisAI" className="w-8 h-8 sm:w-9 sm:h-9" />
          <div>
            <h1 className="text-sm sm:text-base font-bold text-foreground leading-tight">MühendisAI</h1>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground hidden sm:block">İnşaat & Mühendislik Asistanı</p>
          </div>
        </div>

        {/* Desktop tab bar */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          {activeTab === "chat" && messages.length > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Yeni Sohbet
            </button>
          )}
        </div>

        {/* Mobile reset button */}
        <div className="flex md:hidden items-center gap-2">
          {activeTab === "chat" && messages.length > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Content area — add bottom padding on mobile for tab bar */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {activeTab === "chat" ? (
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

      {/* Chat input - only show in chat tab, with bottom margin on mobile */}
      {activeTab === "chat" && (
        <div className="mb-14 md:mb-0">
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg min-w-0 flex-1 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className={`text-[9px] leading-tight truncate ${isActive ? "font-semibold" : "font-normal"}`}>
                  {tab.shortLabel}
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
