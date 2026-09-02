import * as Crypto from 'expo-crypto';

import type { Task } from '../domain/task';
import type { ITaskRepository, PriorityFilter, SortField } from '../domain/task-repository';

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 } as const;

export function createInMemoryTaskRepository(): ITaskRepository {
  const tasks: Map<string, Task> = new Map();

  return {
    async getAll(sort?: SortField, filter?: PriorityFilter) {
      let result = Array.from(tasks.values());

      if (filter) {
        result = result.filter((t) => t.priority === filter);
      }

      if (sort === 'dueDate') {
        result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      } else if (sort === 'priority') {
        result.sort(
          (a, b) => (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0),
        );
      } else {
        result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }

      return result;
    },

    async getById(id) {
      return tasks.get(id) ?? null;
    },

    async create(input) {
      const now = new Date().toISOString();
      const task: Task = {
        id: Crypto.randomUUID(),
        title: input.title,
        description: input.description ?? '',
        priority: input.priority,
        dueDate: input.dueDate,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
      tasks.set(task.id, task);
      return task;
    },

    async update(id, changes) {
      const existing = tasks.get(id);
      if (!existing) throw new Error(`Task ${id} not found`);
      const updated: Task = {
        ...existing,
        ...changes,
        description: changes.description ?? existing.description,
        updatedAt: new Date().toISOString(),
      };
      tasks.set(id, updated);
      return updated;
    },

    async delete(id) {
      tasks.delete(id);
    },

    async toggleComplete(id) {
      const existing = tasks.get(id);
      if (!existing) throw new Error(`Task ${id} not found`);
      const updated: Task = {
        ...existing,
        completed: !existing.completed,
        updatedAt: new Date().toISOString(),
      };
      tasks.set(id, updated);
      return updated;
    },
  };
}
