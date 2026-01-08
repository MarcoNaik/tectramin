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

interface InlineOptionPickerProps {
  isExpanded: boolean;
  options: SelectOption[];
  selectedValue: string | undefined;
  searchQuery: string;
  onSelect: (value: string) => void;
  onCollapse: () => void;
}

const ITEM_HEIGHT = 48;
const MAX_VISIBLE_ITEMS = 5;
const EXPANDED_HEIGHT = ITEM_HEIGHT * MAX_VISIBLE_ITEMS + 8;

export function InlineOptionPicker({
  isExpanded,
  options,
  selectedValue,
  searchQuery,
  onSelect,
  onCollapse,
}: InlineOptionPickerProps) {
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

  const handleSelect = (value: string) => {
    onSelect(value);
    onCollapse();
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <Pressable onPress={(e) => e.stopPropagation()}>
      <Animated.View style={[styles.container, expandedStyle]}>
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
            {filteredOptions.map((opt, index) => {
              const isFirst = index === 0;
              const isSelected = selectedValue === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionItem,
                    isFirst && styles.optionItemFirst,
                    isSelected && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(opt.value)}
                >
                  <Text
                    style={[
                      styles.optionItemText,
                      isFirst && styles.optionItemTextFirst,
                      isSelected && styles.optionItemTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Text style={styles.optionItemCheck}>✓</Text>
                  )}
                  {isFirst && !isSelected && (
                    <Text style={styles.optionItemEnterHint}>↵</Text>
                  )}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: ITEM_HEIGHT,
  },
  optionItemFirst: {
    backgroundColor: "#eff6ff",
  },
  optionItemSelected: {
    backgroundColor: "#f3f4f6",
  },
  optionItemText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
    marginRight: 8,
  },
  optionItemTextFirst: {
    color: "#2563eb",
    fontWeight: "500",
  },
  optionItemTextSelected: {
    color: "#374151",
    fontWeight: "500",
  },
  optionItemCheck: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  optionItemEnterHint: {
    fontSize: 14,
    color: "#2563eb",
  },
});
