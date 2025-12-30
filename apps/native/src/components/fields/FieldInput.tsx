import {
  View,
  Text,
  Switch,
  StyleSheet,
} from "react-native";
import { SelectField } from "./SelectField";
import { UserSelectField } from "./UserSelectField";
import { EntitySelectField } from "./EntitySelectField";
import { DatePickerField } from "../DatePickerField";
import { AttachmentField } from "../AttachmentField";
import { DebouncedTextInput } from "../DebouncedTextInput";
import { useAttachments } from "../../hooks/useAttachments";
import type { FieldTemplate } from "../../db/types";

interface FieldInputProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  fieldResponseClientId: string | undefined;
  userId: string;
  ensureFieldResponse: () => Promise<string>;
  getResponseForField?: (fieldServerId: string) => string | undefined;
}

export function FieldInput({
  field,
  value,
  onChange,
  fieldResponseClientId,
  userId,
  ensureFieldResponse,
  getResponseForField,
}: FieldInputProps) {
  const { attachment, createAttachment, removeAttachment } = useAttachments(
    fieldResponseClientId ?? "",
    userId
  );

  if (field.fieldType === "displayText") {
    const isHeader = field.displayStyle === "header";
    return (
      <View style={styles.fieldContainer}>
        <Text style={isHeader ? styles.displayHeader : styles.displayText}>
          {field.label}
        </Text>
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldRow}>
          <View>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.isRequired ? " *" : ""}
            </Text>
            {field.subheader && (
              <Text style={styles.fieldSubheader}>{field.subheader}</Text>
            )}
          </View>
          <Switch
            value={value === "true"}
            onValueChange={(val) => onChange(val ? "true" : "false")}
          />
        </View>
      </View>
    );
  }

  if (field.fieldType === "date") {
    return (
      <View style={styles.fieldContainer}>
        <DatePickerField
          label={field.label}
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
      <View style={styles.fieldContainer}>
        <AttachmentField
          label={field.label}
          isRequired={field.isRequired}
          attachment={attachment}
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
        />
        {field.subheader && (
          <Text style={styles.fieldSubheader}>{field.subheader}</Text>
        )}
      </View>
    );
  }

  if (field.fieldType === "select") {
    return (
      <SelectField
        field={field}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.fieldType === "userSelect") {
    return (
      <UserSelectField
        field={field}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.fieldType === "entitySelect") {
    return (
      <EntitySelectField
        field={field}
        value={value}
        onChange={onChange}
        getResponseForField={getResponseForField}
      />
    );
  }

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {field.label}
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
  fieldContainer: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  displayHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  displayText: {
    fontSize: 14,
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
});
