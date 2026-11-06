from django.contrib import admin
from .models import NewsArticle, NewsConstituency, NewsCollectionLog


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
    list_display = (
        "headline",
        "source",
        "language",
        "published_at",
        "status",
    )

    list_filter = (
        "status",
        "language",
        "source",
    )

    search_fields = (
        "headline",
        "description",
        "source",
    )

    readonly_fields = ("collected_at",)


@admin.register(NewsConstituency)
class NewsConstituencyAdmin(admin.ModelAdmin):
    list_display = (
        "article",
        "constituency",
        "relevance_score",
        "matching_method",
    )

    list_filter = (
        "matching_method",
        "constituency",
    )

    search_fields = (
        "article__headline",
        "constituency__name",
    )


@admin.register(NewsCollectionLog)
class NewsCollectionLogAdmin(admin.ModelAdmin):
    list_display = (
        "started_at",
        "completed_at",
        "discovered",
        "saved",
        "duplicates",
        "status",
    )

    list_filter = ("status",)

    readonly_fields = (
        "started_at",
        "completed_at",
    )