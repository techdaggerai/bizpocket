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
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] dark:text-gray-400">
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
                className="flex items-center gap-3 w-full text-left rounded-xl px-3.5 py-3 bg-[#F9FAFB] dark:bg-gray-800 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 transition-colors disabled:opacity-70 disabled:cursor-default border border-transparent hover:border-[#E5E5E5] dark:hover:border-gray-600"
              >
                <span className="text-base flex-shrink-0">
                  {isCompleted ? '\u2705' : a.icon}
                </span>
                <span className={`flex-1 text-sm ${isCompleted ? 'line-through text-[var(--text-3)] dark:text-gray-500' : 'text-[var(--text-1)] dark:text-gray-200'}`}>
                  {a.action}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-[#4F46E5]/10 text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-300'}`}>
                  +{a.points}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="bg-gradient-to-r from-[#EEF2FF] to-[#F0FDF4] dark:from-indigo-950/30 dark:to-emerald-950/30 rounded-xl border border-[#C7D2FE] dark:border-indigo-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] dark:text-gray-400">Next Milestone</p>
            <span className="text-sm font-semibold text-[var(--text-1)] dark:text-white">{nextMilestone.nextTier}</span>
          </div>
          <p className="text-xs text-[var(--text-2)] dark:text-gray-300">{nextMilestone.requirement}</p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-white/60 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#4F46E5] transition-all duration-700 ease-out"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-[var(--text-3)] dark:text-gray-500">{nextMilestone.progress}</span>
              <span className="text-[10px] text-[var(--text-3)] dark:text-gray-500">{Math.round(milestoneProgress)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
