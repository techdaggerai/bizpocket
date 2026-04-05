'use client';

import { useEffect, useRef } from 'react';

interface Props { url: string; name: string; size?: number; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

export default function PocketChatQR({ url, name, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadQR = async () => {
      const QRCode = (await import('qrcode')).default;
      if (!canvasRef.current) return;
      await QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 2, color: { dark: '#111827', light: '#ffffff' } });
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const ls = size * 0.2; const x = (size - ls) / 2; const y = (size - ls) / 2;
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(size / 2, size / 2, ls * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4F46E5'; const r = ls * 0.35; roundRect(ctx, x + r * 0.3, y + r * 0.3, ls - r * 0.6, ls - r * 0.6, r * 0.4); ctx.fill();
      }
    };
    loadQR();
  }, [url, size]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a'); link.download = `pocketchat-${name}.png`; link.href = canvasRef.current.toDataURL(); link.click();
  };

  return (
    <div className="text-center">
      <canvas ref={canvasRef} />
      <p className="text-[13px] text-slate-400 mt-2 mb-1">Scan to chat with {name}</p>
      <p className="text-[11px] text-slate-500 font-mono mb-3">{url}</p>
      <button onClick={downloadQR} className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] transition-colors">Download QR code</button>
    </div>
  );
}
