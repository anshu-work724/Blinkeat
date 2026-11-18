import dotenv from "dotenv";
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const router = express.Router();

// Create a Razorpay order
router.post("/create-order", async (req, res) => {
  const { amount } = req.body; // Amount in paise (₹100 = 10000)
  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID, // Public key safe to send to frontend
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Razorpay payment signature (server-side security check)
router.post("/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, message: "Missing payment verification fields" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false, message: "Payment verification failed" });
  }
});

export default router;
