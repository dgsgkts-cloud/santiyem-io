import { Sparkles } from "lucide-react";
import { ReactNode } from "react";

export type AIAction = {
  label: string;
  onClick: () => void;
  tone?: "primary" | "ghost";
};

interface AIInsightCardProps {
  title?: string;
  insights: string[];
  actions?: AIAction[];
  compact?: boolean;
  children?: ReactNode;
}

/**
 * Sprint 22 — Compact AI insight card used throughout the Finance module.
 * Premium, subtle, orange-sparkle branded.
 */
export const AIInsightCard = ({
  title = "AI Finans",
  insights,
  actions,
  compact,
  children,
}: AIInsightCardProps) => {
  if (!insights?.length && !children) return null;
  return (
    <div
      className={`rounded-xl border border-[#FF6B2B]/20 ${compact ? "p-3" : "p-4"}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,107,43,0.07), rgba(255,143,90,0.02))",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-wide">
              {title}
            </span>
          </div>
          {insights?.length > 0 && (
            <ul className="space-y-0.5">
              {insights.map((t, i) => (
                <li
                  key={i}
                  className="text-[12.5px] leading-snug text-foreground/90"
                >
                  • {t}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
        {actions && actions.length > 0 && (
          <div className="shrink-0 flex flex-col gap-1.5">
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className={`text-[11.5px] font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  a.tone === "ghost"
                    ? "text-[#FF6B2B] hover:bg-[#FF6B2B]/10"
                    : "bg-[#FF6B2B]/15 text-[#FF6B2B] hover:bg-[#FF6B2B]/25"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightCard;
