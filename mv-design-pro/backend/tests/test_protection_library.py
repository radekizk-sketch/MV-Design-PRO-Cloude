"""
Tests for Protection Library (P14a - READ-ONLY)

Tests cover:
- Domain models immutability
- Repository deterministic listing
- Smoke test for persistence methods
"""
from dataclasses import FrozenInstanceError
from pathlib import Path
import sys

import pytest

backend_src = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(backend_src))

from network_model.catalog import CatalogRepository
from network_model.catalog.types import (
    ProtectionDeviceType,
    ProtectionCurve,
    ProtectionSettingTemplate,
)


def test_protection_types_are_frozen() -> None:
    """Test that Protection Library types are immutable (frozen dataclasses)."""
    device = ProtectionDeviceType(
        id="device-1",
        name_pl="Przekaźnik Sepam 20",
        vendor="Schneider Electric",
    )
    with pytest.raises(FrozenInstanceError):
        device.name_pl = "Inny przekaźnik"

    curve = ProtectionCurve(
        id="curve-1",
        name_pl="IEC Normalna Inwersyjna",
        standard="IEC",
    )
    with pytest.raises(FrozenInstanceError):
        curve.standard = "IEEE"

    template = ProtectionSettingTemplate(
        id="template-1",
        name_pl="Szablon Sepam - Nadprądowy",
    )
    with pytest.raises(FrozenInstanceError):
        template.name_pl = "Inny szablon"


def test_protection_library_lists_deterministically() -> None:
    """Test that Protection Library lists are sorted deterministically (name_pl, id)."""
    repo = CatalogRepository.from_records(
        # Empty regular catalog types (required parameters)
        line_types=[],
        cable_types=[],
        transformer_types=[],
        # Protection types (sorted by name_pl, then id)
        protection_device_types=[
            {
                "id": "device-2",
                "name_pl": "Przekaźnik B",
                "params": {"vendor": "Vendor B"},
            },
            {
                "id": "device-1",
                "name_pl": "Przekaźnik A",
                "params": {"vendor": "Vendor A"},
            },
            {
                "id": "device-3",
                "name_pl": "Przekaźnik A",  # Same name_pl, different id
                "params": {"vendor": "Vendor A2"},
            },
        ],
        protection_curves=[
            {
                "id": "curve-2",
                "name_pl": "Krzywa B",
                "params": {"standard": "IEEE"},
            },
            {
                "id": "curve-1",
                "name_pl": "Krzywa A",
                "params": {"standard": "IEC"},
            },
        ],
        protection_setting_templates=[
            {
                "id": "template-2",
                "name_pl": "Szablon B",
                "params": {},
            },
            {
                "id": "template-1",
                "name_pl": "Szablon A",
                "params": {},
            },
        ],
    )

    # Test device types sorting: name_pl, then id
    devices = repo.list_protection_device_types()
    assert len(devices) == 3
    assert devices[0].name_pl == "Przekaźnik A"
    assert devices[0].id == "device-1"
    assert devices[1].name_pl == "Przekaźnik A"
    assert devices[1].id == "device-3"
    assert devices[2].name_pl == "Przekaźnik B"
    assert devices[2].id == "device-2"

    # Test curves sorting: name_pl, then id
    curves = repo.list_protection_curves()
    assert len(curves) == 2
    assert curves[0].name_pl == "Krzywa A"
    assert curves[0].id == "curve-1"
    assert curves[1].name_pl == "Krzywa B"
    assert curves[1].id == "curve-2"

    # Test templates sorting: name_pl, then id
    templates = repo.list_protection_setting_templates()
    assert len(templates) == 2
    assert templates[0].name_pl == "Szablon A"
    assert templates[0].id == "template-1"
    assert templates[1].name_pl == "Szablon B"
    assert templates[1].id == "template-2"


def test_protection_library_get_methods() -> None:
    """Test that get methods return correct types or None."""
    repo = CatalogRepository.from_records(
        line_types=[],
        cable_types=[],
        transformer_types=[],
        protection_device_types=[
            {
                "id": "device-1",
                "name_pl": "Przekaźnik A",
                "params": {"vendor": "Vendor A"},
            },
        ],
        protection_curves=[
            {
                "id": "curve-1",
                "name_pl": "Krzywa A",
                "params": {"standard": "IEC"},
            },
        ],
        protection_setting_templates=[
            {
                "id": "template-1",
                "name_pl": "Szablon A",
                "params": {},
            },
        ],
    )

    # Test get device type
    device = repo.get_protection_device_type("device-1")
    assert device is not None
    assert device.id == "device-1"
    assert device.name_pl == "Przekaźnik A"
    assert device.vendor == "Vendor A"

    # Test get non-existent device type
    device = repo.get_protection_device_type("device-999")
    assert device is None

    # Test get curve
    curve = repo.get_protection_curve("curve-1")
    assert curve is not None
    assert curve.id == "curve-1"
    assert curve.name_pl == "Krzywa A"
    assert curve.standard == "IEC"

    # Test get non-existent curve
    curve = repo.get_protection_curve("curve-999")
    assert curve is None

    # Test get template
    template = repo.get_protection_setting_template("template-1")
    assert template is not None
    assert template.id == "template-1"
    assert template.name_pl == "Szablon A"

    # Test get non-existent template
    template = repo.get_protection_setting_template("template-999")
    assert template is None


def test_protection_types_to_dict_from_dict() -> None:
    """Test that to_dict/from_dict round-trip preserves data."""
    # Device type
    device = ProtectionDeviceType(
        id="device-1",
        name_pl="Przekaźnik Sepam",
        vendor="Schneider",
        rated_current_a=100.0,
    )
    device_dict = device.to_dict()
    device_restored = ProtectionDeviceType.from_dict(device_dict)
    assert device_restored == device

    # Curve
    curve = ProtectionCurve(
        id="curve-1",
        name_pl="IEC Normal Inverse",
        standard="IEC",
        curve_kind="inverse",
        parameters={"A": 0.14, "B": 0.02},
    )
    curve_dict = curve.to_dict()
    curve_restored = ProtectionCurve.from_dict(curve_dict)
    assert curve_restored == curve

    # Template
    template = ProtectionSettingTemplate(
        id="template-1",
        name_pl="Szablon Sepam",
        device_type_ref="device-1",
        setting_fields=[{"name": "I>", "unit": "A", "min": 0.1, "max": 10.0}],
    )
    template_dict = template.to_dict()
    template_restored = ProtectionSettingTemplate.from_dict(template_dict)
    assert template_restored == template
