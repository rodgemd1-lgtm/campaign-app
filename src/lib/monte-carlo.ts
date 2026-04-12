// -------------------------------------------------------
// QRSQPI Monte Carlo Probability Simulation
// Simulates 1000 iterations of application outcomes
// based on resume score, job fit, industry alignment,
// and seniority match.
// -------------------------------------------------------
// NOTE: All probability outputs are estimated likelihoods
// based on internal modeling. They should not be interpreted
// as guarantees of employment outcomes.

// ---------- Types ----------

export interface MonteCarloInput {
  resumeScore: number        // 0-100 base score from AI scorer
  jobFitScore: number        // 0-100 how well resume matches target role
  industryAlignment: number  // 0-100 industry keyword/experience match
  seniorityMatch: number     // 0-100 appropriate level for target role
  panelCompositeScore?: number // 6-30 from expert panel (optional override)
  targetCompanyTier?: 'tier1' | 'tier2' | 'tier3' | 'startup' | 'unknown'
  applicantPoolSize?: number // number of applicants for the role
}

export interface SimulationResult {
  iterations: number
  outcomeLikelihoods: {
    interview: number        // estimated likelihood of getting an interview
    phoneScreen: number      // estimated likelihood of passing phone screen
    onsite: number           // estimated likelihood of reaching onsite
    offer: number            // estimated likelihood of receiving an offer
  }
  confidenceIntervals: {
    p10: OutcomePercentile   // 10th percentile
    p50: OutcomePercentile   // median
    p90: OutcomePercentile   // 90th percentile
  }
  scenarios: ScenarioAnalysis[]
  riskFactors: string[]
  improvementLever: string   // highest-impact factor to improve
  estimatedResponseRate: number // % chance of getting any response
}

export interface OutcomePercentile {
  interview: number
  phoneScreen: number
  onsite: number
  offer: number
}

export interface ScenarioAnalysis {
  scenario: string
  estimatedLikelihood: number
  outcome: 'advance' | 'reject' | 'waitlist'
  description: string
}

// ---------- Simulation Engine ----------

