# Clipstream AI

Turn long podcasts and interviews into vertical short clips, without doing the editing yourself.

You give it a video (an MP4 upload or a YouTube link). It transcribes the audio, asks Gemini which parts are actually worth clipping, cuts those segments, reframes them to 9:16 by following whoever is speaking, burns in captions, and drops the finished clips in your library.

I built this to scratch my own itch: scrubbing through a two hour podcast looking for the 45 seconds worth posting is miserable work, and most of it is mechanical.

## How the pipeline actually works

```
Browser  ──►  Next.js app  ──►  S3 (presigned PUT)
                  │
                  ├─► Inngest job: check credits, flip status to "processing"
                  │        │
                  │        └─► POST to Modal endpoint (bearer auth)
                  │                   │
                  │                   ├─ download video (S3 or yt-dlp)
                  │                   ├─ ffmpeg: extract 16kHz mono WAV
                  │                   ├─ WhisperX large-v2 + alignment (word-level timestamps)
                  │                   ├─ Gemini 2.5 Flash: pick the moments
                  │                   ├─ per clip: ffmpeg cut, LR-ASD active speaker,
                  │                   │            1080x1920 reframe, burned-in subtitles
                  │                   └─ upload clips to S3, POST webhook back
                  │
                  └─◄ /api/webhook/modal ─► Inngest: list S3 folder, create Clip rows,
                                            deduct credits, mark "processed"
```

The frontend never waits on the GPU. Modal calls back when it is done, which is why a fifteen minute job does not blow up a serverless function.

### The two modes

**Clips.** Gemini reads the word-level transcript and returns a list of `{start, end}` pairs for question-and-answer exchanges or self-contained stories, 30 to 60 seconds each. The backend processes the first three of those. Costs 1 credit.

**AI trailer.** A different prompt asks for 4 to 6 variable-length moments arranged as a narrative arc: opening hook, rising tension, a climax, then a cliffhanger. Those get stitched into a single trailer with transitions. If the trailer prompt comes back empty it falls back to the regular clip moments. Costs 4 credits.

### The reframing bit

This is the part I am happiest with. Center-cropping a two-person podcast gives you a great shot of the gap between their heads, so instead each clip runs through [LR-ASD](https://github.com/Junhua-Liao/Light-ASD), vendored under `clipstream-ai-backend/asd/` (MIT licensed, from the CVPR 2023 and IJCV 2025 papers by Junhua Liao et al.). It tracks faces and scores who is actively speaking per frame. The vertical renderer averages those scores over a 60 frame window and crops toward the highest scoring face. When no face is confidently detected it falls back to a scaled and centered frame over a blurred background instead of cropping blind.

Captions come from the same word-level WhisperX output, grouped five words to a line, rendered as ASS subtitles in Anton and burned in with ffmpeg.

## Repo layout

```
clipstream-ai-frontend/    Next.js 15 app (T3 stack), Prisma, NextAuth, Stripe, Inngest
clipstream-ai-backend/     Modal app, the whole GPU pipeline lives in main.py
  └── asd/                 vendored LR-ASD active speaker detection plus weights
```

## Stack

| Layer | What it is |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, Framer Motion |
| Auth | NextAuth v5 (beta) with a credentials provider, bcrypt-hashed passwords |
| Data | PostgreSQL via Prisma |
| Queue | Inngest, one concurrent job per file and no retries so nothing gets processed twice |
| Compute | Modal, NVIDIA L40S, CUDA 12.4 base image, 15 minute timeout |
| ML | WhisperX large-v2, Gemini 2.5 Flash, LR-ASD |
| Media | ffmpeg, OpenCV, ffmpegcv, pysubs2, yt-dlp |
| Storage | S3, with presigned URLs for both upload and playback |
| Payments | Stripe checkout plus a webhook that tops up credits |

## Running it locally

You will need Node 20+, Python 3.12, a PostgreSQL database, an S3 bucket, a Modal account, a Gemini API key, and Stripe test keys.

### Backend

```bash
cd clipstream-ai-backend
pip install -r requirements.txt
modal deploy main.py
```

Two Modal secrets have to exist before you deploy:

- `clipstream-ai-secret` with `GEMINI_API_KEY`, `AUTH_TOKEN`, and AWS credentials for S3
- `webhook-config` with `WEBHOOK_URL` pointing at `https://your-app/api/webhook/modal`

`AUTH_TOKEN` is the shared secret. The frontend sends it as a bearer token to Modal, and Modal sends the same value back on the completion webhook.

One gotcha before you deploy: the S3 bucket name is hardcoded as `clipstream-ai` in the backend's boto3 calls. If you use a different bucket, search `main.py` for it and change it.

### Frontend

```bash
cd clipstream-ai-frontend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

In a second terminal, run the Inngest dev server so background jobs actually fire:

```bash
npm run inngest-dev
```

## Using it

Sign up with an email and password. New accounts start with 10 credits.

**Uploading a file.** Drop in an MP4 (the dropzone caps at 500MB). It goes straight to S3 with a presigned URL, so the file never passes through the Next.js server.

**YouTube.** Paste a URL and attach a `cookies.txt` exported from a browser where you are signed in to YouTube. This is not optional. YouTube blocks datacenter IPs, and without cookies yt-dlp fails on the bot check. The cookies file is uploaded to S3, used once, and deleted afterwards. Videos longer than an hour are rejected.

**Watching progress.** The dashboard refreshes itself every 15 seconds. Statuses go `queued`, `processing`, `processed`, or land on `failed` or `no credits`. Credits are only deducted after clips actually land in S3, so a failed job does not cost you anything.

**Getting clips out.** Preview in the browser or download. Playback runs on presigned URLs that expire after an hour, and every request checks that the clip belongs to you.

Credits are bought from the billing page through Stripe checkout, and the top-up happens in the Stripe webhook rather than on redirect, so closing the tab too early does not lose a purchase.

## Known limits

- Transcription and alignment are English only right now (the alignment model is loaded with `language_code="en"`).
- Clip mode stops at the first three moments per video, mostly to keep runs inside the 15 minute Modal timeout.
- For trailers, transcripts over 1000 words are trimmed to the first 30 minutes before Gemini sees them.
- YouTube support depends on `cookies.txt` and on yt-dlp keeping up with YouTube's changes. It has broken and been fixed a few times already, which is why the container ships Deno for yt-dlp's JS challenges.
- Everything the model picks is a suggestion. Sometimes it clips a boring stretch. That is the nature of the thing.

## License

Not currently open source. The vendored `asd/` directory keeps its original MIT license.

Built by [Sarthak Harshe](https://github.com/SarthakHarshe).
