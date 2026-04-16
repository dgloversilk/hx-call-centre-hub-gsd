import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth/config";

export async function POST(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { question, articles = [] } = await request.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI assistant is not configured yet. Ask your manager to add the ANTHROPIC_API_KEY environment variable." }, { status: 503 });
  }

  // Build knowledge context from uploaded articles
  const knowledgeContext = articles.length > 0
    ? articles.map((a, i) => `--- Article ${i + 1}: ${a.title} ---\n${a.content}`).join("\n\n")
    : "No articles have been uploaded to the knowledge base yet.";

  const systemPrompt = `You are a helpful assistant for Holiday Extras call centre agents. You answer questions based on the knowledge base articles provided below.

KNOWLEDGE BASE:
${knowledgeContext}

INSTRUCTIONS:
- Answer clearly and concisely based on the knowledge base content above.
- If the answer is in the knowledge base, cite which article helped (e.g. "According to '[Article Title]'...").
- If the question cannot be answered from the knowledge base, say so clearly and suggest the agent escalate or check with their manager.
- Keep answers practical and actionable — agents are on live calls.
- Do not make up information that isn't in the knowledge base.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            apiKey,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   [{ role: "user", content: question }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message ?? `Anthropic API error ${response.status}`);
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text ?? "No response received.";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Knowledge ask error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
