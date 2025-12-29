import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Switch,
  Dimensions,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useUser, SignedIn, SignedOut, useSignIn, useSSO } from "@clerk/clerk-expo";
import { useAssignments } from "../hooks/useAssignments";
import { useTaskInstances } from "../hooks/useTaskInstances";
import { useFieldResponses } from "../hooks/useFieldResponses";
import { useAttachments } from "../hooks/useAttachments";
import { useUsers } from "../hooks/useUsers";
import { useFieldConditions } from "../hooks/useFieldConditions";
import { useAllTaskDependencies, usePrerequisiteStatus } from "../hooks/useTaskDependencies";
import { getVisibleFields, getVisibleRequiredFields } from "../utils/conditionEvaluator";
import { SyncStatusIcon } from "../components/SyncStatusIcon";
import { DatePickerField } from "../components/DatePickerField";
import { AttachmentField } from "../components/AttachmentField";
import { DebouncedTextInput } from "../components/DebouncedTextInput";
import { PendingFieldValuesProvider, usePendingFieldValues } from "../providers/PendingFieldValuesContext";
import { syncService } from "../sync/SyncService";
import {
  generateMonthDays,
  formatFullDate,
  type DayData,
} from "../utils/dateUtils";
import type { DayTaskTemplate, FieldTemplate, TaskDependency, TaskInstance } from "../db/types";
import type { AssignmentWithTemplates } from "../hooks/useAssignments";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SelectOption {
  value: string;
  label: string;
}

