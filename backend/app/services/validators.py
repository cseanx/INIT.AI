"""Shared validation helpers for account flows."""

import re

# Supported roles (exact strings stored in DB)
ALLOWED_ROLES = {"LGU Administrator", "Climate Analyst", "Field Coordinator"}
# Public registration may only create these roles. LGU Administrator requires out-of-band promotion.
PUBLIC_ROLES = {"Climate Analyst", "Field Coordinator"}
DEFAULT_ROLE = "Climate Analyst"

# Minimum password: 8 chars; must contain something beyond whitespace.
# We keep it simple but production-friendly: 8+ chars, not entirely whitespace.
# The spec says "minimum password requirements" — enforce 8 chars and not trivial.
MIN_PASSWORD_LENGTH = 8

def validate_password(password: str) -> str | None:
    """Return error message if password is weak, else None."""
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if password.strip() == "":
        return "Password must not be empty."
    # Simple strength: at least one letter + one digit encourages not "password"
    # but we allow any if they meet length to avoid over-strictness.
    # Uncomment to enforce:
    # has_letter = any(c.isalpha() for c in password)
    # has_digit = any(c.isdigit() for c in password)
    # if not (has_letter and has_digit):
    #     return "Password must contain at least one letter and one number."
    return None


def normalize_role(requested: str | None) -> str:
    """Return safe role for registration. Defaults to Climate Analyst; blocks LGU Administrator."""
    if not requested:
        return DEFAULT_ROLE
    cleaned = requested.strip()
    if cleaned not in ALLOWED_ROLES:
        return DEFAULT_ROLE
    if cleaned == "LGU Administrator":
        # Prototype-friendly: do not allow self-promotion. Downgrade to default.
        return DEFAULT_ROLE
    return cleaned


def is_valid_organization(org: str | None) -> bool:
    if org is None:
        return False
    return len(org.strip()) >= 2


_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def is_valid_email(email: str) -> bool:
    return bool(_EMAIL_RE.match(email.strip()))
