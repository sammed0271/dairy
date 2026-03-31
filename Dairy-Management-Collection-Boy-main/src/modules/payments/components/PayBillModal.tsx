import React, { useState } from "react";
import toast from "react-hot-toast";
import { payBillToBank } from "../../../axios/payment_api";
import { FormInput, Modal } from "../../shared/components";

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
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pay Bill to ${farmerName}`}
      subtitle={`Amount: Rs ${amount.toFixed(2)}`}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm text-[#5E503F]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void payBill()}
            disabled={loading}
            className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
          >
            {loading ? "Processing..." : "Pay Now"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormInput
          label="Account Holder Name"
          value={holderName}
          onChange={(event) => setHolderName(event.target.value)}
        />
        <FormInput
          label="Account Number"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
        />
        <FormInput
          label="IFSC Code"
          value={ifsc}
          onChange={(event) => setIfsc(event.target.value.toUpperCase())}
        />
      </div>
    </Modal>
  );
};

export default PayBillModal;
