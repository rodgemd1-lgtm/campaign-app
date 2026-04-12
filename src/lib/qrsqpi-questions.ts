// -------------------------------------------------------
// QRSQPI Intake Questions (Q1 Protocol)
// 7 proprietary questions calibrated to target role
// Feeds into scoring engine and Monte Carlo simulation
// -------------------------------------------------------

// ---------- Types ----------

export interface IntakeQuestion {
  id: string
  question: string
  subtext: string          // explanatory context for why this matters
  placeholder: string      // example answer
  category: QuestionCategory
  weight: number           // 0-1 relative importance
  required: boolean
}

export type QuestionCategory =
  | 'career_stage'
  | 'technical_depth'
  | 'impact_evidence'
  | 'role_alignment'
  | 'industry_context'
  | 'growth_trajectory'
  | 'differentiator'

export interface IntakeResponses {
  responses: Record<string, string>  // questionId -> answer
  targetRole: string
  targetIndustry: string
  yearsExperience: number
}

export interface IntakeAnalysis {
  readinessScore: number       // 0-100 how complete and strong the responses are
  roleCalibration: RoleCalibration
  derivedSignals: DerivedSignal[]
  questionWeights: Record<string, number>  // adjusted weights based on role
  recommendedFocus: string     // top area to improve
}

export interface RoleCalibration {
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'executive'
  technicalBias: number        // 0-1, how technical the role is
  leadershipExpectation: number // 0-1, how important leadership is
  industrySpecificity: number   // 0-1, how niche the industry knowledge needs to be
}

export interface DerivedSignal {
  questionId: string
  signal: string
  strength: 'weak' | 'moderate' | 'strong'
  detail: string
}

// ---------- Question Bank ----------

const BASE_QUESTIONS: IntakeQuestion[] = [
  {
    id: 'q1_career_stage',
    question: 'What is your current career stage and what role are you targeting next?',
    subtext: 'This calibrates the entire evaluation to your level. A VP\'s resume looks very different from an IC\'s — both can be excellent.',
    placeholder: 'e.g., "Senior engineer with 8 years experience, targeting Staff Engineer at a Series B startup"',
    category: 'career_stage',
    weight: 0.2,
    required: true,
  },
  {
    id: 'q2_impact',
    question: 'What is the single most impactful result you\'ve delivered in your career? Quantify it.',
    subtext: 'Quantified impact is the #1 differentiator in resume evaluation. The best resumes lead with numbers, not responsibilities.',
    placeholder: 'e.g., "Reduced API latency by 63% saving $2.3M/year in infrastructure costs, directly enabling 40% user growth"',
    category: 'impact_evidence',
    weight: 0.2,
    required: true,
  },
  {
    id: 'q3_technical_depth',
    question: 'What was the hardest technical or domain problem you solved, and what made it hard?',
    subtext: 'This reveals actual vs. claimed expertise. We look for specificity, not just naming technologies.',
    placeholder: 'e.g., "Designed a real-time fraud detection system processing 50K events/sec with 99.97% uptime and <100ms P99 latency"',
    category: 'technical_depth',
    weight: 0.15,
    required: true,
  },
  {
    id: 'q4_role_alignment',
    question: 'How does your experience map to the specific requirements of your target role?',
    subtext: 'Alignment means your resume directly answers what the hiring manager is looking for — not just what you\'ve done.',
    placeholder: 'e.g., "The role requires distributed systems and team leadership; I\'ve built 3 microservices platforms and led 2 cross-functional teams"',
    category: 'role_alignment',
    weight: 0.15,
    required: true,
  },
  {
    id: 'q5_industry',
    question: 'What unique domain or industry insight do you bring that 90% of applicants don\'t have?',
    subtext: 'Domain specificity is a force multiplier. General skills get you in the pile; specific insight gets you the interview.',
    placeholder: 'e.g., "I understand HIPAA compliance trade-offs from 5 years in healthcare SaaS; I know where startups overspend on compliance"',
    category: 'industry_context',
    weight: 0.1,
    required: false,
  },
  {
    id: 'q6_growth',
    question: 'Describe a time you significantly grew your capability. What changed and what did it enable?',
    subtext: 'Growth trajectory signals future potential. Interviewers invest in who you\'re becoming, not just who you are.',
    placeholder: 'e.g., "Went from no ML experience to deploying 3 production ML models in 18 months, cutting manual review time by 70%"',
    category: 'growth_trajectory',
    weight: 0.1,
    required: false,
  },
  {
    id: 'q7_differentiator',
    question: 'If you could only include one line on your resume, what would it be and why?',
    subtext: 'This forces prioritization. If you can\'t articulate your strongest signal, your resume will bury it too.',
    placeholder: 'e.g., "Built the payment system that processed $1.2B in GMV last year with 99.99% reliability"',
    category: 'differentiator',
    weight: 0.1,
    required: true,
  },
]

