import {
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";
import { usePrerequisiteStatus } from "../../hooks/useTaskDependencies";
import type { DayTaskTemplate, FieldTemplate, TaskInstance, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";

interface TaskCardButtonProps {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instance: { clientId: string; status: string } | undefined;
  assignment: AssignmentWithTemplates;
  allTaskInstances: TaskInstance[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
}

export function TaskCardButton({
  template,
  instance,
  assignment,
  allTaskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
}: TaskCardButtonProps) {
  const isCompleted = instance?.status === "completed";
  const { canStart, blockingTasks } = usePrerequisiteStatus(
    template.serverId,
    assignment.serverId,
    allTaskInstances,
    allDependencies,
    assignment.taskTemplates
  );

  const handlePress = () => {
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

  const isBlocked = !canStart && !isCompleted;

  const getButtonContent = () => {
    if (isCompleted) {
      return { text: "Ver", icon: "›" };
    }
    if (canStart) {
      return { text: "Llenar", icon: "›" };
    }
    return { text: "Bloqueado", icon: null };
  };

  const { text, icon } = getButtonContent();

  return (
    <TouchableOpacity
      style={styles.taskButton}
      onPress={handlePress}
    >
      <Text style={[styles.taskButtonText, isBlocked && styles.blockedButtonText]}>
        {text}
      </Text>
      {icon && (
        <Text style={[styles.chevron, isBlocked && styles.blockedButtonText]}>
          {icon}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskButton: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 2,
  },
  taskButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
  chevron: {
    color: "#2563eb",
    fontSize: 18,
    fontWeight: "300",
  },
  blockedButtonText: {
    color: "#9ca3af",
  },
});
