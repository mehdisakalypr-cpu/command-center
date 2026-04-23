import type Stripe from 'stripe';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { ensureStripe } from './client';

export async function handleStripeEvent(event: Stripe.Event) {
  const sb = createSupabaseAdmin();
  await sb.from('stripe_webhook_events').upsert({
    id: event.id,
    type: event.type,
    payload: event as any,
  });
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.user_id;
      const productSlug = s.metadata?.product_slug;
      if (userId && productSlug && s.subscription) {
        const sub = await ensureStripe().subscriptions.retrieve(s.subscription as string);
        await sb.from('subscriptions').upsert({
          user_id: userId,
          product_slug: productSlug,
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0]?.price.id,
          status: sub.status,
          tier: (sub.metadata?.tier as string) ?? 'pro',
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }, { onConflict: 'stripe_subscription_id' });
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await sb.from('subscriptions').update({
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      }).eq('stripe_subscription_id', sub.id);
      break;
    }
  }
  await sb.from('stripe_webhook_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id);
}
