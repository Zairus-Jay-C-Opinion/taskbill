# Security rules

- All Anthropic API calls must go through /api/ serverless functions
- All Stripe secret key usage must go through /api/ serverless functions
- Never import STRIPE_SECRET_KEY or ANTHROPIC_API_KEY into any frontend component
- Always use Supabase Row-Level Security for data access control
- .env.local is gitignored — never touch .gitignore to change this
