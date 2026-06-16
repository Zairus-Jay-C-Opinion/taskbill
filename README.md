# TaskBill

A task/billing app built on React + Vite + Tailwind, with Supabase for auth/data and
Vercel serverless functions (`/api`) for anything that touches a secret key (Stripe, Anthropic).

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4 (JavaScript/JSX)
- **Routing:** React Router (`/login` public, `/` protected)
- **Auth + data:** Supabase (email/password auth, Row-Level Security)
- **Serverless:** Vercel functions in `/api`
- **Deploy:** Vercel

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a [Supabase](https://supabase.com) project. From **Project Settings → API**, copy the
   project URL and the `anon` public key.
3. Copy the env template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. (The server-only keys can stay
   blank until you build the Stripe/Anthropic endpoints.)

## Run

```bash
npm run dev      # frontend only — http://localhost:5173
npx vercel dev   # frontend + /api serverless functions
```

`npm run dev` does **not** run `/api` functions — use `vercel dev` to test those locally.

## Project layout

```
api/                 Vercel serverless functions (secret keys live here, never in src/)
src/
  lib/supabaseClient.js   browser Supabase client (anon key only)
  auth/                   AuthProvider (session) + ProtectedRoute (redirect guard)
  pages/                  Login, Dashboard
  App.jsx / main.jsx      routes + app entry
```

## Security notes

- Only `VITE_`-prefixed vars reach the browser. Keep `STRIPE_SECRET_KEY`,
  `ANTHROPIC_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` server-only (no `VITE_` prefix),
  used only inside `/api`.
- Data access control is enforced with Supabase Row-Level Security.
