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
} from "react-native";
import { useAuth, useUser, SignedIn, SignedOut, useSignIn, useSSO } from "@clerk/clerk-expo";
import { useAssignments } from "../hooks/useAssignments";
import { useTaskInstances } from "../hooks/useTaskInstances";
import { useFieldResponses } from "../hooks/useFieldResponses";
import { useAttachments } from "../hooks/useAttachments";
import { SyncStatusIcon } from "../components/SyncStatusIcon";
import { DatePickerField } from "../components/DatePickerField";
import { AttachmentField } from "../components/AttachmentField";
import { syncService } from "../sync/SyncService";
import {
  generateMonthDays,
  formatMonthYear,
  formatFullDate,
  type DayData,
} from "../utils/dateUtils";
import type { DayTaskTemplate, FieldTemplate } from "../db/types";
import type { AssignmentWithTemplates } from "../hooks/useAssignments";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
        <Text style={styles.oauthButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.oauthButton}
        onPress={() => handleOAuthSignIn("oauth_microsoft")}
      >
        <Text style={styles.oauthButtonText}>Sign in with Microsoft</Text>
      </TouchableOpacity>

      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>or</Text>
        <View style={styles.separatorLine} />
      </View>

      <TextInput
        style={styles.signInInput}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.signInInput}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
        <Text style={styles.signInButtonText}>Sign In</Text>
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
}: {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  fieldResponseClientId: string | undefined;
  userId: string;
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
            const clientId = await createAttachment({
              fieldResponseClientId: fieldResponseClientId ?? "",
              uri,
              fileName,
              mimeType,
              fileSize,
            });
            onChange(clientId);
          }}
          onPickDocument={async (uri, fileName, mimeType, fileSize) => {
            const clientId = await createAttachment({
              fieldResponseClientId: fieldResponseClientId ?? "",
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

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}
      <TextInput
        style={styles.fieldInput}
        value={value ?? field.defaultValue ?? ""}
        onChangeText={onChange}
        placeholder={field.placeholder ?? ""}
        keyboardType={field.fieldType === "number" ? "numeric" : "default"}
      />
    </View>
  );
}

function TaskInstanceForm({
  taskInstanceClientId,
  template,
  userId,
  onComplete,
}: {
  taskInstanceClientId: string;
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  userId: string;
  onComplete: () => void;
}) {
  const { responses, upsertResponse, getResponseForField } = useFieldResponses(
    taskInstanceClientId,
    userId
  );
  const { updateTaskInstanceStatus } = useTaskInstances(userId);

  const handleFieldChange = async (fieldTemplateServerId: string, value: string) => {
    await upsertResponse({
      taskInstanceClientId,
      fieldTemplateServerId,
      value,
    });
  };

  const handleComplete = async () => {
    await updateTaskInstanceStatus(taskInstanceClientId, "completed");
    onComplete();
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>{template.taskTemplateName}</Text>
      {template.fields.map((field) => (
        <FieldInput
          key={field.serverId}
          field={field}
          value={getResponseForField(field.serverId)?.value ?? undefined}
          onChange={(value) => handleFieldChange(field.serverId, value)}
          fieldResponseClientId={getResponseForField(field.serverId)?.clientId}
          userId={userId}
        />
      ))}
      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeButtonText}>Mark Complete</Text>
      </TouchableOpacity>
    </View>
  );
}

