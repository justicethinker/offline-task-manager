import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SyncStatusBadge } from '@/src/components/sync-status-badge';
import { useTaskStore } from '@/src/store/task-store';

function formatDueDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#f87171',
};

const PRIORITY_TEXT_COLORS: Record<string, string> = {
  low: '#14532d',
  medium: '#713f12',
  high: '#7f1d1d',
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((s) => s.tasks);
  const pendingSyncIds = useTaskStore((s) => s.pendingSyncIds);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const task = tasks.find((t) => t.id === id);

  function handleDelete() {
    Alert.alert('Delete task', `Are you sure you want to delete "${task!.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTask(task!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {task?.title ?? 'Task'}
        </Text>
      </View>

      {!task ? (
        <View style={styles.center}>
          <Text style={styles.notFound}>Task not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{task.title}</Text>
            <View style={styles.headerBadges}>
              <View style={[styles.badge, { backgroundColor: PRIORITY_COLORS[task.priority] }]}>
                <Text style={[styles.badgeText, { color: PRIORITY_TEXT_COLORS[task.priority] }]}>
                  {task.priority}
                </Text>
              </View>
              <SyncStatusBadge isPending={pendingSyncIds.has(task.id)} />
            </View>
          </View>

          {task.description ? <Text style={styles.description}>{task.description}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{formatDueDate(task.dueDate)}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{task.completed ? 'Completed' : 'Pending'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Created</Text>
            <Text style={styles.value}>{formatTimestamp(task.createdAt)}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Updated</Text>
            <Text style={styles.value}>{formatTimestamp(task.updatedAt)}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.toggleButton]}
              onPress={() => toggleTask(task.id)}
            >
              <Text style={styles.buttonText}>
                {task.completed ? 'Mark Incomplete' : 'Mark Complete'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.editButton]}
              onPress={() => router.push(`/tasks/${task.id}/edit`)}
            >
              <Text style={[styles.buttonText, styles.editButtonText]}>Edit</Text>
            </Pressable>

            <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
              <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    fontSize: 16,
    color: '#6b7280',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#475569',
  },
  editButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  editButtonText: {
    color: '#374151',
  },
  deleteButtonText: {
    color: '#dc2626',
  },
});
