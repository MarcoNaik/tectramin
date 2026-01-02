import { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Text } from "../../components/Text";
import type { DayTaskTemplate, FieldTemplate, TaskInstance, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";

interface RepeatableTaskCardProps {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instances: TaskInstance[];
  assignment: AssignmentWithTemplates;
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => void;
}

export function RepeatableTaskCard({
  template,
  instances,
  assignment,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
}: RepeatableTaskCardProps) {
  console.log("[RepeatableTaskCard DEBUG] template:", template.taskTemplateName, "serverId:", template.serverId);
  console.log("[RepeatableTaskCard DEBUG] instances received:", instances.length, instances.map(i => ({ clientId: i.clientId, label: i.instanceLabel })));

  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = instances.filter((i) => i.status === "completed").length;
  const totalCount = instances.length;

  const lastInstance = instances[instances.length - 1];
  const canAddAnother = instances.length === 0 || lastInstance?.status === "completed";

  const prerequisiteIds = allDependencies
    .filter((d) => d.dependentTaskServerId === template.serverId)
    .map((d) => d.prerequisiteTaskServerId);

  const handleAddAnother = () => {
    const nextNumber = totalCount + 1;
    const label = `${template.taskTemplateName} #${nextNumber}`;
    onCreateAndSelectTask(template, assignment.serverId, label);
  };

  const handleSelectInstance = (instance: TaskInstance) => {
    onSelectTask(instance.clientId, template);
  };

  const getInstanceLabel = (instance: TaskInstance, index: number): string => {
    return instance.instanceLabel || `${template.taskTemplateName} #${index + 1}`;
  };

  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case "completed":
        return { bg: "#d1fae5", text: "#059669" };
      case "draft":
        return { bg: "#fef3c7", text: "#d97706" };
      default:
        return { bg: "#e5e7eb", text: "#6b7280" };
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "completed":
        return "Completado";
      case "draft":
        return "En progreso";
      default:
        return status;
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
          <View style={styles.headerInfo}>
            <Text style={styles.taskName}>{template.taskTemplateName}</Text>
            <View style={styles.headerMeta}>
              <Text style={styles.fieldCount}>{template.fields.length}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerBadges}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={styles.repeatableBadge}>
            <Text style={styles.repeatableBadgeText}>Repetible</Text>
          </View>
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
              const statusColors = getStatusColor(instance.status);
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
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                      {getStatusLabel(instance.status)}
                    </Text>
                  </View>
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
  headerInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldCount: {
    fontSize: 12,
    color: "#6b7280",
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  repeatableBadge: {
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
  },
  repeatableBadgeText: {
    fontSize: 10,
    color: "#7c3aed",
    fontWeight: "500",
  },
  instanceList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  emptyState: {
    paddingVertical: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  instanceItemPressed: {
    backgroundColor: "#e5e7eb",
  },
  instanceLabel: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  addButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
  },
  addButtonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2563eb",
  },
  addButtonTextDisabled: {
    color: "#9ca3af",
  },
  helperText: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 6,
  },
});
