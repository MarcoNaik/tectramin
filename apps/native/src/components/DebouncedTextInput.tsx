import { useState, useEffect, useCallback } from "react";
import { TextInput, TextInputProps } from "react-native";
import { useDebouncedCallback } from "../hooks/useDebounce";
import { usePendingFieldValues } from "../providers/PendingFieldValuesContext";

interface DebouncedTextInputProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  fieldServerId: string;
  initialValue: string;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
}

export function DebouncedTextInput({
  fieldServerId,
  initialValue,
  onDebouncedChange,
  debounceMs = 500,
  onBlur,
  ...textInputProps
}: DebouncedTextInputProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  const { registerPending, unregisterPending } = usePendingFieldValues();

  const { debouncedFn, flush } = useDebouncedCallback(
    (value: string) => {
      onDebouncedChange(value);
      unregisterPending(fieldServerId);
    },
    debounceMs
  );

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      registerPending(fieldServerId, text, () => {
        onDebouncedChange(text);
        unregisterPending(fieldServerId);
      });
      debouncedFn(text);
    },
    [fieldServerId, debouncedFn, registerPending, unregisterPending, onDebouncedChange]
  );

  const handleBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>(
    (e) => {
      flush();
      onBlur?.(e);
    },
    [flush, onBlur]
  );

  return (
    <TextInput
      {...textInputProps}
      value={localValue}
      onChangeText={handleChange}
      onBlur={handleBlur}
    />
  );
}
