from __future__ import annotations

from domain.validation import ValidationReport


class NetworkWizardError(Exception):
    pass


class NotFound(NetworkWizardError):
    pass


class Conflict(NetworkWizardError):
    pass


class ValidationFailed(NetworkWizardError):
    def __init__(self, report: ValidationReport) -> None:
        super().__init__("Network validation failed")
        self.report = report
