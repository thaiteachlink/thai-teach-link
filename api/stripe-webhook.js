// api/stripe-webhook.js
// Stripe calls this URL directly (not the browser) when a payment event
// happens. On a successful checkout, we flip the job from
// "pending_payment" to "live" so it starts showing up on the site.
//
// In your Stripe dashboard, this endpoint must be registered at:
//   https://yourdomain.com/api/stripe-webhook
// listening for the "checkout.session.completed" event.

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro';

export const config = {
  api: { bodyParser: false } // Stripe needs the raw request body to verify the signature
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const rawBody = await buffer(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const jobId = session.metadata?.job_id;

    if (jobId) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // listings run for 30 days

      const { error } = await supabase
        .from('jobs')
        .update({ status: 'live', expires_at: expiresAt.toISOString() })
        .eq('id', jobId)
        .eq('stripe_session_id', session.id); // safety check: session must match

      if (error) console.error('Failed to activate job:', error);
    }
  }

  return res.status(200).json({ received: true });
}
