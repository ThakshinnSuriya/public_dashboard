
from django.db import models
from core.models import Constituency


class NewsArticle(models.Model):

    STATUS_CHOICES = [
        ("active", "Active"),
        ("archived", "Archived"),
        ("rejected", "Rejected"),
    ]

    headline = models.CharField(max_length=500)
    description = models.TextField(blank=True)

    article_url = models.URLField(max_length=1000, unique=True)
    image_url = models.URLField(max_length=1000, blank=True)

    source = models.CharField(max_length=200)
    author = models.CharField(max_length=200, blank=True)

    published_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(auto_now_add=True)

    language = models.CharField(max_length=20, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active"
    )

    class Meta:
        ordering = ["-published_at", "-collected_at"]

    def __str__(self):
        return self.headline


class NewsConstituency(models.Model):

    MATCHING_METHODS = [
        ("keyword", "Keyword Matching"),
        ("location", "Location Matching"),
        ("manual", "Manual Assignment"),
    ]

    article = models.ForeignKey(
        NewsArticle,
        on_delete=models.CASCADE,
        related_name="constituency_links"
    )

    constituency = models.ForeignKey(
        Constituency,
        on_delete=models.CASCADE,
        related_name="news_links"
    )

    relevance_score = models.FloatField(default=0.0)

    matching_method = models.CharField(
        max_length=20,
        choices=MATCHING_METHODS,
        default="keyword"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["article", "constituency"],
                name="unique_news_constituency"
            )
        ]

    def __str__(self):
        return f"{self.article.headline} - {self.constituency.name}"


class NewsCollectionLog(models.Model):

    STATUS_CHOICES = [
        ("running", "Running"),
        ("success", "Success"),
        ("partial", "Partial Success"),
        ("failed", "Failed"),
    ]

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    discovered = models.PositiveIntegerField(default=0)
    saved = models.PositiveIntegerField(default=0)
    duplicates = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="running"
    )

    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"News Collection - {self.started_at}"
