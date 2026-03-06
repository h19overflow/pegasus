/**
 * GPT-4o-mini batch misinformation analyzer.
 * Proxied through Vite (/openai-api → https://api.openai.com) to avoid CORS.
 * Falls back gracefully when VITE_OPENAI_API_KEY is not set.
 */

const PROXY_BASE = "/openai-api";
const MODEL = "gpt-4o-mini";
const BATCH_SIZE = 40; // well within gpt-4o-mini's 128k context

export interface AiMisinfoScore {
  articleId: string;
  risk: number;   // 0–100
  reason: string;
}

export class OpenAIError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "OpenAIError";
  }
}

function getApiKey(): string {
  const fromEnv = (import.meta.env.VITE_OPENAI_API_KEY as string) ?? "";
  const fromStorage =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("openai_api_key") ?? "")
      : "";
  const key = fromEnv || fromStorage;
  if (!key)
    throw new OpenAIError(
      "OpenAI API key not found. Add VITE_OPENAI_API_KEY to .env " +
        "or run: localStorage.setItem('openai_api_key', '<key>')",
    );
  return key;
}

const SYSTEM_PROMPT = `You are a fact-checking assistant analyzing local news articles from Montgomery, Alabama.
For each article assess its misinformation risk 0-100:
- 0-30  Low:    Credible outlet, claims consistent with excerpt, factual tone
- 31-60 Medium: Unverified source, emotional framing, or unsubstantiated claims
- 61-100 High:  Unknown source, sensational/misleading headline, no supporting evidence

Trusted outlets: montgomeryadvertiser.com, wsfa.com, al.com, waka.com, .gov domains, alreporter.com.
Return ONLY valid JSON: { "results": [{ "articleId": string, "risk": number, "reason": string }] }`;

async function callOpenAI(
  batch: Array<{ id: string; title: string; excerpt: string; source: string; category: string }>,
  signal?: AbortSignal,
): Promise<AiMisinfoScore[]> {
  const res = await fetch(`${PROXY_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze these ${batch.length} articles:\n${JSON.stringify(batch)}`,
        },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new OpenAIError(`OpenAI API ${res.status}: ${text.slice(0, 200)}`, res.status);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { results?: AiMisinfoScore[] };
  return parsed.results ?? [];
}

/** Analyze articles in batches; returns all scores when done. */
export async function analyzeArticlesBatch(
  articles: Array<{ id: string; title: string; excerpt: string; source: string; category: string }>,
  signal?: AbortSignal,
): Promise<AiMisinfoScore[]> {
  const scores: AiMisinfoScore[] = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchScores = await callOpenAI(batch, signal);
    scores.push(...batchScores);
  }
  return scores;
}
