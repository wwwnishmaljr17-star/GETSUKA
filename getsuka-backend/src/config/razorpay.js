import Razorpay from "razorpay";
import dotenv from "dotenv";
import axios from "axios";
import https from "https";

dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_Tk6UefHQRMcBWo";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "MCb8s8pa8OrIAE4TVWFxOOxW";

const razorpay = new Razorpay({
  key_id,
  key_secret,
});

const httpsAgent = new https.Agent({ family: 4, keepAlive: true });

// Robust order creation with IPv4 & custom headers to prevent Windows ECONNRESET
const originalCreate = razorpay.orders.create.bind(razorpay.orders);
razorpay.orders.create = async function (options) {
  try {
    const res = await axios.post("https://api.razorpay.com/v1/orders", options, {
      httpsAgent,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
      },
      auth: {
        username: key_id,
        password: key_secret,
      },
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    console.warn("Direct Razorpay HTTP request failed, falling back to SDK:", err.message);
    return originalCreate(options);
  }
};

export default razorpay;