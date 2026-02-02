from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from .types import (
    CableType,
    ConverterKind,
    ConverterType,
    InverterType,
    LineType,
    ProtectionCurve,
    ProtectionDeviceType,
    ProtectionSettingTemplate,
    SwitchEquipmentType,
    TransformerType,
)


@dataclass(frozen=True)
class CatalogRepository:
    """
    Immutable catalog repository for type library access.

    Provides deterministic listing and lookup for catalog types.
    """

    line_types: dict[str, LineType]
    cable_types: dict[str, CableType]
    transformer_types: dict[str, TransformerType]
    switch_equipment_types: dict[str, SwitchEquipmentType]
    converter_types: dict[str, ConverterType]
    inverter_types: dict[str, InverterType]
    protection_device_types: dict[str, ProtectionDeviceType] = field(default_factory=dict)
    protection_curves: dict[str, ProtectionCurve] = field(default_factory=dict)
    protection_setting_templates: dict[str, ProtectionSettingTemplate] = field(default_factory=dict)

    @classmethod
    def from_records(
        cls,
        *,
        line_types: Iterable[dict],
        cable_types: Iterable[dict],
        transformer_types: Iterable[dict],
        switch_equipment_types: Iterable[dict] | None = None,
        converter_types: Iterable[dict] | None = None,
        inverter_types: Iterable[dict] | None = None,
        protection_device_types: Iterable[dict] | None = None,
        protection_curves: Iterable[dict] | None = None,
        protection_setting_templates: Iterable[dict] | None = None,
    ) -> "CatalogRepository":
        def _build_line_type(record: dict) -> LineType:
            data = {"id": record.get("id"), "name": record.get("name")}
            data.update(record.get("params") or {})
            return LineType.from_dict(data)

        def _build_cable_type(record: dict) -> CableType:
            data = {"id": record.get("id"), "name": record.get("name")}
            data.update(record.get("params") or {})
            return CableType.from_dict(data)

        def _build_transformer_type(record: dict) -> TransformerType:
            data = {"id": record.get("id"), "name": record.get("name")}
            data.update(record.get("params") or {})
            return TransformerType.from_dict(data)

        def _build_switch_equipment_type(record: dict) -> SwitchEquipmentType:
            data = {"id": record.get("id"), "name": record.get("name")}
            data.update(record.get("params") or {})
            return SwitchEquipmentType.from_dict(data)

        def _build_inverter_type(record: dict) -> InverterType:
            data = {"id": record.get("id"), "name": record.get("name")}
            data.update(record.get("params") or {})
            return InverterType.from_dict(data)

        def _build_converter_type(record: dict) -> ConverterType:
            data = {"id": record.get("id"), "name": record.get("name")}
            data.update(record.get("params") or {})
            return ConverterType.from_dict(data)

        def _build_protection_device_type(record: dict) -> ProtectionDeviceType:
            data = {"id": record.get("id"), "name_pl": record.get("name_pl")}
            data.update(record.get("params") or {})
            return ProtectionDeviceType.from_dict(data)

        def _build_protection_curve(record: dict) -> ProtectionCurve:
            data = {"id": record.get("id"), "name_pl": record.get("name_pl")}
            data.update(record.get("params") or {})
            return ProtectionCurve.from_dict(data)

        def _build_protection_setting_template(record: dict) -> ProtectionSettingTemplate:
            data = {"id": record.get("id"), "name_pl": record.get("name_pl")}
            data.update(record.get("params") or {})
            return ProtectionSettingTemplate.from_dict(data)

        switch_records = list(switch_equipment_types or [])
        converter_records = list(converter_types or [])
        inverter_records = list(inverter_types or [])
        protection_device_records = list(protection_device_types or [])
        protection_curve_records = list(protection_curves or [])
        protection_setting_template_records = list(protection_setting_templates or [])
        if not converter_records and inverter_records:
            converter_records = inverter_records
        return cls(
            line_types={str(item.id): item for item in map(_build_line_type, line_types)},
            cable_types={str(item.id): item for item in map(_build_cable_type, cable_types)},
            transformer_types={
                str(item.id): item for item in map(_build_transformer_type, transformer_types)
            },
            switch_equipment_types={
                str(item.id): item for item in map(_build_switch_equipment_type, switch_records)
            },
            converter_types={
                str(item.id): item for item in map(_build_converter_type, converter_records)
            },
            inverter_types={
                str(item.id): item for item in map(_build_inverter_type, inverter_records)
            },
            protection_device_types={
                str(item.id): item
                for item in map(_build_protection_device_type, protection_device_records)
            },
            protection_curves={
                str(item.id): item
                for item in map(_build_protection_curve, protection_curve_records)
            },
            protection_setting_templates={
                str(item.id): item
                for item in map(
                    _build_protection_setting_template, protection_setting_template_records
                )
            },
        )

    def list_line_types(self) -> list[LineType]:
        return self._sorted(self.line_types.values())

    def list_cable_types(self) -> list[CableType]:
        return self._sorted(self.cable_types.values())

    def list_transformer_types(self) -> list[TransformerType]:
        return self._sorted(self.transformer_types.values())

    def list_switch_equipment_types(self) -> list[SwitchEquipmentType]:
        return self._sorted(self.switch_equipment_types.values())

    def list_converter_types(self, kind: ConverterKind | None = None) -> list[ConverterType]:
        values = self.converter_types.values()
        if kind is not None:
            values = [item for item in values if item.kind == kind]
        return sorted(values, key=lambda item: str(item.id))

    def list_inverter_types(self) -> list[InverterType]:
        return self._sorted(self.inverter_types.values())

    def get_line_type(self, type_id: str) -> LineType | None:
        return self.line_types.get(str(type_id))

    def get_cable_type(self, type_id: str) -> CableType | None:
        return self.cable_types.get(str(type_id))

    def get_transformer_type(self, type_id: str) -> TransformerType | None:
        return self.transformer_types.get(str(type_id))

    def get_switch_equipment_type(self, type_id: str) -> SwitchEquipmentType | None:
        return self.switch_equipment_types.get(str(type_id))

    def get_converter_type(self, type_id: str) -> ConverterType | None:
        return self.converter_types.get(str(type_id))

    def get_inverter_type(self, type_id: str) -> InverterType | None:
        return self.inverter_types.get(str(type_id))

    def list_protection_device_types(self) -> list[ProtectionDeviceType]:
        return self._sorted_pl(self.protection_device_types.values())

    def list_protection_curves(self) -> list[ProtectionCurve]:
        return self._sorted_pl(self.protection_curves.values())

    def list_protection_setting_templates(self) -> list[ProtectionSettingTemplate]:
        return self._sorted_pl(self.protection_setting_templates.values())

    def get_protection_device_type(self, type_id: str) -> ProtectionDeviceType | None:
        return self.protection_device_types.get(str(type_id))

    def get_protection_curve(self, type_id: str) -> ProtectionCurve | None:
        return self.protection_curves.get(str(type_id))

    def get_protection_setting_template(self, type_id: str) -> ProtectionSettingTemplate | None:
        return self.protection_setting_templates.get(str(type_id))

    @staticmethod
    def _sorted(values: Iterable) -> list:
        return sorted(values, key=lambda item: (str(item.name), str(item.id)))

    @staticmethod
    def _sorted_pl(values: Iterable) -> list:
        """Sort protection types by name_pl, then id (deterministic)."""
        return sorted(values, key=lambda item: (str(item.name_pl), str(item.id)))


def get_default_mv_catalog() -> CatalogRepository:
    """
    Get default MV cable and line catalog with full thermal data.

    Returns a CatalogRepository pre-populated with:
    - Base cable types (XLPE/EPR, Cu/Al, 1-core/3-core, 70-400mm²)
    - Base overhead line types (Al/Al-St, 25-150mm²)
    - Manufacturer-specific types (NKT, Tele-Fonika Kable)
    - One incomplete type for testing (missing thermal data)

    This is the canonical catalog for MV network design.
    """
    from .mv_cable_line_catalog import get_all_cable_types, get_all_line_types

    return CatalogRepository.from_records(
        line_types=get_all_line_types(),
        cable_types=get_all_cable_types(),
        transformer_types=[],
        switch_equipment_types=[],
        converter_types=[],
        inverter_types=[],
        protection_device_types=[],
        protection_curves=[],
        protection_setting_templates=[],
    )
