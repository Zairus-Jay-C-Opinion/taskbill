// Sample Vercel serverless function — the template for future /api endpoints.
//
// This is where Stripe and Anthropic calls will live: secret keys
// (STRIPE_SECRET_KEY, ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are read
// from process.env here on the server and never shipped to the browser.
//
// Note: `vite` dev (`npm run dev`) does NOT execute this file. Run `vercel dev`
// to exercise /api locally, or deploy to Vercel.
export default function handler(req, res) {
  res.status(200).json({ ok: true, service: "taskbill" });
}
