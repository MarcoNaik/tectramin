import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import { Text } from "../Text";
import type { SelectOption } from "../../types/select";

interface OptionPickerModalProps {
  visible: boolean;
  options: SelectOption[];
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
  onClose: () => void;
  title: string;
}

export function OptionPickerModal({
  visible,
  options,
  selectedValue,
  onSelect,
  onClose,
  title,
}: OptionPickerModalProps) {
  const handleOpen = () => {
    Keyboard.dismiss();
  };

  const handleSelect = (value: string) => {
    onSelect(value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.optionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {options.map((opt) => (
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
          </Pressable>
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
