import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.optionsList}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionItem,
                  selectedValue === opt.value && styles.optionItemSelected,
                ]}
                onPress={() => onSelect(opt.value)}
              >
                <Text style={[
                  styles.optionItemText,
                  selectedValue === opt.value && styles.optionItemTextSelected,
                ]}>
                  {opt.label}
                </Text>
                {selectedValue === opt.value && (
                  <Text style={styles.optionItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalClose: {
    fontSize: 20,
    color: "#6b7280",
    padding: 4,
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
