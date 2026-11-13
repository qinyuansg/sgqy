"""Generic REST/webhook VMS adapter, mapped onto a concrete VMS through YAML.

Example (``vms:`` section of the site config)::

    vms:
      adapter: rest
      base_url: https://vms.example.com/api/v1
      api_key: cred:foyer-vms-api-key
      endpoints:
        hosts: {method: GET, path: /people, query: {search: "{query}", top: "{limit}"}}
      response_map:
        hosts_list: value
        host: {id: personId, name: displayName, department: org.unit}
      webhook:
        url: https://hooks.example.com/foyer
        secret: cred:foyer-webhook-secret

Anything not configured falls back to :data:`DEFAULT_ENDPOINTS` /
:data:`DEFAULT_RESPONSE_MAP`, which is also the API of the bundled mock VMS.
Response fields are addressed with dotted paths. Visits are POSTed as the
canonical JSON of :meth:`VisitSubmission.to_payload`. TLS is mandatory; when
``identity.client_cert`` is set the kiosk authenticates with mTLS using the
ATECC608B-held key (see :func:`client_ssl_context`).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import ssl
from typing import Any
from urllib.parse import quote, urlsplit

import aiohttp

from ..config import IdentityConfig, VmsConfig
from ..credentials import resolve_secret, resolve_text
from .base import Host, Invitation, VisitResult, VisitSubmission, VmsAdapter, VmsRejected, VmsUnavailable

log = logging.getLogger(__name__)

DEFAULT_ENDPOINTS: dict[str, dict[str, Any]] = {
    "invitation": {"method": "GET", "path": "/invitations/{code}"},
    "hosts": {"method": "GET", "path": "/hosts", "query": {"q": "{query}", "limit": "{limit}"}},
    "visit": {"method": "POST", "path": "/visits"},
    "health": {"method": "GET", "path": "/health"},
}

DEFAULT_RESPONSE_MAP: dict[str, Any] = {
    "hosts_list": "items",
    "host": {"id": "id", "name": "name", "department": "department"},
    "invitation": {
        "code": "code",
        "visitor_first_name": "visitor.firstName",
        "visitor_last_name": "visitor.lastName",
        "visitor_company": "visitor.company",
        "host": "host",
        "purpose": "purpose",
        "starts_at": "startsAt",
    },
    "visit": {
        "visit_id": "id",
        "status": "status",
        "host_name": "host.name",
        "badge_number": "badge.number",
        "pass_url": "mobilePass.url",
        "valid_until": "validUntil",
    },
}

LOCAL_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})


def get_path(data: Any, path: str) -> Any:
    for part in path.split(".") if path else []:
        if isinstance(data, dict):
            data = data.get(part)
        elif isinstance(data, list) and part.isdigit() and int(part) < len(data):
            data = data[int(part)]
        else:
            return None
    return data


def _merged(defaults: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    merged = dict(defaults)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


def require_tls(url: str, what: str) -> None:
    parts = urlsplit(url)
    if parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in LOCAL_HOSTS):
        raise ValueError(f"{what} must use https (plain http is only allowed for localhost)")


def client_ssl_context(identity: IdentityConfig, ca_file: str = "") -> ssl.SSLContext:
    """TLS context with optional client certificate. ``client_key`` may be a
    regular PEM key or a PEM-wrapped PKCS#11 URI; the latter is resolved by
    OpenSSL's pkcs11-provider (``OPENSSL_CONF`` set by the systemd unit), so the
    private key never leaves the secure element."""
    context = ssl.create_default_context(cafile=ca_file or None)
    if identity.client_cert:
        context.load_cert_chain(identity.client_cert, identity.client_key or None)
    return context


def sign_webhook(secret: bytes, body: bytes) -> str:
    return "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()


class RestVmsAdapter(VmsAdapter):
    def __init__(self, cfg: VmsConfig, identity: IdentityConfig) -> None:
        require_tls(cfg.base_url, "vms.base_url")
        if cfg.webhook.url:
            require_tls(cfg.webhook.url, "vms.webhook.url")
        self._base = cfg.base_url.rstrip("/")
        self._endpoints = _merged(DEFAULT_ENDPOINTS, cfg.endpoints)
        self._map = _merged(DEFAULT_RESPONSE_MAP, cfg.response_map)
        self._timeout = aiohttp.ClientTimeout(total=cfg.timeout_s)
        self._ssl = client_ssl_context(identity, cfg.ca_file)
        self._headers = {"Accept": "application/json", "User-Agent": "foyer-agent"}
        key = resolve_text(cfg.api_key)
        if key:
            self._headers[cfg.auth_header] = f"{cfg.auth_scheme} {key}".strip()
        self._webhook_url = cfg.webhook.url
        self._webhook_secret = resolve_secret(cfg.webhook.secret) if cfg.webhook.url else None
        self._session: aiohttp.ClientSession | None = None

    def _client(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=self._timeout, headers=self._headers, connector=aiohttp.TCPConnector(ssl=self._ssl)
            )
        return self._session

    async def _call(self, endpoint: str, *, params: dict[str, Any], body: Any = None) -> tuple[int, Any]:
        spec = self._endpoints[endpoint]
        path = spec["path"].format(**{k: quote(str(v), safe="") for k, v in params.items()})
        query = {k: str(v).format(**params) for k, v in spec.get("query", {}).items()}
        try:
            async with self._client().request(
                spec.get("method", "GET"), self._base + path, params=query or None, json=body
            ) as resp:
                status = resp.status
                payload = await resp.json(content_type=None) if resp.content_length != 0 else None
        except (TimeoutError, aiohttp.ClientError, json.JSONDecodeError) as exc:
            raise VmsUnavailable(type(exc).__name__) from None
        if status >= 500 or status in (408, 429):
            raise VmsUnavailable(f"HTTP {status}")
        return status, payload

    def _host(self, data: Any) -> Host:
        m = self._map["host"]
        return Host(
            id=str(get_path(data, m["id"])),
            name=str(get_path(data, m["name"]) or ""),
            department=str(get_path(data, m["department"]) or ""),
        )

    async def lookup_invitation(self, code: str) -> Invitation | None:
        status, data = await self._call("invitation", params={"code": code})
        if status == 404:
            return None
        if status >= 400:
            raise VmsRejected(f"HTTP {status}")
        m = self._map["invitation"]

        def field(name: str) -> str:
            return str(get_path(data, m[name]) or "")

        return Invitation(
            code=field("code") or code,
            visitor_first_name=field("visitor_first_name"),
            visitor_last_name=field("visitor_last_name"),
            visitor_company=field("visitor_company"),
            host=self._host(get_path(data, m["host"])),
            purpose=field("purpose") or "meeting",
            starts_at=field("starts_at"),
        )

    async def search_hosts(self, query: str, limit: int = 8) -> list[Host]:
        status, data = await self._call("hosts", params={"query": query, "limit": limit})
        if status >= 400:
            raise VmsRejected(f"HTTP {status}")
        items = get_path(data, self._map["hosts_list"]) or []
        return [self._host(item) for item in items[:limit]]

    async def submit_visit(self, visit: VisitSubmission) -> VisitResult:
        status, data = await self._call("visit", params={}, body=visit.to_payload())
        if status >= 400:
            raise VmsRejected(f"HTTP {status}")
        m = self._map["visit"]
        result = VisitResult(
            visit_id=str(get_path(data, m["visit_id"])),
            status=str(get_path(data, m["status"]) or "pending"),
            host_name=str(get_path(data, m["host_name"]) or ""),
            badge_number=str(get_path(data, m["badge_number"]) or ""),
            pass_url=get_path(data, m["pass_url"]),
            valid_until=get_path(data, m["valid_until"]),
        )
        if self._webhook_url:
            await self._notify_webhook(result, visit)
        return result

    async def _notify_webhook(self, result: VisitResult, visit: VisitSubmission) -> None:
        """Signed, PII-free notification for downstream automation (e.g. chat alerts)."""
        body = json.dumps(
            {
                "event": "visit.created",
                "visitId": result.visit_id,
                "status": result.status,
                "hostId": visit.host_id,
                "deviceId": visit.device_id,
            },
            separators=(",", ":"),
        ).encode()
        headers = {"Content-Type": "application/json"}
        if self._webhook_secret:
            headers["X-Foyer-Signature"] = sign_webhook(self._webhook_secret, body)
        try:
            async with self._client().post(self._webhook_url, data=body, headers=headers) as resp:
                if resp.status >= 300:
                    log.warning("vms webhook answered HTTP %d", resp.status)
        except (TimeoutError, aiohttp.ClientError) as exc:
            log.warning("vms webhook failed: %s", type(exc).__name__)

    async def ping(self) -> bool:
        try:
            status, _ = await self._call("health", params={})
        except VmsUnavailable:
            return False
        return status < 400

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()
