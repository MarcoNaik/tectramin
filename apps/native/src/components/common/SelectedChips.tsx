import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "../Text";

interface SelectedChipsProps {
  selectedLabels: string[];
  placeholder: string;
  maxVisible?: number;
  onPress: () => void;
  disabled?: boolean;
}

export function SelectedChips({
  selectedLabels,
  placeholder,
  maxVisible = 2,
  onPress,
  disabled = false,
}: SelectedChipsProps) {
  const hasSelection = selectedLabels.length > 0;
  const visible = selectedLabels.slice(0, maxVisible);
  const remaining = selectedLabels.length - maxVisible;

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.containerDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {hasSelection ? (
        <View style={styles.chipsContainer}>
          <View style={styles.chipsRow}>
            {visible.map((label, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))}
            {remaining > 0 && (
              <View style={styles.moreChip}>
                <Text style={styles.moreChipText}>+{remaining}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <Text style={[styles.placeholder, disabled && styles.placeholderDisabled]}>
          {placeholder}
        </Text>
      )}
      <Text style={styles.chevron}>▼</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    minHeight: 44,
  },
  containerDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  chipsContainer: {
    flex: 1,
    marginRight: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 140,
  },
  chipText: {
    fontSize: 14,
    color: "#3730a3",
    fontWeight: "500",
  },
  moreChip: {
    backgroundColor: "#c7d2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreChipText: {
    fontSize: 14,
    color: "#4338ca",
    fontWeight: "600",
  },
  placeholder: {
    fontSize: 16,
    color: "#9ca3af",
    flex: 1,
  },
  placeholderDisabled: {
    fontStyle: "italic",
  },
  chevron: {
    fontSize: 12,
    color: "#6b7280",
  },
});
