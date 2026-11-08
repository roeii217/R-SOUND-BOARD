'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Smartphone, Share2, PlusSquare, Download, CheckCircle2, Laptop } from 'lucide-react';
import { deferredInstallPrompt } from './PWARegister';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallGuideModal({ isOpen, onClose }: InstallGuideModalProps) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('ios');
  const [canPromptDirectly, setCanPromptDirectly] = useState<boolean>(false);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    if (deferredInstallPrompt) {
      setCanPromptDirectly(true);
    }

    const handleCanInstall = () => setCanPromptDirectly(true);
    window.addEventListener('can-install-pwa', handleCanInstall);
    return () => window.removeEventListener('can-install-pwa', handleCanInstall);
  }, []);

  const handleDirectInstall = async () => {
    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalled(true);
        }
      } catch (e) {
        console.warn('Install prompt error:', e);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install EchoBoard App">
      <div className="space-y-5">
        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-light p-1 border border-surface-border">
          <button
            onClick={() => setPlatform('ios')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              platform === 'ios'
                ? 'bg-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            iPhone / iOS
          </button>
          <button
            onClick={() => setPlatform('android')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              platform === 'android'
                ? 'bg-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android
          </button>
          <button
            onClick={() => setPlatform('desktop')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              platform === 'desktop'
                ? 'bg-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            PC / Mac
          </button>
        </div>

        {/* Content per Platform */}
        {platform === 'ios' && (
          <div className="space-y-4 text-sm text-zinc-300">
            <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/20 p-3 text-xs text-indigo-200">
              💡 <strong>Native Fullscreen Mode:</strong> Installing EchoBoard removes browser bars, enables haptic feedback, and keeps the soundboard running reliably in the background.
            </div>

            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light border border-surface-border text-white font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white">Tap the Share icon</p>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    In Safari&apos;s bottom bar, tap the Share icon <Share2 className="w-3.5 h-3.5 text-accent inline" />
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light border border-surface-border text-white font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white">Select &quot;Add to Home Screen&quot;</p>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-accent inline" /> <strong>Add to Home Screen</strong>
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light border border-surface-border text-white font-bold text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-white">Confirm &quot;Add&quot;</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Tap <strong>Add</strong> in the top-right corner. EchoBoard will appear on your iPhone home screen!
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {platform === 'android' && (
          <div className="space-y-4 text-sm text-zinc-300">
            {canPromptDirectly && !installed && (
              <button
                onClick={handleDirectInstall}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
                ⚡ Install EchoBoard Directly
              </button>
            )}

            {installed && (
              <div className="flex items-center gap-2 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Successfully installed! Open EchoBoard from your app drawer.
              </div>
            )}

            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light border border-surface-border text-white font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white">Open Chrome Menu</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Tap the <strong>three dots (⋮)</strong> in the top-right corner of Chrome.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light border border-surface-border text-white font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white">Tap &quot;Install App&quot;</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light border border-surface-border text-white font-bold text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-white">Launch as Standalone App</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    EchoBoard launches in full-screen mode with native audio acceleration and haptics.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {platform === 'desktop' && (
          <div className="space-y-3 text-sm text-zinc-300">
            <p>
              You can install EchoBoard as a lightweight desktop application on Windows, Mac, or Linux:
            </p>
            <div className="rounded-xl bg-surface-light p-3 border border-surface-border space-y-2 text-xs">
              <p className="font-semibold text-white">In Google Chrome or Microsoft Edge:</p>
              <p className="text-zinc-400">
                Look for the <strong>Install Icon</strong> <Download className="w-3.5 h-3.5 inline text-accent" /> on the right side of the address bar, then click <strong>Install</strong>.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-surface-light hover:bg-surface-border text-white font-medium text-xs transition-colors"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
