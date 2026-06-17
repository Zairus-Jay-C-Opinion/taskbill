import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { invoiceId, amount, clientName, description } = req.body;

  if (!invoiceId || !amount || amount <= 0) {
    return res.status(400).json({ error: "invoiceId and a positive amount are required" });
  }

  try {
    // Create a one-time price for this invoice amount
    const price = await stripe.prices.create({
      currency: "php",
      unit_amount: Math.round(amount * 100), // centavos
      product_data: {
        name: description || `Invoice for ${clientName || "Client"}`,
      },
    });

    // Create a Payment Link — does not expire, safe to email/share
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { invoiceId }, // used by webhook to identify the invoice
      after_completion: {
        type: "redirect",
        redirect: { url: `${process.env.APP_URL || "https://taskbill.vercel.app"}/invoices` },
      },
    });

    return res.status(200).json({
      url: paymentLink.url,
      paymentLinkId: paymentLink.id,
    });
  } catch (err) {
    console.error("Stripe error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
