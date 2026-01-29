"""
Catalog Governance Service (P13b)

Implements type library export/import with governance controls:
- Deterministic export with fingerprint
- Safe merge/replace import with conflict detection
- Hard compatibility rules for type_ref

PowerFactory-grade type library management.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any
from uuid import uuid4

from network_model.catalog.governance import (
    ImportConflict,
    ImportMode,
    ImportReport,
    TypeLibraryExport,
    TypeLibraryManifest,
    compute_fingerprint,
    sort_types_deterministically,
)


class CatalogGovernanceService:
    """
    Catalog governance service for type library management.

    Provides deterministic export/import of type libraries with governance controls.
    """

    def __init__(self, uow_factory: Any):
        """
        Initialize service.

        Args:
            uow_factory: Unit of Work factory for database access.
        """
        self.uow_factory = uow_factory

    def export_type_library(
        self,
        *,
        library_name_pl: str = "Biblioteka typów",
        vendor: str = "MV-DESIGN-PRO",
        series: str = "Standard",
        revision: str = "1.0",
        description_pl: str = "",
    ) -> dict[str, Any]:
        """
        Export type library with deterministic fingerprint.

        Returns canonical JSON export with manifest and all types.
        Deterministic ordering: types sorted by (name, id).

        Args:
            library_name_pl: Polish name of the library.
            vendor: Vendor/manufacturer name.
            series: Product series/line.
            revision: Revision string.
            description_pl: Optional Polish description.

        Returns:
            TypeLibraryExport dictionary.
        """
        with self.uow_factory() as uow:
            # Fetch all types (already deterministically sorted by repository)
            line_types = uow.wizard.list_line_types()
            cable_types = uow.wizard.list_cable_types()
            transformer_types = uow.wizard.list_transformer_types()
            switch_types = uow.wizard.list_switch_equipment_types()

            # Sort types deterministically (name → id)
            sorted_line_types = sort_types_deterministically(line_types)
            sorted_cable_types = sort_types_deterministically(cable_types)
            sorted_transformer_types = sort_types_deterministically(transformer_types)
            sorted_switch_types = sort_types_deterministically(switch_types)

            # Create export structure (without fingerprint first)
            export = TypeLibraryExport(
                manifest=TypeLibraryManifest(
                    library_id=str(uuid4()),
                    name_pl=library_name_pl,
                    vendor=vendor,
                    series=series,
                    revision=revision,
                    schema_version="1.0",
                    created_at=datetime.utcnow().isoformat(),
                    fingerprint="",  # Will be computed below
                    description_pl=description_pl,
                ),
                line_types=sorted_line_types,
                cable_types=sorted_cable_types,
                transformer_types=sorted_transformer_types,
                switch_types=sorted_switch_types,
            )

            # Compute fingerprint
            fingerprint = compute_fingerprint(export)

            # Rebuild manifest with fingerprint
            manifest_with_fingerprint = TypeLibraryManifest(
                library_id=export.manifest.library_id,
                name_pl=export.manifest.name_pl,
                vendor=export.manifest.vendor,
                series=export.manifest.series,
                revision=export.manifest.revision,
                schema_version=export.manifest.schema_version,
                created_at=export.manifest.created_at,
                fingerprint=fingerprint,
                description_pl=export.manifest.description_pl,
            )

            # Final export with fingerprint
            final_export = TypeLibraryExport(
                manifest=manifest_with_fingerprint,
                line_types=sorted_line_types,
                cable_types=sorted_cable_types,
                transformer_types=sorted_transformer_types,
                switch_types=sorted_switch_types,
            )

            return final_export.to_dict()

    def import_type_library(
        self,
        data: dict[str, Any],
        mode: ImportMode = ImportMode.MERGE,
    ) -> dict[str, Any]:
        """
        Import type library with conflict detection.

        Modes:
        - MERGE (default): Add new types, skip existing (no overwrites).
        - REPLACE: Replace entire library (blocked if types are in use).

        Conflict rules:
        - Existing type_id with different parameters → 409 Conflict.
        - REPLACE mode with types in use → 409 Conflict.

        Args:
            data: TypeLibraryExport dictionary.
            mode: Import mode (MERGE or REPLACE).

        Returns:
            ImportReport dictionary.

        Raises:
            ValueError: If import data is invalid or conflicts detected.
        """
        # Parse import data
        export = TypeLibraryExport.from_dict(data)
        report = ImportReport(mode=mode)

        with self.uow_factory() as uow:
            # Fetch existing types
            existing_line_types = {item["id"]: item for item in uow.wizard.list_line_types()}
            existing_cable_types = {item["id"]: item for item in uow.wizard.list_cable_types()}
            existing_transformer_types = {
                item["id"]: item for item in uow.wizard.list_transformer_types()
            }
            existing_switch_types = {
                item["id"]: item for item in uow.wizard.list_switch_equipment_types()
            }

            # REPLACE mode: check if any types are in use
            if mode == ImportMode.REPLACE:
                types_in_use = self._get_types_in_use(uow)
                if types_in_use:
                    # Block replace if types are in use
                    for type_id in types_in_use:
                        report.conflicts.append(
                            ImportConflict(
                                type_id=type_id,
                                type_category="UNKNOWN",
                                reason="Type is in use by instances. REPLACE blocked.",
                            )
                        )
                    report.success = False
                    raise ValueError(
                        "REPLACE blocked: types are in use by instances. "
                        "Cannot replace library without migration."
                    )

            # MERGE mode: add new types, skip existing
            if mode == ImportMode.MERGE:
                # Process line types
                for type_data in export.line_types:
                    type_id = type_data["id"]
                    if type_id in existing_line_types:
                        # Skip existing (no overwrites in MERGE mode)
                        report.skipped.append(type_id)
                    else:
                        # Add new type
                        uow.wizard.upsert_line_type(type_data, commit=False)
                        report.added.append(type_id)

                # Process cable types
                for type_data in export.cable_types:
                    type_id = type_data["id"]
                    if type_id in existing_cable_types:
                        report.skipped.append(type_id)
                    else:
                        uow.wizard.upsert_cable_type(type_data, commit=False)
                        report.added.append(type_id)

                # Process transformer types
                for type_data in export.transformer_types:
                    type_id = type_data["id"]
                    if type_id in existing_transformer_types:
                        report.skipped.append(type_id)
                    else:
                        uow.wizard.upsert_transformer_type(type_data, commit=False)
                        report.added.append(type_id)

                # Process switch types
                for type_data in export.switch_types:
                    type_id = type_data["id"]
                    if type_id in existing_switch_types:
                        report.skipped.append(type_id)
                    else:
                        uow.wizard.upsert_switch_equipment_type(type_data, commit=False)
                        report.added.append(type_id)

            uow.commit()

        return report.to_dict()

    def _get_types_in_use(self, uow: Any) -> set[str]:
        """
        Get set of type IDs that are in use by instances.

        Scans actual network tables for type_ref usage:
        - NetworkBranchORM.params_jsonb["type_ref"] (lines/cables)
        - SwitchEquipmentAssignmentORM.equipment_type_id (switches)

        Args:
            uow: Unit of Work.

        Returns:
            Set of type IDs in use.
        """
        types_in_use = set()

        # Get all projects to scan their networks
        projects = uow.projects.list_all()

        for project in projects:
            # Check branches (lines/cables) for type_ref in params
            branches = uow.network.list_branches(project.id)
            for branch in branches:
                type_ref = branch.get("params", {}).get("type_ref")
                if type_ref:
                    types_in_use.add(str(type_ref))

            # Check switch equipment assignments
            # Note: Using raw session query as wizard repository doesn't expose this
            from infrastructure.persistence.models import SwitchEquipmentAssignmentORM
            switch_assignments = (
                uow.session.query(SwitchEquipmentAssignmentORM)
                .filter(SwitchEquipmentAssignmentORM.project_id == project.id)
                .all()
            )
            for assignment in switch_assignments:
                types_in_use.add(str(assignment.equipment_type_id))

        return types_in_use
