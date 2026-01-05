import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Text } from "../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useAssignments } from "../../hooks/useAssignments";
import { useTaskInstances, type TaskInstanceWithResponses } from "../../hooks/useTaskInstances";
import { useAllTaskDependencies } from "../../hooks/useTaskDependencies";
import { useUsers } from "../../hooks/useUsers";
import { SyncStatusIcon } from "../../components/SyncStatusIcon";
import { UserAvatarButton } from "../../components/UserAvatarButton";
import { UserProfileModal } from "../../components/UserProfileModal";
import { LogoutConfirmationModal } from "../../components/LogoutConfirmationModal";
import { DateWarningModal, CompletedTaskModal } from "../../components/common";
import { syncService } from "../../sync/SyncService";
import { generateMonthDays, formatFullDate, type DayData } from "../../utils/dateUtils";
import { DayPage } from "./DayPage";
import { TaskInstanceForm } from "./TaskInstanceForm";
import type { DayTaskTemplate, FieldTemplate, User } from "../../db/types";

interface PendingTaskAction {
  type: "select" | "create";
  taskInstanceClientId?: string;
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  workOrderDayServerId: string;
  instanceLabel?: string;
  dayData: DayData;
}

interface Answer {
  label: string;
  value: string;
  fieldType: string;
}

