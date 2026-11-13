"""Visitor management system (VMS) adapter contract and data model."""

from __future__ import annotations

import base64
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from typing import Any


class VmsError(Exception):
    pass


class VmsUnavailable(VmsError):
    """Network/server failure: the submission may be queued and retried."""


class VmsRejected(VmsError):
    """The VMS refused the request (4xx); retrying will not help."""


@dataclass(frozen=True)
class Host:
    id: str
    name: str
    department: str = ""


@dataclass(frozen=True)
class Invitation:
    code: str
    visitor_first_name: str
    visitor_last_name: str
    visitor_company: str
    host: Host
    purpose: str = "meeting"
    starts_at: str = ""


@dataclass(frozen=True)
class DocumentSummary:
    type: str
    issuing_state: str
    number: str
    nationality: str
    birth_date: str
    expiry_date: str
    chip_read: bool
    chip_verified: bool


@dataclass
class VisitSubmission:
    """Everything sent to the VMS for one visit. Contains personal data: it is
    only ever held in memory, in the encrypted offline queue, or on the wire."""

    session_id: str
    device_id: str
    created_at: str  # ISO 8601 UTC
    language: str
    mode: str  # invite | walkup
    invitation_code: str | None
    first_name: str
    last_name: str
    company: str
    host_id: str
    purpose: str
    document: DocumentSummary | None
    portrait_jpeg: bytes | None
    liveness_score: float | None
    privacy_version: str
    rules_version: str
    consent_at: str
    signature_png: bytes | None

    def __repr__(self) -> str:  # never leak personal data into logs or tracebacks
        return f"<VisitSubmission session={self.session_id}>"

    def to_payload(self) -> dict[str, Any]:
        def b64(data: bytes | None) -> str | None:
            return base64.b64encode(data).decode("ascii") if data is not None else None

        return {
            "sessionId": self.session_id,
            "deviceId": self.device_id,
            "createdAt": self.created_at,
            "language": self.language,
            "mode": self.mode,
            "invitationCode": self.invitation_code,
            "visitor": {"firstName": self.first_name, "lastName": self.last_name, "company": self.company},
            "hostId": self.host_id,
            "purpose": self.purpose,
            "document": asdict(self.document) if self.document else None,
            "portraitJpeg": b64(self.portrait_jpeg),
            "livenessScore": self.liveness_score,
            "consent": {
                "privacyVersion": self.privacy_version,
                "rulesVersion": self.rules_version,
                "acceptedAt": self.consent_at,
                "signaturePng": b64(self.signature_png),
            },
        }

    @classmethod
    def from_payload(cls, data: dict[str, Any]) -> VisitSubmission:
        def unb64(value: str | None) -> bytes | None:
            return base64.b64decode(value) if value else None

        consent = data["consent"]
        return cls(
            session_id=data["sessionId"],
            device_id=data["deviceId"],
            created_at=data["createdAt"],
            language=data["language"],
            mode=data["mode"],
            invitation_code=data["invitationCode"],
            first_name=data["visitor"]["firstName"],
            last_name=data["visitor"]["lastName"],
            company=data["visitor"]["company"],
            host_id=data["hostId"],
            purpose=data["purpose"],
            document=DocumentSummary(**data["document"]) if data["document"] else None,
            portrait_jpeg=unb64(data["portraitJpeg"]),
            liveness_score=data["livenessScore"],
            privacy_version=consent["privacyVersion"],
            rules_version=consent["rulesVersion"],
            consent_at=consent["acceptedAt"],
            signature_png=unb64(consent["signaturePng"]),
        )


@dataclass(frozen=True)
class VisitResult:
    visit_id: str
    status: str  # approved | pending
    host_name: str
    badge_number: str
    pass_url: str | None = None
    valid_until: str | None = None


class VmsAdapter(ABC):
    @abstractmethod
    async def lookup_invitation(self, code: str) -> Invitation | None: ...

    @abstractmethod
    async def search_hosts(self, query: str, limit: int = 8) -> list[Host]: ...

    @abstractmethod
    async def submit_visit(self, visit: VisitSubmission) -> VisitResult: ...

    @abstractmethod
    async def ping(self) -> bool: ...

    async def close(self) -> None:
        """Release connections."""
