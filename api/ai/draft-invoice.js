export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clientName, tasks } = req.body;
    if (!clientName || !tasks?.length) {
      return res.status(400).json({ error: "clientName and tasks are required" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel env vars" });
    }

    const taskLines = tasks
      .map((t) => `• ${t.title}${t.description ? " — " + t.description : ""}`)
      .join("\n");

    const prompt = `You are helping a freelancer write a short professional note to accompany an invoice.\n\nClient: ${clientName}\nWork completed:\n${taskLines}\n\nWrite 2–3 concise, professional sentences summarizing the work done and politely requesting payment. No greetings or sign-offs — just the body of the note.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
