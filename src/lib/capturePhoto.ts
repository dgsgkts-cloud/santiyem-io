import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

/**
 * Convert a Capacitor camera webPath (blob/file URI) to a File object.
 */
async function webPathToFile(webPath: string, fileName: string): Promise<File> {
  const res = await fetch(webPath);
  const blob = await res.blob();
  const type = blob.type || "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  return new File([blob], `${fileName}.${ext}`, { type });
}

/**
 * Capture a single photo using device camera.
 * On native: uses Capacitor Camera plugin.
 * On web: falls back to a hidden file input with capture=environment.
 */
export async function takePhoto(): Promise<File | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
      });
      if (!photo.webPath) return null;
      return await webPathToFile(photo.webPath, `photo-${Date.now()}`);
    } catch (e: any) {
      if (e?.message?.toLowerCase?.().includes("cancel")) return null;
      console.error("Camera error:", e);
      throw e;
    }
  }
  return pickFromInput({ capture: true, multiple: false }).then(files => files[0] || null);
}

/**
 * Pick photo(s) from the gallery.
 * On native: uses Capacitor Camera plugin's pickImages (multi-select).
 * On web: falls back to a hidden file input.
 */
export async function pickFromGallery(max = 10): Promise<File[]> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Camera.pickImages({ quality: 80, limit: max });
      const files: File[] = [];
      for (let i = 0; i < result.photos.length; i++) {
        const p = result.photos[i];
        if (p.webPath) files.push(await webPathToFile(p.webPath, `photo-${Date.now()}-${i}`));
      }
      return files;
    } catch (e: any) {
      if (e?.message?.toLowerCase?.().includes("cancel")) return [];
      console.error("Gallery error:", e);
      throw e;
    }
  }
  return pickFromInput({ capture: false, multiple: true });
}

function pickFromInput(opts: { capture: boolean; multiple: boolean }): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.multiple = opts.multiple;
    if (opts.capture) input.setAttribute("capture", "environment");
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      resolve(files);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}
