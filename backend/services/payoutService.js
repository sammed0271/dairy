import axios from "axios";

export const createPayout = async ({ fundAccountId, amount }) => {
  const response = await axios.post(
    "https://api.razorpay.com/v1/payouts",
    {
      account_number: process.env.DAIRY_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount,
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

  return response.data;
};