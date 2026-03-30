// src/components/confirmModal.tsx
import React from "react";

export type ConfirmVariant = "primary" | "danger";

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  /** Called when user clicks confirm */
  onConfirm: () => void;
  /** Called when user clicks cancel or close */
  onCancel: () => void;
  /** If true, clicking on backdrop will NOT close modal */
  disableBackdropClose?: boolean;
}

/**
 * Reusable confirmation modal for delete / approve etc.
 * Uses app color scheme.
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
  disableBackdropClose = false,
}) => {
  if (!open) return null;

  const confirmClasses =
    variant === "danger"
      ? "bg-[#E76F51] hover:bg-[#D45A3F]"
      : "bg-[#2A9D8F] hover:bg-[#247B71]";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={() => {
        if (!disableBackdropClose && !loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[#E9E2C8] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2.5">
          <span className="text-sm font-semibold text-[#5E503F]">
            {title}
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-sm text-[#5E503F]/70 hover:text-[#5E503F]"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 text-sm text-[#5E503F]">
          {description ? (
            description
          ) : (
            <p>
              This action cannot be undone. Do you want to continue?
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-[#E9E2C8] bg-white px-4 py-1.5 text-xs font-medium text-[#5E503F] hover:bg-[#F8F4E3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-1.5 text-xs font-medium text-white shadow ${confirmClasses} disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;