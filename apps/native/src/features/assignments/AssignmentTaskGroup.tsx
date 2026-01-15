import { useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";
import { SegmentedControl } from "../../components/SegmentedControl";
import { TaskCardRow } from "./TaskCardRow";
import { RepeatableTaskCard } from "./RepeatableTaskCard";
import { useWorkOrderDayStatus } from "../../hooks/useWorkOrderDayStatus";
import { useTaskFilterPreference, type TaskFilterMode } from "../../hooks/useTaskFilterPreference";
import type { DayTaskTemplate, FieldTemplate, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates, RoutineWithTasks } from "../../hooks/useAssignments";
import type { TaskInstanceWithResponses } from "../../hooks/useTaskInstances";

const FILTER_OPTIONS: Array<{ value: TaskFilterMode; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
];

interface AssignmentTaskGroupProps {
  assignment: AssignmentWithTemplates;
  taskInstances: TaskInstanceWithResponses[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => void;
  onCreateInstance: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => Promise<void>;
  userId: string;
}

function RoutineSection({
  routine,
  taskInstances,
  assignment,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
  onCreateInstance,
  globalIndex,
  filterMode,
}: {
  routine: RoutineWithTasks;
  taskInstances: TaskInstanceWithResponses[];
  assignment: AssignmentWithTemplates;
  allDependencies: TaskDependency[];
  onSelectTask: AssignmentTaskGroupProps["onSelectTask"];
  onCreateAndSelectTask: AssignmentTaskGroupProps["onCreateAndSelectTask"];
  onCreateInstance: AssignmentTaskGroupProps["onCreateInstance"];
  globalIndex: number;
  filterMode: TaskFilterMode;
}) {
  let taskIndex = globalIndex;

  const routineInstances = taskInstances.filter(
    (ti) =>
      ti.workOrderDayServerId === assignment.serverId &&
      ti.workOrderDayServiceServerId === routine.serverId
  );

  const shouldShowTask = (
    template: RoutineWithTasks["tasks"][number],
    instances: TaskInstanceWithResponses[]
  ): boolean => {
    if (filterMode === "all") return true;

    if (template.isRepeatable) {
      const hasPending = instances.some((i) => i.status !== "completed");
      const canAddMore =
        instances.length === 0 ||
        instances[instances.length - 1]?.status === "completed";
      return hasPending || canAddMore;
    }

    const instance = instances[0];
    return !instance || instance.status !== "completed";
  };

  const visibleTasks = routine.tasks.filter((template) => {
    const instances = routineInstances.filter(
      (ti) => ti.taskTemplateServerId === template.taskTemplateServerId
    );
    return shouldShowTask(template, instances);
  });

  if (visibleTasks.length === 0) return null;

  return (
    <View style={styles.routineSection}>
      <View style={styles.routineHeader}>
        <Text style={styles.routineTitle}>{routine.serviceName}</Text>
      </View>
      {visibleTasks.map((template) => {
        const instances = routineInstances.filter(
          (ti) => ti.taskTemplateServerId === template.taskTemplateServerId
        );
        const currentIndex = taskIndex++;

        if (template.isRepeatable) {
          return (
            <RepeatableTaskCard
              key={template.serverId}
              template={template}
              instances={instances}
              assignment={assignment}
              onSelectTask={onSelectTask}
              onCreateInstance={onCreateInstance}
              index={currentIndex}
              filterMode={filterMode}
            />
          );
        }

        const instance = instances[0];

        return (
          <TaskCardRow
            key={template.serverId}
            template={template}
            instance={instance}
            assignment={assignment}
            allTaskInstances={taskInstances}
            allDependencies={allDependencies}
            onSelectTask={onSelectTask}
            onCreateAndSelectTask={onCreateAndSelectTask}
            index={currentIndex}
          />
        );
      })}
    </View>
  );
}

export function AssignmentTaskGroup({
  assignment,
  taskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
  onCreateInstance,
  userId,
}: AssignmentTaskGroupProps) {
  const { updateStatus } = useWorkOrderDayStatus();
  const { filterMode, setFilterMode } = useTaskFilterPreference(
    assignment.serverId,
    userId
  );

  const routineInstances = taskInstances.filter(
    (ti) =>
      ti.workOrderDayServerId === assignment.serverId &&
      ti.workOrderDayServiceServerId !== null
  );

  const standaloneInstances = taskInstances.filter(
    (ti) =>
      ti.workOrderDayServerId === assignment.serverId &&
      ti.workOrderDayServiceServerId === null
  );

  const allRoutineTasksCompleted = assignment.routines.every((routine) =>
    routine.tasks.every((template) => {
      const instances = routineInstances.filter(
        (ti) =>
          ti.taskTemplateServerId === template.taskTemplateServerId &&
          ti.workOrderDayServiceServerId === routine.serverId
      );

      if (template.isRepeatable) {
        return instances.length > 0 && instances.every((i) => i.status === "completed");
      }

      return instances[0]?.status === "completed";
    })
  );

  const allStandaloneCompleted =
    assignment.standaloneTasks.length === 0 ||
    assignment.standaloneTasks.every((template) => {
      const instances = standaloneInstances.filter(
        (ti) => ti.taskTemplateServerId === template.taskTemplateServerId
      );
      if (template.isRepeatable) {
        return instances.length > 0 && instances.every((i) => i.status === "completed");
      }
      return instances[0]?.status === "completed";
    });

  const allTasksCompleted = allRoutineTasksCompleted && allStandaloneCompleted;
  const canMarkComplete = allTasksCompleted && assignment.status !== "completed";

  const handleMarkComplete = async () => {
    await updateStatus(assignment.serverId, "completed");
  };

  const shouldShowStandaloneTask = useCallback(
    (
      template: AssignmentWithTemplates["standaloneTasks"][number],
      instances: TaskInstanceWithResponses[]
    ): boolean => {
      if (filterMode === "all") return true;

      if (template.isRepeatable) {
        const hasPending = instances.some((i) => i.status !== "completed");
        const canAddMore =
          instances.length === 0 ||
          instances[instances.length - 1]?.status === "completed";
        return hasPending || canAddMore;
      }

      const instance = instances[0];
      return !instance || instance.status !== "completed";
    },
    [filterMode]
  );

  const visibleStandaloneTasks = assignment.standaloneTasks.filter(
    (template) => {
      const instances = standaloneInstances.filter(
        (ti) => ti.taskTemplateServerId === template.taskTemplateServerId
      );
      return shouldShowStandaloneTask(template, instances);
    }
  );

  let globalTaskIndex = 1;

  return (
    <View style={styles.assignmentGroup}>
      <View style={styles.assignmentGroupHeader}>
        <View style={styles.assignmentGroupTitleRow}>
          <Text style={styles.assignmentGroupTitle}>{assignment.workOrderName}</Text>
          <Text style={[styles.statusIcon, assignment.status === "completed" && styles.statusIconCompleted]}>
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

      <View style={styles.filterContainer}>
        <SegmentedControl
          options={FILTER_OPTIONS}
          selectedValue={filterMode}
          onValueChange={setFilterMode}
        />
      </View>

      {assignment.routines.map((routine) => {
        const startIndex = globalTaskIndex;
        globalTaskIndex += routine.tasks.length;
        return (
          <RoutineSection
            key={routine.serverId}
            routine={routine}
            taskInstances={taskInstances}
            assignment={assignment}
            allDependencies={allDependencies}
            onSelectTask={onSelectTask}
            onCreateAndSelectTask={onCreateAndSelectTask}
            onCreateInstance={onCreateInstance}
            globalIndex={startIndex}
            filterMode={filterMode}
          />
        );
      })}

      {visibleStandaloneTasks.length > 0 && (
        <View style={styles.standaloneSection}>
          <View style={styles.standaloneHeader}>
            <Text style={styles.standaloneTitle}>Tareas Independientes</Text>
          </View>
          {visibleStandaloneTasks.map((template) => {
            const instances = standaloneInstances.filter(
              (ti) => ti.taskTemplateServerId === template.taskTemplateServerId
            );
            const currentIndex = globalTaskIndex++;

            if (template.isRepeatable) {
              return (
                <RepeatableTaskCard
                  key={template.serverId}
                  template={template}
                  instances={instances}
                  assignment={assignment}
                  onSelectTask={onSelectTask}
                  onCreateInstance={onCreateInstance}
                  index={currentIndex}
                  filterMode={filterMode}
                />
              );
            }

            const instance = instances[0];

            return (
              <TaskCardRow
                key={template.serverId}
                template={template}
                instance={instance}
                assignment={assignment}
                allTaskInstances={taskInstances}
                allDependencies={allDependencies}
                onSelectTask={onSelectTask}
                onCreateAndSelectTask={onCreateAndSelectTask}
                index={currentIndex}
              />
            );
          })}
        </View>
      )}

      {canMarkComplete && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleMarkComplete}
        >
          <Text style={styles.completeButtonText}>Marcar Completado</Text>
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
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  statusIconCompleted: {
    color: "#22c55e",
  },
  routineSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  routineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  routineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  standaloneSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  standaloneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  standaloneTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
