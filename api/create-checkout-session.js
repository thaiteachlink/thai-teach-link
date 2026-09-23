// api/create-checkout-session.js
// Called by the front end when someone submits "Post a job".
// 1. Saves the job as pending_payment (not visible publicly yet)
// 2. Creates a Stripe Checkout session for the listing fee
// 3. Returns the Checkout URL for the browser to redirect to
//
// The job only becomes visible once Stripe confirms payment via the
// webhook in api/stripe-webhook.js — never on this step. That's what
// stops someone getting a free listing by abandoning payment.

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role: only used server-side, bypasses RLS
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STANDARD_LISTING_PRICE_THB = 100;
const FEATURED_ADDON_PRICE_THB = 1200;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { school, title, city, schoolType, salary, visaSponsorship, description, contactEmail, featured } = req.body;

    if (!school || !title || !city || !salary || !contactEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Save the job as pending payment
    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        school,
        title,
        city,
        school_type: schoolType,
        salary,
        visa_sponsorship: visaSponsorship,
        description,
        contact_email: contactEmail,
        featured: !!featured,
        status: 'pending_payment'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Build the Stripe line items
    const lineItems = [
      {
        price_data: {
          currency: 'thb',
          product_data: { name: `Job listing: ${title} — ${school}` },
          unit_amount: STANDARD_LISTING_PRICE_THB * 100 // Stripe uses satang (smallest unit)
        },
        quantity: 1
      }
    ];

    if (featured) {
      lineItems.push({
        price_data: {
          currency: 'thb',
          product_data: { name: 'Featured placement add-on' },
          unit_amount: FEATURED_ADDON_PRICE_THB * 100
        },
        quantity: 1
      });
    }

    // 3. Create the Checkout session, tagging it with the job id
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/?posted=success`,
      cancel_url: `${origin}/?posted=cancelled`,
      metadata: { job_id: job.id }
    });

    // Remember which Checkout session this job is tied to
    await supabase.from('jobs').update({ stripe_session_id: session.id }).eq('id', job.id);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong creating your listing.' });
  }
}
