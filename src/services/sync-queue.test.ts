import * as Crypto from 'expo-crypto';

import { createInMemorySyncQueueRepository } from '../data/in-memory-sync-queue-repository';
import { createInMemoryTaskRepository } from '../data/in-memory-task-repository';
import type { ISyncQueueRepository } from '../domain/sync-queue-repository';
import type { Task } from '../domain/task';
import type { ITaskRepository } from '../domain/task-repository';

import { SyncQueueManager } from './sync-queue';

jest.mock('./mock-api', () => ({
  createTaskRemote: jest.fn(),
  updateTaskRemote: jest.fn(),
  deleteTaskRemote: jest.fn(),
}));

const mockApi = require('./mock-api') as {
  createTaskRemote: jest.Mock;
  updateTaskRemote: jest.Mock;
  deleteTaskRemote: jest.Mock;
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Crypto.randomUUID(),
    title: 'Test task',
    description: '',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

let taskRepo: ITaskRepository;
let syncRepo: ISyncQueueRepository;
let manager: SyncQueueManager;

beforeEach(() => {
  jest.clearAllMocks();
  taskRepo = createInMemoryTaskRepository();
  syncRepo = createInMemorySyncQueueRepository();
  manager = new SyncQueueManager(taskRepo, syncRepo);
});

describe('enqueue on offline', () => {
  it('adds operation to the queue', async () => {
    const task = makeTask();
    await manager.enqueueOnOffline('create', JSON.stringify(task));

    const queued = await syncRepo.getAll();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.operation).toBe('create');
  });
});

describe('flush', () => {
  it('processes operations in FIFO order and removes on success', async () => {
    mockApi.createTaskRemote.mockResolvedValue(undefined);
    mockApi.updateTaskRemote.mockResolvedValue(undefined);

    const task1 = makeTask({ title: 'First' });
    const task2 = makeTask({ title: 'Second' });
    await syncRepo.add('create', JSON.stringify(task1));
    await syncRepo.add('update', JSON.stringify(task2));

    await manager.flush();

    expect(mockApi.createTaskRemote).toHaveBeenCalledTimes(1);
    expect(mockApi.updateTaskRemote).toHaveBeenCalledTimes(1);
    expect(mockApi.createTaskRemote.mock.calls[0][0].title).toBe('First');
    expect(mockApi.updateTaskRemote.mock.calls[0][0].title).toBe('Second');

    const remaining = await syncRepo.getAll();
    expect(remaining).toHaveLength(0);
  });

  it('increments attempts and leaves operation queued on failure', async () => {
    mockApi.createTaskRemote.mockRejectedValue(new Error('Network error'));

    const task = makeTask();
    const entry = await syncRepo.add('create', JSON.stringify(task));

    await manager.flush();

    const remaining = await syncRepo.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(entry.id);
    expect(remaining[0]?.attempts).toBe(1);
  });

  it('handles delete operations via deleteTaskRemote', async () => {
    mockApi.deleteTaskRemote.mockResolvedValue(undefined);

    const task = makeTask();
    await syncRepo.add('delete', JSON.stringify(task));

    await manager.flush();

    expect(mockApi.deleteTaskRemote).toHaveBeenCalledWith(task.id);
    const remaining = await syncRepo.getAll();
    expect(remaining).toHaveLength(0);
  });
});
