// -------------------------------------------------------
// /api/stripe-webhook - Handle Stripe events
// checkout.session.completed -> unlock unlimited scans
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { unlockPaid } from '@/lib/usage'

// In production, you'd verify the Stripe signature.
// For MVP with test keys, we process directly.
// When deploying, set STRIPE_WEBHOOK_SECRET and uncomment verification.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case 'checkout.session.completed': {
        const session = data?.object
        const clientId = session?.metadata?.clientId || session?.client_reference_id || 'unknown'

        if (clientId && clientId !== 'unknown') {
          unlockPaid(clientId)
          console.log(`[webhook] Unlocked unlimited for ${clientId} — ${new Date().toISOString()}`)

          // In production: also persist to database
          // await db.user.upsert({
          //   where: { clientId },
          //   update: { paidUntil: new Date(Date.now() + 30*24*60*60*1000), plan: 'unlimited' },
          //   create: { clientId, paidUntil: new Date(Date.now() + 30*24*60*60*1000), plan: 'unlimited' }
          // })
        }
        break
      }

      case 'checkout.session.expired': {
        console.log('[webhook] Session expired:', data?.object?.id)
        break
      }

      default:
        console.log(`[webhook] Unhandled event: ${type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}