// src/components/selectField.tsx
import React from "react";
import clsx from "clsx";

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectFieldProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> {
  label?: string;
  requiredLabel?: boolean;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  containerClassName?: string;
  selectClassName?: string;
}

/**
 * Reusable styled select dropdown.
 */
const SelectField: React.FC<SelectFieldProps> = ({
  label,
  requiredLabel,
  error,
  helperText,
  options,
  containerClassName,
  selectClassName,
  id,
  ...rest
}) => {
  const selectId = id || (label ? label.replace(/\s+/g, "-") : undefined);

  return (
    <div className={clsx("flex flex-col gap-1", containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-[#5E503F]"
        >
          {label} {requiredLabel && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={clsx(
          "relative flex items-center rounded-md border bg-white",
          error ? "border-red-500" : "border-[#E9E2C8]",
          "focus-within:ring-2 focus-within:ring-[#2A9D8F]",
        )}
      >
        <select
          id={selectId}
          {...rest}
          className={clsx(
            "w-full appearance-none rounded-md bg-transparent px-3 py-2 text-sm text-[#5E503F] outline-none",
            selectClassName,
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-xs text-[#5E503F]/70">
          ▼
        </span>
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#5E503F]/60">{helperText}</p>
      ) : null}
    </div>
  );
};

export default SelectField;
