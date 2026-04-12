'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WebappLayout from '@/components/WebappLayout'

/* ---------- Types ---------- */

interface Deliverable {
  id: string
  title: string
  description: string
  format: string
  formatBadge: 'docx' | 'pdf' | 'xlsx' | 'txt'
  icon: string
  status: 'ready' | 'generating' | 'pending' | 'error'
  downloadUrl?: string
  fileName?: string
  errorMessage?: string
}

/* ---------- Deliverable Definitions ---------- */

function getDeliverables(counts: { coverLetters: number }): Deliverable[] {
  const coverLetterItems: Deliverable[] = []
  for (let i = 1; i <= counts.coverLetters; i++) {
    coverLetterItems.push({
      id: `cover-letter-${i}`,
      title: `Cover Letter ${i}`,
      description: `Tailored cover letter for target role ${i}, optimized for ATS keywords and hiring manager impact.`,
      format: 'DOCX',
      formatBadge: 'docx',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      status: 'pending',
      fileName: `cover-letter-role-${i}.docx`,
    })
  }

  return [
    {
      id: 'resume-docx',
      title: 'Optimized Resume',
      description: 'Your rewritten resume in Word format with all QRSQPI improvements applied. ATS-optimized and ready to submit.',
      format: 'DOCX',
      formatBadge: 'docx',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      status: 'pending',
      fileName: 'resume-optimized.doc',
    },
    {
      id: 'resume-pdf',
      title: 'Resume PDF',
      description: 'Print-ready PDF of your optimized resume. Clean formatting with consistent typography for human readers.',
      format: 'PDF',
      formatBadge: 'pdf',
      icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      status: 'pending',
      fileName: 'resume-optimized.html',
    },
    ...coverLetterItems,
    {
      id: 'job-matches',
      title: 'Top 30 Job Matches',
      description: 'Excel-compatible CSV with 30 targeted job opportunities ranked by match score, including company, role, salary range, and apply links.',
      format: 'CSV',
      formatBadge: 'xlsx',
      icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      status: 'pending',
      fileName: 'job-matches-top30.csv',
    },
    {
      id: 'linkedin-profile',
      title: 'LinkedIn Profile Text',
      description: 'Optimized LinkedIn headline, about section, and experience descriptions. Copy and paste directly into your profile.',
      format: 'TXT',
      formatBadge: 'txt',
      icon: 'M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 3.686 15 9 15s9-6.716 9-15V5a2 2 0 00-2-2H5zm4 10a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z',
      status: 'pending',
      fileName: 'linkedin-profile.txt',
    },
    {
      id: 'monte-carlo-report',
      title: 'Monte Carlo Probability Report',
      description: 'Detailed HTML report with outcome probability distributions, confidence intervals, and risk factor analysis from simulation runs.',
      format: 'PDF',
      formatBadge: 'pdf',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      status: 'pending',
      fileName: 'monte-carlo-report.html',
    },
  ]
}

/* ---------- Format Badge ---------- */

