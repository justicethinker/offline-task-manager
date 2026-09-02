import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import type {
  ISyncQueueRepository,
  QueuedOperation,
  SyncOperation,
} from '../domain/sync-queue-repository';

import {
  CREATE_TASKS_TABLE,
  CREATE_TASKS_DUE_DATE_INDEX,
  CREATE_TASKS_PRIORITY_INDEX,
  CREATE_SYNC_QUEUE_TABLE,
} from './schema.sql';

const DB_NAME = 'offline-task-manager.db';

let db: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (!db) {
    db = await openDatabaseAsync(DB_NAME);
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(CREATE_TASKS_TABLE);
  await database.execAsync(CREATE_SYNC_QUEUE_TABLE);
  await database.execAsync(CREATE_TASKS_DUE_DATE_INDEX);
  await database.execAsync(CREATE_TASKS_PRIORITY_INDEX);
}

function rowToQueuedOperation(row: Record<string, unknown>): QueuedOperation {
  return {
    id: row.id as string,
    operation: row.operation as SyncOperation,
    payload: row.payload as string,
    createdAt: row.createdAt as string,
    attempts: row.attempts as number,
  };
}

export const SqliteSyncQueueRepository: ISyncQueueRepository = {
  async getAll() {
    const database = await getDb();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM sync_queue ORDER BY createdAt ASC',
    );
    return rows.map(rowToQueuedOperation);
  },

  async add(operation, payload) {
    const database = await getDb();
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const entry: QueuedOperation = {
      id,
      operation,
      payload,
      createdAt,
      attempts: 0,
    };

    await database.runAsync(
      'INSERT INTO sync_queue (id, operation, payload, createdAt, attempts) VALUES (?, ?, ?, ?, ?)',
      [entry.id, entry.operation, entry.payload, entry.createdAt, entry.attempts],
    );

    return entry;
  },

  async remove(id) {
    const database = await getDb();
    await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },

  async incrementAttempts(id) {
    const database = await getDb();
    await database.runAsync('UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?', [id]);
  },
};
