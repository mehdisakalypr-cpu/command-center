import { redirect } from 'next/navigation'

export default async function LegacyLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  redirect(next ? `/auth/login?next=${encodeURIComponent(next)}` : '/auth/login')
}
