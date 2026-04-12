'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WebappLayout from '@/components/WebappLayout'

const UPLOAD_PHASES = [
  { id: 'base_scoring', label: 'Base AI Scoring', description: 'Analyzing resume structure and content' },
  { id: 'expert_panel', label: 'Expert Panel Evaluation', description: '6 domain experts evaluate your resume' },
  { id: 'monte_carlo', label: 'Monte Carlo Simulation', description: 'Running 1,000 outcome simulations' },
  { id: 'intake_analysis', label: 'Intake Calibration', description: 'Mapping assessment responses to weights' },
  { id: 'line_rewrite', label: 'Line-by-Line Rewrite', description: 'Analyzing and improving each line' },
  { id: 'assembly', label: 'Results Assembly', description: 'Compiling your comprehensive report' },
]

function UploadContent() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [phaseProgress, setPhaseProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!['.pdf', '.docx', '.doc', '.txt'].includes(ext)) return 'Please upload a PDF, DOCX, or TXT file.'
    if (f.size > 10 * 1024 * 1024) return 'File size must be under 10MB.'
    return null
  }

  const handleFileSelect = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setFile(f); setError(null)
  }, [])

  const validateEmail = (val: string) => {
    if (!val) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email'
    return ''
  }

  const handleSubmit = async () => {
    if (!file) return
    const emailErr = validateEmail(email)
    if (emailErr) { setEmailError(emailErr); return }
    setEmailError(''); setUploading(true); setError(null)

    const phaseInterval = setInterval(() => {
      setPhaseProgress(prev => {
        if (prev >= 100) { setCurrentPhase(p => Math.min(p + 1, UPLOAD_PHASES.length - 1)); return 0 }
        return prev + Math.random() * 15 + 5
      })
    }, 800)

    try {
      let intakeResponses = {}, targetRole = '', targetIndustry = ''
      try {
        const saved = localStorage.getItem('qrsqpiIntake')
        if (saved) { const p = JSON.parse(saved); intakeResponses = p.answers || {}; targetRole = p.targetRole || ''; targetIndustry = p.industry || '' }
      } catch {}

      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetRole', targetRole)
      formData.append('targetIndustry', targetIndustry)
      formData.append('yearsExperience', '5')
      formData.append('intakeResponses', JSON.stringify(intakeResponses))
      formData.append('includePanelEvaluation', 'true')
      formData.append('includeMonteCarlo', 'true')
      formData.append('includeLineRewrite', 'true')

      const response = await fetch('/api/qrsqpi', {
        method: 'POST',
        body: formData,
      })
      clearInterval(phaseInterval)
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Evaluation failed.') }
      const results = await response.json()
      sessionStorage.setItem('qrsqpiResults', JSON.stringify(results))
      sessionStorage.setItem('qrsqpiEmail', email)
      setCurrentPhase(UPLOAD_PHASES.length - 1); setPhaseProgress(100)
      setTimeout(() => router.push('/results'), 600)
    } catch (err: any) {
      clearInterval(phaseInterval); setError(err.message || 'Something went wrong.'); setUploading(false); setCurrentPhase(0); setPhaseProgress(0)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-2">Upload Resume</h1>
        <p className="text-sm text-gray-400">Upload your resume and provide your email. The QRSQPI engine will run all 6 evaluation phases.</p>
      </div>

      {!uploading ? (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${dragOver ? 'border-violet-500/50 bg-violet-500/5' : file ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'}`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} className="hidden" />
            <div className="p-8 text-center">
              {file ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div><p className="text-sm font-medium text-gray-200">{file.name}</p><p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p></div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove file</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] mx-auto flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.863A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <div><p className="text-sm text-gray-300"><span className="text-violet-400">Click to upload</span> or drag and drop</p><p className="text-xs text-gray-600 mt-1">PDF, DOCX, or TXT (max 10MB)</p></div>
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-5 backdrop-blur-sm">
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }} placeholder="your@email.com"
              className={`w-full bg-white/[0.06] border rounded-lg px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none transition-all ${emailError ? 'border-red-500/50 focus:ring-1 focus:ring-red-500/30' : 'border-white/[0.08] focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30'}`} />
            {emailError && <p className="text-xs text-red-400 mt-1.5">{emailError}</p>}
            <p className="text-xs text-gray-600 mt-1.5">Required for results delivery and report access.</p>
          </div>

          {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4"><p className="text-sm text-red-300">{error}</p></div>}

          <button onClick={handleSubmit} disabled={!file || !email}
            className={`w-full py-3.5 rounded-lg text-sm font-medium transition-all ${!file || !email ? 'bg-white/[0.04] text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20'}`}>
            Start QRSQPI Evaluation
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/5 border border-violet-500/20 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
              <h3 className="text-sm font-medium text-white">Processing Evaluation</h3>
            </div>
            <div className="space-y-4">
              {UPLOAD_PHASES.map((phase, i) => (
                <div key={phase.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center">
                      {i < currentPhase ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                          <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      ) : i === currentPhase ? (
                        <div className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.06]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${i <= currentPhase ? 'text-gray-200' : 'text-gray-600'}`}>{phase.label}</span>
                        {i < currentPhase && <span className="text-xs text-emerald-400 font-mono">done</span>}
                        {i === currentPhase && <span className="text-xs text-violet-400 font-mono">{Math.min(100, Math.round(phaseProgress))}%</span>}
                      </div>
                      <p className={`text-xs mt-0.5 ${i === currentPhase ? 'text-gray-400' : 'text-gray-700'}`}>{phase.description}</p>
                    </div>
                  </div>
                  {i === currentPhase && (
                    <div className="ml-[22px] mt-2">
                      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500" style={{ width: `${Math.min(100, phaseProgress)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-gray-600">This process takes 30-90 seconds. Please do not close this page.</p>
        </div>
      )}
    </div>
  )
}

export default function UploadPage() {
  return <WebappLayout><UploadContent /></WebappLayout>
}