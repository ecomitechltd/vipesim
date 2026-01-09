import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, getSettings } from '@/lib/admin'
import { generateWalletStatementPDF } from '@/lib/invoice'

// GET /api/admin/users/[id]/wallet-statement - Generate PDF wallet statement for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin()
  if ('error' in adminResult) return adminResult.error

  const { id } = await params

  try {
    // Fetch user with wallet transactions
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        credits: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch wallet transactions
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    })

    // Get business settings
    const settings = await getSettings()

    // Generate PDF
    const pdfBuffer = generateWalletStatementPDF(
      {
        customerName: user.name || 'Customer',
        customerEmail: user.email,
        currentBalance: user.credits,
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balance: t.balance,
          description: t.description,
          status: t.status,
          createdAt: t.createdAt,
        })),
        generatedAt: new Date(),
      },
      {
        businessName: settings.businessName,
        businessAddress: settings.businessAddress,
        businessEmail: settings.businessEmail,
        businessPhone: settings.businessPhone,
        businessVAT: settings.businessVAT,
      }
    )

    // Sanitize email for filename
    const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '-')

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Wallet-Statement-${safeEmail}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Admin wallet statement generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate wallet statement' },
      { status: 500 }
    )
  }
}
