import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  /** Shorter copy for og:/twitter: descriptions. Falls back to `description`. */
  socialDescription?: string;
  /** Path-only (e.g. "/iletisim") or absolute. Defaults to current location. */
  canonicalPath?: string;
}

const SITE_ORIGIN = "https://santiyem.io";

const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string,
) => {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

export const useSEO = ({ title, description, socialDescription, canonicalPath }: SEOProps) => {
  useEffect(() => {
    document.title = title;

    const path =
      canonicalPath ??
      (typeof window !== "undefined" ? window.location.pathname : "/");
    const url = path.startsWith("http")
      ? path
      : `${SITE_ORIGIN}${path === "" ? "/" : path}`;

    if (description) {
      upsertMeta("name", "description", description);
    }
    const social = socialDescription ?? description;
    if (social) {
      upsertMeta("property", "og:description", social);
      upsertMeta("name", "twitter:description", social);
    }

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:url", url);
    upsertMeta("name", "twitter:title", title);
    upsertCanonical(url);
  }, [title, description, socialDescription, canonicalPath]);
};
