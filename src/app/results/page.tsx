'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WebappLayout from '@/components/WebappLayout'

/* ---------- Types ---------- */

interface DimensionScore {
  dimension: string
  score: number
  justification: string
}

interface PanelistScore {
  name: string
  title: string
  perspectives: string[]
  dimensions: DimensionScore[]
  rawCommentary: string
}

interface PanelVerdict {
  panelists: PanelistScore[]
  compositeScore: number
  verdict: string
  consensusThemes: string[]
  dissentPoints: string[]
  hireProbability: number
}

interface SimulationResult {
  iterations: number
  outcomeLikelihoods: {
    interview: number
    phoneScreen: number
    onsite: number
    offer: number
  }
  confidenceIntervals: {
    p10: OutcomePercentile
    p50: OutcomePercentile
    p90: OutcomePercentile
  }
  scenarios: ScenarioAnalysis[]
  riskFactors: string[]
  improvementLever: string
  estimatedResponseRate: number
}

interface OutcomePercentile {
  interview: number
  phoneScreen: number
  onsite: number
  offer: number
}

interface ScenarioAnalysis {
  scenario: string
  estimatedLikelihood: number
  outcome: string
  description: string
}

interface CategoryScore {
  name: string
  score: number
  maxScore: number
  details: string
}

interface LineRewrite {
  overallOriginalScore: number
  overallImprovedScore: number
  overallDelta: number
  topImprovements: any[]
  keyPatterns: string[]
  summary: string
  lineCount: number
}

interface QRSQPIResult {
  success: boolean
  baseScore: {
    overallScore: number
    message: string
    categories: CategoryScore[]
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    keywords: string[]
    atsCompatibility: number
  }
  panelEvaluation: PanelVerdict | null
  monteCarlo: SimulationResult | null
  lineRewrite: LineRewrite | null
  intakeAnalysis: any | null
  meta: {
    engine: string
    phases: string[]
    timestamp: string
  }
}

/* ---------- Loading ---------- */

function ResultsLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-400">Loading results...</p>
      </div>
    </div>
  )
}

/* ---------- Wrapper ---------- */

export default function ResultsPageWrapper() {
  return (
    <WebappLayout>
      <Suspense fallback={<ResultsLoading />}>
        <ResultsPage />
      </Suspense>
    </WebappLayout>
  )
}

/* ---------- Score helpers ---------- */

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#8b5cf6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Work'
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'Strong Hire': return 'text-emerald-400'
    case 'Hire': return 'text-cyan-400'
    case 'No Hire': return 'text-amber-400'
    case 'Strong No Hire': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function getVerdictBg(verdict: string): string {
  switch (verdict) {
    case 'Strong Hire': return 'bg-emerald-500/10 border-emerald-500/20'
    case 'Hire': return 'bg-cyan-500/10 border-cyan-500/20'
    case 'No Hire': return 'bg-amber-500/10 border-amber-500/20'
    case 'Strong No Hire': return 'bg-red-500/10 border-red-500/20'
    default: return 'bg-white/[0.04] border-white/[0.06]'
  }
}

/* ---------- Panelist Card ---------- */

