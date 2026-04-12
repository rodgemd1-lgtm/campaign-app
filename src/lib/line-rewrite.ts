// -------------------------------------------------------
// QRSQPI Line-by-Line Rewrite Engine
// Takes each line of a resume, scores it, and generates
// an improved version with a delta score.
// Uses OpenRouter free tier for AI-powered rewrites.
// -------------------------------------------------------

import OpenAI from 'openai'

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Resume Scorer – Line Rewrite',
  },
})

const MODEL = 'z-ai/glm-4.5-air:free'

// ---------- Fabrication Detection ----------

/**
 * Detects numbers in the rewrite that were NOT present in the original line.
 * Matches numbers such as: 50%, $100, 3x, 10K, etc.
 * Returns true if any fabricated numbers are found.
 */
function detectFabrication(originalLine: string, suggestedRewrite: string): boolean {
  const originalNums = new Set<string>()
  const numPattern = /\d+(?:[%$KkMmBb]?)/g
  let match: RegExpExecArray | null
  while ((match = numPattern.exec(originalLine)) !== null) {
    originalNums.add(match[0])
  }

  let rewriteMatch: RegExpExecArray | null
  // Reset the regex lastIndex for the rewrite string
  const rewriteNumPattern = /\d+(?:[%$KkMmBb]?)/g
  while ((rewriteMatch = rewriteNumPattern.exec(suggestedRewrite)) !== null) {
    if (!originalNums.has(rewriteMatch[0])) {
      return true  // fabricated number found
    }
  }

  return false
}

// ---------- Types ----------

export interface LineAnalysis {
  originalLine: string
  lineNumber: number
  lineType: LineType
  originalScore: number          // 0-10
  strengths: string[]           // what works about this line
  weaknesses: string[]          // what could improve
  suggestedRewrite: string     // improved version
  improvedScore: number         // 0-10
  deltaScore: number           // improvement (improvedScore - originalScore)
  rationale: string            // brief explanation of the rewrite
  fabricationWarning?: boolean  // true if rewrite contains numbers not in original
}

export type LineType =
  | 'header'           // name, contact info
  | 'summary'          // professional summary / objective
  | 'experience_title'  // job title, company, dates
  | 'experience_bullet' // achievement bullet point
  | 'education'         // degree, institution
  | 'skills'            // skills section entry
  | 'project'           // project description
  | 'certification'     // certification or award
  | 'section_header'    // e.g., "Experience", "Education"
  | 'blank'             // empty line / separator
  | 'other'             // anything that doesn't fit above

export interface RewriteResult {
  lines: LineAnalysis[]
  overallOriginalScore: number   // average across lines, 0-10
  overallImprovedScore: number   // average after rewrites
  overallDelta: number
  topImprovements: LineAnalysis[]  // lines with highest delta
  keyPatterns: string[]          // recurring improvement themes
  summary: string                // overall rewrite narrative
}

// ---------- Main Rewrite Engine ----------

export async function rewriteResumeLines(
  resumeText: string,
  targetRole?: string,
  maxLinesToRewrite?: number
): Promise<RewriteResult> {
  const lines = splitIntoLines(resumeText)
  const maxLines = maxLinesToRewrite || lines.length

  // Filter out blank lines for efficiency but keep their position
  const analysisPromises: Promise<LineAnalysis>[] = []

  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    analysisPromises.push(analyzeLine(lines[i], i + 1, targetRole))
  }

  // Process in batches of 8 to respect rate limits
  const batchSize = 8
  const results: LineAnalysis[] = []

  for (let i = 0; i < analysisPromises.length; i += batchSize) {
    const batch = analysisPromises.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch)
    results.push(...batchResults)
  }

  // Calculate overall scores (excluding blank lines)
  const scorableLines = results.filter(r => r.lineType !== 'blank' && r.lineType !== 'section_header')
  const overallOriginal = scorableLines.length > 0
    ? scorableLines.reduce((sum, r) => sum + r.originalScore, 0) / scorableLines.length
    : 0
  const overallImproved = scorableLines.length > 0
    ? scorableLines.reduce((sum, r) => sum + r.improvedScore, 0) / scorableLines.length
    : 0

  // Top improvements (sorted by delta, descending)
  const topImprovements = [...results]
    .filter(r => r.deltaScore > 0)
    .sort((a, b) => b.deltaScore - a.deltaScore)
    .slice(0, 5)

  // Key patterns
  const keyPatterns = extractPatterns(results)

  // Summary
  const summary = generateSummary(results, overallOriginal, overallImproved)

  return {
    lines: results,
    overallOriginalScore: Math.round(overallOriginal * 10) / 10,
    overallImprovedScore: Math.round(overallImproved * 10) / 10,
    overallDelta: Math.round((overallImproved - overallOriginal) * 10) / 10,
    topImprovements,
    keyPatterns,
    summary,
  }
}

