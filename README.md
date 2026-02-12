## What is DiscFlip?

**One-sentence description:** DiscFlip is a disc-golf auction app (in progress) where users can list, browse, and bid on disc-golf gear.

**Architecture diagram (in words):**
- **Frontend (Vite + React + TypeScript)** runs in the browser and renders the UI.
- **Client → `/api/*`** calls go to backend routes living in the repo’s `api/` folder.
- **UI/feature code** is organized under `components/` (UI) and `services/` (shared logic).
- **Data layer** is organized under `database/` (provider not clearly documented yet).
- **External integration** appears to include Google Gemini (via `GEMINI_API_KEY`).

**Frontend:** Vite + React + TypeScript (client)

**Backend/API:** `api/` exists in the repo; this looks like a serverless-style API folder, but the runtime (Node server vs platform functions/edge) isn’t explicitly documented yet.

**Database/Auth:** Not clearly specified in the current repo docs. A `database/` folder exists, but the provider (Supabase/Postgres/etc.) isn’t called out here.

**Payments:** Not specified (no Stripe/payments setup is documented yet).

**Hosting:** Not specified (no Vercel/Netlify/etc. setup is documented yet).

**Run locally (requirements):**
- **Node.js** (version not specified in repo)
- **npm** (implied by `package-lock.json` and the `npm install` workflow)
- Environment:
  - Create `.env.local` and set:
    - `GEMINI_API_KEY=...`
- Commands:
  - `npm install`
  - `npm run dev`
