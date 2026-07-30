/**
 * Şantiyem Brand Identity — single source of truth for the logo.
 *
 * THREE supplied assets only. Never redraw, recolor or recreate them:
 *  - /brand/horizontal.svg  : primary horizontal lockup (symbol + "SANTIYEM AI")
 *  - /brand/vertical.svg    : primary vertical lockup (centered brand moments)
 *  - /brand/symbol.svg      : symbol-only mark (favicon, collapsed nav, compact)
 *
 * Each has a reverse (`-light`) counterpart for dark surfaces. The reverse file
 * is the identical artwork with the navy ink knocked out to white — no other
 * change. `tone="auto"` picks the correct one from the active theme.
 *
 * Components:
 *  - `SantiyemMark`       : symbol only
 *  - `SantiyemWordmark`   : horizontal lockup (or vertical when `stacked`)
 *  - `SantiyemVertical`   : vertical lockup
 *  - `SantiyemLoadingMark`: symbol with a soft pulse (loading / splash)
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type LogoSize = "sm" | "md" | "lg";
/** Ink tone. "light" = white ink for dark surfaces, "dark" = navy ink. */
export type LogoTone = "auto" | "light" | "dark";

/** Intrinsic aspect ratios (width / height) of the supplied artwork. */
export const LOGO_ASPECT = {
  horizontal: 2.339,
  vertical: 1.253,
  symbol: 0.694,
} as const;

const MARK_PX: Record<LogoSize, number> = { sm: 32, md: 48, lg: 72 };
const LOCKUP_PX: Record<LogoSize, number> = { sm: 34, md: 52, lg: 80 };

type Variant = keyof typeof LOGO_ASPECT;

interface BrandImageProps {
  variant: Variant;
  /** Rendered height in px. Width is derived from the intrinsic aspect ratio. */
  height: number;
  tone: LogoTone;
  className?: string;
  alt: string;
}

/**
 * Renders the supplied SVG untouched: aspect ratio preserved, `object-contain`,
 * explicit width/height so no layout shift occurs while the asset loads.
 * `forwardRef` so Radix `asChild` / Tooltip triggers can measure the logo.
 */
const BrandImage = forwardRef<HTMLImageElement, BrandImageProps>(function BrandImage(
  { variant, height, tone, className, alt },
  ref,
) {
  const width = Math.round(height * LOGO_ASPECT[variant]);
  const base = `/brand/${variant}`;
  const style = { width, height } as const;

  if (tone !== "auto") {
    return (
      <img
        ref={ref}
        src={tone === "light" ? `${base}-light.svg` : `${base}.svg`}
        alt={alt}
        width={width}
        height={height}
        style={style}
        className={cn("object-contain shrink-0 select-none", className)}
        draggable={false}
      />
    );
  }

  return (
    <>
      <img
        ref={ref}
        src={`${base}-light.svg`}
        alt={alt}
        width={width}
        height={height}
        style={style}
        className={cn("brand-ink-light object-contain shrink-0 select-none", className)}
        draggable={false}
      />
      <img
        src={`${base}.svg`}
        alt=""
        aria-hidden
        width={width}
        height={height}
        style={style}
        className={cn("brand-ink-dark object-contain shrink-0 select-none", className)}
        draggable={false}
      />
    </>
  );
});


interface MarkProps {
  size?: LogoSize;
  /** Pixel height override for edge cases. Prefer `size`. */
  px?: number;
  className?: string;
  tone?: LogoTone;
  /** @deprecated kept for call-site compatibility — maps to `tone="light"`. */
  bare?: boolean;
  /** @deprecated the supplied artwork is never recolored. */
  glyphColor?: string;
}

/** Symbol-only mark. Use in compact spaces: collapsed nav, favicons, chips. */
export const SantiyemMark = forwardRef<HTMLSpanElement, MarkProps>(function SantiyemMark(
  { size = "sm", px, className, tone = "auto", bare = false },
  ref,
) {
  const height = px ?? MARK_PX[size];
  return (
    <span ref={ref} className="inline-flex shrink-0 items-center justify-center">
      <BrandImage
        variant="symbol"
        height={height}
        tone={bare ? "light" : tone}
        className={className}
        alt="Şantiyem"
      />
    </span>
  );
});

interface WordmarkProps extends MarkProps {
  /** @deprecated the supplied lockup already carries the "AI" descriptor. */
  tagline?: string;
  /** Use the vertical lockup instead of the horizontal one. */
  stacked?: boolean;
}

/** Primary lockup. Horizontal by default; vertical when `stacked`. */
export function SantiyemWordmark({
  size = "sm",
  px,
  className,
  tone = "auto",
  stacked = false,
}: WordmarkProps) {
  const height = px ?? LOCKUP_PX[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center", stacked && "justify-center")}>
      <BrandImage
        variant={stacked ? "vertical" : "horizontal"}
        height={stacked ? Math.round(height * 1.9) : height}
        tone={tone}
        className={className}
        alt="Şantiyem AI"
      />
    </span>
  );
}

/** Vertical lockup — mobile auth, splash, centered brand introductions. */
export function SantiyemVertical({
  height = 120,
  tone = "auto",
  className,
}: {
  height?: number;
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center">
      <BrandImage variant="vertical" height={height} tone={tone} className={className} alt="Şantiyem AI" />
    </span>
  );
}

/** Splash / loading state: centered symbol with a soft pulse. */
export function SantiyemLoadingMark({
  size = "lg",
  tone = "auto",
  className,
}: {
  size?: LogoSize;
  tone?: LogoTone;
  className?: string;
}) {
  return <SantiyemMark size={size} tone={tone} className={cn("brand-logo-pulse", className)} />;
}

export default SantiyemMark;

/**
 * Authentication lockup — vertical on mobile, horizontal from `lg` up.
 * Auth surfaces are always dark, so the reverse ink is used by default.
 */
export function SantiyemAuthLockup({
  tone = "light",
  className,
}: {
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <>
      <span className={cn("inline-flex lg:hidden", className)}>
        <BrandImage variant="vertical" height={104} tone={tone} alt="Şantiyem AI" />
      </span>
      <span className={cn("hidden lg:inline-flex", className)}>
        <BrandImage variant="horizontal" height={52} tone={tone} alt="Şantiyem AI" />
      </span>
    </>
  );
}
