import { useEffect } from "react";
import { TouchableOpacity, View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
  runOnJS,
  interpolateColor,
  type SharedValue,
} from "react-native-reanimated";
import { Text } from "./Text";

const COLLAPSE_THRESHOLD = 50;
const EXPAND_THRESHOLD = 10;

interface CollapsibleFormHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  onBack: () => void;
  scrollY: SharedValue<number>;
  answeredFields: number;
  totalFields: number;
  isComplete: boolean;
}

export function CollapsibleFormHeader({
  title,
  subtitle,
  description,
  onBack,
  scrollY,
  answeredFields,
  totalFields,
  isComplete,
}: CollapsibleFormHeaderProps) {
  const progress = totalFields > 0 ? answeredFields / totalFields : 0;
  const animatedProgress = useSharedValue(progress);
  const animatedComplete = useSharedValue(isComplete ? 1 : 0);
  const isExpanded = useSharedValue(1);
  const manuallyToggled = useSharedValue(false);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  useEffect(() => {
    animatedComplete.value = withTiming(isComplete ? 1 : 0, { duration: 300 });
  }, [isComplete]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
    backgroundColor: interpolateColor(
      animatedComplete.value,
      [0, 1],
      ["#4b5563", "#059669"]
    ),
  }));

  const updateExpandState = (newScrollY: number) => {
    if (newScrollY < EXPAND_THRESHOLD) {
      isExpanded.value = withTiming(1, { duration: 300 });
      manuallyToggled.value = false;
    } else if (
      newScrollY > COLLAPSE_THRESHOLD &&
      isExpanded.value === 1 &&
      !manuallyToggled.value
    ) {
      isExpanded.value = withTiming(0, { duration: 300 });
    }
  };

  useDerivedValue(() => {
    runOnJS(updateExpandState)(scrollY.value);
  }, [scrollY]);

  const handleToggle = () => {
    const newValue = isExpanded.value === 1 ? 0 : 1;
    isExpanded.value = withTiming(newValue, { duration: 300 });
    manuallyToggled.value = true;
  };

  const descriptionStyle = useAnimatedStyle(() => ({
    maxHeight: isExpanded.value * 200,
    paddingBottom: isExpanded.value * 12,
    overflow: "hidden" as const,
  }));

  const handleBackPress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onBack();
  };

  if (!description) {
    return (
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#111827" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={styles.spacer} />
        </View>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={handleToggle}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#111827" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={styles.spacer} />
        </View>
        <Animated.View style={[styles.descriptionContainer, descriptionStyle]}>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 2,
  },
  spacer: {
    width: 36,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: "#e5e7eb",
  },
  progressBarFill: {
    height: "100%",
  },
});
