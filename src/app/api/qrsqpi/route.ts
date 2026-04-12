// -------------------------------------------------------
// /api/qrsqpi - Full QRSQPI evaluation endpoint
// Combines: expert panel, Monte Carlo, intake analysis,
// and line-by-line rewrite into a single comprehensive
// evaluation pipeline.
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { scoreResumeWithAI, extractTextFromBuffer } from '@/lib/ai-scoring'
import { evaluateWithPanel } from '@/lib/expert-panel'
import { runMonteCarloSimulation, quickEstimateJobFit, quickEstimateSeniority } from '@/lib/monte-carlo'
import { getIntakeQuestions, analyzeIntakeResponses } from '@/lib/qrsqpi-questions'
import { rewriteResumeLines } from '@/lib/line-rewrite'

export async function POST(request: NextRequest) {
  try {
    let resumeText = ''
    let targetRole = ''
    let targetIndustry = ''
    let yearsExperience = 5
    let targetCompanyTier: string = 'unknown'
    let applicantPoolSize = 250
    let intakeResponses: Record<string, string> = {}
    let includePanelEvaluation = true
    let includeMonteCarlo = true
    let includeLineRewrite = true
    let coachingMode = false
    let coachingMessage = ''
    let coachingHistory: Array<{ role: string; content: string }> = []
    let sessionContext = ''

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload via FormData (from upload page)
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (file) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        resumeText = await extractTextFromBuffer(buffer, file.name)
      } else {
        // Fallback: check for inline resumeText
        resumeText = (formData.get('resumeText') as string) || ''
      }

      targetRole = (formData.get('targetRole') as string) || ''
      targetIndustry = (formData.get('targetIndustry') as string) || ''
      yearsExperience = Number(formData.get('yearsExperience')) || 5
      targetCompanyTier = (formData.get('targetCompanyTier') as string) || 'unknown'
      applicantPoolSize = Number(formData.get('applicantPoolSize')) || 250
      try { intakeResponses = JSON.parse((formData.get('intakeResponses') as string) || '{}') } catch { intakeResponses = {} }
      includePanelEvaluation = formData.get('includePanelEvaluation') !== 'false'
      includeMonteCarlo = formData.get('includeMonteCarlo') !== 'false'
      includeLineRewrite = formData.get('includeLineRewrite') !== 'false'
      coachingMode = formData.get('coachingMode') === 'true'
      coachingMessage = (formData.get('coachingMessage') as string) || ''
      try { coachingHistory = JSON.parse((formData.get('coachingHistory') as string) || '[]') } catch { coachingHistory = [] }
      sessionContext = (formData.get('sessionContext') as string) || ''
    } else {
      // Handle JSON body (existing flow from home page or API calls)
      const body = await request.json()
      resumeText = body.resumeText || ''
      targetRole = body.targetRole || ''
      targetIndustry = body.targetIndustry || ''
      yearsExperience = body.yearsExperience || 5
      targetCompanyTier = body.targetCompanyTier || 'unknown'
      applicantPoolSize = body.applicantPoolSize || 250
      intakeResponses = body.intakeResponses || {}
      includePanelEvaluation = body.includePanelEvaluation !== false
      includeMonteCarlo = body.includeMonteCarlo !== false
      includeLineRewrite = body.includeLineRewrite !== false
      coachingMode = body.coachingMode || false
      coachingMessage = body.coachingMessage || ''
      coachingHistory = body.coachingHistory || []
      sessionContext = body.sessionContext || ''
    }

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 20) {
      return NextResponse.json(
        { error: 'Resume text is required (at least 20 characters)' },
        { status: 400 }
      )
    }

    // Phase 0: Intake question analysis (if responses provided)
    let intakeAnalysis = null
    if (Object.keys(intakeResponses).length > 0) {
      intakeAnalysis = analyzeIntakeResponses({
        responses: intakeResponses,
        targetRole,
        targetIndustry,
        yearsExperience,
      })
    }

    // Phase 1: Base AI scoring (always runs)
    const baseAnalysis = await scoreResumeWithAI(resumeText)

    // Phase 2: Expert panel evaluation
    let panelVerdict = null
    if (includePanelEvaluation) {
      try {
        panelVerdict = await evaluateWithPanel(resumeText, targetRole)
      } catch (error: any) {
        console.error('Panel evaluation failed:', error?.message || error)
        // Continue without panel - not fatal
      }
    }

    // Phase 3: Monte Carlo simulation
    let monteCarloResult = null
    if (includeMonteCarlo) {
      const jobFitQuick = quickEstimateJobFit(resumeText, targetRole)
      const seniorityQuick = quickEstimateSeniority(resumeText, yearsExperience)

      monteCarloResult = runMonteCarloSimulation({
        resumeScore: baseAnalysis.overallScore,
        jobFitScore: jobFitQuick,
        industryAlignment: baseAnalysis.categories.find(c => c.name === 'Skills & Keywords')?.score || 50,
        seniorityMatch: seniorityQuick,
        panelCompositeScore: panelVerdict?.compositeScore,
        targetCompanyTier,
        applicantPoolSize,
      })
    }

    // Phase 4: Line-by-line rewrite
    let rewriteResult = null
    if (includeLineRewrite) {
      try {
        rewriteResult = await rewriteResumeLines(resumeText, targetRole)
      } catch (error: any) {
        console.error('Line rewrite failed:', error?.message || error)
        // Continue without rewrite - not fatal
      }
    }

    // Coaching mode: return line-rewrite-focused response for the Coach page
    if (coachingMode) {
      // Only run line rewrite (lightest compute path)
      let coachingRewrite = rewriteResult
      if (!coachingRewrite && resumeText) {
        try {
          coachingRewrite = await rewriteResumeLines(resumeText, targetRole || undefined)
        } catch (e: any) {
          console.error('Coaching rewrite failed:', e?.message)
        }
      }

      return NextResponse.json({
        success: true,
        lineRewrite: coachingRewrite ? {
          overallOriginalScore: coachingRewrite.overallOriginalScore,
          overallImprovedScore: coachingRewrite.overallImprovedScore,
          overallDelta: coachingRewrite.overallDelta,
          topImprovements: coachingRewrite.topImprovements,
          keyPatterns: coachingRewrite.keyPatterns,
          summary: coachingRewrite.summary,
          lineCount: coachingRewrite.lines.length,
        } : null,
        baseScore: baseAnalysis ? {
          overallScore: baseAnalysis.overallScore,
          strengths: baseAnalysis.strengths?.slice(0, 3),
          weaknesses: baseAnalysis.weaknesses?.slice(0, 3),
          recommendations: baseAnalysis.recommendations?.slice(0, 3),
        } : null,
        rewrittenResume: coachingRewrite
          ? coachingRewrite.lines.map((l: any) => l.suggestedRewrite || l.originalLine).join('\n')
          : null,
        meta: {
          engine: 'QRSQPI v1.0 — Coaching Mode',
          phases: ['line_rewrite'],
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Assemble comprehensive result
    const result = {
      success: true,
      disclaimer: 'All scores and probability estimates are based on AI analysis and internal modeling. They represent estimated likelihoods and should not be interpreted as guarantees of employment outcomes.',
      baseScore: baseAnalysis,
      panelEvaluation: panelVerdict,
      monteCarlo: monteCarloResult,
      intakeAnalysis,
      lineRewrite: rewriteResult ? {
        overallOriginalScore: rewriteResult.overallOriginalScore,
        overallImprovedScore: rewriteResult.overallImprovedScore,
        overallDelta: rewriteResult.overallDelta,
        topImprovements: rewriteResult.topImprovements,
        keyPatterns: rewriteResult.keyPatterns,
        summary: rewriteResult.summary,
        lineCount: rewriteResult.lines.length,
      } : null,
      rewrittenResume: rewriteResult
        ? rewriteResult.lines.map(l => l.suggestedRewrite || l.originalLine).join('\n')
        : null,
      meta: {
        engine: 'QRSQPI v1.0',
        phases: [
          'base_scoring',
          includePanelEvaluation ? 'expert_panel' : null,
          includeMonteCarlo ? 'monte_carlo' : null,
          includeLineRewrite ? 'line_rewrite' : null,
        ].filter(Boolean),
        timestamp: new Date().toISOString(),
      },
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('QRSQPI evaluation error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during QRSQPI evaluation. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint returns intake questions for the role
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetIndustry = searchParams.get('industry') || ''
  const targetRole = searchParams.get('role') || ''

  const questions = getIntakeQuestions(targetIndustry, targetRole)

  return NextResponse.json({
    success: true,
    questions,
    meta: {
      engine: 'QRSQPI v1.0',
      questionCount: questions.length,
    },
  })
}