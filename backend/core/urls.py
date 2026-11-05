
from django.urls import path

from .views import (
    health_check,
    register,
    login,
    logout,
    current_user,
    user_profile,
    search_constituencies,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),

    path("auth/register/", register, name="register"),
    path("auth/login/", login, name="login"),
    path("auth/logout/", logout, name="logout"),
    path("auth/me/", current_user, name="current-user"),
    path("profile/", user_profile,name="user-profile"),
    path("constituencies/search/",search_constituencies,name="search-constituencies"),
]