// ---------- Single Line Analysis ----------

async function analyzeLine(
  line: string,
  lineNumber: number,
  targetRole?: string
): Promise<LineAnalysis> {
  const trimmed = line.trim()

  // Handle blank lines
  if (!trimmed) {
    return {
      originalLine: line,
      lineNumber,
      lineType: 'blank',
      originalScore: 0,
      strengths: [],
      weaknesses: [],
      suggestedRewrite: '',
      improvedScore: 0,
      deltaScore: 0,
      rationale: 'Blank line — no action needed',
    }
  }

  const lineType = classifyLine(trimmed)
  const targetContext = targetRole ? ` The target role is: ${targetRole}.` : ''

  const prompt = `You are an expert resume writer. Analyze this single resume line (line #${lineNumber}, type: ${lineType}) and provide both a score and an improved rewrite.

Score the line 0-10 based on:
- Impact: Does it convey measurable achievement or just responsibility?
- Specificity: Is it concrete or vague?
- Action orientation: Does it start with a strong action verb?
- Relevance: Would a hiring manager find this compelling?
- Clarity: Is it concise and easy to scan?

Return ONLY valid JSON (no markdown, no code fences):
{
  "originalScore": <0-10>,
  "strengths": ["1-2 things this line does well"],
  "weaknesses": ["1-3 specific improvements"],
  "suggestedRewrite": "the improved line, same length or shorter",
  "improvedScore": <0-10, must be >= originalScore>,
  "rationale": "brief explanation of what changed and why"
}

Rules for rewrites:
- Keep it concise — never longer than the original
- Start with strong action verbs (Spearheaded, Architected, Reduced, etc.)
- Add quantifiable metrics where the original lacks them
- Remove filler words, passive voice, and corporate jargon
- Preserve factual accuracy — don't invent fake numbers${targetContext}

RESUME LINE:
${trimmed}`

  try {
    const response = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume writer who makes lines punchier, more specific, and more impactful. Always respond with valid JSON only, no markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const raw = response.choices[0]?.message?.content || ''
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const originalScore = Math.max(0, Math.min(10, Number(parsed.originalScore) || 5))
    const improvedScore = Math.max(originalScore, Math.min(10, Number(parsed.improvedScore) || originalScore))
    const suggestedRewrite = typeof parsed.suggestedRewrite === 'string' ? parsed.suggestedRewrite : trimmed

    // Fabrication detection: flag any numbers in the rewrite that weren't in the original
    const fabricationWarning = detectFabrication(trimmed, suggestedRewrite)

    return {
      originalLine: line,
      lineNumber,
      lineType,
      originalScore,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 3) : [],
      suggestedRewrite,
      improvedScore,
      deltaScore: Math.round((improvedScore - originalScore) * 10) / 10,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      fabricationWarning,
    }
  } catch (error: any) {
    console.error(`Line rewrite error (line ${lineNumber}):`, error?.message || error)

    // Fallback: heuristic-based analysis
    return heuristicLineAnalysis(line, lineNumber, lineType)
  }
}

// ---------- Line Classification ----------

