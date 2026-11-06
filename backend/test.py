
import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import Constituency
from constituency_news.services.gnews_client import fetch_articles

ENGLISH_TOPICS = (
    "road OR water OR school OR hospital OR accident "
    "OR agriculture OR transport OR infrastructure"
)

TAMIL_TOPICS = (
    "சாலை OR குடிநீர் OR பள்ளி OR மருத்துவமனை "
    "OR விபத்து OR விவசாயம் OR போக்குவரத்து OR மின்சாரம்"
)

constituencies = Constituency.objects.filter(
    is_active=True,
    constituency_type="assembly",
    state="Tamil Nadu"
)

for constituency in constituencies:

    print("\n" + "=" * 70)
    print("CONSTITUENCY:", constituency.name)
    print("=" * 70)

    queries = {
        "en": f'"{constituency.name}" AND ({ENGLISH_TOPICS})',
        "ta": f'"{constituency.name}" AND ({TAMIL_TOPICS})',
    }

    for language, query in queries.items():

        print(f"\n--- {language.upper()} ---")
        print("Query:", query)

        try:
            articles = fetch_articles(
                query=query,
                language=language,
                max_articles=10
            )

            print("Articles found:", len(articles))

            for index, article in enumerate(articles, 1):
                print(f"\n{index}. {article['headline']}")
                print("Source:", article["source"])

        except Exception as error:
            print("ERROR:", error)
