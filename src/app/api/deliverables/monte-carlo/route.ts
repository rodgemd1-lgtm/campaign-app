// -------------------------------------------------------
// /api/deliverables/monte-carlo-report - Generate MC report
// Returns HTML that can be printed to PDF
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { monteCarlo, panelEvaluation, baseScore } = body

    if (!monteCarlo && !panelEvaluation && !baseScore) {
      return NextResponse.json(
        { error: 'Session data is required to generate the report' },
        { status: 400 }
      )
    }

    const html = generateMonteCarloHTML(monteCarlo, panelEvaluation, baseScore)

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="monte-carlo-report.html"',
      },
    })
  } catch (error: any) {
    console.error('Monte Carlo report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Monte Carlo report' },
      { status: 500 }
    )
  }
}

function generateMonteCarloHTML(mc: any, panel: any, score: any): string {
  const compositeScore = panel?.compositeScore
    ? Math.round(((panel.compositeScore - 6) / 24) * 100)
    : null
  const overallScore = score?.overallScore || 0

  // Extract Monte Carlo data
  const iterations = mc?.iterations || 10000
  const likelihoods = mc?.outcomeLikelihoods || {}
  const interviewPct = likelihoods.interview ? (likelihoods.interview * 100).toFixed(1) : '—'
  const phonePct = likelihoods.phoneScreen ? (likelihoods.phoneScreen * 100).toFixed(1) : '—'
  const onsitePct = likelihoods.onsite ? (likelihoods.onsite * 100).toFixed(1) : '—'
  const offerPct = likelihoods.offer ? (likelihoods.offer * 100).toFixed(1) : '—'
  const responseRate = mc?.estimatedResponseRate ? mc.estimatedResponseRate.toFixed(1) : '—'
  const riskFactors = mc?.riskFactors || ['Insufficient session data for detailed analysis']
  const improvementLever = mc?.improvementLever || 'Strengthen quantified impact metrics'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>QRSQPI Monte Carlo Probability Report</title>
<style>
  @media print { body { margin: 0.5in; } .no-print { display: none; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e; background: #fff; }
  h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
  h2 { font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #6b46c5; margin: 32px 0 16px; border-bottom: 2px solid #6b46c5; padding-bottom: 8px; }
  h3 { font-size: 14px; font-weight: 600; margin: 16px 0 8px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .card { background: #f9f9ff; border: 1px solid #e8e0f0; border-radius: 8px; padding: 20px; }
  .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 4px; }
  .card-value { font-size: 32px; font-weight: 700; }
  .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
  .metric:last-child { border-bottom: none; }
  .metric-label { font-size: 13px; color: #555; }
  .metric-value { font-size: 13px; font-weight: 600; }
  .risk-item { font-size: 13px; color: #c53030; padding: 6px 0; padding-left: 16px; position: relative; }
  .risk-item::before { content: '⚠'; position: absolute; left: 0; font-size: 12px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #888; }
  .print-btn { position: fixed; bottom: 20px; right: 20px; background: #6b46c5; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="background:#f0edff;border:1px solid #c0b8e0;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:12px;">
    <strong>QRSQPI Monte Carlo Probability Report</strong> — Generated ${new Date().toISOString().split('T')[0]}
    <br><span style="color:#666;">Click the Print button below or use Ctrl+P to save as PDF.</span>
  </div>

  <h1>Monte Carlo Probability Report</h1>
  <p style="color:#666;font-size:14px;margin-bottom:24px;">Quantitative outcome analysis based on ${iterations.toLocaleString()} simulation runs</p>

  <h2>Outcome Probabilities</h2>
  <div class="grid">
    <div class="card">
      <div class="card-label">Phone Screen</div>
      <div class="card-value" style="color:#6b46c5">${phonePct}%</div>
    </div>
    <div class="card">
      <div class="card-label">Interview Invite</div>
      <div class="card-value" style="color:#4c9aff">${interviewPct}%</div>
    </div>
    <div class="card">
      <div class="card-label">Onsite Round</div>
      <div class="card-value" style="color:#38b2ac">${onsitePct}%</div>
    </div>
    <div class="card">
      <div class="card-label">Offer Received</div>
      <div class="card-value" style="color:#38a169">${offerPct}%</div>
    </div>
  </div>

  <h2>Key Metrics</h2>
  <div class="card">
    <div class="metric">
      <span class="metric-label">Estimated Response Rate</span>
      <span class="metric-value">${responseRate}%</span>
    </div>
    ${overallScore ? `<div class="metric">
      <span class="metric-label">Base AI Score</span>
      <span class="metric-value">${overallScore}/100</span>
    </div>` : ''}
    ${compositeScore !== null ? `<div class="metric">
      <span class="metric-label">Expert Panel Score</span>
      <span class="metric-value">${compositeScore}/100</span>
    </div>` : ''}
    <div class="metric">
      <span class="metric-label">Simulation Iterations</span>
      <span class="metric-value">${iterations.toLocaleString()}</span>
    </div>
  </div>

  <h2>Risk Factors</h2>
  <div class="card">
    ${riskFactors.map((r: string) => `<div class="risk-item">${r}</div>`).join('\n    ')}
  </div>

  <h2>Top Improvement Lever</h2>
  <div class="card" style="border-left:3px solid #6b46c5;">
    <p style="font-size:14px;font-weight:500;">${improvementLever}</p>
  </div>

  ${mc?.confidenceIntervals ? `
  <h2>Confidence Intervals</h2>
  <div class="card">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="border-bottom:2px solid #e8e0f0;">
          <th style="text-align:left;padding:8px;">Percentile</th>
          <th style="text-align:center;padding:8px;">P10</th>
          <th style="text-align:center;padding:8px;">P50 (Median)</th>
          <th style="text-align:center;padding:8px;">P90</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:8px;">Interview</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p10?.interview * 100 || 0).toFixed(1)}%</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p50?.interview * 100 || 0).toFixed(1)}%</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p90?.interview * 100 || 0).toFixed(1)}%</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:8px;">Onsite</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p10?.onsite * 100 || 0).toFixed(1)}%</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p50?.onsite * 100 || 0).toFixed(1)}%</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p90?.onsite * 100 || 0).toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="padding:8px;">Offer</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p10?.offer * 100 || 0).toFixed(1)}%</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p50?.offer * 100 || 0).toFixed(1)}%</td>
          <td style="text-align:center;padding:8px;">${(mc.confidenceIntervals.p90?.offer * 100 || 0).toFixed(1)}%</td>
        </tr>
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>QRSQPI v1.0 Probability Report — Generated ${new Date().toISOString()}</p>
    <p style="margin-top:4px;">All scores and probability estimates are based on AI analysis and internal modeling. They represent estimated likelihoods and should not be interpreted as guarantees of employment outcomes.</p>
  </div>

  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
</body>
</html>`
}