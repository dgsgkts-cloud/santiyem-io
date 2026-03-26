import { SendHorizonal } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="border-t border-border bg-card/60 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Sorunuzu yazın... (Shift+Enter ile yeni satır)"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="h-11 w-11 rounded-xl chat-gradient flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
        >
          <SendHorizonal className="w-5 h-5" />
        </button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground mt-2">
        ⚠️ Genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız.
      </p>
    </div>
  );
};

export default ChatInput;
