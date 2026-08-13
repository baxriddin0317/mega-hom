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
 * Auth:
 *   gcloud auth application-default login    # as megahomeweb@gmail.com
 *   — or — export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *
 * Usage:
 *   node scripts/fix-category-names.mjs --dry-run    # report only
 *   node scripts/fix-category-names.mjs              # apply
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const PROJECT_ID = "megahome-a139c";
const DRY = process.argv.includes("--dry-run");

/** legacy/misspelled value  ->  canonical category name */
const ALIASES = {
  "Interier va Uy Mebeli": "Uy va interier uchun mebel",
  "Xavfsizlik va Safar": "Havfsizlik va safar",
};

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
initializeApp({
  credential: keyPath
    ? cert(JSON.parse(readFileSync(keyPath, "utf8")))
    : applicationDefault(),
  projectId: PROJECT_ID,
});
const db = getFirestore();

const cats = await db.collection("categories").get();
const realNames = new Set(cats.docs.map((d) => d.data().name));
console.log("Kategoriyalar:", [...realNames].join(" | "), "\n");

// Refuse to move products into a category that doesn't exist — that would just
// strand them somewhere else.
for (const target of new Set(Object.values(ALIASES))) {
  if (!realNames.has(target)) {
    console.error(`ABORT: target category "${target}" does not exist in Firestore.`);
    process.exit(1);
  }
}

const snap = await db.collection("products").get();
let fixed = 0;
const unknown = new Map();
let batch = db.batch();
let pending = 0;

for (const doc of snap.docs) {
  const current = doc.data().category;
  if (!current || realNames.has(current)) continue;

  const target = ALIASES[current];
  if (!target) {
    unknown.set(current, (unknown.get(current) ?? 0) + 1);
    continue;
  }

  console.log(`  ${doc.id}  "${current}" -> "${target}"`);
  fixed++;
  if (!DRY) {
    batch.update(doc.ref, { category: target });
    // Firestore caps a batch at 500 writes.
    if (++pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
}

if (!DRY && pending > 0) await batch.commit();

console.log(`\n${fixed} product(s) ${DRY ? "would be" : ""} moved to a real category.`);
if (unknown.size) {
  console.log("\nUnrecognised category values (NOT touched — add them to ALIASES):");
  for (const [name, n] of unknown) console.log(`  "${name}" — ${n} ta`);
}
if (DRY) console.log("\nDRY RUN — nothing was written.");
process.exit(0);