function classifyLine(line: string): LineType {
  const lower = line.toLowerCase().trim()

  // Section headers (short, ends with colon or is all caps)
  if (line.length < 40 && (line.endsWith(':') || line === line.toUpperCase()) &&
      /^(experience|education|skills|summary|objective|projects|certifications|awards|publications|volunteer|interests|professional)/i.test(lower)) {
    return 'section_header'
  }

  // Email/phone/location patterns → header
  if (/^[\w\s]+\s*[|•·,]\s*(\+?\d|@|linkedin|github|http)/i.test(lower) ||
      /^[a-z]+(\s[a-z]+){0,3}\s*[|•·,]/.test(lower)) {
    if (/@/.test(lower) || /\d{3}/.test(lower) || /linkedin|github|http/i.test(lower)) {
      return 'header'
    }
  }

  // Bullet points → experience or project line
  if (/^[•\-\*\u2022\u25CF\u25CB]\s/.test(line) || /^\d+\.\s/.test(line)) {
    return 'experience_bullet'
  }

  // Education patterns
  if (/\b(university|college|institute|bachelor|master|phd|doctorate|degree|diploma|gpa)\b/i.test(lower)) {
    return 'education'
  }

  // Skills patterns
  if (/^(skills|technologies|tools|languages|frameworks|methodologies)[:\s]/i.test(lower) ||
      /^(proficient|skilled|expertise|knowledge|familiar)[:\s]/i.test(lower)) {
    return 'skills'
  }

  // Experience title (company + dates pattern)
  if (/\b(present|20\d{2})\s*[-–—]\s*(present|20\d{2})\b/.test(lower) ||
      /\b(at|@)\s+[A-Z]/.test(line) ||
      /^(senior|junior|staff|principal|lead|manager|director|vp|head|chief|engineer|developer|analyst|designer|architect|coordinator|specialist|consultant|associate)/i.test(lower)) {
    return 'experience_title'
  }

  // Project patterns
  if (/\b(project|portfolio|built|created|developed|launched)\b.*\b(app|tool|platform|system|website|api)\b/i.test(lower)) {
    return 'project'
  }

  // Certification patterns
  if (/\b(certified|certification|licensed|credential|award|fellow|chartered)\b/i.test(lower)) {
    return 'certification'
  }

  // Summary patterns
  if (/^(summary|objective|profile|about)[:\s]/i.test(lower) || lower.length > 100 && !line.match(/[•\-\*\d]/)) {
    return 'summary'
  }

  return 'other'
}

// ---------- Heuristic Fallback ----------

function heuristicLineAnalysis(line: string, lineNumber: number, lineType: LineType): LineAnalysis {
  const trimmed = line.trim()
  let originalScore = 5
  const strengths: string[] = []
  const weaknesses: string[] = []

  // Scoring heuristics
  const hasNumbers = /\d+%|\$\d+|\d+x|\d+M|\d+K|\d+\+/.test(trimmed)
  const hasActionVerb = /^(Spearheaded|Led|Designed|Built|Architected|Reduced|Increased|Launched|Managed|Developed|Created|Implemented|Achieved|Delivered|Optimized|Streamlined|Drove|Generated|Grew|Scaled|Directed|Coordinated|Established|Pioneered|Transformed|Accelerated|Automated|Consolidated|Eliminated|Migrated|Negotiated|Orchestrated|Resolved|Restructured)/i.test(trimmed)
  const isPassive = /was\s+(responsible|tasked|assigned|given|in\s+charge)/i.test(trimmed)
  const isTooLong = trimmed.length > 120
  const hasJargon = /(synergy|leverage|utilize|facilitate| Paradigm|going\s+forward|move\s+the\s+needle)/i.test(trimmed)

  if (hasNumbers) {
    originalScore += 1.5
    strengths.push('Contains quantifiable metrics')
  }
  if (hasActionVerb) {
    originalScore += 1
    strengths.push('Starts with a strong action verb')
  }
  if (isPassive) {
    originalScore -= 1.5
    weaknesses.push('Uses passive voice — rewrite with active verbs')
  }
  if (isTooLong) {
    originalScore -= 0.5
    weaknesses.push('Too verbose — aim for concise impact')
  }
  if (hasJargon) {
    originalScore -= 0.5
    weaknesses.push('Contains filler jargon')
  }
  if (!hasNumbers && lineType === 'experience_bullet') {
    originalScore -= 1
    weaknesses.push('Missing quantifiable results')
  }
  if (!hasActionVerb && lineType === 'experience_bullet') {
    weaknesses.push('Should start with a strong action verb')
  }
  if (strengths.length === 0) {
    strengths.push('Line has content')
  }

  originalScore = Math.max(1, Math.min(10, originalScore))

  // Simple rewrite suggestion
  let suggestedRewrite = trimmed
  if (isPassive) {
    suggestedRewrite = suggestedRewrite
      .replace(/was responsible for\s+/i, '')
      .replace(/was tasked with\s+/i, '')
      .replace(/was assigned to\s+/i, '')
  }
  if (isTooLong && suggestedRewrite.length > 100) {
    // Try to truncate at a natural break
    const breakPoint = suggestedRewrite.lastIndexOf(',', 100)
    if (breakPoint > 60) {
      suggestedRewrite = suggestedRewrite.slice(0, breakPoint)
    }
  }

  const improvedScore = Math.min(10, originalScore + (isPassive ? 2 : hasNumbers ? 0.5 : 1))

  // Fabrication detection for heuristic rewrites too
  const fabricationWarning = detectFabrication(trimmed, suggestedRewrite)

  return {
    originalLine: line,
    lineNumber,
    lineType,
    originalScore: Math.round(originalScore * 10) / 10,
    strengths,
    weaknesses,
    suggestedRewrite,
    improvedScore: Math.round(improvedScore * 10) / 10,
    deltaScore: Math.round((improvedScore - originalScore) * 10) / 10,
    rationale: isPassive ? 'Rewritten from passive to active voice' : hasJargon ? 'Removed jargon, increased specificity' : 'Improved clarity and impact',
    fabricationWarning,
  }
}

