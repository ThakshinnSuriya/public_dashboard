
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    ORGANIZATION_TYPES = [
        ("independent", "Independent Researcher"),
        ("political_party", "Political Party"),
        ("company", "Company / Agency"),
        ("education", "Educational Institution"),
        ("other", "Other"),
    ]

    
    USER_TYPES = [
        ("standard", "Standard User"),
        ("mla", "MLA"),
        ("mp", "MP"),
        ("mayor", "Mayor"),
        ("councillor", "Councillor"),
        ("corporator", "Corporator"),
        ("party_chief", "Party Chief"),
        ("analyst", "Political Analyst"),
        ("other", "Other"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    full_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)

    user_type = models.CharField(
        max_length=30,
        choices=USER_TYPES,
        default="standard"
    )

    organization_type = models.CharField(
        max_length=30,
        choices=ORGANIZATION_TYPES,
        blank=True
    )

    organization_name = models.CharField(max_length=200, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    
    constituencies = models.ManyToManyField(
        "Constituency",
        blank=True,
        related_name="assigned_users",
    )

    active_constituency = models.ForeignKey(
        "Constituency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_users",
    )
    is_completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

#Consituency model
class Constituency(models.Model):

    CONSTITUENCY_TYPES = [
        ("assembly", "Assembly"),
        ("parliamentary", "Parliamentary"),
    ]

    name = models.CharField(max_length=200)
    state = models.CharField(max_length=100)

    constituency_type = models.CharField(
        max_length=20,
        choices=CONSTITUENCY_TYPES,
    )

    code = models.CharField(
        max_length=50,
        blank=True,
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "state", "constituency_type"],
                name="unique_constituency_per_state_type",
            )
        ]
        ordering = ["state", "name"]

    def __str__(self):
        return f"{self.name}, {self.state}"