import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { stripe } from '@/lib/stripe'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { ok: false, error: 'STRIPE_SECRET_KEY is missing' },
      { status: 500 }
    )
  }

  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: 'Stripe client not initialized' },
      { status: 500 }
    )
  }

  try {
    const account = await stripe.accounts.retrieve()
    return NextResponse.json({
      ok: true,
      mode: process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test',
      accountId: account.id,
      country: account.country,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Stripe request failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

