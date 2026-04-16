import GlobeClient from './GlobeClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'BANKAI — Revenue Globe' }

export default function Page() {
  return <GlobeClient initialSite="ALL" />
}
