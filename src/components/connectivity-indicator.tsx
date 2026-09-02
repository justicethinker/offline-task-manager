import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';

import { useTaskStore } from '../store/task-store';

export function ConnectivityIndicator() {
  const syncing = useTaskStore((s) => s.syncing);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    getNetworkStateAsync().then((state) => setIsConnected(state.isConnected ?? true));

    const sub = addNetworkStateListener((event) => {
      setIsConnected(event.isConnected ?? true);
    });

    return () => sub.remove();
  }, []);

  // Poll as a fallback — Android's onLost callback can be delayed
  // by 30+ seconds due to network validation probes. Pause while
  // backgrounded to avoid unnecessary battery drain.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        getNetworkStateAsync().then((state) => setIsConnected(state.isConnected ?? true));
      }, 5000);
    }

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    if (AppState.currentState === 'active') {
      startPolling();
    }

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, []);

  if (syncing) {
    return (
      <View style={[styles.bar, styles.syncing]}>
        <Text style={styles.text}>Syncing…</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={[styles.bar, styles.offline]}>
        <Text style={styles.text}>Offline</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  syncing: {
    backgroundColor: '#fef3c7',
  },
  offline: {
    backgroundColor: '#fee2e2',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
