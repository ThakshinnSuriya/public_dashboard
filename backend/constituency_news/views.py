
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import UserProfile

from .models import NewsArticle


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def constituency_news_list(request):

    profile, _ = UserProfile.objects.get_or_create(
        user=request.user
    )

    constituency_id = request.query_params.get(
        "constituency_id"
    )

    # Use active constituency if no ID is supplied
    if constituency_id is None:
        constituency = profile.active_constituency
    else:
        if not constituency_id.isdigit():
            return Response(
                {"error": "Invalid constituency ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        constituency = profile.constituencies.filter(
            id=int(constituency_id)
        ).first()

    if constituency is None:
        return Response(
            {"error": "No valid assigned constituency selected."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    articles = NewsArticle.objects.filter(
        constituency_links__constituency=constituency,
        status="active",
    ).distinct().order_by(
        "-published_at",
        "-collected_at",
    )[:20]

    results = [
        {
            "id": article.id,
            "headline": article.headline,
            "description": article.description,
            "article_url": article.article_url,
            "image_url": article.image_url,
            "source": article.source,
            "author": article.author,
            "published_at": article.published_at,
            "language": article.language,
        }
        for article in articles
    ]

    return Response({
        "constituency": {
            "id": constituency.id,
            "name": constituency.name,
            "state": constituency.state,
        },
        "count": len(results),
        "articles": results,
    })