function parseSelectOptions(displayStyle: string | null | undefined): SelectOption[] {
  if (!displayStyle) return [];
  try {
    const parsed = JSON.parse(displayStyle);
    if (Array.isArray(parsed)) {
      return parsed.filter((opt): opt is SelectOption =>
        typeof opt === "object" && opt !== null && typeof opt.value === "string" && typeof opt.label === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const options = parseSelectOptions(field.displayStyle);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedOption ? styles.selectButtonText : styles.selectButtonPlaceholder}>
          {selectedOption ? selectedOption.label : "Seleccionar una opción..."}
        </Text>
        <Text style={styles.selectButtonChevron}>▼</Text>
      </TouchableOpacity>

      <OptionPickerModal
        visible={modalVisible}
        options={options}
        selectedValue={value}
        onSelect={(val) => {
          onChange(val);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
        title={field.label}
      />
    </View>
  );
}

function UserSelectField({
  field,
  value,
  onChange,
}: {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const { users: userList } = useUsers();
  const options: SelectOption[] = userList.map((u) => ({
    value: u.serverId,
    label: u.fullName || u.email,
  }));
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedOption ? styles.selectButtonText : styles.selectButtonPlaceholder}>
          {selectedOption ? selectedOption.label : "Seleccionar un usuario..."}
        </Text>
        <Text style={styles.selectButtonChevron}>▼</Text>
      </TouchableOpacity>

      <OptionPickerModal
        visible={modalVisible}
        options={options}
        selectedValue={value}
        onSelect={(val) => {
          onChange(val);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
        title={field.label}
      />
    </View>
  );
}

function OptionPickerModal({
  visible,
  options,
  selectedValue,
  onSelect,
  onClose,
  title,
}: {
  visible: boolean;
  options: SelectOption[];
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
  onClose: () => void;
  title: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.optionsList}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionItem,
                  selectedValue === opt.value && styles.optionItemSelected,
                ]}
                onPress={() => onSelect(opt.value)}
              >
                <Text style={[
                  styles.optionItemText,
                  selectedValue === opt.value && styles.optionItemTextSelected,
                ]}>
                  {opt.label}
                </Text>
                {selectedValue === opt.value && (
                  <Text style={styles.optionItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleOAuthSignIn = async (strategy: "oauth_google" | "oauth_microsoft") => {
    try {
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy,
      });

      if (createdSessionId) {
        await ssoSetActive!({ session: createdSessionId });
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "OAuth sign in failed");
    }
  };

  const handleSignIn = async () => {
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Sign in failed");
    }
  };

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Tectramin</Text>

      <TouchableOpacity
        style={styles.oauthButton}
        onPress={() => handleOAuthSignIn("oauth_google")}
      >
        <Text style={styles.oauthButtonText}>Iniciar sesión con Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.oauthButton}
        onPress={() => handleOAuthSignIn("oauth_microsoft")}
      >
        <Text style={styles.oauthButtonText}>Iniciar sesión con Microsoft</Text>
      </TouchableOpacity>

      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>o</Text>
        <View style={styles.separatorLine} />
      </View>

      <TextInput
        style={styles.signInInput}
        placeholder="Correo"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.signInInput}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
        <Text style={styles.signInButtonText}>Iniciar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  fieldResponseClientId,
  userId,
  ensureFieldResponse,
}: {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  fieldResponseClientId: string | undefined;
  userId: string;
  ensureFieldResponse: () => Promise<string>;
}) {
  const { attachment, createAttachment, removeAttachment } = useAttachments(
    fieldResponseClientId ?? "",
    userId
  );

  if (field.fieldType === "displayText") {
    const isHeader = field.displayStyle === "header";
    return (
      <View style={styles.fieldContainer}>
        <Text style={isHeader ? styles.displayHeader : styles.displayText}>
          {field.label}
        </Text>
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldRow}>
          <View>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.isRequired ? " *" : ""}
            </Text>
            {field.subheader && (
              <Text style={styles.fieldSubheader}>{field.subheader}</Text>
            )}
          </View>
          <Switch
            value={value === "true"}
            onValueChange={(val) => onChange(val ? "true" : "false")}
          />
        </View>
      </View>
    );
  }

  if (field.fieldType === "date") {
    return (
      <View style={styles.fieldContainer}>
        <DatePickerField
          label={field.label}
          isRequired={field.isRequired}
          value={value}
          onChange={onChange}
        />
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  if (field.fieldType === "attachment") {
    return (
      <View style={styles.fieldContainer}>
        <AttachmentField
          label={field.label}
          isRequired={field.isRequired}
          attachment={attachment}
          onPickImage={async (uri, fileName, mimeType, fileSize) => {
            const responseClientId = fieldResponseClientId || await ensureFieldResponse();
            const clientId = await createAttachment({
              fieldResponseClientId: responseClientId,
              uri,
              fileName,
              mimeType,
              fileSize,
            });
            onChange(clientId);
          }}
          onPickDocument={async (uri, fileName, mimeType, fileSize) => {
            const responseClientId = fieldResponseClientId || await ensureFieldResponse();
            const clientId = await createAttachment({
              fieldResponseClientId: responseClientId,
              uri,
              fileName,
              mimeType,
              fileSize,
            });
            onChange(clientId);
          }}
          onRemove={async () => {
            await removeAttachment();
            onChange("");
          }}
        />
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  if (field.fieldType === "select") {
    return (
      <SelectField
        field={field}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.fieldType === "userSelect") {
    return (
      <UserSelectField
        field={field}
        value={value}
        onChange={onChange}
      />
    );
  }

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}
      <DebouncedTextInput
        fieldServerId={field.serverId}
        style={styles.fieldInput}
        initialValue={value ?? field.defaultValue ?? ""}
        onDebouncedChange={onChange}
        placeholder={field.placeholder ?? ""}
        keyboardType={field.fieldType === "number" ? "numeric" : "default"}
        debounceMs={500}
      />
    </View>
  );
}

interface TaskInstanceFormProps {
  taskInstanceClientId: string;
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  userId: string;
  onComplete: () => void;
}

function TaskInstanceFormInner({
  taskInstanceClientId,
  template,
  userId,
  onComplete,
}: TaskInstanceFormProps) {
  const { responses, upsertResponse, getResponseForField } = useFieldResponses(
    taskInstanceClientId,
    userId
  );
  const { updateTaskInstanceStatus } = useTaskInstances(userId);
  const { conditions } = useFieldConditions();
  const { flushAll, getAllPending } = usePendingFieldValues();

  const visibleFields = useMemo(() => {
    const pendingMap = getAllPending();
    const responsesWithPending = responses.map((r) => {
      const pending = pendingMap.get(r.fieldTemplateServerId);
      if (pending) {
        return { ...r, value: pending.value };
      }
      return r;
    });
    return getVisibleFields(template.fields, conditions, responsesWithPending);
  }, [template.fields, conditions, responses, getAllPending]);

  const handleFieldChange = async (fieldTemplateServerId: string, value: string) => {
    await upsertResponse({
      taskInstanceClientId,
      fieldTemplateServerId,
      value,
    });
  };

  const createEnsureFieldResponse = (fieldTemplateServerId: string) => async () => {
    const responseClientId = await upsertResponse({
      taskInstanceClientId,
      fieldTemplateServerId,
      value: "",
    });
    return responseClientId;
  };

  const handleComplete = async () => {
    flushAll();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const visibleRequired = getVisibleRequiredFields(template.fields, conditions, responses);
    const incompleteRequired = visibleRequired.filter((field) => {
      const response = getResponseForField(field.serverId);
      return !response?.value || response.value.trim() === "";
    });

    if (incompleteRequired.length > 0) {
      Alert.alert(
        "Campos Requeridos",
        `Por favor complete: ${incompleteRequired.map((f) => f.label).join(", ")}`
      );
      return;
    }

    await updateTaskInstanceStatus(taskInstanceClientId, "completed");
    onComplete();
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>{template.taskTemplateName}</Text>
      {visibleFields.map((field) => (
        <FieldInput
          key={field.serverId}
          field={field}
          value={getResponseForField(field.serverId)?.value ?? undefined}
          onChange={(value) => handleFieldChange(field.serverId, value)}
          fieldResponseClientId={getResponseForField(field.serverId)?.clientId}
          userId={userId}
          ensureFieldResponse={createEnsureFieldResponse(field.serverId)}
        />
      ))}
      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeButtonText}>Marcar Completado</Text>
      </TouchableOpacity>
    </View>
  );
}

function TaskInstanceForm(props: TaskInstanceFormProps) {
  return (
    <PendingFieldValuesProvider>
      <TaskInstanceFormInner {...props} />
    </PendingFieldValuesProvider>
  );
}

function TaskCardButton({
  template,
  instance,
  assignment,
  allTaskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
}: {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instance: { clientId: string; status: string } | undefined;
  assignment: AssignmentWithTemplates;
  allTaskInstances: TaskInstance[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
}) {
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

function AssignmentTaskGroup({
  assignment,
  taskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
}: {
  assignment: AssignmentWithTemplates;
  taskInstances: TaskInstance[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
}) {
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

function EmptyDayState() {
  return (
    <View style={styles.emptyDayContainer}>
      <Text style={styles.emptyDayTitle}>Sin Asignaciones</Text>
      <Text style={styles.emptyDayText}>
        No tienes asignaciones programadas para este día.
      </Text>
    </View>
  );
}

function DayPage({
  day,
  taskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
  refreshing,
  onRefresh,
}: {
  day: DayData;
  taskInstances: TaskInstance[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.dayPage}>
      <ScrollView
        style={styles.dayScrollView}
        contentContainerStyle={styles.dayScrollContent}
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
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AssignmentsScreen() {
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
    async (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => {
      if (!user?.id) {
        Alert.alert("Error", "Usuario no autenticado");
        return;
      }
      try {
        const clientId = await createTaskInstance({
          workOrderDayServerId,
          dayTaskTemplateServerId: template.serverId,
          taskTemplateServerId: template.taskTemplateServerId,
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

export default function HomeScreen() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <AssignmentsScreen />
      </SignedIn>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 32,
  },
  signInInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  signInButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  oauthButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  oauthButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#d1d5db",
  },
  separatorText: {
    color: "#6b7280",
    paddingHorizontal: 16,
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
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
  debugInfo: {
    fontSize: 10,
    color: "#9ca3af",
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 4,
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
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
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
  fieldCount: {
    fontSize: 12,
    color: "#6b7280",
  },
  viewButton: {
    backgroundColor: "#059669",
  },
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#374151",
  },
  fieldSubheader: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 6,
  },
  displayHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  displayText: {
    fontSize: 14,
    color: "#374151",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  completeButton: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dayPage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  dayScrollView: {
    flex: 1,
  },
  dayScrollContent: {
    paddingHorizontal: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  todayBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  assignmentsList: {
    flex: 1,
  },
  assignmentsContent: {
    paddingBottom: 24,
  },
  emptyDayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyDayTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptyDayText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
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
  blockedButton: {
    backgroundColor: "#9ca3af",
  },
  blockedButtonText: {
    color: "#f3f4f6",
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#111827",
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: "#9ca3af",
  },
  selectButtonChevron: {
    fontSize: 12,
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalClose: {
    fontSize: 20,
    color: "#6b7280",
    padding: 4,
  },
  optionsList: {
    padding: 8,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
  },
  optionItemSelected: {
    backgroundColor: "#eff6ff",
  },
  optionItemText: {
    fontSize: 16,
    color: "#374151",
  },
  optionItemTextSelected: {
    color: "#2563eb",
    fontWeight: "500",
  },
  optionItemCheck: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
  },
});