function FormatBadge({ format }: { format: Deliverable['formatBadge'] }) {
  const colors: Record<string, string> = {
    docx: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pdf: 'bg-red-500/10 text-red-400 border-red-500/20',
    xlsx: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    txt: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase border ${colors[format]}`}>
      {format}
    </span>
  )
}

/* ---------- Deliverable Card ---------- */

function DeliverableCard({ item, onDownload, onCopy }: {
  item: Deliverable
  onDownload: (id: string) => void
  onCopy: (id: string) => void
}) {
  const isReady = item.status === 'ready'
  const isGenerating = item.status === 'generating'
  const isError = item.status === 'error'
  const isTxt = item.formatBadge === 'txt'

  return (
    <div className="group rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-5 hover:border-white/[0.12] transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4.5 h-4.5 text-gray-400 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
              <FormatBadge format={item.formatBadge} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
          </div>
        </div>
      </div>

      {/* Status / Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          {isReady ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-mono">Ready</span>
            </div>
          ) : isGenerating ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] text-amber-400 font-mono">Generating...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[11px] text-red-400 font-mono">Error{item.errorMessage ? `: ${item.errorMessage}` : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              <span className="text-[11px] text-gray-500 font-mono">Pending</span>
            </div>
          )}
        </div>

        {isReady && (
          isTxt ? (
            <button
              onClick={() => onCopy(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Text
            </button>
          ) : (
            <button
              onClick={() => onDownload(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
          )
        )}
        {isGenerating && (
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        )}
        {isError && (
          <button
            onClick={() => onDownload(item.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08] transition-all"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- LinkedIn Text Modal ---------- */

function LinkedInModal({ open, onClose, text }: { open: boolean; onClose: () => void; text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-[#0e0e16] border border-white/[0.08] backdrop-blur-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white">LinkedIn Profile Text</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-4">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.06]">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500'}`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Main Page ---------- */

function DeliverablesPage() {
  const router = useRouter()
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [hasResults, setHasResults] = useState(false)
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false)
  const [linkedinText, setLinkedinText] = useState('')
  const [sessionData, setSessionData] = useState<any>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('qrsqpiResults')
    const resumeText = sessionStorage.getItem('resumeText') || ''

    if (stored) {
      setHasResults(true)
      const parsed = JSON.parse(stored)
      setSessionData({
        ...parsed,
        resumeText,
      })

      // Determine cover letter count from session data
      const targetRole = parsed.targetRole || ''
      const coverLetterCount = targetRole ? 3 : 2

      const items = getDeliverables({ coverLetters: coverLetterCount })
      setDeliverables(items)
    } else {
      setHasResults(false)
    }
  }, [])

  // Real download handler - calls API endpoints
  const handleDownload = useCallback(async (id: string) => {
    if (!sessionData) return

    // Set generating state
    setDeliverables(prev => prev.map(d =>
      d.id === id ? { ...d, status: 'generating' as const, errorMessage: undefined } : d
    ))
    setDownloading(id)

    try {
      const resumeText = sessionData.resumeText || ''
      const rewrittenResume = sessionData.rewrittenResume || ''
      const targetRole = sessionStorage.getItem('targetRole') || 'Software Engineer'
      const targetIndustry = sessionStorage.getItem('targetIndustry') || 'Technology'

      let response: Response | null = null

      switch (id) {
        case 'resume-docx': {
          response = await fetch('/api/deliverables/resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              format: 'docx',
              resumeText,
              rewrittenResume,
              panelEvaluation: sessionData.panelEvaluation,
              lineRewrite: sessionData.lineRewrite,
              baseScore: sessionData.baseScore,
            }),
          })
          break
        }
        case 'resume-pdf': {
          response = await fetch('/api/deliverables/resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              format: 'pdf',
              resumeText,
              rewrittenResume,
              panelEvaluation: sessionData.panelEvaluation,
              baseScore: sessionData.baseScore,
            }),
          })
          break
        }
        case 'job-matches': {
          response = await fetch('/api/deliverables/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetRole,
              targetIndustry,
              baseScore: sessionData.baseScore,
              panelEvaluation: sessionData.panelEvaluation,
              monteCarlo: sessionData.monteCarlo,
            }),
          })
          break
        }
        case 'monte-carlo-report': {
          response = await fetch('/api/deliverables/monte-carlo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              monteCarlo: sessionData.monteCarlo,
              panelEvaluation: sessionData.panelEvaluation,
              baseScore: sessionData.baseScore,
            }),
          })
          break
        }
        case 'linkedin-profile': {
          // LinkedIn is text-based, fetch JSON then show modal
          response = await fetch('/api/deliverables/linkedin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resumeText,
              targetRole,
              baseScore: sessionData.baseScore,
              panelEvaluation: sessionData.panelEvaluation,
            }),
          })
          if (response.ok) {
            const data = await response.json()
            setLinkedinText(data.fullText || '')
            setLinkedinModalOpen(true)
            setDeliverables(prev => prev.map(d =>
              d.id === id ? { ...d, status: 'ready' as const } : d
            ))
          }
          setDownloading(null)
          return
        }
        default: {
          // Cover letters
          if (id.startsWith('cover-letter-')) {
            const roleNumber = parseInt(id.replace('cover-letter-', ''), 10)
            response = await fetch('/api/deliverables/cover-letter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resumeText,
                targetRole,
                companyName: `Target Company ${roleNumber}`,
                roleNumber,
              }),
            })
          }
          break
        }
      }

      if (!response) {
        throw new Error('Unknown deliverable type')
      }

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      // Get the blob and trigger download
      const contentType = response.headers.get('Content-Type') || ''
      const blob = await response.blob()

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = ''
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match) filename = match[1].replace(/['"]/g, '')
      }

      // Fallback filename based on deliverable ID
      if (!filename) {
        const item = deliverables.find(d => d.id === id)
        filename = item?.fileName || `${id}-download.${contentType.includes('csv') ? 'csv' : contentType.includes('html') ? 'html' : 'doc'}`
      }

      // Create download link and trigger
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDeliverables(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'ready' as const } : d
      ))
    } catch (error: any) {
      console.error(`Download error for ${id}:`, error)
      setDeliverables(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'error' as const, errorMessage: error.message || 'Download failed' } : d
      ))
    } finally {
      setDownloading(null)
    }
  }, [sessionData, deliverables])

  const handleCopy = useCallback((id: string) => {
    if (id === 'linkedin-profile') {
      // If we already have linkedin text, show modal
      if (linkedinText) {
        setLinkedinModalOpen(true)
      } else {
        // Trigger download flow which will open modal
        handleDownload(id)
      }
    }
  }, [linkedinText, handleDownload])

  const handleDownloadAll = useCallback(async () => {
    const downloadableIds = deliverables
      .filter(d => d.formatBadge !== 'txt')
      .map(d => d.id)

    // Download them sequentially to avoid overwhelming the browser
    for (const id of downloadableIds) {
      await handleDownload(id)
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }, [deliverables, handleDownload])

  if (!hasResults) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.06] mx-auto flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-white">No Deliverables Yet</h2>
        <p className="text-sm text-gray-500">Complete the QRSQPI assessment first to generate your campaign assets.</p>
        <button
          onClick={() => router.push('/upload')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white transition-all"
        >
          Upload Resume
        </button>
      </div>
    )
  }

  const readyCount = deliverables.filter(d => d.status === 'ready').length
  const totalCount = deliverables.length

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero - Your Campaign Assets */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] p-8 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-mono uppercase tracking-wider text-gray-500 mb-1">
              QRSQPI Deliverables
            </h1>
            <h2 className="text-2xl font-bold text-white">
              Your Campaign Assets
            </h2>
            <p className="text-sm text-gray-400 mt-1.5 max-w-lg">
              All files generated from your QRSQPI session. Download each asset or copy text directly into your profiles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center min-w-[80px]">
              <div className="text-2xl font-bold text-white font-mono">{readyCount}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Ready</div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center min-w-[80px]">
              <div className="text-2xl font-bold text-gray-500 font-mono">{totalCount}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Total</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
              style={{ width: totalCount > 0 ? `${(readyCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-gray-500 font-mono">
              {readyCount === totalCount ? 'All assets ready' : `${totalCount - readyCount} assets generating...`}
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              {totalCount > 0 ? `${Math.round((readyCount / totalCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deliverables.map((item) => (
          <DeliverableCard
            key={item.id}
            item={item}
            onDownload={handleDownload}
            onCopy={handleCopy}
          />
        ))}
      </div>

      {/* Download All CTA */}
      <div className="rounded-xl bg-gradient-to-r from-violet-600/10 to-cyan-600/10 border border-violet-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-white">Download All Assets</h3>
          <p className="text-xs text-gray-400 mt-0.5">Download each file individually. {totalCount} assets available.</p>
        </div>
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 transition-all flex-shrink-0 disabled:opacity-50"
          onClick={handleDownloadAll}
          disabled={!!downloading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download All
        </button>
      </div>

      {/* Coaching CTA */}
      <div className="rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Next: AI Coaching Session</h3>
              <p className="text-xs text-gray-400 mt-0.5 max-w-md">
                Work with your AI coach to refine your resume further. Get personalized suggestions, bullet rewrites, and targeted improvements.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/coach')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] transition-all flex-shrink-0"
          >
            Start Coaching
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* LinkedIn Modal */}
      <LinkedInModal
        open={linkedinModalOpen}
        onClose={() => setLinkedinModalOpen(false)}
        text={linkedinText}
      />
    </div>
  )
}

/* ---------- Wrapper ---------- */

export default function DeliverablesPageWrapper() {
  return (
    <WebappLayout>
      <DeliverablesPage />
    </WebappLayout>
  )
}