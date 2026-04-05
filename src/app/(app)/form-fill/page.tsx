'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth-context'
import {
  Upload, FileText, Sparkles, ChevronRight, Check,
  Download, Save, RefreshCw, Loader2,
  AlertCircle, Edit2, FileCheck, SkipForward,
  Globe, X, ZoomIn
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormField {
  id: string
  label: string
  originalLabel: string
  type: 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'email' | 'phone' | 'address'
  required: boolean
  hint: string
  options?: string[]
}

interface FilledField extends FormField {
  value: string
  aiQuestion: string
}

type Stage = 'upload' | 'analyzing' | 'filling' | 'review' | 'done'

const LANGUAGES = [
  { code: 'English', flag: '🇺🇸', label: 'English' },
  { code: 'Japanese', flag: '🇯🇵', label: '日本語' },
  { code: 'Urdu', flag: '🇵🇰', label: 'اردو' },
  { code: 'Arabic', flag: '🇸🇦', label: 'العربية' },
  { code: 'Chinese', flag: '🇨🇳', label: '中文' },
  { code: 'Korean', flag: '🇰🇷', label: '한국어' },
  { code: 'Spanish', flag: '🇪🇸', label: 'Español' },
  { code: 'French', flag: '🇫🇷', label: 'Français' },
  { code: 'Vietnamese', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'Filipino', flag: '🇵🇭', label: 'Filipino' },
  { code: 'Portuguese', flag: '🇧🇷', label: 'Português' },
  { code: 'Turkish', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'Dutch', flag: '🇳🇱', label: 'Nederlands' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FormFillPage() {
  const [stage, setStage] = useState<Stage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [fields, setFields] = useState<FormField[]>([])
  const [filledFields, setFilledFields] = useState<FilledField[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentValue, setCurrentValue] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [isLoadingQ, setIsLoadingQ] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('English')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedToVault, setSavedToVault] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const supabase = createClient()
  const { organization } = useAuth()

  // ─── File Handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    const valid = f.type.startsWith('image/') || f.type === 'application/pdf'
    if (!valid) {
      setError('Please upload an image (JPG, PNG) or PDF file')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB')
      return
    }
    setFile(f)
    setError('')
    if (f.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(f))
    await analyzeForm(f)
  }, [language]) // eslint-disable-line

  const analyzeForm = async (f: File) => {
    setStage('analyzing')
    try {
      const fd = new FormData()
      fd.append('action', 'analyze')
      fd.append('file', f)
      fd.append('language', language)

      const res = await fetch('/api/ai/form-fill', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      const detected: FormField[] = data.fields
      setFields(detected)
      setFilledFields(detected.map((fld: FormField) => ({ ...fld, value: '', aiQuestion: '' })))
      setCurrentIndex(0)
      setStage('filling')
      await loadQuestion(detected[0], detected)
    } catch (err: unknown) {
      setError((err as Error).message || 'Could not analyze form. Try a clearer image.')
      setStage('upload')
    }
  }

  // ─── AI Question Loading ────────────────────────────────────────────────────
  const loadQuestion = async (field: FormField, allFields?: FormField[]) => {
    setIsLoadingQ(true)
    setAiQuestion('')
    setCurrentValue('')
    try {
      const total = (allFields || fields).length
      const idx = (allFields || fields).indexOf(field) + 1
      const fd = new FormData()
      fd.append('action', 'ask')
      fd.append('field', JSON.stringify(field))
      fd.append('language', language)
      fd.append('progress', `${idx} of ${total}`)

      const res = await fetch('/api/ai/form-fill', { method: 'POST', body: fd })
      const data = await res.json()
      setAiQuestion(data.question || `Please enter: ${field.label}`)
    } catch {
      setAiQuestion(`Please enter: ${field.label}`)
    } finally {
      setIsLoadingQ(false)
      setTimeout(() => (inputRef.current as HTMLInputElement | null)?.focus(), 100)
    }
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
    const updated = [...filledFields]
    updated[currentIndex] = { ...updated[currentIndex], value: currentValue, aiQuestion: aiQuestion }
    setFilledFields(updated)

    const nextIdx = currentIndex + 1
    if (nextIdx >= fields.length) {
      setFilledFields(updated)
      setStage('review')
      return
    }
    setCurrentIndex(nextIdx)
    await loadQuestion(fields[nextIdx])
  }

  const handleSkip = async () => {
    const nextIdx = currentIndex + 1
    if (nextIdx >= fields.length) { setStage('review'); return }
    setCurrentIndex(nextIdx)
    await loadQuestion(fields[nextIdx])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNext() }
  }

  // ─── Edit from review ───────────────────────────────────────────────────────
  const editField = (idx: number) => {
    setCurrentIndex(idx)
    setCurrentValue(filledFields[idx].value)
    setAiQuestion(filledFields[idx].aiQuestion)
    setStage('filling')
  }

  // ─── Download ───────────────────────────────────────────────────────────────
  const downloadFilled = () => {
    const lines = [
      `COMPLETED FORM — ${new Date().toLocaleDateString()}`,
      `${'─'.repeat(50)}`,
      '',
      ...filledFields.map(f => `${f.label}${f.required ? ' *' : ''}\n  ${f.value || '(skipped)'}`)
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filled-form-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Save to Vault ──────────────────────────────────────────────────────────
  const saveToVault = async () => {
    setIsSaving(true)
    try {
      const content = filledFields
        .map(f => `${f.label}: ${f.value || '(skipped)'}`)
        .join('\n')

      const { error: insertErr } = await supabase.from('documents').insert({
        organization_id: organization.id,
        name: `Filled Form — ${new Date().toLocaleDateString()}`,
        content,
        type: 'form',
        created_at: new Date().toISOString()
      })

      if (insertErr) throw new Error(insertErr.message)
      setSavedToVault(true)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStage('upload')
    setFile(null)
    setPreviewUrl(null)
    setFields([])
    setFilledFields([])
    setCurrentIndex(0)
    setCurrentValue('')
    setAiQuestion('')
    setError('')
    setSavedToVault(false)
  }

  // ─── Computed ───────────────────────────────────────────────────────────────
  const currentField = fields[currentIndex]
  const progress = fields.length > 0 ? Math.round(((currentIndex) / fields.length) * 100) : 0
  const filledCount = filledFields.filter(f => f.value).length
  const selectedLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Form Fill" backPath="/dashboard" />
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI Form Fill<span className="ml-2 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-bold text-[#F59E0B]">AI</span></h1>
              <p className="text-xs text-gray-500 hidden sm:block">Upload any form — AI guides you through it</p>
            </div>
          </div>

          {/* Language Picker */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-amber-300 text-sm text-gray-600 transition-colors"
            >
              <Globe className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">{selectedLang.flag} {selectedLang.label}</span>
              <span className="sm:hidden">{selectedLang.flag}</span>
            </button>
            {showLangPicker && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLanguage(l.code); setShowLangPicker(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-left transition-colors ${language === l.code ? 'text-amber-600 font-medium bg-amber-50' : 'text-gray-700'}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                    {language === l.code && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STAGE: UPLOAD */}
        {stage === 'upload' && (
          <div className="space-y-6">
            <div
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center py-16 px-8
                ${isDragging
                  ? 'border-amber-400 bg-amber-50 scale-[1.01]'
                  : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/40'
                }`}
            >
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-amber-500' : 'bg-amber-100'}`}>
                <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-white' : 'text-amber-500'}`} />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">{isDragging ? 'Drop your form here' : 'Upload a form'}</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop or click to browse<br />Supports JPG, PNG, PDF — any language</p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {['Japanese Forms', 'English', 'Arabic', 'Tax Docs', 'Applications', 'Contracts'].map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Upload, label: 'Upload Form', desc: 'Any language, any format', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { icon: Sparkles, label: 'AI Reads It', desc: 'Claude identifies every field', color: 'text-amber-500', bg: 'bg-amber-50' },
                { icon: FileCheck, label: 'Fill & Export', desc: 'Guided field by field', color: 'text-green-500', bg: 'bg-green-50' },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE: ANALYZING */}
        {stage === 'analyzing' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-amber-500" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-amber-300 border-t-transparent animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Reading your form…</h2>
            <p className="text-sm text-gray-500 max-w-xs">Claude is identifying all fields and translating them to {language}</p>
            {file && (
              <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-full">
                <FileText className="w-3.5 h-3.5" />
                <span>{file.name}</span>
              </div>
            )}
          </div>
        )}

        {/* STAGE: FILLING */}
        {stage === 'filling' && currentField && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0 font-medium">{currentIndex + 1} / {fields.length}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {previewUrl && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Original Form</span>
                    <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-indigo-600 flex items-center gap-1">
                      <ZoomIn className="w-3.5 h-3.5" />
                      {showPreview ? 'Shrink' : 'Expand'}
                    </button>
                  </div>
                  <div className={`overflow-hidden transition-all ${showPreview ? 'max-h-screen' : 'max-h-48 lg:max-h-96'}`}>
                    <img src={previewUrl} alt="Form preview" className="w-full object-contain" />
                  </div>
                </div>
              )}

              <div className={`bg-white rounded-2xl border border-gray-200 flex flex-col ${!previewUrl ? 'lg:col-span-2' : ''}`}>
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${currentField.required ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {currentField.required ? 'Required' : 'Optional'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {currentField.originalLabel !== currentField.label && `Original: ${currentField.originalLabel}`}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 mt-1">{currentField.label}</h2>
                </div>

                <div className="px-5 py-4 flex-1">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-amber-50 rounded-2xl rounded-tl-none px-4 py-3 flex-1">
                      {isLoadingQ ? (
                        <div className="flex gap-1.5 items-center h-5">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800 leading-relaxed">{aiQuestion}</p>
                      )}
                    </div>
                  </div>

                  {!isLoadingQ && (
                    <>
                      {currentField.type === 'checkbox' ? (
                        <div className="flex gap-3">
                          {['Yes', 'No'].map(opt => (
                            <button key={opt} onClick={() => setCurrentValue(opt)}
                              className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${currentValue === opt ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : currentField.type === 'select' && currentField.options?.length ? (
                        <div className="space-y-2">
                          {currentField.options.map(opt => (
                            <button key={opt} onClick={() => setCurrentValue(opt)}
                              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${currentValue === opt ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : currentField.type === 'date' ? (
                        <input ref={inputRef as React.RefObject<HTMLInputElement>} type="date" value={currentValue} onChange={e => setCurrentValue(e.target.value)} onKeyDown={handleKeyDown}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm text-gray-800" />
                      ) : currentField.type === 'address' ? (
                        <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={currentValue} onChange={e => setCurrentValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleNext() }}
                          placeholder={currentField.hint} rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm text-gray-800 resize-none" />
                      ) : (
                        <input ref={inputRef as React.RefObject<HTMLInputElement>}
                          type={currentField.type === 'email' ? 'email' : currentField.type === 'phone' ? 'tel' : currentField.type === 'number' ? 'number' : 'text'}
                          value={currentValue} onChange={e => setCurrentValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={currentField.hint}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm text-gray-800" />
                      )}
                      {currentField.hint && <p className="text-xs text-gray-400 mt-2 px-1">{currentField.hint}</p>}
                    </>
                  )}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
                  <button onClick={handleSkip} disabled={currentField.required}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <SkipForward className="w-4 h-4" /> Skip
                  </button>
                  <button onClick={handleNext} disabled={isLoadingQ || (currentField.required && !currentValue.trim())}
                    className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors">
                    {currentIndex === fields.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden sm:block bg-white rounded-xl border border-gray-200 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {fields.map((f, i) => (
                  <div key={f.id} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    i < currentIndex ? 'bg-green-100 text-green-700'
                    : i === currentIndex ? 'bg-amber-100 text-amber-700 font-medium ring-1 ring-amber-300'
                    : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < currentIndex && <Check className="w-3 h-3 inline mr-1" />}
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE: REVIEW */}
        {stage === 'review' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Form Complete</p>
                    <p className="text-xs text-gray-500">{filledCount} of {fields.length} fields filled</p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> New form
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {filledFields.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 group">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${f.value ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {f.value ? <Check className="w-3 h-3 text-green-600" /> : <span className="text-gray-400 text-xs">—</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</p>
                      <p className={`text-sm break-words ${f.value ? 'text-gray-900' : 'text-gray-300 italic'}`}>{f.value || 'Not filled'}</p>
                    </div>
                    <button onClick={() => editField(i)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-all p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={downloadFilled} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
                <Download className="w-4 h-4" /> Download Filled Form
              </button>
              <button onClick={saveToVault} disabled={isSaving || savedToVault}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium rounded-xl transition-colors border ${savedToVault ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700'}`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedToVault ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {savedToVault ? 'Saved to Vault!' : 'Save to Vault'}
              </button>
              <button onClick={reset} className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-600 hover:border-gray-300 text-sm font-medium rounded-xl transition-colors">
                <RefreshCw className="w-4 h-4" /> New Form
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
