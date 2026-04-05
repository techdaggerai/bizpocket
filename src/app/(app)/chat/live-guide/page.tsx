'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import PageHeader from '@/components/PageHeader';

const LANGUAGES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu',
  ar: 'Arabic', bn: 'Bengali', pt: 'Portuguese',
  fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
};

interface GuideStep {
  id: number;
  screenshot: string;
  analysis: string;
  instruction: string;
  timestamp: Date;
}

export default function LiveGuidePage() {
  const { profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [error, setError] = useState('');
  const [autoCapture, setAutoCapture] = useState(false);
  const autoCaptureRef = useRef<NodeJS.Timeout | null>(null);
  const stepCounter = useRef(0);
  const userLang = profile?.language || 'en';

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError('');
      }
    } catch {
      setError('Camera access denied. Please allow camera permission.');
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.6);
  }, []);

  const analyzeFrame = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    setAnalyzing(true);
    try {
      const previousSteps = steps.slice(-3).map(s => s.analysis).join('\n');

      const res = await fetch('/api/ai/live-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: frame,
          language: userLang,
          previousSteps,
          deviceType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        stepCounter.current += 1;

        const newStep: GuideStep = {
          id: stepCounter.current,
          screenshot: frame,
          analysis: data.analysis,
          instruction: data.instruction,
          timestamp: new Date(),
        };

        setSteps(prev => [...prev, newStep]);
        setCurrentInstruction(data.instruction);
        if (data.deviceType) setDeviceType(data.deviceType);

        const utterance = new SpeechSynthesisUtterance(data.instruction);
        const langMap: Record<string, string> = {
          en: 'en-US', ja: 'ja-JP', ur: 'ur-PK', ar: 'ar-SA',
          bn: 'bn-BD', pt: 'pt-BR', vi: 'vi-VN', tr: 'tr-TR',
          zh: 'zh-CN', fr: 'fr-FR', nl: 'nl-NL', es: 'es-ES',
        };
        utterance.lang = langMap[userLang] || 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    }
    setAnalyzing(false);
  }, [captureFrame, steps, userLang, deviceType]);

  const toggleAutoCapture = useCallback(() => {
    if (autoCapture) {
      if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
      setAutoCapture(false);
    } else {
      autoCaptureRef.current = setInterval(analyzeFrame, 5000);
      setAutoCapture(true);
      analyzeFrame();
    }
  }, [autoCapture, analyzeFrame]);

  const uploadDocument = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setAnalyzing(true);

        try {
          const res = await fetch('/api/ai/live-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64,
              language: userLang,
              previousSteps: steps.slice(-3).map(s => s.analysis).join('\n'),
              deviceType,
              isDocument: true,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            stepCounter.current += 1;
            setSteps(prev => [...prev, {
              id: stepCounter.current,
              screenshot: base64,
              analysis: data.analysis,
              instruction: data.instruction,
              timestamp: new Date(),
            }]);
            setCurrentInstruction(data.instruction);

            const utterance = new SpeechSynthesisUtterance(data.instruction);
            speechSynthesis.speak(utterance);
          }
        } catch (err) {
          console.error('Document analysis error:', err);
        }
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [userLang, steps, deviceType]);

  useEffect(() => {
    return () => {
      stopCamera();
      speechSynthesis.cancel();
    };
  }, [stopCamera]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: '#0a0a0a',
      color: 'white', fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <PageHeader title="AI Guide" backPath="/chat" />

      {/* Camera view */}
      <div style={{
        flex: 1, position: 'relative',
        background: '#000', overflow: 'hidden',
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            display: cameraActive ? 'block' : 'none',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!cameraActive && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16,
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="#6b7280" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
              Point your camera at any Japanese screen, machine, or document
            </p>
            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button
              onClick={startCamera}
              style={{
                background: '#4F46E5', color: 'white', border: 'none',
                borderRadius: 12, padding: '14px 32px', fontSize: 15,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Start camera
            </button>
          </div>
        )}

        {analyzing && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.8)', borderRadius: 16,
              padding: '16px 24px', display: 'flex',
              alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 20, height: 20, border: '2px solid #F59E0B',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 14, color: 'white' }}>Reading screen...</span>
            </div>
          </div>
        )}

        {currentInstruction && cameraActive && !analyzing && (
          <div style={{
            position: 'absolute', bottom: 140, left: 12, right: 12,
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.85)',
              borderRadius: 14, padding: '14px 16px',
              borderLeft: '3px solid #F59E0B',
            }}>
              <p style={{
                margin: 0, fontSize: 14, color: 'white',
                lineHeight: 1.6,
              }}>
                {currentInstruction}
              </p>
            </div>
          </div>
        )}

        {steps.length > 0 && cameraActive && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.7)', borderRadius: 100,
            padding: '4px 12px',
          }}>
            <span style={{ fontSize: 12, color: '#F59E0B' }}>
              Step {steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {cameraActive && (
        <div style={{
          padding: '16px', flexShrink: 0,
          borderTop: '1px solid #222',
          background: '#111',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', gap: 20,
          }}>
            <button
              onClick={uploadDocument}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#1e293b', border: '1px solid #334155',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
            </button>

            <button
              onClick={analyzeFrame}
              disabled={analyzing}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: analyzing ? '#6b7280' : '#4F46E5',
                border: '3px solid white', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>

            <button
              onClick={toggleAutoCapture}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: autoCapture ? '#22c55e' : '#1e293b',
                border: '1px solid ' + (autoCapture ? '#22c55e' : '#334155'),
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </button>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24,
            marginTop: 10,
          }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Upload doc</span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              {analyzing ? 'Reading...' : 'Tap to scan'}
            </span>
            <span style={{ fontSize: 11, color: autoCapture ? '#22c55e' : '#6b7280' }}>
              {autoCapture ? 'Auto ON' : 'Auto scan'}
            </span>
          </div>
        </div>
      )}

      {/* Step history */}
      {steps.length > 0 && (
        <div style={{
          maxHeight: 120, overflowY: 'auto',
          padding: '8px 16px', flexShrink: 0,
          borderTop: '1px solid #222',
          background: '#0a0a0a',
        }}>
          {steps.slice(-5).map((step) => (
            <div key={step.id} style={{
              display: 'flex', alignItems: 'flex-start',
              gap: 8, padding: '6px 0',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: '#F59E0B', minWidth: 40,
              }}>
                Step {step.id}
              </span>
              <p style={{
                margin: 0, fontSize: 12, color: '#9ca3af',
                lineHeight: 1.4,
              }}>
                {step.instruction}
              </p>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
