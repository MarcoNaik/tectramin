import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import { Text } from "../Text";
import { InlineOptionPicker } from "../common/InlineOptionPicker";
import { useExpandedField } from "./ExpandedFieldContext";
import { parseSelectOptions } from "../../types/select";
import { filterAndSortByFuzzy } from "../../utils/fuzzySearch";
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
  const { isExpanded, toggle, collapse } = useExpandedField(field.serverId);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const options = parseSelectOptions(field.displayStyle);
  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    return filterAndSortByFuzzy(options, searchQuery, (opt) => opt.label);
  }, [options, searchQuery]);

  useEffect(() => {
    if (isExpanded) {
      setSearchQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleSubmit = () => {
    if (filteredOptions.length > 0) {
      onChange(filteredOptions[0].value);
      collapse();
    }
  };

  return (
    <View style={[styles.fieldContainer, { marginBottom }]}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}

      {isExpanded ? (
        <Pressable
          style={styles.searchContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      ) : (
        <TouchableOpacity style={styles.selectButton} onPress={toggle}>
          <Text style={selectedOption ? styles.selectButtonText : styles.selectButtonPlaceholder}>
            {selectedOption ? selectedOption.label : "Seleccionar una opción..."}
          </Text>
          <Text style={styles.selectButtonChevron}>▼</Text>
        </TouchableOpacity>
      )}

      <InlineOptionPicker
        isExpanded={isExpanded}
        options={options}
        selectedValue={value}
        searchQuery={searchQuery}
        onSelect={onChange}
        onCollapse={collapse}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    color: "#111827",
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 20,
    color: "#6b7280",
  },
});