export function runMonteCarloSimulation(input: MonteCarloInput): SimulationResult {
  const iterations = 1000
  const poolSize = input.applicantPoolSize || 250

  // Normalize all inputs to 0-1
  const r = input.resumeScore / 100
  const j = input.jobFitScore / 100
  const i = input.industryAlignment / 100
  const s = input.seniorityMatch / 100

  // If panel score exists, blend it in as a weighted signal
  const panelWeight = input.panelCompositeScore ? 0.3 : 0
  const panelFactor = input.panelCompositeScore ? (input.panelCompositeScore - 6) / 24 : 0.5 // normalized 0-1
  const baseStrength = r * 0.3 + j * 0.25 + i * 0.2 + s * 0.15 + panelFactor * panelWeight + 0.1 * Math.random() // remaining 10% luck

  // Company tier adjustment (tier1 = harder, startup = slightly easier)
  const tierMultipliers: Record<string, number> = {
    tier1: 0.65,
    tier2: 0.80,
    tier3: 0.90,
    startup: 1.05,
    unknown: 0.85,
  }
  const tierMultiplier = tierMultipliers[input.targetCompanyTier || 'unknown'] || 0.85

  // Competition factor: more applicants = lower odds
  const competitionFactor = 1 / (1 + Math.log10(poolSize) * 0.3)

  // Run simulation
  const results: number[][] = [[], [], [], []] // [interview, phoneScreen, onsite, offer]

  for (let iter = 0; iter < iterations; iter++) {
    // Each iteration adds controlled randomness to simulate real-world variance
    const noise = gaussianRandom() * 0.12
    const randomFactor = Math.random() * 0.08 // irreducible noise

    const adjustedStrength = Math.max(0, Math.min(1, baseStrength + noise + randomFactor))

    // Probability at each stage
    const interviewProb = calculateStageProbability(adjustedStrength, tierMultiplier, competitionFactor, 1.0)
    const phoneProb = interviewProb * calculateStageProbability(adjustedStrength, tierMultiplier, competitionFactor, 0.75)
    const onsiteProb = phoneProb * calculateStageProbability(adjustedStrength, tierMultiplier, competitionFactor, 0.55)
    const offerProb = onsiteProb * calculateStageProbability(adjustedStrength, tierMultiplier, competitionFactor, 0.40)

    results[0].push(interviewProb)
    results[1].push(phoneProb)
    results[2].push(onsiteProb)
    results[3].push(offerProb)
  }

  // Calculate mean probabilities
  const outcomeProbabilities = {
    interview: mean(results[0]),
    phoneScreen: mean(results[1]),
    onsite: mean(results[2]),
    offer: mean(results[3]),
  }

  // Confidence intervals
  const confidenceIntervals = {
    p10: {
      interview: percentile(results[0], 10),
      phoneScreen: percentile(results[1], 10),
      onsite: percentile(results[2], 10),
      offer: percentile(results[3], 10),
    },
    p50: {
      interview: percentile(results[0], 50),
      phoneScreen: percentile(results[1], 50),
      onsite: percentile(results[2], 50),
      offer: percentile(results[3], 50),
    },
    p90: {
      interview: percentile(results[0], 90),
      phoneScreen: percentile(results[1], 90),
      onsite: percentile(results[2], 90),
      offer: percentile(results[3], 90),
    },
  }

  // Scenarios
  const scenarios = generateScenarios(outcomeProbabilities, input)

  // Risk factors
  const riskFactors = generateRiskFactors(input)

  // Highest-impact lever
  const improvementLever = identifyTopLever(input)

  // Estimated response rate (any response, including rejection)
  const estimatedResponseRate = Math.min(0.95, outcomeProbabilities.interview * 1.3 + 0.15)

  return {
    iterations,
    outcomeLikelihoods: {
      interview: Math.round(outcomeProbabilities.interview * 1000) / 1000,
      phoneScreen: Math.round(outcomeProbabilities.phoneScreen * 1000) / 1000,
      onsite: Math.round(outcomeProbabilities.onsite * 1000) / 1000,
      offer: Math.round(outcomeProbabilities.offer * 1000) / 1000,
    },
    confidenceIntervals: {
      p10: roundPercentile(confidenceIntervals.p10),
      p50: roundPercentile(confidenceIntervals.p50),
      p90: roundPercentile(confidenceIntervals.p90),
    },
    scenarios,
    riskFactors,
    improvementLever,
    estimatedResponseRate: Math.round(estimatedResponseRate * 1000) / 1000,
  }
}

// ---------- Helper Functions ----------

function calculateStageProbability(
  strength: number,
  tierMultiplier: number,
  competitionFactor: number,
  stageDifficulty: number
): number {
  // Sigmoid-based probability calculation
  const x = (strength * tierMultiplier * competitionFactor - 0.3) / (stageDifficulty * 0.5)
  return 1 / (1 + Math.exp(-x * 3))
}

