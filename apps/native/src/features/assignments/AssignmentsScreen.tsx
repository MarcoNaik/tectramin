import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useAssignments } from "../../hooks/useAssignments";
import { useTaskInstances } from "../../hooks/useTaskInstances";
import { useAllTaskDependencies } from "../../hooks/useTaskDependencies";
import { SyncStatusIcon } from "../../components/SyncStatusIcon";
import { syncService } from "../../sync/SyncService";
import { generateMonthDays, type DayData } from "../../utils/dateUtils";
import { DayPage } from "./DayPage";
import { TaskInstanceForm } from "./TaskInstanceForm";
import type { DayTaskTemplate, FieldTemplate } from "../../db/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { assignments } = useAssignments(user?.id ?? "");
  const { taskInstances, createTaskInstance } = useTaskInstances(user?.id ?? "");
  const { dependencies: allDependencies } = useAllTaskDependencies();
  const [activeTaskInstanceClientId, setActiveTaskInstanceClientId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<(DayTaskTemplate & { fields: FieldTemplate[] }) | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [currentMonth] = useState(() => new Date());
  const flatListRef = useRef<FlatList<DayData>>(null);

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

  const renderDay = useCallback(
    ({ item }: { item: DayData }) => (
      <DayPage
        day={item}
        taskInstances={taskInstances}
        allDependencies={allDependencies}
        onSelectTask={handleSelectTask}
        onCreateAndSelectTask={handleCreateAndSelectTask}
        refreshing={syncing}
        onRefresh={handleSync}
      />
    ),
    [taskInstances, allDependencies, handleSelectTask, handleCreateAndSelectTask, syncing, handleSync]
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
        <TouchableOpacity style={styles.headerRight} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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
    width: 60,
    alignItems: "flex-start",
  },
  headerRight: {
    width: 60,
    alignItems: "flex-end",
  },
  signOutText: {
    color: "#6b7280",
    fontSize: 14,
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
