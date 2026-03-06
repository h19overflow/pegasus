"""News processing pipeline — extracted from scrape_news.py + enrich_news_sentiment.py.

Handles SERP response parsing, sentiment enrichment, deduplication,
and saving to news_feed.json.
"""

import hashlib
import json
from datetime import datetime, timezone

from scripts.config import OUTPUT_FILES
from scripts.sentiment_rules import score_sentiment, score_misinfo_risk, build_summary


def generate_article_id(title: str, source_url: str) -> str:
    """Generate a stable dedup ID from title + URL."""
    key = f"{title}__{source_url}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def parse_news_results(body: dict, category: str) -> list[dict]:
    """Extract news articles from the parsed SERP body."""
    articles = []
    now = datetime.now(timezone.utc).isoformat()

    news_items = body.get("news", [])
    if not news_items:
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


def enrich_article(article: dict) -> dict:
    """Add sentiment, misinfo risk, and summary fields to an article."""
    title = article.get("title", "")
    excerpt = article.get("excerpt", "")

    sentiment, sentiment_score = score_sentiment(title, excerpt)
    misinfo_risk = score_misinfo_risk(title)
    summary = build_summary(title)

    article["sentiment"] = sentiment
    article["sentimentScore"] = sentiment_score
    article["misinfoRisk"] = misinfo_risk
    article["summary"] = summary
    return article


def deduplicate_articles(articles: list[dict]) -> list[dict]:
    """Remove duplicate articles by ID."""
    seen: set[str] = set()
    unique = []
    for article in articles:
        if article["id"] not in seen:
            seen.add(article["id"])
            unique.append(article)
    return unique


def load_existing_articles() -> list[dict]:
    """Load existing articles from output file for merging."""
    path = OUTPUT_FILES["news"]
    if path.exists():
        try:
            with open(path) as f:
                data = json.load(f)
                return data.get("articles", [])
        except (json.JSONDecodeError, KeyError):
            return []
    return []


def save_news_articles(articles: list[dict]) -> None:
    """Save articles to output JSON file."""
    path = OUTPUT_FILES["news"]
    path.parent.mkdir(parents=True, exist_ok=True)

    output = {
        "lastScraped": datetime.now(timezone.utc).isoformat(),
        "totalArticles": len(articles),
        "articles": articles,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(articles)} articles to {path}")
