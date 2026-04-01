import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
}

export const useSEO = ({ title, description }: SEOProps) => {
  useEffect(() => {
    document.title = title;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", description);
    }
  }, [title, description]);
};
