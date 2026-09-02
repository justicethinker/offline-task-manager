import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import type { Task } from '../domain/task';
import { PRIORITY_COLORS, PRIORITY_TEXT_COLORS } from '../utils/constants';

import { SyncStatusBadge } from './sync-status-badge';

interface TaskListItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
  isPendingSync: boolean;
}

function formatDueDate(iso: string): string {
  const date = new Date(iso);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function TaskListItemInner({ task, onToggle, onPress, isPendingSync }: TaskListItemProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onToggle(task.id)}
        style={[styles.checkbox, task.completed && styles.checkboxChecked]}
        accessibilityLabel={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>

      <Pressable style={styles.content} onPress={() => onPress(task.id)}>
        <Text style={[styles.title, task.completed && styles.titleCompleted]} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.badge, { backgroundColor: PRIORITY_COLORS[task.priority] }]}>
            <Text style={[styles.badgeText, { color: PRIORITY_TEXT_COLORS[task.priority] }]}>
              {task.priority}
            </Text>
          </View>
          <Text style={styles.dueDate}>{formatDueDate(task.dueDate)}</Text>
          <SyncStatusBadge isPending={isPendingSync} />
        </View>
      </Pressable>
    </View>
  );
}

export const TaskListItem = memo(TaskListItemInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  checkmark: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dueDate: {
    fontSize: 13,
    color: '#6b7280',
  },
});
