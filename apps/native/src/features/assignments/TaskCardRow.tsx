import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";
import { TaskCardButton } from "./TaskCardButton";
import { usePrerequisiteStatus } from "../../hooks/useTaskDependencies";
import type { DayTaskTemplate, FieldTemplate, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";
import type { TaskInstanceWithResponses } from "../../hooks/useTaskInstances";

interface TaskCardRowProps {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instance: TaskInstanceWithResponses | undefined;
  assignment: AssignmentWithTemplates;
  allTaskInstances: TaskInstanceWithResponses[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  index: number;
}

export function TaskCardRow({
  template,
  instance,
  assignment,
  allTaskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
  index,
}: TaskCardRowProps) {
  const isCompleted = instance?.status === "completed";
  const { canStart, blockingTasks } = usePrerequisiteStatus(
    template.serverId,
    assignment.serverId,
    allTaskInstances,
    allDependencies,
    assignment.taskTemplates
  );

  const handleRowPress = () => {
    if (!canStart && !isCompleted) {
      Alert.alert(
        "Tarea Bloqueada",
        `Completa primero: ${blockingTasks.join(", ")}`
      );
      return;
    }
    if (instance) {
      onSelectTask(instance.clientId, template, assignment.serverId);
    } else {
      onCreateAndSelectTask(template, assignment.serverId);
    }
  };

  return (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={handleRowPress}
      activeOpacity={0.7}
    >
      <View style={styles.taskCardContent}>
        <View style={styles.taskCardInfo}>
          <View style={styles.taskCardNameRow}>
            <Text style={styles.taskCardName}>
              {index}. {template.taskTemplateName}
            </Text>
            {template.isRequired && (
              <Text style={styles.requiredIcon}>*</Text>
            )}
          </View>
          {template.description && (
            <Text style={styles.taskCardDescription} numberOfLines={2}>
              {template.description}
            </Text>
          )}
        </View>
        <View style={styles.taskCardActions}>
          <TaskCardButton
            template={template}
            instance={instance}
            assignment={assignment}
            allTaskInstances={allTaskInstances}
            allDependencies={allDependencies}
            onSelectTask={onSelectTask}
            onCreateAndSelectTask={onCreateAndSelectTask}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  taskCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  taskCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  requiredIcon: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "700",
    marginLeft: 4,
  },
  taskCardDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  taskCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
