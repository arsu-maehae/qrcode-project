// Shared type definitions for QR Check-in (Phase 2)

export type ScanAction = 'in' | 'out';

export interface QRCodeRecord {
  code: string;
  created_at?: string;
  meta?: any;
}

export interface ScanRecord {
  id?: number;
  code: string;
  action: ScanAction;
  scanned_at?: string;
  meta?: any;
}

export interface SessionRecord {
  id?: number;
  code: string;
  started_at: string;
  ended_at?: string | null;
  meta?: any;
}

export interface SummaryRow {
  uuid: string;
  createdAt: string | null;
  checkinAt: string | null;
  checkoutAt: string | null;
}

export interface SummaryPayload {
  totalCodes: number;
  totalCheckins: number;
  totalCheckouts: number;
  activeSessions: number;
  rows: SummaryRow[];
}

