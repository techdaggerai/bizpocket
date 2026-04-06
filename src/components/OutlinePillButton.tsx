'use client';

import { type ReactNode } from 'react';

interface Props {
  label: string;
  icon: ReactNode;
  color: string;
  onClick: () => void;
}

export default function OutlinePillButton({ label, icon, color, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-1.5 rounded-[20px] px-3.5 py-[7px] text-[13px] font-medium transition-colors shrink-0 whitespace-nowrap"
      style={{
        border: `1.5px solid ${color}`,
        color,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = color;
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = color;
      }}
    >
      {icon}
      {label}
    </button>
  );
}
