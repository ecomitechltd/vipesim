import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyWalletTopup } from '@/lib/telegram'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://esimfly.me'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('transactionId')
    const isDummy = searchParams.get('dummy') === 'true'

    // G2PAY appends these params to returnUrl after payment
    const paymentStatus = searchParams.get('status') // e.g., 'success', 'declined', 'pending'
    const paymentId = searchParams.get('paymentId') || searchParams.get('payment_id')
    const resultCode = searchParams.get('resultCode') || searchParams.get('result_code')

    // Log all callback params for debugging
    console.log('=== G2PAY CALLBACK DEBUG ===')
    console.log('All params:', Object.fromEntries(searchParams.entries()))
    console.log('transactionId:', transactionId)
    console.log('paymentStatus:', paymentStatus)
    console.log('paymentId:', paymentId)
    console.log('resultCode:', resultCode)
    console.log('isDummy:', isDummy)
    console.log('============================')

    if (!transactionId) {
      return NextResponse.redirect(`${BASE_URL}/dashboard?tab=wallet&error=missing_transaction`)
    }

    // Fetch the transaction
    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    })

    if (!transaction) {
      return NextResponse.redirect(`${BASE_URL}/dashboard?tab=wallet&error=transaction_not_found`)
    }

    // Check if already processed
    if (transaction.status === 'COMPLETED') {
      return NextResponse.redirect(`${BASE_URL}/dashboard?tab=wallet&success=true`)
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.redirect(`${BASE_URL}/dashboard?tab=wallet&error=invalid_status`)
    }

    // Check for declined/failed status from G2PAY
    // Common decline indicators: status=declined, status=failed, resultCode != 0
    const isDeclined =
      paymentStatus === 'declined' ||
      paymentStatus === 'failed' ||
      paymentStatus === 'cancelled' ||
      paymentStatus === 'error' ||
      (resultCode && resultCode !== '0' && resultCode !== 'success')

    if (isDeclined && !isDummy) {
      console.log(`Payment declined for transaction ${transactionId}: status=${paymentStatus}, resultCode=${resultCode}`)

      // Mark transaction as failed
      await prisma.walletTransaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED' },
      })

      return NextResponse.redirect(`${BASE_URL}/dashboard?tab=wallet&error=payment_declined`)
    }

    // For dummy mode OR successful payment (status=success or no explicit decline)
    // In production, we trust the callback for success, webhook provides confirmation
    if (isDummy) {
      console.log('[DEV] Processing dummy wallet top-up callback')
    }

    // Update user credits and transaction in a transaction
    const newBalance = transaction.user.credits + transaction.amount

    await prisma.$transaction([
      // Update user credits
      prisma.user.update({
        where: { id: transaction.userId },
        data: { credits: newBalance },
      }),
      // Update transaction status and balance
      prisma.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          balance: newBalance,
        },
      }),
    ])

    console.log(`Wallet top-up completed: User ${transaction.userId} added $${(transaction.amount / 100).toFixed(2)}, new balance: $${(newBalance / 100).toFixed(2)}`)

    // Send Telegram notification (don't block redirect)
    notifyWalletTopup({
      email: transaction.user.email,
      amount: transaction.amount,
      newBalance,
      method: 'G2Pay',
      status: 'Completed',
    }).catch((err) => console.error('Failed to send Telegram topup notification:', err))

    return NextResponse.redirect(`${BASE_URL}/dashboard?tab=wallet&success=topup&amount=${(transaction.amount / 100).toFixed(2)}`)

  } catch (error) {
    console.error('Wallet callback error:', error)
    return NextResponse.redirect(`${BASE_URL}/dashboard?tab=wallet&error=callback_failed`)
  }
}
