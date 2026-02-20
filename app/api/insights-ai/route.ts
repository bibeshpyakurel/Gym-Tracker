import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type InsightsContext = {
  facts?: Array<{ label: string; value: string; detail: string }>;
  correlations?: Array<{ label: string; value: number | null; interpretation: string; overlapDays: number }>;
  improvements?: string[];
  achievements?: Array<{ period: string; title: string; detail: string }>;
  suggestions?: string[];
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Add it to your environment to enable AI chat." },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as {
      question?: string;
      context?: InsightsContext;
      history?: ChatMessage[];
    };

    const question = body.question?.trim();
    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const context = body.context ?? {};
    const history = (body.history ?? []).slice(-8);

    const systemPrompt = [
      "You are an insights coach for a gym-tracker app.",
      "You MUST answer using only the provided user context data.",
      "If data is missing or insufficient, say so clearly.",
      "Be concise, practical, and action-oriented.",
      "When useful, provide 3-5 bullets.",
      "Do not fabricate metrics or dates.",
    ].join(" ");

    const contextPrompt = [
      "User context data:",
      JSON.stringify(context),
    ].join("\n");

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextPrompt },
      ...history.map((item) => ({
        role: item.role,
        content: item.text,
      })),
      { role: "user", content: question },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `AI provider error: ${response.status} ${errorText}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json(
      { error: "Failed to process AI request." },
      { status: 500 }
    );
  }
}
