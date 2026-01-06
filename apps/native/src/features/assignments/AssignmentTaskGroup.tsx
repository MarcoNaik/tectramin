import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";
import { TaskCardButton } from "./TaskCardButton";
import { RepeatableTaskCard } from "./RepeatableTaskCard";
import { useWorkOrderDayStatus } from "../../hooks/useWorkOrderDayStatus";
import type { DayTaskTemplate, FieldTemplate, TaskInstance, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";

interface AssignmentTaskGroupProps {
  assignment: AssignmentWithTemplates;
  taskInstances: TaskInstance[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => void;
}

export function AssignmentTaskGroup({
  assignment,
  taskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
}: AssignmentTaskGroupProps) {
  const { updateStatus } = useWorkOrderDayStatus();

  const allTasksCompleted = assignment.taskTemplates.every((template) => {
    const instances = taskInstances.filter(
      (ti) =>
        ti.dayTaskTemplateServerId === template.serverId &&
        ti.workOrderDayServerId === assignment.serverId
    );

    if (template.isRepeatable) {
      return instances.every((i) => i.status === "completed");
    }

    return instances[0]?.status === "completed";
  });

  const canMarkComplete = allTasksCompleted && assignment.status !== "completed";

  const handleMarkComplete = async () => {
    await updateStatus(assignment.serverId, "completed");
  };

  return (
    <View style={styles.assignmentGroup}>
      <View style={styles.assignmentGroupHeader}>
        <View style={styles.assignmentGroupTitleRow}>
          <Text style={styles.assignmentGroupTitle}>{assignment.workOrderName}</Text>
          <Text style={styles.statusIcon}>
            {assignment.status === "completed" ? "●" : assignment.status === "in_progress" ? "◐" : "○"}
          </Text>
        </View>
        <Text style={styles.assignmentGroupSubtitle}>
          {assignment.customerName} - {assignment.faenaName}
        </Text>
        <Text style={styles.assignmentGroupDate}>
          Día {assignment.dayNumber}
        </Text>
      </View>

      {assignment.taskTemplates.map((template, index) => {
        const instances = taskInstances.filter(
          (ti) =>
            ti.dayTaskTemplateServerId === template.serverId &&
            ti.workOrderDayServerId === assignment.serverId
        );

        if (template.isRepeatable) {
          return (
            <RepeatableTaskCard
              key={template.serverId}
              template={template}
              instances={instances}
              assignment={assignment}
              onSelectTask={onSelectTask}
              onCreateAndSelectTask={onCreateAndSelectTask}
              index={index + 1}
            />
          );
        }

        const instance = instances[0];
        const isCompleted = instance?.status === "completed";

        return (
          <View key={template.serverId} style={styles.taskCard}>
            <View style={styles.taskCardContent}>
              <View style={styles.taskCardInfo}>
                <View style={styles.taskCardNameRow}>
                  <Text style={styles.taskCardName}>
                    {index + 1}. {template.taskTemplateName}
                  </Text>
                  {template.isRequired && (
                    <Text style={styles.requiredIcon}>*</Text>
                  )}
                </View>
              </View>
              <View style={styles.taskCardActions}>
                {isCompleted && (
                  <Text style={styles.completedIcon}>●</Text>
                )}
                <TaskCardButton
                  template={template}
                  instance={instance}
                  assignment={assignment}
                  allTaskInstances={taskInstances}
                  allDependencies={allDependencies}
                  onSelectTask={onSelectTask}
                  onCreateAndSelectTask={onCreateAndSelectTask}
                />
              </View>
            </View>
          </View>
        );
      })}

      {canMarkComplete && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleMarkComplete}
        >
          <Text style={styles.completeButtonText}>Marcar Rutina Completada</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  assignmentGroup: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    zIndex: 1,
  },
  assignmentGroupHeader: {
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  assignmentGroupTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  assignmentGroupTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  assignmentGroupSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 2,
  },
  assignmentGroupDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  statusIcon: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
  },
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
  taskCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  completedIcon: {
    fontSize: 14,
    color: "#6b7280",
  },
  completeButton: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
