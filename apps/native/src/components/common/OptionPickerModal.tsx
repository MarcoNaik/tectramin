import { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Animated,
  Dimensions,
  TextInput,
} from "react-native";
import { Text } from "../Text";
import type { SelectOption } from "../../types/select";
import { filterAndSortByFuzzy } from "../../utils/fuzzySearch";

interface OptionPickerModalProps {
  visible: boolean;
  options: SelectOption[];
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
  onClose: () => void;
  title: string;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function OptionPickerModal({
  visible,
  options,
  selectedValue,
  onSelect,
  onClose,
  title,
}: OptionPickerModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const showSearch = options.length > 5;

  const filteredOptions = useMemo(() => {
    return filterAndSortByFuzzy(options, searchQuery, (opt) => opt.label);
  }, [options, searchQuery]);

  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start(() => {
        if (showSearch && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, slideAnim, showSearch]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleSelect = (value: string) => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onSelect(value));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {showSearch && (
                <View style={styles.searchContainer}>
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Buscar..."
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setSearchQuery("")}
                    >
                      <Text style={styles.clearButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {filteredOptions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No se encontraron resultados para "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.optionsList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                >
                  {filteredOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionItem,
                        selectedValue === opt.value && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelect(opt.value)}
                    >
                      <Text
                        style={[
                          styles.optionItemText,
                          selectedValue === opt.value && styles.optionItemTextSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {opt.label}
                      </Text>
                      {selectedValue === opt.value && (
                        <Text style={styles.optionItemCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    paddingBottom: Platform.OS === "android" ? 24 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    padding: 8,
  },
  modalClose: {
    fontSize: 20,
    color: "#6b7280",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    color: "#111827",
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#6b7280",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  optionsList: {
    padding: 8,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
  },
  optionItemSelected: {
    backgroundColor: "#eff6ff",
  },
  optionItemText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
    marginRight: 8,
  },
  optionItemTextSelected: {
    color: "#2563eb",
    fontWeight: "500",
  },
  optionItemCheck: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
  },
});
