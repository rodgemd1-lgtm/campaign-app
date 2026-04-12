// -------------------------------------------------------
// /api/checkout - Create Stripe Checkout session
// $19 for 30-day unlimited resume scoring
// -------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
  typescript: true,
})

const PRICE_ID = process.env.STRIPE_PRICE_ID // Created in Stripe dashboard
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const clientId = body.clientId || request.headers.get('x-forwarded-for') || 'anonymous'

    // Create or use existing product/price
    // In production, you'd create these in the Stripe dashboard and reference by ID
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: PRICE_ID
        ? [{ price: PRICE_ID, quantity: 1 }]
        : [
            {
              price_data: {
                currency: 'usd',
                unit_amount: 1900, // $19.00
                product_data: {
                  name: 'AI Resume Scorer - Unlimited Plan',
                  description: '30 days of unlimited resume scoring and AI-powered feedback',
                },
              },
              quantity: 1,
            },
          ],
      success_url: `${APP_URL}/results?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
      cancel_url: `${APP_URL}/?canceled=true`,
      metadata: {
        clientId,
        product: 'unlimited_30d',
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    )
  }
}