import { Resend } from "resend";
import { limitEmail, applyRateLimit } from "../lib/ratelimit.js";

const resend = new Resend(process.env.RESEND_API_KEY);

// Extract "Subject: ..." line the AI was instructed to prepend
function parseEmailParts(draft) {
  const lines = draft.split("\n");
  const subjectIdx = lines.findIndex((l) => l.toLowerCase().startsWith("subject:"));
  let subject = "Invoice from TaskBill";
  let bodyLines = lines;
  if (subjectIdx !== -1) {
    subject = lines[subjectIdx].replace(/^subject:\s*/i, "").trim();
    bodyLines = lines.filter((_, i) => i !== subjectIdx);
  }
  return { subject, body: bodyLines.join("\n").trim() };
}

function buildHtml({ body, brandColor, logoUrl, fromName }) {
  const color = brandColor || "#0D0D0D";
  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e4e0;">
    <div style="height:4px;background:${color};"></div>
    <div style="padding:32px 40px;">
      ${logoUrl
        ? `<img src="${logoUrl}" style="height:40px;width:auto;object-fit:contain;margin-bottom:24px;display:block;" />`
        : `<p style="font-weight:700;font-size:16px;margin:0 0 24px;color:#0d0d0d;">${fromName || "TaskBill"}</p>`
      }
      <div style="font-size:14px;line-height:1.8;color:#333;">${safeBody}</div>
    </div>
    <div style="padding:16px 40px;border-top:1px solid #e5e4e0;background:#f5f4f0;">
      <p style="margin:0;font-size:11px;color:#aaa;">Sent via <a href="https://taskbill.vercel.app" style="color:#aaa;text-decoration:none;">TaskBill</a></p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!(await applyRateLimit(limitEmail, req, res))) return;

  const { to, draft, fromName, brandColor, logoUrl } = req.body;
  if (!to || !draft) {
    return res.status(400).json({ error: "to and draft are required" });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured in Vercel env vars" });
  }

  const { subject, body } = parseEmailParts(draft);
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName || "TaskBill"} <${from}>`,
      to: [to],
      subject,
      html: buildHtml({ body, brandColor, logoUrl, fromName }),
    });
    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
