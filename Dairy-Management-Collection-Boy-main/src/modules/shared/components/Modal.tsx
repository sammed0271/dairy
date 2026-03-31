import React from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  disableBackdropClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  widthClassName = "max-w-lg",
  disableBackdropClose = false,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => {
        if (!disableBackdropClose) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${widthClassName} overflow-hidden rounded-xl border border-[#E9E2C8] bg-white shadow-xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#E9E2C8] bg-[#F8F4E3] px-5 py-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-[#5E503F]">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-[#5E503F]/70">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[#5E503F]/70 hover:bg-white"
          >
            X
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>

        {footer && (
          <div className="border-t border-[#E9E2C8] bg-[#F8F4E3] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
