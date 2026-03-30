// src/components/inputField.tsx
import React from "react";
import clsx from "clsx";

export interface InputFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  label?: string;
  requiredLabel?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
}

/**
 * Reusable styled input field with label + error text.
 */
const InputField: React.FC<InputFieldProps> = ({
  label,
  requiredLabel,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName,
  inputClassName,
  id,
  ...rest
}) => {
  const inputId = id || (label ? label.replace(/\s+/g, "-") : undefined);

  return (
    <div className={clsx("flex flex-col gap-1", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[#5E503F]">
          {label} {requiredLabel && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={clsx(
          "flex items-center rounded-md border bg-white",
          error ? "border-red-500" : "border-[#E9E2C8]",
          "focus-within:ring-2 focus-within:ring-[#2A9D8F]",
        )}
      >
        {leftIcon && (
          <span className="pl-3 pr-1 text-[#5E503F]/60">{leftIcon}</span>
        )}
        <input
          id={inputId}
          {...rest}
          className={clsx(
            "w-full border-0 bg-transparent px-3 py-2 text-sm text-[#5E503F] outline-none placeholder:text-[#5E503F]/45",
            leftIcon && "pl-1",
            rightIcon && "pr-1",
            inputClassName,
          )}
        />
        {rightIcon && (
          <span className="pr-3 pl-1 text-[#5E503F]/60">{rightIcon}</span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#5E503F]/60">{helperText}</p>
      ) : null}
    </div>
  );
};

export default InputField;
