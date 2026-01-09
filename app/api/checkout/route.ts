import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPackages, priceToUSD, bytesToGB, getCountryName } from '@/lib/esim-api'

const G2PAY_API_URL = process.env.G2PAY_API_URL || 'https://engine.g2pay.io/api/v1'
const G2PAY_API_KEY = process.env.G2PAY_API_KEY || ''
const BASE_URL = process.env.NEXTAUTH_URL || 'https://esimfly.co'
const IS_DEV = process.env.NODE_ENV === 'development'

// Check if we should use dummy payment mode
const useDummyPayment = () => IS_DEV || !G2PAY_API_KEY

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { packageCode, slug, promoCode } = body

    if (!packageCode && !slug) {
      return NextResponse.json({ error: 'Package code or slug required' }, { status: 400 })
    }

    // Fetch package details to get price
    const { packageList } = await getPackages({
      packageCode: packageCode || '',
      slug: slug || '',
    })

    const pkg = packageList.find(p => p.packageCode === packageCode || p.slug === slug)
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const priceUSD = priceToUSD(pkg.price)
    let discount = 0

    // Check promo code
    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
      })

      if (promo && promo.active) {
        const now = new Date()
        if ((!promo.validUntil || promo.validUntil > now) &&
            (!promo.maxUses || promo.usedCount < promo.maxUses)) {
          discount = promo.discount
        }
      }
    }

    const discountAmount = (priceUSD * discount) / 100
    const totalPrice = priceUSD - discountAmount
    const totalPriceCents = Math.round(totalPrice * 100)

    // Get country info from location
    const locationCode = pkg.location.split(',')[0].trim()
    const countryName = getCountryName(locationCode)
    const dataGB = bytesToGB(pkg.volume)

    // Generate unique reference ID for G2Pay
    const referenceId = `ESIMFLY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create pending order in database
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        status: 'PENDING',
        total: totalPriceCents,
        currency: 'USD',
        promoCode: promoCode || null,
        discount: Math.round(discountAmount * 100),
        country: locationCode,
        countryName,
        planName: `${dataGB >= 1 ? `${dataGB}GB` : `${Math.round(dataGB * 1024)}MB`} / ${pkg.duration} days`,
        dataAmount: dataGB >= 1 ? `${dataGB}GB` : `${Math.round(dataGB * 1024)}MB`,
        validity: pkg.duration,
        stripePaymentId: referenceId, // Using this field for G2Pay reference
      },
    })

    // Increment promo code usage if applied
    if (promoCode && discount > 0) {
      await prisma.promoCode.updateMany({
        where: { code: promoCode.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      })
    }

    // DUMMY PAYMENT MODE: Skip G2Pay and redirect directly to callback
    if (useDummyPayment()) {
      console.log('[DEV] Using dummy payment mode - skipping G2Pay')
      const dummyRedirectUrl = `${BASE_URL}/api/checkout/callback?orderId=${order.id}&packageCode=${packageCode || slug}&dummy=true`

      return NextResponse.json({
        success: true,
        orderId: order.id,
        redirectUrl: dummyRedirectUrl,
        isDummy: true,
      })
    }

    // PRODUCTION: Create G2Pay checkout request
    const checkoutRequestData = {
      referenceId,
      paymentType: 'DEPOSIT',
      currency: 'USD',
      amount: totalPrice.toFixed(2),
      returnUrl: `${BASE_URL}/account/orders`,
      successReturnUrl: `${BASE_URL}/api/checkout/callback?orderId=${order.id}&packageCode=${packageCode || slug}`,
      declineReturnUrl: `${BASE_URL}/checkout?error=payment_declined`,
      webhookUrl: `${BASE_URL}/api/checkout/webhook`,
    }

    const response = await fetch(`${G2PAY_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${G2PAY_API_KEY}`,
      },
      body: JSON.stringify(checkoutRequestData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('G2Pay API error:', errorText)

      // Mark order as failed
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        { error: 'Payment gateway error' },
        { status: 500 }
      )
    }

    const checkoutData = await response.json()

    if (!checkoutData.result?.redirectUrl) {
      console.error('G2Pay response missing redirect URL:', checkoutData)

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        { error: 'Invalid payment gateway response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      redirectUrl: checkoutData.result.redirectUrl,
    })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
