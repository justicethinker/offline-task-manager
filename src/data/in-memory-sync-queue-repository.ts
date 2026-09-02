import * as Crypto from 'expo-crypto';

import type { ISyncQueueRepository, QueuedOperation } from '../domain/sync-queue-repository';

export function createInMemorySyncQueueRepository(): ISyncQueueRepository {
  const entries: Map<string, QueuedOperation> = new Map();

  return {
    async getAll() {
      return Array.from(entries.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async add(operation, payload) {
      const entry: QueuedOperation = {
        id: Crypto.randomUUID(),
        operation,
        payload,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      entries.set(entry.id, entry);
      return entry;
    },

    async remove(id) {
      entries.delete(id);
    },

    async incrementAttempts(id) {
      const entry = entries.get(id);
      if (entry) {
        entry.attempts += 1;
      }
    },
  };
}
