// -------------------------------------------------------
// /api/deliverables/resume - Generate resume downloads
// Supports: docx, pdf formats
// Uses QRSQPI session data from request body
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { format = 'docx', resumeText, rewrittenResume, panelEvaluation, lineRewrite, baseScore } = body

    if (!resumeText && !rewrittenResume) {
      return NextResponse.json(
        { error: 'Resume content is required' },
        { status: 400 }
      )
    }

    const content = rewrittenResume || resumeText

    if (format === 'pdf') {
      // Generate a text-based PDF-like document (HTML wrapped for PDF)
      // Since we can't use python-docx in JS, we generate a rich HTML that browsers can print as PDF
      const html = generateResumeHTML(content, panelEvaluation, baseScore)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': 'attachment; filename="resume-optimized.html"',
        },
      })
    }

    // Default: DOCX-compatible format
    // Generate RTF (Rich Text Format) which Word can open natively
    const rtf = generateRTF(content, panelEvaluation, lineRewrite, baseScore)
    return new NextResponse(rtf, {
      status: 200,
      headers: {
        'Content-Type': 'application/rtf; charset=utf-8',
        'Content-Disposition': 'attachment; filename="resume-optimized.doc"',
      },
    })
  } catch (error: any) {
    console.error('Resume deliverable error:', error)
    return NextResponse.json(
      { error: 'Failed to generate resume document' },
      { status: 500 }
    )
  }
}

// Generate a print-ready HTML file with resume content
function generateResumeHTML(content: string, panel: any, score: any): string {
  const compositeScore = panel?.compositeScore
    ? Math.round(((panel.compositeScore - 6) / 24) * 100)
    : null
  const overallScore = score?.overallScore || null

  const lines = content.split('\n').filter((l: string) => l.trim())
  const formattedLines = lines.map((line: string) => {
    if (!line.trim()) return ''
    // Detect section headers (short, uppercase, or ending with colon)
    if (line.trim().length < 30 && (line.trim() === line.trim().toUpperCase() || line.trim().endsWith(':'))) {
      return `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-top:16px;margin-bottom:8px;font-family:'Georgia',serif;">${escapeHtml(line.trim())}</h2>`
    }
    // Detect bullet points
    if (/^[•\-\*\u2022]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())) {
      return `<li style="margin-left:18px;margin-bottom:4px;font-size:11px;line-height:1.5;">${escapeHtml(line.trim().replace(/^[•\-\*\u2022]\s/, '').replace(/^\d+\.\s/, ''))}</li>`
    }
    return `<p style="margin:0 0 4px;font-size:11px;line-height:1.5;">${escapeHtml(line)}</p>`
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Optimized Resume</title>
  <style>
    @media print {
      body { margin: 0.5in; }
      .no-print { display: none; }
    }
    body { font-family: 'Georgia', 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1a1a2e; }
  </style>
</head>
<body>
  <div class="no-print" style="background:#f0f0ff;border:1px solid #c0c0e0;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-family:sans-serif;font-size:12px;">
    <strong>QRSQPI Optimized Resume</strong>
    ${overallScore ? ` | Base Score: ${overallScore}/100` : ''}
    ${compositeScore !== null ? ` | Panel Score: ${compositeScore}/100` : ''}
    <br><span style="color:#666;">Print this page (Ctrl+P) to save as PDF.</span>
  </div>
  <div style="font-family:'Georgia',serif;">
    ${formattedLines}
  </div>
</body>
</html>`
}

// Generate RTF (Rich Text Format) - Word-compatible
function generateRTF(content: string, panel: any, lineRewrite: any, score: any): string {
  const lines = content.split('\n').filter(l => l.trim())
  const rtfLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Section headers
    if (trimmed.length < 30 && (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':'))) {
      rtfLines.push(`{\\b\\fs24 ${escapeRtf(trimmed)}}\\par`)
    } else if (/^[•\-\*\u2022]\s/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[•\-\*\u2022]\s/, '')
      rtfLines.push(`{\\fs20 \\bull } {\\fs20 ${escapeRtf(bulletContent)}}\\par`)
    } else {
      rtfLines.push(`{\\fs20 ${escapeRtf(trimmed)}}\\par`)
    }
  }

  // Build RTF document
  return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Georgia;}{\\f1 Calibri;}}
{\\colortbl;\\red26\\green26\\blue46;}
\\paperw12240\\paperh15840\\margins720\\margl720\\margr720
{\\header\\f1\\fs16\\cf1 QRSQPI Optimized Resume\\tab\\tab}
${rtfLines.join('\n')}
\\par
\\par
{\\f1\\fs16\\cf1 Generated by QRSQPI Resume Intelligence\\par}
}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRtf(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, '\\par ')
}