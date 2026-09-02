import { create } from 'zustand';

import { SqliteSyncQueueRepository } from '../data/sqlite-sync-queue-repository';
import { SqliteTaskRepository } from '../data/sqlite-task-repository';
import type { ISyncQueueRepository } from '../domain/sync-queue-repository';
import type { Task, TaskInput } from '../domain/task';
import type { ITaskRepository, PriorityFilter, SortField } from '../domain/task-repository';
import { SyncQueueManager } from '../services/sync-queue';

const MAX_SYNC_ATTEMPTS = 5;

const taskRepo: ITaskRepository = SqliteTaskRepository;
const syncRepo: ISyncQueueRepository = SqliteSyncQueueRepository;
const syncManager = new SyncQueueManager(taskRepo, syncRepo);

interface TaskState {
  tasks: Task[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  sortBy: SortField | undefined;
  filterBy: PriorityFilter | undefined;
  unsyncedIds: Set<string>;
  pendingSyncIds: Set<string>;

  loadTasks: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<void>;
  editTask: (id: string, changes: Partial<TaskInput>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  flushSync: () => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  startSync: () => Promise<void>;
  setSortBy: (sort: SortField | undefined) => void;
  setFilterBy: (filter: PriorityFilter | undefined) => void;
}

async function detectSyncStatus(): Promise<{
  unsyncedIds: Set<string>;
  pendingSyncIds: Set<string>;
}> {
  const queued = await syncRepo.getAll();
  const unsyncedIds = new Set<string>();
  const pendingSyncIds = new Set<string>();
  for (const entry of queued) {
    const task = JSON.parse(entry.payload) as Task;
    pendingSyncIds.add(task.id);
    if (entry.attempts >= MAX_SYNC_ATTEMPTS) {
      unsyncedIds.add(task.id);
    }
  }
  return { unsyncedIds, pendingSyncIds };
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  syncing: false,
  error: null,
  sortBy: undefined,
  filterBy: undefined,
  unsyncedIds: new Set(),
  pendingSyncIds: new Set(),

  async loadTasks() {
    set({ loading: true, error: null });
    try {
      const { sortBy, filterBy } = get();
      const tasks = await taskRepo.getAll(sortBy, filterBy);
      const { unsyncedIds, pendingSyncIds } = await detectSyncStatus();
      set({ tasks, unsyncedIds, pendingSyncIds, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  async addTask(input) {
    const optimistic: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? '',
      priority: input.priority,
      dueDate: input.dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({ tasks: [optimistic, ...state.tasks] }));

    const saved = await taskRepo.create(input);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === optimistic.id ? saved : t)),
    }));

    // Sync in background — don't block the UI or caller
    syncManager
      .handleMutation(saved, 'create')
      .then(() => {
        get().refreshSyncStatus();
      })
      .catch((e) => {
        console.error('[Store] background sync failed:', e);
      });
  },

  async editTask(id, changes) {
    const { tasks } = get();
    const previous = tasks.find((t) => t.id === id);
    if (!previous) return;

    const optimistic = { ...previous, ...changes, updatedAt: new Date().toISOString() };
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? optimistic : t)),
    }));

    const saved = await taskRepo.update(id, changes);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? saved : t)),
    }));

    syncManager
      .handleMutation(saved, 'update')
      .then(() => {
        get().refreshSyncStatus();
      })
      .catch((e) => {
        console.error('[Store] background sync failed:', e);
      });
  },

  async deleteTask(id) {
    const { tasks } = get();
    const previous = tasks.find((t) => t.id === id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));

    await taskRepo.delete(id);
    if (previous) {
      syncManager
        .handleMutation(previous, 'delete')
        .then(() => {
          get().refreshSyncStatus();
        })
        .catch((e) => {
          console.error('[Store] background sync failed:', e);
        });
    }
  },

  async toggleTask(id) {
    const { tasks } = get();
    const previous = tasks.find((t) => t.id === id);
    if (!previous) return;

    const optimistic = {
      ...previous,
      completed: !previous.completed,
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? optimistic : t)),
    }));

    const saved = await taskRepo.toggleComplete(id);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? saved : t)),
    }));

    syncManager
      .handleMutation(saved, 'toggle')
      .then(() => {
        get().refreshSyncStatus();
      })
      .catch((e) => {
        console.error('[Store] background sync failed:', e);
      });
  },

  async flushSync() {
    set({ syncing: true });
    try {
      await syncManager.flush();
    } finally {
      set({ syncing: false });
      await get().loadTasks();
    }
  },

  async refreshSyncStatus() {
    const { unsyncedIds, pendingSyncIds } = await detectSyncStatus();
    set({ unsyncedIds, pendingSyncIds });
  },

  async startSync() {
    await syncManager.startListening();
  },

  setSortBy(sort) {
    set({ sortBy: sort });
  },

  setFilterBy(filter) {
    set({ filterBy: filter });
  },
}));

export { syncManager };
