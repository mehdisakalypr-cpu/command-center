import { ensureStripe } from './client';
export type CheckoutInput = {
  userId: string;
  userEmail: string;
  productSlug: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string,string>;
};
export async function createCheckoutSession(input: CheckoutInput) {
  const s = ensureStripe();
  return s.checkout.sessions.create({
    mode: 'subscription',
    customer_email: input.userEmail,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { user_id: input.userId, product_slug: input.productSlug, ...(input.metadata ?? {}) },
    subscription_data: { metadata: { user_id: input.userId, product_slug: input.productSlug } },
  });
}
