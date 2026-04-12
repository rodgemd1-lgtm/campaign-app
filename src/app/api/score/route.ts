// -------------------------------------------------------
// /api/score - Resume scoring endpoint
// Accepts PDF/DOCX/TXT upload, parses, scores, returns results
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromBuffer, scoreResumeWithAI } from '@/lib/ai-scoring'
import { canUserScan, recordScan } from '@/lib/usage'

function getClientId(request: NextRequest): string {
  // In production: use authenticated user ID from session/JWT
  // For MVP: use IP-based fingerprint
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  return `user_${ip.replace(/[,.]/g, '_')}`
}

export async function POST(request: NextRequest) {
  try {
    // Usage check
    const clientId = getClientId(request)
    const { allowed, remaining, isPaid } = canUserScan(clientId)

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'free_limit_reached',
          message: 'You have used your free scan. Upgrade to unlimited for $19/30 days.',
          upgradeUrl: '/api/checkout',
        },
        { status: 403 }
      )
    }

    // Parse multipart form
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a resume file.' },
        { status: 400 }
      )
    }

    // Validate file type
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt']
    const fileName = file.name.toLowerCase()
    const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExt) {
      return NextResponse.json(
        { error: `Invalid file type: "${fileName.split('.').pop()}". Please upload a PDF, DOCX, or TXT file.` },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    if (file.size < 50) {
      return NextResponse.json(
        { error: 'File appears empty or too small to be a valid resume.' },
        { status: 400 }
      )
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text
    let text: string
    try {
      text = await extractTextFromBuffer(buffer, file.name)
    } catch (parseError: any) {
      console.error('Document parse error:', parseError)
      return NextResponse.json(
        { error: parseError.message || 'Failed to parse the document.' },
        { status: 422 }
      )
    }

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text. The file may be image-based or corrupted.' },
        { status: 422 }
      )
    }

    // Score with AI
    const analysis = await scoreResumeWithAI(text)

    // Record usage
    recordScan(clientId)

    const newRemaining = isPaid ? Infinity : Math.max(0, remaining - 1)

    return NextResponse.json({
      success: true,
      data: analysis,
      meta: {
        remaining: newRemaining,
        isPaid,
        fileName: file.name,
        charsAnalyzed: text.length,
      },
    })
  } catch (error: any) {
    console.error('Score endpoint error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}