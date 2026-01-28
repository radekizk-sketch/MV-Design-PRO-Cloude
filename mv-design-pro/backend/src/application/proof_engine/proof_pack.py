from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile

from application.proof_engine.proof_inspector.exporters import (
    export_to_json,
    export_to_pdf,
    export_to_tex,
    is_pdf_export_available,
)
from application.proof_engine.types import ProofDocument, ProofType

_FIXED_ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


@dataclass(frozen=True)
class ProofPackContext:
    project_id: str
    case_id: str
    run_id: str
    snapshot_id: str
    mv_design_pro_version: str | None = None


class ProofPackBuilder:
    def __init__(self, context: ProofPackContext) -> None:
        self._context = context

    def build(self, proof_doc: ProofDocument) -> bytes:
        proof_json = _normalize_newlines(export_to_json(proof_doc)).encode("utf-8")
        proof_tex = _normalize_newlines(export_to_tex(proof_doc)).encode("utf-8")
        proof_pdf = self._maybe_export_pdf(proof_doc)

        file_entries: dict[str, bytes] = {
            "proof_pack/proof.json": proof_json,
            "proof_pack/proof.tex": proof_tex,
        }
        if proof_pdf is not None:
            file_entries["proof_pack/proof.pdf"] = proof_pdf

        manifest = self._build_manifest(proof_doc, file_entries)
        manifest_bytes = _normalize_newlines(
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True)
        ).encode("utf-8")

        return self._build_zip(file_entries, manifest_bytes)

    def _maybe_export_pdf(self, proof_doc: ProofDocument) -> bytes | None:
        if not is_pdf_export_available():
            return None
        try:
            return export_to_pdf(proof_doc)
        except RuntimeError:
            return None

    def _build_manifest(
        self,
        proof_doc: ProofDocument,
        file_entries: dict[str, bytes],
    ) -> dict[str, object]:
        files = []
        for path in sorted(file_entries.keys()):
            payload = file_entries[path]
            files.append(
                {
                    "path": path,
                    "sha256": _sha256_hex(payload),
                    "bytes": len(payload),
                }
            )

        latex_engine = "pdflatex" if "proof_pack/proof.pdf" in file_entries else None

        return {
            "pack_version": "1.0",
            "created_at_utc": _format_datetime_utc(proof_doc.created_at),
            "project_id": self._context.project_id,
            "case_id": self._context.case_id,
            "run_id": self._context.run_id,
            "snapshot_id": self._context.snapshot_id,
            "proof_type": proof_pack_proof_type(proof_doc.proof_type),
            "proof_fingerprint": _sha256_hex(file_entries["proof_pack/proof.json"]),
            "files": files,
            "toolchain": {
                "mv_design_pro_version": self._context.mv_design_pro_version,
                "python_version": _python_version(),
                "latex_engine": latex_engine,
            },
            "determinism": {
                "canonical_json": True,
                "sorted_zip_entries": True,
                "stable_newlines": "LF",
                "notes_pl": (
                    "Pakiet jest deterministyczny dla identycznych wejść i toolchain."
                ),
            },
        }

    def _build_zip(self, file_entries: dict[str, bytes], manifest_bytes: bytes) -> bytes:
        entries = {
            "assets/": b"",
            "proof_pack/": b"",
            "proof_pack/manifest.json": manifest_bytes,
            **file_entries,
        }

        buffer = io.BytesIO()
        with zipfile.ZipFile(
            buffer,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as zf:
            for path in sorted(entries.keys()):
                data = entries[path]
                is_dir = path.endswith("/")
                zip_info = zipfile.ZipInfo(path, date_time=_FIXED_ZIP_TIMESTAMP)
                zip_info.create_system = 0
                if is_dir:
                    zip_info.external_attr = 0o40755 << 16
                else:
                    zip_info.external_attr = 0o100644 << 16
                zf.writestr(zip_info, data)
        return buffer.getvalue()


def resolve_mv_design_pro_version() -> str | None:
    try:
        import tomllib
    except ModuleNotFoundError:
        return None

    for parent in Path(__file__).resolve().parents:
        candidate = parent / "pyproject.toml"
        if not candidate.exists():
            continue
        try:
            data = tomllib.loads(candidate.read_text(encoding="utf-8"))
        except OSError:
            continue
        version = data.get("tool", {}).get("poetry", {}).get("version")
        if version:
            return str(version)
    return None


def proof_pack_proof_type(proof_type: ProofType) -> str:
    if proof_type == ProofType.SC3F_IEC60909:
        return ProofType.SC3F_IEC60909.value
    if proof_type == ProofType.VDROP:
        return ProofType.VDROP.value
    if proof_type == ProofType.Q_U_REGULATION:
        return "QU_REGULATION"
    if proof_type in {
        ProofType.SC1F_IEC60909,
        ProofType.SC2F_IEC60909,
        ProofType.SC2FG_IEC60909,
    }:
        return "SC1_ASYM"
    return proof_type.value


def _format_datetime_utc(value: datetime | None) -> str:
    if value is None:
        return "1970-01-01T00:00:00Z"
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _sha256_hex(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _python_version() -> str:
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
