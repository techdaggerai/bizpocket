'use client'

import { useRouter } from 'next/navigation'

interface NextAction {
  action: string
  points: number
  icon: string
  completed?: boolean
}

interface NextMilestone {
  nextTier: string
  requirement: string
  progress: string
}

interface GrowthChecklistProps {
  nextActions: NextAction[]
  nextMilestone: NextMilestone | null
  completedActions?: string[]
}

// Map action text to route for tap-to-navigate
const ACTION_ROUTES: Record<string, string> = {
  'photo': '/settings',
  'phone': '/settings/business-setup',
  'address': '/settings/business-setup',
  'invoice': '/invoices/new',
  'paid': '/invoices',
  'tax': '/settings/business-setup',
  'name': '/settings',
  'identity': '/settings',
  'verify': '/settings',
}

function getRouteForAction(action: string): string | null {
  const lower = action.toLowerCase()
  for (const [keyword, route] of Object.entries(ACTION_ROUTES)) {
    if (lower.includes(keyword)) return route
  }
  return null
}

export default function GrowthChecklist({ nextActions, nextMilestone, completedActions = [] }: GrowthChecklistProps) {
  const router = useRouter()

  const milestoneProgress = nextMilestone
    ? (() => {
        const parts = nextMilestone.progress.split('/')
        if (parts.length === 2) {
          const current = parseInt(parts[0])
          const target = parseInt(parts[1])
          return target > 0 ? Math.min(100, (current / target) * 100) : 0
        }
        return 0
      })()
    : 0

  return (
    <div className="space-y-4">
      {/* Checklist */}
      {nextActions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Grow Your Trust
          </p>
          {nextActions.map((a, i) => {
            const isCompleted = a.completed || completedActions.includes(a.action)
            const route = getRouteForAction(a.action)

            return (
              <button
                key={i}
                onClick={() => route && router.push(route)}
                disabled={isCompleted || !route}
                className="flex items-center gap-3 w-full text-left rounded-xl px-3.5 py-3 bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-70 disabled:cursor-default border border-transparent hover:border-slate-700 hover:border-slate-700"
              >
                <span className="text-base flex-shrink-0">
                  {isCompleted ? '\u2705' : a.icon}
                </span>
                <span className={`flex-1 text-sm ${isCompleted ? 'line-through text-slate-300' : 'text-slate-200'}`}>
                  {a.action}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-green-100 text-green-700 bg-green-950/40 text-green-300' : 'bg-[#4F46E5]/10 text-[#4F46E5] bg-indigo-950/40 text-indigo-300'}`}>
                  +{a.points}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="bg-gradient-to-r from-[#EEF2FF] to-[#F0FDF4] from-indigo-950/30 to-emerald-950/30 rounded-xl border border-indigo-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next Milestone</p>
            <span className="text-sm font-semibold text-white">{nextMilestone.nextTier}</span>
          </div>
          <p className="text-xs text-slate-400">{nextMilestone.requirement}</p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#4F46E5] transition-all duration-700 ease-out"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-slate-300">{nextMilestone.progress}</span>
              <span className="text-[10px] text-slate-300">{Math.round(milestoneProgress)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
