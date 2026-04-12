// -------------------------------------------------------
// QRSQPI Expert Panel Evaluation Engine
// Six domain-expert agents evaluate resumes from their
// unique perspective, scoring on 6 dimensions each.
// Composite 25-30 = Strong Hire threshold.
// -------------------------------------------------------

import OpenAI from 'openai'

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Resume Scorer – Expert Panel',
  },
})

const MODEL = 'z-ai/glm-4.5-air:free'

// ---------- Types ----------

export interface PanelistScore {
  name: string
  title: string
  perspectives: string[]
  dimensions: DimensionScore[]
  rawCommentary: string
}

export interface DimensionScore {
  dimension: string
  score: number // 1-5
  justification: string
}

export interface PanelVerdict {
  panelists: PanelistScore[]
  compositeScore: number       // 6-30 (sum of averages)
  verdict: 'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire'
  consensusThemes: string[]
  dissentPoints: string[]
  hireProbability: number      // 0-1 derived from composite
}

// ---------- Panelist Definitions ----------

interface PanelistDefinition {
  name: string
  title: string
  systemPrompt: string
  dimensions: string[]
}

const PANELISTS: PanelistDefinition[] = [
  {
    name: 'Tobias Lutke',
    title: 'Shopify CEO',
    systemPrompt: `You are Tobias Lutke, CEO of Shopify. You are a pragmatic builder who values hands-on technical depth shipped at scale. You appreciate people who build things, not just manage things. You are skeptical of buzzwords and corporate-speak. You value AI depth — people who actually use and understand modern AI tools, not just talk about them. You evaluate resumes for: (1) Is this person a builder? (2) Do they understand AI at a practical level? (3) Can they ship real products? Score each dimension 1-5. Be direct, blunt, and specific.`,
    dimensions: ['AI Depth', 'Builder Credibility', 'Shipping Velocity', 'Technical Pragmatism', 'Scale Experience', 'Adaptability'],
  },
  {
    name: 'Jensen Huang',
    title: 'NVIDIA CEO',
    systemPrompt: `You are Jensen Huang, CEO of NVIDIA. You think in terms of decades-long technology arcs and the intersection of hardware, software, and AI. You evaluate whether someone truly understands the technical depth of their domain and can articulate a vision for where their industry is heading. You value people who can see around corners. You evaluate resumes for: (1) Do they have real technical depth? (2) Can they articulate a compelling vision? (3) Do they understand the trajectory of their field? Score each dimension 1-5. Be visionary but rigorous.`,
    dimensions: ['Technical Depth', 'Vision Articulation', 'Innovation Signal', 'Computational Thinking', 'Industry Trajectory', 'Leadership Scale'],
  },
  {
    name: 'Glen Tullman',
    title: 'Transcarent CEO',
    systemPrompt: `You are Glen Tullman, CEO of Transcarent and a serial healthcare entrepreneur. You evaluate whether someone creates real impact in their domain, not just incremental improvements. You look for innovation that matters — things that genuinely change how an industry operates. You value domain expertise combined with fresh thinking. You evaluate resumes for: (1) Is there real domain impact? (2) Is this person innovating or just maintaining? (3) Can they navigate complex industry dynamics? Score each dimension 1-5. Be direct about whether impact is real or just claimed.`,
    dimensions: ['Domain Impact', 'Innovation Substance', 'Customer Centricity', 'Operational Excellence', 'Regulatory Navigation', 'Results Verification'],
  },
  {
    name: 'Marc Andreessen',
    title: 'a16z General Partner',
    systemPrompt: `You are Marc Andreessen, General Partner at Andreessen Horowitz. You think in terms of market dynamics, network effects, and whether someone can think at scale. You look for people who understand not just their role but the strategic landscape. You value clarity of thought, ambition that matches capability, and evidence of strategic thinking. You evaluate resumes for: (1) Does this person think in terms of markets and scale? (2) Is there evidence of strategic vision? (3) Can they build something that matters? Score each dimension 1-5. Be intellectually honest and unsparing.`,
    dimensions: ['Strategic Vision', 'Scale Thinking', 'Market Understanding', 'Founder Mentality', 'Network Effects Awareness', 'Execution Evidence'],
  },
  {
    name: 'Patty McCord',
    title: 'Netflix Former Chief Talent Officer',
    systemPrompt: `You are Patty McCord, former Chief Talent Officer at Netflix and author of "Powerful". You believe in radical honesty and building teams of stunning colleagues. You evaluate whether someone would thrive in a high-performance culture with freedom and responsibility. You care deeply about culture fit — not conformity, but whether this person elevates everyone around them. You evaluate resumes for: (1) Does this person take ownership? (2) Would they challenge the team constructively? (3) Do they communicate with clarity and courage? Score each dimension 1-5. Be candid and people-focused.`,
    dimensions: ['Culture Add', 'Executive Presence', 'Communication Clarity', 'Ownership Mentality', 'Radical Candor', 'Team Elevation'],
  },
  {
    name: 'Laszlo Bock',
    title: 'Google SVP People Ops',
    systemPrompt: `You are Laszlo Bock, former SVP of People Operations at Google and author of "Work Rules!". You are deeply data-driven and skeptical of unsubstantiated claims. You look for resumes that can be verified, where impact is quantified, and where the person's actual contribution is clear (not team-level credit). You value structured thinking and evidence over narrative. You evaluate resumes for: (1) Can claims be verified? (2) Is the person's individual contribution clear? (3) Is there evidence of data-driven decision making? Score each dimension 1-5. Be rigorous and empirically minded.`,
    dimensions: ['Claims Verifiability', 'Data Rigor', 'Individual Contribution Clarity', 'Structured Thinking', 'Impact Quantification', 'Evidence Quality'],
  },
]

