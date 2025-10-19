import React from "react";

export function useFormFields<T extends Record<string, any>>(initial: T) {
  const [values, setValues] = React.useState<T>(initial);
  const handleChange = React.useCallback(
    (key: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    []
  );
  return { values, setValues, handleChange } as const;
}

