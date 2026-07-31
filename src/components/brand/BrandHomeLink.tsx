// Şantiyem AI brand logo → Ana Sayfa (dashboard) navigation wrapper.
// Used for every in-app logo (desktop sidebar expanded/collapsed, mobile &
// tablet header, drawer). Decorative logos on auth/landing/splash/report
// surfaces must NOT use this component.

import { forwardRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const DASHBOARD_PATH = "/dashboard";

type BrandHomeLinkProps = {
  children: ReactNode;
  className?: string;
  /** Extra work on activation (e.g. close the mobile drawer). */
  onNavigate?: () => void;
};

/** Smoothly scrolls the app's canonical scroll container (and window) to top. */
const scrollAppToTop = () => {
  const container = document.querySelector<HTMLElement>(
    "[data-app-scroll], .smooth-scroll, .overflow-y-auto",
  );
  container?.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const BrandHomeLink = forwardRef<HTMLAnchorElement, BrandHomeLinkProps>(
  function BrandHomeLink({ children, className, onNavigate }, ref) {
    const location = useLocation();
    const isOnDashboard =
      location.pathname === DASHBOARD_PATH || location.pathname === "/";

    return (
      <Link
        ref={ref}
        to={DASHBOARD_PATH}
        replace={isOnDashboard}
        aria-label="Ana Sayfaya git"
        title="Ana Sayfa"
        onClick={(e) => {
          onNavigate?.();
          if (isOnDashboard) {
            // Already home: no reload, no extra history entry — just scroll up.
            e.preventDefault();
            scrollAppToTop();
            return;
          }
          scrollAppToTop();
        }}
        className={cn(
          "inline-flex items-center cursor-pointer select-none bg-transparent border-0 shadow-none outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#FF6B2B]/70 focus-visible:ring-offset-0 rounded-lg",
          className,
        )}
      >
        {children}
      </Link>
    );
  },
);

export default BrandHomeLink;
