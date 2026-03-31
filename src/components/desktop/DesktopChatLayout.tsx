import { useState, useEffect } from "react";
import { Plus, Search, Trash2, MessageSquare } from "lucide-react";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput, { Attachment } from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import WelcomeScreen from "@/components/WelcomeScreen";
import UsageLimitBanner from "@/components/UsageLimitBanner";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { useUser } from "@/contexts/UserContext";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";

interface DesktopChatLayoutProps {
  // Keep backward compat but use internal state when logged in
  messages?: Message[];
  isTyping?: boolean;
  onSend?: (text: string, attachments?: Attachment[]) => void;
  onReset?: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const DesktopChatLayout = ({ scrollRef, ...fallbackProps }: DesktopChatLayoutProps) => {
  const { user, incrementUsage, canUse } = useUser();
  const conv = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localTyping, setLocalTyping] = useState(false);

  // Use persistent data when logged in, fallback props when not
  const messages = user ? conv.messages : (fallbackProps.messages || localMessages);
  const isTyping = user ? localTyping : (fallbackProps.isTyping || false);

  const setMessages = user ? conv.setMessages : setLocalMessages;

  const handleSend = async (text: string, attachments?: Attachment[]) => {
    if (!user && fallbackProps.onSend) {
      fallbackProps.onSend(text, attachments);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, attachments };
    setMessages((prev: Message[]) => [...prev, userMsg]);
    setLocalTyping(true);

    // Create conversation if needed
    let convId = conv.activeConversationId;
    if (!convId && user) {
      convId = await conv.createConversation(text);
    }

    // Save user message
    if (convId && user) {
      await conv.saveMessage(convId, "user", text, attachments);
    }

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
          setMessages((prev: Message[]) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.id === assistantId) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
            }
            return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
          });
        },
        onDone: async () => {
          setLocalTyping(false);
          if (convId && user && assistantContent) {
            await conv.saveMessage(convId, "assistant", assistantContent);
          }
        },
        onError: (error) => {
          setLocalTyping(false);
          toast.error(error);
        },
      });
    } catch {
      setLocalTyping(false);
      toast.error("Bağlantı hatası oluştu.");
    }
  };

  const handleReset = () => {
    if (!user && fallbackProps.onReset) {
      fallbackProps.onReset();
      return;
    }
    conv.newChat();
    setLocalTyping(false);
  };

  const handleSelectConversation = (c: Conversation) => {
    conv.loadMessages(c.id);
  };

  // Filter conversations
  const filteredConversations = conv.conversations.filter(c =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by date
  const groupedChats = filteredConversations.reduce((acc, chat) => {
    const d = new Date(chat.updated_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let group = "Daha Eski";
    if (diffDays === 0) group = "Bugün";
    else if (diffDays === 1) group = "Dün";
    else if (diffDays <= 7) group = "Bu Hafta";
    if (!acc[group]) acc[group] = [];
    acc[group].push(chat);
    return acc;
  }, {} as Record<string, Conversation[]>);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left - Chat history */}
      <div className="w-[240px] shrink-0 flex flex-col" style={{ backgroundColor: "#0F1419", borderRight: "1px solid #1E2732" }}>
        <div className="p-3">
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white transition-colors duration-150"
            style={{ height: 36, backgroundColor: "#FF6B2B" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#E55A1F"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#FF6B2B"; }}
          >
            <Plus className="w-4 h-4" /> Yeni Sohbet
          </button>
        </div>
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg px-2.5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", height: 32 }}>
            <Search className="w-3.5 h-3.5" style={{ color: "#475569" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sohbet ara..."
              className="flex-1 bg-transparent text-[12px] outline-none"
              style={{ color: "#F1F5F9" }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {user ? (
            Object.keys(groupedChats).length === 0 ? (
              <p className="text-center text-[11px] py-8" style={{ color: "#475569" }}>Henüz sohbet yok</p>
            ) : (
              Object.entries(groupedChats).map(([group, chats]) => (
                <div key={group} className="mb-3">
                  <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#334155" }}>{group}</p>
                  {chats.map((chat) => {
                    const isActive = conv.activeConversationId === chat.id;
                    return (
                      <div key={chat.id} className="relative group">
                        <button
                          onClick={() => handleSelectConversation(chat)}
                          className="w-full text-left px-2.5 py-2 rounded-lg transition-colors duration-150 pr-8"
                          style={{
                            backgroundColor: isActive ? "#161C23" : "transparent",
                            borderLeft: isActive ? "2px solid #FF6B2B" : "2px solid transparent",
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#161C23"; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <p className="text-[13px] truncate" style={{ color: isActive ? "#F1F5F9" : "#94A3B8" }}>{chat.title}</p>
                          <p className="text-[11px]" style={{ color: "#64748B" }}>
                            {new Date(chat.updated_at).toLocaleDateString("tr-TR")}
                          </p>
                        </button>
                        <button
                          onClick={() => conv.deleteConversation(chat.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                          style={{ color: "#64748B" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )
          ) : (
            <p className="text-center text-[11px] py-8" style={{ color: "#475569" }}>
              Sohbet geçmişi için giriş yapın
            </p>
          )}
        </div>
      </div>

      {/* Middle - Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ backgroundColor: "#0F1419" }}>
        <div className="flex items-center justify-between px-5 shrink-0" style={{ height: 48, borderBottom: "1px solid #1E2732" }}>
          <span className="text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>
            {messages.length > 0 ? "Sohbet" : "Yeni Sohbet"}
          </span>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                style={{ color: "#64748B" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; e.currentTarget.style.backgroundColor = "#161C23"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex min-h-full items-center justify-center">
              <WelcomeScreen onSuggestionClick={handleSend} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-6 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          )}
        </div>

        <UsageLimitBanner type="aiQuestions" />
        <div className="shrink-0" style={{ borderTop: "1px solid #1E2732", backgroundColor: "#161C23" }}>
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </div>
      </div>

      {/* Right - Context panel */}
      <div className="w-[280px] shrink-0 flex flex-col p-4 space-y-4" style={{ backgroundColor: "#0F1419", borderLeft: "1px solid #1E2732" }}>
        <h3 className="text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Bu Sohbette</h3>
        <div>
          <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#334155" }}>Konular</p>
          <div className="flex flex-wrap gap-1.5">
            {["Deprem Yükü", "TBDY 2018", "Betonarme", "Yapısal Analiz"].map((tag) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#334155" }}>İlgili Mevzuat</p>
          <div className="space-y-1.5">
            {["TBDY 2018 Madde 7.3", "TS 500", "Deprem Yönetmeliği"].map((link) => (
              <button key={link} className="block text-[12px] transition-colors" style={{ color: "#64748B" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#FF6B2B"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
              >
                📖 {link}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#334155" }}>Kısayollar</p>
          <div className="space-y-1.5">
            {["Deprem yükü hesapla", "Kolon boyutlandırma", "Donatı hesabı"].map((shortcut) => (
              <button key={shortcut} className="block text-[12px] transition-colors" style={{ color: "#64748B" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#FF6B2B"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
              >
                ⚡ {shortcut}
              </button>
            ))}
          </div>
        </div>
        <button
          className="w-full flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium mt-auto transition-colors duration-150"
          style={{ height: 32, border: "1px solid #1E2732", color: "#64748B" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; e.currentTarget.style.color = "#FF6B2B"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E2732"; e.currentTarget.style.color = "#64748B"; }}
        >
          📄 Sohbeti PDF Kaydet
        </button>
      </div>
    </div>
  );
};

export default DesktopChatLayout;