// ---------- Pattern Extraction ----------

function extractPatterns(results: LineAnalysis[]): string[] {
  const patterns: string[] = []

  const bullets = results.filter(r => r.lineType === 'experience_bullet')
  const passiveCount = bullets.filter(r =>
    r.weaknesses.some(w => w.toLowerCase().includes('passive'))
  ).length
  const noMetrics = bullets.filter(r =>
    r.weaknesses.some(w => w.toLowerCase().includes('metric') || w.toLowerCase().includes('quantif'))
  ).length
  const noActionVerbs = bullets.filter(r =>
    r.weaknesses.some(w => w.toLowerCase().includes('action verb'))
  ).length

  if (passiveCount > 1) {
    patterns.push(`${passiveCount} bullet points use passive voice — convert all to active voice`)
  }
  if (noMetrics > 2) {
    patterns.push(`${noMetrics} bullet points lack quantifiable results — add specific metrics`)
  }
  if (noActionVerbs > 2) {
    patterns.push(`${noActionVerbs} bullet points don't start with action verbs — lead with impact`)
  }

  const longLines = results.filter(r => r.originalLine.trim().length > 120 && r.lineType !== 'summary')
  if (longLines.length > 2) {
    patterns.push(`${longLines.length} lines are too long — aim for under 100 characters per bullet`)
  }

  const lowScoreLines = results.filter(r => r.originalScore < 4 && r.lineType !== 'blank')
  if (lowScoreLines.length > 3) {
    patterns.push(`${lowScoreLines.length} lines score below 4/10 — consider rewriting or removing`)
  }

  // Deduplicated weakness patterns
  const allWeaknesses = results.flatMap(r => r.weaknesses)
  const weaknessThemes = new Map<string, number>()
  for (const w of allWeaknesses) {
    const key = w.toLowerCase().split(' ').slice(0, 3).join(' ')
    weaknessThemes.set(key, (weaknessThemes.get(key) || 0) + 1)
  }

  for (const [theme, count] of weaknessThemes) {
    if (count >= 3 && !patterns.some(p => p.toLowerCase().includes(theme))) {
      patterns.push(`Recurring theme "${theme}" appears ${count} times`)
    }
  }

  return patterns.slice(0, 6)
}

// ---------- Summary Generation ----------

function generateSummary(results: LineAnalysis[], origScore: number, improvedScore: number): string {
  const scorable = results.filter(r => r.lineType !== 'blank' && r.lineType !== 'section_header')
  const totalLines = scorable.length
  const improvedCount = scorable.filter(r => r.deltaScore > 0).length
  const avgDelta = totalLines > 0
    ? scorable.reduce((sum, r) => sum + r.deltaScore, 0) / totalLines
    : 0

  const bulletLines = scorable.filter(r => r.lineType === 'experience_bullet')
  const bulletAvg = bulletLines.length > 0
    ? bulletLines.reduce((sum, r) => sum + r.originalScore, 0) / bulletLines.length
    : 0

  let summary = `Analyzed ${totalLines} resume lines. `

  if (improvedCount > 0) {
    summary += `${improvedCount} lines (${Math.round(improvedCount/totalLines*100)}%) can be improved with an average gain of ${avgDelta.toFixed(1)} points per line. `
  } else {
    summary += `Your resume lines are well-crafted with minimal room for improvement. `
  }

  summary += `Average line score: ${origScore.toFixed(1)}/10 → ${improvedScore.toFixed(1)}/10. `

  if (bulletAvg < 5) {
    summary += `Experience bullets are below average (${bulletAvg.toFixed(1)}/10) — this is the highest-impact section to improve.`
  } else if (bulletAvg < 7) {
    summary += `Experience bullets are decent (${bulletAvg.toFixed(1)}/10) but have room for more impact and specificity.`
  } else {
    summary += `Experience bullets are strong (${bulletAvg.toFixed(1)}/10) — focus energy on other sections.`
  }

  return summary
}

// ---------- Helper: Split lines ----------

function splitIntoLines(text: string): string[] {
  return text.split('\n')
}