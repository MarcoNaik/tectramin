import {
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";
import { AssignmentTaskGroup } from "./AssignmentTaskGroup";
import { EmptyDayState } from "./EmptyDayState";
import { formatFullDate, type DayData } from "../../utils/dateUtils";
import { useResponsivePadding } from "../../utils/responsive";
import type { DayTaskTemplate, FieldTemplate, TaskDependency } from "../../db/types";
import type { TaskInstanceWithResponses } from "../../hooks/useTaskInstances";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DayPageProps {
  day: DayData;
  taskInstances: TaskInstanceWithResponses[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => void;
  onCreateInstance: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => Promise<void>;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DayPage({
  day,
  taskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
  onCreateInstance,
  refreshing,
  onRefresh,
}: DayPageProps) {
  const horizontalPadding = useResponsivePadding();

  return (
    <View style={styles.dayPage}>
      <ScrollView
        style={styles.dayScrollView}
        contentContainerStyle={[styles.dayScrollContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      >
        <View style={styles.dateHeader}>
          <Text style={styles.dayOfWeek}>{day.dayOfWeek}</Text>
          <Text style={styles.fullDate}>{formatFullDate(day.date)}</Text>
          {day.isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Hoy</Text>
            </View>
          )}
        </View>

        {day.assignments.length === 0 ? (
          <EmptyDayState />
        ) : (
          <View style={styles.assignmentsList}>
            {day.assignments.map((assignment) => {
              const assignmentTaskInstances = taskInstances.filter(
                (ti) => ti.workOrderDayServerId === assignment.serverId
              );
              const assignmentDependencies = allDependencies.filter(
                (d) => d.workOrderDayServerId === assignment.serverId
              );
              return (
                <AssignmentTaskGroup
                  key={assignment.serverId}
                  assignment={assignment}
                  taskInstances={assignmentTaskInstances}
                  allDependencies={assignmentDependencies}
                  onSelectTask={onSelectTask}
                  onCreateAndSelectTask={onCreateAndSelectTask}
                  onCreateInstance={onCreateInstance}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dayPage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  dayScrollView: {
    flex: 1,
  },
  dayScrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  dateHeader: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16,
  },
  dayOfWeek: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fullDate: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },
  todayBadge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    flexShrink: 0,
  },
  todayBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  assignmentsList: {
    flex: 1,
  },
});
