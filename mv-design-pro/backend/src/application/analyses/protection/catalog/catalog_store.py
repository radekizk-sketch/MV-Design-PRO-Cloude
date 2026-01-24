from __future__ import annotations

import json
from pathlib import Path

from application.analyses.protection.catalog.models import DeviceCapability

_DATA_PATH = Path(__file__).resolve().parent / "data" / "devices_v0.json"


def load_device_capability(device_id: str) -> DeviceCapability | None:
    devices = _load_catalog()
    for device in devices:
        if device.device_id == device_id:
            return device
    return None


def list_devices(vendor: str | None = None) -> list[DeviceCapability]:
    devices = _load_catalog()
    if vendor:
        devices = [device for device in devices if device.vendor == vendor]
    return sorted(devices, key=lambda device: device.device_id)


def _load_catalog() -> list[DeviceCapability]:
    payload = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    devices = payload.get("devices", []) if isinstance(payload, dict) else []
    return [_parse_device(device) for device in devices if isinstance(device, dict)]


def _parse_device(payload: dict) -> DeviceCapability:
    meta = payload.get("meta", {})
    if not isinstance(meta, dict):
        meta = {}
    return DeviceCapability(
        device_id=str(payload.get("device_id", "")),
        vendor=str(payload.get("vendor", "")),
        model=str(payload.get("model", "")),
        functions_supported=tuple(payload.get("functions_supported", [])),
        curves_supported=tuple(payload.get("curves_supported", [])),
        i_pickup_51_a_min=float(payload.get("i_pickup_51_a_min", 0.0)),
        i_pickup_51_a_max=float(payload.get("i_pickup_51_a_max", 0.0)),
        tms_51_min=float(payload.get("tms_51_min", 0.0)),
        tms_51_max=float(payload.get("tms_51_max", 0.0)),
        i_inst_50_a_min=float(payload.get("i_inst_50_a_min", 0.0)),
        i_inst_50_a_max=float(payload.get("i_inst_50_a_max", 0.0)),
        i_pickup_51n_a_min=float(payload.get("i_pickup_51n_a_min", 0.0)),
        i_pickup_51n_a_max=float(payload.get("i_pickup_51n_a_max", 0.0)),
        tms_51n_min=float(payload.get("tms_51n_min", 0.0)),
        tms_51n_max=float(payload.get("tms_51n_max", 0.0)),
        i_inst_50n_a_min=float(payload.get("i_inst_50n_a_min", 0.0)),
        i_inst_50n_a_max=float(payload.get("i_inst_50n_a_max", 0.0)),
        meta=meta,
    )
