import type { UploadMetadata } from "firebase/storage";

/**
 * Cache headers for product photos. Firebase Storage defaults every object to
 * `private, max-age=0`, which makes the browser re-download EVERY photo on EVERY
 * page view — the single biggest cause of the storefront feeling slow.
 *
 * Product image paths are content-addressed (uuid-prefixed filename inside a
 * uuid folder), so a given URL never changes content: a replaced photo is a new
 * upload at a new path. That makes a one-year immutable cache safe.
 */
export const IMAGE_UPLOAD_METADATA: UploadMetadata = {
  cacheControl: "public, max-age=31536000, immutable",
};
