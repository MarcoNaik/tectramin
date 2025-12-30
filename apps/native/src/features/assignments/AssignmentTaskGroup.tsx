import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { TaskCardButton } from "./TaskCardButton";
import type { DayTaskTemplate, FieldTemplate, TaskInstance, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";

interface AssignmentTaskGroupProps {
  assignment: AssignmentWithTemplates;
  taskInstances: TaskInstance[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
}

export function AssignmentTaskGroup({
  assignment,
  taskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
}: AssignmentTaskGroupProps) {
  return (
    <View style={styles.assignmentGroup}>
      <View style={styles.assignmentGroupHeader}>
        <View style={styles.assignmentGroupTitleRow}>
          <Text style={styles.assignmentGroupTitle}>{assignment.workOrderName}</Text>
          <View
            style={[
              styles.statusBadge,
              assignment.status === "pending"
                ? styles.pendingStatusBadge
                : assignment.status === "in_progress"
                  ? styles.inProgressStatusBadge
                  : styles.completedStatusBadge,
            ]}
          >
            <Text style={styles.statusBadgeText}>{assignment.status}</Text>
          </View>
        </View>
        <Text style={styles.assignmentGroupSubtitle}>
          {assignment.customerName} - {assignment.faenaName}
        </Text>
        <Text style={styles.assignmentGroupDate}>
          Día {assignment.dayNumber}
        </Text>
      </View>

      {assignment.taskTemplates.map((template) => {
        const instance = taskInstances.find(
          (ti) =>
            ti.dayTaskTemplateServerId === template.serverId &&
            ti.workOrderDayServerId === assignment.serverId
        );
        const isCompleted = instance?.status === "completed";

        return (
          <View key={template.serverId} style={styles.taskCard}>
            <View style={styles.taskCardContent}>
              <View style={styles.taskCardInfo}>
                <Text style={styles.taskCardName}>{template.taskTemplateName}</Text>
                <View style={styles.taskCardMeta}>
                  <Text style={styles.fieldCount}>{template.fields.length} campos</Text>
                  <View style={styles.badges}>
                    {template.isRequired && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>Requerido</Text>
                      </View>
                    )}
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Completado</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
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
        );
      })}
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingStatusBadge: {
    backgroundColor: "#fef3c7",
  },
  inProgressStatusBadge: {
    backgroundColor: "#dbeafe",
  },
  completedStatusBadge: {
    backgroundColor: "#d1fae5",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#374151",
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
  taskCardName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  taskCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldCount: {
    fontSize: 12,
    color: "#6b7280",
  },
  badges: {
    flexDirection: "row",
    gap: 4,
  },
  requiredBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    color: "#dc2626",
  },
  completedBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    color: "#059669",
  },
});
