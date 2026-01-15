import { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  type SharedValue,
} from "react-native-reanimated";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../../db/client";
import { attachments } from "../../db/schema";
import { Text } from "../../components/Text";
import { FieldInput } from "../../components/fields";
import { PaginationDots } from "../../components/PaginationDots";
import { CompletedTaskModal } from "../../components/common/CompletedTaskModal";
import { ExpandedFieldProvider } from "../../components/fields/ExpandedFieldContext";
import { useFieldResponses } from "../../hooks/useFieldResponses";
import { useTaskInstances } from "../../hooks/useTaskInstances";
import { useFieldConditions } from "../../hooks/useFieldConditions";
import { useUsers } from "../../hooks/useUsers";
import { useLookupEntities } from "../../hooks/useLookupEntities";
import { getVisibleFields, getVisibleRequiredFields } from "../../utils/conditionEvaluator";
import { paginateFields, type FieldPage } from "../../utils/paginateFields";
import { useResponsivePadding, useResponsiveFieldGap } from "../../utils/responsive";
import { PendingFieldValuesProvider, usePendingFieldValues } from "../../providers/PendingFieldValuesContext";
import type { DayTaskTemplate, FieldTemplate } from "../../db/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

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

interface TaskInstanceFormProps {
  taskInstanceClientId: string;
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  userId: string;
  onComplete: () => void;
  scrollY?: SharedValue<number>;
}

function TaskInstanceFormInner({
  taskInstanceClientId,
  template,
  userId,
  onComplete,
  scrollY,
}: TaskInstanceFormProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingAnswers, setPendingAnswers] = useState<Answer[]>([]);
  const flatListRef = useRef<FlatList<FieldPage>>(null);
  const horizontalPadding = useResponsivePadding();
  const fieldGap = useResponsiveFieldGap();

  const { responses, upsertResponse, getResponseForField } = useFieldResponses(
    taskInstanceClientId,
    userId
  );
  const { taskInstances, updateTaskInstanceStatus } = useTaskInstances(userId);
  const { conditions } = useFieldConditions();
  const { flushAll, getAllPending } = usePendingFieldValues();
  const { users: localUsers } = useUsers();
  const { entities: lookupEntities } = useLookupEntities();
  const { data: allAttachments } = useLiveQuery(
    db.select().from(attachments)
  );

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

  const pages = useMemo(() => {
    return paginateFields(visibleFields, 10);
  }, [visibleFields]);

  const fieldIndices = useMemo(() => {
    const indices = new Map<string, number>();
    let inputFieldIndex = 0;
    for (const field of visibleFields) {
      if (field.fieldType !== "displayText") {
        inputFieldIndex++;
        indices.set(field.serverId, inputFieldIndex);
      }
    }
    return indices;
  }, [visibleFields]);

  const isFormIncomplete = useMemo(() => {
    const visibleRequired = getVisibleRequiredFields(template.fields, conditions, responses);
    return visibleRequired.some((field) => {
      const response = getResponseForField(field.serverId);
      return !response?.value || response.value.trim() === "";
    });
  }, [template.fields, conditions, responses, getResponseForField]);

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

  const buildAnswersFromResponses = (): Answer[] => {
    return visibleFields
      .filter((f) => f.fieldType !== "displayText")
      .map((field) => {
        const response = responses.find(
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

    const answers = buildAnswersFromResponses();
    setPendingAnswers(answers);
    setConfirmModalVisible(true);
  };

  const confirmComplete = async () => {
    await updateTaskInstanceStatus(taskInstanceClientId, "completed");
    setConfirmModalVisible(false);
    onComplete();
  };

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (pageIndex !== currentPageIndex) {
      setCurrentPageIndex(pageIndex);
    }
  }, [currentPageIndex]);

  const getItemLayout = useCallback(
    (_: ArrayLike<FieldPage> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const pageScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (scrollY) {
        scrollY.value = event.contentOffset.y;
      }
    },
  });

  const renderPage = useCallback(
    ({ item: page }: { item: FieldPage }) => (
      <AnimatedScrollView
        style={styles.pageContainer}
        contentContainerStyle={[styles.pageContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        onScroll={pageScrollHandler}
        scrollEventThrottle={16}
      >
        {page.fields.map((field) => (
          <FieldInput
            key={field.serverId}
            field={field}
            value={getResponseForField(field.serverId)?.value ?? undefined}
            onChange={(value) => handleFieldChange(field.serverId, value)}
            fieldResponseClientId={getResponseForField(field.serverId)?.clientId}
            userId={userId}
            ensureFieldResponse={createEnsureFieldResponse(field.serverId)}
            getResponseForField={getResponseValueForField}
            workOrderDayServerId={currentInstance?.workOrderDayServerId}
            index={fieldIndices.get(field.serverId)}
            marginBottom={fieldGap}
          />
        ))}
      </AnimatedScrollView>
    ),
    [
      getResponseForField,
      handleFieldChange,
      createEnsureFieldResponse,
      getResponseValueForField,
      userId,
      fieldIndices,
      pageScrollHandler,
      horizontalPadding,
      fieldGap,
      currentInstance?.workOrderDayServerId,
    ]
  );

  return (
    <>
      <View style={styles.formContainer}>
        <FlatList
          ref={flatListRef}
          data={pages}
          renderItem={renderPage}
          keyExtractor={(item) => `page-${item.pageIndex}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={getItemLayout}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          windowSize={3}
          maxToRenderPerBatch={3}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
        <View style={[styles.bottomContainer, { paddingHorizontal: horizontalPadding }]}>
          <PaginationDots totalPages={pages.length} currentPage={currentPageIndex} />
          <TouchableOpacity
            style={[styles.completeButton, isFormIncomplete && styles.completeButtonDisabled]}
            onPress={handleComplete}
            disabled={isFormIncomplete}
          >
            <Text
              style={[
                styles.completeButtonText,
                isFormIncomplete && styles.completeButtonTextDisabled,
              ]}
            >
              Marcar Completado
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <CompletedTaskModal
        visible={confirmModalVisible}
        mode="confirm"
        taskName={template.taskTemplateName}
        answers={pendingAnswers}
        fields={template.fields}
        users={localUsers}
        lookupEntities={lookupEntities}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={confirmComplete}
        onEdit={() => {}}
      />
    </>
  );
}

export function TaskInstanceForm(props: TaskInstanceFormProps) {
  return (
    <PendingFieldValuesProvider>
      <ExpandedFieldProvider>
        <TaskInstanceFormInner {...props} />
      </ExpandedFieldProvider>
    </PendingFieldValuesProvider>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
  },
  pageContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  bottomContainer: {
    paddingBottom: 32,
    backgroundColor: "#fff",
  },
  completeButton: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButtonTextDisabled: {
    color: "#e5e7eb",
  },
});
