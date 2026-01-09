import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyWalletTopup } from '@/lib/telegram'
import crypto from 'crypto'

const G2PAY_SIGNING_KEY = process.env.G2PAY_SIGNING_KEY || 'fLWeMSP1UjG9'

// Verify G2PAY webhook signature
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature) return false

  // G2PAY typically uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac('sha256', G2PAY_SIGNING_KEY)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-g2pay-signature') ||
                      request.headers.get('x-webhook-signature') ||
                      request.headers.get('signature')

    // Log webhook data for debugging
    console.log('=== G2PAY WEBHOOK DEBUG ===')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('Raw body:', rawBody)
    console.log('Signature:', signature)
    console.log('===========================')

    // Parse the payload
    let payload: {
      referenceId?: string
      transactionId?: string
      paymentId?: string
      status?: string
      amount?: string | number
      currency?: string
      resultCode?: string
      message?: string
    }

    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error('Invalid JSON payload in G2PAY webhook')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log('Parsed payload:', payload)

    // Optional: Verify signature in production
    // In dev/testing, we may skip signature verification
    if (process.env.NODE_ENV === 'production' && G2PAY_SIGNING_KEY !== 'fLWeMSP1UjG9') {
      if (!verifySignature(rawBody, signature)) {
        console.error('Invalid G2PAY webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Extract reference ID - G2PAY may use different field names
    const referenceId = payload.referenceId || payload.transactionId

    if (!referenceId) {
      console.error('Missing referenceId in G2PAY webhook')
      return NextResponse.json({ error: 'Missing reference ID' }, { status: 400 })
    }

    // Find the transaction by reference ID
    const transaction = await prisma.walletTransaction.findFirst({
      where: { referenceId },
      include: { user: true },
    })

    if (!transaction) {
      console.error(`Transaction not found for referenceId: ${referenceId}`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // If already processed, acknowledge but don't process again
    if (transaction.status === 'COMPLETED') {
      console.log(`Transaction ${referenceId} already completed, acknowledging webhook`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    if (transaction.status !== 'PENDING') {
      console.log(`Transaction ${referenceId} status is ${transaction.status}, not processing`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    // Check payment status from webhook
    const status = payload.status?.toLowerCase()
    const isSuccess = status === 'success' || status === 'completed' || status === 'approved'
    const isFailed = status === 'declined' || status === 'failed' || status === 'cancelled' || status === 'error'

    if (isFailed) {
      console.log(`Payment failed for transaction ${referenceId}: ${status}`)

      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json({ success: true, message: 'Transaction marked as failed' })
    }

    if (isSuccess) {
      console.log(`Payment successful for transaction ${referenceId}: ${status}`)

      // Update user credits and transaction
      const newBalance = transaction.user.credits + transaction.amount

      await prisma.$transaction([
        prisma.user.update({
          where: { id: transaction.userId },
          data: { credits: newBalance },
        }),
        prisma.walletTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            balance: newBalance,
          },
        }),
      ])

      console.log(`Wallet top-up via webhook: User ${transaction.userId} added $${(transaction.amount / 100).toFixed(2)}, new balance: $${(newBalance / 100).toFixed(2)}`)

      // Send Telegram notification
      notifyWalletTopup({
        email: transaction.user.email,
        amount: transaction.amount,
        newBalance,
        method: 'G2Pay (webhook)',
        status: 'Completed',
      }).catch((err) => console.error('Failed to send Telegram topup notification:', err))

      return NextResponse.json({ success: true, message: 'Transaction completed' })
    }

    // Unknown or pending status - acknowledge but don't change state
    console.log(`Unknown payment status for transaction ${referenceId}: ${status}`)
    return NextResponse.json({ success: true, message: 'Acknowledged' })

  } catch (error) {
    console.error('G2PAY webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle GET requests (some providers send verification pings)
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'G2PAY webhook endpoint' })
}
