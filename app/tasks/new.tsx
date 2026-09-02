import { useRouter } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskForm } from '@/src/components/task-form';
import type { TaskInput } from '@/src/domain/task';
import { useTaskStore } from '@/src/store/task-store';

export default function NewTaskScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addTask = useTaskStore((s) => s.addTask);

  async function handleSubmit(input: TaskInput) {
    await addTask(input);
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Task</Text>
      </View>
      <TaskForm onSubmit={handleSubmit} submitLabel="Create Task" />
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
});
