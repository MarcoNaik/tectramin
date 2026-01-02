import {
  View,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";

export function EmptyDayState() {
  return (
    <View style={styles.emptyDayContainer}>
      <Text style={styles.emptyDayTitle}>Sin Asignaciones</Text>
      <Text style={styles.emptyDayText}>
        No tienes asignaciones programadas para este día.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyDayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyDayTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptyDayText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
