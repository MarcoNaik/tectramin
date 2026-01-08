import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import { Text } from "../../Text";
import { InlineOptionPicker } from "../../common/InlineOptionPicker";
import { MultiOptionPicker } from "../../common/MultiOptionPicker";
import { SelectedChips } from "../../common/SelectedChips";
import { useExpandedField } from "../ExpandedFieldContext";
import { useSelectorOptions, type OptionsSourceConfig } from "../../../hooks/useSelectorOptions";
import { filterAndSortByFuzzy } from "../../../utils/fuzzySearch";
import {
  parseSelectValue,
  serializeSelectValue,
  toggleMultiValue,
  getSelectedLabels,
} from "../../../utils/selectorValue";
import type { FieldTemplate } from "../../../db/types";

interface BaseSelectorFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  isMultiple: boolean;
  optionsConfig: OptionsSourceConfig;
  placeholder: string;
  disabledPlaceholder?: string;
  marginBottom?: number;
}

export function BaseSelectorField({
  field,
  value,
  onChange,
  isMultiple,
  optionsConfig,
  placeholder,
  disabledPlaceholder,
  marginBottom = 16,
}: BaseSelectorFieldProps) {
  const { isExpanded, toggle, collapse } = useExpandedField(field.serverId);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const { options, needsParentSelection, entityTypeName } = useSelectorOptions(optionsConfig);

  const parsedValue = parseSelectValue(value, isMultiple);
  const selectedValues = isMultiple
    ? (Array.isArray(parsedValue) ? parsedValue : [])
    : [];
  const selectedSingleValue = !isMultiple && typeof parsedValue === "string"
    ? parsedValue
    : undefined;

  const selectedOption = !isMultiple
    ? options.find((opt) => opt.value === selectedSingleValue)
    : undefined;

  const selectedLabels = isMultiple
    ? getSelectedLabels(selectedValues, options)
    : [];

  const filteredOptions = useMemo(() => {
    return filterAndSortByFuzzy(options, searchQuery, (opt) => opt.label);
  }, [options, searchQuery]);

  const displayPlaceholder = needsParentSelection
    ? (disabledPlaceholder ?? "Selecciona el campo padre primero...")
    : entityTypeName
    ? `${placeholder.replace("...", "")} ${entityTypeName}...`
    : placeholder;

  useEffect(() => {
    if (isExpanded) {
      setSearchQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleSubmit = () => {
    if (filteredOptions.length > 0) {
      if (isMultiple) {
        const newValues = toggleMultiValue(selectedValues, filteredOptions[0].value);
        onChange(serializeSelectValue(newValues) ?? "");
      } else {
        onChange(filteredOptions[0].value);
        collapse();
      }
    }
  };

  const handleSingleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    collapse();
  };

  const handleMultiToggle = (valueToToggle: string) => {
    const newValues = toggleMultiValue(selectedValues, valueToToggle);
    onChange(serializeSelectValue(newValues) ?? "");
  };

  const handlePress = () => {
    if (!needsParentSelection) {
      toggle();
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
      ) : isMultiple ? (
        <SelectedChips
          selectedLabels={selectedLabels}
          placeholder={displayPlaceholder}
          onPress={handlePress}
          disabled={needsParentSelection}
        />
      ) : (
        <TouchableOpacity
          style={[
            styles.selectButton,
            needsParentSelection && styles.selectButtonDisabled,
          ]}
          onPress={handlePress}
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
            {selectedOption ? selectedOption.label : displayPlaceholder}
          </Text>
          <Text style={styles.selectButtonChevron}>▼</Text>
        </TouchableOpacity>
      )}

      {isMultiple ? (
        <MultiOptionPicker
          isExpanded={isExpanded}
          options={options}
          selectedValues={selectedValues}
          searchQuery={searchQuery}
          onToggle={handleMultiToggle}
          onDone={collapse}
        />
      ) : (
        <InlineOptionPicker
          isExpanded={isExpanded}
          options={options}
          selectedValue={selectedSingleValue}
          searchQuery={searchQuery}
          onSelect={handleSingleSelect}
          onCollapse={collapse}
        />
      )}
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
