import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Text } from "../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useAssignments } from "../../hooks/useAssignments";
import { useTaskInstances, type TaskInstanceWithResponses } from "../../hooks/useTaskInstances";
import { useAllTaskDependencies } from "../../hooks/useTaskDependencies";
import { useUsers } from "../../hooks/useUsers";
import { useLookupEntities } from "../../hooks/useLookupEntities";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../../db/client";
import { attachments } from "../../db/schema";
import { SyncStatusIcon } from "../../components/SyncStatusIcon";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { UserAvatarButton } from "../../components/UserAvatarButton";
import { UserProfileModal } from "../../components/UserProfileModal";
import { LogoutConfirmationModal } from "../../components/LogoutConfirmationModal";
import { ClearDataConfirmationModal } from "../../components/ClearDataConfirmationModal";
import { DateWarningModal, CompletedTaskModal } from "../../components/common";
import { clearAllData } from "../../db/client";
import { syncService } from "../../sync/SyncService";
import { generateMonthDays, formatFullDate, type DayData } from "../../utils/dateUtils";
import { DayPage } from "./DayPage";
import { TaskInstanceForm } from "./TaskInstanceForm";
import { CollapsibleFormHeader } from "../../components/CollapsibleFormHeader";
import type { DayTaskTemplate, FieldTemplate, User, LookupEntity } from "../../db/types";

interface PendingTaskAction {
  type: "select" | "create";
  taskInstanceClientId?: string;
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  workOrderDayServerId: string;
  instanceLabel?: string;
  dayData: DayData;
}

interface AnswerAttachment {
  localUri: string | null;
  fileName: string;
  fileType: string;
  mimeType: string;
}

