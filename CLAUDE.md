# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`taskbill` is a greenfield project. As of this writing the repository contains only
`.claude/` configuration — no source code, `package.json`, or build tooling has been
scaffolded yet. It is not a git repository.

When scaffolding, update this file with the actual build/lint/test commands and the
real architecture once they exist.

## Intended architecture (from project rules)

The name and the security rules imply a task/billing app built around three external
services, all accessed through serverless API routes:

- **Anthropic API** — AI features. Calls MUST go through `/api/` serverless functions.
  `ANTHROPIC_API_KEY` must never be imported into a frontend component.
- **Stripe** — payments/billing. All secret-key usage MUST go through `/api/` serverless
  functions. `STRIPE_SECRET_KEY` must never be imported into a frontend component.
- **Supabase** — data layer. Access control MUST use Row-Level Security (RLS), not
  application-layer checks alone.

The `/api/` serverless-function pattern (plus Vercel deployment) matches the user's other
projects. Treat any code that puts a secret key in the browser bundle as a bug.

## Workflow constraints (from project rules)

These override default behavior:

- **Plan mode first** for any feature touching more than one file.
- **After implementing a feature, give exact manual test steps.**
- **On a Supabase or Stripe error, show the full error message** before attempting a fix.
- **Never install an npm package** without first explaining what it does and why it's needed.
- Commit frequently with short imperative messages (e.g. `add invoice draft endpoint`).
- `.env.local` is gitignored — never edit `.gitignore` to change that.
