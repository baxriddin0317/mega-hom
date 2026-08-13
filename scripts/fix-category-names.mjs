/**
 * Repair product.category values that don't match any real category.
 *
 * The category page filters on an EXACT string match
 * (`product.category === category.name`), so a product carrying a legacy or
 * misspelled category name is unreachable from every category page — it only
 * ever shows up under "Barcha mahsulotlar" and search. Audit on 2026-08-13
 * found 26 such products.
 *
 * The script rewrites only the values in ALIASES below, and only when the target
 * category actually exists in the `categories` collection. Anything it doesn't
 * recognise is reported, never guessed at.
 *
 * Auth: uses the existing `gcloud` CLI login (megahomeweb@gmail.com by default;
 * override with GCLOUD_ACCOUNT). See scripts/lib/gcp.mjs.
 *
 * Usage:
 *   node scripts/fix-category-names.mjs --dry-run    # report only
 *   node scripts/fix-category-names.mjs              # apply
 */
import { listDocuments, patchDocument } from "./lib/gcp.mjs";

const PROJECT_ID = "megahome-a139c";
const DRY = process.argv.includes("--dry-run");

/** legacy/misspelled value  ->  canonical category name */
const ALIASES = {
  "Interier va Uy Mebeli": "Uy va interier uchun mebel",
  "Xavfsizlik va Safar": "Havfsizlik va safar",
};

const cats = await listDocuments(PROJECT_ID, "categories");
const realNames = new Set(cats.map((c) => c.data.name));
console.log("Kategoriyalar:", [...realNames].join(" | "), "\n");

// Refuse to move products into a category that doesn't exist — that would just
// strand them somewhere else.
for (const target of new Set(Object.values(ALIASES))) {
  if (!realNames.has(target)) {
    console.error(`ABORT: target category "${target}" does not exist in Firestore.`);
    process.exit(1);
  }
}

const products = await listDocuments(PROJECT_ID, "products", {
  mask: ["category"],
});
let fixed = 0;
const unknown = new Map();

for (const doc of products) {
  const current = doc.data.category;
  if (!current || realNames.has(current)) continue;

  const target = ALIASES[current];
  if (!target) {
    unknown.set(current, (unknown.get(current) ?? 0) + 1);
    continue;
  }

  console.log(`  ${doc.id}  "${current}" -> "${target}"`);
  fixed++;
  // One PATCH per doc with an updateMask of just `category` — no other field on
  // the product is read or rewritten, so a concurrent edit elsewhere is safe.
  if (!DRY) await patchDocument(PROJECT_ID, "products", doc.id, { category: target });
}

console.log(`\n${fixed} product(s) ${DRY ? "would be" : ""} moved to a real category.`);
if (unknown.size) {
  console.log("\nUnrecognised category values (NOT touched — add them to ALIASES):");
  for (const [name, n] of unknown) console.log(`  "${name}" — ${n} ta`);
}
if (DRY) console.log("\nDRY RUN — nothing was written.");
process.exit(0);
