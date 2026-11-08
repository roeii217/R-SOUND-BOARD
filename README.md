# EchoBoard: Modern Remote Soundboard & Wireless Push-to-Talk

An ultra-low latency, browser-based remote soundboard inspired by RC Web Soundboard, built with Next.js, React, Supabase Realtime, WebRTC, and Progressive Web App (PWA) capabilities.

---

## 🌟 Key Features

1. **Real-Time Room Synchronization**:
   - Sub-second remote audio triggers via Supabase Realtime Broadcast.
   - Dual-Mode Engine: Connects to Supabase Cloud, or runs in offline/local demo mode out of the box with zero setup required.
2. **Dedicated Computer Host & Mobile Controller**:
   - **Computer Host**: Master soundboard output, glowing frequency visualizer, master volume slider, mute, and playback modes (Polyphonic / Restart / Solo).
   - **Mobile Controller**: Finger-friendly touch grid with category filters, tactile feedback (`navigator.vibrate`), and quick action buttons.
3. **Instant Mobile Pairing**:
   - High-contrast QR Code generated in realtime on the computer screen for seamless iPhone & Android camera scanning.
4. **Push-to-Talk (Wireless Microphone)**:
   - Dedicated tactile PTT button on the mobile controller.
   - Hold to stream phone microphone audio straight to the computer over WebRTC.
   - Live waveform and glowing transmission indicator on both host and controller.
5. **Direct Phone Gallery & Video Audio Extractor**:
   - Upload audio (MP3, WAV, WebM, M4A) or video files (MP4, MOV from iPhone Photos / Android Gallery).
   - In-browser client-side demuxing and conversion to clean WAV audio using HTML5 Web Audio API (`AudioContext.decodeAudioData` + in-memory PCM encoder). No server-side ffmpeg required!
6. **Mobile In-App Voice Recording**:
   - Record sounds directly using your phone's microphone with Start, Pause, Resume, Stop, and live level meter.
   - Audio preview playback before saving as a permanent soundboard button.
7. **Custom Soundboard Management**:
   - Add, rename, delete, and reorder sound buttons.
   - Export and import soundboard configuration JSON files (including audio blobs).
   - Reset to default royalty-free sound effects pack (Airhorn, 808 Boom, Sci-Fi Laser, Retro Coin, Rimshot, Buzzer, Victory Chime).
8. **Fully Installable Progressive Web App (PWA)**:
   - Web App Manifest (`manifest.json`), service worker (`sw.js`), and high-res app icons.
   - Full-screen standalone display mode with iOS notch / home bar safe-area padding (`viewport-fit=cover`).
   - Built-in installation guide modal tailored for iOS Safari and Android Chrome.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Navigate to project directory
cd remote-soundboard

# 2. Install dependencies (if not already installed)
npm install

# 3. Start development server
npm run dev
```

Open `http://localhost:3000` in your computer browser.
- Click **"Launch Host (PC)"** to open the Host soundboard.
- Click the **QR Code** button in the header or scan with your phone camera to open the Mobile Controller!

---

## ☁️ Supabase Cloud Setup (Optional for Multi-Device Cloud Sync)

EchoBoard is fully integrated with Supabase. If you want cross-network remote control between devices on different Wi-Fi networks:

1. Create a free project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in Supabase and paste the contents of `supabase/schema.sql`. Run the script to create the `rooms`, `categories`, and `sounds` tables along with the `soundboard-audio` storage bucket.
3. Copy your project credentials into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

*Note: If no Supabase credentials are provided, EchoBoard automatically activates its embedded Local/Peer Demo engine, storing sounds in browser IndexedDB!*

---

## 🚢 Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. If using Supabase, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Vercel Environment Variables.
4. Click **Deploy**. Vercel will automatically build the Next.js application using `vercel.json`.

---

## 📱 PWA Installation Instructions

### iPhone (iOS Safari)
1. Open the soundboard controller URL in **Safari**.
2. Tap the **Share** button in the bottom Safari toolbar (square with arrow pointing up ⎋).
3. Scroll down and tap **"Add to Home Screen"** (⊞).
4. Tap **"Add"** in the top right. Launch EchoBoard directly from your home screen for native fullscreen mode.

### Android (Google Chrome)
1. Open the soundboard controller URL in **Chrome**.
2. Tap the **three dots menu (⋮)** in the top right corner.
3. Tap **"Install App"** (or click the "Install EchoBoard" prompt banner).
4. Launch from your Android app drawer.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14 / 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS (Dark OLED aesthetic with translucent glassmorphism)
- **Audio Engine**: Web Audio API (`AudioContext`, `AnalyserNode`, `OfflineAudioContext`, `GainNode`)
- **Microphone Streaming**: WebRTC `RTCPeerConnection` with STUN signaling
- **Real-Time Synchronization**: Supabase Realtime (Broadcast channels & Presence) + BroadcastChannel fallback
- **Storage**: Supabase Storage + Browser IndexedDB
- **PWA**: Service Worker (`public/sw.js`), Web App Manifest (`public/manifest.json`), high-res SVG app icons
