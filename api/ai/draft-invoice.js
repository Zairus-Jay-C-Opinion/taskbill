import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const taskLines = tasks
      .map((t) => `• ${t.title}${t.description ? " — " + t.description : ""}`)
      .join("\n");

    const prompt = `You are helping a freelancer write a short professional note to accompany an invoice.\n\nClient: ${clientName}\nWork completed:\n${taskLines}\n\nWrite 2–3 concise, professional sentences summarizing the work done and politely requesting payment. No greetings or sign-offs — just the body of the note.`;

    const result = await model.generateContent(prompt);
    const draft = result.response.text();

    return res.status(200).json({ draft });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "AI draft failed" });
  }
}
