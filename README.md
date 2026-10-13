# DiscFlip

DiscFlip is a disc golf marketplace where players can buy, sell, trade and auction discs in a safe, escrow-protected space.

A marketplace for buying, selling, trading and auctioning disc golf discs: React + Vite on the
front end, Supabase for login and data, Stripe Connect for payments and payouts, EasyPost for
shipping labels, and Google Gemini for identifying discs from photos.

DiscFlip is an installable web app (PWA): once deployed, people can add it to their phone's
home screen or install it on a computer, and it opens full screen like a regular app.

## How money works

- The buyer pays the item price + shipping. There is no buyer fee.
- Stripe holds the payment until the buyer confirms the disc arrived (or 72 hours after
  delivery, or the pickup PIN is entered). Then the seller is paid the price minus DiscFlip's
  **10% fee** (card processing comes out of that 10%).
- Shipping money pays for the label DiscFlip buys through EasyPost.
- Auction winners have 48 hours to pay; otherwise the disc is relisted automatically.

Fee settings live in `api/_lib/fees.ts` and `services/fees.ts`.

## Two ways to run it

**Demo mode (no accounts needed).** Leave `VITE_SUPABASE_URL` empty (or delete `.env.local`).
Everything is stored in your browser with sample data. Sign in with any email/password.

**Live mode.** Set the Supabase variables in `.env.local` and do the one-time setup below.

## One-time setup (live mode)

1. **Database.** In the Supabase dashboard open **SQL Editor → New query**, paste all of
   `database/schema.sql`, click **Run**. Then do the same with `database/rls_policies.sql`.
   Both are safe to run again later (re-run them after pulling new versions).
2. **Make yourself an admin** (optional). After you've signed up once, run in the SQL editor:
   `update public.users set is_system_admin = true where email = 'you@example.com';`
3. **Supabase URLs.** Authentication → URL Configuration: set **Site URL** to your deployed
   address and add it under **Redirect URLs**. For Google sign-in also enable
   Authentication → Providers → Google.
4. **Environment variables.** Copy `.env.example` to `.env.local` for local runs. For Vercel,
   add every variable from `.env.example` in Project → Settings → Environment Variables, then
   redeploy.
5. **Stripe webhook.** Stripe → Developers → Webhooks → add endpoint
   `https://<your-site>/api/payments/webhook` with `checkout.session.completed`,
   `charge.dispute.created` and (on connected accounts) `account.updated`. Copy its signing
   secret into `STRIPE_WEBHOOK_SECRET`.
6. **EasyPost webhook.** EasyPost → Webhooks → add `https://<your-site>/api/shipping/webhook`
   with a webhook secret you make up; put the same value in `EASYPOST_WEBHOOK_SECRET`.
7. **Daily maintenance job.** Set `CRON_SECRET` to any long random string. Vercel runs
   `/api/cron/maintenance` once a day (see `vercel.json`) to close auctions, auto-complete
   overdue deliveries and send any payouts that are waiting.

## Running locally

```bash
npm install
npm run dev          # front end only: http://localhost:3000
npx vercel dev       # front end + the /api server functions together
```

With `npm run dev` alone the site works, but anything that goes through `/api` (creating a
listing, sending a message, checkout, AI photo identification, shipping labels) needs
`npx vercel dev`, which reads the same `.env.local`.

## Installing the app

- **Android / Chrome / Edge:** open the site and tap **Install App** in the header (or the
  browser's install icon).
- **iPhone / iPad:** open the site in Safari → Share → **Add to Home Screen**.

Putting it in the Apple App Store or Google Play needs a native wrapper (e.g. Capacitor)
plus developer accounts; the web app is ready to be wrapped.

## Checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

GitHub Actions runs all of these on every push and keeps the built site as a downloadable
artifact for 7 days.

## Project layout

- `App.tsx`, `components/` — the screens
- `services/` — data access (`databaseService.ts`), auth, payments, shipping, photo uploads,
  PWA install support; `mappers.ts` converts between database columns (`seller_id`) and app
  fields (`sellerId`)
- `api/` — Vercel serverless functions (Stripe, EasyPost, Gemini, listing creation, messages,
  daily maintenance); shared server code is in `api/_lib/`
- `database/` — Supabase schema, database functions and access rules
- `public/` — app icons, install manifest and service worker
