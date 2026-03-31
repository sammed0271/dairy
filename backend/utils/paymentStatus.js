export const resolveBillStatusFromPaymentStatus = (status) =>
  status === "processed" ? "Paid" : "Pending";