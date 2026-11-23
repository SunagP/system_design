/**
 * Razorpay Payment Configuration for Designed to Scale
 *
 * One-time payment: ₹49 (4900 paise)
 * Enables UPI (Google Pay, PhonePe, Paytm) and Debit/Credit Cards.
 *
 * To connect your live or test Razorpay account:
 * 1. Log in to https://dashboard.razorpay.com/
 * 2. Go to Account & Settings -> API Keys (under Website & App Settings)
 * 3. Generate a Key ID (starts with "rzp_test_" for test mode or "rzp_live_" for production)
 * 4. Paste your Key ID below:
 */

window.RAZORPAY_CONFIG = {
  keyId: "rzp_live_U3gqrnGLqR3zgY",
  amount: 4900,                    // ₹49 in paise
  currency: "INR",
  name: "System Design Course",
  description: "One-time Lifetime Access & Server Maintenance"
};
