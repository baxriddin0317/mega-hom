/**
 * Shared credential bootstrap for the operator scripts.
 *
 * Two accepted sources:
 *   1. GOOGLE_APPLICATION_CREDENTIALS — path to a service-account JSON key
 *   2. Application Default Credentials — set up once with:
 *        gcloud auth application-default login --account=megahomeweb@gmail.com
 *
 * Note: a bare `gcloud auth print-access-token` is NOT enough. The Admin SDK's
 * Firestore client requires a certificate or ADC and rejects a plain bearer
 * token with `firestore/invalid-credential`.
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ADC_PATH = join(
  homedir(),
  ".config",
  "gcloud",
  "application_default_credentials.json"
);

const SETUP_HINT = `
No credentials found. Set up ONE of these, then re-run:

  gcloud auth application-default login --account=megahomeweb@gmail.com

  — or —

  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
  (Firebase Console → Project settings → Service accounts → Generate new private key)
`;

/**
 * @param {{projectId: string, storageBucket?: string}} options
 * @returns {{app: import("firebase-admin/app").App, via: string}}
 */
export function initAdmin({ projectId, storageBucket }) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (keyPath) {
    if (!existsSync(keyPath)) {
      console.error(`GOOGLE_APPLICATION_CREDENTIALS points at a missing file:\n  ${keyPath}`);
      process.exit(1);
    }
    return {
      app: initializeApp({
        credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))),
        projectId,
        storageBucket,
      }),
      via: `service account (${keyPath})`,
    };
  }

  if (!existsSync(ADC_PATH)) {
    console.error(SETUP_HINT);
    process.exit(1);
  }

  return {
    app: initializeApp({ credential: applicationDefault(), projectId, storageBucket }),
    via: "application default credentials",
  };
}
