import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clientName, tasks } = req.body;
  if (!clientName || !tasks?.length) {
    return res.status(400).json({ error: "clientName and tasks are required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel env vars" });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const taskLines = tasks
    .map((t) => `• ${t.title}${t.description ? " — " + t.description : ""}`)
    .join("\n");

  const prompt = `You are helping a freelancer write a short professional note to accompany an invoice.\n\nClient: ${clientName}\nWork completed:\n${taskLines}\n\nWrite 2–3 concise, professional sentences summarizing the work done and politely requesting payment. No greetings or sign-offs — just the body of the note.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return res.status(200).json({ draft: response.text });
}
