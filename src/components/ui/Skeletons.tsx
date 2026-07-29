// Skeleton primitives — Sprint 35 Product Polish.
// Loading is always content-shaped. No spinners anywhere in the product.

import { cn } from "@/lib/utils";

export const Skeleton = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => <div className={cn("ds-skeleton", className)} style={style} aria-hidden />;

/** A block of text lines with a naturally shortened last line. */
export const SkeletonText = ({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={cn("space-y-2", className)} aria-hidden>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-3"
        style={{ width: i === lines - 1 ? "62%" : "100%" }}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("ds-card space-y-4", className)} aria-hidden>
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

export const SkeletonKpiRow = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" aria-hidden>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="ds-card space-y-3">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-2 w-12" />
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) => (
  <div className="ds-card p-0 overflow-hidden" aria-hidden>
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border/70">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-2.5 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        className="flex items-center gap-4 px-5 py-4 border-b border-border/40 last:border-0"
      >
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton
            key={c}
            className="h-3 flex-1"
            style={{ opacity: 1 - r * 0.07 }}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="ds-card flex items-center gap-4 py-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

/** Shimmering status label — used while the AI is working. */
export const ShimmerLabel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <span className={cn("ds-shimmer-text ds-body-strong", className)}>{children}</span>;

export default Skeleton;
