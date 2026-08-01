import { SendHorizonal, Paperclip, X, FileText, Mic, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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

type MicState = "idle" | "listening" | "processing";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: unknown) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const getRecognitionCtor = (): (new () => SpeechRecognitionLike) | null => {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const isMobile = useIsMobile();
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [micState, setMicState] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const longPressRef = useRef<number | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string") {
        setValue(text);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("chat-prefill", handler);
    return () => window.removeEventListener("chat-prefill", handler);
  }, []);

  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* noop */ } }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    setError(null);
    onSend(trimmed || "Bu dosyayı analiz et.", attachments.length > 0 ? attachments : undefined);
    setValue("");
    setAttachments([]);
  };

  const openVoiceMode = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-voice-copilot", { detail: { autoSpeak: false } }));
  }, []);

  const stopDictation = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
    setMicState("idle");
  }, []);

  const startDictation = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      openVoiceMode();
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "tr-TR";
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e: unknown) => {
        const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
        let text = "";
        for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
        setValue(text);
      };
      rec.onerror = () => {
        setError("Sesi algılayamadım, tekrar deneyin.");
        stopDictation();
      };
      rec.onend = () => {
        setMicState("processing");
        window.setTimeout(() => {
          setMicState("idle");
          textareaRef.current?.focus();
        }, 350);
        recognitionRef.current = null;
      };
      recognitionRef.current = rec;
      setError(null);
      setMicState("listening");
      rec.start();
    } catch {
      setError("Mikrofon başlatılamadı.");
      setMicState("idle");
    }
  }, [openVoiceMode, stopDictation]);

  const toggleMic = () => {
    if (disabled || micState === "processing") return;
    if (micState === "listening") stopDictation();
    else startDictation();
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

  const canSend = !disabled && (!!value.trim() || attachments.length > 0);

  return (
    <div
      className="border-t border-border bg-card/95 backdrop-blur-sm px-3 pt-2.5 md:px-4 md:pt-3"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group flex items-center gap-2 bg-secondary rounded-control-sm px-3 py-1.5">
                {att.preview ? (
                  <img src={att.preview} alt={att.name} className="w-8 h-8 object-cover rounded" />
                ) : (
                  <FileText className="w-4 h-4 text-primary" />
                )}
                <span className="text-xs text-foreground max-w-[120px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  aria-label={`${att.name} dosyasını kaldır`}
                  className="p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="mb-1.5 px-1 text-[11.5px] text-destructive" role="alert">{error}</p>
        )}

        {/* [attachment] [text] [mic] [send] */}
        <div className="flex items-end gap-1.5 rounded-[17px] border border-input bg-background px-1.5 py-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-11 w-11 shrink-0 rounded-[12px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            aria-label="Dosya ekle"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
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
            placeholder="Şantiyem AI'ya sorun…"
            rows={1}
            disabled={disabled}
            className="flex-1 min-w-0 resize-none bg-transparent border-0 px-1 py-3 text-base md:text-sm leading-5 placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={toggleMic}
            onPointerDown={() => {
              longPressRef.current = window.setTimeout(() => {
                longPressRef.current = null;
                openVoiceMode();
              }, 600);
            }}
            onPointerUp={() => {
              if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
            }}
            onPointerLeave={() => {
              if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
            }}
            disabled={disabled || micState === "processing"}
            aria-pressed={micState === "listening"}
            aria-label={
              micState === "listening"
                ? "Dinlemeyi durdur"
                : micState === "processing"
                  ? "Ses işleniyor"
                  : "Sesle sor"
            }
            className={`h-11 w-11 shrink-0 rounded-[12px] flex items-center justify-center transition-colors disabled:opacity-50 ${
              micState === "listening"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {micState === "processing" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="relative flex items-center justify-center">
                {micState === "listening" && (
                  <span className="absolute inset-[-6px] rounded-full bg-primary/25 animate-ping" />
                )}
                <Mic className="w-5 h-5 relative" />
              </span>
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label="Gönder"
            className={`h-11 w-11 shrink-0 rounded-[12px] flex items-center justify-center transition-all ${
              canSend
                ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                : "bg-secondary text-muted-foreground/60"
            }`}
          >
            {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizonal className="w-5 h-5" />}
          </button>
        </div>

        {!isMobile && (
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Şantiyem AI proje verilerinizi analiz ederek yanıt üretir.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
