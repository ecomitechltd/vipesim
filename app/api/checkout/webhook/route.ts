import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// G2Pay webhook handler for async payment notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log webhook payload for debugging
    console.log('G2Pay webhook received:', JSON.stringify(body, null, 2))

    const { referenceId, status, transactionId } = body

    if (!referenceId) {
      return NextResponse.json({ error: 'Missing reference ID' }, { status: 400 })
    }

    // Find order by G2Pay reference (stored in stripePaymentId field)
    const order = await prisma.order.findFirst({
      where: { stripePaymentId: referenceId },
    })

    if (!order) {
      console.error('Order not found for reference:', referenceId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Handle different payment statuses
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'APPROVED':
        if (order.status === 'PENDING') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID' },
          })
        }
        break

      case 'DECLINED':
      case 'FAILED':
      case 'REJECTED':
        if (order.status === 'PENDING') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'FAILED' },
          })
        }
        break

      case 'REFUNDED':
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED' },
        })
        break

      default:
        console.log('Unhandled G2Pay status:', status)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