function PanelistCard({ panelist, index }: { panelist: PanelistScore; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const avgScore = panelist.dimensions.reduce((s, d) => s + d.score, 0) / panelist.dimensions.length

  const gradients = [
    'from-violet-500/10 to-purple-500/5',
    'from-cyan-500/10 to-blue-500/5',
    'from-emerald-500/10 to-teal-500/5',
    'from-amber-500/10 to-orange-500/5',
    'from-pink-500/10 to-rose-500/5',
    'from-indigo-500/10 to-violet-500/5',
  ]

  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} border border-white/[0.06] backdrop-blur-sm overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-medium text-white">{panelist.name}</h4>
            <p className="text-xs text-gray-500">{panelist.title}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold" style={{ color: getScoreColor(avgScore / 5 * 100) }}>
              {avgScore.toFixed(1)}
            </div>
            <div className="text-[10px] text-gray-600">avg / 5</div>
          </div>
        </div>

        {/* Dimension bars */}
        <div className="space-y-2">
          {panelist.dimensions.slice(0, expanded ? undefined : 2).map((dim) => (
            <div key={dim.dimension}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-400 truncate">{dim.dimension}</span>
                <span className="text-xs font-mono" style={{ color: getScoreColor(dim.score / 5 * 100) }}>
                  {dim.score}/5
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06]">
                <div
                  className="h-1 rounded-full transition-all duration-700"
                  style={{
                    width: `${dim.score / 5 * 100}%`,
                    backgroundColor: getScoreColor(dim.score / 5 * 100),
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {panelist.dimensions.length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-violet-400 hover:text-violet-300 mt-2 transition-colors"
          >
            {expanded ? 'Show less' : `+${panelist.dimensions.length - 2} more dimensions`}
          </button>
        )}

        {panelist.rawCommentary && (
          <p className="text-xs text-gray-500 mt-3 line-clamp-2 italic">&ldquo;{panelist.rawCommentary}&rdquo;</p>
        )}
      </div>
    </div>
  )
}

/* ---------- Main Results Page ---------- */

function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<QRSQPIResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'panel' | 'monteCarlo' | 'recommendations'>('panel')

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('qrsqpiResults')
      if (stored) {
        const parsed = JSON.parse(stored)
        setResults(parsed)
      } else {
        setError('No results found. Please upload a resume first.')
      }
    } catch (e) {
      setError('Failed to load results. Please try again.')
    }
    setLoading(false)
  }, [])

  if (loading) return <ResultsLoading />

  if (error || !results) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.06] mx-auto flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-gray-400">{error}</p>
        <button
          onClick={() => router.push('/upload')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white transition-all"
        >
          Upload Resume
        </button>
      </div>
    )
  }

  const baseScore = results.baseScore
  const panel = results.panelEvaluation
  const monteCarlo = results.monteCarlo
  const lineRewrite = results.lineRewrite

  // Compute composite overall score
  const compositeScore = panel?.compositeScore
    ? Math.round(((panel.compositeScore - 6) / 24) * 100)
    : baseScore?.overallScore || 0

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero - Composite Score */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] p-8 backdrop-blur-sm text-center">
        <div className="mb-2">
          <h1 className="text-sm font-mono uppercase tracking-wider text-gray-500 mb-1">
            QRSQPI Evaluation Report
          </h1>
        </div>

        {/* Large score */}
        <div className="relative inline-flex items-center justify-center my-6">
          <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="80" stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="none" />
            <circle
              cx="90" cy="90" r="80"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(compositeScore / 100) * 502.6} 502.6`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-5xl font-bold text-white">{compositeScore}</span>
            <span className="text-sm text-gray-500">/ 100</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-lg font-medium" style={{ color: getScoreColor(compositeScore) }}>
            {getScoreLabel(compositeScore)}
          </span>
          {panel?.verdict && (
            <>
              <span className="text-gray-600">|</span>
              <span className={`text-lg font-medium ${getVerdictColor(panel.verdict)}`}>
                {panel.verdict}
              </span>
            </>
          )}
        </div>

        {baseScore?.message && (
          <p className="text-sm text-gray-400 max-w-lg mx-auto">{baseScore.message}</p>
        )}

        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <div className="text-xs text-gray-500 font-mono">ATS Compat</div>
            <div className="text-sm text-gray-200">{baseScore?.atsCompatibility || '--'}%</div>
          </div>
          {panel && (
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <div className="text-xs text-gray-500 font-mono">Panel Score</div>
              <div className="text-sm text-gray-200">{panel.compositeScore.toFixed(1)}/30</div>
            </div>
          )}
          {lineRewrite && (
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <div className="text-xs text-gray-500 font-mono">Line Delta</div>
              <div className="text-sm text-emerald-400">+{lineRewrite.overallDelta.toFixed(1)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        {(['panel', 'monteCarlo', 'recommendations'] as const).map((tab) => {
          const labels = { panel: 'Expert Panel', monteCarlo: 'Monte Carlo', recommendations: 'Recommendations' }
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {/* Panel tab */}
      {activeTab === 'panel' && (
        <div className="space-y-6">
          {panel ? (
            <>
              {/* Verdict badge */}
              <div className={`rounded-xl p-4 border ${getVerdictBg(panel.verdict)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Panel Verdict</h3>
                    <p className={`text-2xl font-bold ${getVerdictColor(panel.verdict)}`}>{panel.verdict}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-white">{panel.compositeScore.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">/ 30 composite</div>
                  </div>
                </div>
              </div>

              {/* Consensus themes */}
              {panel.consensusThemes.length > 0 && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-gray-200 mb-3">Consensus Themes</h3>
                  <div className="space-y-2">
                    {panel.consensusThemes.map((theme, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-gray-400">{theme}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Panelist cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {panel.panelists.map((panelist, i) => (
                  <PanelistCard key={panelist.name} panelist={panelist} index={i} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-8 text-center">
              <p className="text-gray-500">Panel evaluation not available. This may occur when the AI service is temporarily unavailable.</p>
            </div>
          )}
        </div>
      )}

      {/* Monte Carlo tab */}
      {activeTab === 'monteCarlo' && (
        <div className="space-y-6">
          {monteCarlo ? (
            <>
              {/* Outcome probabilities */}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-gray-200 mb-4">Outcome Probabilities</h3>
                <p className="text-xs text-gray-600 mb-4">Estimated likelihoods based on 1,000 Monte Carlo simulations. These are not guarantees.</p>
                <div className="space-y-4">
                  {[
                    { label: 'Get Interview', value: monteCarlo.outcomeLikelihoods.interview, color: '#8b5cf6' },
                    { label: 'Pass Phone Screen', value: monteCarlo.outcomeLikelihoods.phoneScreen, color: '#06b6d4' },
                    { label: 'Reach Onsite', value: monteCarlo.outcomeLikelihoods.onsite, color: '#10b981' },
                    { label: 'Receive Offer', value: monteCarlo.outcomeLikelihoods.offer, color: '#f59e0b' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">{label}</span>
                        <span className="text-sm font-mono font-medium" style={{ color }}>
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06]">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, value * 100)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence intervals */}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-gray-200 mb-4">Confidence Intervals</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left text-gray-500 font-mono pb-2">Percentile</th>
                        <th className="text-right text-gray-500 font-mono pb-2">Interview</th>
                        <th className="text-right text-gray-500 font-mono pb-2">Phone</th>
                        <th className="text-right text-gray-500 font-mono pb-2">Onsite</th>
                        <th className="text-right text-gray-500 font-mono pb-2">Offer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'P10 (Worst)', data: monteCarlo.confidenceIntervals.p10 },
                        { label: 'P50 (Median)', data: monteCarlo.confidenceIntervals.p50 },
                        { label: 'P90 (Best)', data: monteCarlo.confidenceIntervals.p90 },
                      ].map(({ label, data }) => (
                        <tr key={label} className="border-b border-white/[0.04]">
                          <td className="text-gray-400 py-2">{label}</td>
                          <td className="text-right font-mono text-gray-300 py-2">{(data.interview * 100).toFixed(1)}%</td>
                          <td className="text-right font-mono text-gray-300 py-2">{(data.phoneScreen * 100).toFixed(1)}%</td>
                          <td className="text-right font-mono text-gray-300 py-2">{(data.onsite * 100).toFixed(1)}%</td>
                          <td className="text-right font-mono text-gray-300 py-2">{(data.offer * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scenarios */}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-gray-200 mb-4">Scenario Analysis</h3>
                <div className="space-y-3">
                  {monteCarlo.scenarios.map((scenario, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        scenario.outcome === 'advance' ? 'bg-emerald-400' : scenario.outcome === 'reject' ? 'bg-red-400' : 'bg-amber-400'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">{scenario.scenario}</span>
                          <span className="text-xs font-mono text-gray-500">{scenario.estimatedLikelihood}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{scenario.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk factors */}
              {monteCarlo.riskFactors.length > 0 && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-gray-200 mb-4">Risk Factors</h3>
                  <div className="space-y-2">
                    {monteCarlo.riskFactors.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm text-gray-400">{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-8 text-center">
              <p className="text-gray-500">Monte Carlo simulation not available.</p>
            </div>
          )}
        </div>
      )}

      {/* Recommendations tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Base score categories */}
          {baseScore?.categories && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-gray-200 mb-4">Score Breakdown</h3>
              <div className="space-y-4">
                {baseScore.categories.map((cat, i) => {
                  const pct = (cat.score / cat.maxScore) * 100
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">{cat.name}</span>
                        <span className="text-sm font-mono" style={{ color: getScoreColor(pct) }}>
                          {cat.score}/{cat.maxScore}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06]">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: getScoreColor(pct) }}
                        />
                      </div>
                      {cat.details && <p className="text-xs text-gray-600 mt-1">{cat.details}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Strengths / Weaknesses */}
          <div className="grid sm:grid-cols-2 gap-4">
            {baseScore?.strengths && baseScore.strengths.length > 0 && (
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-5 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-emerald-400 mb-3">Strengths</h3>
                <ul className="space-y-2">
                  {baseScore.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-gray-400">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {baseScore?.weaknesses && baseScore.weaknesses.length > 0 && (
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-5 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-red-400 mb-3">Areas to Improve</h3>
                <ul className="space-y-2">
                  {baseScore.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-gray-400">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Line rewrite summary */}
          {lineRewrite && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-200">Line-by-Line Rewrite Analysis</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">{lineRewrite.overallOriginalScore.toFixed(1)}/10</span>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="text-xs font-mono text-emerald-400">{lineRewrite.overallImprovedScore.toFixed(1)}/10</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">{lineRewrite.summary}</p>
              {lineRewrite.keyPatterns.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Key Patterns</div>
                  {lineRewrite.keyPatterns.map((pattern, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-gray-400">{pattern}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {baseScore?.recommendations && baseScore.recommendations.length > 0 && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-gray-200 mb-4">Actionable Recommendations</h3>
              <div className="space-y-3">
                {baseScore.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-mono flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/coach')}
            className="flex-1 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20 transition-all"
          >
            Start Coaching Session
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('qrsqpiResults')
              router.push('/assessment')
            }}
            className="flex-1 py-3 rounded-lg text-sm font-medium bg-white/[0.06] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] transition-all"
          >
            New Assessment
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-3 text-center">
          All scores and probability estimates are based on AI analysis and internal modeling. They are not guarantees.
        </p>
      </div>
    </div>
  )
}