<div align="center">

# 🎬 Clipstream AI

**AI-Powered Video Clip Generator**

Transform long-form videos into viral-ready short clips using AI. Upload your podcasts, interviews, or YouTube videos and let our AI identify the most engaging moments.

[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Modal](https://img.shields.io/badge/Modal-Cloud-green?style=flat-square)](https://modal.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple?style=flat-square&logo=stripe)](https://stripe.com/)

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Architecture](#architecture) • [License](#license)

</div>

---

## ✨ Features

### 🎯 AI-Powered Clip Detection
- **Smart Moment Identification** — Uses Google Gemini to analyze transcripts and identify viral-worthy segments
- **Question-Answer Extraction** — Automatically detects Q&A pairs and compelling stories
- **Trailer Generation** — Creates 60-second AI trailers with narrative arc (hook → tension → climax → cliffhanger)

### 🎬 Video Processing
- **YouTube Import** — Paste any YouTube URL with cookies for authenticated downloads
- **Direct Upload** — Upload MP4 files up to 500MB
- **WhisperX Transcription** — Word-level timestamp accuracy for precise clip extraction
- **Vertical Video Output** — Automatically generates 9:16 clips for TikTok, Reels, and Shorts

### 🚀 Production-Ready
- **GPU-Accelerated** — Modal cloud infrastructure with NVIDIA CUDA support
- **Credit-Based Billing** — Stripe integration for one-time credit purchases
- **Real-Time Status** — Auto-refreshing queue with processing status updates
- **Webhook Notifications** — Instant updates when processing completes

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **NextAuth.js** | Authentication |
| **Prisma** | Database ORM |

### Backend
| Technology | Purpose |
|------------|---------|
| **Modal** | Serverless GPU cloud |
| **Python 3.12** | Backend processing |
| **WhisperX** | Speech-to-text with alignment |
| **yt-dlp** | YouTube video downloading |
| **FFmpeg** | Video manipulation |
| **Google Gemini** | AI moment identification |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **AWS S3** | Video and clip storage |
| **PostgreSQL** | Database (via Neon/Supabase) |
| **Stripe** | Payment processing |
| **Inngest** | Background job orchestration |
| **Vercel** | Frontend hosting |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL database
- AWS S3 bucket
- Stripe account
- Modal account
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SarthakHarshe/Clipstream-AI.git
   cd Clipstream-AI
   ```

2. **Install frontend dependencies**
   ```bash
   cd clipstream-ai-frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Deploy the backend (Modal)**
   ```bash
   cd ../clipstream-ai-backend
   pip install -r requirements.txt
   modal deploy main.py
   ```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
AUTH_SECRET="your-auth-secret"
AUTH_TRUST_HOST=true

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
S3_BUCKET_NAME="clipstream-ai"

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_SMALL_CREDIT_PACK="price_..."
STRIPE_MEDIUM_CREDIT_PACK="price_..."
STRIPE_LARGE_CREDIT_PACK="price_..."

# Modal Backend
PROCESS_VIDEO_ENDPOINT="https://..."
PROCESS_VIDEO_ENDPOINT_AUTH="..."

# Inngest
INNGEST_SIGNING_KEY="..."
INNGEST_EVENT_KEY="..."
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Next.js   │  │  Dashboard  │  │    Billing (Stripe)     │  │
│  │   App       │──│   Client    │──│    Credit Purchases     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Modal Cloud)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   yt-dlp    │  │  WhisperX   │  │    Google Gemini AI     │  │
│  │  Download   │──│ Transcribe  │──│   Moment Detection      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                                      │                 │
│         ▼                                      ▼                 │
│  ┌─────────────┐                    ┌─────────────────────────┐  │
│  │   FFmpeg    │                    │     Clip Generation     │  │
│  │   Process   │────────────────────│   (Vertical 9:16)       │  │
│  └─────────────┘                    └─────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS S3 Storage                            │
│       Original Videos  │  Generated Clips  │  Trailers          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Clipstream-AI/
├── clipstream-ai-frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/                     # App Router pages
│   │   │   ├── dashboard/           # Dashboard & billing
│   │   │   └── api/                 # API routes
│   │   ├── components/              # React components
│   │   ├── actions/                 # Server actions
│   │   ├── inngest/                 # Background jobs
│   │   └── server/                  # Auth & database
│   └── prisma/                      # Database schema
│
├── clipstream-ai-backend/           # Modal Python backend
│   ├── main.py                      # Main processing endpoint
│   ├── requirements.txt             # Python dependencies
│   └── asd/                         # Audio processing models
│
└── README.md                        # This file
```

---

## 📝 License

This project is proprietary software. All rights reserved.

---

<div align="center">

**Built with ❤️ by [Sarthak Harshe](https://github.com/SarthakHarshe)**

</div>
