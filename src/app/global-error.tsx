'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 40, background: '#fafafa' }}>
        <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{error.message}</p>
          <pre style={{ fontSize: 11, color: '#999', textAlign: 'left', background: '#f3f3f3', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 200 }}>
            {error.stack}
          </pre>
          <button
            onClick={reset}
            style={{ marginTop: 20, padding: '10px 24px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
