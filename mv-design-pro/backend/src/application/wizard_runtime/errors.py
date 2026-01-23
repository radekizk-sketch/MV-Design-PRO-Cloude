from __future__ import annotations


class WizardRuntimeError(Exception):
    """Base error for Wizard Runtime operations."""


class NotFound(WizardRuntimeError):
    """Raised when a requested resource does not exist."""


class SessionClosed(WizardRuntimeError):
    """Raised when an operation targets a closed Wizard session."""
