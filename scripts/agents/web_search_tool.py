"""Web search tool for the mayor chat agent.

Uses the existing Bright Data SERP zone to search for
Montgomery-specific information when local data is insufficient.
"""

import logging

from scripts.bright_data_client import serp_search

logger = logging.getLogger("web_search_tool")

MONTGOMERY_SUFFIX = " Montgomery Alabama"
MAX_RESULTS = 5


def search_montgomery_web(query: str, max_results: int = MAX_RESULTS) -> str:
    """Search the web for Montgomery-specific information.

    Automatically appends 'Montgomery Alabama' to the query
    to keep results locally relevant.
    """
    scoped_query = query.strip()
    if "montgomery" not in scoped_query.lower():
        scoped_query += MONTGOMERY_SUFFIX

    try:
        data = serp_search(scoped_query, search_type="nws")
    except Exception as e:
        logger.error("SERP search failed for '%s': %s", scoped_query, e)
        return f"Web search unavailable: {e}"

    if not data or not data.get("results"):
        return f"No web results found for: {scoped_query}"

    results = data["results"][:max_results]
    lines = [f"Web results for '{scoped_query}' ({len(results)} shown):"]
    for r in results:
        title = r.get("title", "Untitled")
        snippet = r.get("description", r.get("snippet", ""))[:150]
        source = r.get("source", r.get("displayed_link", ""))
        lines.append(f"- {title}\n  {snippet}\n  Source: {source}")

    return "\n".join(lines)
