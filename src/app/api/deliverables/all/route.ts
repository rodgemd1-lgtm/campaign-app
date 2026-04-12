// -------------------------------------------------------
// /api/deliverables/all - Generate ZIP of all deliverables
// Since we can't use native ZIP in Edge runtime, we
// return a manifest JSON with URLs for each asset.
// The client downloads each file individually.
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetRole, targetIndustry, yearsExperience } = body

    // Return a manifest of downloadable assets with presigned URLs
    // The client fetches each one individually
    const manifest = {
      generatedAt: new Date().toISOString(),
      assets: [
        {
          id: 'resume-docx',
          url: '/api/deliverables/resume',
          method: 'POST',
          format: 'docx',
          label: 'Optimized Resume (DOCX)',
          body: { format: 'docx' },
        },
        {
          id: 'resume-pdf',
          url: '/api/deliverables/resume',
          method: 'POST',
          format: 'html',
          label: 'Optimized Resume (Print-ready HTML/PDF)',
          body: { format: 'pdf' },
        },
        {
          id: 'job-matches',
          url: '/api/deliverables/jobs',
          method: 'POST',
          format: 'csv',
          label: 'Top 30 Job Matches (CSV)',
          body: { format: 'csv' },
        },
      ],
      instructions: 'Download each asset individually using the provided URLs. This ensures each file is generated fresh from your session data.',
    }

    return NextResponse.json(manifest)
  } catch (error: any) {
    console.error('All deliverables error:', error)
    return NextResponse.json(
      { error: 'Failed to generate deliverables manifest' },
      { status: 500 }
    )
  }
}