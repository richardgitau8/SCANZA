// SCANZA AI — User data service (Firestore-backed)
//
// All data lives under /users/{uid}. The client only READS — every
// mutation goes through a Cloud Function (see scanService.ts).

import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Shapes that mirror what Cloud Functions write ────────────────
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  tokens: number;
  createdAt?: Date;
}

export interface AIReportData {
  reportId: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  detectedModels: string[];
  highlightedSegments: { text: string; probability: number }[];
  generatedAt: string;
}

export interface PlagiarismReportData {
  reportId: string;
  score: number;
  totalSourcesScanned: number;
  matches: { source: string; percentage: number; url?: string }[];
  generatedAt: string;
}

export interface ScanRecord {
  id: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  status: 'processing' | 'complete' | 'failed';
  wordCount?: number;
  pages?: number;
  aiReport?: AIReportData;
  plagiarismReport?: PlagiarismReportData;
  error?: string;
  createdAt?: Date;
  completedAt?: Date;
}

export interface PurchaseRecord {
  id: string;
  packageId: string;
  tokens: number;
  amount: number;
  title: string;
  status: 'pending' | 'completed' | 'failed';
  mpesaReceipt: string | null;
  phone: string | null;
  createdAt?: Date;
}

export interface PaymentRecord {
  id: string;
  packageId: string;
  tokens: number;
  amount: number;
  phone: string;
  apiRef: string;
  invoiceId?: string;
  status: 'initiating' | 'pending' | 'completed' | 'failed';
  failedReason?: string;
  mpesaReceipt?: string | null;
  paidAmount?: number;
  createdAt?: Date;
  completedAt?: Date;
  updatedAt?: Date;
}

const tsToDate = (v: unknown): Date | undefined =>
  v instanceof Timestamp ? v.toDate() : undefined;

// ─── Real-time subscriptions ──────────────────────────────────────
export function subscribeToUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const d = snap.data();
      cb({
        uid: snap.id,
        email: (d.email as string) ?? '',
        displayName: (d.displayName as string) ?? '',
        tokens: typeof d.tokens === 'number' ? d.tokens : 0,
        createdAt: tsToDate(d.createdAt),
      });
    },
    (err) => {
      // Most common cause: rules deny (e.g., email not verified yet).
      console.warn('user profile subscription error:', err.code);
      cb(null);
    }
  );
}

export function subscribeToScans(
  uid: string,
  cb: (scans: ScanRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'scans'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const scans: ScanRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fileName: (data.fileName as string) ?? 'untitled',
          storagePath: (data.storagePath as string) ?? '',
          contentType: (data.contentType as string) ?? '',
          sizeBytes: (data.sizeBytes as number) ?? 0,
          status: (data.status as ScanRecord['status']) ?? 'processing',
          wordCount: data.wordCount as number | undefined,
          pages: data.pages as number | undefined,
          aiReport: data.aiReport as AIReportData | undefined,
          plagiarismReport: data.plagiarismReport as PlagiarismReportData | undefined,
          error: data.error as string | undefined,
          createdAt: tsToDate(data.createdAt),
          completedAt: tsToDate(data.completedAt),
        };
      });
      cb(scans);
    },
    (err) => {
      console.warn('scans subscription error:', err.code);
      cb([]);
    }
  );
}

/**
 * Real-time listener on a single payment record. Used by the M-Pesa
 * checkout flow to react instantly when the IntaSend webhook flips
 * the status from `pending` → `completed` / `failed`.
 */
export function subscribeToPayment(
  uid: string,
  apiRef: string,
  cb: (payment: PaymentRecord | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'payments', apiRef),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const d = snap.data();
      cb({
        id: snap.id,
        packageId: (d.packageId as string) ?? '',
        tokens: (d.tokens as number) ?? 0,
        amount: (d.amount as number) ?? 0,
        phone: (d.phone as string) ?? '',
        apiRef: (d.apiRef as string) ?? snap.id,
        invoiceId: d.invoiceId as string | undefined,
        status: (d.status as PaymentRecord['status']) ?? 'pending',
        failedReason: d.failedReason as string | undefined,
        mpesaReceipt: (d.mpesaReceipt as string | null | undefined) ?? null,
        paidAmount: d.paidAmount as number | undefined,
        createdAt: tsToDate(d.createdAt),
        completedAt: tsToDate(d.completedAt),
        updatedAt: tsToDate(d.updatedAt),
      });
    },
    (err) => {
      console.warn('payment subscription error:', err.code);
      cb(null);
    }
  );
}

export function subscribeToPurchases(
  uid: string,
  cb: (purchases: PurchaseRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'purchases'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const purchases: PurchaseRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          packageId: (data.packageId as string) ?? '',
          tokens: (data.tokens as number) ?? 0,
          amount: (data.amount as number) ?? 0,
          title: (data.title as string) ?? '',
          status: (data.status as PurchaseRecord['status']) ?? 'completed',
          mpesaReceipt: (data.mpesaReceipt as string | null) ?? null,
          phone: (data.phone as string | null) ?? null,
          createdAt: tsToDate(data.createdAt),
        };
      });
      cb(purchases);
    },
    (err) => {
      console.warn('purchases subscription error:', err.code);
      cb([]);
    }
  );
}
