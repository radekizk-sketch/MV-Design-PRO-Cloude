from __future__ import annotations

from application.equipment_proof.generator import EquipmentProofGenerator
from application.equipment_proof.types import EquipmentProofInput
from application.proof_engine.proof_pack import (
    ProofPackBuilder,
    ProofPackContext,
    resolve_mv_design_pro_version,
)


def build_equipment_proof_pack(proof_input: EquipmentProofInput) -> tuple[str, bytes]:
    bundle = EquipmentProofGenerator.generate(proof_input)
    snapshot_id = _snapshot_id_from_pcc(proof_input.pcc_node_id)
    context = ProofPackContext(
        project_id=proof_input.project_id,
        case_id=proof_input.case_id,
        run_id=proof_input.run_id,
        snapshot_id=snapshot_id,
        mv_design_pro_version=resolve_mv_design_pro_version(),
    )
    pack_bytes = ProofPackBuilder(context).build(bundle.proof_document)
    filename = _proof_pack_filename(proof_input)
    return filename, pack_bytes


def _snapshot_id_from_pcc(pcc_node_id: str) -> str:
    return f"pcc:{pcc_node_id}" if pcc_node_id else "unknown"


def _proof_pack_filename(proof_input: EquipmentProofInput) -> str:
    return (
        "mv-design-pro__proofpack__P12__"
        f"{proof_input.project_id}__{proof_input.case_id}__"
        f"{proof_input.run_id}__{proof_input.device.device_id}.zip"
    )
