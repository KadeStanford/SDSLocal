import type { QueueKind } from './moderation-types';
export type BackupMode = 'off' | 'dry_run' | 'enabled';
export interface BackupPolicy {
  mode: BackupMode; missing_information: boolean; promotional_reviews: boolean;
  internal_flags: boolean; version: string; revision: string; updated_at: string;
}
export interface BackupEntry {
  kind: QueueKind; id: string; rule: string; action: 'flag' | 'hide' | 'request_info';
  reason: string; evidence: Record<string, number | string[]>; applied: boolean;
}
export interface BackupRun {
  request_id: string; mode: BackupMode; dry_run: boolean; version: string;
  scanned: number; applied: number; flagged: number; manual_overrides: number;
  entries: BackupEntry[]; replayed?: boolean; busy?: boolean;
}
export interface BackupStatus { policy: BackupPolicy; runs: BackupRun[]; handled: number; last_run_at?: string | null; worker_status?: 'not_seen'|'recent'|'stale' }
export interface BackupSettings {
  mode: BackupMode; missing: boolean; spam: boolean; flags: boolean;
  revision: string; requestId: string; reason: string;
}