// ---------- Evaluation ----------

export async function evaluateWithPanel(
  resumeText: string,
  targetRole?: string
): Promise<PanelVerdict> {
  const trimmed = resumeText.slice(0, 8000)

  // Evaluate all panelists in parallel
  const panelistPromises = PANELISTS.map(async (panelist) => {
    return evaluatePanelist(panelist, trimmed, targetRole)
  })

  const panelistResults = await Promise.all(panelistPromises)

  // Calculate composite score: average of all dimensions across all panelists
  const allDimensionScores = panelistResults.flatMap(p => p.dimensions.map(d => d.score))
  const compositeScore = allDimensionScores.reduce((a, b) => a + b, 0) / allDimensionScores.length * 5
  // Scale: average is 1-5 per dimension, 36 dimensions total → average of all, then *5 to get 5-25 range
  // Actually we want composite on 6-30 scale
  const totalScore = allDimensionScores.reduce((a, b) => a + b, 0)
  // totalScore is sum of 36 scores, each 1-5, so range is 36-180
  // Normalize to 6-30 scale: ((total - 36) / 144) * 24 + 6
  const normalizedComposite = ((totalScore - 36) / 144) * 24 + 6

  const verdict = getVerdict(normalizedComposite)
  const hireProbability = normalizedComposite / 30

  // Extract consensus and dissent
  const allJustifications = panelistResults.flatMap(p =>
    p.dimensions.map(d => `${p.name} (${d.dimension}): ${d.justification}`)
  )

  const consensusThemes = extractConsensus(panelistResults)
  const dissentPoints = extractDissent(panelistResults)

  return {
    panelists: panelistResults,
    compositeScore: Math.round(normalizedComposite * 10) / 10,
    verdict,
    consensusThemes,
    dissentPoints,
    hireProbability: Math.round(hireProbability * 100) / 100,
  }
}

