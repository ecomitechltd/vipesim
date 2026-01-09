import { getBusinessInfo } from '@/lib/settings'
import { Footer } from './Footer'

export async function ServerFooter() {
  const businessInfo = await getBusinessInfo()
  return <Footer businessInfo={businessInfo} />
}
