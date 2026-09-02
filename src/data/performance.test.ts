import type { Task } from '../domain/task';
import type { ITaskRepository, PriorityFilter, SortField } from '../domain/task-repository';

import { createInMemoryTaskRepository } from './in-memory-task-repository';
import { createInMemorySyncQueueRepository } from './in-memory-sync-queue-repository';

let counter = 0;

function makeInput(overrides: { title?: string; priority?: Task['priority']; dueDate?: string } = {}) {
  counter++;
  return {
    title: overrides.title ?? `Task ${counter}`,
    priority: overrides.priority ?? ('low' as const),
    dueDate: overrides.dueDate ?? new Date(Date.now() + counter * 86400000).toISOString(),
  };
}

async function seedTasks(repo: ITaskRepository, count: number): Promise<Task[]> {
  const priorities: Task['priority'][] = ['low', 'medium', 'high'];
  const tasks: Task[] = [];
  for (let i = 0; i < count; i++) {
    const task = await repo.create(
      makeInput({ priority: priorities[i % 3] }),
    );
    tasks.push(task);
  }
  return tasks;
}

function ms(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

async function msAsync(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

// ── In-Memory Repository Benchmarks ────────────────────────────────

describe('Performance: in-memory task repository', () => {
  const SCALES = [500, 1000, 1500] as const;

  for (const count of SCALES) {
    describe(`${count} tasks`, () => {
      let repo: ITaskRepository;
      let tasks: Task[];

      beforeAll(async () => {
        counter = 0;
        repo = createInMemoryTaskRepository();
        tasks = await seedTasks(repo, count);
      });

      it('getAll (no sort, no filter)', async () => {
        const elapsed = await msAsync(async () => {
          await repo.getAll();
        });
        console.log(`  [${count}] getAll (unsorted):  ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(count * 0.1); // generous upper bound
      });

      it('getAll sorted by dueDate', async () => {
        const elapsed = await msAsync(async () => {
          await repo.getAll('dueDate');
        });
        console.log(`  [${count}] getAll (dueDate):    ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(count * 0.1);
      });

      it('getAll sorted by priority', async () => {
        const elapsed = await msAsync(async () => {
          await repo.getAll('priority');
        });
        console.log(`  [${count}] getAll (priority):   ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(count * 0.1);
      });

      it('getAll filtered by priority', async () => {
        const elapsed = await msAsync(async () => {
          await repo.getAll(undefined, 'high');
        });
        console.log(`  [${count}] getAll (filtered):   ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(count * 0.1);
      });

      it('getAll sorted + filtered', async () => {
        const elapsed = await msAsync(async () => {
          await repo.getAll('dueDate', 'medium');
        });
        console.log(`  [${count}] getAll (sorted+filtered): ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(count * 0.1);
      });

      it('getById (single lookup)', async () => {
        const target = tasks[Math.floor(count / 2)];
        const elapsed = await msAsync(async () => {
          await repo.getById(target!.id);
        });
        console.log(`  [${count}] getById:            ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(2);
      });

      it('create (single insert)', async () => {
        const elapsed = await msAsync(async () => {
          await repo.create(makeInput());
        });
        console.log(`  [${count}] create:             ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(5);
      });

      it('update (single update)', async () => {
        const target = tasks[Math.floor(count / 2)];
        const elapsed = await msAsync(async () => {
          await repo.update(target!.id, { title: 'Updated' });
        });
        console.log(`  [${count}] update:             ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(5);
      });

      it('toggleComplete (single toggle)', async () => {
        const target = tasks[Math.floor(count / 2)];
        const elapsed = await msAsync(async () => {
          await repo.toggleComplete(target!.id);
        });
        console.log(`  [${count}] toggleComplete:     ${elapsed.toFixed(2)}ms`);
        expect(elapsed).toBeLessThan(5);
      });
    });
  }
});

// ── Sync Queue Benchmarks ──────────────────────────────────────────

jest.mock('../services/mock-api', () => ({
  createTaskRemote: jest.fn().mockResolvedValue(undefined),
  updateTaskRemote: jest.fn().mockResolvedValue(undefined),
  deleteTaskRemote: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SyncQueueManager } = require('../services/sync-queue');

describe('Performance: sync queue flush', () => {
  const SCALES = [500, 1000, 1500] as const;

  for (const count of SCALES) {
    describe(`${count} queued operations`, () => {
      it('flush processes all entries', async () => {
        const syncRepo = createInMemorySyncQueueRepository();
        const taskRepo = createInMemoryTaskRepository();
        const manager = new SyncQueueManager(taskRepo, syncRepo);

        // Seed tasks and enqueue a create for each
        for (let i = 0; i < count; i++) {
          const task = await taskRepo.create(makeInput());
          await syncRepo.add('create', JSON.stringify(task));
        }

        const elapsed = await msAsync(async () => {
          await manager.flush();
        });

        const remaining = await syncRepo.getAll();
        console.log(`  [${count}] flush:              ${elapsed.toFixed(2)}ms (${remaining.length} remaining)`);
        expect(remaining).toHaveLength(0);
      });
    });
  }
});
