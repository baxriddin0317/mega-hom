/**
 * Backfill product image THUMBNAILS + CACHE HEADERS.
 *
 * Why: the storefront grids fall back to the full ≤1600px photo whenever an
 * image has no `thumbUrl` — and only 8 of ~192 catalog images ever got one
 * (thumbs were added late). Measured average payload per card was 1.35 MB for a
 * tile rendered at ~180px, with a median load of 7.1 s on the live site. This
 * script generates the missing ≤400px WebP companions and writes
 * `thumbUrl`/`thumbPath` back onto the product doc.
 *
 * It also stamps `cache-control: public, max-age=31536000, immutable` on every
 * product object it touches. Firebase Storage defaults to `private, max-age=0`,
 * so without this every photo is re-downloaded on every single page view.
 *
 * SAFE TO RE-RUN: images that already have a thumbUrl are skipped (unless
 * --force). Originals are never modified beyond their cache header, nothing is
 * deleted, and a failure on one image never aborts the run.
 *
 * Auth: uses the existing `gcloud` CLI login (megahomeweb@gmail.com by default;
 * override with GCLOUD_ACCOUNT). See scripts/lib/gcp.mjs for why this talks to
 * the REST APIs instead of firebase-admin.
 *
 * Usage:
 *   node scripts/backfill-image-thumbs.mjs --dry-run     # report only, no writes
 *   node scripts/backfill-image-thumbs.mjs               # do it
 *   node scripts/backfill-image-thumbs.mjs --force       # regenerate existing thumbs
 *   node scripts/backfill-image-thumbs.mjs --limit=10    # first N products (trial)
 */
import sharp from "sharp";
import {
  listDocuments,
  patchDocument,
  downloadObject,
  uploadObject,
  patchObjectMetadata,
} from "./lib/gcp.mjs";

const PROJECT_ID = "megahome-a139c";
const BUCKET = "megahome-a139c.firebasestorage.app";
const THUMB_EDGE = 400;
const THUMB_QUALITY = 70;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);

/** Storage path for an image, from its stored `path` or parsed out of the URL. */
function storagePathOf(image) {
  if (image.path?.trim()) return image.path.trim();
  // Download URLs look like /o/<url-encoded-path>?alt=media&token=...
  const m = /\/o\/([^?]+)/.exec(image.url ?? "");
  return m ? decodeURIComponent(m[1]) : null;
}

/** products/<folder>/<name>.png -> products/<folder>/thumb-<name>.webp */
function thumbPathFor(path) {
  const i = path.lastIndexOf("/");
  const dir = path.slice(0, i);
  const name = path.slice(i + 1).replace(/\.[^.]+$/, "");
  return `${dir}/thumb-${name}.webp`;
}

const stats = {
  products: 0,
  images: 0,
  thumbsMade: 0,
  thumbsSkipped: 0,
  cacheStamped: 0,
  bytesBefore: 0,
  bytesAfter: 0,
  errors: 0,
};

console.log(`Reading products from ${PROJECT_ID}…`);
const all = await listDocuments(PROJECT_ID, "products");
const docs = LIMIT ? all.slice(0, LIMIT) : all;
console.log(
  `${docs.length} product(s)${LIMIT ? ` (limited from ${all.length})` : ""}${
    DRY ? "  — DRY RUN, no writes" : ""
  }\n`
);

const kb = (n) => Math.round(n / 1024);

for (const doc of docs) {
  const images = Array.isArray(doc.data.productImageUrl) ? doc.data.productImageUrl : [];
  if (!images.length) continue;
  stats.products++;

  let changed = false;
  const next = [];

  for (const image of images) {
    if (!image?.url) {
      next.push(image);
      continue;
    }
    stats.images++;

    if (image.thumbUrl && !FORCE) {
      stats.thumbsSkipped++;
      next.push(image);
      continue;
    }

    const path = storagePathOf(image);
    if (!path) {
      console.warn(`  ! ${doc.id}: could not resolve storage path, skipped`);
      stats.errors++;
      next.push(image);
      continue;
    }

    try {
      const buf = await downloadObject(BUCKET, path);
      stats.bytesBefore += buf.length;

      const thumb = await sharp(buf)
        .rotate() // honour EXIF orientation before resizing
        .resize(THUMB_EDGE, THUMB_EDGE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer();
      stats.bytesAfter += thumb.length;

      const tPath = thumbPathFor(path);

      if (DRY) {
        console.log(`  · ${doc.id}: ${kb(buf.length)}KB -> ${kb(thumb.length)}KB  ${tPath}`);
        stats.cacheStamped++;
        next.push(image);
        continue;
      }

      const thumbUrl = await uploadObject(BUCKET, tPath, thumb, {
        contentType: "image/webp",
        cacheControl: CACHE_CONTROL,
      });

      // Stamp the ORIGINAL too — this alone stops the re-download-on-every-view
      // behaviour on product detail pages. Never fatal: the thumb is the win.
      try {
        await patchObjectMetadata(BUCKET, path, { cacheControl: CACHE_CONTROL });
        stats.cacheStamped++;
      } catch (err) {
        console.warn(`  ~ ${doc.id}: cache header on original skipped (${err.message})`);
      }

      next.push({ ...image, thumbUrl, thumbPath: tPath });
      changed = true;
      stats.thumbsMade++;
      console.log(`  ✓ ${doc.id}: ${kb(buf.length)}KB -> ${kb(thumb.length)}KB`);
    } catch (err) {
      console.error(`  ! ${doc.id}: ${err.message}`);
      stats.errors++;
      next.push(image);
    }
  }

  if (changed && !DRY) {
    await patchDocument(PROJECT_ID, "products", doc.id, { productImageUrl: next });
  }
}

const mb = (n) => (n / 1048576).toFixed(1);
console.log(`
────────────────────────────────────
products with images : ${stats.products}
images seen          : ${stats.images}
thumbs generated     : ${stats.thumbsMade}
already had a thumb  : ${stats.thumbsSkipped}
cache-control set    : ${stats.cacheStamped}
errors               : ${stats.errors}
grid payload         : ${mb(stats.bytesBefore)} MB -> ${mb(stats.bytesAfter)} MB${
  DRY ? "\n\nDRY RUN — nothing was written." : ""
}`);
