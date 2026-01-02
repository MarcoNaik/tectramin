import { useState, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text } from "../Text";
import { OptionPickerModal } from "../common/OptionPickerModal";
import { useLookupEntities } from "../../hooks/useLookupEntities";
import type { FieldTemplate } from "../../db/types";

interface EntitySelectConfig {
  entityTypeId?: string;
  filterByFieldId?: string;
}

function parseEntitySelectConfig(displayStyle: string | undefined): EntitySelectConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as EntitySelectConfig;
    }
    return {};
  } catch {
    return {};
  }
}

interface EntitySelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  getResponseForField?: (fieldServerId: string) => string | undefined;
}

export function EntitySelectField({
  field,
  value,
  onChange,
  getResponseForField,
}: EntitySelectFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const config = parseEntitySelectConfig(field.displayStyle ?? undefined);

  const parentEntityValue = useMemo(() => {
    if (!config.filterByFieldId || !getResponseForField) return undefined;
    return getResponseForField(config.filterByFieldId);
  }, [config.filterByFieldId, getResponseForField]);

  const { entities, entityType } = useLookupEntities(
    config.entityTypeId,
    parentEntityValue
  );

  const options = useMemo(() => {
    return entities.map((e) => ({
      value: e.serverId,
      label: e.label,
    }));
  }, [entities]);

  const selectedOption = options.find((opt) => opt.value === value);

  const needsParentSelection = !!(config.filterByFieldId && !parentEntityValue);

  const placeholder = needsParentSelection
    ? "Selecciona el campo padre primero..."
    : entityType
    ? `Seleccionar ${entityType.name}...`
    : "Seleccionar...";

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}
      <TouchableOpacity
        style={[
          styles.selectButton,
          needsParentSelection && styles.selectButtonDisabled,
        ]}
        onPress={() => !needsParentSelection && setModalVisible(true)}
        disabled={needsParentSelection}
      >
        <Text
          style={
            selectedOption
              ? styles.selectButtonText
              : needsParentSelection
              ? styles.selectButtonDisabledText
              : styles.selectButtonPlaceholder
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
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
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#374151",
  },
  fieldSubheader: {
    fontSize: 12,
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
  selectButtonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#111827",
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: "#9ca3af",
  },
  selectButtonDisabledText: {
    fontSize: 16,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  selectButtonChevron: {
    fontSize: 12,
    color: "#6b7280",
  },
});
