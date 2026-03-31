import React from "react";
import type { PaymentStatus } from "../types/payment";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  initiated: "bg-sky-50 text-sky-700",
  processing: "bg-blue-50 text-blue-700",
  processed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  reversed: "bg-amber-50 text-amber-700",
};

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
};

export default PaymentStatusBadge;
