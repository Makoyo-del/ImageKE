# ImageKE - Passport Photo Resizer for Kenya 🇰🇪

ImageKE is a high-performance, mobile-first utility designed to help Kenyans prepare passport photos for government portals like **eCitizen**, **KRA iTax**, **HELB**, and international **Visa** applications.

It solves the common pain point of "photo rejection" by providing instant, client-side resizing and compression to the exact specifications required by Kenyan portals.

## 🚀 Key Features

- **Portal Presets**: One-click optimization for eCitizen (350x450px, <50KB), US Visa (600x600px), KRA iTax, and more.
- **Client-Side Processing**: All image processing happens in the user's browser. Photos are never uploaded to a server, ensuring maximum privacy and speed.
- **Mobile Optimized**: Designed for a 90% mobile user base with large touch targets and responsive layouts.
- **Paystack Integration**: Seamless M-Pesa payments using Paystack Inline for watermarked vs. clean downloads.
- **SEO & AI Ready**: Optimized metadata and JSON-LD structured data for both search engines and LLM-based assistants.

## 🛠 Tech Stack

- **Frontend**: React + Vite, Vanilla CSS (Glassmorphism), Lucide Icons, Pica (High-quality image downscaling).
- **Backend**: Node.js + Express (Transaction verification & Webhooks).
- **Deployment**: Render (Static Site for Frontend + Web Service for Backend).
- **Payments**: Paystack (KES currency support).

## 📁 Architecture

The project is split into two independent services:

1. **Frontend (`/`)**: A static site that handles the UI and the heavy lifting of image processing.
2. **Backend (`/server`)**: A lightweight API that interacts with Paystack for payment initialization and verification.

## ⚙️ Local Setup

### 1. Frontend
```bash
# In the root directory
npm install
# Create .env from .env.example and add your VITE_PAYSTACK_PUBLIC_KEY
npm run dev
```

### 2. Backend
```bash
cd server
npm install
# Create .env from .env.example and add your PAYSTACK_SECRET_KEY
node index.js
```

## 🌐 Deployment (Render)

This repository includes a `render.yaml` Blueprint. To deploy:

1. Connect your GitHub repo to Render.
2. Select **Blueprints** and choose this repository.
3. Render will automatically create:
   - `imageke-frontend` (Static Site)
   - `imageke-api` (Web Service)
4. **Mandatory**: Go to the Render Dashboard and set the environment variables manually for both services as per the `.env.example` files.

## 💳 Paystack Webhook Configuration

To receive payment confirmations server-side:
1. Log in to Paystack Dashboard -> Settings -> API Keys & Webhooks.
2. Set your Webhook URL to: `https://your-api-url.onrender.com/api/paystack/webhook`.
3. The server uses HMAC-SHA512 verification to ensure webhook security.

---

Built for speed, utility, and conversion.
