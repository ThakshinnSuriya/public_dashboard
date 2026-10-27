from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.utils import timezone


def health_check(request):
    return JsonResponse({
        "status": "success",
        "message": "Political Dashboard backend is running",
        "service": "Political Dashboard API",
        "timestamp": timezone.now().isoformat()
    })