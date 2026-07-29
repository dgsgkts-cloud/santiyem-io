import { Sparkles, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  icon: string;
  title: string;
  /** Why the screen is empty — one plain sentence. */
  description: string;
  /** The concrete first step the user should take. */
  firstStep?: string;
  /** What the AI will do once there is data here. */
  aiHint?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  linkText?: string;
  onLinkClick?: () => void;
  children?: React.ReactNode;
}

/**
 * Sprint 35 — Empty states explain three things: why it is empty,
 * what the first step is, and what the AI will do with the data.
 */
const EmptyState = ({
  icon,
  title,
  description,
  firstStep,
  aiHint,
  buttonText,
  onButtonClick,
  linkText,
  onLinkClick,
  children,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center ds-enter" style={{ padding: "32px 24px" }}>
    <div
      className="flex items-center justify-center mb-5 bg-muted/40 border border-border/60"
      style={{ width: 56, height: 56, borderRadius: 18 }}
      aria-hidden
    >
      <span className="text-[22px] leading-none opacity-80">{icon}</span>
    </div>

    <h3 className="ds-title text-foreground mb-2">{title}</h3>
    <p className="ds-body text-muted-foreground max-w-sm">{description}</p>

    {(firstStep || aiHint) && (
      <div className="mt-5 w-full max-w-sm space-y-2 text-left">
        {firstStep && (
          <div className="flex items-start gap-3 rounded-control border border-border/70 bg-muted/25 px-4 py-3">
            <span
              className="mt-[1px] flex items-center justify-center shrink-0 rounded-full ds-caption font-semibold"
              style={{
                width: 20,
                height: 20,
                background: "hsl(var(--primary) / 0.14)",
                color: "hsl(var(--primary))",
              }}
            >
              1
            </span>
            <p className="ds-body text-foreground/90">{firstStep}</p>
          </div>
        )}
        {aiHint && (
          <div
            className="flex items-start gap-3 rounded-control px-4 py-3 border"
            style={{
              background: "hsl(var(--primary) / 0.06)",
              borderColor: "hsl(var(--primary) / 0.18)",
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0 mt-[2px]" style={{ color: "hsl(var(--primary))" }} />
            <p className="ds-body text-muted-foreground">{aiHint}</p>
          </div>
        )}
      </div>
    )}

    {children && <div className="mt-4">{children}</div>}

    {buttonText && onButtonClick && (
      <button
        onClick={onButtonClick}
        className="ds-press ds-focus-ring mt-6 inline-flex items-center gap-2 ds-body-strong text-primary-foreground"
        style={{
          height: 40,
          padding: "0 20px",
          borderRadius: 14,
          background: "hsl(var(--primary))",
        }}
      >
        {buttonText}
        <ArrowRight className="w-4 h-4" />
      </button>
    )}

    {linkText && onLinkClick && (
      <button
        onClick={onLinkClick}
        className="ds-press ds-body-strong mt-3 text-primary hover:underline"
      >
        {linkText}
      </button>
    )}
  </div>
);

export default EmptyState;
