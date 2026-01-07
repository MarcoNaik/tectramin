import { useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Text } from "../../components/Text";
import { usePrerequisiteStatus } from "../../hooks/useTaskDependencies";
import type { DayTaskTemplate, FieldTemplate, TaskDependency } from "../../db/types";
import type { AssignmentWithTemplates } from "../../hooks/useAssignments";
import type { TaskInstanceWithResponses } from "../../hooks/useTaskInstances";

function DiagonalStripes({ color }: { color: string }) {
  const stripes = useMemo(() => {
    const elements = [];
    for (let i = -10; i < 20; i++) {
      elements.push(
        <View
          key={i}
          style={{
            position: "absolute",
            width: 4,
            height: 60,
            backgroundColor: color,
            left: i * 10,
            top: -10,
            transform: [{ rotate: "45deg" }],
          }}
        />
      );
    }
    return elements;
  }, [color]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stripes}
    </View>
  );
}

export interface TaskProgress {
  progress: number;
  isCompleted: boolean;
  isRequiredComplete: boolean;
  hasResponses: boolean;
}

export function getTaskProgress(
  template: DayTaskTemplate & { fields: FieldTemplate[] },
  instance: TaskInstanceWithResponses | undefined
): TaskProgress {
  const isCompleted = instance?.status === "completed";
  const inputFields = template.fields.filter((f) => f.fieldType !== "displayText");
  const totalFields = inputFields.length;
  const answeredFields = inputFields.filter((field) => {
    const response = instance?.responses.find(
      (r) => r.fieldTemplateServerId === field.serverId
    );
    return response?.value && response.value.trim() !== "";
  }).length;
  const requiredFields = inputFields.filter((f) => f.isRequired);
  const isRequiredComplete = requiredFields.length === 0 || requiredFields.every((field) => {
    const response = instance?.responses.find(
      (r) => r.fieldTemplateServerId === field.serverId
    );
    return response?.value && response.value.trim() !== "";
  });
  const hasResponses = answeredFields > 0;
  const progress = isCompleted ? 1 : totalFields > 0 ? answeredFields / totalFields : 0;
  return { progress, isCompleted, isRequiredComplete, hasResponses };
}

interface ProgressButtonProps {
  text: string;
  progress: number;
  isCompleted: boolean;
  isRequiredComplete?: boolean;
  isBlocked?: boolean;
  onPress: () => void;
}

export function ProgressButton({
  text,
  progress,
  isCompleted,
  isRequiredComplete = false,
  isBlocked = false,
  onPress,
}: ProgressButtonProps) {
  const isGreen = isCompleted;
  const showStripes = isRequiredComplete && !isCompleted && progress > 0;
  const fillColor = isGreen ? "#047857" : "#1f2937";
  const textColor = progress > 0 ? "#ffffff" : isBlocked ? "#9ca3af" : "#ffffff";
  const borderColor = isBlocked ? "#d1d5db" : "#4b5563";
  const backgroundColor = progress > 0 ? (isGreen ? "#10b981" : "#4b5563") : "#6b7280";
  const stripeColor = "#1f2937";

  return (
    <TouchableOpacity
      style={[styles.progressButton, { borderColor, backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showStripes && <DiagonalStripes color={stripeColor} />}
      <View
        style={[
          styles.progressFill,
          {
            width: `${progress * 100}%`,
            backgroundColor: fillColor,
          },
        ]}
      />
      <View style={styles.buttonContent}>
        <Text style={[styles.buttonText, { color: textColor }]}>
          {text}
        </Text>
        {!isBlocked && (
          <Text style={[styles.chevron, { color: textColor }]}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface TaskCardButtonProps {
  template: DayTaskTemplate & { fields: FieldTemplate[] };
  instance: TaskInstanceWithResponses | undefined;
  assignment: AssignmentWithTemplates;
  allTaskInstances: TaskInstanceWithResponses[];
  allDependencies: TaskDependency[];
  onSelectTask: (taskInstanceClientId: string, template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
  onCreateAndSelectTask: (template: DayTaskTemplate & { fields: FieldTemplate[] }, workOrderDayServerId: string) => void;
}

export function TaskCardButton({
  template,
  instance,
  assignment,
  allTaskInstances,
  allDependencies,
  onSelectTask,
  onCreateAndSelectTask,
}: TaskCardButtonProps) {
  const isCompleted = instance?.status === "completed";
  const { canStart, blockingTasks } = usePrerequisiteStatus(
    template.serverId,
    assignment.serverId,
    allTaskInstances,
    allDependencies,
    assignment.taskTemplates
  );

  const { progress, hasResponses, isRequiredComplete } = getTaskProgress(template, instance);

  const handlePress = () => {
    if (!canStart && !isCompleted) {
      Alert.alert(
        "Tarea Bloqueada",
        `Completa primero: ${blockingTasks.join(", ")}`
      );
      return;
    }
    if (instance) {
      onSelectTask(instance.clientId, template, assignment.serverId);
    } else {
      onCreateAndSelectTask(template, assignment.serverId);
    }
  };

  const isBlocked = !canStart && !isCompleted;

  const getButtonText = () => {
    if (isCompleted) return "Ver";
    if (canStart) return hasResponses ? "Continuar" : "Llenar";
    return "Bloqueado";
  };

  return (
    <ProgressButton
      text={getButtonText()}
      progress={progress}
      isCompleted={isCompleted}
      isRequiredComplete={isRequiredComplete}
      isBlocked={isBlocked}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  progressButton: {
    position: "relative",
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 80,
    height: 32,
  },
  progressFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
  },
  buttonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 4,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 16,
    fontWeight: "400",
  },
});
