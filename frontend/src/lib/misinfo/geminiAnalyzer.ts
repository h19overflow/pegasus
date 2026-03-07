/**
 * Gemini (Google AI) batch misinformation analyzer.
 * Proxied through Vite (/gemini-api → https://generativelanguage.googleapis.com) to avoid CORS.
 * Falls back gracefully when VITE_GEMINI_API_KEY is not set.
 */

const PROXY_BASE = "/gemini-api";
const MODEL = "gemini-2.0-flash";

export interface AiMisinfoScore {
  articleId: string;
  risk: number;   // 0–100
  reason: string;
}

export class GeminiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

function getApiKey(): string {
  const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string) ?? "";
  const fromStorage =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("gemini_api_key") ?? "")
      : "";
  const key = fromEnv || fromStorage;
  if (!key)
    throw new GeminiError(
      "Gemini API key not found. Add VITE_GEMINI_API_KEY to .env " +
        "or run: localStorage.setItem('gemini_api_key', '<key>')",
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

interface ArticleBatchItem {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  category: string;
}

const BATCH_SIZE = 40;

async function callGemini(
  batch: ArticleBatchItem[],
  signal?: AbortSignal,
): Promise<AiMisinfoScore[]> {
  const apiKey = getApiKey();
  const url = `${PROXY_BASE}/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `Analyze these ${batch.length} articles:\n${JSON.stringify(batch)}` },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
      },
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GeminiError(`Gemini API ${res.status}: ${text.slice(0, 200)}`, res.status);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(content) as { results?: AiMisinfoScore[] };
  return parsed.results ?? [];
}

/** Analyze articles in batches; returns all scores when done. */
export async function analyzeArticlesBatch(
  articles: ArticleBatchItem[],
  signal?: AbortSignal,
): Promise<AiMisinfoScore[]> {
  const scores: AiMisinfoScore[] = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchScores = await callGemini(batch, signal);
    scores.push(...batchScores);
  }
  return scores;
}
