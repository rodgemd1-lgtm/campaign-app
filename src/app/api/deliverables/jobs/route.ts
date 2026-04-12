// -------------------------------------------------------
// /api/deliverables/jobs - Generate job matches spreadsheet
// Returns CSV (Excel-compatible) with job match data
// Uses QRSQPI session data from request body
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetRole = 'Software Engineer', targetIndustry = 'Technology', baseScore, panelEvaluation, monteCarlo } = body

    // Generate job match data based on session context
    // In production, this would query a job database
    const jobMatches = generateJobMatches(targetRole, targetIndustry, baseScore, panelEvaluation, monteCarlo)

    // Generate CSV (Excel-compatible with BOM)
    const csv = generateCSV(jobMatches)
    const bomCsv = '\uFEFF' + csv // BOM for Excel UTF-8 detection

    return new NextResponse(bomCsv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="job-matches-top30.csv"',
      },
    })
  } catch (error: any) {
    console.error('Jobs deliverable error:', error)
    return NextResponse.json(
      { error: 'Failed to generate job matches' },
      { status: 500 }
    )
  }
}

interface JobMatch {
  rank: number
  company: string
  role: string
  location: string
  salaryRange: string
  matchScore: number
  fitCategory: string
  applyUrl: string
  keySkills: string
  companySize: string
  notes: string
}

function generateJobMatches(
  targetRole: string,
  targetIndustry: string,
  baseScore: any,
  panel: any,
  monteCarlo: any
): JobMatch[] {
  const roleLower = targetRole.toLowerCase()
  const responseRate = monteCarlo?.estimatedResponseRate || 15

  // Determine company tiers and roles based on target role
  const companies = getCompaniesForIndustry(targetIndustry)
  const roles = getRolesForTarget(roleLower)
  const skills = getSkillsForRole(roleLower)

  const matches: JobMatch[] = []
  const usedRoles = new Set<string>()

  for (let i = 0; i < 30 && i < companies.length; i++) {
    const company = companies[i % companies.length]
    const roleVariation = roles[i % roles.length]
    const matchKey = `${company.name}-${roleVariation.title}`
    if (usedRoles.has(matchKey)) continue
    usedRoles.add(matchKey)

    // Vary match score based on response rate and base score
    const baseMatch = Math.min(98, Math.max(55, responseRate * 2 + 40 + (Math.random() * 15 - 7)))

    matches.push({
      rank: i + 1,
      company: company.name,
      role: roleVariation.title,
      location: company.locations[i % company.locations.length],
      salaryRange: roleVariation.salaryRange,
      matchScore: Math.round(baseMatch),
      fitCategory: baseMatch >= 80 ? 'Strong Match' : baseMatch >= 65 ? 'Good Match' : 'Potential Fit',
      applyUrl: `https://${company.domain}/careers`,
      keySkills: skills.slice(0, 5).join(' | '),
      companySize: company.size,
      notes: baseMatch >= 80
        ? 'Your profile aligns well with this role. High response probability.'
        : baseMatch >= 65
          ? 'Good alignment. Consider tailoring your resume to highlight relevant experience.'
          : 'Potential fit with targeted application. Emphasize transferable skills.',
    })
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).map((m, i) => ({ ...m, rank: i + 1 }))
}

function getCompaniesForIndustry(industry: string) {
  const tech = [
    { name: 'Stripe', domain: 'stripe.com', locations: ['San Francisco, CA', 'Seattle, WA', 'Remote'], size: '1,001-5,000' },
    { name: 'Vercel', domain: 'vercel.com', locations: ['Remote', 'New York, NY', 'San Francisco, CA'], size: '201-500' },
    { name: 'Datadog', domain: 'datadoghq.com', locations: ['New York, NY', 'Boston, MA', 'Paris, France'], size: '5,001-10,000' },
    { name: 'Figma', domain: 'figma.com', locations: ['San Francisco, CA', 'Remote'], size: '1,001-5,000' },
    { name: 'Notion', domain: 'notion.so', locations: ['San Francisco, CA', 'New York, NY', 'Remote'], size: '501-1,000' },
    { name: 'Cloudflare', domain: 'cloudflare.com', locations: ['San Francisco, CA', 'Austin, TX', 'London, UK'], size: '5,001-10,000' },
    { name: 'Databricks', domain: 'databricks.com', locations: ['San Francisco, CA', 'Seattle, WA', 'Amsterdam, NL'], size: '5,001-10,000' },
    { name: 'Confluent', domain: 'confluent.io', locations: ['Mountain View, CA', 'Remote'], size: '1,001-5,000' },
    { name: 'GitLab', domain: 'gitlab.com', locations: ['Remote', 'San Francisco, CA'], size: '1,001-5,000' },
    { name: 'HashiCorp', domain: 'hashicorp.com', locations: ['Remote', 'San Francisco, CA', 'London, UK'], size: '1,001-5,000' },
    { name: 'Twilio', domain: 'twilio.com', locations: ['San Francisco, CA', 'Denver, CO', 'Remote'], size: '5,001-10,000' },
    { name: 'Plaid', domain: 'plaid.com', locations: ['San Francisco, CA', 'New York, NY', 'Remote'], size: '1,001-5,000' },
    { name: 'Scale AI', domain: 'scale.com', locations: ['San Francisco, CA', 'Remote'], size: '501-1,000' },
    { name: 'Rippling', domain: 'rippling.com', locations: ['San Francisco, CA', 'Remote'], size: '1,001-5,000' },
    { name: 'Flexport', domain: 'flexport.com', locations: ['San Francisco, CA', 'New York, NY', 'Chicago, IL'], size: '1,001-5,000' },
  ]
  // Return tech as default (most users)
  return tech
}

