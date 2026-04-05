'use client';

interface CorridorBadgeProps {
  from: string;
  to: string;
  flagFrom: string;
  flagTo: string;
  type?: string;
}

export default function CorridorBadge({ from, to, flagFrom, flagTo, type }: CorridorBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-[#F9FAFB] dark:bg-gray-800 rounded-lg px-3 py-2 border border-[#E5E5E5] dark:border-gray-700">
      <span className="text-lg">{flagFrom}</span>
      <span className="text-xs text-[var(--text-3)] dark:text-gray-400">\u2194</span>
      <span className="text-lg">{flagTo}</span>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-[var(--text-1)] dark:text-gray-200">{from} \u2194 {to}</span>
        {type && <span className="text-[10px] text-[var(--text-3)] dark:text-gray-500">{type}</span>}
      </div>
    </div>
  );
}
