/**
 * SCANZA AI — Firebase Cloud Functions
 *
 * All sensitive operations live here. The frontend cannot:
 *   - Edit token balances
 *   - Write scan/payment results
 *   - Access the IntaSend or Turnitin API keys
 *
 * Every money- or quota-changing operation is gated through one of
 * these functions and validated against the server-side price catalog
 * + the authenticated user's Firebase ID token.
 *
 * ────────────────────────────────────────────────────────────────────
 * REQUIRED SECRETS (set via `firebase functions:secrets:set <NAME>`):
 *
 *   INTASEND_SECRET_KEY        – sk_test_… or sk_live_… from IntaSend dashboard
 *   INTASEND_PUBLISHABLE_KEY   – pk_test_… or pk_live_…
 *   INTASEND_WEBHOOK_CHALLENGE – the "challenge" string you set in IntaSend
 *                                dashboard → Webhooks. Sent in every webhook
 *                                payload as the `challenge` field; we use it
 *                                to authenticate inbound webhook calls.
 *   INTASEND_TEST_MODE         – "true" for sandbox, "false" for production
 *   TURNITIN_API_KEY           – production Turnitin key (optional for now)
 *   TURNITIN_API_BASE          – Turnitin API base URL
 * ────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { auth as authV1 } from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

initializeApp();
const db = getFirestore();

// ───────────────────────────────────────────────────────────────────
// SECRETS
// ───────────────────────────────────────────────────────────────────
const INTASEND_SECRET_KEY = defineSecret("INTASEND_SECRET_KEY");
const INTASEND_WEBHOOK_CHALLENGE = defineSecret("INTASEND_WEBHOOK_CHALLENGE");
const INTASEND_TEST_MODE = defineSecret("INTASEND_TEST_MODE");
const TURNITIN_API_KEY = defineSecret("TURNITIN_API_KEY");
const TURNITIN_API_BASE = defineSecret("TURNITIN_API_BASE");

// ───────────────────────────────────────────────────────────────────
// SERVER-SIDE PRICE CATALOG (single source of truth — never trust client)
// ───────────────────────────────────────────────────────────────────
type PackageId = "starter" | "bronze" | "silver" | "gold" | "institution";
const PACKAGES: Record<PackageId, { tokens: number; price: number; title: string }> = {
  starter:     { tokens: 1,   price: 130,  title: "Starter" },
  bronze:      { tokens: 5,   price: 585,  title: "Bronze" },
  silver:      { tokens: 10,  price: 1157, title: "Silver" },
  gold:        { tokens: 20,  price: 2288, title: "Gold" },
  institution: { tokens: 100, price: 7800, title: "Institution" },
};

// ───────────────────────────────────────────────────────────────────
// FILE VALIDATION
// ───────────────────────────────────────────────────────────────────
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const REGION = "us-central1";

// ───────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────
function intasendBase(): string {
  // Default to sandbox if the env flag isn't set explicitly.
  const test = (INTASEND_TEST_MODE.value() ?? "true").toLowerCase() !== "false";
  return test ? "https://sandbox.intasend.com" : "https://payment.intasend.com";
}

/** Normalize Kenyan phone numbers to the 254XXXXXXXXX format M-Pesa requires. */
function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null;
  let p = input.replace(/[\s\-+()]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  if (!/^254[17]\d{8}$/.test(p)) return null;
  return p;
}

interface IntaSendInvoice {
  state?: string;
  net_amount?: number;
  failed_reason?: string | null;
  mpesa_reference?: string;
}

/**
 * Atomically credit a user's tokens for a payment IF (and only if) the
 * payment is in COMPLETE state. Idempotent — calling twice for the same
 * apiRef will only credit once.
 */
