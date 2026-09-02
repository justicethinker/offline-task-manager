import * as Crypto from 'expo-crypto';

import type {
  ISyncQueueRepository,
  QueuedOperation,
  SyncOperation,
} from '../domain/sync-queue-repository';

import { getDb } from './database';

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
