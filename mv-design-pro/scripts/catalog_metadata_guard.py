#!/usr/bin/env python3
"""
CI Guard: catalog_metadata_guard.py

Checks that critical catalog groups expose frozen quality metadata:
- verification_status
- source_reference
- catalog_status
- contract_version

Also blocks:
- PRODUKCYJNY_V1 records marked as NIEWERYFIKOWANY
- ANALITYCZNY_V1 outside protection-related groups
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_SRC = PROJECT_ROOT / "backend" / "src"
sys.path.insert(0, str(BACKEND_SRC))

from network_model.catalog.repository import get_default_mv_catalog  # noqa: E402
from network_model.catalog.types import CATALOG_CONTRACT_VERSION  # noqa: E402


def _groups() -> dict[str, list[object]]:
    repo = get_default_mv_catalog()
    return {
        "LINIA_SN": repo.list_line_types(),
        "KABEL_SN": repo.list_cable_types(),
        "TRAFO_SN_NN": repo.list_transformer_types(),
        "APARAT_SN": repo.list_switch_equipment_types(),
        "PRZEKSZTALTNIK": repo.list_converter_types(),
        "CT": repo.list_ct_types(),
        "VT": repo.list_vt_types(),
        "ZRODLO_SN": repo.list_source_system_types(),
        "FALOWNIK_PV": repo.list_pv_inverter_types(),
        "FALOWNIK_BESS": repo.list_bess_inverter_types(),
        "ZABEZPIECZENIE": repo.list_protection_device_types(),
        "KRZYWA_ZABEZPIECZENIA": repo.list_protection_curves(),
        "SZABLON_NASTAW": repo.list_protection_setting_templates(),
    }


def main() -> int:
    errors: list[str] = []
    analytical_groups = {"ZABEZPIECZENIE", "KRZYWA_ZABEZPIECZENIA", "SZABLON_NASTAW"}

    for group, items in _groups().items():
        for item in items:
            data = item.to_dict()
            for field_name in (
                "verification_status",
                "source_reference",
                "catalog_status",
                "contract_version",
            ):
                if not data.get(field_name):
                    errors.append(f"{group}: brak pola {field_name} dla rekordu {data.get('id')}")

            if data.get("contract_version") != CATALOG_CONTRACT_VERSION:
                errors.append(
                    f"{group}: rekord {data.get('id')} ma contract_version={data.get('contract_version')!r}"
                )

            if (
                data.get("catalog_status") == "PRODUKCYJNY_V1"
                and data.get("verification_status") == "NIEWERYFIKOWANY"
            ):
                errors.append(
                    f"{group}: rekord {data.get('id')} jest PRODUKCYJNY_V1 i NIEWERYFIKOWANY"
                )

            if (
                group not in analytical_groups
                and data.get("catalog_status") == "ANALITYCZNY_V1"
            ):
                errors.append(
                    f"{group}: rekord {data.get('id')} nie moze miec ANALITYCZNY_V1 poza grupa ochrony"
                )

    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1

    print("OK: frozen catalog metadata contract preserved")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
