'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../ui/Modal';
import { Copy, Check, ExternalLink, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export function QRCodeModal({ isOpen, onClose, roomId }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [networkHost, setNetworkHost] = useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol;

      // If running on localhost or 127.0.0.1, fetch machine's local Wi-Fi IP so phones can connect
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        fetch('/api/network-ip')
          .then((res) => res.json())
          .then((data) => {
            if (data.ip && data.ip !== 'localhost') {
              setNetworkHost(`${protocol}//${data.ip}${port}`);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const origin = networkHost || (typeof window !== 'undefined' ? window.location.origin : 'https://rcweb.live');
  const controllerUrl = `${origin}/controller/${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Phone Controller">
      <div className="flex flex-col items-center text-center space-y-4">
        <p className="text-sm text-zinc-400">
          Scan this QR code with your iPhone or Android camera to open the remote controller:
        </p>

        {/* QR Code Frame */}
        <div className="p-4 bg-white rounded-2xl shadow-xl shadow-indigo-500/10 border-4 border-accent">
          <QRCodeSVG
            value={controllerUrl}
            size={220}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-light border border-surface-border">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Room Code:</span>
          <span className="text-base font-extrabold tracking-widest text-accent">{roomId}</span>
        </div>

        {/* Direct Link & Copy */}
        <div className="w-full space-y-2 pt-2">
          <div className="flex items-center gap-2 p-2 bg-surface-light rounded-xl border border-surface-border">
            <input
              type="text"
              readOnly
              value={controllerUrl}
              className="w-full bg-transparent text-xs text-zinc-300 font-mono focus:outline-none truncate px-1"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shrink-0 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <a
            href={controllerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-accent transition-colors pt-1"
          >
            <Smartphone className="w-3.5 h-3.5" /> Open Controller in new tab <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Modal>
  );
}
