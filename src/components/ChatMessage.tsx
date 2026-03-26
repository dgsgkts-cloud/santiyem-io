import { HardHat, User, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Attachment } from "./ChatInput";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
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
        className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "message-user" : "message-ai"
        }`}
      >
        {/* Show attachments for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att, idx) => (
              <div key={idx}>
                {att.preview ? (
                  <img src={att.preview} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
                ) : (
                  <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-xs">{att.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              h1: ({ children }) => <h2 className="text-base font-bold mb-1 mt-2">{children}</h2>,
              h2: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
              h3: ({ children }) => <h4 className="text-sm font-semibold mb-1 mt-1">{children}</h4>,
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={`block bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto my-2 ${className}`} {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full text-xs border-collapse border border-border">{children}</table>
                </div>
              ),
              th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted/30 font-semibold text-left">{children}</th>,
              td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