// ---------- Industry-Specific Variants ----------

const INDustry_VARIANTS: Record<string, Record<string, Partial<IntakeQuestion>>> = {
  technology: {
    q3_technical_depth: {
      question: 'What was the hardest system or product you built end-to-end, and what trade-offs did you make?',
      placeholder: 'e.g., "Built a real-time collaboration engine handling 10K concurrent users with CRDT-based conflict resolution"',
    },
    q5_industry: {
      question: 'What infrastructure or product scaling insight do you bring that most engineers miss?',
      placeholder: 'e.g., "I\'ve navigated the 10K→1M user scaling chasm twice; I know which premature optimizations actually matter"',
    },
  },
  healthcare: {
    q3_technical_depth: {
      question: 'What was the most complex clinical or regulatory challenge you navigated, and what was the outcome?',
      placeholder: 'e.g., "Led FDA 510(k) clearance for a Class II medical device while maintaining sprint velocity"',
    },
    q5_industry: {
      question: 'What healthcare-specific regulatory or clinical insight differentiates you from tech-only candidates?',
      placeholder: 'e.g., "I understand CPT code structures and billing workflow; I can spot where product and compliance collide"',
    },
  },
  finance: {
    q3_technical_depth: {
      question: 'What was the most complex financial model, risk system, or compliance challenge you handled?',
      placeholder: 'e.g., "Built a real-time risk engine processing 500K trades/sec with sub-millisecond anomaly detection"',
    },
    q5_industry: {
      question: 'What regulatory or market structure insight do you bring that general fintech candidates lack?',
      placeholder: 'e.g., "Deep understanding of SEC reporting requirements and how they intersect with product roadmap decisions"',
    },
  },
  marketing: {
    q3_technical_depth: {
      question: 'What was the most sophisticated campaign or growth experiment you ran, and what did you learn?',
      placeholder: 'e.g., "Designed a multi-channel attribution model that increased ROAS by 340% across $8M in ad spend"',
    },
    q5_industry: {
      question: 'What unique channel, audience, or analytics insight gives you an edge over generalist marketers?',
      placeholder: 'e.g., "I understand B2B SaaS content distribution algorithms; I know which formats drive MQLs vs. just traffic"',
    },
  },
  consulting: {
    q3_technical_depth: {
      question: 'What was the most complex client problem you solved, and how did you structure the engagement?',
      placeholder: 'e.g., "Restructured a $500M supply chain for a Fortune 500, reducing costs 18% in 6 months"',
    },
    q5_industry: {
      question: 'What stakeholder management or frameworks expertise differentiates you?',
      placeholder: 'e.g., "I can translate C-suite strategy into operational reality; I\'ve done 12 Board-level presentations"',
    },
  },
}

// ---------- Public Functions ----------

export function getIntakeQuestions(
  targetIndustry?: string,
  targetRole?: string
): IntakeQuestion[] {
  let questions = BASE_QUESTIONS.map(q => ({ ...q }))

  // Apply industry-specific variants
  if (targetIndustry) {
    const industryKey = findIndustryKey(targetIndustry)
    if (industryKey && INDustry_VARIANTS[industryKey]) {
      const variants = INDustry_VARIANTS[industryKey]
      questions = questions.map(q => {
        const variant = variants[q.id]
        if (variant) {
          return { ...q, ...variant }
        }
        return q
      })
    }
  }

  // Adjust weights based on role seniority
  if (targetRole) {
    questions = calibrateWeights(questions, targetRole)
  }

  return questions
}

