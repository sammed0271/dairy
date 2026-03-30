import React, { useState } from "react";
import toast from "react-hot-toast";
import { payBillToBank } from "../../axios/payment_api";
interface Props {
  billId: string;
  farmerName: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PayBillModal: React.FC<Props> = ({
  billId,
  farmerName,
  amount,
  onClose,
  onSuccess,
}) => {
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [holderName, setHolderName] = useState("");
  const [loading, setLoading] = useState(false);

  const payBill = async () => {
  if (!accountNumber || !ifsc || !holderName) {
    toast.error("Please fill all bank details");
    return;
  }

  if (ifsc.length !== 11) {
    toast.error("The IFSC must be 11 characters.");
    return;
  }

  if (accountNumber.length < 9 || accountNumber.length > 18) {
    toast.error("Bank number is not valid.");
    return;
  }

  try {
    setLoading(true);

    await payBillToBank({
      billId,
      accountNumber,
      ifsc,
      accountHolderName: holderName,
    });

    toast.success("Payment initiated");

    onSuccess();
    onClose();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Payment failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-lg p-6 w-[400px] shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Pay Bill to {farmerName}</h2>

        <div className="text-sm mb-4">
          Amount: <b>₹ {amount}</b>
        </div>

        <input
          placeholder="Account Holder Name"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
        />

        <input
          placeholder="Account Number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
        />

        <input
          placeholder="IFSC Code"
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
          className="w-full border p-2 mb-4 rounded"
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Cancel
          </button>

          <button
            onClick={payBill}
            disabled={loading}
            className="bg-[#2A9D8F] text-white px-4 py-2 rounded"
          >
            {loading ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayBillModal;
