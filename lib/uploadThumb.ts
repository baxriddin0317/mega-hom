import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { fireStorage } from "@/firebase/FirebaseConfig";
import { makeThumbnail } from "@/utils/optimizeImage";

/**
 * Fail-safe thumbnail companion for a just-uploaded product image. Generates a
 * ≤400px WebP from the already-optimized file and uploads it beside the original
 * (products/{folder}/thumb-{name}). Returns {thumbUrl, thumbPath}, or {} on ANY
 * failure — so a thumb hiccup can never block the full image or the product save.
 * The full-size upload flow at each call site stays exactly as it was.
 */
export async function uploadThumbSafe(
  optimized: File,
  folderId: string,
  safeName: string
): Promise<{ thumbUrl?: string; thumbPath?: string }> {
  try {
    const thumb = await makeThumbnail(optimized);
    if (!thumb) return {};
    const tRef = ref(fireStorage, `products/${folderId}/thumb-${safeName}`);
    await uploadBytes(tRef, thumb);
    return { thumbUrl: await getDownloadURL(tRef), thumbPath: tRef.fullPath };
  } catch (e) {
    console.warn("thumbnail skipped:", e);
    return {};
  }
}