function formatFieldValue(
  value: string,
  fieldType: string,
  field: FieldTemplate,
  users: User[]
): string {
  if (!value) return "-";
  switch (fieldType) {
    case "boolean":
      return value === "true" ? "Si" : "No";
    case "date":
      try {
        return new Date(value).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } catch {
        return value;
      }
    case "attachment":
      return "Archivo adjunto";
    case "select":
      try {
        const options = JSON.parse(field.defaultValue || "[]");
        const option = options.find((o: { value: string; label: string }) => o.value === value);
        return option?.label || value;
      } catch {
        return value;
      }
    case "userSelect":
      const foundUser = users.find((u) => u.serverId === value);
      return foundUser?.fullName || value;
    case "entitySelect":
      return value;
    default:
      return value;
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { assignments } = useAssignments(user?.id ?? "");
  const { taskInstances, createTaskInstance } = useTaskInstances(user?.id ?? "");
  const { dependencies: allDependencies } = useAllTaskDependencies();
  const { users: localUsers } = useUsers();
  const [activeTaskInstanceClientId, setActiveTaskInstanceClientId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<(DayTaskTemplate & { fields: FieldTemplate[] }) | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [currentMonth] = useState(() => new Date());
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [dateWarningModalVisible, setDateWarningModalVisible] = useState(false);
  const [completedTaskModalVisible, setCompletedTaskModalVisible] = useState(false);
  const [pendingTaskAction, setPendingTaskAction] = useState<PendingTaskAction | null>(null);
  const flatListRef = useRef<FlatList<DayData>>(null);

  const currentUserRole = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return null;
    return localUsers.find((u) => u.email === email)?.role;
  }, [localUsers, user?.primaryEmailAddress?.emailAddress]);

  const { days, todayIndex } = useMemo(() => {
    return generateMonthDays(currentMonth, assignments);
  }, [currentMonth, assignments]);

  const getItemLayout = useCallback(
    (_: ArrayLike<DayData> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const handleSelectTask = useCallback(
    (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => {
      setActiveTaskInstanceClientId(taskInstanceClientId);
      setActiveTemplate(template);
    },
    []
  );

  const handleCreateAndSelectTask = useCallback(
    async (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => {
      if (!user?.id) {
        Alert.alert("Error", "Usuario no autenticado");
        return;
      }
      try {
        const clientId = await createTaskInstance({
          workOrderDayServerId,
          dayTaskTemplateServerId: template.serverId,
          taskTemplateServerId: template.taskTemplateServerId,
          instanceLabel,
        });
        if (clientId) {
          setActiveTaskInstanceClientId(clientId);
          setActiveTemplate(template);
        } else {
          Alert.alert("Error", "Error al crear instancia de tarea - no se recibió ID");
        }
      } catch (error) {
        console.error("Failed to create task instance:", error);
        Alert.alert("Error", `Error al crear instancia de tarea: ${error instanceof Error ? error.message : "Error desconocido"}`);
      }
    },
    [createTaskInstance, user?.id]
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await syncService.sync();
    setSyncing(false);
  }, []);

  const scrollToToday = useCallback(() => {
    flatListRef.current?.scrollToIndex({ index: todayIndex, animated: true });
  }, [todayIndex]);

  const findDayDataForWorkOrderDay = useCallback(
    (workOrderDayServerId: string): DayData | null => {
      return (
        days.find((day) =>
          day.assignments.some((a) => a.serverId === workOrderDayServerId)
        ) ?? null
      );
    },
    [days]
  );

  const getAnswersForTaskInstance = useCallback(
    (
      taskInstanceClientId: string,
      template: DayTaskTemplate & { fields: FieldTemplate[] }
    ): Answer[] => {
      const instance = taskInstances.find(
        (ti) => ti.clientId === taskInstanceClientId
      );
      if (!instance) return [];

      return template.fields
        .filter((field) => field.fieldType !== "displayText")
        .map((field) => {
          const response = instance.responses.find(
            (r) => r.fieldTemplateServerId === field.serverId
          );
          return {
            label: field.label,
            value: formatFieldValue(
              response?.value ?? "",
              field.fieldType,
              field,
              localUsers
            ),
            fieldType: field.fieldType,
          };
        });
    },
    [taskInstances, localUsers]
  );

  const handleSelectTaskWithChecks = useCallback(
    (
      taskInstanceClientId: string,
      template: DayTaskTemplate & { fields: FieldTemplate[] },
      workOrderDayServerId: string
    ) => {
      const instance = taskInstances.find(
        (ti) => ti.clientId === taskInstanceClientId
      );
      const dayData = findDayDataForWorkOrderDay(workOrderDayServerId);

      if (!dayData) {
        setActiveTaskInstanceClientId(taskInstanceClientId);
        setActiveTemplate(template);
        return;
      }

      const pendingAction: PendingTaskAction = {
        type: "select",
        taskInstanceClientId,
        template,
        workOrderDayServerId,
        dayData,
      };

      if (instance?.status === "completed") {
        setPendingTaskAction(pendingAction);
        setCompletedTaskModalVisible(true);
        return;
      }

      if (!dayData.isToday) {
        setPendingTaskAction(pendingAction);
        setDateWarningModalVisible(true);
        return;
      }

      setActiveTaskInstanceClientId(taskInstanceClientId);
      setActiveTemplate(template);
    },
    [taskInstances, findDayDataForWorkOrderDay]
  );

  const handleCreateAndSelectTaskWithChecks = useCallback(
    async (
      template: DayTaskTemplate & { fields: FieldTemplate[] },
      workOrderDayServerId: string,
      instanceLabel?: string
    ) => {
      const dayData = findDayDataForWorkOrderDay(workOrderDayServerId);

      if (!dayData) {
        await handleCreateAndSelectTask(template, workOrderDayServerId, instanceLabel);
        return;
      }

      if (!dayData.isToday) {
        setPendingTaskAction({
          type: "create",
          template,
          workOrderDayServerId,
          instanceLabel,
          dayData,
        });
        setDateWarningModalVisible(true);
        return;
      }

      await handleCreateAndSelectTask(template, workOrderDayServerId, instanceLabel);
    },
    [findDayDataForWorkOrderDay, handleCreateAndSelectTask]
  );

  const handleDateWarningClose = useCallback(() => {
    setDateWarningModalVisible(false);
    setPendingTaskAction(null);
  }, []);

  const handleDateWarningGoToToday = useCallback(() => {
    setDateWarningModalVisible(false);
    setPendingTaskAction(null);
    scrollToToday();
  }, [scrollToToday]);

  const handleDateWarningProceed = useCallback(async () => {
    setDateWarningModalVisible(false);

    if (!pendingTaskAction) return;

    if (
      pendingTaskAction.type === "select" &&
      pendingTaskAction.taskInstanceClientId
    ) {
      setActiveTaskInstanceClientId(pendingTaskAction.taskInstanceClientId);
      setActiveTemplate(pendingTaskAction.template);
    } else if (pendingTaskAction.type === "create") {
      await handleCreateAndSelectTask(
        pendingTaskAction.template,
        pendingTaskAction.workOrderDayServerId,
        pendingTaskAction.instanceLabel
      );
    }

    setPendingTaskAction(null);
  }, [pendingTaskAction, handleCreateAndSelectTask]);

  const handleCompletedTaskClose = useCallback(() => {
    setCompletedTaskModalVisible(false);
    setPendingTaskAction(null);
  }, []);

  const handleCompletedTaskEdit = useCallback(() => {
    setCompletedTaskModalVisible(false);

    if (!pendingTaskAction) return;

    if (!pendingTaskAction.dayData.isToday) {
      setDateWarningModalVisible(true);
      return;
    }

    if (pendingTaskAction.taskInstanceClientId) {
      setActiveTaskInstanceClientId(pendingTaskAction.taskInstanceClientId);
      setActiveTemplate(pendingTaskAction.template);
    }
    setPendingTaskAction(null);
  }, [pendingTaskAction]);

  const renderDay = useCallback(
    ({ item }: { item: DayData }) => (
      <DayPage
        day={item}
        taskInstances={taskInstances}
        allDependencies={allDependencies}
        onSelectTask={handleSelectTaskWithChecks}
        onCreateAndSelectTask={handleCreateAndSelectTaskWithChecks}
        refreshing={syncing}
        onRefresh={handleSync}
      />
    ),
    [taskInstances, allDependencies, handleSelectTaskWithChecks, handleCreateAndSelectTaskWithChecks, syncing, handleSync]
  );

  useEffect(() => {
    if (user?.id) {
      syncService.sync();
    }
  }, [user?.id]);

  if (activeTaskInstanceClientId && activeTemplate) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => {
            setActiveTaskInstanceClientId(null);
            setActiveTemplate(null);
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Volver a Tareas</Text>
        </TouchableOpacity>
        <ScrollView
          style={styles.formScrollView}
          contentContainerStyle={styles.formScrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <TaskInstanceForm
            key={activeTaskInstanceClientId}
            taskInstanceClientId={activeTaskInstanceClientId}
            template={activeTemplate}
            userId={user?.id ?? ""}
            onComplete={() => {
              setActiveTaskInstanceClientId(null);
              setActiveTemplate(null);
            }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.appHeader}>
        <View style={styles.headerLeft}>
          <SyncStatusIcon />
        </View>
        <Text style={styles.appTitle}>Tectramin</Text>
        <View style={styles.headerRight}>
          <UserAvatarButton
            imageUrl={user?.imageUrl}
            fullName={user?.fullName}
            onPress={() => setIsProfileModalVisible(true)}
          />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={days}
        renderItem={renderDay}
        keyExtractor={(item) => item.dateKey}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={todayIndex}
        windowSize={3}
        maxToRenderPerBatch={3}
        removeClippedSubviews
      />

      <UserProfileModal
        visible={isProfileModalVisible}
        onClose={() => setIsProfileModalVisible(false)}
        onLogout={() => {
          setIsProfileModalVisible(false);
          setIsLogoutModalVisible(true);
        }}
        imageUrl={user?.imageUrl}
        fullName={user?.fullName}
        email={user?.primaryEmailAddress?.emailAddress}
        role={currentUserRole}
      />

      <LogoutConfirmationModal
        visible={isLogoutModalVisible}
        onClose={() => setIsLogoutModalVisible(false)}
        onConfirm={() => {
          setIsLogoutModalVisible(false);
          signOut();
        }}
      />

      <DateWarningModal
        visible={dateWarningModalVisible}
        onClose={handleDateWarningClose}
        onGoToToday={handleDateWarningGoToToday}
        onProceedAnyway={handleDateWarningProceed}
        dateLabel={
          pendingTaskAction?.dayData
            ? formatFullDate(pendingTaskAction.dayData.date)
            : ""
        }
        isPast={
          pendingTaskAction?.dayData
            ? pendingTaskAction.dayData.date < new Date(new Date().setHours(0, 0, 0, 0))
            : false
        }
      />

      <CompletedTaskModal
        visible={completedTaskModalVisible}
        onClose={handleCompletedTaskClose}
        onEdit={handleCompletedTaskEdit}
        taskName={pendingTaskAction?.template.taskTemplateName ?? ""}
        answers={
          pendingTaskAction?.taskInstanceClientId
            ? getAnswersForTaskInstance(
                pendingTaskAction.taskInstanceClientId,
                pendingTaskAction.template
              )
            : []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  appTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  headerLeft: {
    width: 100,
    alignItems: "flex-start",
  },
  headerRight: {
    width: 100,
    alignItems: "flex-end",
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
