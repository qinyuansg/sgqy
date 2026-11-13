"""Enrolment steps: invitation lookup, visitor details, ID scan, face capture,
consent, submission (VMS or encrypted offline queue), badge and pass.

Every step operates on the current :class:`~foyer_agent.session.Session`;
the session is wiped as soon as the visit has been handed to the VMS (or
sealed into the offline queue).
"""

from __future__ import annotations

import base64
import binascii
import datetime as dt
import io
import logging
import secrets
from dataclasses import dataclass
from typing import Any

from PIL import Image

from .badge import BadgeData, badge_pdf, render_badge
from .config import Config
from .events import EventBus
from .hal import Devices
from .hal.id_reader import IdReadError
from .hal.lightbar import LightState
from .hal.printer import PrintError
from .offline_queue import OfflineQueue, QueueFull
from .power import PowerManager
from .qr_render import qr_svg
from .sensitive import SensitiveBytes
from .session import Consent, EndReason, Session, SessionManager, SessionNotFound
from .vms.base import (
    DocumentSummary,
    Host,
    VisitResult,
    VisitSubmission,
    VmsAdapter,
    VmsRejected,
    VmsUnavailable,
)

log = logging.getLogger(__name__)

MAX_NAME = 80
MAX_SIGNATURE_BYTES = 512 * 1024
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class EnrolmentError(Exception):
    """A user-facing failure; ``code`` is an i18n key suffix in the UI."""

    def __init__(self, code: str, status: int = 409) -> None:
        super().__init__(code)
        self.code = code
        self.status = status


@dataclass
class HostCandidates:
    hosts: dict[str, Host]


def _clean(value: Any, field: str, *, required: bool = True) -> str:
    text = " ".join(str(value or "").split())
    if (required and not text) or len(text) > MAX_NAME:
        raise EnrolmentError(f"invalid_{field}", 422)
    return text


def _title(name: str) -> str:
    return " ".join(part.capitalize() for part in name.split())


def _utc_now() -> str:
    return dt.datetime.now(dt.UTC).isoformat(timespec="seconds")


def _thumbnail_data_url(jpeg: SensitiveBytes, size: int = 480) -> str:
    image = Image.open(io.BytesIO(jpeg.view()))
    image.thumbnail((size, size))
    buf = io.BytesIO()
    image.convert("RGB").save(buf, "JPEG", quality=82)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _time_label(iso: str | None) -> str:
    if not iso:
        return "today"
    try:
        return dt.datetime.fromisoformat(iso).strftime("%H:%M")
    except ValueError:
        return iso


