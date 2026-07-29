/**
 * Şantiyem Brand Identity — single source of truth for the logo.
 *
 * There is exactly ONE logo language in the product:
 *  - `SantiyemMark`      : geometric "Ş" monogram (rounded square, brand orange)
 *  - `SantiyemWordmark`  : mark + "Şantiyem" typography lockup
 *  - `SantiyemLoadingMark`: mark with a soft pulse (loading / splash)
 *
 * Only three sizes exist: "sm" (navbar, sidebar, toolbar),
 * "md" (login, settings, dialogs), "lg" (splash, landing, empty states).
 * Do not create additional variants or redesign the mark per screen.
 */
import { cn } from "@/lib/utils";

export type LogoSize = "sm" | "md" | "lg";

const MARK_PX: Record<LogoSize, number> = { sm: 32, md: 48, lg: 72 };
const WORD_PX: Record<LogoSize, number> = { sm: 16, md: 22, lg: 32 };
const GAP_PX: Record<LogoSize, number> = { sm: 8, md: 12, lg: 16 };

/** The raw "Ş" glyph — geometric, flat, rounded caps, legible at 16px. */
function GlyphS({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M26.6 15.1c0-3.1-2.9-5.3-6.6-5.3-3.8 0-6.6 2.2-6.6 5.4 0 6.4 13.2 4.2 13.2 11.1 0 3.2-2.9 5.4-6.6 5.4-3.3 0-6.1-1.6-6.6-4.1"
        strokeWidth="4.4"
      />
      <path d="M20 31.7v2.9c0 2.4 1.9 3.2 3.7 2.5" strokeWidth="3.2" />
    </g>
  );
}

interface MarkProps {
  size?: LogoSize;
  /** Pixel override for edge cases (favicons, inline chips). Prefer `size`. */
  px?: number;
  className?: string;
  /** Renders the glyph only, no orange plate (for use on orange surfaces). */
  bare?: boolean;
}

export function SantiyemMark({ size = "sm", px, className, bare = false }: MarkProps) {
  const dimension = px ?? MARK_PX[size];
  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Şantiyem"
      className={cn("shrink-0", className)}
    >
      {!bare && <rect width="48" height="48" rx="13" fill="#FF6B2B" />}
      <g transform="translate(4 3.5)">
        <GlyphS color={bare ? "#FF6B2B" : "#FFFFFF"} />
      </g>
    </svg>
  );
}

interface WordmarkProps extends MarkProps {
  /** Optional second line, e.g. "Construction Operating System". */
  tagline?: string;
  /** Stack mark above the wordmark (splash / landing hero). */
  stacked?: boolean;
}

export function SantiyemWordmark({
  size = "sm",
  px,
  className,
  tagline,
  stacked = false,
}: WordmarkProps) {
  return (
    <div
      className={cn(
        "flex select-none",
        stacked ? "flex-col items-center text-center" : "flex-row items-center",
        className,
      )}
      style={{ gap: GAP_PX[size] }}
    >
      <SantiyemMark size={size} px={px} />
      <div className={cn("flex flex-col", stacked ? "items-center" : "items-start")}>
        <span
          className="font-bold leading-none tracking-[-0.02em] text-foreground whitespace-nowrap"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: WORD_PX[size] }}
        >
          Şantiyem
        </span>
        {tagline && (
          <span
            className="mt-1.5 font-medium leading-none text-muted-foreground whitespace-nowrap"
            style={{ fontSize: Math.max(11, Math.round(WORD_PX[size] * 0.42)) }}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}

/** Splash / loading state: centered mark with a soft pulse. */
export function SantiyemLoadingMark({ size = "lg", className }: { size?: LogoSize; className?: string }) {
  return <SantiyemMark size={size} className={cn("brand-logo-pulse", className)} />;
}

export default SantiyemMark;
