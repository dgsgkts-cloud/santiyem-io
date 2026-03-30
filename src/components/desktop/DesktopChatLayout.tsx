import { useState } from "react";
import { Plus, Search, Trash2, X, MessageSquare } from "lucide-react";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput, { Attachment } from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import WelcomeScreen from "@/components/WelcomeScreen";
import UsageLimitBanner from "@/components/UsageLimitBanner";

interface DesktopChatLayoutProps {
  messages: Message[];
  isTyping: boolean;
  onSend: (text: string, attachments?: Attachment[]) => void;
  onReset: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const MOCK_CHATS = [
  { id: "1", title: "Deprem yükü hesabı", date: "Bugün", active: true },
  { id: "2", title: "TAKS/KAKS hesaplama", date: "Bugün" },
  { id: "3", title: "TS 825 yalıtım kalınlığı", date: "Dün" },
  { id: "4", title: "Hakediş hesaplama soruları", date: "Dün" },
  { id: "5", title: "İmar planı sorgulama", date: "Bu Hafta" },
];

const DesktopChatLayout = ({ messages, isTyping, onSend, onReset, scrollRef }: DesktopChatLayoutProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const groupedChats = MOCK_CHATS.reduce((acc, chat) => {
    if (!acc[chat.date]) acc[chat.date] = [];
    acc[chat.date].push(chat);
    return acc;
  }, {} as Record<string, typeof MOCK_CHATS>);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left - Chat history */}
      <div className="w-[240px] shrink-0 flex flex-col" style={{ backgroundColor: "#0F1419", borderRight: "1px solid #1E2732" }}>
        <div className="p-3">
          <button
            onClick={onReset}
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
          {Object.entries(groupedChats).map(([group, chats]) => (
            <div key={group} className="mb-3">
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#334155" }}>{group}</p>
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  className="w-full text-left px-2.5 py-2 rounded-lg transition-colors duration-150 relative"
                  style={{
                    backgroundColor: chat.active ? "#161C23" : "transparent",
                    borderLeft: chat.active ? "2px solid #FF6B2B" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!chat.active) e.currentTarget.style.backgroundColor = "#161C23"; }}
                  onMouseLeave={(e) => { if (!chat.active) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <p className="text-[13px] truncate" style={{ color: chat.active ? "#F1F5F9" : "#94A3B8" }}>{chat.title}</p>
                  <p className="text-[11px]" style={{ color: "#64748B" }}>{chat.date}</p>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Middle - Chat area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: "#0F1419" }}>
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 shrink-0" style={{ height: 48, borderBottom: "1px solid #1E2732" }}>
          <span className="text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>
            {messages.length > 0 ? "Sohbet" : "Yeni Sohbet"}
          </span>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={onReset}
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

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={onSend} />
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-6 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Input */}
        <UsageLimitBanner type="aiQuestions" />
        <div style={{ borderTop: "1px solid #1E2732", backgroundColor: "#161C23" }}>
          <ChatInput onSend={onSend} disabled={isTyping} />
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
