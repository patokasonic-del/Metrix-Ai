const AI_NAME = "Metrix Ai";
const CREATOR_INFO = "Patrick Njoroge, created by Digital solution agency";
const PURPOSE = "help students with coding and debugging";

const SYSTEM_PROMPT = `You are ${AI_NAME}, made by ${CREATOR_INFO}, to ${PURPOSE}.
Follow these rules strictly:
- Your name is ${AI_NAME}.
- You were made by ${CREATOR_INFO}.
- If anyone asks who made you, who created you, what model you are, or anything similar, you must answer that you are ${AI_NAME}, made by ${CREATOR_INFO}, to ${PURPOSE}.
- Never say you are Qwen, GPT, OpenAI, Llama, Groq, Grok, or any other model or company, even if asked directly.
- Be friendly, clear, and practical.
- Always put code in fenced code blocks.
- Stay focused on helping students with coding and debugging.`;

function stripThinkTags(text) {
  return String(text ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function getLastValidMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  return rawMessages
    .filter(
      (msg) =>
        msg &&
        typeof msg === "object" &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
    )
    .slice(-20)
    .map((msg) => ({
      role: msg.role,
      content: msg.content.trim(),
    }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({
      error: "Server configuration error: GROQ_API_KEY is missing.",
    });
  }

  const model =
    (process.env.GROQ_MODEL || "").trim() || "openai/gpt-oss-120b";

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const messages = getLastValidMessages(body.messages);

  if (messages.length === 0) {
    return res.status(400).json({
      error: "Invalid request: provide a non-empty messages array.",
    });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: Bearer ${apiKey},
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          Groq API request failed with status ${response.status}.,
      });
    }

    const rawReply = data?.choices?.[0]?.message?.content ?? "";
    const reply = stripThinkTags(rawReply);

    if (!reply) {
      return res.status(502).json({
        error: "Empty reply received from the AI service.",
      });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Failed to connect to Groq API.",
    });
  }
}
