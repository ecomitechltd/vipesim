import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyWalletTopup } from '@/lib/telegram'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const transactionId = session.metadata?.transactionId

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })
    }

    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // If already processed, acknowledge but don't process again
    if (transaction.status === 'COMPLETED') {
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    const newBalance = transaction.user.credits + transaction.amount

    await prisma.$transaction([
      prisma.user.update({
        where: { id: transaction.userId },
        data: { credits: newBalance },
      }),
      prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED', balance: newBalance },
      }),
    ])

    notifyWalletTopup({
      email: transaction.user.email,
      amount: transaction.amount,
      newBalance,
      method: 'Stripe',
      status: 'Completed',
    }).catch((err) => console.error('Failed to send Telegram topup notification:', err))

    return NextResponse.json({ success: true, message: 'Transaction completed' })

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
