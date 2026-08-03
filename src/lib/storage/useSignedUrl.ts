import { useEffect, useState } from "react";
import { createSignedStorageUrl, type PrivateBucket } from "./signedUrls";

/**
 * Resolves a private-bucket path (or legacy public URL) into a short-lived
 * signed URL usable as an <img src> or download href.
 */
export function useSignedUrl(bucket: PrivateBucket, value: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!value);

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    createSignedStorageUrl(bucket, value).then((signed) => {
      if (!active) return;
      setUrl(signed);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [bucket, value]);

  return { url, loading };
}
