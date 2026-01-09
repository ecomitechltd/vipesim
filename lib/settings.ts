import { prisma } from '@/lib/db'
import { cache } from 'react'

export interface BusinessInfo {
  businessName: string
  businessAddress: string
  businessEmail: string
  businessPhone: string
  businessVAT: string | null
}

// Cached function to fetch business info - can be called multiple times per request
// without hitting the database multiple times
export const getBusinessInfo = cache(async (): Promise<BusinessInfo> => {
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
    select: {
      businessName: true,
      businessAddress: true,
      businessEmail: true,
      businessPhone: true,
      businessVAT: true,
    },
  })

  return {
    businessName: settings?.businessName || 'eSIMFly',
    businessAddress: settings?.businessAddress || '123 Digital Way, Tech City, TC 10001',
    businessEmail: settings?.businessEmail || 'support@esimfly.me',
    businessPhone: settings?.businessPhone || '+1 (555) 123-4567',
    businessVAT: settings?.businessVAT || null,
  }
})
