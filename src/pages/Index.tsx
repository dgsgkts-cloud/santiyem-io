import { useState, useRef, useEffect, useCallback } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import WeatherPanel from "@/components/WeatherPanel";
import logo from "@/assets/muhendis-logo.png";
import { RotateCcw, MessageSquare, CloudRain } from "lucide-react";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "weather">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let assistantContent = "";
    const assistantId = (Date.now() + 1).toString();

    const chatMessages = [...messages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
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
      <header className="border-b border-border bg-card/60 backdrop-blur-sm px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="MühendisAI" width={36} height={36} />
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">MühendisAI</h1>
            <p className="text-[11px] text-muted-foreground">İnşaat & Mühendislik Asistanı</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Sohbet
            </button>
            <button
              onClick={() => setActiveTab("weather")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "weather"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              Hava Durumu
            </button>
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
      </header>

      {/* Content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {activeTab === "chat" ? (
          messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSend} />
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          )
        ) : (
          <WeatherPanel />
        )}
      </div>

      {/* Input - only show in chat tab */}
      {activeTab === "chat" && <ChatInput onSend={handleSend} disabled={isTyping} />}
    </div>
  );
};

export default Index;
