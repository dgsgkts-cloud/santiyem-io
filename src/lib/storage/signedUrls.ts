import { supabase } from "@/integrations/supabase/client";

/**
 * Buckets holding sensitive documents. They are private: objects must be
 * fetched through short-lived signed URLs so storage RLS is actually enforced.
 */
export const PRIVATE_BUCKETS = ["project-files", "signed-contracts", "site-diary-photos"] as const;
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

/**
 * Accepts either a raw storage path (new records) or a legacy public/sign URL
 * (records created while the buckets were public) and returns the object path.
 */
export function extractStoragePath(bucket: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (!/^https?:\/\//i.test(raw)) {
    return decodeURIComponent(raw.replace(/^\/+/, ""));
  }

  let pathname: string;
  try {
    pathname = new URL(raw).pathname;
  } catch {
    return null;
  }

  const marker = `/${bucket}/`;
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(pathname.slice(idx + marker.length).replace(/^\/+/, ""));
}

/** Default lifetime for a signed document link (1 hour). */
export const SIGNED_URL_TTL = 60 * 60;

export async function createSignedStorageUrl(
  bucket: PrivateBucket,
  value: string | null | undefined,
  expiresIn: number = SIGNED_URL_TTL,
): Promise<string | null> {
  const path = extractStoragePath(bucket, value);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Opens a private object in a new tab through a freshly signed URL. */
export async function openSignedStorageUrl(
  bucket: PrivateBucket,
  value: string | null | undefined,
): Promise<boolean> {
  const url = await createSignedStorageUrl(bucket, value);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
