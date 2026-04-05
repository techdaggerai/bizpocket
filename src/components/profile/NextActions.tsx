'use client';

interface NextAction {
  action: string;
  points: number;
  icon: string;
  completed?: boolean;
}

interface NextActionsProps {
  actions: NextAction[];
  onActionTap?: (action: NextAction) => void;
}

export default function NextActions({ actions, onActionTap }: NextActionsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Grow Your Trust
      </p>
      <div className="space-y-1">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => onActionTap?.(a)}
            className="flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors group"
          >
            <span className="text-base flex-shrink-0">{a.completed ? '\u2705' : a.icon}</span>
            <span className={`flex-1 text-sm ${a.completed ? 'line-through text-slate-300' : 'text-slate-200'}`}>
              {a.action}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.completed ? 'bg-green-100 text-green-700 bg-green-950/40 text-green-300' : 'bg-[#4F46E5]/10 text-[#4F46E5] bg-indigo-950/40 text-indigo-300'}`}>
              +{a.points}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