export function analyzeIntakeResponses(responses: IntakeResponses): IntakeAnalysis {
  const questions = getIntakeQuestions(responses.targetIndustry, responses.targetRole)

  // Calculate readiness score based on completeness and quality
  let totalWeight = 0
  let earnedWeight = 0
  const derivedSignals: DerivedSignal[] = []

  for (const q of questions) {
    const answer = responses.responses[q.id] || ''
    totalWeight += q.weight

    if (!answer.trim()) continue

    const qualityScore = assessAnswerQuality(answer, q.category)
    earnedWeight += q.weight * qualityScore

    // Generate derived signals
    const signal = extractSignal(answer, q)
    if (signal) {
      derivedSignals.push(signal)
    }
  }

  const readinessScore = totalWeight > 0
    ? Math.round((earnedWeight / totalWeight) * 100)
    : 0

  // Derive role calibration
  const roleCalibration = deriveRoleCalibration(responses)

  // Identify recommended focus
  const recommendedFocus = identifyFocusArea(questions, responses, derivedSignals)

  // Calculate adjusted question weights
  const questionWeights: Record<string, number> = {}
  for (const q of questions) {
    questionWeights[q.id] = q.weight
  }

  return {
    readinessScore: Math.min(100, readinessScore),
    roleCalibration,
    derivedSignals,
    questionWeights,
    recommendedFocus,
  }
}

// ---------- Internal Helpers ----------

function findIndustryKey(input: string): string | null {
  const lower = input.toLowerCase()
  const mappings: Record<string, string[]> = {
    technology: ['tech', 'software', 'saas', 'it', 'engineering', 'ai', 'ml', 'data'],
    healthcare: ['health', 'medical', 'pharma', 'biotech', 'clinical', 'hospital'],
    finance: ['finance', 'fintech', 'banking', 'investment', 'trading', 'insurance'],
    marketing: ['marketing', 'advertising', 'growth', 'content', 'brand', 'pr'],
    consulting: ['consulting', 'strategy', 'advisory', 'mc Kinsey', 'bain', 'bcg'],
  }

  for (const [key, keywords] of Object.entries(mappings)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return key
    }
  }
  return null
}

function calibrateWeights(questions: IntakeQuestion[], targetRole: string): IntakeQuestion[] {
  const lower = targetRole.toLowerCase()

  // Adjust weights based on role characteristics
  const isExecutive = /vp|vice president|director|chief|head|c-level|ceo|cto|cro|cfo/i.test(lower)
  const isTechnical = /engineer|developer|architect|data|ml|ai|scientist|devops|platform/i.test(lower)
  const isManager = /manager|lead|principal|staff/i.test(lower)

  return questions.map(q => {
    let weight = q.weight

    if (isExecutive && q.category === 'impact_evidence') weight *= 1.4
    if (isExecutive && q.category === 'differentiator') weight *= 1.3
    if (isTechnical && q.category === 'technical_depth') weight *= 1.4
    if (isTechnical && q.category === 'industry_context') weight *= 1.2
    if (isManager && q.category === 'role_alignment') weight *= 1.3
    if (isManager && q.category === 'growth_trajectory') weight *= 1.2

    return { ...q, weight: Math.round(weight * 100) / 100 }
  })
}

function assessAnswerQuality(answer: string, category: QuestionCategory): number {
  const length = answer.trim().length
  const hasNumbers = /\d+%|\$\d+|\d+x|\d+M|\d+K/i.test(answer)
  const hasSpecifics = /built|designed|led|created|reduced|increased|launched|managed/i.test(answer)
  const hasMetrics = /result|outcome|impact|saved|generated|drove|delivered/i.test(answer)

  // Base quality on length
  let quality = Math.min(0.4, length / 200)
  if (length > 50) quality += 0.2
  if (length > 150) quality += 0.1

  // Bonuses for specific content
  if (hasNumbers) quality += 0.15
  if (hasSpecifics) quality += 0.1
  if (hasMetrics) quality += 0.05

  // Category-specific bonuses
  if (category === 'impact_evidence' && hasNumbers) quality += 0.1
  if (category === 'technical_depth' && hasSpecifics) quality += 0.1
  if (category === 'differentiator' && length < 200) quality += 0.05 // concise is better

  return Math.min(1.0, quality)
}

