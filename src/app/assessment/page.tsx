'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WebappLayout from '@/components/WebappLayout'

const INDUSTRIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
]

interface QuestionData {
  id: string; question: string; subtext: string; placeholder: string; category: string; weight: number; required: boolean
}

function AssessmentContent() {
  const router = useRouter()
  const [step, setStep] = useState<'industry' | 'questions' | 'complete'>('industry')
  const [industry, setIndustry] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Load saved state
  useState(() => {
    try {
      const saved = localStorage.getItem('qrsqpiIntake')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.industry) setIndustry(parsed.industry)
        if (parsed.targetRole) setTargetRole(parsed.targetRole)
        if (parsed.answers) setAnswers(parsed.answers)
      }
    } catch {}
  })

  const saveState = (ind: string, role: string, ans: Record<string, string>) => {
    localStorage.setItem('qrsqpiIntake', JSON.stringify({ industry: ind, targetRole: role, answers: ans }))
  }

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/qrsqpi?industry=${encodeURIComponent(industry)}&role=${encodeURIComponent(targetRole)}`)
      const data = await res.json()
      if (data.success && data.questions) { setQuestions(data.questions); setStep('questions'); setCurrentQ(0) }
    } catch { setQuestions(getFallbackQuestions(industry)); setStep('questions'); setCurrentQ(0) }
    setLoading(false)
  }

  const handleAnswer = (id: string, value: string) => {
    const updated = { ...answers, [id]: value }
    setAnswers(updated)
    saveState(industry, targetRole, updated)
  }

  const goNext = () => {
    if (currentQ < questions.length - 1) { setCurrentQ(currentQ + 1) }
    else { saveState(industry, targetRole, answers); setStep('complete') }
  }
  const goBack = () => { if (currentQ > 0) setCurrentQ(currentQ - 1); else setStep('industry') }
  const handleComplete = () => { saveState(industry, targetRole, answers); router.push('/upload') }

  const currentQuestion = questions[currentQ]
  const progress = step === 'industry' ? 0 : step === 'complete' ? 100 : ((currentQ + 1) / questions.length) * 100

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
            {step === 'industry' ? 'Step 0 of 7' : step === 'complete' ? 'Complete' : `Question ${currentQ + 1} of ${questions.length}`}
          </span>
          <span className="text-xs text-gray-500 font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06]">
          <div className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Industry */}
      {step === 'industry' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Target Industry</h1>
            <p className="text-sm text-gray-400">Select your target industry to calibrate the assessment questions.</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6 space-y-5 backdrop-blur-sm">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-3 text-gray-200 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all appearance-none cursor-pointer">
                <option value="" className="bg-[#0a0a0f]">Select an industry...</option>
                {INDUSTRIES.map((ind) => <option key={ind.value} value={ind.value} className="bg-[#0a0a0f]">{ind.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target Role (optional)</label>
              <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Senior Software Engineer at a Series B startup"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all" />
            </div>
            <button onClick={fetchQuestions} disabled={!industry || loading}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${!industry || loading ? 'bg-white/[0.04] text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20'}`}>
              {loading ? 'Loading Questions...' : 'Begin Assessment'}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 pt-4">
            {[0,1,2,3,4,5,6,7].map((i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === 0 ? 'bg-violet-500 scale-125' : 'bg-white/[0.08]'}`} />)}
          </div>
        </div>
      )}

      {/* Questions */}
      {step === 'questions' && currentQuestion && (
        <div className="space-y-6">
          <div className="rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 text-xs font-mono uppercase tracking-wider">{currentQuestion.category.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-600 font-mono">weight: {currentQuestion.weight.toFixed(2)}</span>
              {currentQuestion.required && <span className="text-xs text-amber-500/80">required</span>}
            </div>
            <h2 className="text-lg font-medium text-white mb-2 leading-relaxed">{currentQuestion.question}</h2>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">{currentQuestion.subtext}</p>
            <textarea value={answers[currentQuestion.id] || ''} onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              placeholder={currentQuestion.placeholder} rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">{(answers[currentQuestion.id] || '').length} characters</span>
              {currentQuestion.required && !(answers[currentQuestion.id] || '').trim() && <span className="text-xs text-gray-600">Answer required to proceed</span>}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all border border-white/[0.06]">Back</button>
            <button onClick={goNext}
              disabled={currentQuestion.required && !(answers[currentQuestion.id] || '').trim()}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${currentQuestion.required && !(answers[currentQuestion.id] || '').trim() ? 'bg-white/[0.04] text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20'}`}>
              {currentQ < questions.length - 1 ? 'Next Question' : 'Complete Assessment'}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 pt-4">
            {questions.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < currentQ ? 'bg-violet-500' : i === currentQ ? 'bg-violet-500 scale-125' : 'bg-white/[0.08]'}`} />)}
          </div>
        </div>
      )}

      {/* Complete */}
      {step === 'complete' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 p-8 text-center backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Assessment Complete</h2>
            <p className="text-sm text-gray-400 mb-6">All {questions.length} questions answered. Your responses calibrate the QRSQPI evaluation engine.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                <div className="text-xs text-gray-500 font-mono uppercase mb-1">Industry</div>
                <div className="text-sm text-gray-200 capitalize">{industry}</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                <div className="text-xs text-gray-500 font-mono uppercase mb-1">Questions</div>
                <div className="text-sm text-gray-200">{Object.keys(answers).length} answered</div>
              </div>
            </div>
            <button onClick={handleComplete} className="w-full py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20 transition-all">
              Continue to Upload Resume
            </button>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Your Responses</h3>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-mono">{i + 1}</div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 truncate">{q.question}</div>
                    <div className="text-sm text-gray-300 mt-0.5 line-clamp-2">{answers[q.id] || <span className="text-gray-600 italic">Not answered</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AssessmentPage() {
  return (
    <WebappLayout>
      <AssessmentContent />
    </WebappLayout>
  )
}

function getFallbackQuestions(industry: string): QuestionData[] {
  return [
    { id: 'q1_career_stage', question: 'What is your current career stage and what role are you targeting next?', subtext: "Calibrates evaluation to your level.", placeholder: 'e.g., "Senior engineer targeting Staff Engineer"', category: 'career_stage', weight: 0.20, required: true },
    { id: 'q2_impact', question: "What is the single most impactful result you've delivered? Quantify it.", subtext: 'Quantified impact is the #1 differentiator.', placeholder: 'e.g., "Reduced API latency by 63% saving $2.3M/year"', category: 'impact_evidence', weight: 0.20, required: true },
    { id: 'q3_technical_depth', question: 'What was the hardest technical or domain problem you solved?', subtext: 'Reveals actual vs. claimed expertise.', placeholder: 'e.g., "Designed a real-time fraud detection system processing 50K events/sec"', category: 'technical_depth', weight: 0.15, required: true },
    { id: 'q4_role_alignment', question: 'How does your experience map to your target role requirements?', subtext: 'Alignment means answering what the hiring manager is looking for.', placeholder: 'e.g., "Role requires distributed systems; I\'ve built 3 microservices platforms"', category: 'role_alignment', weight: 0.15, required: true },
    { id: 'q5_industry', question: "What unique domain insight do you bring that 90% of applicants don't have?", subtext: 'Domain specificity is a force multiplier.', placeholder: 'e.g., "Deep understanding of HIPAA compliance from healthcare SaaS"', category: 'industry_context', weight: 0.10, required: false },
    { id: 'q6_growth', question: 'Describe a time you significantly grew your capability. What did it enable?', subtext: 'Growth trajectory signals future potential.', placeholder: 'e.g., "Went from no ML experience to deploying 3 production ML models in 18 months"', category: 'growth_trajectory', weight: 0.10, required: false },
    { id: 'q7_differentiator', question: 'If you could only include one line on your resume, what would it be?', subtext: "Forces prioritization.", placeholder: 'e.g., "Built the payment system processing $1.2B in GMV with 99.99% reliability"', category: 'differentiator', weight: 0.10, required: true },
  ]
}