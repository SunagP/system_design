# Designed to Scale — Interactive System Design Course

An interactive, visual system design course featuring 40 in-depth architectural lessons, real-time 2.5D isometric network animations, interactive capacity planning calculators, strict Gmail authentication via Firebase, and a gentle lifetime access paywall powered by Razorpay.

Designed & maintained by **Sunag P** ([@sunag3007](https://www.instagram.com/sunag3007/)).

---

## 🚀 Key Features

- **40 Interactive Modules**: Covering foundational request lifecycles, scaling patterns, caching layers, distributed databases, streaming architectures, and consensus algorithms.
- **2.5D Isometric SVG Visual Engine**: Zero heavy 3D runtimes; pure mathematical isometric projection with reactive step-by-step state animations.
- **Multi-Language Support**: Fully translated into 20+ languages including Hindi, Spanish, French, German, Japanese, and Mandarin.
- **Strict Gmail Authentication**: Secure, one-click sign-in via Google OAuth with Firebase Authentication (`@gmail.com` validation).
- **Gentle Lifetime Access Paywall**: Transparent, one-time ₹49 lifetime access with UPI (Google Pay, PhonePe, Paytm) and Debit/Credit cards via Razorpay.
- **Ready for Vercel**: Optimized static structure, instant deployment, and zero-maintenance serverless setup.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript / TypeScript (Vite bundled, LightningCSS)
- **Vector Graphics**: Dynamic Isometric SVG DOM engine
- **Authentication**: Firebase Authentication v10 (Google OAuth)
- **Payments**: Razorpay Standard Checkout (UPI & Cards)
- **Hosting**: Vercel

---

## ⚙️ Configuration

### 1. Firebase Authentication (`firebase-config.js`)
Configured to use project `system-design-auth`. Ensure Google sign-in is enabled in your Firebase console under **Authentication** → **Sign-in method**.

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAUpWgtDk7m4b78D8HgRR9P4rXTOeEaazw",
  authDomain: "system-design-auth.firebaseapp.com",
  projectId: "system-design-auth",
  storageBucket: "system-design-auth.firebasestorage.app",
  messagingSenderId: "1038982908188",
  appId: "1:1038982908188:web:cc5cd0a0faeec3913c92d9",
  measurementId: "G-6SPXE0FSK7"
};
```

> **Important for Vercel Deployment:** Once deployed on Vercel, copy your Vercel URL (e.g. `your-app.vercel.app`) and add it to **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**.

### 2. Razorpay Payment Gateway (`razorpay-config.js`)
For test transactions or live payments:

```javascript
window.RAZORPAY_CONFIG = {
  keyId: "rzp_test_U3IfSgP4rkIdV8", // Replace with rzp_live_... for real payments
  amount: 4900,                     // ₹49 in paise
  currency: "INR",
  name: "System Design Course",
  description: "One-time Lifetime Access & Server Maintenance"
};
```

---

## 📦 Deployment to Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. Framework Preset: **Other** (or Static).
3. Root Directory: `./`
4. Click **Deploy**!

---

## 📄 License
MIT License. Created by [Sunag P](https://www.instagram.com/sunag3007/).
