'use client';

import { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string, name: string) => void;
  disabled?: boolean;
}

export default function SignaturePad({ onSave, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [showPad, setShowPad] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw signature line
    ctx.beginPath();
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 1;
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 2;
  }, [showPad]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Redraw signature line
    ctx.beginPath();
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 1;
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 2;
    setHasSignature(false);
  }

  function handleSave() {
    if (!canvasRef.current || !hasSignature || !signerName.trim()) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl, signerName.trim());
  }

  if (disabled) {
    return (
      <div className="rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/5 p-4 text-center">
        <svg className="h-5 w-5 text-[#16A34A] mx-auto mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
        <p className="text-sm font-medium text-[#16A34A]">Signed</p>
      </div>
    );
  }

  if (!showPad) {
    return (
      <button onClick={() => setShowPad(true)}
        className="w-full rounded-xl border-2 border-dashed border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] py-4 text-center hover:bg-[#4F46E5]/[0.05] transition-colors">
        <svg className="h-6 w-6 text-[#4F46E5] mx-auto mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
        <p className="text-sm font-medium text-[#4F46E5]">Sign this invoice</p>
        <p className="text-[10px] text-[#999]">Add your signature to confirm</p>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-50">Sign Invoice</h3>
        <button onClick={() => setShowPad(false)} className="text-xs text-[#999]">Cancel</button>
      </div>

      <input value={signerName} onChange={e => setSignerName(e.target.value)}
        placeholder="Your full name" className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm focus:border-[#4F46E5] focus:outline-none" />

      <div className="relative rounded-lg border border-slate-700 bg-slate-800 overflow-hidden" style={{ touchAction: 'none' }}>
        <canvas ref={canvasRef}
          className="w-full cursor-crosshair" style={{ height: '140px' }}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-[#CCC]">Draw your signature above</p>
      </div>

      <div className="flex gap-2">
        <button onClick={clearSignature} className="flex-1 rounded-lg border border-slate-700 py-2 text-xs font-medium text-[#666]">Clear</button>
        <button onClick={handleSave} disabled={!hasSignature || !signerName.trim()}
          className="flex-1 rounded-lg bg-[#4F46E5] py-2 text-xs font-medium text-white disabled:opacity-40">
          Confirm Signature
        </button>
      </div>
    </div>
  );
}
