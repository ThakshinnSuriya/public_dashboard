
from django.contrib import admin
from .models import UserProfile


from django.contrib import admin
from .models import UserProfile, Constituency


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "full_name",
        "user_type",
        "organization_name",
        "active_constituency",
        "is_completed",
    )

    list_filter = (
        "user_type",
        "organization_type",
        "is_completed",
    )

    search_fields = (
        "user__username",
        "user__email",
        "full_name",
        "organization_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )


@admin.register(Constituency)
class ConstituencyAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "state",
        "constituency_type",
        "code",
        "is_active",
    )

    list_filter = (
        "state",
        "constituency_type",
        "is_active",
    )

    search_fields = (
        "name",
        "state",
        "code",
    )