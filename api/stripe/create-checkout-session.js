import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  pro: { amount: 29900, name: "TaskBill Pro" },
  business: { amount: 79900, name: "TaskBill Business" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { plan, userId } = req.body;
  if (!PLANS[plan]) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const config = PLANS[plan];
  const appUrl = process.env.APP_URL || "https://taskbill.vercel.app";

  try {
    const price = await stripe.prices.create({
      unit_amount: config.amount,
      currency: "php",
      recurring: { interval: "month" },
      product_data: { name: config.name },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${appUrl}/?upgraded=true`,
      cancel_url: `${appUrl}/#plans`,
      metadata: { userId, plan },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
