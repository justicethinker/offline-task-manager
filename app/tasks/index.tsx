import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectivityIndicator } from '@/src/components/connectivity-indicator';
import { TaskListItem } from '@/src/components/task-list-item';
import type { PriorityFilter, SortField } from '@/src/domain/task-repository';
import { useTaskStore } from '@/src/store/task-store';

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: 'Due Date', value: 'dueDate' },
  { label: 'Priority', value: 'priority' },
];

const FILTER_OPTIONS: { label: string; value: PriorityFilter | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export default function TaskListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const sortBy = useTaskStore((s) => s.sortBy);
  const filterBy = useTaskStore((s) => s.filterBy);
  const pendingSyncIds = useTaskStore((s) => s.pendingSyncIds);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const setSortBy = useTaskStore((s) => s.setSortBy);
  const setFilterBy = useTaskStore((s) => s.setFilterBy);
  const flushSync = useTaskStore((s) => s.flushSync);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [loadTasks, sortBy, filterBy]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await flushSync();
    setRefreshing(false);
  }, [flushSync]);

  const handleToggle = useCallback(
    (id: string) => {
      toggleTask(id);
    },
    [toggleTask],
  );

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/tasks/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof tasks)[number] }) => (
      <TaskListItem
        task={item}
        onToggle={handleToggle}
        onPress={handlePress}
        isPendingSync={pendingSyncIds.has(item.id)}
      />
    ),
    [handleToggle, handlePress, pendingSyncIds],
  );

  const keyExtractor = useCallback((item: (typeof tasks)[number]) => item.id, []);

  if (loading && tasks.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading tasks…</Text>
      </View>
    );
  }

  const hasActiveFilter = filterBy !== undefined;
  const isEmpty = tasks.length === 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Offline Task Manager</Text>
      </View>

      <ConnectivityIndicator />

      <View style={styles.controls}>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Sort</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSortBy(opt.value)}
                style={[styles.chip, sortBy === opt.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, sortBy === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Filter</Text>
          <View style={styles.chipRow}>
            {FILTER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setFilterBy(opt.value)}
                style={[styles.chip, filterBy === opt.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, filterBy === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {hasActiveFilter ? 'No matching tasks' : 'No tasks yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasActiveFilter
              ? 'Try adjusting the filter or sort options.'
              : 'Tap + to create your first task.'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={tasks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/tasks/new')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    width: 40,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  chipActive: {
    backgroundColor: '#6366f1',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    zIndex: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 30,
  },
});
