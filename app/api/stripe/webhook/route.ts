import { NextResponse } from 'next/server';
import { ensureStripe } from '@/lib/stripe/client';
import { handleStripeEvent } from '@/lib/stripe/webhook-handler';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  const body = await req.text();
  let event;
  try {
    event = ensureStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  await handleStripeEvent(event);
  return NextResponse.json({ received: true });
}
