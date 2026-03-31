import React from "react";
import StatCard from "../../../components/statCard";
import type { PaymentSummaryRecord } from "../types/payment";

interface PaymentsSummaryProps {
  payments: PaymentSummaryRecord[];
}

const PaymentsSummary: React.FC<PaymentsSummaryProps> = ({ payments }) => {
  const totalAmount = payments.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const processed = payments.filter((item) => item.status === "processed");
  const inFlight = payments.filter((item) =>
    ["initiated", "processing"].includes(item.status),
  );
  const exceptions = payments.filter((item) =>
    ["failed", "reversed"].includes(item.status),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Payments"
        value={payments.length}
        subtitle="Recorded payouts"
      />
      <StatCard
        title="Processed"
        value={processed.length}
        subtitle="Completed settlements"
        variant="green"
      />
      <StatCard
        title="In Flight"
        value={inFlight.length}
        subtitle="Awaiting final webhook"
        variant="blue"
      />
      <StatCard
        title="Total Amount"
        value={`Rs ${totalAmount.toFixed(2)}`}
        subtitle={`${exceptions.length} exception records`}
        variant="orange"
      />
    </div>
  );
};

export default PaymentsSummary;
