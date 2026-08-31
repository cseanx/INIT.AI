"""Email service abstraction — development-safe by default.

No provider is hardcoded. In production, plug a real SMTP / API sender here;
in development, messages are logged to stdout so verification/reset flows
remain fully testable without any credentials.
"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Development-safe email sender. Logs to stdout; swappable for SMTP."""

    def send(self, to: str, subject: str, html_body: str, text_body: str | None = None) -> None:
        if settings.email_log_enabled:
            logger.info("[EMAIL] to=%s subject=%s", to, subject)
            # Print to stdout so Vercel logs and local console both show the link.
            print(f"\n[INIT.AI email] To: {to}")
            print(f"Subject: {subject}")
            print(f"{text_body or html_body}\n")
        # Future: if SMTP settings are present, send via smtplib here.
        # Keeping the interface clean means no caller must change.


email_service = EmailService()


def send_verification_email(to_email: str, name: str, token: str) -> None:
    link = f"{settings.frontend_url.rstrip('/')}/verify-email?token={token}"
    subject = "Verify your INIT.AI account"
    text = (
        f"Hi {name},\n\n"
        f"Thanks for registering on INIT.AI.\n"
        f"Please verify your email by clicking the link below:\n"
        f"{link}\n\n"
        f"This link expires in {settings.email_verification_ttl_hours} hours.\n"
        f"If you did not create this account, you can ignore this email.\n"
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>Thanks for registering on INIT.AI. Please verify your email:</p>"
        f'<p><a href="{link}">{link}</a></p>'
        f"<p>This link expires in {settings.email_verification_ttl_hours} hours.</p>"
    )
    email_service.send(to_email, subject, html, text)


def send_password_reset_email(to_email: str, name: str, token: str) -> None:
    link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    subject = "Reset your INIT.AI password"
    text = (
        f"Hi {name},\n\n"
        f"We received a request to reset your INIT.AI password.\n"
        f"Click the link below to choose a new password:\n"
        f"{link}\n\n"
        f"This link expires in {settings.password_reset_ttl_hours} hour(s).\n"
        f"If you did not request this, you can ignore this email — your password will not change.\n"
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>We received a request to reset your password.</p>"
        f'<p><a href="{link}">{link}</a></p>'
        f"<p>This link expires in {settings.password_reset_ttl_hours} hour(s).</p>"
    )
    email_service.send(to_email, subject, html, text)


def send_email_change_verification(to_email: str, name: str, token: str) -> None:
    link = f"{settings.frontend_url.rstrip('/')}/verify-email-change?token={token}"
    subject = "Confirm your new email for INIT.AI"
    text = (
        f"Hi {name},\n\n"
        f"You requested to change your INIT.AI email to {to_email}.\n"
        f"Please confirm by clicking the link below:\n"
        f"{link}\n\n"
        f"This link expires in {settings.email_change_ttl_hours} hours.\n"
        f"If you did not request this, you can ignore this email.\n"
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>You requested to change your email to {to_email}.</p>"
        f'<p><a href="{link}">{link}</a></p>'
        f"<p>This link expires in {settings.email_change_ttl_hours} hours.</p>"
    )
    email_service.send(to_email, subject, html, text)
