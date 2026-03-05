"""
Montgomery News Scraper — Bright Data SERP API.

Searches Google News for Montgomery, Alabama across multiple categories,
then saves structured results to public/data/news_feed.json.

Usage:
  python scripts/scrape_news.py
  python scripts/scrape_news.py --query "Montgomery Alabama city council"
"""

import json
import os
import hashlib
import time
import requests
from datetime import datetime, timezone
from pathlib import Path

API_KEY = os.environ.get(
    "BRIGHTDATA_API_KEY", "1f7ca8eb-5b67-45a0-8ae8-5f7087141477"
)
SERP_URL = "https://api.brightdata.com/request"

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "montgomery-navigator" / "public" / "data"
OUTPUT_FILE = OUTPUT_DIR / "news_feed.json"
RAW_DIR = Path(__file__).resolve().parent / "data" / "raw"

NEWS_QUERIES = [
    # General
    {"query": "Montgomery Alabama news today", "category": "general"},
    {"query": "Montgomery Alabama latest news", "category": "general"},
    {"query": "Montgomery AL breaking news", "category": "general"},
    # Development
    {"query": "Montgomery Alabama development projects", "category": "development"},
    {"query": "Montgomery Alabama housing construction", "category": "development"},
    {"query": "Montgomery Alabama new business opening", "category": "development"},
    {"query": "Montgomery Alabama infrastructure investment", "category": "development"},
    {"query": "Montgomery Alabama real estate development", "category": "development"},
    # Government
    {"query": "Montgomery Alabama city council government", "category": "government"},
    {"query": "Montgomery Alabama mayor city hall", "category": "government"},
    {"query": "Montgomery Alabama public policy budget", "category": "government"},
    {"query": "Montgomery Alabama zoning permits", "category": "government"},
    # Community
    {"query": "Montgomery Alabama community events", "category": "events"},
    {"query": "Montgomery Alabama festivals concerts", "category": "events"},
    {"query": "Montgomery Alabama volunteer nonprofit", "category": "community"},
    {"query": "Montgomery Alabama crime safety police", "category": "community"},
    {"query": "Montgomery Alabama schools education", "category": "community"},
    {"query": "Montgomery Alabama parks recreation", "category": "community"},
    # Economy & Jobs
    {"query": "Montgomery Alabama jobs hiring employers", "category": "general"},
    {"query": "Montgomery Alabama economy employment", "category": "general"},
    {"query": "Montgomery Alabama small business", "category": "development"},
    # Health & Services
    {"query": "Montgomery Alabama health hospital clinic", "category": "community"},
    {"query": "Montgomery Alabama public transit transportation", "category": "community"},
]


def serp_news_request(query: str) -> dict:
    """Call Bright Data SERP API for Google News results."""
    encoded_query = query.replace(" ", "+")
    search_url = (
        f"https://www.google.com/search"
        f"?q={encoded_query}&tbm=nws&hl=en&gl=us&brd_json=1"
    )

    payload = {
        "zone": "serp_api1",
        "url": search_url,
        "format": "json",
    }

    try:
        resp = requests.post(
            SERP_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=180,
        )
        resp.raise_for_status()
        return {"status": resp.status_code, "data": resp.json()}
    except requests.exceptions.HTTPError as e:
        return {"status": e.response.status_code, "error": e.response.text[:500]}
    except Exception as e:
        return {"status": 0, "error": str(e)}


def unwrap_serp_response(raw_data: dict) -> dict:
    """Unwrap Bright Data SERP response envelope.

    Response shape: {status_code: 200, headers: {...}, body: "<json string>"}
    The actual news data is inside body as a JSON string.
    """
    if "body" in raw_data:
        body = raw_data["body"]
        if isinstance(body, str):
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                return raw_data
        return body
    return raw_data


def generate_article_id(title: str, source_url: str) -> str:
    """Generate a stable dedup ID from title + URL."""
    key = f"{title}__{source_url}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def parse_news_results(body: dict, category: str) -> list[dict]:
    """Extract news articles from the parsed SERP body."""
    articles = []
    now = datetime.now(timezone.utc).isoformat()

    # Bright Data SERP returns news under "news" key for tbm=nws
    news_items = body.get("news", [])
    if not news_items:
        # Fallback: check organic, results
        news_items = body.get("organic", []) or body.get("results", [])

    for item in news_items:
        title = item.get("title", "")
        url = item.get("link") or item.get("url") or ""
        snippet = item.get("snippet") or item.get("description") or ""
        source_name = item.get("source", "")
        published = item.get("date") or item.get("age") or ""
        thumbnail = item.get("thumbnail") or item.get("image") or ""

        if not title or not url:
            continue

        articles.append({
            "id": generate_article_id(title, url),
            "title": title,
            "excerpt": snippet,
            "body": "",
            "source": source_name,
            "sourceUrl": url,
            "imageUrl": thumbnail if thumbnail else None,
            "category": category,
            "publishedAt": published,
            "scrapedAt": now,
            "upvotes": 0,
            "downvotes": 0,
            "commentCount": 0,
        })

    return articles


def deduplicate_articles(articles: list[dict]) -> list[dict]:
    """Remove duplicate articles by ID."""
    seen = set()
    unique = []
    for article in articles:
        if article["id"] not in seen:
            seen.add(article["id"])
            unique.append(article)
    return unique


def load_existing_articles() -> list[dict]:
    """Load existing articles from output file for merging."""
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE) as f:
                data = json.load(f)
                return data.get("articles", [])
        except (json.JSONDecodeError, KeyError):
            return []
    return []


def save_articles(articles: list[dict]) -> None:
    """Save articles to output JSON file."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "lastScraped": datetime.now(timezone.utc).isoformat(),
        "totalArticles": len(articles),
        "articles": articles,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(articles)} articles to {OUTPUT_FILE}")


def save_raw_response(query: str, data: dict) -> None:
    """Save raw SERP response for debugging."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    slug = query.replace(" ", "_")[:30]
    raw_file = RAW_DIR / f"news_{slug}_{ts}.json"
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def run_scrape(queries: list[dict] | None = None) -> None:
    """Run the full news scrape pipeline."""
    if queries is None:
        queries = NEWS_QUERIES

    all_articles: list[dict] = []

    for i, entry in enumerate(queries):
        query = entry["query"]
        category = entry["category"]

        print(f"\n[{i+1}/{len(queries)}] Searching: \"{query}\" (category: {category})")
        result = serp_news_request(query)

        if result["status"] == 200:
            raw_data = result["data"]
            save_raw_response(query, raw_data)

            body = unwrap_serp_response(raw_data)
            articles = parse_news_results(body, category)
            print(f"  Found {len(articles)} articles")

            if not articles:
                # Debug: print available keys
                print(f"  Body keys: {list(body.keys())[:10]}")

            all_articles.extend(articles)
        else:
            print(f"  ERROR {result['status']}: {result.get('error', 'unknown')[:200]}")

        # Small delay between requests to be respectful
        if i < len(queries) - 1:
            time.sleep(2)

    # Merge with existing
    existing = load_existing_articles()
    merged = all_articles + existing
    unique = deduplicate_articles(merged)

    print(f"\nTotal: {len(all_articles)} new, {len(existing)} existing, {len(unique)} unique after dedup")
    save_articles(unique)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Montgomery News Scraper (Bright Data SERP API)")
    parser.add_argument("--query", type=str, help="Single custom query to search")
    parser.add_argument("--category", type=str, default="general", help="Category for custom query")
    args = parser.parse_args()

    if args.query:
        run_scrape([{"query": args.query, "category": args.category}])
    else:
        run_scrape()
