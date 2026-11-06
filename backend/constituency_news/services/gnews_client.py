
import requests

from datetime import datetime
from django.conf import settings
from django.utils.dateparse import parse_datetime


GNEWS_SEARCH_URL = "https://gnews.io/api/v4/search"
REQUEST_TIMEOUT = (5, 20)
MAX_ARTICLES_PER_REQUEST = 10


class GNewsAPIError(Exception):
    """Raised when the GNews API request fails."""
    pass


def fetch_articles(
    query,
    language="en",
    max_articles=10,
    from_datetime=None,
    to_datetime=None,
):
    """
    Fetch articles from GNews.

    Supported languages:
        en = English
        ta = Tamil

    Returns normalized article dictionaries.
    """

    api_key = settings.GNEWS_API_KEY

    if not api_key:
        raise GNewsAPIError("GNews API key is not configured.")

    if not query or not query.strip():
        raise ValueError("Search query cannot be empty.")

    if len(query) > 200:
        raise ValueError("GNews query cannot exceed 200 characters.")

    if language not in ("en", "ta"):
        raise ValueError("Supported languages are 'en' and 'ta'.")

    if not 1 <= max_articles <= MAX_ARTICLES_PER_REQUEST:
        raise ValueError("max_articles must be between 1 and 10.")

    headers = {
        "X-Api-Key": api_key,
        "Accept": "application/json",
    }

    params = {
        "q": query,
        "lang": language,
        "country": "in",
        "max": max_articles,
        "sortby": "publishedAt",
    }

    if from_datetime:
        params["from"] = from_datetime.isoformat()

    if to_datetime:
        params["to"] = to_datetime.isoformat()

    try:
        response = requests.get(
            GNEWS_SEARCH_URL,
            headers=headers,
            params=params,
            timeout=REQUEST_TIMEOUT,
        )

        response.raise_for_status()

    except requests.exceptions.Timeout as exc:
        raise GNewsAPIError("GNews request timed out.") from exc

    except requests.exceptions.HTTPError as exc:
        status_code = (
            response.status_code
            if "response" in locals() and response is not None
            else None
        )

        try:
            error_data = response.json()
        except (ValueError, AttributeError):
            error_data = response.text if response is not None else str(exc)

        message = (
            f"GNews HTTP error: {status_code}. "
            f"Details: {error_data}"
        )

        raise GNewsAPIError(message) from exc

    except requests.exceptions.RequestException as exc:
            raise GNewsAPIError("Could not connect to GNews.") from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise GNewsAPIError("GNews returned an invalid JSON response.") from exc

    articles = data.get("articles", [])

    normalized_articles = []

    for article in articles:
        source_data = article.get("source") or {}

        published_at = article.get("publishedAt")

        if published_at:
            published_at = parse_datetime(published_at)

        normalized_articles.append({
            "headline": article.get("title") or "",
            "description": article.get("description") or "",
            "article_url": article.get("url") or "",
            "image_url": article.get("image") or "",
            "source": source_data.get("name") or "Unknown",
            "author": article.get("author") or "",
            "published_at": published_at,
            "language": language,
        })

    return normalized_articles