async function evaluatePanelist(
  panelist: PanelistDefinition,
  resumeText: string,
  targetRole?: string
): Promise<PanelistScore> {
  const targetContext = targetRole ? `\nTarget Role: ${targetRole}` : ''

  const prompt = `Evaluate this resume from your perspective as ${panelist.name}, ${panelist.title}.

${targetContext}

Score each dimension 1-5 where:
1 = Significant concern, clearly lacking
2 = Below expectations, needs improvement
3 = Meets expectations, adequate
4 = Above expectations, notable strength
5 = Exceptional, outstanding signal

Return ONLY valid JSON (no markdown, no code fences):
{
  "dimensions": [
    ${panelist.dimensions.map(d => `{ "dimension": "${d}", "score": <1-5>, "justification": "brief specific justification" }`).join(',\n    ')}
  ],
  "commentary": "2-3 sentence overall impression from your specific perspective"
}

RESUME TEXT:
${resumeText}`

  // Retry logic: 3 attempts with exponential backoff
  const MAX_RETRIES = 3
  let lastError: any = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt - 1) * 1000
        console.warn(`Retry ${attempt}/${MAX_RETRIES} for ${panelist.name} after ${backoffMs}ms`)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }

      const response = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: panelist.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      })

      const raw = response.choices[0]?.message?.content || ''
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      const dimensions: DimensionScore[] = (parsed.dimensions || []).map((d: any, i: number) => ({
        dimension: d.dimension || panelist.dimensions[i] || 'Unknown',
        score: Math.max(1, Math.min(5, Number(d.score) || 3)),
        justification: d.justification || '',
      }))

      return {
        name: panelist.name,
        title: panelist.title,
        perspectives: panelist.dimensions,
        dimensions,
        rawCommentary: parsed.commentary || '',
      }
    } catch (error: any) {
      lastError = error
      console.error(`Panel evaluation error for ${panelist.name} (attempt ${attempt}/${MAX_RETRIES}):`, error?.message || error)
      // Continue to next retry attempt
    }
  }

  // All retries exhausted — return neutral fallback scores
  console.error(`All ${MAX_RETRIES} retries failed for ${panelist.name}. Using neutral fallback scores.`)
  return {
    name: panelist.name,
    title: panelist.title,
    perspectives: panelist.dimensions,
    dimensions: panelist.dimensions.map(d => ({
      dimension: d,
      score: 3,
      justification: 'Evaluation unavailable after multiple retries — using neutral fallback',
    })),
    rawCommentary: 'AI evaluation temporarily unavailable after retry attempts.',
  }
}

function getVerdict(composite: number): PanelVerdict['verdict'] {
  if (composite >= 25) return 'Strong Hire'
  if (composite >= 20) return 'Hire'
  if (composite >= 14) return 'No Hire'
  return 'Strong No Hire'
}

function extractConsensus(panelists: PanelistScore[]): string[] {
  // Find dimensions where 4+ panelists score 4 or above
  const dimensionCounts = new Map<string, { high: number; low: number; labels: string[] }>()

  for (const p of panelists) {
    for (const d of p.dimensions) {
      if (!dimensionCounts.has(d.dimension)) {
        dimensionCounts.set(d.dimension, { high: 0, low: 0, labels: [] })
      }
      const entry = dimensionCounts.get(d.dimension)!
      if (d.score >= 4) {
        entry.high++
        entry.labels.push(`${p.name}: ${d.justification}`)
      } else if (d.score <= 2) {
        entry.low++
        entry.labels.push(`${p.name}: ${d.justification}`)
      }
    }
  }

  const themes: string[] = []
  for (const [dim, counts] of dimensionCounts) {
    if (counts.high >= 4) {
      themes.push(`Strong ${dim}: ${counts.labels.slice(0, 2).join('; ')}`)
    }
    if (counts.low >= 4) {
      themes.push(`Weak ${dim}: ${counts.labels.slice(0, 2).join('; ')}`)
    }
  }

  // Add general verdicts from commentaries
  const strongPositive = panelists.filter(p =>
    p.dimensions.reduce((sum, d) => sum + d.score, 0) / p.dimensions.length >= 4
  )
  if (strongPositive.length >= 4) {
    themes.push(`Majority Strong Hire signal from ${strongPositive.map(p => p.name).join(', ')}`)
  }

  return themes.slice(0, 6)
}

function extractDissent(panelists: PanelistScore[]): string[] {
  // Find dimensions where panelists disagree most (high standard deviation)
  const dimensionScores: Map<string, number[]> = new Map()

  for (const p of panelists) {
    for (const d of p.dimensions) {
      if (!dimensionScores.has(d.dimension)) {
        dimensionScores.set(d.dimension, [])
      }
      dimensionScores.get(d.dimension)!.push(d.score)
    }
  }

  const dissent: { dimension: string; spread: number; scores: number[] }[] = []
  for (const [dim, scores] of dimensionScores) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length
    dissent.push({ dimension: dim, spread: Math.sqrt(variance), scores })
  }

  dissent.sort((a, b) => b.spread - a.spread)

  return dissent
    .filter(d => d.spread >= 1.0)
    .slice(0, 4)
    .map(d => `${d.dimension}: scores ranged ${Math.min(...d.scores)}-${Math.max(...d.scores)} (disagreement)`)
}