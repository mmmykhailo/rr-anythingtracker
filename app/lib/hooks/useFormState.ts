import { useState, useCallback } from "react";

// Hook for form state management
export function useFormState<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setState((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is updated
      if (errors[field as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setErrors({});
  }, [initialState]);

  return {
    state,
    errors,
    updateField,
    setFieldError,
    clearErrors,
    reset,
    setState,
  };
}
