
from django.core.management.base import BaseCommand, CommandError

from constituency_news.services.collector import (
    collect_constituency_news,
)


class Command(BaseCommand):
    help = "Collect English and Tamil news for active constituencies."

    def handle(self, *args, **options):

        self.stdout.write(
            self.style.NOTICE(
                "Starting constituency news collection..."
            )
        )

        try:
            log = collect_constituency_news()

        except Exception as error:
            raise CommandError(
                f"News collection failed: {error}"
            ) from error

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS("Collection process finished.")
        )

        self.stdout.write(f"Status: {log.status}")
        self.stdout.write(f"Articles discovered: {log.discovered}")
        self.stdout.write(f"New articles saved: {log.saved}")
        self.stdout.write(f"Existing articles encountered: {log.duplicates}")

        if log.error_message:
            self.stdout.write(
                self.style.WARNING(
                    "\nCollection errors:\n" + log.error_message
                )
            )
