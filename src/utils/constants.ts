import type { Task } from '../domain/task';

export const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#f87171',
};

export const PRIORITY_TEXT_COLORS: Record<Task['priority'], string> = {
  low: '#14532d',
  medium: '#713f12',
  high: '#7f1d1d',
};
