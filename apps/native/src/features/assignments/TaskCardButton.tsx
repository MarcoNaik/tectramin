import {
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
} from "react-native";
import { usePrerequisiteStatus } from "../../hooks/useTaskDependencies";
import type { DayTaskTemplate, FieldTemplate, TaskInstance, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";

interface TaskCardButtonProps {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instance: { clientId: string; status: string } | undefined;
  assignment: AssignmentWithTemplates;
  allTaskInstances: TaskInstance[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
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
      onSelectTask(instance.clientId, template);
    } else {
      onCreateAndSelectTask(template, assignment.serverId);
    }
  };

  const isBlocked = !canStart && !isCompleted;

  return (
    <TouchableOpacity
      style={[
        styles.taskButton,
        isCompleted && styles.viewButton,
        isBlocked && styles.blockedButton,
      ]}
      onPress={handlePress}
    >
      <Text style={[styles.taskButtonText, isBlocked && styles.blockedButtonText]}>
        {isCompleted ? "Ver" : canStart ? "Llenar" : "Bloqueado"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  taskButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  viewButton: {
    backgroundColor: "#059669",
  },
  blockedButton: {
    backgroundColor: "#9ca3af",
  },
  blockedButtonText: {
    color: "#f3f4f6",
  },
});
