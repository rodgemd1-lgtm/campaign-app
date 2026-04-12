'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WebappLayout from '@/components/WebappLayout'

interface DimensionScore { dimension: string; score: number; justification: string }
interface PanelistScore { name: string; title: string; dimensions: DimensionScore[] }

interface Suggestion {
  id: string; type: 'improve' | 'rewrite' | 'add' | 'remove'
  originalLine: string; suggestedLine: string; rationale: string; accepted: boolean | null
  deltaScore?: number
}

interface Message {
  id: string; role: 'assistant' | 'user'; content: string
  suggestions?: Suggestion[]; timestamp: Date
}

interface SessionData {
  resumeText: string
  targetRole: string
  targetIndustry: string
  baseScore: any
  panelEvaluation: any
  lineRewrite: any
  monteCarlo: any
  rewrittenResume: string | null
}

function CoachContent() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [panelData, setPanelData] = useState<any>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [scoreImprovement, setScoreImprovement] = useState<number>(0)
  const [acceptedCount, setAcceptedCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load session data from storage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('qrsqpiResults')
      if (stored) {
        const parsed = JSON.parse(stored)
        setPanelData(parsed.panelEvaluation)
        setSessionData({
          resumeText: parsed.resumeText || sessionStorage.getItem('resumeText') || '',
          targetRole: parsed.targetRole || sessionStorage.getItem('targetRole') || 'Software Engineer',
          targetIndustry: parsed.targetIndustry || sessionStorage.getItem('targetIndustry') || 'Technology',
          baseScore: parsed.baseScore,
          panelEvaluation: parsed.panelEvaluation,
          lineRewrite: parsed.lineRewrite,
          monteCarlo: parsed.monteCarlo,
          rewrittenResume: parsed.rewrittenResume,
        })
      }
    } catch (e) {
      console.error('Failed to load session data', e)
    }

    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to your coaching session. I've loaded your QRSQPI evaluation data and I'm ready to provide targeted, data-driven improvements.\n\nBased on your analysis results, I can help you:\n- Rewrite specific bullet points with measurable impact\n- Strengthen weak sections identified by the expert panel\n- Add quantified metrics where they're missing\n- Improve ATS compatibility\n\nWhat would you like to work on first?",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build context string from session data for AI prompts
  const buildContext = useCallback((): string => {
    if (!sessionData) return ''
    const parts: string[] = []

    if (sessionData.baseScore) {
      parts.push(`Base AI Score: ${sessionData.baseScore.overallScore}/100`)
      if (sessionData.baseScore.weaknesses?.length) {
        parts.push(`Key weaknesses: ${sessionData.baseScore.weaknesses.slice(0, 5).join('; ')}`)
      }
      if (sessionData.baseScore.recommendations?.length) {
        parts.push(`Top recommendations: ${sessionData.baseScore.recommendations.slice(0, 3).join('; ')}`)
      }
    }

    if (sessionData.panelEvaluation) {
      const comp = sessionData.panelEvaluation.compositeScore
      parts.push(`Panel composite score: ${comp}/30 (percentile: ${Math.round(((comp - 6) / 24) * 100)}/100)`)
      if (sessionData.panelEvaluation.consensusThemes?.length) {
        parts.push(`Panel consensus themes: ${sessionData.panelEvaluation.consensusThemes.slice(0, 4).join('; ')}`)
      }
    }

    if (sessionData.lineRewrite) {
      parts.push(`Line rewrite: original score ${sessionData.lineRewrite.overallOriginalScore}/10, improved score ${sessionData.lineRewrite.overallImprovedScore}/10, delta +${sessionData.lineRewrite.overallDelta}`)
      if (sessionData.lineRewrite.keyPatterns?.length) {
        parts.push(`Key improvement patterns: ${sessionData.lineRewrite.keyPatterns.slice(0, 3).join('; ')}`)
      }
    }

    if (sessionData.monteCarlo?.estimatedResponseRate) {
      parts.push(`Monte Carlo estimated response rate: ${sessionData.monteCarlo.estimatedResponseRate}%`)
    }

    return parts.join('\n')
  }, [sessionData])

  // Extract top improvements from line rewrite data
  const getTopImprovements = useCallback((): Suggestion[] => {
    if (!sessionData?.lineRewrite?.topImprovements) return []
    return sessionData.lineRewrite.topImprovements.slice(0, 3).map((imp: any, i: number) => ({
      id: `preload-${i}`,
      type: imp.deltaScore >= 2 ? 'rewrite' as const : 'improve' as const,
      originalLine: imp.originalLine,
      suggestedLine: imp.suggestedRewrite,
      rationale: imp.rationale,
      accepted: null,
      deltaScore: imp.deltaScore,
    }))
  }, [sessionData])

  // Send message to AI coach
  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Build the conversation history for context
    const recentMessages = messages.slice(-4).map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      // Abort any previous request
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      const response = await fetch('/api/qrsqpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: sessionData?.resumeText || '',
          targetRole: sessionData?.targetRole || '',
          targetIndustry: sessionData?.targetIndustry || '',
          includePanelEvaluation: false,
          includeMonteCarlo: false,
          includeLineRewrite: true,
          coachingMode: true,
          coachingMessage: userMessage.content,
          coachingHistory: recentMessages,
          sessionContext: buildContext(),
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Extract suggestions from line rewrite results if available
      const suggestions: Suggestion[] = []

      if (data.lineRewrite?.topImprovements) {
        data.lineRewrite.topImprovements.slice(0, 3).forEach((imp: any, i: number) => {
          suggestions.push({
            id: `ai-${Date.now()}-${i}`,
            type: imp.deltaScore >= 2 ? 'rewrite' : 'improve',
            originalLine: imp.originalLine,
            suggestedLine: imp.suggestedRewrite,
            rationale: imp.rationale || 'AI-recommended improvement based on your session data.',
            accepted: null,
            deltaScore: imp.deltaScore,
          })
        })
      }

      // Build response content from the AI data
      let content = ''
      if (data.lineRewrite?.summary) {
        content = data.lineRewrite.summary
      } else if (data.baseScore?.recommendations) {
        content = `Based on your AI analysis (score: ${data.baseScore.overallScore}/100), here are the key recommendations:\n\n${data.baseScore.recommendations.slice(0, 4).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`
      } else {
        content = "I've analyzed your resume against your target role. Check the suggestions below for specific improvements you can apply."
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content,
        suggestions,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // Update session data with new line rewrite results
      if (data.lineRewrite && sessionData) {
        setSessionData(prev => prev ? {
          ...prev,
          lineRewrite: data.lineRewrite,
          rewrittenResume: data.rewrittenResume || prev.rewrittenResume,
        } : null)
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return

      console.error('Coach API error:', error)

      // Fallback: use preloaded improvements from session data
      const preloadSuggestions = getTopImprovements()
      const fallbackContent = preloadSuggestions.length > 0
        ? "I encountered an issue connecting to the AI engine, but I've loaded your top improvement opportunities from your previous session data. Review the suggestions below:"
        : "I'm having trouble connecting to the AI engine. Please try again in a moment."

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fallbackContent,
        suggestions: preloadSuggestions,
        timestamp: new Date(),
      }])
    } finally {
      setIsTyping(false)
      abortRef.current = null
    }
  }, [input, isTyping, messages, sessionData, buildContext, getTopImprovements])

  const handleSuggestionAction = useCallback((messageId: string, suggestionId: string, action: 'accept' | 'reject') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg
      return {
        ...msg,
        suggestions: msg.suggestions?.map(s => {
          if (s.id !== suggestionId) return s
          const deltaScore = s.deltaScore || 1.5
          if (action === 'accept') {
            setScoreImprovement(prev => prev + deltaScore)
            setAcceptedCount(prev => prev + 1)
          }
          return { ...s, accepted: action === 'accept' }
        })
      }
    }))
  }, [])

  // Quick action handlers
  const handleQuickAction = useCallback((action: string) => {
    setInput(action)
  }, [])

  const compositeScore = panelData?.compositeScore
    ? Math.round(((panelData.compositeScore - 6) / 24) * 100)
    : null

  const displayScore = compositeScore !== null
    ? Math.min(100, compositeScore + Math.round(scoreImprovement))
    : null

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-4">
      {/* Sidebar - visible on lg */}
      <div className="hidden lg:flex w-64 flex-shrink-0 flex-col gap-3">
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
          <h2 className="text-sm font-medium text-white mb-1">Resume Score</h2>
          {displayScore !== null ? (
            <>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-white">{displayScore}</span>
                <span className="text-sm text-gray-500 mb-1">/ 100</span>
              </div>
              {scoreImprovement > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-xs text-emerald-400 font-mono">+{Math.round(scoreImprovement)} pts</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">No results loaded</p>
          )}
        </div>

        {panelData?.panelists && (
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 flex-1 overflow-y-auto">
            <h3 className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">Panel Scores</h3>
            <div className="space-y-3">
              {panelData.panelists.map((p: PanelistScore) => {
                const avg = p.dimensions.reduce((s: number, d: DimensionScore) => s + d.score, 0) / p.dimensions.length
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 truncate">{p.name}</span>
                      <span className="text-xs font-mono text-gray-500">{avg.toFixed(1)}/5</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06]">
                      <div className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${avg / 5 * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Accepted improvements tracker */}
        {acceptedCount > 0 && (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
            <h3 className="text-xs text-emerald-400 font-mono uppercase tracking-wider mb-2">Improvements Applied</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-400">{acceptedCount}</span>
              <span className="text-xs text-gray-400">suggestions accepted</span>
            </div>
          </div>
        )}

        <a href="/results" className="block text-center py-2 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-white/[0.06] transition-all">View Full Results</a>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-4 ${msg.role === 'user' ? 'bg-violet-600/20 border border-violet-500/20' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
                <div className={`text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'text-gray-200' : 'text-gray-300'}`}>{msg.content}</div>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="text-xs text-gray-500 font-mono uppercase tracking-wider">Suggested Changes</div>
                    {msg.suggestions.map((suggestion) => (
                      <div key={suggestion.id} className={`rounded-lg border p-3 ${suggestion.accepted === true ? 'bg-emerald-500/10 border-emerald-500/20' : suggestion.accepted === false ? 'bg-red-500/5 border-red-500/10 opacity-60' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${suggestion.type === 'improve' ? 'bg-amber-500/10 text-amber-400' : suggestion.type === 'rewrite' ? 'bg-violet-500/10 text-violet-400' : suggestion.type === 'add' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{suggestion.type}</span>
                          {suggestion.deltaScore !== undefined && suggestion.deltaScore > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">+{suggestion.deltaScore.toFixed(1)}</span>
                          )}
                        </div>
                        {suggestion.originalLine && <div className="text-xs text-gray-600 line-through mb-1 font-mono">{suggestion.originalLine}</div>}
                        <div className="text-sm text-gray-200 font-mono">{suggestion.suggestedLine}</div>
                        <p className="text-xs text-gray-500 mt-1.5">{suggestion.rationale}</p>
                        {suggestion.accepted === null && (
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => handleSuggestionAction(msg.id, suggestion.id, 'accept')} className="px-3 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">Accept</button>
                            <button onClick={() => handleSuggestionAction(msg.id, suggestion.id, 'reject')} className="px-3 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">Reject</button>
                          </div>
                        )}
                        {suggestion.accepted === true && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Applied to resume (+{(suggestion.deltaScore || 1.5).toFixed(1)} pts)
                          </span>
                        )}
                        {suggestion.accepted === false && <span className="inline-flex items-center gap-1 mt-2 text-xs text-gray-600">Rejected</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-[10px] text-gray-600 mt-2 font-mono">Analyzing with QRSQPI engine...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {['Rewrite my bullets', 'Add quantified metrics', 'Strengthen summary', 'ATS optimization'].map((chip) => (
              <button key={chip} onClick={() => handleQuickAction(chip)} className="px-3 py-1 rounded-full text-xs bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-all">{chip}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask your AI coach how to improve your resume..."
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
              disabled={isTyping}
            />
            <button onClick={handleSend} disabled={!input.trim() || isTyping}
              className="p-3 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-violet-500 hover:to-cyan-500 transition-all flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CoachPage() {
  return <WebappLayout><CoachContent /></WebappLayout>
}