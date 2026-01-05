import { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Text } from "../../components/Text";
import type { DayTaskTemplate, FieldTemplate, TaskInstance } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";

interface RepeatableTaskCardProps {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instances: TaskInstance[];
  assignment: AssignmentWithTemplates;
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => void;
  index: number;
}

export function RepeatableTaskCard({
  template,
  instances,
  assignment,
  onSelectTask,
  onCreateAndSelectTask,
  index,
}: RepeatableTaskCardProps) {

  const [isExpanded, setIsExpanded] = useState(false);

  const completedCount = instances.filter((i) => i.status === "completed").length;
  const totalCount = instances.length;

  const lastInstance = instances[instances.length - 1];
  const canAddAnother = instances.length === 0 || lastInstance?.status === "completed";

  const handleAddAnother = () => {
    const nextNumber = totalCount + 1;
    const label = `${template.taskTemplateName} #${nextNumber}`;
    onCreateAndSelectTask(template, assignment.serverId, label);
  };

  const handleSelectInstance = (instance: TaskInstance) => {
    onSelectTask(instance.clientId, template, assignment.serverId);
  };

  const getInstanceLabel = (instance: TaskInstance, index: number): string => {
    return instance.instanceLabel || `${template.taskTemplateName} #${index + 1}`;
  };

  const getStatusDisplay = (status: string): { type: "icon" | "text"; value: string; color: string } => {
    switch (status) {
      case "completed":
        return { type: "icon", value: "●", color: "#6b7280" };
      default:
        return { type: "text", value: "Llenar", color: "#2563eb" };
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.header}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.chevron}>{isExpanded ? "▼" : "▶"}</Text>
          <Text style={styles.taskName}>{index}. {template.taskTemplateName}</Text>
        </View>
        <View style={styles.headerBadges}>
          <Text style={styles.repeatableIcon}>↻</Text>
          <Text style={styles.countText}>
            {completedCount}/{totalCount}
          </Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.instanceList}>
          {instances.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No hay instancias todavía
              </Text>
            </View>
          ) : (
            instances.map((instance, index) => {
              const statusDisplay = getStatusDisplay(instance.status);
              return (
                <Pressable
                  key={instance.clientId}
                  onPress={() => handleSelectInstance(instance)}
                  style={({ pressed }) => [
                    styles.instanceItem,
                    pressed && styles.instanceItemPressed,
                  ]}
                >
                  <Text style={styles.instanceLabel}>
                    {getInstanceLabel(instance, index)}
                  </Text>
                  {statusDisplay.type === "icon" ? (
                    <Text style={[styles.statusIcon, { color: statusDisplay.color }]}>
                      {statusDisplay.value}
                    </Text>
                  ) : (
                    <View style={styles.textButton}>
                      <Text style={styles.textButtonLabel}>{statusDisplay.value}</Text>
                      <Text style={styles.textButtonChevron}>›</Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}

          <TouchableOpacity
            onPress={handleAddAnother}
            disabled={!canAddAnother}
            style={[
              styles.addButton,
              !canAddAnother && styles.addButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.addButtonText,
                !canAddAnother && styles.addButtonTextDisabled,
              ]}
            >
              + Agregar Otra Instancia
            </Text>
          </TouchableOpacity>
          {!canAddAnother && (
            <Text style={styles.helperText}>
              Completa la instancia actual para agregar otra
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chevron: {
    fontSize: 10,
    color: "#6b7280",
    marginRight: 8,
    width: 12,
  },
  taskName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    marginLeft: 8,
  },
  repeatableIcon: {
    fontSize: 14,
    color: "#6b7280",
  },
  countText: {
    fontSize: 12,
    color: "#6b7280",
  },
  instanceList: {
    backgroundColor: "#ffffff",
  },
  emptyState: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  instanceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  instanceItemPressed: {
    backgroundColor: "#f3f4f6",
  },
  instanceLabel: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  textButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563eb",
  },
  textButtonChevron: {
    fontSize: 18,
    fontWeight: "300",
    color: "#2563eb",
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 32,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 13,
    color: "#2563eb",
  },
  addButtonTextDisabled: {
    color: "#9ca3af",
  },
  helperText: {
    fontSize: 11,
    color: "#9ca3af",
    paddingLeft: 32,
    paddingBottom: 8,
  },
});
