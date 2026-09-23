# Thai Teach Link — Thailand teaching job board

## What's in this project
- `public/index.html` — the whole site (front end)
- `api/create-checkout-session.js` — creates a pending job + a Stripe payment link
- `api/stripe-webhook.js` — Stripe calls this when payment succeeds; it publishes the job
- `schema.sql` — the Supabase database table
- `package.json` — the two dependencies the API routes need

## Setup (see the step-by-step guide above for the full walkthrough)

1. **Supabase**: create a project, run `schema.sql` in the SQL editor, then copy:
   - Project URL → paste into `SUPABASE_URL` (used in both API files, as an environment variable)
   - `anon` public key → paste into `public/index.html` where it says `YOUR_SUPABASE_ANON_KEY`
   - `service_role` secret key → set as the `SUPABASE_SERVICE_ROLE_KEY` environment variable (never put this in the HTML — it bypasses all security rules)

2. **Stripe**: copy your Secret key into `STRIPE_SECRET_KEY`. After deploying, add a webhook endpoint in the Stripe dashboard pointing to `https://yourdomain.com/api/stripe-webhook`, listening for `checkout.session.completed`, and copy the signing secret it gives you into `STRIPE_WEBHOOK_SECRET`.

3. **Environment variables** (set these in Vercel's project settings, not in the code):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

4. **Deploy**: push this folder to a GitHub repo, then import it in Vercel. It auto-detects the `api/` folder as serverless functions and serves `public/` as the site.

5. **Test**: use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC. Post a job, complete checkout, and confirm it appears in the listings within a few seconds (the webhook publishes it).

6. **Go live**: switch your Stripe dashboard from test mode to live mode, swap in your live API keys, and you're taking real payments.

7. **Set up a professional email address (free)**: instead of paying for Google Workspace, forward `contact@yourdomain.com` (or `jobs@`, `hello@`, whatever you like) to your personal Gmail through your domain registrar's free email forwarding — see the steps below. You'll receive mail at the custom address but read/reply from your normal inbox. Upgrade to Google Workspace later only if you need to *send* from that address too, or add a second person to the team.

## Setting up free email forwarding

1. Log in to your domain registrar (Namecheap, Porkbun, GoDaddy, etc.) and open the domain's DNS or Email settings.
2. Look for a section called "Email Forwarding" or "Redirect Email" — most registrars offer this free, separate from any paid email hosting plan.
3. Add a forwarding rule: source address (e.g. `jobs@yourdomain.com`) → destination (your personal Gmail address).
4. Save, then wait a few minutes for DNS to propagate (usually near-instant, occasionally up to an hour).
5. Send a test email to the new address from a different account and confirm it lands in your Gmail inbox.
6. Optional: in Gmail, go to Settings > Accounts > "Send mail as" and add the custom address, so replies can show `jobs@yourdomain.com` as the sender even though you're using your normal Gmail account. Gmail will ask you to verify via a confirmation code sent to that address (which will land in your inbox thanks to the forwarding rule above).

## How the payment security works
The front end never marks a job as "live" itself — it only asks the server to start a Stripe Checkout session. The job stays `pending_payment` in the database until Stripe's webhook confirms the charge actually succeeded. This is what stops someone from getting a free listing by closing the payment tab.
