/**
 * Backfill product image THUMBNAILS + CACHE HEADERS.
 *
 * Why: the storefront grids fall back to the full ≤1600px photo whenever an
 * image has no `thumbUrl` — and only 8 of ~192 catalog images ever got one
 * (thumbs were added late). Measured average payload per card was 1.35 MB for a
 * tile rendered at ~180px. This script generates the missing ≤400px WebP
 * companions and writes `thumbUrl`/`thumbPath` back onto the product doc.
 *
 * It also stamps `cache-control: public, max-age=31536000, immutable` on every
 * product object it touches. Firebase Storage defaults to `private, max-age=0`,
 * so without this every photo is re-downloaded on every single page view.
 *
 * SAFE TO RE-RUN: images that already have a thumbUrl are skipped (unless
 * --force). Nothing is deleted. Failures are per-image and never abort the run.
 *
 * Auth: reuses the gcloud login already on the machine (megahomeweb@gmail.com);
 * override with GCLOUD_ACCOUNT=..., or GOOGLE_APPLICATION_CREDENTIALS=key.json.
 *
 * Usage:
 *   node scripts/backfill-image-thumbs.mjs --dry-run     # report only, no writes
 *   node scripts/backfill-image-thumbs.mjs               # do it
 *   node scripts/backfill-image-thumbs.mjs --force       # regenerate existing thumbs too
 *   node scripts/backfill-image-thumbs.mjs --limit=10    # first N products (trial run)
 */
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { initAdmin } from "./lib/adminApp.mjs";

const PROJECT_ID = "megahome-a139c";
const BUCKET = "megahome-a139c.firebasestorage.app";
const THUMB_EDGE = 400;
const THUMB_QUALITY = 70;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);

const { via } = initAdmin({ projectId: PROJECT_ID, storageBucket: BUCKET });
console.log(`auth: ${via}`);

const db = getFirestore();
const bucket = getStorage().bucket();

/** Storage path for an image, from its stored `path` or parsed out of the URL. */
function storagePathOf(image) {
  if (image.path?.trim()) return image.path.trim();
  // Download URLs look like /o/<url-encoded-path>?alt=media&token=...
  const m = /\/o\/([^?]+)/.exec(image.url ?? "");
  return m ? decodeURIComponent(m[1]) : null;
}

/** products/<folder>/<name>  ->  products/<folder>/thumb-<name>.webp */
function thumbPathFor(path) {
  const i = path.lastIndexOf("/");
  const dir = path.slice(0, i);
  const name = path.slice(i + 1).replace(/\.[^.]+$/, "");
  return `${dir}/thumb-${name}.webp`;
}

async function publicUrlFor(file) {
  // Reuse the object's existing download token when it has one so the URL shape
  // matches everything else in the catalog; mint one otherwise.
  const [meta] = await file.getMetadata();
  let token = meta.metadata?.firebaseStorageDownloadTokens;
  if (!token) {
    token = crypto.randomUUID();
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  }
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
    file.name
  )}?alt=media&token=${token}`;
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

const snap = await db.collection("products").get();
const docs = LIMIT ? snap.docs.slice(0, LIMIT) : snap.docs;
console.log(
  `${docs.length} product(s)${LIMIT ? ` (limited from ${snap.size})` : ""}${
    DRY ? "  — DRY RUN, no writes" : ""
  }\n`
);

for (const doc of docs) {
  const data = doc.data();
  const images = Array.isArray(data.productImageUrl) ? data.productImageUrl : [];
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
      const src = bucket.file(path);
      const [exists] = await src.exists();
      if (!exists) {
        console.warn(`  ! ${doc.id}: missing object ${path}, skipped`);
        stats.errors++;
        next.push(image);
        continue;
      }

      const [buf] = await src.download();
      stats.bytesBefore += buf.length;

      // Stamp cache headers on the ORIGINAL too — this alone stops the
      // re-download-on-every-view behaviour for detail pages.
      if (!DRY) {
        await src.setMetadata({ cacheControl: CACHE_CONTROL });
      }
      stats.cacheStamped++;

      const thumb = await sharp(buf)
        .rotate() // honour EXIF orientation before resizing
        .resize(THUMB_EDGE, THUMB_EDGE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer();
      stats.bytesAfter += thumb.length;

      const tPath = thumbPathFor(path);
      if (DRY) {
        console.log(
          `  · ${doc.id}: ${Math.round(buf.length / 1024)}KB -> ${Math.round(
            thumb.length / 1024
          )}KB  ${tPath}`
        );
        next.push(image);
        continue;
      }

      const tFile = bucket.file(tPath);
      await tFile.save(thumb, {
        contentType: "image/webp",
        metadata: { cacheControl: CACHE_CONTROL },
      });
      const thumbUrl = await publicUrlFor(tFile);

      next.push({ ...image, thumbUrl, thumbPath: tPath });
      changed = true;
      stats.thumbsMade++;
      console.log(
        `  ✓ ${doc.id}: ${Math.round(buf.length / 1024)}KB -> ${Math.round(
          thumb.length / 1024
        )}KB`
      );
    } catch (err) {
      console.error(`  ! ${doc.id}: ${err.message}`);
      stats.errors++;
      next.push(image);
    }
  }

  if (changed && !DRY) {
    await doc.ref.update({ productImageUrl: next });
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
process.exit(0);
