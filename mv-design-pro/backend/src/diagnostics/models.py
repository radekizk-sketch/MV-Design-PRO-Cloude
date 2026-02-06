"""
Modele danych diagnostyki inżynierskiej ENM (v4.2).

Frozen dataclasses — wyniki diagnostyki są niemutowalne.
Deterministyczne sortowanie wyników.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class DiagnosticSeverity(Enum):
    """Poziom ważności problemu diagnostycznego."""

    BLOCKER = "BLOCKER"  # Blokuje analizę
    WARN = "WARN"  # Ostrzeżenie — analiza możliwa z ograniczeniami
    INFO = "INFO"  # Informacja — bez wpływu na analizy


class DiagnosticStatus(Enum):
    """Ogólny status raportu diagnostycznego."""

    OK = "OK"
    WARN = "WARN"
    FAIL = "FAIL"


class AnalysisType(Enum):
    """Typy analiz dostępnych w systemie."""

    SC_3F = "SC_3F"  # Zwarcie trójfazowe symetryczne
    SC_1F = "SC_1F"  # Zwarcie jednofazowe
    LF = "LF"  # Rozpływ mocy (Load Flow)
    PROTECTION = "PROTECTION"  # Koordynacja zabezpieczeń


class AnalysisAvailability(Enum):
    """Status dostępności analizy."""

    AVAILABLE = "AVAILABLE"
    BLOCKED = "BLOCKED"


@dataclass(frozen=True)
class DiagnosticIssue:
    """
    Pojedynczy problem diagnostyczny wykryty w ENM.

    Attributes:
        code: Stabilny kod błędu (np. "E-D01", "W-D01", "I-D01").
        severity: Poziom ważności (BLOCKER / WARN / INFO).
        message_pl: Komunikat po polsku (wyświetlany w UI).
        affected_refs: Lista ID elementów, których dotyczy problem.
        hints: Wskazówki naprawcze po polsku.
    """

    code: str
    severity: DiagnosticSeverity
    message_pl: str
    affected_refs: tuple[str, ...] = field(default_factory=tuple)
    hints: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "severity": self.severity.value,
            "message_pl": self.message_pl,
            "affected_refs": list(self.affected_refs),
            "hints": list(self.hints),
        }


@dataclass(frozen=True)
class AnalysisMatrixEntry:
    """Status jednego typu analizy w macierzy dostępności."""

    analysis_type: AnalysisType
    availability: AnalysisAvailability
    reason_pl: str | None = None
    blocking_codes: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "analysis_type": self.analysis_type.value,
            "availability": self.availability.value,
            "reason_pl": self.reason_pl,
            "blocking_codes": list(self.blocking_codes),
        }


@dataclass(frozen=True)
class AnalysisMatrix:
    """Macierz dostępności analiz — co i dlaczego można policzyć."""

    entries: tuple[AnalysisMatrixEntry, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "entries": [e.to_dict() for e in self.entries],
        }

    def get(self, analysis_type: AnalysisType) -> AnalysisMatrixEntry | None:
        for entry in self.entries:
            if entry.analysis_type == analysis_type:
                return entry
        return None


@dataclass(frozen=True)
class DiagnosticReport:
    """
    Raport diagnostyczny ENM.

    Attributes:
        status: Ogólny status (OK / WARN / FAIL).
        issues: Krotka problemów diagnostycznych (deterministycznie posortowana).
        analysis_matrix: Macierz dostępności analiz.
    """

    status: DiagnosticStatus
    issues: tuple[DiagnosticIssue, ...] = field(default_factory=tuple)
    analysis_matrix: AnalysisMatrix = field(default_factory=AnalysisMatrix)

    @property
    def blockers(self) -> list[DiagnosticIssue]:
        return [i for i in self.issues if i.severity == DiagnosticSeverity.BLOCKER]

    @property
    def warnings(self) -> list[DiagnosticIssue]:
        return [i for i in self.issues if i.severity == DiagnosticSeverity.WARN]

    @property
    def infos(self) -> list[DiagnosticIssue]:
        return [i for i in self.issues if i.severity == DiagnosticSeverity.INFO]

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "issues": [i.to_dict() for i in self.issues],
            "analysis_matrix": self.analysis_matrix.to_dict(),
            "blocker_count": len(self.blockers),
            "warning_count": len(self.warnings),
            "info_count": len(self.infos),
        }