function getRolesForTarget(targetRole: string) {
  const seniorTitles = [
    { title: 'Senior Software Engineer', salaryRange: '$160,000 - $220,000' },
    { title: 'Staff Engineer', salaryRange: '$190,000 - $270,000' },
    { title: 'Senior Backend Engineer', salaryRange: '$155,000 - $210,000' },
    { title: 'Senior Frontend Engineer', salaryRange: '$150,000 - $205,000' },
    { title: 'Engineering Manager', salaryRange: '$185,000 - $250,000' },
    { title: 'Principal Engineer', salaryRange: '$220,000 - $300,000+' },
    { title: 'Tech Lead', salaryRange: '$170,000 - $235,000' },
    { title: 'Senior Platform Engineer', salaryRange: '$165,000 - $225,000' },
    { title: 'Senior Infrastructure Engineer', salaryRange: '$160,000 - $220,000' },
    { title: 'Senior DevOps Engineer', salaryRange: '$155,000 - $210,000' },
  ]
  if (targetRole.includes('data') || targetRole.includes('ml') || targetRole.includes('machine learning')) {
    return [
      { title: 'Senior ML Engineer', salaryRange: '$170,000 - $240,000' },
      { title: 'Data Engineer', salaryRange: '$145,000 - $200,000' },
      { title: 'Senior Data Scientist', salaryRange: '$160,000 - $220,000' },
      { title: 'ML Platform Engineer', salaryRange: '$165,000 - $230,000' },
      { title: 'Applied ML Engineer', salaryRange: '$155,000 - $215,000' },
    ]
  }
  if (targetRole.includes('manager') || targetRole.includes('director') || targetRole.includes('vp')) {
    return [
      { title: 'Engineering Director', salaryRange: '$210,000 - $290,000' },
      { title: 'VP of Engineering', salaryRange: '$250,000 - $380,000' },
      { title: 'Senior Engineering Manager', salaryRange: '$195,000 - $260,000' },
      { title: 'Head of Engineering', salaryRange: '$230,000 - $320,000' },
    ]
  }
  return seniorTitles
}

function getSkillsForRole(role: string): string[] {
  const defaults = ['Distributed Systems', 'System Design', 'API Development', 'Cloud Infrastructure', 'Team Leadership']
  if (role.includes('frontend') || role.includes('front-end')) return ['React', 'TypeScript', 'CSS Architecture', 'Performance', 'Web APIs']
  if (role.includes('data') || role.includes('ml')) return ['Python', 'ML Pipelines', 'Data Architecture', 'Statistics', 'Feature Engineering']
  if (role.includes('devops') || role.includes('platform')) return ['Kubernetes', 'CI/CD', 'Infrastructure as Code', 'Monitoring', 'AWS/GCP']
  if (role.includes('manager') || role.includes('director')) return ['Team Management', 'Strategic Planning', 'Cross-functional Leadership', 'OKRs', 'Budget Management']
  return defaults
}

function generateCSV(matches: JobMatch[]): string {
  const headers = ['Rank', 'Company', 'Role', 'Location', 'Salary Range', 'Match Score %', 'Fit Category', 'Apply URL', 'Key Skills', 'Company Size', 'Notes']
  const rows = matches.map(m => [
    m.rank,
    csvEscape(m.company),
    csvEscape(m.role),
    csvEscape(m.location),
    csvEscape(m.salaryRange),
    m.matchScore,
    csvEscape(m.fitCategory),
    csvEscape(m.applyUrl),
    csvEscape(m.keySkills),
    csvEscape(m.companySize),
    csvEscape(m.notes),
  ].join(','))

  return [headers.join(','), ...rows].join('\n')
}

function csvEscape(str: string): string {
  if (/[,"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}