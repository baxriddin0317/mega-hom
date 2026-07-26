import type { ImageT } from "@/lib/types";

/** First usable product image URL (skips empty/malformed entries). */
export function firstImageUrl(images?: ImageT[] | null): string | undefined {
  if (!images?.length) return undefined;
  for (const im of images) {
    const url = im?.url?.trim();
    if (url) return url;
  }
  return undefined;
}

/**
 * First usable THUMBNAIL url for grids/cards — prefers the small `thumbUrl`,
 * falls back to the full `url` for images uploaded before thumbs existed. Use
 * this in list/grid views; keep firstImageUrl for the full-size detail view.
 */
export function firstThumbUrl(images?: ImageT[] | null): string | undefined {
  if (!images?.length) return undefined;
  for (const im of images) {
    const thumb = im?.thumbUrl?.trim();
    if (thumb) return thumb;
    const url = im?.url?.trim();
    if (url) return url;
  }
  return undefined;
}
