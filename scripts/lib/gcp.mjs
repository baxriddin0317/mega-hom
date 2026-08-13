/**
 * Minimal Firestore + Cloud Storage REST client for the operator scripts.
 *
 * Why not firebase-admin: its Firestore client insists on a service-account
 * certificate or Application Default Credentials and rejects a plain bearer
 * token (`firestore/invalid-credential`). Setting up ADC on this machine kept
 * failing at Google's consent screen ("cloud-platform scope is required but not
 * consented"). The `gcloud` CLI login that already exists DOES carry the right
 * scopes, so these scripts use its access token against the REST APIs directly —
 * verified against megahome-a139c: Firestore read+write, object download,
 * object upload, and object metadata PATCH all return 200.
 *
 * Every call is scoped to one project/bucket and does no batching magic; these
 * are maintenance scripts, not a hot path.
 */
import { execFileSync } from "node:child_process";

const FIRESTORE = "https://firestore.googleapis.com/v1";
const STORAGE = "https://storage.googleapis.com/storage/v1";
const STORAGE_UPLOAD = "https://storage.googleapis.com/upload/storage/v1";

/**
 * gcloud hands back a token from its OWN cache, which may already be most of the
 * way through its hour — so a long-lived local cache here expires mid-run. A
 * full backfill hit `401 Invalid Credentials` on 81 of 192 images that way.
 * Keep the cache short AND force a refresh on any 401 (see `call`).
 */
const TOKEN_TTL_MS = 5 * 60 * 1000;
let cachedToken = null;
let cachedAt = 0;

export function accessToken(
  account = process.env.GCLOUD_ACCOUNT || "megahomeweb@gmail.com",
  { force = false } = {}
) {
  if (!force && cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) return cachedToken;
  try {
    cachedToken = execFileSync(
      "gcloud",
      ["auth", "print-access-token", `--account=${account}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim();
    cachedAt = Date.now();
    return cachedToken;
  } catch {
    console.error(
      `\nNo gcloud token for ${account}. Run:\n  gcloud auth login ${account}\n` +
        `(or set GCLOUD_ACCOUNT to an account that has access)\n`
    );
    process.exit(1);
  }
}

async function send(url, init, token) {
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

async function call(url, init = {}) {
  let res = await send(url, init, accessToken());

  // A run long enough to outlive the token used to fail every remaining image.
  // Mint a fresh one and replay the request exactly once.
  if (res.status === 401) {
    res = await send(url, init, accessToken(undefined, { force: true }));
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init.method ?? "GET"} ${url.split("?")[0]} → ${res.status} ${body.slice(0, 300)}`);
  }
  return res;
}

/* ------------------------------- Firestore -------------------------------- */

/** Firestore typed value -> plain JS (only the shapes this catalog uses). */
export function decodeValue(v) {
  if (v == null) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields ?? {});
  return undefined;
}

export function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

/** Plain JS -> Firestore typed value (strings, numbers, booleans, arrays, maps). */
export function encodeValue(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === "string") return { stringValue: x };
  if (typeof x === "boolean") return { booleanValue: x };
  if (typeof x === "number")
    return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(encodeValue) } };
  if (typeof x === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(x)) {
      if (v === undefined) continue;
      fields[k] = encodeValue(v);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`cannot encode ${typeof x}`);
}

/**
 * Every document in a collection, following pagination.
 * @returns {Promise<Array<{id: string, data: Record<string, any>}>>}
 */
export async function listDocuments(projectId, collection, { mask } = {}) {
  const out = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ pageSize: "300" });
    if (pageToken) params.set("pageToken", pageToken);
    for (const f of mask ?? []) params.append("mask.fieldPaths", f);
    const res = await call(
      `${FIRESTORE}/projects/${projectId}/databases/(default)/documents/${collection}?${params}`
    );
    const json = await res.json();
    for (const doc of json.documents ?? []) {
      out.push({ id: doc.name.split("/").pop(), data: decodeFields(doc.fields ?? {}) });
    }
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

/** Patch specific fields on one document, leaving everything else untouched. */
export async function patchDocument(projectId, collection, id, patch) {
  const params = new URLSearchParams();
  for (const key of Object.keys(patch)) params.append("updateMask.fieldPaths", key);
  const fields = {};
  for (const [k, v] of Object.entries(patch)) fields[k] = encodeValue(v);
  await call(
    `${FIRESTORE}/projects/${projectId}/databases/(default)/documents/${collection}/${id}?${params}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
}

/* -------------------------------- Storage --------------------------------- */

export async function downloadObject(bucket, path) {
  const res = await call(`${STORAGE}/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`);
  return Buffer.from(await res.arrayBuffer());
}

export async function objectExists(bucket, path) {
  const res = await fetch(`${STORAGE}/b/${bucket}/o/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  return res.ok;
}

export async function patchObjectMetadata(bucket, path, metadata) {
  await call(`${STORAGE}/b/${bucket}/o/${encodeURIComponent(path)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
}

/**
 * Upload an object and return the Firebase-style public download URL. A
 * firebaseStorageDownloadTokens value is minted so the URL matches the shape the
 * rest of the catalog already stores.
 */
export async function uploadObject(bucket, path, buffer, { contentType, cacheControl }) {
  const downloadToken = crypto.randomUUID();
  const boundary = `bnd${crypto.randomUUID().replace(/-/g, "")}`;
  const meta = {
    name: path,
    contentType,
    cacheControl,
    metadata: { firebaseStorageDownloadTokens: downloadToken },
  };
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        meta
      )}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  await call(`${STORAGE_UPLOAD}/b/${bucket}/o?uploadType=multipart`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    path
  )}?alt=media&token=${downloadToken}`;
}
