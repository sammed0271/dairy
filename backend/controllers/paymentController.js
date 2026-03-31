import axios from "axios";
import Payment from "../models/Payment.js";
import Bill from "../models/Bill.js";
import { logAudit } from "../services/auditService.js";
import { getScopedFilter } from "../utils/access.js";
import { resolveBillStatusFromPaymentStatus } from "../utils/paymentStatus.js";

const findPaymentByPayoutId = async (payoutId) => {
  if (!payoutId) {
    return null;
  }

  return Payment.findOne({ razorpayPayoutId: payoutId });
};

const updatePaymentAndBillStatus = async ({
  payment,
  status,
  failureReason,
  req,
  event,
}) => {
  if (!payment) {
    return null;
  }

  payment.status = status;
  payment.failureReason = failureReason ?? payment.failureReason;
  await payment.save();

  if (payment.billId) {
    await Bill.findByIdAndUpdate(payment.billId, {
      status: resolveBillStatusFromPaymentStatus(status),
    });
  }

  await logAudit({
    req,
    centreId: payment.centreId,
    action: status === "processed" ? "payment_processed" : "payment_failed",
    entityType: "Payment",
    entityId: payment._id,
    details: {
      payoutId: payment.razorpayPayoutId,
      event,
      status,
      failureReason: failureReason ?? null,
    },
  });

  return payment;
};


const createRazorpayPayout = async ({
  accountHolderName,
  accountNumber,
  ifsc,
  amount,
}) => {
  const auth = {
    username: process.env.RAZORPAY_KEY_ID,
    password: process.env.RAZORPAY_KEY_SECRET,
  };

  const contactRes = await axios.post(
    "https://api.razorpay.com/v1/contacts",
    {
      name: accountHolderName,
      email: "farmer@test.com",
      contact: "9999999999",
      type: "vendor",
    },
    { auth },
  );

  const fundRes = await axios.post(
    "https://api.razorpay.com/v1/fund_accounts",
    {
      contact_id: contactRes.data.id,
      account_type: "bank_account",
      bank_account: {
        name: accountHolderName,
        ifsc,
        account_number: accountNumber,
      },
    },
    { auth },
  );

  const payoutRes = await axios.post(
    "https://api.razorpay.com/v1/payouts",
    {
      account_number: process.env.DAIRY_ACCOUNT_NUMBER,
      fund_account_id: fundRes.data.id,
      amount,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
    },
    { auth },
  );

  return {
    contact: contactRes.data,
    fundAccount: fundRes.data,
    payout: payoutRes.data,
  };
};

export const payBill = async (req, res) => {
  try {
    const { billId, accountNumber, ifsc, accountHolderName } = req.body;
    const bill = await Bill.findOne(getScopedFilter(req, { _id: billId }));

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "Paid") {
      return res.status(400).json({ message: "Bill already paid" });
    }

    const { contact, fundAccount, payout } = await createRazorpayPayout({
      accountHolderName,
      accountNumber,
      ifsc,
      amount: Math.round(bill.netPayable * 100),
    });

    await Payment.create({
      centreId: bill.centreId ?? req.user?.centreId ?? null,
      farmerId: bill.farmerId,
      billId: bill._id,
      amount: bill.netPayable,
      accountNumber,
      ifsc,
      accountHolderName,
      razorpayContactId: contact.id,
      razorpayFundAccountId: fundAccount.id,
      razorpayPayoutId: payout.id,
      transactionId: payout.id,
      status: payout.status,
      createdAt: new Date(),
    });



    await logAudit({
      req,
      centreId: bill.centreId,
      action: "payment_initiated",
      entityType: "Payment",
      entityId: payout.id,
      details: { billId, amount: bill.netPayable },
    });

    res.json({
      success: true,
      transactionId: payout.id,
    });
  } catch (error) {
    console.error("RAZORPAY ERROR:", error.response?.data || error.message);

    const message =
      error?.response?.data?.error?.description ||
      error?.response?.data?.error ||
      error.message ||
      "Payment failed";

    res.status(500).json({
      success: false,
      message,
    });
  }
};

export const razorpayWebhook = async (req, res) => {
  try {
    const event = req.body?.event;
    const payoutEntity = req.body?.payload?.payout?.entity ?? null;
    const payoutId = payoutEntity?.id;

    if (!event || !payoutId) {
      return res.status(200).send("OK");
    }

    const payment = await findPaymentByPayoutId(payoutId);

    if (!payment) {
      return res.status(200).send("OK");
    }

    if (event === "payout.processed") {
      await updatePaymentAndBillStatus({
        payment,
        status: "processed",
        req,
        event,
      });
    }

    if (event === "payout.failed" || event === "payout.reversed") {
      await updatePaymentAndBillStatus({
        payment,
        status: event === "payout.reversed" ? "reversed" : "failed",
        failureReason:
          payoutEntity?.status_details?.description ||
          payoutEntity?.status_details?.reason ||
          null,
        req,
        event,
      });
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("RAZORPAY WEBHOOK ERROR:", error.message);
    return res.status(500).send("Webhook processing failed");
  }
};

export const payAllBills = async (req, res) => {
  try {
    const bills = await Bill.find(getScopedFilter(req, { status: "Pending" }));

    if (!bills.length) {
      return res.json({
        success: false,
        message: "No pending bills found",
      });
    }

    let success = 0;
    let failed = 0;
    const failedBills = [];

    for (const bill of bills) {
      try {
        const { payout } = await createRazorpayPayout({
          accountHolderName: "Farmer",
          accountNumber: "222222222222",
          ifsc: "HDFC0000001",
          amount: bill.netPayable * 100,
        });

        await Payment.create({
          centreId: bill.centreId ?? req.user?.centreId ?? null,
          farmerId: bill.farmerId,
          billId: bill._id,
          amount: bill.netPayable,
          transactionId: payout.id,
          razorpayPayoutId: payout.id,
          status: payout.status,
          createdAt: new Date(),
        });

        bill.status = "Paid";
        await bill.save();

        await logAudit({
          req,
          centreId: bill.centreId,
          action: "payment_initiated",
          entityType: "Payment",
          entityId: payout.id,
          details: { billId: bill._id, amount: bill.netPayable, bulk: true },
        });

        success++;
      } catch (error) {
        const message =
          error?.response?.data?.error?.description ||
          error?.response?.data?.error ||
          error.message ||
          "Payment failed";

        console.error(`BULK PAYOUT ERROR (Bill ${bill._id})`, message);

        failed++;
        failedBills.push({
          billId: bill._id,
          farmerId: bill.farmerId,
          reason: message,
        });
      }
    }

    return res.json({
      success: true,
      message: "Bulk payout process completed",
      paidBills: success,
      failedBillsCount: failed,
      failedBills,
    });
  } catch (error) {
    console.error("BULK PAYMENT ERROR:", error.response?.data || error.message);

    const message =
      error?.response?.data?.error?.description ||
      error?.response?.data?.error ||
      error.message ||
      "Bulk payment failed";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find(getScopedFilter(req))
      .populate("billId", "periodFrom periodTo status")
      .populate("farmerId", "name code")
      .populate("centreId", "name code")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFarmerPayments = async (req, res) => {
  try {
    const payments = await Payment.find(
      getScopedFilter(req, { farmerId: req.params.farmerId }),
    )
      .populate("billId", "periodFrom periodTo status")
      .populate("farmerId", "name code")
      .populate("centreId", "name code")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