interface Answer {
  label: string;
  value: string;
  fieldType: string;
  fieldServerId: string;
  attachment?: AnswerAttachment | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { assignments } = useAssignments(user?.id ?? "");
  const { taskInstances, createTaskInstance } = useTaskInstances(user?.id ?? "");
  const { dependencies: allDependencies } = useAllTaskDependencies();
  const { users: localUsers } = useUsers();
  const { entities: lookupEntities } = useLookupEntities();
  const isOnline = useNetworkStatus();
  const { data: allAttachments } = useLiveQuery(
    db.select().from(attachments)
  );
  const [activeTaskInstanceClientId, setActiveTaskInstanceClientId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<(DayTaskTemplate & { fields: FieldTemplate[] }) | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [currentMonth] = useState(() => new Date());
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isClearDataModalVisible, setIsClearDataModalVisible] = useState(false);
  const [dateWarningModalVisible, setDateWarningModalVisible] = useState(false);
  const [completedTaskModalVisible, setCompletedTaskModalVisible] = useState(false);
  const [pendingTaskAction, setPendingTaskAction] = useState<PendingTaskAction | null>(null);
  const flatListRef = useRef<FlatList<DayData>>(null);
  const formScrollY = useSharedValue(0);

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
        const isRoutineTask = template.workOrderDayServiceServerId !== null;
        const clientId = await createTaskInstance({
          workOrderDayServerId,
          dayTaskTemplateServerId: isRoutineTask ? undefined : template.serverId,
          workOrderDayServiceServerId: isRoutineTask ? (template.workOrderDayServiceServerId ?? undefined) : undefined,
          serviceTaskTemplateServerId: isRoutineTask ? (template.serviceTaskTemplateServerId ?? undefined) : undefined,
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

  const handleCreateInstance = useCallback(
    async (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string, instanceLabel?: string) => {
      if (!user?.id) {
        Alert.alert("Error", "Usuario no autenticado");
        return;
      }
      try {
        const isRoutineTask = template.workOrderDayServiceServerId !== null;
        await createTaskInstance({
          workOrderDayServerId,
          dayTaskTemplateServerId: isRoutineTask ? undefined : template.serverId,
          workOrderDayServiceServerId: isRoutineTask ? (template.workOrderDayServiceServerId ?? undefined) : undefined,
          serviceTaskTemplateServerId: isRoutineTask ? (template.serviceTaskTemplateServerId ?? undefined) : undefined,
          taskTemplateServerId: template.taskTemplateServerId,
          instanceLabel,
        });
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

          let attachment: AnswerAttachment | null = null;
          if (field.fieldType === "attachment" && response?.clientId) {
            const foundAttachment = (allAttachments ?? []).find(
              (a) => a.fieldResponseClientId === response.clientId
            );
            if (foundAttachment) {
              attachment = {
                localUri: foundAttachment.localUri,
                fileName: foundAttachment.fileName,
                fileType: foundAttachment.fileType,
                mimeType: foundAttachment.mimeType,
              };
            }
          }

          return {
            label: field.label,
            value: response?.value ?? "",
            fieldType: field.fieldType,
            fieldServerId: field.serverId,
            attachment,
          };
        });
    },
    [taskInstances, allAttachments]
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

  const handleClearData = useCallback(async () => {
    setIsClearDataModalVisible(false);
    setIsProfileModalVisible(false);
    const success = await clearAllData();
    if (success) {
      await signOut();
    } else {
      Alert.alert(
        "Error",
        "No se pudieron eliminar los datos locales. Por favor, intenta de nuevo.",
        [{ text: "Entendido" }]
      );
    }
  }, [signOut]);

  const renderDay = useCallback(
    ({ item }: { item: DayData }) => (
      <DayPage
        day={item}
        taskInstances={taskInstances}
        allDependencies={allDependencies}
        onSelectTask={handleSelectTaskWithChecks}
        onCreateAndSelectTask={handleCreateAndSelectTaskWithChecks}
        onCreateInstance={handleCreateInstance}
        refreshing={syncing}
        onRefresh={handleSync}
      />
    ),
    [taskInstances, allDependencies, handleSelectTaskWithChecks, handleCreateAndSelectTaskWithChecks, handleCreateInstance, syncing, handleSync]
  );

  useEffect(() => {
    if (user?.id) {
      syncService.sync();
    }
  }, [user?.id]);

  if (activeTaskInstanceClientId && activeTemplate) {
    const currentInstance = taskInstances.find(
      (ti) => ti.clientId === activeTaskInstanceClientId
    );
    const formTitle = currentInstance?.instanceLabel || activeTemplate.taskTemplateName;
    const formSubtitle = currentInstance?.instanceLabel ? activeTemplate.taskTemplateName : undefined;

    const inputFields = activeTemplate.fields.filter((f) => f.fieldType !== "displayText");
    const totalFields = inputFields.length;
    const answeredFields = inputFields.filter((field) => {
      const response = currentInstance?.responses.find(
        (r) => r.fieldTemplateServerId === field.serverId
      );
      return response?.value && response.value.trim() !== "";
    }).length;
    const requiredFields = inputFields.filter((f) => f.isRequired);
    const isComplete = requiredFields.every((field) => {
      const response = currentInstance?.responses.find(
        (r) => r.fieldTemplateServerId === field.serverId
      );
      return response?.value && response.value.trim() !== "";
    });

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CollapsibleFormHeader
          title={formTitle}
          subtitle={formSubtitle}
          description={activeTemplate.readme ?? undefined}
          onBack={() => {
            setActiveTaskInstanceClientId(null);
            setActiveTemplate(null);
          }}
          answeredFields={answeredFields}
          totalFields={totalFields}
          isComplete={isComplete}
        />
        <TaskInstanceForm
          key={activeTaskInstanceClientId}
          taskInstanceClientId={activeTaskInstanceClientId}
          template={activeTemplate}
          userId={user?.id ?? ""}
          onComplete={() => {
            setActiveTaskInstanceClientId(null);
            setActiveTemplate(null);
          }}
          scrollY={formScrollY}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.backgroundIconContainer}>
        <Image
          source={require("../../../assets/icon.png")}
          style={styles.backgroundIcon}
          resizeMode="contain"
        />
      </View>
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
        onClearData={() => {
          setIsProfileModalVisible(false);
          setIsClearDataModalVisible(true);
        }}
        imageUrl={user?.imageUrl}
        fullName={user?.fullName}
        email={user?.primaryEmailAddress?.emailAddress}
        role={currentUserRole}
        isOnline={isOnline}
      />

      <LogoutConfirmationModal
        visible={isLogoutModalVisible}
        onClose={() => setIsLogoutModalVisible(false)}
        onConfirm={() => {
          setIsLogoutModalVisible(false);
          signOut();
        }}
      />

      <ClearDataConfirmationModal
        visible={isClearDataModalVisible}
        onClose={() => setIsClearDataModalVisible(false)}
        onConfirm={handleClearData}
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
        fields={pendingTaskAction?.template.fields ?? []}
        users={localUsers}
        lookupEntities={lookupEntities}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backgroundIconContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.25,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 0,
  },
  backgroundIcon: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    opacity: 0.1,
    borderRadius: SCREEN_WIDTH * 0.7 * 0.2,
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
    zIndex: 1,
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
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
