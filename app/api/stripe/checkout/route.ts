import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createCheckoutSession } from '@/lib/stripe/checkout';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { productSlug, priceId } = await req.json() as { productSlug: string; priceId: string };
  const origin = req.headers.get('origin') ?? 'https://cc-dashboard.vercel.app';
  const session = await createCheckoutSession({
    userId: user.id,
    userEmail: user.email!,
    productSlug,
    priceId,
    successUrl: `${origin}/billing/success?sid={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/billing/canceled`,
  });
  return NextResponse.json({ url: session.url });
}