function AssignmentTaskGroup({
  assignment,
  taskInstances,
  onSelectTask,
}: {
  assignment: AssignmentWithTemplates;
  taskInstances: Array<{ clientId: string; dayTaskTemplateServerId: string; status: string }>;
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
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
          Day {assignment.dayNumber}
        </Text>
      </View>

      {assignment.taskTemplates.map((template) => {
        const instance = taskInstances.find(
          (ti) => ti.dayTaskTemplateServerId === template.serverId
        );
        const isCompleted = instance?.status === "completed";

        return (
          <View key={template.serverId} style={styles.taskCard}>
            <View style={styles.taskCardContent}>
              <View style={styles.taskCardInfo}>
                <Text style={styles.taskCardName}>{template.taskTemplateName}</Text>
                <View style={styles.taskCardMeta}>
                  <Text style={styles.fieldCount}>{template.fields.length} fields</Text>
                  <View style={styles.badges}>
                    {template.isRequired && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>Required</Text>
                      </View>
                    )}
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Completed</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.taskButton, isCompleted && styles.viewButton]}
                onPress={() => instance && onSelectTask(instance.clientId, template)}
                disabled={!instance}
              >
                <Text style={styles.taskButtonText}>
                  {isCompleted ? "View" : "Fill"}
                </Text>
              </TouchableOpacity>
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
      <Text style={styles.emptyDayTitle}>No Assignments</Text>
      <Text style={styles.emptyDayText}>
        You have no assignments scheduled for this day.
      </Text>
    </View>
  );
}

function DayPage({
  day,
  taskInstances,
  onSelectTask,
}: {
  day: DayData;
  taskInstances: Array<{ clientId: string; dayTaskTemplateServerId: string; status: string; workOrderDayServerId: string }>;
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }) => void;
}) {
  return (
    <View style={styles.dayPage}>
      <View style={styles.dateHeader}>
        <Text style={styles.dayOfWeek}>{day.dayOfWeek}</Text>
        <Text style={styles.fullDate}>{formatFullDate(day.date)}</Text>
        {day.isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>
        )}
      </View>

      {day.assignments.length === 0 ? (
        <EmptyDayState />
      ) : (
        <ScrollView
          style={styles.assignmentsList}
          contentContainerStyle={styles.assignmentsContent}
          showsVerticalScrollIndicator={false}
        >
          {day.assignments.map((assignment) => {
            const assignmentTaskInstances = taskInstances.filter(
              (ti) => ti.workOrderDayServerId === assignment.serverId
            );
            return (
              <AssignmentTaskGroup
                key={assignment.serverId}
                assignment={assignment}
                taskInstances={assignmentTaskInstances}
                onSelectTask={onSelectTask}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function AssignmentsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { assignments } = useAssignments(user?.id ?? "");
  const { taskInstances, updateTaskInstanceStatus } = useTaskInstances(user?.id ?? "");
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

  const renderDay = useCallback(
    ({ item }: { item: DayData }) => (
      <DayPage
        day={item}
        taskInstances={taskInstances}
        onSelectTask={handleSelectTask}
      />
    ),
    [taskInstances, handleSelectTask]
  );

  const scrollToToday = useCallback(() => {
    flatListRef.current?.scrollToIndex({
      index: todayIndex,
      animated: true,
    });
  }, [todayIndex]);

  useEffect(() => {
    if (user?.id) {
      syncService.sync();
    }
  }, [user?.id]);

  const handleSync = async () => {
    setSyncing(true);
    await syncService.sync();
    setSyncing(false);
  };

  if (activeTaskInstanceClientId && activeTemplate) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => {
            setActiveTaskInstanceClientId(null);
            setActiveTemplate(null);
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back to Tasks</Text>
        </TouchableOpacity>
        <TaskInstanceForm
          taskInstanceClientId={activeTaskInstanceClientId}
          template={activeTemplate}
          userId={user?.id ?? ""}
          onComplete={() => {
            setActiveTaskInstanceClientId(null);
            setActiveTemplate(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.calendarHeader}>
        <View style={styles.calendarHeaderLeft}>
          <Text style={styles.monthTitle}>{formatMonthYear(currentMonth)}</Text>
          <TouchableOpacity style={styles.todayButton} onPress={scrollToToday}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSync} disabled={syncing}>
            <Text style={[styles.syncText, syncing && styles.syncingText]}>
              {syncing ? "Syncing..." : "Sync"}
            </Text>
          </TouchableOpacity>
          <SyncStatusIcon />
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
    paddingTop: 16,
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  signOutText: {
    color: "#6b7280",
  },
  syncText: {
    color: "#2563eb",
    fontWeight: "500",
  },
  syncingText: {
    color: "#9ca3af",
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
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  calendarHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  todayButton: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  todayButtonText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
  },
  dayPage: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 16,
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
});
