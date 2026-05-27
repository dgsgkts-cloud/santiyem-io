import { useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

const TRIGGER_DISTANCE = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ children, onRefresh, disabled }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTouching = useRef(false);

  // Only enable on mobile touch devices
  const isMobile = typeof window !== "undefined" && "ontouchstart" in window;

  const getScrollTop = useCallback(() => {
    if (!containerRef.current) return 0;
    return containerRef.current.scrollTop;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing) return;
      if (getScrollTop() > 2) return;
      isTouching.current = true;
      startY.current = e.touches[0].clientY;
    },
    [disabled, refreshing, getScrollTop]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isTouching.current || disabled || refreshing) return;
      if (getScrollTop() > 2) {
        setPullDistance(0);
        setTriggered(false);
        return;
      }

      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        e.preventDefault();
        const damped = Math.min(delta * 0.5, MAX_PULL);
        setPullDistance(damped);
        setTriggered(damped >= TRIGGER_DISTANCE);
      }
    },
    [disabled, refreshing, getScrollTop]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isTouching.current) return;
    isTouching.current = false;

    if (triggered && !refreshing) {
      setRefreshing(true);
      setPullDistance(TRIGGER_DISTANCE);
      try {
        await onRefresh();
      } catch {
        // swallow
      } finally {
        setRefreshing(false);
        setTriggered(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
      setTriggered(false);
    }
  }, [triggered, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isMobile) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);

  // Desktop fallback: just render children without wrapper
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative overflow-y-auto overflow-x-hidden" style={{ touchAction: "pan-y" }}>
      {/* Pull indicator */}
      <div
        className="sticky top-0 z-10 flex items-end justify-center overflow-hidden transition-transform duration-200"
        style={{
          height: pullDistance,
          marginTop: pullDistance > 0 ? -pullDistance : 0,
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        <div className="flex flex-col items-center justify-center pb-2">
          <Loader2
            className={`w-5 h-5 ${refreshing ? "animate-spin" : triggered ? "text-primary" : "text-muted-foreground"}`}
            style={{ color: refreshing || triggered ? "#FF6B2B" : undefined }}
          />
          <span
            className="text-[11px] mt-1 font-medium"
            style={{ color: refreshing || triggered ? "#FF6B2B" : "#94A3B8" }}
          >
            {refreshing ? "Yenileniyor…" : triggered ? "Bırak yenile" : "Yenilemek için çek"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
