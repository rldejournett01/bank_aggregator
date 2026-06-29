"""
Lightweight audit logging for security-relevant events.

Emits structured lines to the `cashism.audit` logger (stdout by default, so
container/platform log collection captures them).

TODO: persist audit events to a dedicated, append-only table and/or ship to a
SIEM for tamper-evident retention (GLBA Safeguards expects access logging).
"""
import logging

audit_logger = logging.getLogger("cashism.audit")


def audit(event: str, request=None, user_id=None, **details) -> None:
    parts = [f"event={event}"]
    if user_id is not None:
        parts.append(f"user_id={user_id}")
    if request is not None and getattr(request, "client", None):
        parts.append(f"ip={request.client.host}")
    for key, value in details.items():
        parts.append(f"{key}={value}")
    audit_logger.info(" ".join(parts))
