<div align="center">

# 🎬 Clipstream AI

**AI-Powered Video Clip Generator**

Transform long-form videos into viral-ready short clips using AI. Upload your podcasts, interviews, or YouTube videos and let our AI identify the most engaging moments.

[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Modal](https://img.shields.io/badge/Modal-Cloud-green?style=flat-square)](https://modal.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple?style=flat-square&logo=stripe)](https://stripe.com/)

</div>

---

## What is Clipstream AI?

Clipstream AI is a full-stack web application that automatically generates short-form video clips from long-form content. Whether you have a 2-hour podcast or a 30-minute YouTube interview, Clipstream AI analyzes the transcript and extracts the most engaging 30-60 second moments — perfect for TikTok, Instagram Reels, and YouTube Shorts.

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
- **Vertical Video Output** — Automatically generates 9:16 clips optimized for social media

### 🚀 Production-Ready
- **GPU-Accelerated** — Runs on Modal cloud infrastructure with NVIDIA CUDA for fast processing
- **Credit-Based Billing** — Simple pay-as-you-go pricing via Stripe
- **Real-Time Status** — Auto-refreshing queue shows processing progress
- **Webhook Notifications** — Instant updates when clips are ready

---

## How It Works

1. **Upload Your Video**  
   Drag and drop an MP4 file or paste a YouTube URL. For YouTube, you'll need to provide your `cookies.txt` file for authentication.

2. **Choose Your Mode**  
   Select **Standard Clips** to extract multiple 30-60 second viral moments, or **AI Trailer** to create a single 60-second highlight reel.

3. **AI Processes Your Video**  
   - The video is transcribed using WhisperX with word-level timestamps
   - Google Gemini AI analyzes the transcript to find engaging Q&A moments, stories, and emotional peaks
   - FFmpeg extracts the identified segments and converts them to vertical 9:16 format

4. **Download Your Clips**  
   Once processing is complete, your clips appear in the Library. Preview them in-browser and download as MP4 files.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | Python 3.12, Modal (serverless GPU), WhisperX, FFmpeg |
| **AI** | Google Gemini 2.5 Flash |
| **Database** | PostgreSQL with Prisma ORM |
| **Storage** | AWS S3 |
| **Payments** | Stripe |
| **Auth** | NextAuth.js |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/SarthakHarshe/Clipstream-AI.git
cd Clipstream-AI

# Install frontend dependencies
cd clipstream-ai-frontend
npm install

# Set up your environment variables (see .env.example)
cp .env.example .env.local

# Initialize the database
npx prisma generate && npx prisma db push

# Start the development server
npm run dev

# In a separate terminal, deploy the backend
cd ../clipstream-ai-backend
pip install -r requirements.txt
modal deploy main.py
```

---

<div align="center">

**Built by [Sarthak Harshe](https://github.com/SarthakHarshe)**

</div>
