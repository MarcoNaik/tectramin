import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export function SyncStatusIcon() {
  const syncStatus = useSyncStatus();
  const isOnline = useNetworkStatus();

  if (!isOnline) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, styles.offline]} />
        <Text style={styles.text}>Sin conexión</Text>
      </View>
    );
  }

  if (syncStatus.state === "syncing") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.text}>Sincronizando</Text>
      </View>
    );
  }

  if (syncStatus.state === "error") {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, styles.error]} />
        <Text style={styles.text}>Error</Text>
      </View>
    );
  }

  if (syncStatus.pendingCount > 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, styles.pending]} />
        <Text style={styles.text}>{syncStatus.pendingCount} pendientes</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, styles.synced]} />
      <Text style={styles.text}>Sincronizado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  offline: {
    backgroundColor: "#6b7280",
  },
  synced: {
    backgroundColor: "#22c55e",
  },
  pending: {
    backgroundColor: "#f59e0b",
  },
  error: {
    backgroundColor: "#ef4444",
  },
  text: {
    fontSize: 12,
    color: "#6b7280",
  },
});