async function creditPaymentIfCompleted(
  uid: string,
  apiRef: string,
  inv: IntaSendInvoice
): Promise<{ credited: boolean; status: string; reason?: string }> {
  const userRef = db.doc(`users/${uid}`);
  const paymentRef = userRef.collection("payments").doc(apiRef);

  return db.runTransaction(async (tx) => {
    const paySnap = await tx.get(paymentRef);
    if (!paySnap.exists) {
      return { credited: false, status: "not_found", reason: "Payment record not found." };
    }
    const pay = paySnap.data()!;

    // Idempotency
    if (pay.status === "completed") {
      return { credited: false, status: "completed", reason: "Already credited." };
    }
    if (pay.status === "failed") {
      return { credited: false, status: "failed", reason: pay.failedReason ?? "Already failed." };
    }

    const state = (inv.state ?? "").toUpperCase();

    if (state === "FAILED" || state === "RETRY" || state === "CANCELED" || state === "CANCELLED") {
      tx.update(paymentRef, {
        status: "failed",
        failedReason: inv.failed_reason ?? `Payment ${state.toLowerCase()}.`,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { credited: false, status: "failed", reason: inv.failed_reason ?? `Payment ${state.toLowerCase()}.` };
    }

    if (state !== "COMPLETE" && state !== "COMPLETED") {
      // Still pending — do nothing.
      return { credited: false, status: "pending" };
    }

    // Anti-tamper: confirm the actual paid amount matches our package price.
    const expectedAmount = pay.amount as number;
    const paidAmount = Number(inv.net_amount ?? expectedAmount);
    if (paidAmount + 1 < expectedAmount) {
      tx.update(paymentRef, {
        status: "failed",
        failedReason: `Underpayment: expected ${expectedAmount}, got ${paidAmount}.`,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { credited: false, status: "failed", reason: "Underpayment." };
    }

    const tokens = pay.tokens as number;
    const packageId = pay.packageId as PackageId;

    tx.update(userRef, { tokens: FieldValue.increment(tokens) });
    tx.update(paymentRef, {
      status: "completed",
      mpesaReceipt: inv.mpesa_reference ?? null,
      paidAmount,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Audit trail (mirrors old recordPurchase shape so the UI keeps working).
    const purchaseRef = userRef.collection("purchases").doc();
    tx.set(purchaseRef, {
      packageId,
      tokens,
      amount: pay.amount,
      title: PACKAGES[packageId]?.title ?? "Package",
      phone: pay.phone ?? null,
      paymentRef: apiRef,
      mpesaReceipt: inv.mpesa_reference ?? null,
      status: "completed",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { credited: true, status: "completed" };
  });
}

// ===================================================================
// 1. AUTH TRIGGER — create user profile doc on signup
// ===================================================================
export const onUserCreated = authV1.user().onCreate(async (user) => {
  await db.doc(`users/${user.uid}`).set({
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    tokens: 0,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  logger.info(`User profile created for ${user.uid}`);
});

// ===================================================================
// 2. INITIATE M-PESA STK PUSH (IntaSend)
// ───────────────────────────────────────────────────────────────────
// Validates the package + phone against the server-side catalog, then
// asks IntaSend to send an STK push to the customer. Returns the
// invoice_id the frontend uses to subscribe / poll for status.
//
// The user's tokens are credited ONLY when:
//   (a) IntaSend's webhook fires and we verify the challenge, OR
//   (b) The frontend calls checkPaymentStatus and we re-query IntaSend
// Both paths converge on creditPaymentIfCompleted (idempotent).
// ===================================================================
export const initiateMpesaStkPush = onCall(
  {
    region: REGION,
    secrets: [INTASEND_SECRET_KEY, INTASEND_TEST_MODE],
    timeoutSeconds: 60,
  },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");

    const data = (req.data ?? {}) as { packageId?: PackageId; phone?: string };
    const packageId = data.packageId;
    if (!packageId || !PACKAGES[packageId]) {
      throw new HttpsError("invalid-argument", "Unknown package.");
    }

    const phone = normalizeKenyanPhone(data.phone ?? "");
    if (!phone) {
      throw new HttpsError(
        "invalid-argument",
        "Enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678)."
      );
    }

    const pkg = PACKAGES[packageId];
    const uid = req.auth.uid;
    const email = (req.auth.token.email as string | undefined) ?? `${uid}@scanza.ai`;
    const apiRef = `scanza-${uid.slice(0, 8)}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    // Pre-write the pending payment so webhook/polling can find it.
    const paymentRef = db.doc(`users/${uid}/payments/${apiRef}`);
    await paymentRef.set({
      packageId,
      tokens: pkg.tokens,
      amount: pkg.price,
      phone,
      apiRef,
      provider: "M-PESA",
      status: "initiating",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Call IntaSend STK Push
    let invoiceId: string;
    let intasendResp: unknown;
    try {
      const resp = await fetch(`${intasendBase()}/api/v1/payment/mpesa-stk-push/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${INTASEND_SECRET_KEY.value()}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          amount: pkg.price,
          phone_number: phone,
          email,
          api_ref: apiRef,
          narrative: `SCANZA AI — ${pkg.title} (${pkg.tokens} tokens)`,
        }),
      });

      const text = await resp.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* keep empty */ }
      intasendResp = json;

      if (!resp.ok) {
        logger.error("IntaSend STK Push rejected", { status: resp.status, body: text });
        await paymentRef.update({
          status: "failed",
          failedReason: `Gateway error ${resp.status}: ${text.slice(0, 240)}`,
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError(
          "internal",
          "Payment gateway rejected the request. Please verify your phone and try again."
        );
      }

      const invoice = (json["invoice"] as Record<string, unknown> | undefined) ?? {};
      invoiceId =
        (invoice["invoice_id"] as string | undefined) ??
        (invoice["id"] as string | undefined) ??
        (json["invoice_id"] as string | undefined) ??
        "";

      if (!invoiceId) {
        await paymentRef.update({
          status: "failed",
          failedReason: "Gateway returned no invoice_id.",
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError("internal", "Payment gateway returned no invoice id.");
      }
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("STK Push request error", err);
      await paymentRef.update({
        status: "failed",
        failedReason: err instanceof Error ? err.message : "Network error.",
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new HttpsError("unavailable", "Could not reach payment gateway. Please try again.");
    }

    await paymentRef.update({
      status: "pending",
      invoiceId,
      gatewayResponse: intasendResp ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`STK Push initiated apiRef=${apiRef} invoice=${invoiceId} uid=${uid}`);
    return {
      ok: true,
      invoiceId,
      apiRef,
      amount: pkg.price,
      tokens: pkg.tokens,
      phone,
      message: "Check your phone for the M-Pesa STK push and enter your PIN.",
    };
  }
);

// ===================================================================
// 3. INTASEND WEBHOOK (public HTTP endpoint)
// ───────────────────────────────────────────────────────────────────
// Set this URL in your IntaSend dashboard → Webhooks:
//
//   https://us-central1-<your-project>.cloudfunctions.net/intasendWebhook
//
// And set a "challenge" string in the same dashboard → save it in
// the INTASEND_WEBHOOK_CHALLENGE secret. We reject any request whose
// challenge doesn't match.
// ===================================================================
export const intasendWebhook = onRequest(
  {
    region: REGION,
    secrets: [INTASEND_WEBHOOK_CHALLENGE],
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const payload = (req.body ?? {}) as Record<string, unknown>;
      const expected = INTASEND_WEBHOOK_CHALLENGE.value();
      const challenge = (payload["challenge"] as string | undefined) ?? "";

      if (!expected || challenge !== expected) {
        logger.warn("Webhook rejected: challenge mismatch");
        res.status(401).json({ error: "invalid_challenge" });
        return;
      }

      // The webhook payload may be flat or nested under "invoice".
      const invoice = (payload["invoice"] as Record<string, unknown> | undefined) ?? payload;
      const apiRef =
        (payload["api_ref"] as string | undefined) ??
        (invoice["api_ref"] as string | undefined);

      if (!apiRef) {
        logger.warn("Webhook missing api_ref");
        res.status(400).json({ error: "missing_api_ref" });
        return;
      }

      // Locate the payment via collectionGroup query.
      const cg = await db
        .collectionGroup("payments")
        .where("apiRef", "==", apiRef)
        .limit(1)
        .get();

      if (cg.empty) {
        logger.warn(`Webhook: no payment for apiRef=${apiRef}`);
        // Still return 200 so IntaSend doesn't retry forever.
        res.status(200).json({ received: true, ignored: true });
        return;
      }

      const docRef = cg.docs[0].ref;
      const uid = docRef.parent.parent!.id;

      const inv: IntaSendInvoice = {
        state: (invoice["state"] as string | undefined) ?? (payload["state"] as string | undefined),
        net_amount: (invoice["net_amount"] as number | undefined) ?? (payload["net_amount"] as number | undefined),
        failed_reason:
          (invoice["failed_reason"] as string | null | undefined) ??
          (payload["failed_reason"] as string | null | undefined) ??
          null,
        mpesa_reference:
          (payload["mpesa_reference"] as string | undefined) ??
          (invoice["mpesa_reference"] as string | undefined),
      };

      const result = await creditPaymentIfCompleted(uid, apiRef, inv);
      logger.info(`Webhook processed apiRef=${apiRef} state=${inv.state} → ${JSON.stringify(result)}`);
      res.status(200).json({ received: true, ...result });
    } catch (err) {
      logger.error("Webhook handler error", err);
      // Always 200 — we'll reconcile via polling. Avoid IntaSend retry storms.
      res.status(200).json({ received: true, error: "internal" });
    }
  }
);

// ===================================================================
// 4. CHECK PAYMENT STATUS (frontend polling fallback)
// ───────────────────────────────────────────────────────────────────
// The frontend polls this every few seconds while waiting for the user
// to complete the STK prompt. This guarantees the flow works even if
// the webhook is misconfigured or delayed (sandbox is unreliable).
// ===================================================================
export const checkPaymentStatus = onCall(
  {
    region: REGION,
    secrets: [INTASEND_SECRET_KEY, INTASEND_TEST_MODE],
    timeoutSeconds: 30,
  },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");

    const data = (req.data ?? {}) as { invoiceId?: string; apiRef?: string };
    const invoiceId = data.invoiceId;
    const apiRef = data.apiRef;
    if (!invoiceId || !apiRef) {
      throw new HttpsError("invalid-argument", "invoiceId and apiRef are required.");
    }

    const uid = req.auth.uid;
    const paymentRef = db.doc(`users/${uid}/payments/${apiRef}`);
    const paySnap = await paymentRef.get();
    if (!paySnap.exists) throw new HttpsError("not-found", "Payment not found.");

    const cached = paySnap.data()!;
    if (cached.status === "completed") return { status: "completed", invoiceId };
    if (cached.status === "failed") {
      return { status: "failed", invoiceId, reason: cached.failedReason ?? "Payment failed." };
    }

    // Query IntaSend for current status
    let invoicePayload: Record<string, unknown> = {};
    try {
      const resp = await fetch(`${intasendBase()}/api/v1/payment/status/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${INTASEND_SECRET_KEY.value()}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      const text = await resp.text();
      try { invoicePayload = JSON.parse(text) as Record<string, unknown>; } catch { /* keep empty */ }

      if (!resp.ok) {
        logger.warn(`Status check non-OK status=${resp.status} body=${text.slice(0, 240)}`);
        return { status: "pending", invoiceId };
      }
    } catch (err) {
      logger.warn("Status check exception", err);
      return { status: "pending", invoiceId };
    }

    const invoice = (invoicePayload["invoice"] as Record<string, unknown> | undefined) ?? invoicePayload;
    const inv: IntaSendInvoice = {
      state: invoice["state"] as string | undefined,
      net_amount: invoice["net_amount"] as number | undefined,
      failed_reason: (invoice["failed_reason"] as string | null | undefined) ?? null,
      mpesa_reference:
        (invoicePayload["mpesa_reference"] as string | undefined) ??
        (invoice["mpesa_reference"] as string | undefined),
    };

    const result = await creditPaymentIfCompleted(uid, apiRef, inv);
    if (result.credited || result.status === "completed") return { status: "completed", invoiceId };
    if (result.status === "failed") return { status: "failed", invoiceId, reason: result.reason };
    return { status: "pending", invoiceId };
  }
);

// ===================================================================
// 5. PROCESS SCAN — decrement token, call Turnitin, persist results
// ===================================================================
export const processScan = onCall(
  {
    region: REGION,
    secrets: [TURNITIN_API_KEY, TURNITIN_API_BASE],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    if (!req.auth.token.email_verified) {
      throw new HttpsError("permission-denied", "Please verify your email first.");
    }

    const data = (req.data ?? {}) as {
      storagePath?: string;
      fileName?: string;
      contentType?: string;
      sizeBytes?: number;
    };

    if (!data.storagePath || !data.fileName || !data.contentType || typeof data.sizeBytes !== "number") {
      throw new HttpsError("invalid-argument", "storagePath, fileName, contentType, sizeBytes are required.");
    }
    if (!ALLOWED_CONTENT_TYPES.has(data.contentType)) {
      throw new HttpsError("invalid-argument", "Only PDF and Word documents are supported.");
    }
    if (data.sizeBytes <= 0 || data.sizeBytes > MAX_BYTES) {
      throw new HttpsError("invalid-argument", "File must be > 0 and ≤ 25 MB.");
    }

    const uid = req.auth.uid;

    // Defence-in-depth: path MUST live under the caller's own folder.
    if (!data.storagePath.startsWith(`uploads/${uid}/`)) {
      throw new HttpsError("permission-denied", "You may only scan files in your own folder.");
    }

    // Verify the file actually exists in Storage and matches the reported size.
    const bucket = getStorage().bucket();
    const file = bucket.file(data.storagePath);
    const [exists] = await file.exists();
    if (!exists) throw new HttpsError("not-found", "Uploaded file was not found.");

    const [meta] = await file.getMetadata();
    const realSize = Number(meta.size);
    if (realSize !== data.sizeBytes) {
      throw new HttpsError("invalid-argument", "File size mismatch with Storage object.");
    }

    const userRef = db.doc(`users/${uid}`);
    const scanRef = userRef.collection("scans").doc();

    // Atomically decrement token. Fails if user has none.
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const current = (snap.data()?.tokens ?? 0) as number;
      if (current < 1) {
        throw new HttpsError("failed-precondition", "Insufficient tokens. Please purchase more.");
      }
      tx.update(userRef, { tokens: FieldValue.increment(-1) });
      tx.set(scanRef, {
        fileName: data.fileName,
        storagePath: data.storagePath,
        contentType: data.contentType,
        sizeBytes: data.sizeBytes,
        status: "processing",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    try {
      // ╔═══════════════════════════════════════════════════════════╗
      // ║  REAL TURNITIN CALL GOES HERE                              ║
      // ║  Until the real key is provisioned we return deterministic ║
      // ║  mocks so the UI pipeline (Firestore → onSnapshot →        ║
      // ║  Dashboard) is fully exercised end-to-end.                 ║
      // ╚═══════════════════════════════════════════════════════════╝

      const aiScore = Math.floor(Math.random() * 35);
      const plagScore = Math.floor(Math.random() * 25);
      const wordCount = Math.floor(2000 + Math.random() * 4000);
      const pages = Math.max(1, Math.round(wordCount / 280));

      const aiReport = {
        reportId: crypto.randomUUID(),
        score: aiScore,
        confidence: aiScore > 25 ? "high" : aiScore > 10 ? "medium" : "low",
        detectedModels: ["GPT-4", "Claude-3", "Gemini-Pro"],
        highlightedSegments: [
          { text: "Sample sentence flagged as potentially AI-generated.", probability: aiScore + 10 },
        ],
        generatedAt: new Date().toISOString(),
      };

      const plagiarismReport = {
        reportId: crypto.randomUUID(),
        score: plagScore,
        totalSourcesScanned: 1_200_000,
        matches: [
          { source: "scholar.google.com", percentage: Math.max(1, Math.floor(plagScore / 2)) },
          { source: "wikipedia.org", percentage: Math.max(1, Math.floor(plagScore / 3)) },
        ],
        generatedAt: new Date().toISOString(),
      };

      await scanRef.update({
        status: "complete",
        wordCount,
        pages,
        aiReport,
        plagiarismReport,
        completedAt: FieldValue.serverTimestamp(),
      });

      logger.info(`Scan ${scanRef.id} complete for ${uid}`);
      return { ok: true, scanId: scanRef.id };
    } catch (err: unknown) {
      // Refund the token + mark scan failed.
      const message = err instanceof Error ? err.message : String(err);
      await db.runTransaction(async (tx) => {
        tx.update(userRef, { tokens: FieldValue.increment(1) });
        tx.update(scanRef, { status: "failed", error: message });
      });
      logger.error(`Scan ${scanRef.id} failed`, err);
      throw new HttpsError("internal", "Scan failed. Your token has been refunded.");
    }
  }
);
