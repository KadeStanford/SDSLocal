import * as SQLite from 'expo-sqlite';

import type { PendingScan } from './offline-scan-queue';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync('sds-local-offline.db');
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pending_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      action TEXT NOT NULL,
      purchase_amount_minor INTEGER,
      expected_business_id TEXT NOT NULL,
      scan_source TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export async function enqueuePendingScan(scan: Omit<PendingScan, 'id'>) {
  const db = await database();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO pending_scans
      (token, action, purchase_amount_minor, expected_business_id, scan_source, idempotency_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    scan.token,
    scan.action,
    scan.purchaseAmountMinor,
    scan.expectedBusinessId,
    scan.scanSource,
    scan.idempotencyKey,
    scan.createdAt,
  );
  return result.lastInsertRowId || null;
}

export async function listPendingScans(businessId?: string) {
  const db = await database();
  const rows = businessId
    ? await db.getAllAsync<PendingScan>(
        `SELECT id, token, action, purchase_amount_minor AS purchaseAmountMinor,
          expected_business_id AS expectedBusinessId, scan_source AS scanSource,
          idempotency_key AS idempotencyKey, created_at AS createdAt
         FROM pending_scans WHERE expected_business_id = ? ORDER BY id ASC`,
        businessId,
      )
    : await db.getAllAsync<PendingScan>(
        `SELECT id, token, action, purchase_amount_minor AS purchaseAmountMinor,
          expected_business_id AS expectedBusinessId, scan_source AS scanSource,
          idempotency_key AS idempotencyKey, created_at AS createdAt
         FROM pending_scans ORDER BY id ASC`,
      );
  return rows;
}

export async function removePendingScan(id: number) {
  const db = await database();
  await db.runAsync('DELETE FROM pending_scans WHERE id = ?', id);
}

export async function clearPendingScans() {
  const db = await database();
  await db.runAsync('DELETE FROM pending_scans');
}
