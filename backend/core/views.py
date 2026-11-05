
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q

from .models import UserProfile, Constituency

User = get_user_model()

# health check
def health_check(request):
    return JsonResponse({
        "status": "success",
        "message": "Political Dashboard backend is running",
        "service": "Political Dashboard API",
        "timestamp": timezone.now().isoformat(),
    })


#authentication
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get("username", "").strip()
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")

    if not all(isinstance(value, str) for value in (username, email, password)):
        return Response(
            {"error": "Username, email and password must be text."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not username or not email or not password:
        return Response(
            {"error": "Username, email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username__iexact=username).exists():
        return Response(
            {"error": "Username is already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"error": "Email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_email(email)
        validate_password(password)
    except ValidationError as exc:
        return Response(
            {"error": list(exc.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
    )

    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            "message": "Account created successfully.",
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    if not isinstance(username, str) or not isinstance(password, str):
        return Response(
            {"error": "Username and password must be text."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(
        request,
        username=username.strip(),
        password=password,
    )

    if user is None:
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "message": "Login successful.",
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    request.auth.delete()

    return Response({"message": "Logout successful."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user

    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
    })


#User Profile

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    profile, created = UserProfile.objects.get_or_create(
        user=request.user
    )

    # GET PROFILE
    if request.method == "GET":
        assigned_constituencies = profile.constituencies.all()

        return Response({
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "full_name": profile.full_name,
            "phone_number": profile.phone_number,
            "user_type": profile.user_type,
            "organization_type": profile.organization_type,
            "organization_name": profile.organization_name,
            "designation": profile.designation,
            "constituencies": [
                {
                    "id": c.id,
                    "name": c.name,
                    "state": c.state,
                    "type": c.constituency_type,
                }
                for c in assigned_constituencies
            ],
            "active_constituency": (
                {
                    "id": profile.active_constituency.id,
                    "name": profile.active_constituency.name,
                    "state": profile.active_constituency.state,
                    "type": profile.active_constituency.constituency_type,
                }
                if profile.active_constituency else None
            ),
            "is_completed": profile.is_completed,
        })

    # VALIDATE TEXT FIELDS
    text_fields = [
        "full_name",
        "phone_number",
        "user_type",
        "organization_type",
        "organization_name",
        "designation",
    ]

    for field in text_fields:
        if field in request.data:
            value = request.data[field]

            if not isinstance(value, str):
                return Response(
                    {"error": f"{field} must be text."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            setattr(profile, field, value.strip())

    # VALIDATE ORGANIZATION TYPE
    valid_organization_types = dict(UserProfile.ORGANIZATION_TYPES)

    if profile.organization_type not in valid_organization_types:
        return Response(
            {"error": "Invalid organization type."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # VALIDATE USER TYPE
    if profile.organization_type == "political_party":
        allowed_user_types = {
            "mla",
            "mp",
            "mayor",
            "councillor",
            "corporator",
            "party_chief",
            "analyst",
        }
    else:
        allowed_user_types = {"analyst"}

    if profile.user_type not in allowed_user_types:
        return Response(
            {"error": "Invalid user type for the selected organization."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # DETERMINE MULTIPLE-CONSTITUENCY PERMISSION
    allows_multiple = profile.user_type in {
        "party_chief",
        "analyst",
    }

    # UPDATE ASSIGNED CONSTITUENCIES
    if "constituency_ids" in request.data:
        constituency_ids = request.data["constituency_ids"]

        if not isinstance(constituency_ids, list):
            return Response(
                {"error": "constituency_ids must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not all(
            isinstance(cid, int) and not isinstance(cid, bool)
            for cid in constituency_ids
        ):
            return Response(
                {"error": "Constituency IDs must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(constituency_ids) != len(set(constituency_ids)):
            return Response(
                {"error": "Duplicate constituency IDs are not allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not allows_multiple and len(constituency_ids) > 1:
            return Response(
                {"error": "This user type can select only one constituency."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        selected_constituencies = list(
            Constituency.objects.filter(
                id__in=constituency_ids,
                is_active=True,
            )
        )

        if len(selected_constituencies) != len(constituency_ids):
            return Response(
                {"error": "One or more constituencies are invalid or inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.constituencies.set(selected_constituencies)

        # Keep active constituency valid
        if (
            profile.active_constituency_id not in constituency_ids
        ):
            profile.active_constituency = (
                selected_constituencies[0]
                if selected_constituencies else None
            )

    # UPDATE ACTIVE CONSTITUENCY
    if "active_constituency_id" in request.data:
        active_id = request.data["active_constituency_id"]

        if active_id is not None:
            if not isinstance(active_id, int) or isinstance(active_id, bool):
                return Response(
                    {"error": "active_constituency_id must be an integer or null."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not profile.constituencies.filter(id=active_id).exists():
                return Response(
                    {"error": "Selected constituency is not assigned to this user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            profile.active_constituency_id = active_id
        else:
            profile.active_constituency = None

    # SAVE PROFILE
    profile.is_completed = bool(
        profile.full_name
        and profile.phone_number
        and profile.constituencies.exists()
        and profile.active_constituency_id
    )

    profile.save()

    return Response({
        "message": "Profile updated successfully.",
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "full_name": profile.full_name,
        "phone_number": profile.phone_number,
        "user_type": profile.user_type,
        "organization_type": profile.organization_type,
        "organization_name": profile.organization_name,
        "designation": profile.designation,
        "constituencies": [
            {
                "id": c.id,
                "name": c.name,
                "state": c.state,
                "type": c.constituency_type,
            }
            for c in profile.constituencies.all()
        ],
        "active_constituency": (
            {
                "id": profile.active_constituency.id,
                "name": profile.active_constituency.name,
                "state": profile.active_constituency.state,
                "type": profile.active_constituency.constituency_type,
            }
            if profile.active_constituency else None
        ),
        "is_completed": profile.is_completed,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_constituencies(request):
    search_query = request.query_params.get("search", "").strip()

    if len(search_query) < 2:
        return Response([])

    constituencies = Constituency.objects.filter(
        is_active=True
    ).filter(
        Q(name__icontains=search_query)
        | Q(state__icontains=search_query)
        | Q(code__icontains=search_query)
    )[:20]

    results = [
        {
            "id": c.id,
            "name": c.name,
            "state": c.state,
            "type": c.constituency_type,
            "code": c.code,
        }
        for c in constituencies
    ]

    return Response(results)
