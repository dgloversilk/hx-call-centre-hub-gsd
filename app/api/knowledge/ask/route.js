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

  const systemPrompt = `You are a knowledge base assistant for Holiday Extras call centre agents. Your ONLY job is to find and return information from the articles provided below. You have no other knowledge source.

KNOWLEDGE BASE:
${knowledgeContext}

STRICT RULES — you must follow these without exception:
1. ONLY use information that is explicitly written in the articles above. Word for word if possible.
2. NEVER use your general knowledge, training data, or anything not in the articles above — even if you think you know the answer.
3. If the answer is not clearly stated in the articles, respond with exactly: "I couldn't find that in the knowledge base. Please check with your manager or escalate." Do not attempt to guess or infer.
4. When you do find the answer, always state which article it came from: "According to '[Article Title]': ..."
5. Do not summarise, paraphrase beyond what is needed for clarity, or add any information not present in the source article.
6. If the question is only partially answered by the articles, share what the articles say and flag what is missing: "The knowledge base covers X but doesn't mention Y."

You are not a general assistant. You are a strict lookup tool. If it is not in the articles, you do not know it.`;

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
