import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "./Text";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onValueChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              isSelected && styles.segmentSelected,
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
            ]}
            onPress={() => onValueChange(option.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  segmentSelected: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentFirst: {},
  segmentLast: {},
  segmentText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  segmentTextSelected: {
    color: "#111827",
    fontWeight: "600",
  },
});
