import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import {
  CREATE_TASKS_TABLE,
  CREATE_TASKS_DUE_DATE_INDEX,
  CREATE_TASKS_PRIORITY_INDEX,
  CREATE_SYNC_QUEUE_TABLE,
} from './schema.sql';

const DB_NAME = 'offline-task-manager.db';

let db: SQLiteDatabase | null = null;

async function runMigrations(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(CREATE_TASKS_TABLE);
  await database.execAsync(CREATE_SYNC_QUEUE_TABLE);
  await database.execAsync(CREATE_TASKS_DUE_DATE_INDEX);
  await database.execAsync(CREATE_TASKS_PRIORITY_INDEX);
}

export async function getDb(): Promise<SQLiteDatabase> {
  if (!db) {
    db = await openDatabaseAsync(DB_NAME);
    await runMigrations(db);
  }
  return db;
}
