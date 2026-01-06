import { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Text } from "./Text";
import DateTimePicker from "@react-native-community/datetimepicker";
import { UTCDate } from "@date-fns/utc";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface DatePickerFieldProps {
  label: string;
  isRequired: boolean;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function DatePickerField({
  label,
  isRequired,
  value,
  onChange,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const currentDate = value ? new Date(value) : new Date();
  const displayValue = value
    ? format(new UTCDate(parseISO(value).getTime()), "d 'de' MMMM, yyyy", { locale: es })
    : "Seleccionar fecha...";

  const handleChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      const utcDate = new UTCDate(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      onChange(utcDate.toISOString());
    }
  };

  const handlePress = () => {
    setShowPicker(true);
  };

  const handleConfirm = () => {
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {isRequired ? " *" : ""}
      </Text>
      <TouchableOpacity style={styles.input} onPress={handlePress}>
        <Text style={value ? styles.inputText : styles.placeholderText}>
          {displayValue}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <>
          <DateTimePicker
            value={currentDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Listo</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  inputText: {
    fontSize: 16,
    color: "#111827",
  },
  placeholderText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  confirmButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginTop: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
