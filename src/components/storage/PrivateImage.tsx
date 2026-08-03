import { useSignedUrl } from "@/lib/storage/useSignedUrl";
import { openSignedStorageUrl, type PrivateBucket } from "@/lib/storage/signedUrls";
import { ImageOff } from "lucide-react";

interface Props {
  bucket: PrivateBucket;
  /** Storage path (new records) or legacy public URL. */
  value: string | null | undefined;
  alt?: string;
  className?: string;
  /** Open the full-size image in a new tab on click. */
  openOnClick?: boolean;
}

/**
 * Renders an image stored in a private bucket via a short-lived signed URL,
 * so storage RLS is enforced instead of bypassed by a public URL.
 */
export default function PrivateImage({ bucket, value, alt = "", className, openOnClick }: Props) {
  const { url, loading } = useSignedUrl(bucket, value);

  if (loading) {
    return <div className={`${className ?? ""} animate-pulse bg-muted`} aria-hidden />;
  }

  if (!url) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-muted`}>
        <ImageOff className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={className}
      onClick={openOnClick ? () => openSignedStorageUrl(bucket, value) : undefined}
    />
  );
}
