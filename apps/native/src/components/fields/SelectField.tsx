import { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text } from "../Text";
import { OptionPickerModal } from "../common/OptionPickerModal";
import { parseSelectOptions } from "../../types/select";
import type { FieldTemplate } from "../../db/types";

interface SelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  marginBottom?: number;
}

export function SelectField({
  field,
  value,
  onChange,
  marginBottom = 16,
}: SelectFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const options = parseSelectOptions(field.displayStyle);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={[styles.fieldContainer, { marginBottom }]}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedOption ? styles.selectButtonText : styles.selectButtonPlaceholder}>
          {selectedOption ? selectedOption.label : "Seleccionar una opción..."}
        </Text>
        <Text style={styles.selectButtonChevron}>▼</Text>
      </TouchableOpacity>

      <OptionPickerModal
        visible={modalVisible}
        options={options}
        selectedValue={value}
        onSelect={(val) => {
          onChange(val);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
        title={field.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {},
  fieldLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  fieldSubheader: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#111827",
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: "#9ca3af",
  },
  selectButtonChevron: {
    fontSize: 12,
    color: "#6b7280",
  },
});
