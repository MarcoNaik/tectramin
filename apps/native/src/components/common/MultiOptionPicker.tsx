import { useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Text } from "../Text";
import type { SelectOption } from "../../types/select";
import { filterAndSortByFuzzy } from "../../utils/fuzzySearch";

interface MultiOptionPickerProps {
  isExpanded: boolean;
  options: SelectOption[];
  selectedValues: string[];
  searchQuery: string;
  onToggle: (value: string) => void;
  onDone: () => void;
}

const ITEM_HEIGHT = 48;
const HEADER_HEIGHT = 44;
const MAX_VISIBLE_ITEMS = 5;
const EXPANDED_HEIGHT = HEADER_HEIGHT + ITEM_HEIGHT * MAX_VISIBLE_ITEMS + 8;

export function MultiOptionPicker({
  isExpanded,
  options,
  selectedValues,
  searchQuery,
  onToggle,
  onDone,
}: MultiOptionPickerProps) {
  const animatedHeight = useSharedValue(0);

  const filteredOptions = useMemo(() => {
    return filterAndSortByFuzzy(options, searchQuery, (opt) => opt.label);
  }, [options, searchQuery]);

  useEffect(() => {
    animatedHeight.value = withTiming(isExpanded ? EXPANDED_HEIGHT : 0, { duration: 200 });
  }, [isExpanded, animatedHeight]);

  const expandedStyle = useAnimatedStyle(() => ({
    maxHeight: animatedHeight.value,
    opacity: animatedHeight.value / EXPANDED_HEIGHT,
    overflow: "hidden" as const,
  }));

  if (!isExpanded) {
    return null;
  }

  return (
    <Pressable onPress={(e) => e.stopPropagation()}>
      <Animated.View style={[styles.container, expandedStyle]}>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {selectedValues.length > 0
              ? `${selectedValues.length} seleccionado${selectedValues.length > 1 ? "s" : ""}`
              : "Seleccionar opciones"}
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneButtonText}>Listo</Text>
          </TouchableOpacity>
        </View>

        {filteredOptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No se encontraron resultados para "{searchQuery}"
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.optionsList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {filteredOptions.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected,
                  ]}
                  onPress={() => onToggle(opt.value)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text
                    style={[
                      styles.optionItemText,
                      isSelected && styles.optionItemTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#2563eb",
    borderRadius: 6,
  },
  doneButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  optionsList: {
    maxHeight: ITEM_HEIGHT * MAX_VISIBLE_ITEMS,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: ITEM_HEIGHT,
  },
  optionItemSelected: {
    backgroundColor: "#eff6ff",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  checkmark: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
  optionItemText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  optionItemTextSelected: {
    color: "#1e40af",
    fontWeight: "500",
  },
});
