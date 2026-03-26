import { HardHat, User } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? "chat-gradient" : "accent-gradient"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <HardHat className="w-4 h-4 text-accent-foreground" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "message-user" : "message-ai"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
};

export default ChatMessage;
