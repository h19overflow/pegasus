// All Bright Data REST calls are proxied through Vite
// (vite.config.ts: /brightdata-api → https://api.brightdata.com)
// so the API key is never sent cross-origin from the browser.
const PROXY_BASE = "/brightdata-api";

export class BrightDataError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "BrightDataError";
  }
}

/** Read key from build-time env var, then localStorage fallback. */
export function getApiKey(): string {
  const fromEnv = (import.meta.env.VITE_BRIGHTDATA_API_KEY as string) ?? "";
  const fromStorage =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("brightdata_api_key") ?? "")
      : "";
  const key = fromEnv || fromStorage;
  if (!key)
    throw new BrightDataError(
      "Bright Data API key not configured. " +
        "Add VITE_BRIGHTDATA_API_KEY to .env or run: " +
        "localStorage.setItem('brightdata_api_key', '<key>') in the browser console.",
    );
  return key;
}

async function doFetch(
  zone: string,
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await fetch(`${PROXY_BASE}/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ zone, url, format: "json" }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BrightDataError(
      `Bright Data API responded ${res.status}: ${text.slice(0, 200)}`,
      res.status,
    );
  }
  return res.json();
}

/**
 * Fire a Bright Data zone request with exponential-backoff retry.
 * Retries only on 5xx / network errors; aborts immediately on 4xx.
 */
export async function bdRequest(
  zone: string,
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  let delayMs = 1000;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await doFetch(zone, url, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof BrightDataError && err.status && err.status < 500) throw err;
      if (attempt === 2) throw err;
      await new Promise<void>((r) => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }
}
