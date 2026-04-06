'use client';

import { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let html5Qrcode: any = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5Qrcode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text: string) => {
            // Extract invite code from URL
            const match = text.match(/\/invite\/([a-zA-Z0-9_-]+)/);
            if (match) {
              html5Qrcode.stop().catch(() => {});
              onScan(match[1]);
            }
          },
          () => {} // ignore scan failures
        );
      } catch (e: any) {
        setError(e?.message || 'Camera access denied');
      }
    })();

    return () => {
      if (html5Qrcode?.isScanning) {
        html5Qrcode.stop().catch(() => {});
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-sm mx-4 bg-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Scan QR Code</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button onClick={onClose} className="text-sm text-indigo-400 font-medium">Close</button>
            </div>
          ) : (
            <>
              <div id="qr-reader" ref={containerRef} className="rounded-xl overflow-hidden" />
              <p className="text-xs text-slate-400 text-center mt-3">Point camera at an Evrywher QR code</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
