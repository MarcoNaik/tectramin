import { useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";
import { FieldInput } from "../../components/fields";
import { useFieldResponses } from "../../hooks/useFieldResponses";
import { useTaskInstances } from "../../hooks/useTaskInstances";
import { useFieldConditions } from "../../hooks/useFieldConditions";
import { getVisibleFields, getVisibleRequiredFields } from "../../utils/conditionEvaluator";
import { PendingFieldValuesProvider, usePendingFieldValues } from "../../providers/PendingFieldValuesContext";
import type { DayTaskTemplate, FieldTemplate } from "../../db/types";

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
  const { taskInstances, updateTaskInstanceStatus } = useTaskInstances(userId);
  const { conditions } = useFieldConditions();
  const { flushAll, getAllPending } = usePendingFieldValues();

  const currentInstance = taskInstances.find(
    (ti) => ti.clientId === taskInstanceClientId
  );

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

  const getResponseValueForField = (fieldServerId: string): string | undefined => {
    return getResponseForField(fieldServerId)?.value ?? undefined;
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

  const formTitle = currentInstance?.instanceLabel || template.taskTemplateName;

  return (
    <View style={styles.formContainer}>
      <Text style={[styles.formTitle, !currentInstance?.instanceLabel && styles.formTitleNoSubtitle]}>
        {formTitle}
      </Text>
      {currentInstance?.instanceLabel && (
        <Text style={styles.formSubtitle}>{template.taskTemplateName}</Text>
      )}
      {visibleFields.map((field, idx) => (
        <FieldInput
          key={field.serverId}
          field={field}
          value={getResponseForField(field.serverId)?.value ?? undefined}
          onChange={(value) => handleFieldChange(field.serverId, value)}
          fieldResponseClientId={getResponseForField(field.serverId)?.clientId}
          userId={userId}
          ensureFieldResponse={createEnsureFieldResponse(field.serverId)}
          getResponseForField={getResponseValueForField}
          index={idx + 1}
        />
      ))}
      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeButtonText}>Marcar Completado</Text>
      </TouchableOpacity>
    </View>
  );
}

export function TaskInstanceForm(props: TaskInstanceFormProps) {
  return (
    <PendingFieldValuesProvider>
      <TaskInstanceFormInner {...props} />
    </PendingFieldValuesProvider>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  formTitleNoSubtitle: {
    marginBottom: 24,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
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
