import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '../components/pwa/PWARegister';

export const metadata: Metadata = {
  title: 'EchoBoard - Modern Remote Soundboard & Push-to-Talk Mic',
  description:
    'Play sounds on your computer instantly from your phone. Low-latency Supabase Realtime synchronization, WebRTC Push-to-Talk, and gallery video audio extraction.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EchoBoard',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#090a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="bg-background text-zinc-100 min-h-screen selection:bg-accent selection:text-white">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
