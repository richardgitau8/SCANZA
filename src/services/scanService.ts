// SCANZA AI — Scan + Payment service
//
// Calls Cloud Functions for every action that costs money or quota.
// The IntaSend secret key and Turnitin API key never appear on the client.

import { httpsCallable } from 'firebase/functions';
import {
  ref as storageRef,
  uploadBytes,
  type UploadMetadata,
} from 'firebase/storage';
import { auth, functions, storage } from '../lib/firebase';

export type PackageId = 'starter' | 'bronze' | 'silver' | 'gold' | 'institution';

const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'doc'] as const;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export interface ScanSubmissionResult {
  ok: boolean;
  scanId: string;
}

export interface StkPushResult {
  ok: boolean;
  invoiceId: string;
  apiRef: string;
  amount: number;
  tokens: number;
  phone: string;
  message: string;
}

export interface PaymentStatusResult {
  status: 'pending' | 'completed' | 'failed';
  invoiceId: string;
  reason?: string;
}

// ───────────────────────────────────────────────────────────────────
// FILE VALIDATION (client-side; the server re-validates everything)
// ───────────────────────────────────────────────────────────────────
export function validateScanFile(file: File):
  | { ok: true }
  | { ok: false; reason: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ACCEPTED_EXTENSIONS.includes(ext as typeof ACCEPTED_EXTENSIONS[number])) {
    return { ok: false, reason: 'Only PDF and Word (.docx/.doc) files are supported.' };
  }
  if (file.type && !ACCEPTED_MIME_TYPES.has(file.type)) {
    return { ok: false, reason: 'Unsupported file type detected.' };
  }
  if (file.size <= 0) return { ok: false, reason: 'File is empty.' };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: 'File exceeds 25 MB limit.' };
  }
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────
// PHONE VALIDATION (matches the server-side regex)
// ───────────────────────────────────────────────────────────────────
export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null;
  let p = input.replace(/[\s\-+()]/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
  return /^254[17]\d{8}$/.test(p) ? p : null;
}

// ───────────────────────────────────────────────────────────────────
// UPLOAD + SCAN
// ───────────────────────────────────────────────────────────────────
export async function uploadAndScan(file: File): Promise<ScanSubmissionResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in.');
  if (!user.emailVerified) throw new Error('Please verify your email first.');

  const v = validateScanFile(file);
  if (!v.ok) throw new Error(v.reason);

  const contentType =
    file.type ||
    (file.name.endsWith('.pdf')
      ? 'application/pdf'
      : file.name.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/msword');

  const tempScanId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
  const path = `uploads/${user.uid}/${tempScanId}/${safeName}`;

  const meta: UploadMetadata = {
    contentType,
    customMetadata: { originalName: file.name },
  };
  await uploadBytes(storageRef(storage, path), file, meta);

  const callable = httpsCallable<
    { storagePath: string; fileName: string; contentType: string; sizeBytes: number },
    ScanSubmissionResult
  >(functions, 'processScan');

  const result = await callable({
    storagePath: path,
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
  });

  return result.data;
}

// ───────────────────────────────────────────────────────────────────
// INITIATE M-PESA STK PUSH (IntaSend, server-validated price + phone)
// ───────────────────────────────────────────────────────────────────
export async function initiateMpesaStkPush(
  packageId: PackageId,
  phone: string
): Promise<StkPushResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to make a payment.');

  const callable = httpsCallable<
    { packageId: PackageId; phone: string },
    StkPushResult
  >(functions, 'initiateMpesaStkPush');

  const result = await callable({ packageId, phone });
  return result.data;
}

// ───────────────────────────────────────────────────────────────────
// CHECK PAYMENT STATUS (frontend polls while waiting for STK PIN)
// ───────────────────────────────────────────────────────────────────
export async function checkPaymentStatus(
  invoiceId: string,
  apiRef: string
): Promise<PaymentStatusResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in.');

  const callable = httpsCallable<
    { invoiceId: string; apiRef: string },
    PaymentStatusResult
  >(functions, 'checkPaymentStatus');

  const result = await callable({ invoiceId, apiRef });
  return result.data;
}

/**
 * Poll checkPaymentStatus until the payment resolves to completed/failed,
 * with a max wait time. Returns the final status. Useful when a webhook
 * is unconfigured (sandbox / local dev).
 */
export async function waitForPaymentCompletion(
  invoiceId: string,
  apiRef: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<PaymentStatusResult> {
  const intervalMs = opts.intervalMs ?? 4000;
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const started = Date.now();

  // Wait a moment before the first poll so the user has time to enter PIN.
  await new Promise((r) => setTimeout(r, 5000));

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await checkPaymentStatus(invoiceId, apiRef);
      if (res.status === 'completed' || res.status === 'failed') return res;
    } catch (err) {
      // Transient errors — keep polling.
      if (import.meta.env.DEV) console.warn('Status poll error:', err);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: 'pending', invoiceId, reason: 'Timed out waiting for payment.' };
}
