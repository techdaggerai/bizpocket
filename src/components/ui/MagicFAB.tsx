'use client';

import { useState, useCallback } from 'react';
import { FileText, MessageSquare, Users, Camera, Plus } from 'lucide-react';

type Tier = 'starter' | 'growing' | 'established';

interface MagicFABProps {
  tier?: Tier;
  onInvoice?: () => void;
  onChat?: () => void;
  onMatch?: () => void;
  onCamera?: () => void;
}

interface Petal {
  key: string;
  icon: React.ReactNode;
  label: string;
  angle: number;
  action?: () => void;
}

const RADIUS = 80;

function petalPosition(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    transform: `translate(${Math.cos(rad) * RADIUS}px, ${Math.sin(rad) * RADIUS}px)`,
  };
}

export default function MagicFAB({
  tier,
  onInvoice,
  onChat,
  onMatch,
  onCamera,
}: MagicFABProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  const isStarter = tier === 'starter';

  const petals: Petal[] = [
    { key: 'invoice', icon: <FileText size={20} />, label: 'Invoice', angle: -135, action: onInvoice },
    { key: 'chat', icon: <MessageSquare size={20} />, label: 'Chat', angle: -90, action: onChat },
    { key: 'match', icon: <Users size={20} />, label: 'Match', angle: -45, action: onMatch },
    { key: 'camera', icon: <Camera size={20} />, label: 'Camera', angle: 0, action: onCamera },
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/20 bg-black/40 transition-opacity duration-200"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-[80px] right-4 z-50" style={{ width: 56, height: 56 }}>
        {/* Petals */}
        {open && petals.map((p, i) => {
          const isInvoiceStarter = isStarter && p.key === 'invoice';

          return (
            <button
              key={p.key}
              onClick={() => { p.action?.(); close(); }}
              className={[
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-12 h-12 rounded-full flex items-center justify-center',
                'shadow-lg transition-colors',
                'animate-[fabPetalExpand_350ms_var(--ease-intent)_both]',
                isInvoiceStarter
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300 animate-[fabPetalExpand_350ms_var(--ease-intent)_both,fabGlow_3s_ease-in-out_infinite]'
                  : 'bg-slate-800 text-indigo-600 text-indigo-400',
              ].join(' ')}
              style={{
                ...petalPosition(p.angle),
                animationDelay: `${i * 60}ms`,
              }}
              aria-label={p.label}
            >
              {p.icon}
            </button>
          );
        })}

        {/* Main orb */}
        <button
          onClick={toggle}
          className={[
            'relative w-14 h-14 rounded-full bg-indigo-600 text-white',
            'flex items-center justify-center',
            'shadow-[0_4px_20px_rgba(79,70,229,0.4)]',
            'transition-transform duration-300 [transition-timing-function:var(--ease-spring)]',
            open ? 'rotate-45 scale-95' : 'animate-[fabGlow_3s_ease-in-out_infinite]',
          ].join(' ')}
          aria-label={open ? 'Close menu' : 'Open quick actions'}
          aria-expanded={open}
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}
