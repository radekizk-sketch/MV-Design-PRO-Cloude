"""
Proof Generator — Generator dowodów matematycznych P11.1a

STATUS: CANONICAL & BINDING
Reference: P11_1a_MVP_SC3F_AND_VDROP.md, PROOF_SCHEMAS.md

Generuje ProofDocument na podstawie:
- ShortCircuitResult (dla SC3F)
- white_box_trace
- Equation Registry
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from application.proof_engine.equation_registry import (
    AntiDoubleCountingAudit,
    EquationRegistry,
    EQ_SC3F_003,
    EQ_SC3F_004,
    EQ_SC3F_005,
    EQ_SC3F_006,
    EQ_SC3F_007,
    EQ_SC3F_008,
    EQ_SC3F_008a,
    EQ_SC1_001,
    EQ_SC1_002,
    EQ_SC1_003,
    EQ_SC1_004,
    EQ_SC1_005,
    EQ_SC1_006,
    EQ_SC1_007,
    EQ_VDROP_001,
    EQ_VDROP_002,
    EQ_VDROP_003,
    EQ_VDROP_004,
    EQ_VDROP_005,
    EQ_VDROP_006,
    EQ_VDROP_007,
    EQ_QU_001,
    EQ_QU_002,
    EQ_QU_003,
    EQ_QU_004,
    EQ_QU_005,  # P11.1c: VDROP link
    EQ_LC_001,
    EQ_LC_002,
    EQ_LC_003,
    EQ_LC_004,
    EQ_LC_005,
    EQ_LC_006,
)
from application.proof_engine.types import (
    EquationDefinition,
    LoadCurrentsCounterfactualInput,
    LoadCurrentsInput,
    LoadElementKind,
    ProofDocument,
    ProofHeader,
    ProofStep,
    ProofSummary,
    ProofType,
    ProofValue,
    QUCounterfactualInput,
    QUInput,
    UnitCheckResult,
)
from application.proof_engine.unit_verifier import UnitVerifier


@dataclass
class SC3FInput:
    """
    Dane wejściowe dla generatora dowodu SC3F.

    Mapowanie z ShortCircuitResult:
    - c_factor → c_factor
    - un_v → u_n_kv (konwersja V → kV)
    - zkk_ohm → z_thevenin_ohm
    - ikss_a → ikss_ka (konwersja A → kA)
    - ip_a → ip_ka (konwersja A → kA)
    - ith_a → ith_ka (konwersja A → kA)
    - sk_mva → sk_mva
    - kappa → kappa
    - rx_ratio → rx_ratio
    """

    # Identyfikacja
    project_name: str
    case_name: str
    fault_node_id: str
    fault_type: str
    run_timestamp: datetime
    solver_version: str

    # Wartości z solvera (już skonwertowane)
    c_factor: float
    u_n_kv: float
    z_thevenin_ohm: complex
    ikss_ka: float
    ip_ka: float
    ith_ka: float
    sk_mva: float
    kappa: float
    rx_ratio: float
    tk_s: float

    # Opcjonalne wartości pośrednie (z white_box_trace)
    m_factor: float = 1.0
    n_factor: float = 0.0

    @classmethod
    def from_short_circuit_result(
        cls,
        result: Any,  # ShortCircuitResult
        project_name: str = "Projekt",
        case_name: str = "Przypadek",
        solver_version: str = "1.0.0",
    ) -> SC3FInput:
        """
        Tworzy SC3FInput z ShortCircuitResult.

        Konwersje jednostek:
        - V → kV: / 1000
        - A → kA: / 1000
        """
        return cls(
            project_name=project_name,
            case_name=case_name,
            fault_node_id=result.fault_node_id,
            fault_type=result.short_circuit_type.value,
            run_timestamp=datetime.utcnow(),
            solver_version=solver_version,
            c_factor=result.c_factor,
            u_n_kv=result.un_v / 1000.0,
            z_thevenin_ohm=result.zkk_ohm,
            ikss_ka=result.ikss_a / 1000.0,
            ip_ka=result.ip_a / 1000.0,
            ith_ka=result.ith_a / 1000.0,
            sk_mva=result.sk_mva,
            kappa=result.kappa,
            rx_ratio=result.rx_ratio,
            tk_s=result.tk_s,
        )


@dataclass
class VDROPSegmentInput:
    """Dane wejściowe dla pojedynczego odcinka VDROP."""

    segment_id: str
    from_bus_id: str
    to_bus_id: str
    r_ohm_per_km: float
    x_ohm_per_km: float
    length_km: float
    p_mw: float
    q_mvar: float
    u_n_kv: float


@dataclass
class VDROPInput:
    """Dane wejściowe dla generatora dowodu VDROP."""

    project_name: str
    case_name: str
    source_bus_id: str
    target_bus_id: str
    run_timestamp: datetime
    solver_version: str
    segments: list[VDROPSegmentInput]
    u_source_kv: float


@dataclass
class SC1Input:
    """Dane wejściowe dla generatora dowodu SC1 (P11.1c FULL)."""

    # Identyfikacja
    project_name: str
    case_name: str
    fault_node_id: str
    fault_type: str
    run_timestamp: datetime
    solver_version: str

    # Dane znamionowe / prefault
    u_n_kv: float
    c_factor: float
    u_prefault_kv: float

    # Składowe impedancji
    z1_ohm: complex
    z2_ohm: complex
    z0_ohm: complex

    # Operator a (Fortescue)
    a_operator: complex


class ProofGenerator:
    """
    Generator dowodów matematycznych P11.1a.

    Generuje:
    - Dowody SC3F (zwarcia trójfazowe IEC 60909)
    - Dowody VDROP (spadki napięć)

    Gwarantuje:
    - Determinizm (ten sam input → identyczny output)
    - Kompletność (wszystkie kroki z rejestru)
    - Weryfikację jednostek (automatyczna)
    """

    # =========================================================================
    # SC3F Generator
    # =========================================================================

    @classmethod
    def generate_sc3f_proof(
        cls,
        data: SC3FInput,
        artifact_id: UUID | None = None,
    ) -> ProofDocument:
        """
        Generuje dowód SC3F (zwarcie trójfazowe IEC 60909).

        Model Anti-Double-Counting: A1 (c tylko w EQ_SC3F_004)

        Kroki obowiązkowe (BINDING):
        1. Impedancja Thevenina (z solvera)
        2. Początkowy prąd zwarciowy I_k'' (c TUTAJ — jedyne miejsce)
        3. Współczynnik udaru κ
        4. Prąd udarowy i_p
        5. Prąd dynamiczny I_dyn (OBOWIĄZKOWY)
        6. Prąd cieplny I_th (OBOWIĄZKOWY)
        7. Moc zwarciowa S_k''

        Args:
            data: Dane wejściowe SC3FInput
            artifact_id: Opcjonalny ID artefaktu

        Returns:
            ProofDocument z pełnym dowodem
        """
        # Weryfikacja anti-double-counting przed generacją
        assert AntiDoubleCountingAudit.verify(), "Anti-Double-Counting audit failed!"

        if artifact_id is None:
            artifact_id = uuid4()

        steps: list[ProofStep] = []
        step_number = 0

        # Wartości pośrednie do reużycia
        z_abs = abs(data.z_thevenin_ohm)
        r_th = data.z_thevenin_ohm.real
        x_th = data.z_thevenin_ohm.imag

        # =====================================================================
        # Krok 1: Impedancja Thevenina (prezentacja wartości z solvera)
        # =====================================================================
        step_number += 1
        step_1 = cls._create_sc3f_step_z_th(
            step_number=step_number,
            z_thevenin_ohm=data.z_thevenin_ohm,
            r_th=r_th,
            x_th=x_th,
        )
        steps.append(step_1)

        # =====================================================================
        # Krok 2: Początkowy prąd zwarciowy I_k'' (c TUTAJ — jedyne miejsce)
        # =====================================================================
        step_number += 1
        step_2 = cls._create_sc3f_step_ikss(
            step_number=step_number,
            c_factor=data.c_factor,
            u_n_kv=data.u_n_kv,
            z_th_abs=z_abs,
            ikss_ka=data.ikss_ka,
        )
        steps.append(step_2)

        # =====================================================================
        # Krok 3: Współczynnik udaru κ
        # =====================================================================
        step_number += 1
        step_3 = cls._create_sc3f_step_kappa(
            step_number=step_number,
            r_th=r_th,
            x_th=x_th,
            kappa=data.kappa,
        )
        steps.append(step_3)

        # =====================================================================
        # Krok 4: Prąd udarowy i_p
        # =====================================================================
        step_number += 1
        step_4 = cls._create_sc3f_step_ip(
            step_number=step_number,
            kappa=data.kappa,
            ikss_ka=data.ikss_ka,
            ip_ka=data.ip_ka,
        )
        steps.append(step_4)

        # =====================================================================
        # Krok 5: Prąd dynamiczny I_dyn (OBOWIĄZKOWY)
        # =====================================================================
        step_number += 1
        idyn_ka = data.ip_ka  # I_dyn = i_p
        step_5 = cls._create_sc3f_step_idyn(
            step_number=step_number,
            ip_ka=data.ip_ka,
            idyn_ka=idyn_ka,
        )
        steps.append(step_5)

        # =====================================================================
        # Krok 6: Prąd cieplny I_th (OBOWIĄZKOWY)
        # =====================================================================
        step_number += 1
        step_6 = cls._create_sc3f_step_ith(
            step_number=step_number,
            ikss_ka=data.ikss_ka,
            m_factor=data.m_factor,
            n_factor=data.n_factor,
            ith_ka=data.ith_ka,
        )
        steps.append(step_6)

        # =====================================================================
        # Krok 7: Moc zwarciowa S_k''
        # =====================================================================
        step_number += 1
        step_7 = cls._create_sc3f_step_sk(
            step_number=step_number,
            u_n_kv=data.u_n_kv,
            ikss_ka=data.ikss_ka,
            sk_mva=data.sk_mva,
        )
        steps.append(step_7)

        # =====================================================================
        # Podsumowanie
        # =====================================================================
        unit_checks_passed = all(s.unit_check.passed for s in steps)

        key_results = {
            "ikss_ka": ProofValue.create("I_k''", data.ikss_ka, "kA", "ikss_ka"),
            "ip_ka": ProofValue.create("i_p", data.ip_ka, "kA", "ip_ka"),
            "idyn_ka": ProofValue.create("I_{dyn}", idyn_ka, "kA", "idyn_ka"),
            "ith_ka": ProofValue.create("I_{th}", data.ith_ka, "kA", "ith_ka"),
            "sk_mva": ProofValue.create("S_k''", data.sk_mva, "MVA", "sk_mva"),
            "kappa": ProofValue.create("\\kappa", data.kappa, "—", "kappa"),
        }

        summary = ProofSummary(
            key_results=key_results,
            unit_check_passed=unit_checks_passed,
            total_steps=len(steps),
            warnings=(),
        )

        header = ProofHeader(
            project_name=data.project_name,
            case_name=data.case_name,
            run_timestamp=data.run_timestamp,
            solver_version=data.solver_version,
            fault_location=data.fault_node_id,
            fault_type=data.fault_type,
            voltage_factor=data.c_factor,
        )

        return ProofDocument.create(
            artifact_id=artifact_id,
            proof_type=ProofType.SC3F_IEC60909,
            title_pl="Dowód obliczeń zwarciowych IEC 60909 — zwarcie trójfazowe",
            header=header,
            steps=steps,
            summary=summary,
        )

    # =========================================================================
    # SC1 Generator (P11.1c FULL)
    # =========================================================================

    @classmethod
    def generate_sc1_proof(
        cls,
        data: SC1Input,
        artifact_id: UUID | None = None,
    ) -> ProofDocument:
        """
        Generuje dowód SC1 (zwarcia asymetryczne) — FULL MATH.
        """
        if artifact_id is None:
            artifact_id = uuid4()

        fault_type = cls._normalize_sc1_fault_type(data.fault_type)
        proof_type = cls._map_sc1_proof_type(fault_type)
        step_order = EquationRegistry.get_sc1_step_order(fault_type)

        z_equiv = cls._compute_sc1_equiv_impedance(
            fault_type=fault_type,
            z1=data.z1_ohm,
            z2=data.z2_ohm,
            z0=data.z0_ohm,
        )

        i1, i2, i0 = cls._compute_sc1_sequence_currents(
            fault_type=fault_type,
            u_prefault_kv=data.u_prefault_kv,
            z_equiv=z_equiv,
            z2=data.z2_ohm,
            z0=data.z0_ohm,
        )

        ia, ib, ic = cls._compute_sc1_phase_currents(
            a_operator=data.a_operator,
            i0=i0,
            i1=i1,
            i2=i2,
        )

        steps: list[ProofStep] = []
        step_number = 0

        for eq_id in step_order:
            equation = EquationRegistry.get_equation(eq_id)
            if equation is None:
                raise ValueError(f"Missing equation definition for {eq_id}")
            step_number += 1

            if eq_id == "EQ_SC1_001":
                step = cls._create_sc1_step_z_sequence(
                    step_number=step_number,
                    z1=data.z1_ohm,
                    z2=data.z2_ohm,
                    z0=data.z0_ohm,
                )
            elif eq_id == "EQ_SC1_002":
                step = cls._create_sc1_step_a_operator(
                    step_number=step_number,
                    a_operator=data.a_operator,
                )
            elif eq_id in {"EQ_SC1_003", "EQ_SC1_004", "EQ_SC1_005"}:
                step = cls._create_sc1_step_equiv_impedance(
                    step_number=step_number,
                    equation_id=eq_id,
                    z1=data.z1_ohm,
                    z2=data.z2_ohm,
                    z0=data.z0_ohm,
                    z_equiv=z_equiv,
                )
            elif eq_id == "EQ_SC1_006":
                step = cls._create_sc1_step_sequence_currents(
                    step_number=step_number,
                    fault_type=fault_type,
                    u_prefault_kv=data.u_prefault_kv,
                    z_equiv=z_equiv,
                    z2=data.z2_ohm,
                    z0=data.z0_ohm,
                    i1=i1,
                    i2=i2,
                    i0=i0,
                )
            elif eq_id == "EQ_SC1_007":
                step = cls._create_sc1_step_phase_currents(
                    step_number=step_number,
                    a_operator=data.a_operator,
                    i0=i0,
                    i1=i1,
                    i2=i2,
                    ia=ia,
                    ib=ib,
                    ic=ic,
                )
            else:
                raise ValueError(f"Unsupported SC1 equation in step order: {eq_id}")
            steps.append(step)

        header = ProofHeader(
            project_name=data.project_name,
            case_name=data.case_name,
            run_timestamp=data.run_timestamp,
            solver_version=data.solver_version,
            fault_location=data.fault_node_id,
            fault_type=fault_type,
            voltage_factor=data.c_factor,
        )

        unit_checks_passed = all(s.unit_check.passed for s in steps)
        key_results = {
            "z_equiv_ohm": ProofValue.create("Z_k", z_equiv, "Ω", "z_equiv_ohm"),
            "i1_ka": ProofValue.create("I_1", i1, "kA", "i1_ka"),
            "i2_ka": ProofValue.create("I_2", i2, "kA", "i2_ka"),
            "i0_ka": ProofValue.create("I_0", i0, "kA", "i0_ka"),
            "ia_ka": ProofValue.create("I_a", ia, "kA", "ia_ka"),
            "ib_ka": ProofValue.create("I_b", ib, "kA", "ib_ka"),
            "ic_ka": ProofValue.create("I_c", ic, "kA", "ic_ka"),
        }

        summary = ProofSummary(
            key_results=key_results,
            unit_check_passed=unit_checks_passed,
            total_steps=len(steps),
            warnings=(),
        )

        return ProofDocument.create(
            artifact_id=artifact_id,
            proof_type=proof_type,
            title_pl="Dowód obliczeń zwarciowych IEC 60909 — zwarcie asymetryczne",
            header=header,
            steps=steps,
            summary=summary,
        )

    @staticmethod
    def _map_sc1_proof_type(fault_type: str) -> ProofType:
        if fault_type == "SC1FZ":
            return ProofType.SC1F_IEC60909
        if fault_type == "SC2F":
            return ProofType.SC2F_IEC60909
        if fault_type == "SC2FZ":
            return ProofType.SC2FG_IEC60909
        raise ValueError(f"Unsupported SC1 fault type: {fault_type}")

    @staticmethod
    def _normalize_sc1_fault_type(fault_type: str) -> str:
        mapping = {
            "ONE_PHASE_TO_GROUND": "SC1FZ",
            "TWO_PHASE": "SC2F",
            "TWO_PHASE_TO_GROUND": "SC2FZ",
            "SC1FZ": "SC1FZ",
            "SC2F": "SC2F",
            "SC2FZ": "SC2FZ",
        }
        if fault_type not in mapping:
            raise ValueError(f"Unsupported SC1 fault type: {fault_type}")
        return mapping[fault_type]

    @staticmethod
    def _compute_sc1_equiv_impedance(
        *,
        fault_type: str,
        z1: complex,
        z2: complex,
        z0: complex,
    ) -> complex:
        if fault_type == "SC1FZ":
            return z1 + z2 + z0
        if fault_type == "SC2F":
            return z1 + z2
        if fault_type == "SC2FZ":
            denominator = z2 + z0
            if denominator == 0:
                raise ValueError("Z2 + Z0 = 0; cannot compute 2F–Z equivalent impedance")
            return z1 + (z2 * z0) / denominator
        raise ValueError(f"Unsupported SC1 fault type: {fault_type}")

    @staticmethod
    def _compute_sc1_sequence_currents(
        *,
        fault_type: str,
        u_prefault_kv: float,
        z_equiv: complex,
        z2: complex,
        z0: complex,
    ) -> tuple[complex, complex, complex]:
        if z_equiv == 0:
            raise ValueError("Z_k = 0; cannot compute sequence currents")
        i1 = u_prefault_kv / z_equiv
        if fault_type == "SC1FZ":
            return i1, i1, i1
        if fault_type == "SC2F":
            return i1, -i1, 0.0
        if fault_type == "SC2FZ":
            denominator = z2 + z0
            if denominator == 0:
                raise ValueError("Z2 + Z0 = 0; cannot compute 2F–Z sequence currents")
            i2 = -(z0 / denominator) * i1
            i0 = -(z2 / denominator) * i1
            return i1, i2, i0
        raise ValueError(f"Unsupported SC1 fault type: {fault_type}")

    @staticmethod
    def _compute_sc1_phase_currents(
        *,
        a_operator: complex,
        i0: complex,
        i1: complex,
        i2: complex,
    ) -> tuple[complex, complex, complex]:
        a = a_operator
        a2 = a ** 2
        ia = i0 + i1 + i2
        ib = i0 + a2 * i1 + a * i2
        ic = i0 + a * i1 + a2 * i2
        return ia, ib, ic

    # =========================================================================
    # SC3F Step Builders
    # =========================================================================

    @staticmethod
    def _format_complex_latex(value: complex, unit: str) -> str:
        real = value.real
        imag = value.imag
        sign = "+" if imag >= 0 else "-"
        return f"{real:.4f} {sign} j{abs(imag):.4f}\\,\\text{{{unit}}}"

    @classmethod
    def _create_sc1_step_z_sequence(
        cls,
        *,
        step_number: int,
        z1: complex,
        z2: complex,
        z0: complex,
    ) -> ProofStep:
        equation = EQ_SC1_001
        input_values = (
            ProofValue.create("Z_1", z1, "Ω", "z1_ohm"),
            ProofValue.create("Z_2", z2, "Ω", "z2_ohm"),
            ProofValue.create("Z_0", z0, "Ω", "z0_ohm"),
        )

        substitution = (
            f"Z_1 = {cls._format_complex_latex(z1, 'Ω')}, \\quad "
            f"Z_2 = {cls._format_complex_latex(z2, 'Ω')}, \\quad "
            f"Z_0 = {cls._format_complex_latex(z0, 'Ω')}"
        )

        result = ProofValue.create("Z_1", z1, "Ω", "z1_ohm")
        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("Z_1", "Ω"), ("Z_2", "Ω"), ("Z_0", "Ω")],
            "Ω",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC1", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "Z_1": "z1_ohm",
                "Z_2": "z2_ohm",
                "Z_0": "z0_ohm",
            },
        )

    @classmethod
    def _create_sc1_step_a_operator(
        cls,
        *,
        step_number: int,
        a_operator: complex,
    ) -> ProofStep:
        equation = EQ_SC1_002
        input_values: tuple[ProofValue, ...] = ()
        substitution = (
            r"a = e^{j 120^\circ} = "
            f"{cls._format_complex_latex(a_operator, '—')}"
        )
        result = ProofValue.create("a", a_operator, "—", "a_operator")
        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [],
            "—",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC1", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"a": "a_operator"},
        )

    @classmethod
    def _create_sc1_step_equiv_impedance(
        cls,
        *,
        step_number: int,
        equation_id: str,
        z1: complex,
        z2: complex,
        z0: complex,
        z_equiv: complex,
    ) -> ProofStep:
        equation = EquationRegistry.get_equation(equation_id)
        if equation is None:
            raise ValueError(f"Missing equation definition for {equation_id}")

        if equation_id == "EQ_SC1_003":
            substitution = (
                f"Z_k = {cls._format_complex_latex(z1, 'Ω')} + "
                f"{cls._format_complex_latex(z2, 'Ω')} + "
                f"{cls._format_complex_latex(z0, 'Ω')} = "
                f"{cls._format_complex_latex(z_equiv, 'Ω')}"
            )
            input_symbols = [("Z_1", "Ω"), ("Z_2", "Ω"), ("Z_0", "Ω")]
            input_values = (
                ProofValue.create("Z_1", z1, "Ω", "z1_ohm"),
                ProofValue.create("Z_2", z2, "Ω", "z2_ohm"),
                ProofValue.create("Z_0", z0, "Ω", "z0_ohm"),
            )
            source_keys = {
                "Z_k": "z_equiv_ohm",
                "Z_1": "z1_ohm",
                "Z_2": "z2_ohm",
                "Z_0": "z0_ohm",
            }
        elif equation_id == "EQ_SC1_004":
            substitution = (
                f"Z_k = {cls._format_complex_latex(z1, 'Ω')} + "
                f"{cls._format_complex_latex(z2, 'Ω')} = "
                f"{cls._format_complex_latex(z_equiv, 'Ω')}"
            )
            input_symbols = [("Z_1", "Ω"), ("Z_2", "Ω")]
            input_values = (
                ProofValue.create("Z_1", z1, "Ω", "z1_ohm"),
                ProofValue.create("Z_2", z2, "Ω", "z2_ohm"),
            )
            source_keys = {
                "Z_k": "z_equiv_ohm",
                "Z_1": "z1_ohm",
                "Z_2": "z2_ohm",
            }
        else:
            denominator = z2 + z0
            substitution = (
                f"Z_k = {cls._format_complex_latex(z1, 'Ω')} + "
                f"({cls._format_complex_latex(z2, 'Ω')} \\cdot "
                f"{cls._format_complex_latex(z0, 'Ω')}) / "
                f"{cls._format_complex_latex(denominator, 'Ω')} = "
                f"{cls._format_complex_latex(z_equiv, 'Ω')}"
            )
            input_symbols = [("Z_1", "Ω"), ("Z_2", "Ω"), ("Z_0", "Ω")]
            input_values = (
                ProofValue.create("Z_1", z1, "Ω", "z1_ohm"),
                ProofValue.create("Z_2", z2, "Ω", "z2_ohm"),
                ProofValue.create("Z_0", z0, "Ω", "z0_ohm"),
            )
            source_keys = {
                "Z_k": "z_equiv_ohm",
                "Z_1": "z1_ohm",
                "Z_2": "z2_ohm",
                "Z_0": "z0_ohm",
            }
        result = ProofValue.create("Z_k", z_equiv, "Ω", "z_equiv_ohm")
        unit_check = UnitVerifier.verify_step(
            equation_id,
            input_symbols,
            "Ω",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC1", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys=source_keys,
        )

    @classmethod
    def _create_sc1_step_sequence_currents(
        cls,
        *,
        step_number: int,
        fault_type: str,
        u_prefault_kv: float,
        z_equiv: complex,
        z2: complex,
        z0: complex,
        i1: complex,
        i2: complex,
        i0: complex,
    ) -> ProofStep:
        equation = EQ_SC1_006
        input_values = (
            ProofValue.create("U_f", u_prefault_kv, "kV", "u_prefault_kv"),
            ProofValue.create("Z_k", z_equiv, "Ω", "z_equiv_ohm"),
            ProofValue.create("Z_2", z2, "Ω", "z2_ohm"),
            ProofValue.create("Z_0", z0, "Ω", "z0_ohm"),
        )

        if fault_type == "SC1FZ":
            substitution = (
                f"I_1 = I_2 = I_0 = {u_prefault_kv:.4f} / "
                f"{cls._format_complex_latex(z_equiv, 'Ω')} = "
                f"{cls._format_complex_latex(i1, 'kA')}"
            )
        elif fault_type == "SC2F":
            substitution = (
                f"I_1 = {u_prefault_kv:.4f} / {cls._format_complex_latex(z_equiv, 'Ω')} = "
                f"{cls._format_complex_latex(i1, 'kA')}, \\quad "
                f"I_2 = -I_1 = {cls._format_complex_latex(i2, 'kA')}, \\quad "
                r"I_0 = 0"
            )
        else:
            denominator = z2 + z0
            substitution = (
                f"I_1 = {u_prefault_kv:.4f} / {cls._format_complex_latex(z_equiv, 'Ω')} = "
                f"{cls._format_complex_latex(i1, 'kA')}, \\quad "
                f"I_2 = -\\frac{{Z_0}}{{Z_2 + Z_0}} I_1 = "
                f"{cls._format_complex_latex(i2, 'kA')}, \\quad "
                f"I_0 = -\\frac{{Z_2}}{{Z_2 + Z_0}} I_1 = "
                f"{cls._format_complex_latex(i0, 'kA')}, \\quad "
                f"Z_2 + Z_0 = {cls._format_complex_latex(denominator, 'Ω')}"
            )

        result = ProofValue.create("I_1", i1, "kA", "i1_ka")
        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("U_f", "kV"), ("Z_k", "Ω")],
            "kA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC1", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "U_f": "u_prefault_kv",
                "Z_k": "z_equiv_ohm",
                "Z_2": "z2_ohm",
                "Z_0": "z0_ohm",
                "I_1": "i1_ka",
                "I_2": "i2_ka",
                "I_0": "i0_ka",
            },
        )

    @classmethod
    def _create_sc1_step_phase_currents(
        cls,
        *,
        step_number: int,
        a_operator: complex,
        i0: complex,
        i1: complex,
        i2: complex,
        ia: complex,
        ib: complex,
        ic: complex,
    ) -> ProofStep:
        equation = EQ_SC1_007
        input_values = (
            ProofValue.create("I_0", i0, "kA", "i0_ka"),
            ProofValue.create("I_1", i1, "kA", "i1_ka"),
            ProofValue.create("I_2", i2, "kA", "i2_ka"),
            ProofValue.create("a", a_operator, "—", "a_operator"),
        )

        substitution = (
            f"I_a = I_0 + I_1 + I_2 = {cls._format_complex_latex(ia, 'kA')}, \\quad "
            f"I_b = I_0 + a^2 I_1 + a I_2 = {cls._format_complex_latex(ib, 'kA')}, \\quad "
            f"I_c = I_0 + a I_1 + a^2 I_2 = {cls._format_complex_latex(ic, 'kA')}"
        )

        result = ProofValue.create("I_a", ia, "kA", "ia_ka")
        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("I_0", "kA"), ("I_1", "kA"), ("I_2", "kA")],
            "kA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC1", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "I_0": "i0_ka",
                "I_1": "i1_ka",
                "I_2": "i2_ka",
                "I_a": "ia_ka",
                "I_b": "ib_ka",
                "I_c": "ic_ka",
                "a": "a_operator",
            },
        )

    @classmethod
    def _create_sc3f_step_z_th(
        cls,
        step_number: int,
        z_thevenin_ohm: complex,
        r_th: float,
        x_th: float,
    ) -> ProofStep:
        """Krok 1: Impedancja Thevenina (z solvera)."""
        equation = EQ_SC3F_003

        z_abs = abs(z_thevenin_ohm)

        input_values = (
            ProofValue.create("Z_{th}", z_thevenin_ohm, "Ω", "z_thevenin_ohm"),
        )

        substitution = (
            f"Z_{{th}} = {r_th:.4f} + j{x_th:.4f}\\,\\Omega, "
            f"\\quad |Z_{{th}}| = {z_abs:.4f}\\,\\Omega"
        )

        result = ProofValue.create("|Z_{th}|", z_abs, "Ω", "z_thevenin_abs_ohm")

        unit_check = UnitCheckResult(
            passed=True,
            expected_unit="Ω",
            computed_unit="Ω",
            input_units={"Z_th": "Ω"},
            derivation="Ω = Ω ✓",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC3F", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"Z_th": "z_thevenin_ohm"},
        )

    @classmethod
    def _create_sc3f_step_ikss(
        cls,
        step_number: int,
        c_factor: float,
        u_n_kv: float,
        z_th_abs: float,
        ikss_ka: float,
    ) -> ProofStep:
        """Krok 2: Początkowy prąd zwarciowy I_k'' (c TUTAJ — jedyne miejsce)."""
        equation = EQ_SC3F_004

        sqrt3 = math.sqrt(3)

        input_values = (
            ProofValue.create("c", c_factor, "—", "c_factor"),
            ProofValue.create("U_n", u_n_kv, "kV", "u_n_kv"),
            ProofValue.create("|Z_{th}|", z_th_abs, "Ω", "z_thevenin_abs_ohm"),
        )

        substitution = (
            f"I_k'' = \\frac{{{c_factor:.4f} \\cdot {u_n_kv:.4f}}}"
            f"{{\\sqrt{{3}} \\cdot {z_th_abs:.4f}}} = "
            f"\\frac{{{c_factor * u_n_kv:.4f}}}{{{sqrt3:.4f} \\cdot {z_th_abs:.4f}}} = "
            f"{ikss_ka:.4f}\\,\\text{{kA}}"
        )

        result = ProofValue.create("I_k''", ikss_ka, "kA", "ikss_ka")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"c": "—", "U_n": "kV", "Z_th": "Ω"},
            "kA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC3F", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "c": "c_factor",
                "U_n": "u_n_kv",
                "Z_th": "z_thevenin_ohm",
                "I_k''": "ikss_ka",
            },
        )

    @classmethod
    def _create_sc3f_step_kappa(
        cls,
        step_number: int,
        r_th: float,
        x_th: float,
        kappa: float,
    ) -> ProofStep:
        """Krok 3: Współczynnik udaru κ."""
        equation = EQ_SC3F_005

        rx_ratio = r_th / x_th if x_th != 0 else 0
        exp_term = math.exp(-3 * rx_ratio)

        input_values = (
            ProofValue.create("R_{th}", r_th, "Ω", "r_thevenin_ohm"),
            ProofValue.create("X_{th}", x_th, "Ω", "x_thevenin_ohm"),
        )

        substitution = (
            f"\\kappa = 1.02 + 0.98 \\cdot e^{{-3 \\cdot {rx_ratio:.4f}}} = "
            f"1.02 + 0.98 \\cdot {exp_term:.4f} = {kappa:.4f}"
        )

        result = ProofValue.create("\\kappa", kappa, "—", "kappa")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"R_th": "Ω", "X_th": "Ω"},
            "—",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC3F", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "R_th": "r_thevenin_ohm",
                "X_th": "x_thevenin_ohm",
                "κ": "kappa",
            },
        )

    @classmethod
    def _create_sc3f_step_ip(
        cls,
        step_number: int,
        kappa: float,
        ikss_ka: float,
        ip_ka: float,
    ) -> ProofStep:
        """Krok 4: Prąd udarowy i_p."""
        equation = EQ_SC3F_006

        sqrt2 = math.sqrt(2)

        input_values = (
            ProofValue.create("\\kappa", kappa, "—", "kappa"),
            ProofValue.create("I_k''", ikss_ka, "kA", "ikss_ka"),
        )

        substitution = (
            f"i_p = {kappa:.4f} \\cdot \\sqrt{{2}} \\cdot {ikss_ka:.4f} = "
            f"{kappa:.4f} \\cdot {sqrt2:.4f} \\cdot {ikss_ka:.4f} = "
            f"{ip_ka:.4f}\\,\\text{{kA}}"
        )

        result = ProofValue.create("i_p", ip_ka, "kA", "ip_ka")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"κ": "—", "I_k''": "kA"},
            "kA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC3F", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"κ": "kappa", "I_k''": "ikss_ka", "i_p": "ip_ka"},
        )

    @classmethod
    def _create_sc3f_step_idyn(
        cls,
        step_number: int,
        ip_ka: float,
        idyn_ka: float,
    ) -> ProofStep:
        """Krok 5: Prąd dynamiczny I_dyn (OBOWIĄZKOWY)."""
        equation = EQ_SC3F_008a

        input_values = (
            ProofValue.create("i_p", ip_ka, "kA", "ip_ka"),
        )

        substitution = f"I_{{dyn}} = i_p = {idyn_ka:.4f}\\,\\text{{kA}}"

        result = ProofValue.create("I_{dyn}", idyn_ka, "kA", "idyn_ka")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"i_p": "kA"},
            "kA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC3F", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"i_p": "ip_ka", "I_dyn": "idyn_ka"},
        )

    @classmethod
    def _create_sc3f_step_ith(
        cls,
        step_number: int,
        ikss_ka: float,
        m_factor: float,
        n_factor: float,
        ith_ka: float,
    ) -> ProofStep:
        """Krok 6: Prąd cieplny I_th (OBOWIĄZKOWY)."""
        equation = EQ_SC3F_008

        sqrt_mn = math.sqrt(m_factor + n_factor)

        input_values = (
            ProofValue.create("I_k''", ikss_ka, "kA", "ikss_ka"),
            ProofValue.create("m", m_factor, "—", "m_factor"),
            ProofValue.create("n", n_factor, "—", "n_factor"),
        )

        substitution = (
            f"I_{{th}} = {ikss_ka:.4f} \\cdot \\sqrt{{{m_factor:.4f} + {n_factor:.4f}}} = "
            f"{ikss_ka:.4f} \\cdot {sqrt_mn:.4f} = {ith_ka:.4f}\\,\\text{{kA}}"
        )

        result = ProofValue.create("I_{th}", ith_ka, "kA", "ith_ka")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"I_k''": "kA", "m": "—", "n": "—"},
            "kA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC3F", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "I_k''": "ikss_ka",
                "m": "m_factor",
                "n": "n_factor",
                "I_th": "ith_ka",
            },
        )

    @classmethod
    def _create_sc3f_step_sk(
        cls,
        step_number: int,
        u_n_kv: float,
        ikss_ka: float,
        sk_mva: float,
    ) -> ProofStep:
        """Krok 7: Moc zwarciowa S_k''."""
        equation = EQ_SC3F_007

        sqrt3 = math.sqrt(3)

        input_values = (
            ProofValue.create("U_n", u_n_kv, "kV", "u_n_kv"),
            ProofValue.create("I_k''", ikss_ka, "kA", "ikss_ka"),
        )

        substitution = (
            f"S_k'' = \\sqrt{{3}} \\cdot {u_n_kv:.4f} \\cdot {ikss_ka:.4f} = "
            f"{sqrt3:.4f} \\cdot {u_n_kv:.4f} \\cdot {ikss_ka:.4f} = "
            f"{sk_mva:.4f}\\,\\text{{MVA}}"
        )

        result = ProofValue.create("S_k''", sk_mva, "MVA", "sk_mva")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"U_n": "kV", "I_k''": "kA"},
            "MVA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("SC3F", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"U_n": "u_n_kv", "I_k''": "ikss_ka", "S_k''": "sk_mva"},
        )

    # =========================================================================
    # VDROP Generator
    # =========================================================================

    @classmethod
    def generate_vdrop_proof(
        cls,
        data: VDROPInput,
        artifact_id: UUID | None = None,
    ) -> ProofDocument:
        """
        Generuje dowód VDROP (spadki napięć).

        Kroki obowiązkowe (BINDING):
        1. Rezystancja odcinka R
        2. Reaktancja odcinka X
        3. Składowa czynna ΔU_R
        4. Składowa bierna ΔU_X
        5. Spadek na odcinku ΔU
        6. Suma spadków ΔU_total
        7. Napięcie w punkcie U

        Args:
            data: Dane wejściowe VDROPInput
            artifact_id: Opcjonalny ID artefaktu

        Returns:
            ProofDocument z pełnym dowodem
        """
        if artifact_id is None:
            artifact_id = uuid4()

        if not data.segments:
            raise ValueError("VDROP proof requires at least one segment.")
        if len(data.segments) != 1:
            raise ValueError("VDROP MVP requires exactly one segment.")

        segment = data.segments[0]

        r_ohm = segment.r_ohm_per_km * segment.length_km
        x_ohm = segment.x_ohm_per_km * segment.length_km
        delta_u_r = (r_ohm * segment.p_mw) / (segment.u_n_kv ** 2) * 100
        delta_u_x = (x_ohm * segment.q_mvar) / (segment.u_n_kv ** 2) * 100
        delta_u = delta_u_r + delta_u_x
        segment_drops = [delta_u]
        delta_u_total = sum(segment_drops)
        u_kv = data.u_source_kv * (1 - delta_u_total / 100)

        step_builders = {
            "EQ_VDROP_001": lambda step_number: cls._create_vdrop_step_r(
                step_number,
                segment.r_ohm_per_km,
                segment.length_km,
                r_ohm,
                segment.segment_id,
            ),
            "EQ_VDROP_002": lambda step_number: cls._create_vdrop_step_x(
                step_number,
                segment.x_ohm_per_km,
                segment.length_km,
                x_ohm,
                segment.segment_id,
            ),
            "EQ_VDROP_003": lambda step_number: cls._create_vdrop_step_du_r(
                step_number,
                r_ohm,
                segment.p_mw,
                segment.u_n_kv,
                delta_u_r,
                segment.segment_id,
            ),
            "EQ_VDROP_004": lambda step_number: cls._create_vdrop_step_du_x(
                step_number,
                x_ohm,
                segment.q_mvar,
                segment.u_n_kv,
                delta_u_x,
                segment.segment_id,
            ),
            "EQ_VDROP_005": lambda step_number: cls._create_vdrop_step_du(
                step_number,
                delta_u_r,
                delta_u_x,
                delta_u,
                segment.segment_id,
            ),
            "EQ_VDROP_006": lambda step_number: cls._create_vdrop_step_total(
                step_number,
                segment_drops,
                delta_u_total,
            ),
            "EQ_VDROP_007": lambda step_number: cls._create_vdrop_step_u(
                step_number,
                data.u_source_kv,
                delta_u_total,
                u_kv,
            ),
        }

        steps: list[ProofStep] = []
        for step_number, equation_id in enumerate(EquationRegistry.VDROP_STEP_ORDER, start=1):
            steps.append(step_builders[equation_id](step_number))

        # Podsumowanie
        unit_checks_passed = all(s.unit_check.passed for s in steps)

        key_results = {
            "delta_u_total_percent": ProofValue.create(
                "\\Delta U_{total}", delta_u_total, "%", "delta_u_total_percent"
            ),
            "u_kv": ProofValue.create("U", u_kv, "kV", "u_kv"),
        }

        summary = ProofSummary(
            key_results=key_results,
            unit_check_passed=unit_checks_passed,
            total_steps=len(steps),
            warnings=(),
        )

        header = ProofHeader(
            project_name=data.project_name,
            case_name=data.case_name,
            run_timestamp=data.run_timestamp,
            solver_version=data.solver_version,
            source_bus=data.source_bus_id,
            target_bus=data.target_bus_id,
        )

        return ProofDocument.create(
            artifact_id=artifact_id,
            proof_type=ProofType.VDROP,
            title_pl="Dowód obliczeń spadków napięć",
            header=header,
            steps=steps,
            summary=summary,
        )

    # =========================================================================
    # VDROP Step Builders
    # =========================================================================

    @classmethod
    def _create_vdrop_step_r(
        cls,
        step_number: int,
        r_per_km: float,
        length_km: float,
        r_ohm: float,
        segment_id: str,
    ) -> ProofStep:
        """Rezystancja odcinka R."""
        equation = EQ_VDROP_001

        input_values = (
            ProofValue.create("r", r_per_km, "Ω/km", "r_ohm_per_km"),
            ProofValue.create("l", length_km, "km", "length_km"),
        )

        substitution = (
            f"R = {r_per_km:.4f} \\cdot {length_km:.4f} = {r_ohm:.4f}\\,\\Omega"
        )

        result = ProofValue.create("R", r_ohm, "Ω", "r_ohm")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"r": "Ω/km", "l": "km"},
            "Ω",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("VDROP", step_number),
            step_number=step_number,
            title_pl=f"{equation.name_pl} (odcinek {segment_id})",
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"r": "r_ohm_per_km", "l": "length_km", "R": "r_ohm"},
        )

    @classmethod
    def _create_vdrop_step_x(
        cls,
        step_number: int,
        x_per_km: float,
        length_km: float,
        x_ohm: float,
        segment_id: str,
    ) -> ProofStep:
        """Reaktancja odcinka X."""
        equation = EQ_VDROP_002

        input_values = (
            ProofValue.create("x", x_per_km, "Ω/km", "x_ohm_per_km"),
            ProofValue.create("l", length_km, "km", "length_km"),
        )

        substitution = (
            f"X = {x_per_km:.4f} \\cdot {length_km:.4f} = {x_ohm:.4f}\\,\\Omega"
        )

        result = ProofValue.create("X", x_ohm, "Ω", "x_ohm")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"x": "Ω/km", "l": "km"},
            "Ω",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("VDROP", step_number),
            step_number=step_number,
            title_pl=f"{equation.name_pl} (odcinek {segment_id})",
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"x": "x_ohm_per_km", "l": "length_km", "X": "x_ohm"},
        )

    @classmethod
    def _create_vdrop_step_du_r(
        cls,
        step_number: int,
        r_ohm: float,
        p_mw: float,
        u_n_kv: float,
        delta_u_r: float,
        segment_id: str,
    ) -> ProofStep:
        """Składowa czynna spadku ΔU_R."""
        equation = EQ_VDROP_003

        input_values = (
            ProofValue.create("R", r_ohm, "Ω", "r_ohm"),
            ProofValue.create("P", p_mw, "MW", "p_mw"),
            ProofValue.create("U_n", u_n_kv, "kV", "u_n_kv"),
        )

        substitution = (
            f"\\Delta U_R = \\frac{{{r_ohm:.4f} \\cdot {p_mw:.4f}}}"
            f"{{{u_n_kv:.4f}^2}} \\cdot 100\\% = {delta_u_r:.4f}\\%"
        )

        result = ProofValue.create("\\Delta U_R", delta_u_r, "%", "delta_u_r_percent")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"R": "Ω", "P": "MW", "U_n": "kV"},
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("VDROP", step_number),
            step_number=step_number,
            title_pl=f"{equation.name_pl} (odcinek {segment_id})",
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "R": "r_ohm",
                "P": "p_mw",
                "U_n": "u_n_kv",
                "ΔU_R": "delta_u_r_percent",
            },
        )

    @classmethod
    def _create_vdrop_step_du_x(
        cls,
        step_number: int,
        x_ohm: float,
        q_mvar: float,
        u_n_kv: float,
        delta_u_x: float,
        segment_id: str,
    ) -> ProofStep:
        """Składowa bierna spadku ΔU_X."""
        equation = EQ_VDROP_004

        input_values = (
            ProofValue.create("X", x_ohm, "Ω", "x_ohm"),
            ProofValue.create("Q", q_mvar, "Mvar", "q_mvar"),
            ProofValue.create("U_n", u_n_kv, "kV", "u_n_kv"),
        )

        substitution = (
            f"\\Delta U_X = \\frac{{{x_ohm:.4f} \\cdot {q_mvar:.4f}}}"
            f"{{{u_n_kv:.4f}^2}} \\cdot 100\\% = {delta_u_x:.4f}\\%"
        )

        result = ProofValue.create("\\Delta U_X", delta_u_x, "%", "delta_u_x_percent")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"X": "Ω", "Q": "Mvar", "U_n": "kV"},
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("VDROP", step_number),
            step_number=step_number,
            title_pl=f"{equation.name_pl} (odcinek {segment_id})",
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "X": "x_ohm",
                "Q": "q_mvar",
                "U_n": "u_n_kv",
                "ΔU_X": "delta_u_x_percent",
            },
        )

    @classmethod
    def _create_vdrop_step_du(
        cls,
        step_number: int,
        delta_u_r: float,
        delta_u_x: float,
        delta_u: float,
        segment_id: str,
    ) -> ProofStep:
        """Spadek na odcinku ΔU."""
        equation = EQ_VDROP_005

        input_values = (
            ProofValue.create("\\Delta U_R", delta_u_r, "%", "delta_u_r_percent"),
            ProofValue.create("\\Delta U_X", delta_u_x, "%", "delta_u_x_percent"),
        )

        substitution = (
            f"\\Delta U = {delta_u_r:.4f} + {delta_u_x:.4f} = {delta_u:.4f}\\%"
        )

        result = ProofValue.create("\\Delta U", delta_u, "%", "delta_u_percent")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"ΔU_R": "%", "ΔU_X": "%"},
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("VDROP", step_number),
            step_number=step_number,
            title_pl=f"{equation.name_pl} (odcinek {segment_id})",
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "ΔU_R": "delta_u_r_percent",
                "ΔU_X": "delta_u_x_percent",
                "ΔU": "delta_u_percent",
            },
        )

    @classmethod
    def _create_vdrop_step_total(
        cls,
        step_number: int,
        segment_drops: list[float],
        delta_u_total: float,
    ) -> ProofStep:
        """Suma spadków ΔU_total."""
        equation = EQ_VDROP_006

        input_values = tuple(
            ProofValue.create("\\Delta U_i", drop, "%", "delta_u_segments")
            for i, drop in enumerate(segment_drops)
        )

        drops_str = " + ".join(f"{d:.4f}" for d in segment_drops)
        substitution = (
            f"\\Delta U_{{total}} = {drops_str} = {delta_u_total:.4f}\\%"
        )

        result = ProofValue.create(
            "\\Delta U_{total}", delta_u_total, "%", "delta_u_total_percent"
        )

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"ΔU_i": "%"},
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("VDROP", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"ΔU_i": "delta_u_segments", "ΔU_total": "delta_u_total_percent"},
        )

    @classmethod
    def _create_vdrop_step_u(
        cls,
        step_number: int,
        u_source_kv: float,
        delta_u_total: float,
        u_kv: float,
    ) -> ProofStep:
        """Napięcie w punkcie po uwzględnieniu spadku."""
        equation = EQ_VDROP_007

        input_values = (
            ProofValue.create("U_{source}", u_source_kv, "kV", "u_source_kv"),
            ProofValue.create("\\Delta U_{total}", delta_u_total, "%", "delta_u_total_percent"),
        )

        substitution = (
            f"U = {u_source_kv:.4f} \\cdot \\left(1 - \\frac{{{delta_u_total:.4f}}}{{100}}\\right) = "
            f"{u_kv:.4f}\\,\\text{{kV}}"
        )

        result = ProofValue.create("U", u_kv, "kV", "u_kv")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"U_{source}": "kV", "ΔU_{total}": "%"},
            "kV",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("VDROP", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "U_{source}": "u_source_kv",
                "ΔU_{total}": "delta_u_total_percent",
                "U": "u_kv",
            },
        )

    # =========================================================================
    # Q(U) Generator — P11.1b
    # =========================================================================

    @classmethod
    def generate_qu_proof(
        cls,
        data: QUInput,
        artifact_id: UUID | None = None,
    ) -> ProofDocument:
        """
        Generuje dowód Q(U) (regulacja mocy biernej).

        Kroki obowiązkowe (BINDING):
        1. Odchylenie napięcia ΔU = U_meas - U_ref
        2. Funkcja martwej strefy s(U)
        3. Surowa moc bierna Q_raw = k_Q · s(U)
        4. Końcowa moc bierna Q_cmd z limitami

        Args:
            data: Dane wejściowe QUInput
            artifact_id: Opcjonalny ID artefaktu

        Returns:
            ProofDocument z pełnym dowodem
        """
        if artifact_id is None:
            artifact_id = uuid4()

        # Obliczenia
        delta_u_kv = data.u_meas_kv - data.u_ref_kv

        # Deadband: określenie gałęzi
        if delta_u_kv > data.u_dead_kv:
            s_u_kv = delta_u_kv - data.u_dead_kv
            deadband_branch = "above"
        elif delta_u_kv < -data.u_dead_kv:
            s_u_kv = delta_u_kv + data.u_dead_kv
            deadband_branch = "below"
        else:
            s_u_kv = 0.0
            deadband_branch = "inside"

        q_raw_mvar = data.k_q_mvar_per_kv * s_u_kv
        q_cmd_mvar = min(max(q_raw_mvar, data.q_min_mvar), data.q_max_mvar)

        steps: list[ProofStep] = []

        # Krok 1: ΔU
        steps.append(cls._create_qu_step_delta_u(
            step_number=1,
            u_meas_kv=data.u_meas_kv,
            u_ref_kv=data.u_ref_kv,
            delta_u_kv=delta_u_kv,
        ))

        # Krok 2: s(U) deadband
        steps.append(cls._create_qu_step_deadband(
            step_number=2,
            delta_u_kv=delta_u_kv,
            u_dead_kv=data.u_dead_kv,
            s_u_kv=s_u_kv,
            deadband_branch=deadband_branch,
        ))

        # Krok 3: Q_raw
        steps.append(cls._create_qu_step_q_raw(
            step_number=3,
            k_q_mvar_per_kv=data.k_q_mvar_per_kv,
            s_u_kv=s_u_kv,
            q_raw_mvar=q_raw_mvar,
        ))

        # Krok 4: Q_cmd z limitami
        steps.append(cls._create_qu_step_q_cmd(
            step_number=4,
            q_raw_mvar=q_raw_mvar,
            q_min_mvar=data.q_min_mvar,
            q_max_mvar=data.q_max_mvar,
            q_cmd_mvar=q_cmd_mvar,
        ))

        # Krok 5: P11.1c — Wpływ Q_cmd na napięcie U (VDROP link)
        # Tylko jeśli podano dane VDROP (opcjonalne)
        has_vdrop_link = (
            data.vdrop_delta_u_x_percent is not None
            and data.vdrop_delta_u_percent is not None
            and data.vdrop_u_kv is not None
        )

        if has_vdrop_link:
            steps.append(cls._create_qu_step_vdrop_link(
                step_number=5,
                q_cmd_mvar=q_cmd_mvar,
                delta_u_x_percent=data.vdrop_delta_u_x_percent,
                delta_u_percent=data.vdrop_delta_u_percent,
                u_kv=data.vdrop_u_kv,
            ))

        # Podsumowanie
        unit_checks_passed = all(s.unit_check.passed for s in steps)

        key_results = {
            "delta_u_kv": ProofValue.create("\\Delta U", delta_u_kv, "kV", "delta_u_kv"),
            "s_u_kv": ProofValue.create("s(U)", s_u_kv, "kV", "s_u_kv"),
            "q_raw_mvar": ProofValue.create("Q_{raw}", q_raw_mvar, "Mvar", "q_raw_mvar"),
            "q_cmd_mvar": ProofValue.create("Q_{cmd}", q_cmd_mvar, "Mvar", "q_cmd_mvar"),
        }

        # P11.1c: Dodaj wyniki VDROP do key_results jeśli dostępne
        if has_vdrop_link:
            key_results["vdrop_delta_u_x_percent"] = ProofValue.create(
                "\\Delta U_X", data.vdrop_delta_u_x_percent, "%", "vdrop_delta_u_x_percent"
            )
            key_results["vdrop_delta_u_percent"] = ProofValue.create(
                "\\Delta U", data.vdrop_delta_u_percent, "%", "vdrop_delta_u_percent"
            )
            key_results["vdrop_u_kv"] = ProofValue.create(
                "U", data.vdrop_u_kv, "kV", "vdrop_u_kv"
            )

        summary = ProofSummary(
            key_results=key_results,
            unit_check_passed=unit_checks_passed,
            total_steps=len(steps),
            warnings=(),
        )

        header = ProofHeader(
            project_name=data.project_name,
            case_name=data.case_name,
            run_timestamp=data.run_timestamp,
            solver_version="Q(U) P11.1b",
        )

        return ProofDocument.create(
            artifact_id=artifact_id,
            proof_type=ProofType.Q_U_REGULATION,
            title_pl="Dowód regulacji mocy biernej Q(U)",
            header=header,
            steps=steps,
            summary=summary,
        )

    @classmethod
    def generate_qu_counterfactual(
        cls,
        cf: QUCounterfactualInput,
        artifact_id: UUID | None = None,
    ) -> ProofDocument:
        """
        Generuje dowód porównawczy (counterfactual) A vs B dla Q(U).

        Args:
            cf: Dane wejściowe QUCounterfactualInput z dwoma scenariuszami
            artifact_id: Opcjonalny ID artefaktu

        Returns:
            ProofDocument z porównaniem A vs B i różnicami w summary
        """
        if artifact_id is None:
            artifact_id = uuid4()

        # Generuj proof A i B wewnętrznie
        proof_a = cls.generate_qu_proof(cf.a)
        proof_b = cls.generate_qu_proof(cf.b)

        # Wyciągnij wartości końcowe
        k_q_a = cf.a.k_q_mvar_per_kv
        k_q_b = cf.b.k_q_mvar_per_kv
        q_raw_a = proof_a.summary.key_results["q_raw_mvar"].value
        q_raw_b = proof_b.summary.key_results["q_raw_mvar"].value
        q_cmd_a = proof_a.summary.key_results["q_cmd_mvar"].value
        q_cmd_b = proof_b.summary.key_results["q_cmd_mvar"].value

        # Oblicz delty
        delta_k_q = k_q_b - k_q_a
        delta_q_raw = q_raw_b - q_raw_a
        delta_q_cmd = q_cmd_b - q_cmd_a

        # Połącz kroki z obu dowodów (A jako kroki 1-4, B jako kroki 5-8)
        steps: list[ProofStep] = []

        # Kroki z proof A (renumerowane)
        for i, step in enumerate(proof_a.steps, start=1):
            new_step = ProofStep(
                step_id=f"QU_CF_A_STEP_{i:03d}",
                step_number=i,
                title_pl=f"[A] {step.title_pl}",
                equation=step.equation,
                input_values=step.input_values,
                substitution_latex=step.substitution_latex,
                result=step.result,
                unit_check=step.unit_check,
                source_keys=step.source_keys,
            )
            steps.append(new_step)

        # Kroki z proof B (renumerowane)
        offset = len(proof_a.steps)
        for i, step in enumerate(proof_b.steps, start=1):
            new_step = ProofStep(
                step_id=f"QU_CF_B_STEP_{i:03d}",
                step_number=offset + i,
                title_pl=f"[B] {step.title_pl}",
                equation=step.equation,
                input_values=step.input_values,
                substitution_latex=step.substitution_latex,
                result=step.result,
                unit_check=step.unit_check,
                source_keys=step.source_keys,
            )
            steps.append(new_step)

        # Podsumowanie z counterfactual_diff
        unit_checks_passed = all(s.unit_check.passed for s in steps)

        key_results = {
            "delta_k_q": ProofValue.create("\\Delta k_Q", delta_k_q, "Mvar/kV", "delta_k_q"),
            "delta_q_raw": ProofValue.create("\\Delta Q_{raw}", delta_q_raw, "Mvar", "delta_q_raw"),
            "delta_q_cmd": ProofValue.create("\\Delta Q_{cmd}", delta_q_cmd, "Mvar", "delta_q_cmd"),
            "q_cmd_a": ProofValue.create("Q_{cmd,A}", q_cmd_a, "Mvar", "q_cmd_a"),
            "q_cmd_b": ProofValue.create("Q_{cmd,B}", q_cmd_b, "Mvar", "q_cmd_b"),
        }

        # P11.1c: Dodaj U_A, U_B, delta_u_kv jeśli dane VDROP są dostępne
        has_vdrop_a = cf.a.vdrop_u_kv is not None
        has_vdrop_b = cf.b.vdrop_u_kv is not None

        if has_vdrop_a and has_vdrop_b:
            u_a = cf.a.vdrop_u_kv
            u_b = cf.b.vdrop_u_kv
            delta_u_voltage = u_b - u_a

            key_results["u_a_kv"] = ProofValue.create("U_A", u_a, "kV", "u_a_kv")
            key_results["u_b_kv"] = ProofValue.create("U_B", u_b, "kV", "u_b_kv")
            key_results["delta_u_voltage_kv"] = ProofValue.create(
                "\\Delta U_{(B-A)}", delta_u_voltage, "kV", "delta_u_voltage_kv"
            )

        summary = ProofSummary(
            key_results=key_results,
            unit_check_passed=unit_checks_passed,
            total_steps=len(steps),
            warnings=(),
        )

        header = ProofHeader(
            project_name=f"{cf.a.project_name} vs {cf.b.project_name}",
            case_name=f"{cf.a.case_name} vs {cf.b.case_name}",
            run_timestamp=cf.a.run_timestamp,
            solver_version="Q(U) Counterfactual P11.1b + P11.1c",
        )

        return ProofDocument.create(
            artifact_id=artifact_id,
            proof_type=ProofType.Q_U_REGULATION,
            title_pl="Dowód porównawczy (counterfactual) Q(U): A vs B",
            header=header,
            steps=steps,
            summary=summary,
        )

    # =========================================================================
    # Q(U) Step Builders
    # =========================================================================

    @classmethod
    def _create_qu_step_delta_u(
        cls,
        step_number: int,
        u_meas_kv: float,
        u_ref_kv: float,
        delta_u_kv: float,
    ) -> ProofStep:
        """Krok 1: Odchylenie napięcia ΔU = U_meas - U_ref."""
        equation = EQ_QU_001

        input_values = (
            ProofValue.create("U_{meas}", u_meas_kv, "kV", "u_meas_kv"),
            ProofValue.create("U_{ref}", u_ref_kv, "kV", "u_ref_kv"),
        )

        substitution = (
            f"\\Delta U = {u_meas_kv:.4f} - {u_ref_kv:.4f} = {delta_u_kv:.4f}\\,\\text{{kV}}"
        )

        result = ProofValue.create("\\Delta U", delta_u_kv, "kV", "delta_u_kv")

        unit_check = UnitCheckResult(
            passed=True,
            expected_unit="kV",
            computed_unit="kV",
            input_units={"U_meas": "kV", "U_ref": "kV"},
            derivation="kV - kV = kV ✓",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("QU", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "U_meas": "u_meas_kv",
                "U_ref": "u_ref_kv",
                "ΔU": "delta_u_kv",
            },
        )

    # =========================================================================
    # P15: Load Currents & Overload
    # =========================================================================

    @classmethod
    def generate_load_currents_proof(
        cls,
        data: LoadCurrentsInput,
        artifact_id: UUID | None = None,
    ) -> ProofDocument:
        """
        Generuje dowód P15: Prądy robocze i przeciążenia.

        Reguły:
        - LINE/CABLE: wymagany in_a, liczone k_I i m_I.
        - TRANSFORMER: wymagany sn_mva, liczone k_S i m_S.
        - Brakujące pola → ValueError (PL).
        """
        if artifact_id is None:
            artifact_id = uuid4()

        if data.element_kind in (LoadElementKind.LINE, LoadElementKind.CABLE):
            if data.in_a is None:
                raise ValueError("Brak prądu znamionowego in_a dla linii/kabla.")
        elif data.element_kind == LoadElementKind.TRANSFORMER:
            if data.sn_mva is None:
                raise ValueError("Brak mocy znamionowej sn_mva dla transformatora.")
        else:
            raise ValueError(f"Nieobsługiwany element_kind: {data.element_kind}")

        if data.u_ll_kv is None:
            raise ValueError("Brak napięcia międzyfazowego u_ll_kv.")
        if data.p_mw is None or data.q_mvar is None:
            raise ValueError("Brak mocy czynnej/biernej p_mw/q_mvar.")

        s_mva = math.sqrt(data.p_mw ** 2 + data.q_mvar ** 2)

        compute_current = (
            data.element_kind in (LoadElementKind.LINE, LoadElementKind.CABLE)
            or data.in_a is not None
        )
        i_ka = (
            s_mva / (math.sqrt(3) * data.u_ll_kv)
            if compute_current
            else None
        )
        in_ka = data.in_a / 1000.0 if data.in_a is not None else None

        k_i_percent = (
            100.0 * (i_ka / in_ka) if i_ka is not None and in_ka is not None else None
        )

        if i_ka is None or in_ka is None:
            m_i_percent = None
        elif i_ka == 0:
            m_i_percent = "+∞"
        else:
            m_i_percent = 100.0 * ((in_ka / i_ka) - 1.0)

        k_s_percent = (
            100.0 * (s_mva / data.sn_mva)
            if data.sn_mva is not None
            else None
        )

        if data.sn_mva is None:
            m_s_percent = None
        elif s_mva == 0:
            m_s_percent = "+∞"
        else:
            m_s_percent = 100.0 * ((data.sn_mva / s_mva) - 1.0)

        steps: list[ProofStep] = []
        step_number = 0

        for eq_id in EquationRegistry.get_lc_step_order():
            if eq_id == "EQ_LC_001":
                step_number += 1
                steps.append(
                    cls._create_lc_step_s(
                        step_number=step_number,
                        p_mw=data.p_mw,
                        q_mvar=data.q_mvar,
                        s_mva=s_mva,
                    )
                )
            elif eq_id == "EQ_LC_002" and compute_current:
                step_number += 1
                steps.append(
                    cls._create_lc_step_i(
                        step_number=step_number,
                        s_mva=s_mva,
                        u_ll_kv=data.u_ll_kv,
                        i_ka=i_ka or 0.0,
                    )
                )
            elif eq_id == "EQ_LC_003" and in_ka is not None and i_ka is not None:
                step_number += 1
                steps.append(
                    cls._create_lc_step_k_i(
                        step_number=step_number,
                        i_ka=i_ka,
                        in_ka=in_ka,
                        k_i_percent=k_i_percent or 0.0,
                    )
                )
            elif eq_id == "EQ_LC_004" and in_ka is not None and i_ka is not None:
                step_number += 1
                steps.append(
                    cls._create_lc_step_m_i(
                        step_number=step_number,
                        i_ka=i_ka,
                        in_ka=in_ka,
                        m_i_percent=m_i_percent,
                    )
                )
            elif eq_id == "EQ_LC_005" and data.element_kind == LoadElementKind.TRANSFORMER:
                step_number += 1
                steps.append(
                    cls._create_lc_step_k_s(
                        step_number=step_number,
                        s_mva=s_mva,
                        sn_mva=data.sn_mva or 0.0,
                        k_s_percent=k_s_percent or 0.0,
                    )
                )
            elif eq_id == "EQ_LC_006" and data.element_kind == LoadElementKind.TRANSFORMER:
                step_number += 1
                steps.append(
                    cls._create_lc_step_m_s(
                        step_number=step_number,
                        s_mva=s_mva,
                        sn_mva=data.sn_mva or 0.0,
                        m_s_percent=m_s_percent,
                    )
                )

        unit_checks_passed = all(step.unit_check.passed for step in steps)

        key_results: dict[str, ProofValue] = {
            "s_mva": ProofValue.create("S", s_mva, "MVA", "s_mva"),
        }

        if i_ka is not None:
            key_results["i_ka"] = ProofValue.create("I", i_ka, "kA", "i_ka")
        if k_i_percent is not None:
            key_results["k_i_percent"] = ProofValue.create(
                "k_I", k_i_percent, "%", "k_i_percent"
            )
        if m_i_percent is not None:
            key_results["m_i_percent"] = cls._proof_value_from_maybe_string(
                symbol="m_I",
                value=m_i_percent,
                unit="%",
                source_key="m_i_percent",
            )
        if k_s_percent is not None:
            key_results["k_s_percent"] = ProofValue.create(
                "k_S", k_s_percent, "%", "k_s_percent"
            )
        if m_s_percent is not None:
            key_results["m_s_percent"] = cls._proof_value_from_maybe_string(
                symbol="m_S",
                value=m_s_percent,
                unit="%",
                source_key="m_s_percent",
            )

        summary = ProofSummary(
            key_results=key_results,
            unit_check_passed=unit_checks_passed,
            total_steps=len(steps),
            warnings=(),
        )

        header = ProofHeader(
            project_name=data.project_name,
            case_name=data.case_name,
            run_timestamp=data.run_timestamp,
            solver_version="P15 Load Currents",
        )

        title = "Dowód: Prądy robocze i przeciążenia (P15)"

        return ProofDocument.create(
            artifact_id=artifact_id,
            proof_type=ProofType.LOAD_CURRENTS_OVERLOAD,
            title_pl=title,
            header=header,
            steps=steps,
            summary=summary,
        )

    @classmethod
    def generate_load_currents_counterfactual(
        cls,
        cf: LoadCurrentsCounterfactualInput,
        artifact_id: UUID | None = None,
    ) -> ProofDocument:
        """
        Generuje dowód porównawczy A vs B dla P15.

        Do summary.counterfactual_diff trafiają wyłącznie różnice liczbowe.
        """
        if artifact_id is None:
            artifact_id = uuid4()

        proof_a = cls.generate_load_currents_proof(cf.a)
        proof_b = cls.generate_load_currents_proof(cf.b)

        steps: list[ProofStep] = []

        for i, step in enumerate(proof_a.steps, start=1):
            steps.append(
                ProofStep(
                    step_id=f"LC_CF_A_STEP_{i:03d}",
                    step_number=i,
                    title_pl=f"[A] {step.title_pl}",
                    equation=step.equation,
                    input_values=step.input_values,
                    substitution_latex=step.substitution_latex,
                    result=step.result,
                    unit_check=step.unit_check,
                    source_keys=step.source_keys,
                )
            )

        offset = len(proof_a.steps)
        for i, step in enumerate(proof_b.steps, start=1):
            steps.append(
                ProofStep(
                    step_id=f"LC_CF_B_STEP_{i:03d}",
                    step_number=offset + i,
                    title_pl=f"[B] {step.title_pl}",
                    equation=step.equation,
                    input_values=step.input_values,
                    substitution_latex=step.substitution_latex,
                    result=step.result,
                    unit_check=step.unit_check,
                    source_keys=step.source_keys,
                )
            )

        unit_checks_passed = all(step.unit_check.passed for step in steps)

        key_results: dict[str, ProofValue] = {}
        counterfactual_diff: dict[str, ProofValue] = {}

        def _add_pair(key: str, symbol: str):
            val_a = proof_a.summary.key_results.get(key)
            val_b = proof_b.summary.key_results.get(key)
            if not val_a or not val_b:
                return
            key_results[f"{key}_a"] = cls._clone_proof_value(
                val_a, f"{symbol}_A", f"{key}_a"
            )
            key_results[f"{key}_b"] = cls._clone_proof_value(
                val_b, f"{symbol}_B", f"{key}_b"
            )
            delta = cls._numeric_diff_value(
                val_a.value, val_b.value, f"\\Delta {symbol}", val_a.unit, f"delta_{key}"
            )
            if delta is not None:
                counterfactual_diff[f"delta_{key}"] = delta

        _add_pair("s_mva", "S")
        _add_pair("i_ka", "I")
        _add_pair("k_i_percent", "k_I")
        _add_pair("m_i_percent", "m_I")
        _add_pair("k_s_percent", "k_S")
        _add_pair("m_s_percent", "m_S")

        summary = ProofSummary(
            key_results=key_results,
            unit_check_passed=unit_checks_passed,
            total_steps=len(steps),
            warnings=(),
            counterfactual_diff=counterfactual_diff,
        )

        header = ProofHeader(
            project_name=f"{cf.a.project_name} vs {cf.b.project_name}",
            case_name=f"{cf.a.case_name} vs {cf.b.case_name}",
            run_timestamp=cf.a.run_timestamp,
            solver_version="P15 Counterfactual",
        )

        return ProofDocument.create(
            artifact_id=artifact_id,
            proof_type=ProofType.LOAD_CURRENTS_OVERLOAD,
            title_pl="Dowód porównawczy (counterfactual) P15: A vs B",
            header=header,
            steps=steps,
            summary=summary,
        )

    @staticmethod
    def _proof_value_from_maybe_string(
        symbol: str,
        value: float | str,
        unit: str,
        source_key: str,
    ) -> ProofValue:
        if isinstance(value, str):
            formatted = f"{value} {unit}".strip()
            return ProofValue(
                symbol=symbol,
                value=value,
                unit=unit,
                formatted=formatted,
                source_key=source_key,
            )
        return ProofValue.create(symbol, value, unit, source_key)

    @staticmethod
    def _clone_proof_value(
        value: ProofValue,
        symbol: str,
        source_key: str,
    ) -> ProofValue:
        if isinstance(value.value, str):
            formatted = f"{value.value} {value.unit}".strip()
            return ProofValue(
                symbol=symbol,
                value=value.value,
                unit=value.unit,
                formatted=formatted,
                source_key=source_key,
            )
        return ProofValue.create(symbol, float(value.value), value.unit, source_key)

    @staticmethod
    def _numeric_diff_value(
        value_a: float | str,
        value_b: float | str,
        symbol: str,
        unit: str,
        source_key: str,
    ) -> ProofValue | None:
        if isinstance(value_a, (int, float)) and isinstance(value_b, (int, float)):
            return ProofValue.create(symbol, value_b - value_a, unit, source_key)
        return None

    @classmethod
    def _create_lc_step_s(
        cls,
        step_number: int,
        p_mw: float,
        q_mvar: float,
        s_mva: float,
    ) -> ProofStep:
        equation = EQ_LC_001

        input_values = (
            ProofValue.create("P", p_mw, "MW", "p_mw"),
            ProofValue.create("Q", q_mvar, "Mvar", "q_mvar"),
        )

        substitution = (
            f"S = \\sqrt{{{p_mw:.4f}^{{2}} + {q_mvar:.4f}^{{2}}} = "
            f"{s_mva:.4f}\\,\\text{{MVA}}"
        )

        result = ProofValue.create("S", s_mva, "MVA", "s_mva")

        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("P", "MW"), ("Q", "Mvar")],
            "MVA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("LC", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"P": "p_mw", "Q": "q_mvar", "S": "s_mva"},
        )

    @classmethod
    def _create_lc_step_i(
        cls,
        step_number: int,
        s_mva: float,
        u_ll_kv: float,
        i_ka: float,
    ) -> ProofStep:
        equation = EQ_LC_002

        input_values = (
            ProofValue.create("S", s_mva, "MVA", "s_mva"),
            ProofValue.create("U_{LL}", u_ll_kv, "kV", "u_ll_kv"),
        )

        substitution = (
            f"I = \\frac{{{s_mva:.4f}}}{{\\sqrt{{3}} \\cdot {u_ll_kv:.4f}}} = "
            f"{i_ka:.4f}\\,\\text{{kA}}"
        )

        result = ProofValue.create("I", i_ka, "kA", "i_ka")

        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("S", "MVA"), ("U_{LL}", "kV")],
            "kA",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("LC", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"S": "s_mva", "U_{LL}": "u_ll_kv", "I": "i_ka"},
        )

    @classmethod
    def _create_lc_step_k_i(
        cls,
        step_number: int,
        i_ka: float,
        in_ka: float,
        k_i_percent: float,
    ) -> ProofStep:
        equation = EQ_LC_003

        input_values = (
            ProofValue.create("I", i_ka, "kA", "i_ka"),
            ProofValue.create("I_n", in_ka, "kA", "in_a"),
        )

        substitution = (
            f"k_I = 100 \\cdot \\frac{{{i_ka:.4f}}}{{{in_ka:.4f}}} = "
            f"{k_i_percent:.4f}\\,\\text{{\\%}}"
        )

        result = ProofValue.create("k_I", k_i_percent, "%", "k_i_percent")

        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("I", "kA"), ("I_n", "kA")],
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("LC", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"I": "i_ka", "I_n": "in_a", "k_I": "k_i_percent"},
        )

    @classmethod
    def _create_lc_step_m_i(
        cls,
        step_number: int,
        i_ka: float,
        in_ka: float,
        m_i_percent: float | str | None,
    ) -> ProofStep:
        equation = EQ_LC_004

        input_values = (
            ProofValue.create("I_n", in_ka, "kA", "in_a"),
            ProofValue.create("I", i_ka, "kA", "i_ka"),
        )

        if isinstance(m_i_percent, str):
            substitution = (
                f"m_I = 100 \\cdot \\left(\\frac{{{in_ka:.4f}}}{{0}} - 1\\right) = "
                f"+\\infty\\,\\text{{\\%}}"
            )
            result = cls._proof_value_from_maybe_string(
                symbol="m_I",
                value=m_i_percent,
                unit="%",
                source_key="m_i_percent",
            )
        else:
            substitution = (
                f"m_I = 100 \\cdot \\left(\\frac{{{in_ka:.4f}}}{{{i_ka:.4f}}} - 1\\right) = "
                f"{(m_i_percent or 0.0):.4f}\\,\\text{{\\%}}"
            )
            result = ProofValue.create("m_I", m_i_percent or 0.0, "%", "m_i_percent")

        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("I_n", "kA"), ("I", "kA")],
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("LC", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"I_n": "in_a", "I": "i_ka", "m_I": "m_i_percent"},
        )

    @classmethod
    def _create_lc_step_k_s(
        cls,
        step_number: int,
        s_mva: float,
        sn_mva: float,
        k_s_percent: float,
    ) -> ProofStep:
        equation = EQ_LC_005

        input_values = (
            ProofValue.create("S", s_mva, "MVA", "s_mva"),
            ProofValue.create("S_n", sn_mva, "MVA", "sn_mva"),
        )

        substitution = (
            f"k_S = 100 \\cdot \\frac{{{s_mva:.4f}}}{{{sn_mva:.4f}}} = "
            f"{k_s_percent:.4f}\\,\\text{{\\%}}"
        )

        result = ProofValue.create("k_S", k_s_percent, "%", "k_s_percent")

        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("S", "MVA"), ("S_n", "MVA")],
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("LC", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"S": "s_mva", "S_n": "sn_mva", "k_S": "k_s_percent"},
        )

    @classmethod
    def _create_lc_step_m_s(
        cls,
        step_number: int,
        s_mva: float,
        sn_mva: float,
        m_s_percent: float | str | None,
    ) -> ProofStep:
        equation = EQ_LC_006

        input_values = (
            ProofValue.create("S_n", sn_mva, "MVA", "sn_mva"),
            ProofValue.create("S", s_mva, "MVA", "s_mva"),
        )

        if isinstance(m_s_percent, str):
            substitution = (
                f"m_S = 100 \\cdot \\left(\\frac{{{sn_mva:.4f}}}{{0}} - 1\\right) = "
                f"+\\infty\\,\\text{{\\%}}"
            )
            result = cls._proof_value_from_maybe_string(
                symbol="m_S",
                value=m_s_percent,
                unit="%",
                source_key="m_s_percent",
            )
        else:
            substitution = (
                f"m_S = 100 \\cdot \\left(\\frac{{{sn_mva:.4f}}}{{{s_mva:.4f}}} - 1\\right) = "
                f"{(m_s_percent or 0.0):.4f}\\,\\text{{\\%}}"
            )
            result = ProofValue.create("m_S", m_s_percent or 0.0, "%", "m_s_percent")

        unit_check = UnitVerifier.verify_step(
            equation.equation_id,
            [("S_n", "MVA"), ("S", "MVA")],
            "%",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("LC", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={"S_n": "sn_mva", "S": "s_mva", "m_S": "m_s_percent"},
        )

    @classmethod
    def _create_qu_step_deadband(
        cls,
        step_number: int,
        delta_u_kv: float,
        u_dead_kv: float,
        s_u_kv: float,
        deadband_branch: str,
    ) -> ProofStep:
        """Krok 2: Funkcja martwej strefy s(U)."""
        equation = EQ_QU_002

        input_values = (
            ProofValue.create("\\Delta U", delta_u_kv, "kV", "delta_u_kv"),
            ProofValue.create("U_{dead}", u_dead_kv, "kV", "u_dead_kv"),
        )

        # Jawne wskazanie gałęzi deadband
        if deadband_branch == "above":
            branch_text = f"\\Delta U = {delta_u_kv:.4f} > U_{{dead}} = {u_dead_kv:.4f}"
            calc_text = f"s(U) = {delta_u_kv:.4f} - {u_dead_kv:.4f} = {s_u_kv:.4f}\\,\\text{{kV}}"
        elif deadband_branch == "below":
            branch_text = f"\\Delta U = {delta_u_kv:.4f} < -U_{{dead}} = -{u_dead_kv:.4f}"
            calc_text = f"s(U) = {delta_u_kv:.4f} + {u_dead_kv:.4f} = {s_u_kv:.4f}\\,\\text{{kV}}"
        else:  # inside
            branch_text = f"|\\Delta U| = {abs(delta_u_kv):.4f} \\le U_{{dead}} = {u_dead_kv:.4f}"
            calc_text = f"s(U) = 0\\,\\text{{kV}}"

        substitution = f"\\text{{Branch: }} {branch_text}, \\quad {calc_text}"

        result = ProofValue.create("s(U)", s_u_kv, "kV", "s_u_kv")

        unit_check = UnitCheckResult(
            passed=True,
            expected_unit="kV",
            computed_unit="kV",
            input_units={"ΔU": "kV", "U_dead": "kV"},
            derivation="kV ± kV = kV ✓",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("QU", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "ΔU": "delta_u_kv",
                "U_dead": "u_dead_kv",
                "s(U)": "s_u_kv",
            },
        )

    @classmethod
    def _create_qu_step_q_raw(
        cls,
        step_number: int,
        k_q_mvar_per_kv: float,
        s_u_kv: float,
        q_raw_mvar: float,
    ) -> ProofStep:
        """Krok 3: Surowa moc bierna Q_raw = k_Q · s(U)."""
        equation = EQ_QU_003

        input_values = (
            ProofValue.create("k_Q", k_q_mvar_per_kv, "Mvar/kV", "k_q_mvar_per_kv"),
            ProofValue.create("s(U)", s_u_kv, "kV", "s_u_kv"),
        )

        substitution = (
            f"Q_{{raw}} = {k_q_mvar_per_kv:.4f} \\cdot {s_u_kv:.4f} = "
            f"{q_raw_mvar:.4f}\\,\\text{{Mvar}}"
        )

        result = ProofValue.create("Q_{raw}", q_raw_mvar, "Mvar", "q_raw_mvar")

        unit_check = UnitCheckResult(
            passed=True,
            expected_unit="Mvar",
            computed_unit="Mvar",
            input_units={"k_Q": "Mvar/kV", "s(U)": "kV"},
            derivation="Mvar/kV · kV = Mvar ✓",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("QU", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "k_Q": "k_q_mvar_per_kv",
                "s(U)": "s_u_kv",
                "Q_raw": "q_raw_mvar",
            },
        )

    @classmethod
    def _create_qu_step_q_cmd(
        cls,
        step_number: int,
        q_raw_mvar: float,
        q_min_mvar: float,
        q_max_mvar: float,
        q_cmd_mvar: float,
    ) -> ProofStep:
        """Krok 4: Końcowa moc bierna Q_cmd z limitami."""
        equation = EQ_QU_004

        input_values = (
            ProofValue.create("Q_{raw}", q_raw_mvar, "Mvar", "q_raw_mvar"),
            ProofValue.create("Q_{min}", q_min_mvar, "Mvar", "q_min_mvar"),
            ProofValue.create("Q_{max}", q_max_mvar, "Mvar", "q_max_mvar"),
        )

        substitution = (
            f"Q_{{cmd}} = \\min(\\max({q_raw_mvar:.4f}, {q_min_mvar:.4f}), {q_max_mvar:.4f}) = "
            f"{q_cmd_mvar:.4f}\\,\\text{{Mvar}}"
        )

        result = ProofValue.create("Q_{cmd}", q_cmd_mvar, "Mvar", "q_cmd_mvar")

        unit_check = UnitCheckResult(
            passed=True,
            expected_unit="Mvar",
            computed_unit="Mvar",
            input_units={"Q_raw": "Mvar", "Q_min": "Mvar", "Q_max": "Mvar"},
            derivation="Mvar = Mvar ✓",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("QU", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "Q_raw": "q_raw_mvar",
                "Q_min": "q_min_mvar",
                "Q_max": "q_max_mvar",
                "Q_cmd": "q_cmd_mvar",
            },
        )

    @classmethod
    def _create_qu_step_vdrop_link(
        cls,
        step_number: int,
        q_cmd_mvar: float,
        delta_u_x_percent: float,
        delta_u_percent: float,
        u_kv: float,
    ) -> ProofStep:
        """
        Krok 5: P11.1c — Wpływ Q_cmd na napięcie U (VDROP link).

        Ten krok NIE LICZY niczego nowego — tylko prezentuje wyniki VDROP
        pokazując zależność: Q_cmd → ΔU_X → ΔU → U

        LINK-ONLY: Referencja do EQ_VDROP_004..007, bez duplikowania wzorów.
        """
        equation = EQ_QU_005

        input_values = (
            ProofValue.create("Q_{cmd}", q_cmd_mvar, "Mvar", "q_cmd_mvar"),
        )

        # Prezentacja wyników VDROP (read-only, nie obliczamy)
        substitution = (
            f"Q_{{cmd}} = {q_cmd_mvar:.4f}\\,\\text{{Mvar}} "
            f"\\xrightarrow{{\\text{{EQ\\_VDROP\\_004}}}} "
            f"\\Delta U_X = {delta_u_x_percent:.4f}\\% "
            f"\\xrightarrow{{\\text{{EQ\\_VDROP\\_005..007}}}} "
            f"U = {u_kv:.4f}\\,\\text{{kV}}"
        )

        result = ProofValue.create("U", u_kv, "kV", "vdrop_u_kv")

        unit_check = UnitCheckResult(
            passed=True,
            expected_unit="kV",
            computed_unit="kV",
            input_units={"Q_cmd": "Mvar", "ΔU_X": "%", "ΔU": "%"},
            derivation="Mvar → % → kV (VDROP link) ✓",
        )

        return ProofStep(
            step_id=ProofStep.generate_step_id("QU", step_number),
            step_number=step_number,
            title_pl=equation.name_pl,
            equation=equation,
            input_values=input_values,
            substitution_latex=substitution,
            result=result,
            unit_check=unit_check,
            source_keys={
                "Q_cmd": "q_cmd_mvar",
                "ΔU_X": "vdrop_delta_u_x_percent",
                "ΔU": "vdrop_delta_u_percent",
                "U": "vdrop_u_kv",
            },
        )
