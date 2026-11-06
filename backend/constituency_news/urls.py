from django.urls import path

from .views import constituency_news_list


urlpatterns = [
    path("", constituency_news_list, name="constituency-news-list"),
]