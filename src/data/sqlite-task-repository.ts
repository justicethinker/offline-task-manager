import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import type { Task } from '../domain/task';
import type { ITaskRepository, PriorityFilter, SortField } from '../domain/task-repository';

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

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    priority: row.priority as Task['priority'],
    dueDate: row.dueDate as string,
    completed: (row.completed as number) === 1,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

function buildGetAllQuery(
  sort?: SortField,
  filter?: PriorityFilter,
): { sql: string; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filter) {
    conditions.push('priority = ?');
    params.push(filter);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = 'createdAt DESC';
  if (sort === 'dueDate') {
    orderBy = 'dueDate ASC';
  } else if (sort === 'priority') {
    orderBy = "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END";
  }

  return { sql: `SELECT * FROM tasks ${where} ORDER BY ${orderBy}`, params };
}

export const SqliteTaskRepository: ITaskRepository = {
  async getAll(sort, filter) {
    const database = await getDb();
    const { sql, params } = buildGetAllQuery(sort, filter);
    const rows = await database.getAllAsync<Record<string, unknown>>(sql, params);
    return rows.map(rowToTask);
  },

  async getById(id) {
    const database = await getDb();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM tasks WHERE id = ?',
      [id],
    );
    return row ? rowToTask(row) : null;
  },

  async create(input) {
    const database = await getDb();
    const now = new Date().toISOString();
    const id = Crypto.randomUUID();

    const task: Task = {
      id,
      title: input.title,
      description: input.description ?? '',
      priority: input.priority,
      dueDate: input.dueDate,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    await database.runAsync(
      `INSERT INTO tasks (id, title, description, priority, dueDate, completed, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.description,
        task.priority,
        task.dueDate,
        0,
        task.createdAt,
        task.updatedAt,
      ],
    );

    return task;
  },

  async update(id, changes) {
    const database = await getDb();
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    const now = new Date().toISOString();
    const updated: Task = {
      ...existing,
      ...changes,
      description: changes.description ?? existing.description,
      updatedAt: now,
    };

    await database.runAsync(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, dueDate = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updated.title,
        updated.description,
        updated.priority,
        updated.dueDate,
        updated.updatedAt,
        id,
      ],
    );

    return updated;
  },

  async delete(id) {
    const database = await getDb();
    await database.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  },

  async toggleComplete(id) {
    const database = await getDb();
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    const now = new Date().toISOString();
    const newCompleted = !existing.completed;

    await database.runAsync('UPDATE tasks SET completed = ?, updatedAt = ? WHERE id = ?', [
      newCompleted ? 1 : 0,
      now,
      id,
    ]);

    return { ...existing, completed: newCompleted, updatedAt: now };
  },
};