function gaussianRandom(): number {
  // Box-Muller transform for Gaussian noise
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function roundPercentile(p: OutcomePercentile): OutcomePercentile {
  return {
    interview: Math.round(p.interview * 1000) / 1000,
    phoneScreen: Math.round(p.phoneScreen * 1000) / 1000,
    onsite: Math.round(p.onsite * 1000) / 1000,
    offer: Math.round(p.offer * 1000) / 1000,
  }
}

function generateScenarios(
  probabilities: { interview: number; phoneScreen: number; onsite: number; offer: number },
  input: MonteCarloInput
): ScenarioAnalysis[] {
  const scenarios: ScenarioAnalysis[] = []

  // Best case scenario
  if (probabilities.offer > 0.15) {
    scenarios.push({
      scenario: 'Strong Match',
      estimatedLikelihood: Math.round(probabilities.offer * 100),
      outcome: 'advance',
      description: `With your current profile, you have a ${(probabilities.offer * 100).toFixed(1)}% estimated likelihood of receiving an offer. Focus on narrative clarity to push this higher.`,
    })
  }

  // Middle scenario
  scenarios.push({
    scenario: 'Average Competition',
    estimatedLikelihood: Math.round(probabilities.interview * 100),
    outcome: probabilities.interview > 0.3 ? 'advance' : 'reject',
    description: `Against an average applicant pool, you have a ${(probabilities.interview * 100).toFixed(1)}% estimated likelihood of getting an interview.`,
  })

  // Worst case (tier1 competition)
  scenarios.push({
    scenario: 'High Competition',
    estimatedLikelihood: Math.round(probabilities.interview * 65),
    outcome: probabilities.interview * 0.65 > 0.2 ? 'advance' : 'reject',
    description: `At top-tier companies with 500+ applicants, your interview estimated likelihood drops to ~${(probabilities.interview * 65).toFixed(1)}%. Strengthen your differentiators.`,
  })

  // Improvement scenario
  const bestImprovement = identifyTopLever(input)
  scenarios.push({
    scenario: 'With Targeted Improvement',
    estimatedLikelihood: Math.round(Math.min(95, probabilities.interview * 100 + 15)),
    outcome: 'advance',
    description: `Improving your ${bestImprovement} could increase your interview rate by 10-20 percentage points.`,
  })

  return scenarios
}

function generateRiskFactors(input: MonteCarloInput): string[] {
  const risks: string[] = []

  if (input.resumeScore < 50) {
    risks.push('Resume score below 50 — significant content and formatting improvements needed')
  }
  if (input.jobFitScore < 60) {
    risks.push('Job fit below 60% — resume may not match target role keywords and requirements')
  }
  if (input.industryAlignment < 50) {
    risks.push('Low industry alignment — missing domain-specific terminology and experience')
  }
  if (input.seniorityMatch < 50) {
    risks.push('Seniority mismatch — role may be above or below your demonstrated experience level')
  }
  if (input.targetCompanyTier === 'tier1') {
    risks.push('Tier-1 companies have 1-3% acceptance rates — differentiation is critical')
  }
  if ((input.applicantPoolSize || 250) > 300) {
    risks.push('Large applicant pool reduces individual chances — networking referrals become essential')
  }
  if (input.panelCompositeScore && input.panelCompositeScore < 18) {
    risks.push('Expert panel composite below 18 — panelists identified significant concerns')
  }

  if (risks.length === 0) {
    risks.push('No major risk factors identified — profile is solid but not exceptional')
  }

  return risks
}

function identifyTopLever(input: MonteCarloInput): string {
  const factors = [
    { name: 'resume quality and impact metrics', score: input.resumeScore, weight: 0.3 },
    { name: 'job fit and keyword alignment', score: input.jobFitScore, weight: 0.25 },
    { name: 'industry domain experience', score: input.industryAlignment, weight: 0.2 },
    { name: 'seniority positioning', score: input.seniorityMatch, weight: 0.15 },
  ]

  // Sort by (1 - score/100) * weight to find the highest-impact improvement
  factors.sort((a, b) => ((1 - b.score / 100) * b.weight) - ((1 - a.score / 100) * a.weight))

  return factors[0].name
}

// ---------- Quick Scoring Helper ----------

export function quickEstimateJobFit(resumeText: string, jobDescription: string): number {
  // Simple keyword overlap heuristic for job fit
  const resumeTokens = new Set(resumeText.toLowerCase().split(/\s+/).filter(t => t.length > 3))
  const jobTokens = jobDescription.toLowerCase().split(/\s+/).filter(t => t.length > 3)

  let matches = 0
  for (const token of jobTokens) {
    if (resumeTokens.has(token)) matches++
  }

  const overlap = matches / jobTokens.length
  return Math.round(Math.min(100, overlap * 150 + 20)) // baseline 20, max 100
}

export function quickEstimateSeniority(
  resumeText: string,
  targetYearsExperience: number
): number {
  // Count years mentioned, job titles, seniority signals
  const yearPatterns = resumeText.match(/\b(20\d{2}|19\d{2})\b/g) || []
  const seniorTitles = /(director|vp|vice president|head|chief|c-level|svp|evp|senior\s+director)/i.test(resumeText)
  const midTitles = /(manager|lead|senior|principal|staff)/i.test(resumeText)
  const juniorTitles = /(junior|intern|associate|entry|graduate)/i.test(resumeText)

  let estimatedYears = yearPatterns.length > 2 ? (yearPatterns.length * 1.5) : 2
  if (seniorTitles) estimatedYears = Math.max(estimatedYears, 10)
  if (midTitles) estimatedYears = Math.max(estimatedYears, 5)
  if (juniorTitles) estimatedYears = Math.min(estimatedYears, 3)

  const match = 100 - Math.abs(estimatedYears - targetYearsExperience) * 10
  return Math.round(Math.max(20, Math.min(100, match)))
}