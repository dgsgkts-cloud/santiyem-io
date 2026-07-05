import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
}

/**
 * Standart hata ekranı — teknik `Failed to fetch` gibi mesajlar yerine
 * kullanıcıya ne olduğunu ve ne yapabileceğini anlatır.
 *
 * Kullanım:
 *   {error && <ErrorState onRetry={refetch} />}
 */
const ErrorState = ({
  title = "Bir şeyler ters gitti",
  description = "Veriler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.",
  onRetry,
  retrying = false,
  compact = false,
}: ErrorStateProps) => (
  <div
    className={`flex flex-col items-center justify-center text-center ${
      compact ? "py-6 px-4" : "py-12 px-6"
    }`}
  >
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-destructive/10 border border-destructive/30"
      aria-hidden
    >
      <AlertTriangle className="w-5 h-5 text-destructive" />
    </div>
    <h3
      className="text-[14px] font-semibold text-foreground mb-1.5 tracking-tight"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {title}
    </h3>
    <p className="text-[12.5px] leading-relaxed text-muted-foreground max-w-xs mb-4">
      {description}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={retrying}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-medium border border-border/70 bg-background hover:bg-muted/60 hover:border-[#FF6B2B]/40 transition-colors text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Yeniden deneniyor…" : "Tekrar dene"}
      </button>
    )}
  </div>
);

export default ErrorState;
