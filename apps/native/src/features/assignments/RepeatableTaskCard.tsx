import { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Text } from "../../components/Text";
import { ProgressButton } from "./TaskCardButton";
import type { DayTaskTemplate, FieldTemplate } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";
import type { TaskInstanceWithResponses } from "../../hooks/useTaskInstances";

interface RepeatableTaskCardProps {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instances: TaskInstanceWithResponses[];
  assignment: AssignmentWithTemplates;
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateInstance: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => Promise<void>;
  index: number;
}

export function RepeatableTaskCard({
  template,
  instances,
  assignment,
  onSelectTask,
  onCreateInstance,
  index,
}: RepeatableTaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const completedCount = instances.filter((i) => i.status === "completed").length;
  const totalCount = instances.length;

  const lastInstance = instances[instances.length - 1];
  const isAssignmentComplete = assignment.status === "completed";
  const canAddAnother = !isAssignmentComplete && (instances.length === 0 || lastInstance?.status === "completed");

  const handleAddAnother = async () => {
    if (!canAddAnother) {
      Alert.alert(
        "Instancia Incompleta",
        "Completa la instancia actual para agregar otra"
      );
      return;
    }
    if (isCreating) return;
    setIsCreating(true);
    try {
      const nextNumber = totalCount + 1;
      const label = `${template.taskTemplateName} #${nextNumber}`;
      await onCreateInstance(template, assignment.serverId, label);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectInstance = (instance: TaskInstanceWithResponses) => {
    onSelectTask(instance.clientId, template, assignment.serverId);
  };

  const getInstanceLabel = (instance: TaskInstanceWithResponses, idx: number): string => {
    return instance.instanceLabel || `${template.taskTemplateName} #${idx + 1}`;
  };

  const inputFields = template.fields.filter((f) => f.fieldType !== "displayText");
  const totalFields = inputFields.length;

  const requiredFields = inputFields.filter((f) => f.isRequired);

  const getInstanceProgress = (instance: TaskInstanceWithResponses): { progress: number; hasResponses: boolean; isCompleted: boolean; isRequiredComplete: boolean } => {
    const isCompleted = instance.status === "completed";
    const answeredFields = inputFields.filter((field) => {
      const response = instance.responses.find(
        (r) => r.fieldTemplateServerId === field.serverId
      );
      return response?.value && response.value.trim() !== "";
    }).length;
    const isRequiredComplete = requiredFields.length === 0 || requiredFields.every((field) => {
      const response = instance.responses.find(
        (r) => r.fieldTemplateServerId === field.serverId
      );
      return response?.value && response.value.trim() !== "";
    });
    const hasResponses = answeredFields > 0;
    const progress = isCompleted ? 1 : totalFields > 0 ? answeredFields / totalFields : 0;
    return { progress, hasResponses, isCompleted, isRequiredComplete };
  };

  const getButtonText = (instance: TaskInstanceWithResponses): string => {
    const { hasResponses, isCompleted } = getInstanceProgress(instance);
    if (isCompleted) return "Ver";
    return hasResponses ? "Continuar" : "Llenar";
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
          <View style={styles.headerTextContainer}>
            <Text style={styles.taskName}>{index}. {template.taskTemplateName}</Text>
            {template.description && (
              <Text style={styles.taskDescription} numberOfLines={1}>
                {template.description}
              </Text>
            )}
          </View>
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
            instances.map((instance, idx) => {
              const { progress, isCompleted, isRequiredComplete } = getInstanceProgress(instance);
              return (
                <TouchableOpacity
                  key={instance.clientId}
                  style={styles.instanceItem}
                  onPress={() => handleSelectInstance(instance)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.instanceLabel}>
                    {getInstanceLabel(instance, idx)}
                  </Text>
                  <ProgressButton
                    text={getButtonText(instance)}
                    progress={progress}
                    isCompleted={isCompleted}
                    isRequiredComplete={isRequiredComplete}
                    onPress={() => handleSelectInstance(instance)}
                  />
                </TouchableOpacity>
              );
            })
          )}

          {!isAssignmentComplete && (
            <TouchableOpacity
              onPress={handleAddAnother}
              disabled={isCreating || !canAddAnother}
              style={[
                styles.addButton,
                (isCreating || !canAddAnother) && styles.addButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.addButtonText,
                  (isCreating || !canAddAnother) && styles.addButtonTextDisabled,
                ]}
              >
                {isCreating ? "Creando..." : "+ Agregar Otra Instancia"}
              </Text>
            </TouchableOpacity>
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
    alignItems: "flex-start",
    flex: 1,
  },
  chevron: {
    fontSize: 10,
    color: "#6b7280",
    marginRight: 8,
    width: 12,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  taskDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  instanceLabel: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
    marginRight: 12,
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
});
