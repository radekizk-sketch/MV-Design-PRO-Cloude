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
    EquationRegistry,
    EQ_SC3F_001,
    EQ_SC3F_003,
    EQ_SC3F_004,
    EQ_SC3F_005,
    EQ_SC3F_006,
    EQ_SC3F_007,
    EQ_SC3F_008,
    EQ_SC3F_008a,
    EQ_VDROP_001,
    EQ_VDROP_002,
    EQ_VDROP_003,
    EQ_VDROP_004,
    EQ_VDROP_005,
    EQ_VDROP_006,
)
from application.proof_engine.types import (
    EquationDefinition,
    ProofDocument,
    ProofHeader,
    ProofStep,
    ProofSummary,
    ProofType,
    ProofValue,
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

        Kroki obowiązkowe (BINDING):
        1. Napięcie z współczynnikiem c
        2. Impedancja Thevenina (już obliczona przez solver)
        3. Początkowy prąd zwarciowy I_k''
        4. Współczynnik udaru κ
        5. Prąd udarowy i_p
        6. Prąd dynamiczny I_dyn (OBOWIĄZKOWY)
        7. Prąd cieplny I_th (OBOWIĄZKOWY)
        8. Moc zwarciowa S_k''

        Args:
            data: Dane wejściowe SC3FInput
            artifact_id: Opcjonalny ID artefaktu

        Returns:
            ProofDocument z pełnym dowodem
        """
        if artifact_id is None:
            artifact_id = uuid4()

        steps: list[ProofStep] = []
        step_number = 0

        # Wartości pośrednie do reużycia
        z_abs = abs(data.z_thevenin_ohm)
        r_th = data.z_thevenin_ohm.real
        x_th = data.z_thevenin_ohm.imag

        # =====================================================================
        # Krok 1: Napięcie z współczynnikiem c
        # =====================================================================
        step_number += 1
        u_eq_kv = data.c_factor * data.u_n_kv

        step_1 = cls._create_sc3f_step_u_eq(
            step_number=step_number,
            c_factor=data.c_factor,
            u_n_kv=data.u_n_kv,
            u_eq_kv=u_eq_kv,
        )
        steps.append(step_1)

        # =====================================================================
        # Krok 2: Impedancja Thevenina (prezentacja wartości z solvera)
        # =====================================================================
        step_number += 1
        step_2 = cls._create_sc3f_step_z_th(
            step_number=step_number,
            z_thevenin_ohm=data.z_thevenin_ohm,
            r_th=r_th,
            x_th=x_th,
        )
        steps.append(step_2)

        # =====================================================================
        # Krok 3: Początkowy prąd zwarciowy I_k''
        # =====================================================================
        step_number += 1
        step_3 = cls._create_sc3f_step_ikss(
            step_number=step_number,
            c_factor=data.c_factor,
            u_n_kv=data.u_n_kv,
            z_th_abs=z_abs,
            ikss_ka=data.ikss_ka,
        )
        steps.append(step_3)

        # =====================================================================
        # Krok 4: Współczynnik udaru κ
        # =====================================================================
        step_number += 1
        step_4 = cls._create_sc3f_step_kappa(
            step_number=step_number,
            r_th=r_th,
            x_th=x_th,
            kappa=data.kappa,
        )
        steps.append(step_4)

        # =====================================================================
        # Krok 5: Prąd udarowy i_p
        # =====================================================================
        step_number += 1
        step_5 = cls._create_sc3f_step_ip(
            step_number=step_number,
            kappa=data.kappa,
            ikss_ka=data.ikss_ka,
            ip_ka=data.ip_ka,
        )
        steps.append(step_5)

        # =====================================================================
        # Krok 6: Prąd dynamiczny I_dyn (OBOWIĄZKOWY)
        # =====================================================================
        step_number += 1
        idyn_ka = data.ip_ka  # I_dyn = i_p
        step_6 = cls._create_sc3f_step_idyn(
            step_number=step_number,
            ip_ka=data.ip_ka,
            idyn_ka=idyn_ka,
        )
        steps.append(step_6)

        # =====================================================================
        # Krok 7: Prąd cieplny I_th (OBOWIĄZKOWY)
        # =====================================================================
        step_number += 1
        step_7 = cls._create_sc3f_step_ith(
            step_number=step_number,
            ikss_ka=data.ikss_ka,
            m_factor=data.m_factor,
            n_factor=data.n_factor,
            ith_ka=data.ith_ka,
        )
        steps.append(step_7)

        # =====================================================================
        # Krok 8: Moc zwarciowa S_k''
        # =====================================================================
        step_number += 1
        step_8 = cls._create_sc3f_step_sk(
            step_number=step_number,
            u_n_kv=data.u_n_kv,
            ikss_ka=data.ikss_ka,
            sk_mva=data.sk_mva,
        )
        steps.append(step_8)

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
    # SC3F Step Builders
    # =========================================================================

    @classmethod
    def _create_sc3f_step_u_eq(
        cls,
        step_number: int,
        c_factor: float,
        u_n_kv: float,
        u_eq_kv: float,
    ) -> ProofStep:
        """Krok 1: Napięcie z współczynnikiem c."""
        equation = EQ_SC3F_001

        input_values = (
            ProofValue.create("c", c_factor, "—", "c_factor"),
            ProofValue.create("U_n", u_n_kv, "kV", "u_n_kv"),
        )

        substitution = f"U_{{eq}} = {c_factor:.4f} \\cdot {u_n_kv:.4f} = {u_eq_kv:.4f}\\,\\text{{kV}}"

        result = ProofValue.create("U_{eq}", u_eq_kv, "kV", "u_eq_kv")

        unit_check = UnitVerifier.verify_equation(
            equation.equation_id,
            {"c": "—", "U_n": "kV"},
            "kV",
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
            source_keys={"c": "c_factor", "U_n": "u_n_kv", "U_eq": "u_eq_kv"},
        )

    @classmethod
    def _create_sc3f_step_z_th(
        cls,
        step_number: int,
        z_thevenin_ohm: complex,
        r_th: float,
        x_th: float,
    ) -> ProofStep:
        """Krok 2: Impedancja Thevenina."""
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
        """Krok 3: Początkowy prąd zwarciowy I_k''."""
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
        """Krok 4: Współczynnik udaru κ."""
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
        """Krok 5: Prąd udarowy i_p."""
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
        """Krok 6: Prąd dynamiczny I_dyn (OBOWIĄZKOWY)."""
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
        """Krok 7: Prąd cieplny I_th (OBOWIĄZKOWY)."""
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
        """Krok 8: Moc zwarciowa S_k''."""
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

        Kroki dla każdego odcinka:
        1. Rezystancja odcinka R
        2. Reaktancja odcinka X
        3. Składowa czynna ΔU_R
        4. Składowa bierna ΔU_X
        5. Spadek na odcinku ΔU

        Plus krok końcowy:
        6. Suma spadków ΔU_total

        Args:
            data: Dane wejściowe VDROPInput
            artifact_id: Opcjonalny ID artefaktu

        Returns:
            ProofDocument z pełnym dowodem
        """
        if artifact_id is None:
            artifact_id = uuid4()

        steps: list[ProofStep] = []
        step_number = 0

        segment_drops: list[float] = []

        # Dla każdego odcinka generuj 5 kroków
        for seg in data.segments:
            # Obliczenia pośrednie
            r_ohm = seg.r_ohm_per_km * seg.length_km
            x_ohm = seg.x_ohm_per_km * seg.length_km
            delta_u_r = (r_ohm * seg.p_mw) / (seg.u_n_kv ** 2) * 100
            delta_u_x = (x_ohm * seg.q_mvar) / (seg.u_n_kv ** 2) * 100
            delta_u = delta_u_r + delta_u_x
            segment_drops.append(delta_u)

            # Krok: Rezystancja
            step_number += 1
            steps.append(cls._create_vdrop_step_r(
                step_number, seg.r_ohm_per_km, seg.length_km, r_ohm, seg.segment_id
            ))

            # Krok: Reaktancja
            step_number += 1
            steps.append(cls._create_vdrop_step_x(
                step_number, seg.x_ohm_per_km, seg.length_km, x_ohm, seg.segment_id
            ))

            # Krok: Składowa czynna
            step_number += 1
            steps.append(cls._create_vdrop_step_du_r(
                step_number, r_ohm, seg.p_mw, seg.u_n_kv, delta_u_r, seg.segment_id
            ))

            # Krok: Składowa bierna
            step_number += 1
            steps.append(cls._create_vdrop_step_du_x(
                step_number, x_ohm, seg.q_mvar, seg.u_n_kv, delta_u_x, seg.segment_id
            ))

            # Krok: Spadek na odcinku
            step_number += 1
            steps.append(cls._create_vdrop_step_du(
                step_number, delta_u_r, delta_u_x, delta_u, seg.segment_id
            ))

        # Krok końcowy: Suma spadków
        step_number += 1
        delta_u_total = sum(segment_drops)
        steps.append(cls._create_vdrop_step_total(
            step_number, segment_drops, delta_u_total
        ))

        # Podsumowanie
        unit_checks_passed = all(s.unit_check.passed for s in steps)

        key_results = {
            "delta_u_total_percent": ProofValue.create(
                "\\Delta U_{total}", delta_u_total, "%", "delta_u_total_percent"
            ),
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
            ProofValue.create(f"\\Delta U_{i+1}", drop, "%", f"delta_u_segment_{i}")
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
            source_keys={"ΔU_total": "delta_u_total_percent"},
        )
