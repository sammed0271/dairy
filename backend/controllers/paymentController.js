import axios from "axios";
import Payment from "../models/Payment.js";
import Bill from "../models/Bill.js";

export const payBill = async (req, res) => {
  try {
    const { billId, accountNumber, ifsc, accountHolderName } = req.body;

    const bill = await Bill.findById(billId);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "Paid") {
      return res.status(400).json({ message: "Bill already paid" });
    }

    // 1️⃣ Create Contact
    const contactRes = await axios.post(
      "https://api.razorpay.com/v1/contacts",
      {
        name: accountHolderName,
        email: "farmer@test.com",
        contact: "9999999999",
        type: "vendor",
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
      },
    );

    const contact = contactRes.data;

    // 2️⃣ Create Fund Account
    const fundRes = await axios.post(
      "https://api.razorpay.com/v1/fund_accounts",
      {
        contact_id: contact.id,
        account_type: "bank_account",
        bank_account: {
          name: accountHolderName,
          ifsc: ifsc,
          account_number: accountNumber,
        },
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
      },
    );

    const fundAccount = fundRes.data;

    // 3️⃣ Create Payout
    const payoutRes = await axios.post(
      "https://api.razorpay.com/v1/payouts",
      {
        account_number: process.env.DAIRY_ACCOUNT_NUMBER,
        fund_account_id: fundAccount.id,
        amount: bill.netPayable * 100,
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
      },
    );

    const payout = payoutRes.data;

    await Payment.create({
      centerId: req.user.centerId,
      farmerId: bill.farmerId,
      billId: bill._id,
      amount: bill.netPayable,
      accountNumber,
      ifsc,
      accountHolderName,
      transactionId: payout.id,
      status: payout.status,
      createdAt: new Date(),
    });

    bill.status = "Paid";
    await bill.save();

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
  const event = req.body.event;

  if (event === "payout.processed") {
    const payoutId = req.body.payload.payout.entity.id;

    await Payment.findOneAndUpdate(
      { razorpayPayoutId: payoutId },
      { status: "processed" },
    );
  }

  if (event === "payout.failed") {
    const payoutId = req.body.payload.payout.entity.id;

    await Payment.findOneAndUpdate(
      { razorpayPayoutId: payoutId },
      { status: "failed" },
    );
  }

  res.status(200).send("OK");
};

export const payAllBills = async (req, res) => {
  try {
    const bills = await Bill.find({ centerID: req.user.centerId, status: "Pending" });

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

        // 1️⃣ Create Contact
        const contactRes = await axios.post(
          "https://api.razorpay.com/v1/contacts",
          {
            name: "Farmer",
            email: "farmer@test.com",
            contact: "9999999999",
            type: "vendor",
          },
          {
            auth: {
              username: process.env.RAZORPAY_KEY_ID,
              password: process.env.RAZORPAY_KEY_SECRET,
            },
          }
        );

        const contact = contactRes.data;

        // 2️⃣ Create Fund Account
        const fundRes = await axios.post(
          "https://api.razorpay.com/v1/fund_accounts",
          {
            contact_id: contact.id,
            account_type: "bank_account",
            bank_account: {
              name: "Farmer",
              ifsc: "HDFC0000001",
              account_number: "222222222222",
            },
          },
          {
            auth: {
              username: process.env.RAZORPAY_KEY_ID,
              password: process.env.RAZORPAY_KEY_SECRET,
            },
          }
        );

        const fundAccount = fundRes.data;

        // 3️⃣ Create Payout
        const payoutRes = await axios.post(
          "https://api.razorpay.com/v1/payouts",
          {
            account_number: process.env.DAIRY_ACCOUNT_NUMBER,
            fund_account_id: fundAccount.id,
            amount: bill.netPayable * 100,
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
          },
          {
            auth: {
              username: process.env.RAZORPAY_KEY_ID,
              password: process.env.RAZORPAY_KEY_SECRET,
            },
          }
        );

        const payout = payoutRes.data;

        await Payment.create({
          centerId: req.user.centerId,
          farmerId: bill.farmerId,
          billId: bill._id,
          amount: bill.netPayable,
          transactionId: payout.id,
          status: payout.status,
          createdAt: new Date(),
        });

        bill.status = "Paid";
        await bill.save();

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
