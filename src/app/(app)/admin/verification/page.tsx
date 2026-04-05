'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'

const ADMIN_EMAILS = ['bilal@techdagger.com', 'test123@techdagger.com']

interface Verification {
  id: string
  user_id: string
  id_document_url: string
  selfie_url: string
  document_type: string
  status: string
  created_at: string
  user_name?: string
  user_email?: string
  id_image_url?: string | null
  selfie_image_url?: string | null
}

export default function AdminVerificationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)

  useEffect(() => {
    if (!isAdmin) { router.replace('/dashboard'); return }
    document.title = 'Evrywher — Verification Queue'
    loadQueue()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQueue() {
    try {
      const res = await fetch('/api/admin/verification')
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      setVerifications(json.verifications || [])
    } catch {}
    setLoading(false)
  }

  function handleExpand(v: Verification) {
    setExpandedId(expandedId === v.id ? null : v.id)
  }

  async function handleApprove(v: Verification) {
    setProcessing(v.id)
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: v.id, action: 'approve' }),
      })
      if (!res.ok) throw new Error('Approval failed')
      toast(`Approved: ${v.user_name}`, 'success')
      setVerifications((prev) => prev.filter((x) => x.id !== v.id))
    } catch {
      toast('Approval failed', 'error')
    }
    setProcessing(null)
  }

  async function handleReject(v: Verification) {
    if (!rejectionReason.trim()) {
      toast('Please enter a rejection reason', 'error')
      return
    }
    setProcessing(v.id)
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: v.id, action: 'reject', reason: rejectionReason.trim() }),
      })
      if (!res.ok) throw new Error('Rejection failed')
      toast(`Rejected: ${v.user_name}`, 'success')
      setVerifications((prev) => prev.filter((x) => x.id !== v.id))
      setRejectionReason('')
    } catch {
      toast('Rejection failed', 'error')
    }
    setProcessing(null)
  }

  if (!isAdmin) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-gray-800 transition-colors">
          <svg className="w-5 h-5 text-[var(--text-1)] dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[var(--text-1)] dark:text-white">{'\u{1F6E1}\uFE0F'} Verification Queue</h1>
        <span className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
          {verifications.length}
        </span>
      </div>

      {verifications.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">{'\u2705'}</span>
          <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mt-3">No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => (
            <div key={v.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => handleExpand(v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span className="text-lg">{'\u23F3'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-1)] dark:text-white truncate">{v.user_name}</p>
                  <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400">
                    {v.document_type?.replace('_', ' ')} {'\u00B7'} {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>
                <svg className={`w-4 h-4 text-[var(--text-3)] dark:text-gray-400 transition-transform ${expandedId === v.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded detail */}
              {expandedId === v.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-[#E5E5E5] dark:border-gray-700 pt-4">
                  {/* Images side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400 mb-1">ID Document</p>
                      {v.id_image_url ? (
                        <img src={v.id_image_url} alt="ID" className="w-full h-40 object-contain rounded-lg border border-[#E5E5E5] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800" />
                      ) : (
                        <div className="w-full h-40 rounded-lg border border-[#E5E5E5] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800 flex items-center justify-center text-xs text-[var(--text-3)]">
                          No image available
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400 mb-1">Selfie with ID</p>
                      {v.selfie_image_url ? (
                        <img src={v.selfie_image_url} alt="Selfie" className="w-full h-40 object-contain rounded-lg border border-[#E5E5E5] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800" />
                      ) : (
                        <div className="w-full h-40 rounded-lg border border-[#E5E5E5] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800 flex items-center justify-center text-xs text-[var(--text-3)]">
                          No image available
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-2)] dark:text-gray-300">
                    {v.user_email} {'\u00B7'} {v.document_type?.replace('_', ' ')}
                  </p>

                  {/* Rejection reason input */}
                  <input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason (required for reject)"
                    className="w-full text-xs border border-[#E5E5E5] dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-[var(--text-1)] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleReject(v)}
                      disabled={processing === v.id}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50 transition-colors"
                    >
                      {'\u274C'} Reject
                    </button>
                    <button
                      onClick={() => handleApprove(v)}
                      disabled={processing === v.id}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {processing === v.id ? 'Processing...' : '\u2705 Approve'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
