'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase-client'
import TierBadge from '@/components/profile/TierBadge'
import type { Tier } from '@/lib/tier-system'

type Step = 'intro' | 'upload_id' | 'selfie' | 'submitted'
type DocType = 'passport' | 'residence_card' | 'national_id' | 'drivers_license' | 'business_registration'

const DOC_TYPES: { value: DocType; label: string; icon: string }[] = [
  { value: 'passport', label: 'Passport', icon: '\u{1F6C2}' },
  { value: 'residence_card', label: 'Residence Card (\u5728\u7559\u30AB\u30FC\u30C9)', icon: '\u{1F4B3}' },
  { value: 'national_id', label: 'National ID', icon: '\u{1FAAA}' },
  { value: 'drivers_license', label: "Driver's License", icon: '\u{1F697}' },
  { value: 'business_registration', label: 'Business Registration', icon: '\u{1F3E2}' },
]

export default function VerificationPage() {
  const router = useRouter()
  const { user, profile, organization } = useAuth()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('intro')
  const [loading, setLoading] = useState(true)
  const [tier, setTier] = useState<Tier>('starter')
  const [trustScore, setTrustScore] = useState(0)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Upload state
  const [docType, setDocType] = useState<DocType>('passport')
  const [idFile, setIdFile] = useState<File | null>(null)
  const [idPreview, setIdPreview] = useState('')
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfiePreview, setSelfiePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const idInputRef = useRef<HTMLInputElement>(null)
  const selfieInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      // Get global profile
      const { data: gp } = await supabase
        .from('global_profiles')
        .select('tier, trust_score')
        .eq('user_id', user.id)
        .single()

      if (gp) {
        setTier((gp.tier || 'starter') as Tier)
        setTrustScore(gp.trust_score || 0)
      }

      // Check existing verification
      const { data: verif } = await supabase
        .from('id_verifications')
        .select('status, rejection_reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (verif) {
        setExistingStatus(verif.status)
        setRejectionReason(verif.rejection_reason || '')
        if (verif.status === 'pending') setStep('submitted')
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleIdSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIdFile(file)
    setIdPreview(URL.createObjectURL(file))
  }

  function handleSelfieSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelfieFile(file)
    setSelfiePreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!idFile || !selfieFile) return
    setUploading(true)
    setError('')

    try {
      const ts = Date.now()

      // Upload ID document
      const idPath = `${user.id}/id-${ts}.${idFile.name.split('.').pop()}`
      const { error: idErr } = await supabase.storage
        .from('id-documents')
        .upload(idPath, idFile)
      if (idErr) throw new Error(`ID upload failed: ${idErr.message}`)

      // Upload selfie
      const selfiePath = `${user.id}/selfie-${ts}.${selfieFile.name.split('.').pop()}`
      const { error: selfieErr } = await supabase.storage
        .from('id-documents')
        .upload(selfiePath, selfieFile)
      if (selfieErr) throw new Error(`Selfie upload failed: ${selfieErr.message}`)

      // Create verification record
      const { error: insertErr } = await supabase.from('id_verifications').insert({
        user_id: user.id,
        id_document_url: idPath,
        selfie_url: selfiePath,
        document_type: docType,
        status: 'pending',
      })
      if (insertErr) throw new Error(`Submission failed: ${insertErr.message}`)

      setExistingStatus('pending')
      setStep('submitted')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    }
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    )
  }

  // Tier gate — Starters can't verify
  if (tier === 'starter') {
    return (
      <div className="px-4 py-6 space-y-6">
        <Header onBack={() => router.back()} />
        <div className="flex flex-col items-center text-center py-8">
          <span className="text-5xl mb-4">{'\u{1F512}'}</span>
          <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white mb-2">Unlock ID Verification</h2>
          <p className="text-sm text-[var(--text-2)] dark:text-gray-300 max-w-xs mb-4">
            Reach Growing tier to verify your identity and earn the green badge.
          </p>
          <TierBadge tier="starter" size="md" />
          <div className="mt-6 w-full max-w-xs">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-3)] dark:text-gray-400">Progress to Growing</span>
              <span className="font-bold text-[var(--text-1)] dark:text-white">{trustScore}/45</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (trustScore / 45) * 100)}%` }} />
            </div>
          </div>
          <button onClick={() => router.push('/profile/preview')} className="mt-6 text-sm font-semibold text-[#4F46E5]">
            View Your Profile {'\u2192'}
          </button>
        </div>
      </div>
    )
  }

  // Already approved
  if (existingStatus === 'approved') {
    return (
      <div className="px-4 py-6 space-y-6">
        <Header onBack={() => router.back()} />
        <div className="flex flex-col items-center text-center py-8">
          <span className="text-5xl mb-4">{'\u{1F7E2}'}</span>
          <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white mb-2">ID Verified</h2>
          <p className="text-sm text-[var(--text-2)] dark:text-gray-300">
            Your identity has been verified. You have the green badge.
          </p>
        </div>
      </div>
    )
  }

  // ─── STEP: Intro ───
  if (step === 'intro') {
    return (
      <div className="px-4 py-6 space-y-6">
        <Header onBack={() => router.back()} />

        <div className="text-center">
          <span className="text-5xl">{'\u{1F7E2}'}</span>
          <h1 className="text-xl font-bold text-[var(--text-1)] dark:text-white mt-3">Get ID Verified</h1>
        </div>

        {/* Rejected banner */}
        {existingStatus === 'rejected' && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-300 font-semibold">{'\u274C'} Previous verification rejected</p>
            {rejectionReason && <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">{rejectionReason}</p>}
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">You can submit again below.</p>
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-2.5">
          {[
            { icon: '\u{1F6E1}\uFE0F', text: '+8 Trust Score boost' },
            { icon: '\u{1F3AF}', text: 'Higher match priority' },
            { icon: '\u{1F7E2}', text: '"Verified" label on your profile' },
            { icon: '\u2728', text: 'Green badge on business cards' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#F9FAFB] dark:bg-gray-800 rounded-xl px-4 py-3 border border-[#E5E5E5] dark:border-gray-700">
              <span className="text-lg">{b.icon}</span>
              <span className="text-sm text-[var(--text-1)] dark:text-gray-200">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div className="bg-[#EEF2FF] dark:bg-indigo-950/30 rounded-xl border border-[#C7D2FE] dark:border-indigo-800 p-4">
          <p className="text-xs font-semibold text-[#4338CA] dark:text-indigo-300 mb-2">What you'll need:</p>
          <ul className="text-xs text-[#4338CA]/80 dark:text-indigo-300/80 space-y-1">
            <li>{'\u2022'} Government-issued photo ID</li>
            <li>{'\u2022'} A selfie holding your ID</li>
          </ul>
          <p className="text-[10px] text-[#4338CA]/60 dark:text-indigo-400/60 mt-2">Takes about 2 minutes. Your data is encrypted and private.</p>
        </div>

        <button
          onClick={() => setStep('upload_id')}
          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-4 rounded-xl transition-colors"
        >
          Start Verification {'\u2192'}
        </button>
      </div>
    )
  }

  // ─── STEP: Upload ID ───
  if (step === 'upload_id') {
    return (
      <div className="px-4 py-6 space-y-6">
        <Header onBack={() => setStep('intro')} />
        <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white">Upload Your ID</h2>

        {/* Document type selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-3)] dark:text-gray-400 uppercase tracking-wide">Document Type</p>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map((dt) => (
              <button
                key={dt.value}
                onClick={() => setDocType(dt.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  docType === dt.value
                    ? 'border-[#4F46E5] bg-[#EEF2FF] dark:bg-indigo-950/30 text-[#4338CA] dark:text-indigo-300'
                    : 'border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-900 text-[var(--text-2)] dark:text-gray-300'
                }`}
              >
                <span>{dt.icon}</span>
                <span>{dt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload area */}
        <input ref={idInputRef} type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={handleIdSelect} />
        {idPreview ? (
          <div className="space-y-2">
            <img src={idPreview} alt="ID preview" className="w-full h-48 object-contain rounded-xl border border-[#E5E5E5] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800" />
            <button onClick={() => idInputRef.current?.click()} className="text-xs text-[#4F46E5] font-semibold">Retake / Change</button>
          </div>
        ) : (
          <button
            onClick={() => idInputRef.current?.click()}
            className="w-full h-48 rounded-xl border-2 border-dashed border-[#C7D2FE] dark:border-indigo-800 bg-[#F9FAFB] dark:bg-gray-800 flex flex-col items-center justify-center gap-2 hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/20 transition-colors"
          >
            <span className="text-3xl">{'\u{1F4F7}'}</span>
            <span className="text-sm text-[var(--text-2)] dark:text-gray-300">Tap to capture or upload</span>
          </button>
        )}

        <button
          onClick={() => setStep('selfie')}
          disabled={!idFile}
          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors"
        >
          Next: Take Selfie {'\u2192'}
        </button>
      </div>
    )
  }

  // ─── STEP: Selfie ───
  if (step === 'selfie') {
    return (
      <div className="px-4 py-6 space-y-6">
        <Header onBack={() => setStep('upload_id')} />
        <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white">Selfie with Your ID</h2>
        <p className="text-sm text-[var(--text-2)] dark:text-gray-300">Hold your ID next to your face so we can match them.</p>

        <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieSelect} />
        {selfiePreview ? (
          <div className="space-y-2">
            <img src={selfiePreview} alt="Selfie preview" className="w-full h-64 object-contain rounded-xl border border-[#E5E5E5] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800" />
            <button onClick={() => selfieInputRef.current?.click()} className="text-xs text-[#4F46E5] font-semibold">Retake</button>
          </div>
        ) : (
          <button
            onClick={() => selfieInputRef.current?.click()}
            className="w-full h-64 rounded-xl border-2 border-dashed border-[#C7D2FE] dark:border-indigo-800 bg-[#F9FAFB] dark:bg-gray-800 flex flex-col items-center justify-center gap-3 hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/20 transition-colors"
          >
            <span className="text-4xl">{'\u{1F933}'}</span>
            <span className="text-sm text-[var(--text-2)] dark:text-gray-300">Tap to take selfie with ID</span>
            <span className="text-[10px] text-[var(--text-3)] dark:text-gray-500">Front camera will open</span>
          </button>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selfieFile || uploading}
          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Uploading...</>
          ) : (
            <>Submit for Review {'\u2705'}</>
          )}
        </button>
      </div>
    )
  }

  // ─── STEP: Submitted ───
  return (
    <div className="px-4 py-6 space-y-6">
      <Header onBack={() => router.back()} />
      <div className="flex flex-col items-center text-center py-8">
        <span className="text-5xl mb-4">{'\u2705'}</span>
        <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white mb-2">Submitted for Review</h2>
        <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mb-4">We'll verify within 24 hours.</p>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          {'\u23F3'} Pending Review
        </span>
        <button onClick={() => router.push('/profile/preview')} className="mt-8 text-sm font-semibold text-[#4F46E5]">
          Back to Profile {'\u2192'}
        </button>
      </div>
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-gray-800 transition-colors">
        <svg className="w-5 h-5 text-[var(--text-1)] dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <h1 className="text-lg font-bold text-[var(--text-1)] dark:text-white">{'\u{1F7E2}'} ID Verification</h1>
    </div>
  )
}
