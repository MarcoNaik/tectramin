import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text } from "../Text";
import { SelectField } from "./SelectField";
import { MultiSelectField } from "./MultiSelectField";
import { UserSelectField } from "./UserSelectField";
import { MultiUserSelectField } from "./MultiUserSelectField";
import { EntitySelectField } from "./EntitySelectField";
import { MultiEntitySelectField } from "./MultiEntitySelectField";
import { DatePickerField } from "../DatePickerField";
import { AttachmentField } from "../AttachmentField";
import { DebouncedTextInput } from "../DebouncedTextInput";
import { useAttachments } from "../../hooks/useAttachments";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import type { FieldTemplate } from "../../db/types";

interface FieldInputProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  fieldResponseClientId: string | undefined;
  userId: string;
  ensureFieldResponse: () => Promise<string>;
  getResponseForField?: (fieldServerId: string) => string | undefined;
  index?: number;
  marginBottom?: number;
}

export function FieldInput({
  field,
  value,
  onChange,
  fieldResponseClientId,
  userId,
  ensureFieldResponse,
  getResponseForField,
  index,
  marginBottom = 16,
}: FieldInputProps) {
  const { attachment, isLocalPreview, createAttachment, removeAttachment, retryUpload } = useAttachments(
    fieldResponseClientId ?? "",
    userId
  );
  const isOnline = useNetworkStatus();

  const formatLabel = (label: string) => {
    return index !== undefined ? `${index}. ${label}` : label;
  };

  const containerStyle = [styles.fieldContainer, { marginBottom }];

  if (field.fieldType === "displayText") {
    const isHeader = field.displayStyle === "header";
    return (
      <View style={containerStyle}>
        <Text style={isHeader ? styles.displayHeader : styles.displayText}>
          {formatLabel(field.label)}
        </Text>
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  if (field.fieldType === "boolean") {
    const isTrue = value === "true";
    const isFalse = value === "false";
    return (
      <View style={containerStyle}>
        <Text style={styles.fieldLabel}>
          {formatLabel(field.label)}
          {field.isRequired ? " *" : ""}
        </Text>
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
        <View style={styles.booleanOptions}>
          <TouchableOpacity
            style={[
              styles.booleanOption,
              isTrue && styles.booleanOptionSelected,
              isTrue && styles.booleanOptionTrue,
            ]}
            onPress={() => onChange("true")}
            activeOpacity={0.7}
          >
            <Text style={[styles.booleanIcon, isTrue && styles.booleanIconTrue]}>✓</Text>
            <Text style={[styles.booleanLabel, isTrue && styles.booleanLabelSelected]}>Sí</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.booleanOption,
              isFalse && styles.booleanOptionSelected,
              isFalse && styles.booleanOptionFalse,
            ]}
            onPress={() => onChange("false")}
            activeOpacity={0.7}
          >
            <Text style={[styles.booleanIcon, isFalse && styles.booleanIconFalse]}>✗</Text>
            <Text style={[styles.booleanLabel, isFalse && styles.booleanLabelSelected]}>No</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (field.fieldType === "date") {
    return (
      <View style={containerStyle}>
        <DatePickerField
          label={formatLabel(field.label)}
          isRequired={field.isRequired}
          value={value}
          onChange={onChange}
        />
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  if (field.fieldType === "attachment") {
    return (
      <View style={containerStyle}>
        <AttachmentField
          label={formatLabel(field.label)}
          isRequired={field.isRequired}
          displayStyle={field.displayStyle}
          attachment={attachment}
          isLocalPreview={isLocalPreview}
          isOnline={isOnline}
          onPickImage={async (uri, fileName, mimeType, fileSize) => {
            const responseClientId = fieldResponseClientId || await ensureFieldResponse();
            const clientId = await createAttachment({
              fieldResponseClientId: responseClientId,
              uri,
              fileName,
              mimeType,
              fileSize,
            });
            onChange(clientId);
          }}
          onPickDocument={async (uri, fileName, mimeType, fileSize) => {
            const responseClientId = fieldResponseClientId || await ensureFieldResponse();
            const clientId = await createAttachment({
              fieldResponseClientId: responseClientId,
              uri,
              fileName,
              mimeType,
              fileSize,
            });
            onChange(clientId);
          }}
          onRemove={async () => {
            await removeAttachment();
            onChange("");
          }}
          onRetry={retryUpload}
        />
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  const fieldWithFormattedLabel = { ...field, label: formatLabel(field.label) };

  if (field.fieldType === "select") {
    return (
      <SelectField
        field={fieldWithFormattedLabel}
        value={value}
        onChange={onChange}
        marginBottom={marginBottom}
      />
    );
  }

  if (field.fieldType === "multiSelect") {
    return (
      <MultiSelectField
        field={fieldWithFormattedLabel}
        value={value}
        onChange={onChange}
        marginBottom={marginBottom}
      />
    );
  }

  if (field.fieldType === "userSelect") {
    return (
      <UserSelectField
        field={fieldWithFormattedLabel}
        value={value}
        onChange={onChange}
        marginBottom={marginBottom}
      />
    );
  }

  if (field.fieldType === "multiUserSelect") {
    return (
      <MultiUserSelectField
        field={fieldWithFormattedLabel}
        value={value}
        onChange={onChange}
        marginBottom={marginBottom}
      />
    );
  }

  if (field.fieldType === "entitySelect") {
    return (
      <EntitySelectField
        field={fieldWithFormattedLabel}
        value={value}
        onChange={onChange}
        getResponseForField={getResponseForField}
        marginBottom={marginBottom}
      />
    );
  }

  if (field.fieldType === "multiEntitySelect") {
    return (
      <MultiEntitySelectField
        field={fieldWithFormattedLabel}
        value={value}
        onChange={onChange}
        getResponseForField={getResponseForField}
        marginBottom={marginBottom}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={styles.fieldLabel}>
        {formatLabel(field.label)}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}
      <DebouncedTextInput
        fieldServerId={field.serverId}
        style={styles.fieldInput}
        initialValue={value ?? field.defaultValue ?? ""}
        onDebouncedChange={onChange}
        placeholder={field.placeholder ?? ""}
        keyboardType={field.fieldType === "number" ? "numeric" : "default"}
        debounceMs={500}
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
  displayHeader: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  displayText: {
    fontSize: 18,
    color: "#374151",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  booleanOptions: {
    flexDirection: "row",
    gap: 12,
  },
  booleanOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  booleanOptionSelected: {
    borderWidth: 2,
  },
  booleanOptionTrue: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  booleanOptionFalse: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  booleanIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#9ca3af",
  },
  booleanIconTrue: {
    color: "#16a34a",
  },
  booleanIconFalse: {
    color: "#dc2626",
  },
  booleanLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
  },
  booleanLabelSelected: {
    color: "#111827",
    fontWeight: "600",
  },
});
