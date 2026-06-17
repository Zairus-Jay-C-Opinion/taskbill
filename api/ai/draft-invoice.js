export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clientName, tasks, total, currency, paymentLink, username } = req.body;
    if (!clientName || !tasks?.length) {
      return res.status(400).json({ error: "clientName and tasks are required" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel env vars" });
    }

    const taskLines = tasks
      .map((t) => `• ${t.title}${t.description ? " — " + t.description : ""}`)
      .join("\n");

    const totalStr = total != null ? `${currency ?? ""}${Number(total).toFixed(2)}` : null;

    const prompt = `You are helping a freelancer write a professional invoice email to send to a client.

Client name: ${clientName}
Services completed:
${taskLines}
${totalStr ? `Total amount due: ${totalStr}` : ""}

Write a complete, professional invoice email that includes:
1. A subject line (prefix it with "Subject: ")
2. A greeting addressed to ${clientName}
3. A paragraph summarizing the specific work completed, referencing the actual service names above
4. A clear statement of the total amount due${totalStr ? ` (${totalStr})` : ""} and a polite but confident payment request
5. ${paymentLink ? `Include the payment link exactly as provided here — do not modify it: ${paymentLink}` : "Mention that a payment link will be sent to them shortly"}
6. Close with exactly "Best regards," on one line, then "${username || "The Team"}" on the next line

Keep the tone warm but business-appropriate. 3–4 short paragraphs.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({ error: geminiData.error?.message ?? "Gemini API error" });
    }

    const draft = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return res.status(200).json({ draft });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "AI draft failed" });
  }
}
