import { useState, useEffect, useRef } from "react";
import { Plus, Search, Trash2, PanelLeftClose, PanelLeftOpen, Layers } from "lucide-react";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput, { Attachment } from "@/components/ChatInput";
import DesktopAIWorkspace from "@/components/ai/DesktopAIWorkspace";
import AIThinkingStages from "@/components/ai/AIThinkingStages";
import AIResponseActions from "@/components/ai/AIResponseActions";
import UsageLimitBanner from "@/components/UsageLimitBanner";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { useUser } from "@/contexts/UserContext";
import { useDocuments } from "@/hooks/useDocuments";
import { streamChat } from "@/lib/streamChat";
import { useMemoryExtractor } from "@/hooks/useMemoryExtractor";
import { MemorySuggestionBanner } from "@/components/memory/MemorySuggestionBanner";
import { AICanvas } from "@/components/canvas/AICanvas";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { canvasStore } from "@/hooks/useCanvasTurns";
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
  const { activeCount: docCount } = useDocuments();
  const [searchQuery, setSearchQuery] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localTyping, setLocalTyping] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const memoryExtractor = useMemoryExtractor();

  // Use persistent data when logged in, fallback props when not
  const messages = user ? conv.messages : (fallbackProps.messages || localMessages);
  const isTyping = user ? localTyping : (fallbackProps.isTyping || false);

  const setMessages = user ? conv.setMessages : setLocalMessages;

  const handleSend = async (text: string, attachments?: Attachment[]) => {
    if (!user && fallbackProps.onSend) {
      fallbackProps.onSend(text, attachments);
      return;
    }

    // Check photo analysis limit if attachments present
    if (attachments && attachments.length > 0 && !canUse("photoAnalysis")) {
      toast.error("Günlük fotoğraf analizi limitine ulaştınız. Planınızı yükseltin.");
      return;
    }
    if (attachments && attachments.length > 0) {
      incrementUsage("photoAnalysis");
    }

    // Canvas: kick off status + remember recent question
    canvasStore.beginTurn(text, "chat");
    canvasStore.setStatus("searching", "chat");
    try {
      const raw = localStorage.getItem("canvas_recent_questions");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [text, ...arr.filter((q) => q !== text)].slice(0, 8);
      localStorage.setItem("canvas_recent_questions", JSON.stringify(next));
    } catch { /* noop */ }

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
          if (canvasStore.snapshot.status !== "speaking") canvasStore.setStatus("speaking", "chat");
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
          if (!assistantContent) {
            canvasStore.setStatus("error", "chat");
            console.warn("[AI] Stream ended with empty content");
            toast.error("AI şu an yanıt veremiyor, lütfen tekrar dene");
            return;
          }
          canvasStore.pushTurn({ question: text, raw: assistantContent, source: "chat" });
          if (convId && user) {
            await conv.saveMessage(convId, "assistant", assistantContent);
          }
          // Best-effort background memory extraction — never blocks UX
          if (user) {
            memoryExtractor.extractFromTurn(text, assistantContent);
          }
        },
        onError: (error) => {
          setLocalTyping(false);
          canvasStore.setStatus("error", "chat");
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

  // Listen for canvas follow-up clicks anywhere in the tree.
  const sendRef = useRef(handleSend);
  useEffect(() => { sendRef.current = handleSend; });
  useEffect(() => {
    const onFollowup = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string }>).detail;
      if (detail?.text) sendRef.current(detail.text);
    };
    window.addEventListener("canvas-followup", onFollowup as EventListener);
    return () => window.removeEventListener("canvas-followup", onFollowup as EventListener);
  }, []);

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
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await conv.deleteConversation(deleteTarget.id);
        }}
        title="Sohbeti Sil"
        itemName={deleteTarget?.title}
      />
      {/* Left - Chat history */}
      <div className="w-[240px] shrink-0 flex flex-col border-r border-border">
        <div className="p-3">
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white hover-primary-btn"
            style={{ height: 36 }}
          >
            <Plus className="w-4 h-4" /> Yeni Sohbet
          </button>
        </div>
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg px-2.5" style={{ height: 32 }}>
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sohbet ara..."
              className="flex-1 bg-transparent text-[12px] outline-none text-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {user ? (
            Object.keys(groupedChats).length === 0 ? (
              <p className="text-center text-[11px] py-8 text-muted-foreground">Henüz sohbet yok</p>
            ) : (
              Object.entries(groupedChats).map(([group, chats]) => (
                <div key={group} className="mb-3">
                  <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                  {chats.map((chat) => {
                    const isActive = conv.activeConversationId === chat.id;
                    return (
                      <div key={chat.id} className="relative group">
                        <button
                          onClick={() => handleSelectConversation(chat)}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover-row pr-8"
                          style={{
                            backgroundColor: isActive ? "hsl(var(--muted))" : "transparent",
                            borderLeft: isActive ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                          }}
                        >
                          <p className="text-[13px] truncate" style={{ color: isActive ? "#F1F5F9" : "#94A3B8" }}>{chat.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(chat.updated_at).toLocaleDateString("tr-TR")}
                          </p>
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: chat.id, title: chat.title })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-muted-foreground"
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
            <p className="text-center text-[11px] py-8 text-muted-foreground">
              Sohbet geçmişi için giriş yapın
            </p>
          )}
        </div>
      </div>

      {/* Middle - Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <div className="flex items-center justify-between px-5 shrink-0" style={{ height: 48, borderBottom: "1px solid #1E2732" }}>
          <span className="text-[14px] font-semibold text-foreground">
            {messages.length > 0 ? "Sohbet" : "Yeni Sohbet"}
          </span>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover-icon-btn"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Document info banner */}
        {user && docCount > 0 && (
          <div className="px-5 py-2 flex items-center gap-2 shrink-0" style={{ backgroundColor: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
            <BookOpen className="w-3.5 h-3.5" style={{ color: "#60A5FA" }} />
            <span className="text-[12px]" style={{ color: "#93C5FD" }}>
              📚 {docCount} mevzuat belgesi aktif — AI bu belgelerden yararlanarak cevap veriyor
            </span>
          </div>
        )}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          {messages.length === 0 ? (
            <AIHome
              onSend={handleSend}
              recentTopics={conv.conversations.slice(0, 3).map((c) => c.title)}
            />
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-6 space-y-4">
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
          )}
        </div>

        {memoryExtractor.proposals.length > 0 && (
          <div className="px-5 pt-3 shrink-0">
            <MemorySuggestionBanner
              proposals={memoryExtractor.proposals}
              busy={memoryExtractor.busy}
              onRemember={memoryExtractor.remember}
              onDismiss={memoryExtractor.dismiss}
              onNeverAgain={memoryExtractor.neverAgain}
            />
          </div>
        )}
        <UsageLimitBanner type="aiQuestions" />
        <div className="shrink-0 border-t border-border">
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </div>
      </div>

      {/* Right - AI Canvas (primary visual output) */}
      <div className="w-[380px] [@media(min-width:1600px)]:w-[420px] shrink-0 flex flex-col border-l border-border overflow-hidden bg-background">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AICanvas />
        </div>
      </div>
    </div>
  );
};

export default DesktopChatLayout;
