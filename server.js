/**
 * Kolachi Seafood — Chat API Server
 * Node.js + Express → Groq API (FREE) — llama-3.1-8b-instant
 *
 * Free API key: https://console.groq.com → API Keys → Create
 *
 * Run:  npm start
 * Port: 3001
 */

import "dotenv/config";
import express from "express";
import cors from "cors";

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static("."));

// ── Home route ───────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Server is running successfully! 🦞 Kolachi Seafood API is live.");
});

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Kolachi, the friendly digital host for Kolachi Seafood — a luxury waterfront seafood restaurant at 42 Harbor Blvd, Waterfront District. Phone: (212) 555-0199.

Be warm, concise and helpful. Answer in the language the customer writes in.

What you know about the restaurant:
- Dining hours: Mon–Thu 11:30 AM–10:00 PM | Fri–Sat 11:30 AM–11:00 PM | Sun 10:00 AM–9:00 PM
- Bar hours:    Mon–Thu 11:30 AM–11:00 PM | Fri–Sat 11:30 AM–12:00 AM | Sun 10:00 AM–10:00 PM
- Chef's Tasting Menu available every Friday & Saturday — limited seating, reservation required.
- Reservations: call (212) 555-0199 or email hello@kolachiseafood.com

Menu highlights & prices:
• Fresh Atlantic Oysters — market price
• Grilled Maine Lobster Tail — $72
• Pan-Seared Chilean Sea Bass — $48
• Jumbo Tiger Prawns (Inferno) — $54
• Kolachi Lobster Royale (signature) — $95
• Raw Bar Selection — $32
• New England Chowder — $18
• Chef's Daily Catch — ask your server

Specials:
- Friday & Saturday: Chef's Tasting Menu (6-course, reservation required)
- Happy Hour at the Bar: weekdays 4–6 PM

Handling complaints:
- Apologise sincerely, show empathy, and direct the guest to call (212) 555-0199 so a team member can resolve it immediately.
- Never invent policies or prices not listed above. If unsure, offer to connect them with the team.

Keep responses short (2-4 sentences max), warm and natural. Use elegant language befitting a luxury seafood restaurant.`;

// ── Validate key helper ──────────────────────────────────────
function getKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("your-key-here")) {
    throw new Error("GROQ_API_KEY is not set. Get a free key at https://console.groq.com");
  }
  return key;
}

// ── POST /api/chat (streaming via Groq REST) ─────────────────
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const key = getKey();

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        stream: true,
        max_tokens: 400,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Groq HTTP ${groqRes.status}`);
    }

    // Stream SSE tokens from Groq → client
    const reader  = groqRes.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          res.write("data: [DONE]\n\n");
          break;
        }
        try {
          const parsed = JSON.parse(data);
          const token  = parsed.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch {
          // skip malformed chunk
        }
      }
    }

    res.end();
  } catch (err) {
    console.error("Groq error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🦞 Kolachi Seafood server → http://localhost:${PORT}`);
  console.log(`   Open: http://localhost:${PORT}/index.html\n`);
});