class EnrolmentService:
    def __init__(
        self,
        cfg: Config,
        devices: Devices,
        sessions: SessionManager,
        vms: VmsAdapter,
        queue: OfflineQueue,
        power: PowerManager,
        bus: EventBus,
    ) -> None:
        self._cfg, self._dev, self._sessions = cfg, devices, sessions
        self._vms, self._queue, self._power, self._bus = vms, queue, power, bus
        self._candidates: dict[str, HostCandidates] = {}

    # -- invitation / visitor details -------------------------------------------------

    async def lookup_invitation(self, session: Session, code: str) -> dict[str, Any]:
        code = code.strip()
        if not code or len(code) > self._cfg.hardware.qr.max_length:
            raise EnrolmentError("invitation_not_found", 404)
        try:
            invitation = await self._vms.lookup_invitation(code)
        except VmsUnavailable:
            raise EnrolmentError("vms_offline", 503) from None
        except VmsRejected:
            raise EnrolmentError("invitation_not_found", 404) from None
        if invitation is None:
            raise EnrolmentError("invitation_not_found", 404)
        session.mode = "invite"
        session.invitation = invitation
        session.first_name = invitation.visitor_first_name
        session.last_name = invitation.visitor_last_name
        session.company = invitation.visitor_company
        session.host = invitation.host
        session.purpose = invitation.purpose
        return {
            "firstName": invitation.visitor_first_name,
            "lastName": invitation.visitor_last_name,
            "company": invitation.visitor_company,
            "host": {"name": invitation.host.name, "department": invitation.host.department},
            "time": _time_label(invitation.starts_at) if invitation.starts_at else None,
        }

    async def search_hosts(self, session: Session, query: str) -> list[dict[str, str]]:
        query = query.strip()[:MAX_NAME]
        if len(query) < 2:
            return []
        try:
            hosts = await self._vms.search_hosts(query)
        except VmsUnavailable:
            raise EnrolmentError("vms_offline", 503) from None
        candidates = self._candidates.setdefault(session.id, HostCandidates({}))
        candidates.hosts.update({h.id: h for h in hosts})
        return [{"id": h.id, "name": h.name, "department": h.department} for h in hosts]

    def set_visitor(self, session: Session, data: dict[str, Any]) -> None:
        host_id = str(data.get("hostId") or "")
        candidates = self._candidates.get(session.id)
        host = candidates.hosts.get(host_id) if candidates else None
        if host is None:
            raise EnrolmentError("invalid_host", 422)
        purpose = str(data.get("purpose") or "")
        if purpose not in self._cfg.ui.purposes:
            raise EnrolmentError("invalid_purpose", 422)
        session.mode = "walkup"
        session.first_name = _clean(data.get("firstName"), "first_name")
        session.last_name = _clean(data.get("lastName"), "last_name")
        session.company = _clean(data.get("company"), "company", required=False)
        session.host = host
        session.purpose = purpose

    # -- identity document ------------------------------------------------------------

    async def scan_document(self, session: Session) -> dict[str, Any]:
        self._dev.lightbar.set_state(LightState.BUSY)
        try:
            document = await self._dev.id_reader.read(
                lambda stage: self._bus.publish("document.progress", stage=stage),
                self._cfg.hardware.id_reader.timeout_s,
            )
        except IdReadError as exc:
            self._dev.lightbar.set_state(LightState.ERROR)
            raise EnrolmentError(f"document_{exc.reason}", 422) from None
        if session.wiped:  # session ended (timeout/cancel) while the reader was busy
            document.wipe()
            raise SessionNotFound(session.id)
        if document.mrz.expired():
            document.wipe()
            self._dev.lightbar.set_state(LightState.ERROR)
            raise EnrolmentError("document_expired", 422)
        if session.document is not None:
            session.document.wipe()
        session.document = document
        # The document is authoritative for the visitor's legal name.
        session.first_name = _title(document.mrz.given_names)
        session.last_name = _title(document.mrz.surname)
        self._dev.lightbar.set_state(LightState.SUCCESS)
        return {
            "firstName": session.first_name,
            "lastName": session.last_name,
            "documentType": "passport" if document.mrz.document_type.startswith("P") else "id_card",
            "issuingState": document.mrz.issuing_state,
            "chipVerified": document.chip_verified,
        }

    # -- face + liveness --------------------------------------------------------------

    async def capture_face(self, session: Session) -> dict[str, Any]:
        max_attempts = self._cfg.session.max_face_attempts
        if session.face_attempts >= max_attempts:
            raise EnrolmentError("face_attempts_exhausted", 429)
        session.face_attempts += 1
        self._dev.lightbar.set_state(LightState.BUSY)
        ir_frame: SensitiveBytes | None = None
        rgb: SensitiveBytes | None = None
        try:
            rgb = await self._dev.rgb_camera.capture()
            self._dev.ir.set_duty(self._cfg.hardware.liveness.ir_duty)
            try:
                ir_frame = await self._dev.ir_camera.capture()
            finally:
                self._dev.ir.off()
            result = await self._dev.liveness.evaluate(rgb, ir_frame)
        except OSError:
            if rgb is not None:
                rgb.wipe()
            self._dev.lightbar.set_state(LightState.ERROR)
            raise EnrolmentError("camera_unavailable", 503) from None
        finally:
            if ir_frame is not None:
                ir_frame.wipe()  # IR frames are only used for the liveness decision
        if session.wiped:
            rgb.wipe()
            raise SessionNotFound(session.id)
        if not result.passed:
            rgb.wipe()
            self._dev.lightbar.set_state(LightState.ERROR)
            return {"passed": False, "attemptsLeft": max_attempts - session.face_attempts}
        if session.portrait is not None:
            session.portrait.wipe()
        session.portrait = rgb
        session.liveness_score = result.score
        self._dev.lightbar.set_state(LightState.SUCCESS)
        return {"passed": True, "preview": _thumbnail_data_url(rgb)}

    # -- consent ----------------------------------------------------------------------

    def record_consent(self, session: Session, data: dict[str, Any]) -> None:
        if data.get("privacyAccepted") is not True or data.get("rulesAccepted") is not True:
            raise EnrolmentError("consent_required", 422)
        if (
            data.get("privacyVersion") != self._cfg.consent.privacy_version
            or data.get("rulesVersion") != self._cfg.consent.rules_version
        ):
            raise EnrolmentError("consent_outdated", 422)
        prefix, _, encoded = str(data.get("signature") or "").partition("base64,")
        try:
            png = base64.b64decode(encoded, validate=True)
        except binascii.Error:
            raise EnrolmentError("signature_invalid", 422) from None
        if prefix != "data:image/png;" or not png.startswith(PNG_MAGIC) or len(png) > MAX_SIGNATURE_BYTES:
            raise EnrolmentError("signature_invalid", 422)
        if session.consent is not None:
            session.consent.signature_png.wipe()
        session.consent = Consent(
            privacy_version=self._cfg.consent.privacy_version,
            rules_version=self._cfg.consent.rules_version,
            accepted_at=_utc_now(),
            signature_png=SensitiveBytes(png),
        )

    # -- submission -------------------------------------------------------------------

    def _build_submission(self, session: Session) -> VisitSubmission:
        if not (session.mode and session.host and session.last_name):
            raise EnrolmentError("details_missing", 422)
        if session.document is None:
            raise EnrolmentError("document_missing", 422)
        if session.portrait is None:
            raise EnrolmentError("face_missing", 422)
        if session.consent is None:
            raise EnrolmentError("consent_required", 422)
        mrz = session.document.mrz
        return VisitSubmission(
            session_id=session.id,
            device_id=self._cfg.device.id,
            created_at=_utc_now(),
            language=session.language,
            mode=session.mode,
            invitation_code=session.invitation.code if session.invitation else None,
            first_name=session.first_name,
            last_name=session.last_name,
            company=session.company,
            host_id=session.host.id,
            purpose=session.purpose,
            document=DocumentSummary(
                type=mrz.document_type,
                issuing_state=mrz.issuing_state,
                number=mrz.document_number,
                nationality=mrz.nationality,
                birth_date=mrz.birth_date.isoformat(),
                expiry_date=mrz.expiry_date.isoformat(),
                chip_read=session.document.chip_read,
                chip_verified=session.document.chip_verified,
            ),
            portrait_jpeg=bytes(session.portrait.view()),
            liveness_score=session.liveness_score,
            privacy_version=session.consent.privacy_version,
            rules_version=session.consent.rules_version,
            consent_at=session.consent.accepted_at,
            signature_png=bytes(session.consent.signature_png.view()),
        )

    async def submit(self, session: Session) -> dict[str, Any]:
        if session.submitted:
            raise EnrolmentError("already_submitted")
        visit = self._build_submission(session)
        session.submitted = True
        self._dev.lightbar.set_state(LightState.BUSY)
        queued = False
        try:
            result = await self._vms.submit_visit(visit)
        except VmsUnavailable:
            try:
                self._queue.put(visit.to_payload())
            except QueueFull:
                session.submitted = False
                self._dev.lightbar.set_state(LightState.ERROR)
                raise EnrolmentError("offline_queue_full", 503) from None
            queued = True
            result = VisitResult(
                visit_id="",
                status="queued",
                host_name=session.host.name if session.host else "",
                badge_number=f"P-{secrets.randbelow(10**4):04d}",
            )
            log.warning("session %s: vms unreachable, visit sealed into offline queue", session.id)
        except VmsRejected:
            session.submitted = False
            self._dev.lightbar.set_state(LightState.ERROR)
            raise EnrolmentError("vms_rejected", 422) from None

        printable = result.status == "approved" or (queued and self._cfg.queue.allow_provisional_badge)
        printed = await self._print_badge(session, result, provisional=queued) if printable else False
        response = {
            "status": result.status,
            "hostName": result.host_name,
            "badgeNumber": result.badge_number,
            "validUntil": _time_label(result.valid_until) if result.valid_until else None,
            "printed": printed,
            "passQrSvg": qr_svg(result.pass_url) if result.pass_url else None,
        }
        self._dev.lightbar.set_state(LightState.SUCCESS if result.status != "pending" else LightState.ATTENTION)
        # Handed over (or sealed): erase everything we hold about the visitor.
        self._sessions.end(session.id, EndReason.COMPLETED)
        del visit
        return response

    async def _print_badge(self, session: Session, result: VisitResult, provisional: bool) -> bool:
        printer_cfg = self._cfg.hardware.printer
        data = BadgeData(
            first_name=session.first_name,
            last_name=session.last_name,
            company=session.company,
            host_name=result.host_name,
            badge_number=result.badge_number,
            valid_until=_time_label(result.valid_until) if result.valid_until else "end of day",
            organisation=self._cfg.branding.welcome_location,
            qr_data=result.pass_url or result.badge_number,
            photo_jpeg=bytes(session.portrait.view()) if printer_cfg.print_photo and session.portrait else None,
            provisional=provisional,
        )
        try:
            await self._power.print_badge(badge_pdf(render_badge(data, printer_cfg.label, printer_cfg.font_dir)))
        except PrintError as exc:
            log.error("badge print failed: %s", exc)
            return False
        return True

    def forget(self, session_id: str) -> None:
        self._candidates.pop(session_id, None)
