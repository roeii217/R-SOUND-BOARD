'use client';

import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../../lib/audio/audio-engine';

export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const analyser = AudioEngine.getInstance().getAnalyser();

      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Draw futuristic equalizer bars
        const barCount = 32;
        const step = Math.floor(bufferLength / barCount);
        const barWidth = Math.max(3, (width - (barCount - 1) * 4) / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const minHeight = 4;
          const barHeight = Math.max(minHeight, percent * (height - 8));
          const x = i * (barWidth + 4);
          const y = height - barHeight;

          // Gradient from indigo to cyan
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, '#6366f1');
          grad.addColorStop(0.6, '#a855f7');
          grad.addColorStop(1, '#06b6d4');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      } else {
        // Subtle idle line
        ctx.strokeStyle = '#222a42';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full h-14 bg-surface rounded-xl border border-surface-border p-2 overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
