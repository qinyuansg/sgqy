"""Secret resolution.

Configuration never contains secrets inline. A secret is referenced as:

* ``cred:<name>`` - a systemd credential (``ImportCredential=`` in the unit),
  read from ``$CREDENTIALS_DIRECTORY/<name>``. On the kiosk these are sealed
  with ``systemd-creds encrypt --with-key=auto`` in ``/etc/credstore.encrypted``
  on the encrypted root file system.
* ``file:<path>`` - a file readable only by the agent user.
* ``env:<VAR>`` - an environment variable (development and simulation).
"""

from __future__ import annotations

import os
from pathlib import Path


class CredentialError(LookupError):
    pass


def resolve_secret(ref: str) -> bytes | None:
    """Return the secret bytes for *ref*, ``None`` for an empty reference."""
    if not ref:
        return None
    scheme, _, name = ref.partition(":")
    if not name:
        raise CredentialError("secret references must look like cred:NAME, file:PATH or env:VAR")
    if scheme == "cred":
        directory = os.environ.get("CREDENTIALS_DIRECTORY")
        if not directory:
            raise CredentialError(f"credential {name!r} requested but CREDENTIALS_DIRECTORY is unset")
        path = Path(directory) / name
    elif scheme == "file":
        path = Path(name)
    elif scheme == "env":
        value = os.environ.get(name)
        if value is None:
            raise CredentialError(f"environment variable {name} is not set")
        return value.encode()
    else:
        raise CredentialError(f"unknown secret scheme {scheme!r}")
    try:
        return path.read_bytes().strip()
    except OSError as exc:
        raise CredentialError(f"cannot read secret {ref!r}: {exc.strerror}") from None


def resolve_text(ref: str) -> str | None:
    value = resolve_secret(ref)
    return value.decode() if value is not None else None
