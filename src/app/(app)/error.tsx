'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 40, maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <span style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>!</span>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>Page Error</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{error.message}</p>
      <pre style={{ fontSize: 11, color: '#999', textAlign: 'left', background: '#f5f5f5', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 160, marginBottom: 16 }}>
        {error.stack}
      </pre>
      <button
        onClick={reset}
        style={{ padding: '10px 24px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  );
}
