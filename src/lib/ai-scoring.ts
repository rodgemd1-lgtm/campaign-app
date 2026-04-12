// -------------------------------------------------------
// AI Resume Scoring Engine
// Uses OpenRouter free tier (z-ai/glm-4.5-air:free)
// Real PDF parsing via pdf-parse, DOCX via mammoth
// -------------------------------------------------------

import OpenAI from 'openai'

// OpenRouter client (OpenAI-compatible API)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Resume Scorer',
  },
})

const MODEL = 'z-ai/glm-4.5-air:free'

// ---------- Types ----------

export interface CategoryScore {
  name: string
  score: number
  maxScore: number
  details: string
}

export interface ResumeAnalysis {
  overallScore: number
  message: string
  categories: CategoryScore[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  keywords: string[]
  atsCompatibility: number
}

// ---------- Document Parsing ----------

export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    // Dynamic import to avoid bundling issues on edge
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text || ''
  }

  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }

  // Plain text fallback
  if (lower.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  throw new Error(`Unsupported file format: ${filename}. Please upload a PDF, DOCX, or TXT file.`)
}

// ---------- AI Scoring ----------

export async function scoreResumeWithAI(resumeText: string): Promise<ResumeAnalysis> {
  const trimmed = resumeText.slice(0, 12000) // token budget guard

  const prompt = `You are an expert ATS (Applicant Tracking System) optimizer and career coach with 20 years of experience reviewing resumes for Fortune 500 companies.

Analyze the following resume thoroughly. Return ONLY valid JSON (no markdown, no code fences) with this exact structure:

{
  "categories": [
    { "name": "ATS Compatibility", "score": <0-20>, "maxScore": 20, "details": "brief explanation" },
    { "name": "Content & Impact", "score": <0-20>, "maxScore": 20, "details": "brief explanation" },
    { "name": "Skills & Keywords", "score": <0-20>, "maxScore": 20, "details": "brief explanation" },
    { "name": "Structure & Formatting", "score": <0-20>, "maxScore": 20, "details": "brief explanation" },
    { "name": "Professional Summary", "score": <0-20>, "maxScore": 20, "details": "brief explanation" }
  ],
  "strengths": ["3-5 specific strengths"],
  "weaknesses": ["3-5 specific areas to improve"],
  "recommendations": ["5-7 actionable recommendations ordered by impact"],
  "keywords": ["5-10 industry keywords that should be added or are well-represented"],
  "atsCompatibility": <0-100>
}

Scoring guidelines:
- ATS Compatibility: Does the resume use standard sections, avoid tables/images, include relevant keywords?
- Content & Impact: Are achievements quantified with metrics? Action verbs? Results-oriented?
- Skills & Keywords: Are technical and soft skills clearly listed? Do they match industry standards?
- Structure & Formatting: Is the layout clean, consistent, easy to scan? Appropriate length?
- Professional Summary: Is there a compelling summary/objective? Does it target a specific role?

Be rigorous but constructive. Most resumes score 40-70. Only exceptional resumes score 80+.

RESUME TEXT:
${trimmed}`

  try {
    const response = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert ATS resume analyzer. Always respond with valid JSON only, no markdown formatting or code fences.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const raw = response.choices[0]?.message?.content || ''

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()

    const parsed = JSON.parse(cleaned)

    // Validate and normalize
    const categories: CategoryScore[] = (parsed.categories || []).map((c: any) => ({
      name: c.name || 'Unknown',
      score: Math.max(0, Math.min(c.maxScore || 20, Number(c.score) || 0)),
      maxScore: c.maxScore || 20,
      details: c.details || '',
    }))

    const overallScore = categories.reduce((sum, c) => sum + c.score, 0)
    const atsCompatibility = Math.max(0, Math.min(100, Number(parsed.atsCompatibility) || overallScore))

    return {
      overallScore,
      message: getScoreMessage(overallScore),
      categories,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 7) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 7) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 10) : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 12) : [],
      atsCompatibility,
    }
  } catch (error: any) {
    console.error('AI scoring error:', error?.message || error)

    // Fallback: return a basic analysis based on heuristics
    return heuristicScore(resumeText)
  }
}

// ---------- Heuristic Fallback ----------

function heuristicScore(text: string): ResumeAnalysis {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const wordCount = text.split(/\s+/).length
  const hasNumbers = /\d+%|\$\d+|\d+\+/.test(text)
  const hasEmail = /@/.test(text)
  const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text)
  const hasLinkedIn = /linkedin/i.test(text)
  const sectionKeywords = ['experience', 'education', 'skills', 'summary', 'objective', 'projects', 'certifications']
  const foundSections = sectionKeywords.filter(kw => text.toLowerCase().includes(kw))

  const atsScore = Math.min(20, foundSections.length * 3 + (hasEmail ? 2 : 0) + (hasPhone ? 2 : 0) + (hasLinkedIn ? 2 : 0))
  const contentScore = Math.min(20, (hasNumbers ? 8 : 2) + Math.min(8, Math.floor(wordCount / 50)) + (lines.length > 10 ? 4 : 0))
  const skillsScore = Math.min(20, text.includes('skills') ? 12 : 4)
  const structureScore = Math.min(20, Math.min(15, lines.length) + (foundSections.length >= 3 ? 5 : 0))
  const summaryScore = Math.min(20, (text.toLowerCase().includes('summary') || text.toLowerCase().includes('objective')) ? 14 : 4)

  const overall = atsScore + contentScore + skillsScore + structureScore + summaryScore

  return {
    overallScore: overall,
    message: getScoreMessage(overall),
    categories: [
      { name: 'ATS Compatibility', score: atsScore, maxScore: 20, details: hasEmail && hasPhone ? 'Contact info present' : 'Missing contact details' },
      { name: 'Content & Impact', score: contentScore, maxScore: 20, details: hasNumbers ? 'Some quantified achievements found' : 'Add quantifiable metrics' },
      { name: 'Skills & Keywords', score: skillsScore, maxScore: 20, details: 'Skills section presence detected' },
      { name: 'Structure & Formatting', score: structureScore, maxScore: 20, details: `${foundSections.length} standard sections found` },
      { name: 'Professional Summary', score: summaryScore, maxScore: 20, details: 'Summary section analysis' },
    ],
    strengths: ['Resume has structured content', 'Standard formatting detected', 'Contains contact information'].slice(0, hasEmail && hasPhone ? 3 : 2),
    weaknesses: ['AI analysis unavailable - using fallback', 'Please try again for detailed feedback', hasNumbers ? '' : 'Add quantifiable achievements with metrics'].filter(Boolean),
    recommendations: [
      'Retry for full AI-powered analysis',
      'Add quantifiable metrics to achievements (e.g., "Increased sales by 25%")',
      'Ensure standard ATS sections: Summary, Experience, Education, Skills',
      'Include industry-specific keywords throughout',
      'Keep formatting simple - avoid tables, columns, and images',
    ],
    keywords: ['leadership', 'project management', 'communication', 'analysis', 'strategy'],
    atsCompatibility: overall,
  }
}

function getScoreMessage(score: number): string {
  if (score >= 90) return 'Exceptional! Your resume is highly optimized for ATS systems and recruiters.'
  if (score >= 75) return 'Great! Your resume has strong fundamentals with room for minor improvements.'
  if (score >= 60) return 'Good start. Your resume needs targeted improvements to stand out.'
  if (score >= 40) return 'Fair. Your resume has structural issues that could hurt your chances.'
  return 'Needs work. Significant revisions needed to be competitive.'
}