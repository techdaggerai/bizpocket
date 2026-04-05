'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Tool = 'none' | 'draw' | 'text';

interface Props {
  imageUrl: string;
  onSend: (editedBlob: Blob, caption: string) => void;
  onCancel: () => void;
}

export default function PhotoEditor({ imageUrl, onSend, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('none');
  const [caption, setCaption] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pathsRef = useRef<{ x: number; y: number }[][]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  // Load image onto canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Fit to container width
      const maxW = Math.min(window.innerWidth - 32, 400);
      const ratio = img.height / img.width;
      canvas.width = maxW;
      canvas.height = maxW * ratio;
      redraw();
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw all saved paths
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const path of pathsRef.current) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }
  }, []);

  function getCanvasCoords(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: React.TouchEvent | React.MouseEvent) {
    if (tool !== 'draw') return;
    setDrawing(true);
    const p = getCanvasCoords(e);
    currentPathRef.current = [p];
  }

  function handlePointerMove(e: React.TouchEvent | React.MouseEvent) {
    if (!drawing || tool !== 'draw') return;
    const p = getCanvasCoords(e);
    currentPathRef.current.push(p);
    // Draw live
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || currentPathRef.current.length < 2) return;
    const prev = currentPathRef.current[currentPathRef.current.length - 2];
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!drawing) return;
    setDrawing(false);
    if (currentPathRef.current.length > 1) {
      pathsRef.current.push([...currentPathRef.current]);
    }
    currentPathRef.current = [];
  }

  function handleAddText() {
    if (!textInput.trim() || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    const x = canvasRef.current.width / 2;
    const y = canvasRef.current.height / 2;
    ctx.textAlign = 'center';
    ctx.strokeText(textInput, x, y);
    ctx.fillText(textInput, x, y);
    setTextInput('');
    setShowTextInput(false);
    setTool('none');
  }

  function handleUndo() {
    pathsRef.current.pop();
    redraw();
  }

  function handleSend() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSend(blob, caption.trim());
    }, 'image/jpeg', 0.85);
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <button onClick={onCancel} className="min-w-[44px] min-h-[44px] p-2 text-white/70 hover:text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div className="flex items-center gap-1">
          {pathsRef.current.length > 0 && (
            <button onClick={handleUndo} className="px-3 py-1.5 text-[12px] text-white/70 hover:text-white">Undo</button>
          )}
          <button
            onClick={() => { setTool(tool === 'draw' ? 'none' : 'draw'); setShowTextInput(false); }}
            className={`min-w-[44px] min-h-[44px] p-2.5 rounded-full ${tool === 'draw' ? 'bg-slate-800/20 text-white' : 'text-white/60'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button
            onClick={() => { setTool(tool === 'text' ? 'none' : 'text'); setShowTextInput(tool !== 'text'); }}
            className={`min-w-[44px] min-h-[44px] p-2.5 rounded-full ${tool === 'text' ? 'bg-slate-800/20 text-white' : 'text-white/60'}`}
          >
            <span className="text-lg font-bold">T</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full rounded-xl touch-none"
          style={{ display: imgLoaded ? 'block' : 'none' }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
        />
        {!imgLoaded && (
          <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        )}
      </div>

      {/* Text input overlay */}
      {showTextInput && (
        <div className="px-4 py-2 flex gap-2 shrink-0">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type text to add..."
            className="flex-1 bg-slate-800/10 backdrop-blur border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
          />
          <button onClick={handleAddText} className="px-4 py-2.5 bg-slate-800/20 rounded-xl text-sm font-medium text-white">Add</button>
        </div>
      )}

      {/* Caption + Send */}
      <div className="px-4 py-3 flex items-end gap-2 shrink-0 bg-gradient-to-t from-black/80 to-transparent">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          className="flex-1 bg-slate-800/10 backdrop-blur border border-white/20 rounded-[20px] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="h-[44px] w-[44px] shrink-0 flex items-center justify-center bg-[#4F46E5] rounded-full text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  );
}
