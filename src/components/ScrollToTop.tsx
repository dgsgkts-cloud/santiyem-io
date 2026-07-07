import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Ensures every route change (and initial load) starts scrolled at the top.
 * Fixes the issue where the dashboard occasionally opened near the footer
 * after login or a page refresh.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Defer to next frame so route content mounts before we scroll.
    const id = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
