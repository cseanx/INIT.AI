from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.core.config import settings
from app.services.validators import MIN_PASSWORD_LENGTH, is_valid_email


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    organization: str | None = None
    email_verified: bool = False
    created_at: datetime
    updated_at: datetime | None = None


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    organization: str
    role: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Full name is required.")
        if len(v.strip()) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return v.strip()

    @field_validator("organization")
    @classmethod
    def validate_org(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("LGU / Organization is required.")
        if len(v.strip()) < 2:
            raise ValueError("Organization must be at least 2 characters.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        return v

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm(cls, v: str) -> str:
        if not v:
            raise ValueError("Password confirmation is required.")
        return v


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new(cls, v: str) -> str:
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        return v


class ChangeNameRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Full name is required.")
        if len(v.strip()) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return v.strip()


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    current_password: str


class ChangeEmailVerifyRequest(BaseModel):
    token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new(cls, v: str) -> str:
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        return v


class MessageOut(BaseModel):
    message: str
