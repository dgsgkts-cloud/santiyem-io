import { SendHorizonal, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export interface Attachment {
  base64: string;
  name: string;
  type: "image" | "pdf";
  preview?: string;
}

interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed || "Bu dosyayı analiz et.", attachments.length > 0 ? attachments : undefined);
    setValue("");
    setAttachments([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) return;
      const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
      if (!allowed.includes(file.type)) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const fileType = file.type.includes("pdf") ? "pdf" : "image";
        const preview = fileType === "image" ? (reader.result as string) : undefined;
        setAttachments((prev) => [...prev, { base64, name: file.name, type: fileType, preview }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="border-t border-border bg-card/60 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
                {att.preview ? (
                  <img src={att.preview} alt={att.name} className="w-8 h-8 object-cover rounded" />
                ) : (
                  <FileText className="w-4 h-4 text-primary" />
                )}
                <span className="text-xs text-foreground max-w-[120px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-11 w-11 rounded-xl border border-input bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 shrink-0"
            title="Dosya ekle (Fotoğraf, PDF)"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf,.dwg,.dxf"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
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
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            className="h-11 w-11 rounded-xl chat-gradient flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
          >
            <SendHorizonal className="w-5 h-5" />
          </button>
        </div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground mt-2">
        ⚠️ Genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız.
      </p>
    </div>
  );
};

export default ChatInput;
