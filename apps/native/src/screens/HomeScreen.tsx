import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Switch,
} from "react-native";
import { useAuth, useUser, SignedIn, SignedOut, useSignIn, useSSO } from "@clerk/clerk-expo";
import { useAssignments, useAssignment } from "../hooks/useAssignments";
import { useTaskInstances, useTaskInstancesByWorkOrderDay } from "../hooks/useTaskInstances";
import { useFieldResponses } from "../hooks/useFieldResponses";
import { useAttachments } from "../hooks/useAttachments";
import { SyncStatusIcon } from "../components/SyncStatusIcon";
import { DatePickerField } from "../components/DatePickerField";
import { AttachmentField } from "../components/AttachmentField";
import { syncService } from "../sync/SyncService";
import type { DayTaskTemplate, FieldTemplate } from "../db/types";

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

  if (field.fieldType === "boolean") {
    return (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>
          {field.label}
          {field.isRequired ? " *" : ""}
        </Text>
        <Switch
          value={value === "true"}
          onValueChange={(val) => onChange(val ? "true" : "false")}
        />
      </View>
    );
  }

  if (field.fieldType === "date") {
    return (
      <DatePickerField
        label={field.label}
        isRequired={field.isRequired}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.fieldType === "attachment") {
    return (
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
    );
  }

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
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

function DayDetail({
  workOrderDayServerId,
  userId,
  onBack,
}: {
  workOrderDayServerId: string;
  userId: string;
  onBack: () => void;
}) {
  const { assignment } = useAssignment(workOrderDayServerId);
  const { taskInstances } = useTaskInstancesByWorkOrderDay(workOrderDayServerId);
  const [activeTaskInstanceClientId, setActiveTaskInstanceClientId] = useState<string | null>(null);

  if (!assignment) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleStartTask = (template: DayTaskTemplate & { fields: FieldTemplate[] }) => {
    const instance = taskInstances.find(
      (ti) => ti.dayTaskTemplateServerId === template.serverId
    );

    if (instance) {
      setActiveTaskInstanceClientId(instance.clientId);
    }
  };

  const activeTemplate = activeTaskInstanceClientId
    ? assignment.taskTemplates.find((t) =>
        taskInstances.find(
          (ti) =>
            ti.clientId === activeTaskInstanceClientId &&
            ti.dayTaskTemplateServerId === t.serverId
        )
      )
    : null;

  if (activeTaskInstanceClientId && activeTemplate) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setActiveTaskInstanceClientId(null)} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Tasks</Text>
        </TouchableOpacity>
        <TaskInstanceForm
          taskInstanceClientId={activeTaskInstanceClientId}
          template={activeTemplate}
          userId={userId}
          onComplete={() => setActiveTaskInstanceClientId(null)}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back to Assignments</Text>
      </TouchableOpacity>

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{assignment.workOrderName}</Text>
        <Text style={styles.daySubtitle}>
          {assignment.customerName} - {assignment.faenaName}
        </Text>
        <Text style={styles.dayDate}>
          Day {assignment.dayNumber} - {new Date(assignment.dayDate).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Tasks</Text>
      {assignment.taskTemplates.map((template) => {
        const instance = taskInstances.find(
          (ti) => ti.dayTaskTemplateServerId === template.serverId
        );
        const isCompleted = instance?.status === "completed";

        return (
          <View key={template.serverId} style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>{template.taskTemplateName}</Text>
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
            <Text style={styles.fieldCount}>{template.fields.length} fields</Text>
            <TouchableOpacity
              style={[styles.startButton, isCompleted && styles.viewButton]}
              onPress={() => handleStartTask(template)}
              disabled={!instance}
            >
              <Text style={styles.startButtonText}>
                {isCompleted ? "View" : "Fill"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

function AssignmentsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { assignments } = useAssignments(user?.id ?? "");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  if (selectedDay) {
    return (
      <DayDetail
        workOrderDayServerId={selectedDay}
        userId={user?.id ?? ""}
        onBack={() => setSelectedDay(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assignments</Text>
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

      <Text style={styles.debugInfo}>User ID: {user?.id?.slice(0, 20)}...</Text>
      <Text style={styles.debugInfo}>Assignments: {assignments.length}</Text>

      {assignments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Assignments</Text>
          <Text style={styles.emptyText}>
            You haven't been assigned to any work order days yet.
          </Text>
          <Text style={styles.emptyText}>
            Ask an admin to assign you from the web dashboard.
          </Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.serverId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.assignmentCard}
              onPress={() => setSelectedDay(item.serverId)}
            >
              <View style={styles.assignmentHeader}>
                <Text style={styles.assignmentTitle}>{item.workOrderName}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === "pending"
                      ? styles.pendingStatusBadge
                      : item.status === "in_progress"
                      ? styles.inProgressStatusBadge
                      : styles.completedStatusBadge,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.assignmentSubtitle}>
                {item.customerName} - {item.faenaName}
              </Text>
              <Text style={styles.assignmentDate}>
                Day {item.dayNumber} - {new Date(item.dayDate).toLocaleDateString()}
              </Text>
              <Text style={styles.taskCount}>
                {item.taskTemplates.length} tasks to complete
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
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
    padding: 16,
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
  assignmentCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
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
  assignmentSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  assignmentDate: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  taskCount: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "500",
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
  dayHeader: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  daySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    color: "#374151",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  templateCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
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
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: "#f59e0b",
  },
  viewButton: {
    backgroundColor: "#059669",
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "600",
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
});