function extractSignal(answer: string, question: IntakeQuestion): DerivedSignal | null {
  if (!answer.trim()) return null

  const hasNumbers = /\d+/.test(answer)
  const hasAction = /(built|designed|led|created|reduced|increased|launched|managed|achieved|delivered|implemented)/i.test(answer)
  const isSpecific = answer.length > 80 && hasNumbers

  let strength: DerivedSignal['strength'] = 'moderate'
  if (hasNumbers && hasAction && answer.length > 150) strength = 'strong'
  else if (!hasNumbers && !hasAction) strength = 'weak'

  return {
    questionId: question.id,
    signal: `${question.category} signal detected`,
    strength,
    detail: answer.slice(0, 100) + (answer.length > 100 ? '...' : ''),
  }
}

function deriveRoleCalibration(responses: IntakeResponses): RoleCalibration {
  const role = responses.targetRole.toLowerCase()
  const years = responses.yearsExperience

  let seniorityLevel: RoleCalibration['seniorityLevel'] = 'mid'
  if (years >= 12 || /vp|director|chief|head|c-level/i.test(role)) seniorityLevel = 'executive'
  else if (years >= 7 || /senior|staff|principal|lead/i.test(role)) seniorityLevel = 'senior'
  else if (years <= 3 || /junior|intern|associate|entry/i.test(role)) seniorityLevel = 'junior'

  const technicalBias = /engineer|developer|architect|data|ml|ai|scientist|devops/i.test(role) ? 0.8
    : /manager|director|vp/i.test(role) ? 0.3
    : 0.5

  const leadershipExpectation = seniorityLevel === 'executive' ? 0.9
    : seniorityLevel === 'senior' ? 0.6
    : seniorityLevel === 'mid' ? 0.3
    : 0.1

  const industrySpecificity = /healthcare|pharma|finance|fintech|legal|energy/i.test(responses.targetIndustry)
    ? 0.8
    : 0.4

  return {
    seniorityLevel,
    technicalBias: Math.round(technicalBias * 100) / 100,
    leadershipExpectation: Math.round(leadershipExpectation * 100) / 100,
    industrySpecificity: Math.round(industrySpecificity * 100) / 100,
  }
}

function identifyFocusArea(
  questions: IntakeQuestion[],
  responses: IntakeResponses,
  signals: DerivedSignal[]
): string {
  // Find the category with weakest signals
  const categoryScores: Record<string, number> = {}

  for (const q of questions) {
    const answer = responses.responses[q.id] || ''
    const signal = signals.find(s => s.questionId === q.id)

    if (!categoryScores[q.category]) categoryScores[q.category] = 0

    if (!answer.trim()) {
      categoryScores[q.category] += 0 // unanswered = 0
    } else if (signal) {
      categoryScores[q.category] += signal.strength === 'strong' ? 3 : signal.strength === 'moderate' ? 2 : 1
    } else {
      categoryScores[q.category] += 1
    }
  }

  const categoryLabels: Record<string, string> = {
    career_stage: 'Career positioning clarity',
    impact_evidence: 'Quantified impact and results',
    technical_depth: 'Technical depth and specificity',
    role_alignment: 'Target role alignment',
    industry_context: 'Industry-specific differentiation',
    growth_trajectory: 'Growth trajectory evidence',
    differentiator: 'Unique value proposition',
  }

  // Find lowest-scoring category
  let minCategory = ''
  let minScore = Infinity
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score < minScore) {
      minScore = score
      minCategory = cat
    }
  }

  return categoryLabels[minCategory] || 'Overall resume strengthen your unique value proposition'
}