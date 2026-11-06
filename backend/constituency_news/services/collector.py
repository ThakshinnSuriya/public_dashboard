
from django.db import transaction
from django.utils import timezone

from core.models import Constituency

from constituency_news.models import (
    NewsArticle,
    NewsConstituency,
    NewsCollectionLog,
)

from constituency_news.services.gnews_client import fetch_articles


# Tamil names for the constituencies currently available in the MVP.
# We can expand this mapping later without changing the Constituency model.

TAMIL_CONSTITUENCY_NAMES = {
    "Ambasamudram": "அம்பாசமுத்திரம்",
    "Tiruchirappalli East": "திருச்சி கிழக்கு",
    "Viralimalai": "விராலிமலை",
}


def collect_constituency_news():

    log = NewsCollectionLog.objects.create(
        status="running"
    )

    discovered = 0
    saved = 0
    duplicates = 0
    errors = []

    constituencies = Constituency.objects.filter(
        is_active=True,
        constituency_type="assembly",
        state="Tamil Nadu",
    )

    for constituency in constituencies:

        search_queries = [
            {
                "query": constituency.name,
                "language": "en",
            },
            {
                "query": TAMIL_CONSTITUENCY_NAMES.get(
                    constituency.name,
                    constituency.name,
                ),
                "language": "ta",
            },
        ]

        for search in search_queries:

            try:
                articles = fetch_articles(
                    query=search["query"],
                    language=search["language"],
                    max_articles=10,
                )

            except Exception as error:
                errors.append(
                    f"{constituency.name} ({search['language']}): {error}"
                )
                continue

            discovered += len(articles)

            for article_data in articles:

                article_url = article_data.get("article_url")

                if not article_url:
                    continue

                with transaction.atomic():

                    article, created = NewsArticle.objects.get_or_create(
                        article_url=article_url,
                        defaults={
                            "headline": article_data["headline"],
                            "description": article_data["description"],
                            "image_url": article_data["image_url"],
                            "source": article_data["source"],
                            "author": article_data["author"],
                            "published_at": article_data["published_at"],
                            "language": article_data["language"],
                        },
                    )

                    if created:
                        saved += 1
                    else:
                        duplicates += 1

                    NewsConstituency.objects.get_or_create(
                        article=article,
                        constituency=constituency,
                        defaults={
                            "relevance_score": 0.0,
                            "matching_method": "keyword",
                        },
                    )

    log.discovered = discovered
    log.saved = saved
    log.duplicates = duplicates
    log.completed_at = timezone.now()
    log.error_message = "\n".join(errors)

    if errors and saved == 0:
        log.status = "failed"
    elif errors:
        log.status = "partial"
    else:
        log.status = "success"

    log.save()

    return log
