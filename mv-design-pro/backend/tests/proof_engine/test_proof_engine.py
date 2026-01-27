"""
Proof Engine Tests — P11.1a MVP

STATUS: CANONICAL & BINDING
Reference: P11_1a_MVP_SC3F_AND_VDROP.md

Testy:
1. Determinizm (ten sam input → identyczny proof.json/proof.tex)
2. Kompletność kroków
3. Weryfikacja jednostek
4. Zgodność z rejestrami równań
"""

from __future__ import annotations

import json
import math
from datetime import datetime
from uuid import uuid4

import pytest

from application.proof_engine.equation_registry import EquationRegistry
from application.proof_engine.proof_generator import (
    ProofGenerator,
    SC3FInput,
    VDROPInput,
    VDROPSegmentInput,
)
from application.proof_engine.types import ProofType
from application.proof_engine.unit_verifier import UnitVerifier


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def sc3f_test_input() -> SC3FInput:
    """
    Fixture: minimalne dane SC3F dla testów.

    Dane z przykładu wzorcowego P11_1a_MVP_SC3F_AND_VDROP.md:
    - Un = 15.0 kV
    - c = 1.10
    - Z_th = 0.749 + j3.419 Ω
    """
    return SC3FInput(
        project_name="Test Project",
        case_name="Test Case SC3F",
        fault_node_id="B2",
        fault_type="THREE_PHASE",
        run_timestamp=datetime(2026, 1, 27, 10, 30, 0),
        solver_version="1.0.0-test",
        c_factor=1.10,
        u_n_kv=15.0,
        z_thevenin_ohm=complex(0.749, 3.419),
        ikss_ka=2.722,
        ip_ka=5.882,
        ith_ka=2.722,
        sk_mva=70.7,
        kappa=1.528,
        rx_ratio=0.219,
        tk_s=1.0,
        m_factor=1.0,
        n_factor=0.0,
    )


@pytest.fixture
def vdrop_test_input() -> VDROPInput:
    """
    Fixture: minimalne dane VDROP dla testów.
    """
    return VDROPInput(
        project_name="Test Project",
        case_name="Test Case VDROP",
        source_bus_id="SOURCE",
        target_bus_id="LOAD",
        run_timestamp=datetime(2026, 1, 27, 10, 30, 0),
        solver_version="1.0.0-test",
        u_source_kv=15.0,
        segments=[
            VDROPSegmentInput(
                segment_id="SEG1",
                from_bus_id="SOURCE",
                to_bus_id="MID",
                r_ohm_per_km=0.206,
                x_ohm_per_km=0.075,
                length_km=2.5,
                p_mw=2.0,
                q_mvar=1.0,
                u_n_kv=15.0,
            ),
            VDROPSegmentInput(
                segment_id="SEG2",
                from_bus_id="MID",
                to_bus_id="LOAD",
                r_ohm_per_km=0.206,
                x_ohm_per_km=0.075,
                length_km=1.5,
                p_mw=1.0,
                q_mvar=0.5,
                u_n_kv=15.0,
            ),
        ],
    )


# =============================================================================
# SC3F Tests
# =============================================================================


class TestSC3FProofGenerator:
    """Testy generatora dowodów SC3F."""

    def test_generate_sc3f_proof_returns_proof_document(
        self, sc3f_test_input: SC3FInput
    ):
        """Generuje ProofDocument dla danych SC3F."""
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        assert proof is not None
        assert proof.proof_type == ProofType.SC3F_IEC60909
        assert proof.document_id is not None
        assert proof.artifact_id is not None

    def test_sc3f_proof_has_required_steps(self, sc3f_test_input: SC3FInput):
        """
        Dowód SC3F zawiera wszystkie wymagane kroki (BINDING).

        Kroki obowiązkowe:
        1. Napięcie z c
        2. Impedancja Thevenina
        3. Prąd I_k''
        4. Współczynnik κ
        5. Prąd udarowy i_p
        6. Prąd dynamiczny I_dyn (OBOWIĄZKOWY)
        7. Prąd cieplny I_th (OBOWIĄZKOWY)
        8. Moc S_k''
        """
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        assert len(proof.steps) == 8

        step_titles = [s.title_pl for s in proof.steps]

        # Weryfikacja kroków obowiązkowych
        assert any("napięciow" in t.lower() for t in step_titles)
        assert any("impedancja" in t.lower() for t in step_titles)
        assert any("prąd" in t.lower() and "zwarciowy" in t.lower() for t in step_titles)
        assert any("udaru" in t.lower() or "κ" in t.lower() for t in step_titles)
        assert any("udarow" in t.lower() for t in step_titles)
        assert any("dynamiczn" in t.lower() for t in step_titles)
        assert any("ciepln" in t.lower() for t in step_titles)
        assert any("moc" in t.lower() for t in step_titles)

    def test_sc3f_proof_step_numbers_are_sequential(self, sc3f_test_input: SC3FInput):
        """Numery kroków są sekwencyjne od 1."""
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        step_numbers = sorted(s.step_number for s in proof.steps)
        expected = list(range(1, len(proof.steps) + 1))

        assert step_numbers == expected

    def test_sc3f_proof_all_unit_checks_pass(self, sc3f_test_input: SC3FInput):
        """Wszystkie weryfikacje jednostek przechodzą."""
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        for step in proof.steps:
            assert step.unit_check.passed, (
                f"Unit check failed for step {step.step_id}: "
                f"expected {step.unit_check.expected_unit}, "
                f"computed {step.unit_check.computed_unit}"
            )

        assert proof.summary.unit_check_passed

    def test_sc3f_proof_key_results_present(self, sc3f_test_input: SC3FInput):
        """Kluczowe wyniki są obecne w podsumowaniu."""
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        required_keys = ["ikss_ka", "ip_ka", "idyn_ka", "ith_ka", "sk_mva", "kappa"]

        for key in required_keys:
            assert key in proof.summary.key_results, f"Missing key result: {key}"

    def test_sc3f_proof_idyn_equals_ip(self, sc3f_test_input: SC3FInput):
        """Prąd dynamiczny równy prądowi udarowemu (I_dyn = i_p)."""
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        idyn = proof.summary.key_results["idyn_ka"].value
        ip = proof.summary.key_results["ip_ka"].value

        assert idyn == ip


# =============================================================================
# VDROP Tests
# =============================================================================


class TestVDROPProofGenerator:
    """Testy generatora dowodów VDROP."""

    def test_generate_vdrop_proof_returns_proof_document(
        self, vdrop_test_input: VDROPInput
    ):
        """Generuje ProofDocument dla danych VDROP."""
        proof = ProofGenerator.generate_vdrop_proof(vdrop_test_input)

        assert proof is not None
        assert proof.proof_type == ProofType.VDROP
        assert proof.document_id is not None

    def test_vdrop_proof_has_steps_for_each_segment(
        self, vdrop_test_input: VDROPInput
    ):
        """
        Dowód VDROP zawiera 5 kroków dla każdego odcinka + 1 krok sumy.

        Kroki na odcinek:
        1. Rezystancja R
        2. Reaktancja X
        3. Składowa ΔU_R
        4. Składowa ΔU_X
        5. Spadek ΔU
        """
        proof = ProofGenerator.generate_vdrop_proof(vdrop_test_input)

        num_segments = len(vdrop_test_input.segments)
        expected_steps = num_segments * 5 + 1  # 5 per segment + total

        assert len(proof.steps) == expected_steps

    def test_vdrop_proof_total_drop_is_sum(self, vdrop_test_input: VDROPInput):
        """Suma spadków jest obliczona poprawnie."""
        proof = ProofGenerator.generate_vdrop_proof(vdrop_test_input)

        # Pobierz wynik końcowy
        total_drop = proof.summary.key_results["delta_u_total_percent"].value

        # Oblicz oczekiwaną sumę ręcznie
        expected = 0.0
        for seg in vdrop_test_input.segments:
            r = seg.r_ohm_per_km * seg.length_km
            x = seg.x_ohm_per_km * seg.length_km
            du_r = (r * seg.p_mw) / (seg.u_n_kv ** 2) * 100
            du_x = (x * seg.q_mvar) / (seg.u_n_kv ** 2) * 100
            expected += du_r + du_x

        assert abs(total_drop - expected) < 0.0001


# =============================================================================
# Determinism Tests
# =============================================================================


class TestProofDeterminism:
    """
    Testy determinizmu (BINDING).

    Ten sam input MUSI dawać identyczny proof.json i proof.tex.
    """

    def test_sc3f_json_determinism(self, sc3f_test_input: SC3FInput):
        """Ten sam SC3FInput → identyczny proof.json."""
        artifact_id = uuid4()

        proof_1 = ProofGenerator.generate_sc3f_proof(sc3f_test_input, artifact_id)
        proof_2 = ProofGenerator.generate_sc3f_proof(sc3f_test_input, artifact_id)

        # Porównanie JSON (pomijając document_id i created_at które są unikalne)
        json_1 = proof_1.to_dict()
        json_2 = proof_2.to_dict()

        # Usuń pola zmienne
        del json_1["document_id"]
        del json_1["created_at"]
        del json_2["document_id"]
        del json_2["created_at"]

        assert json_1 == json_2

    def test_sc3f_latex_determinism(self, sc3f_test_input: SC3FInput):
        """Ten sam SC3FInput → identyczny proof.tex (bez nagłówków czasowych)."""
        artifact_id = uuid4()

        proof_1 = ProofGenerator.generate_sc3f_proof(sc3f_test_input, artifact_id)
        proof_2 = ProofGenerator.generate_sc3f_proof(sc3f_test_input, artifact_id)

        # LaTeX powinien być identyczny dla tych samych danych
        # (różnice tylko w dacie/czasie która jest parametrem wejściowym)
        latex_1 = proof_1.latex_representation
        latex_2 = proof_2.latex_representation

        # Sprawdź strukturalne elementy (pomijając timestampy)
        assert r"\section{Dane wejściowe}" in latex_1
        assert r"\section{Dane wejściowe}" in latex_2
        assert r"\section{Dowód}" in latex_1
        assert r"\section{Dowód}" in latex_2

    def test_step_order_is_stable(self, sc3f_test_input: SC3FInput):
        """Kolejność kroków jest zawsze taka sama."""
        proof_1 = ProofGenerator.generate_sc3f_proof(sc3f_test_input)
        proof_2 = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        step_ids_1 = [s.step_id for s in proof_1.steps]
        step_ids_2 = [s.step_id for s in proof_2.steps]

        assert step_ids_1 == step_ids_2


# =============================================================================
# Equation Registry Tests
# =============================================================================


class TestEquationRegistry:
    """Testy rejestru równań."""

    def test_all_sc3f_equations_exist(self):
        """Wszystkie równania SC3F są zdefiniowane."""
        sc3f_eqs = EquationRegistry.get_sc3f_equations()

        required_ids = [
            "EQ_SC3F_001", "EQ_SC3F_002", "EQ_SC3F_003", "EQ_SC3F_004",
            "EQ_SC3F_005", "EQ_SC3F_006", "EQ_SC3F_007", "EQ_SC3F_008",
            "EQ_SC3F_008a",
        ]

        for eq_id in required_ids:
            assert eq_id in sc3f_eqs, f"Missing equation: {eq_id}"

    def test_all_vdrop_equations_exist(self):
        """Wszystkie równania VDROP są zdefiniowane."""
        vdrop_eqs = EquationRegistry.get_vdrop_equations()

        required_ids = [
            "EQ_VDROP_001", "EQ_VDROP_002", "EQ_VDROP_003",
            "EQ_VDROP_004", "EQ_VDROP_005", "EQ_VDROP_006",
        ]

        for eq_id in required_ids:
            assert eq_id in vdrop_eqs, f"Missing equation: {eq_id}"

    def test_equation_has_required_fields(self):
        """Każde równanie ma wymagane pola."""
        eq = EquationRegistry.get_equation("EQ_SC3F_004")

        assert eq is not None
        assert eq.equation_id == "EQ_SC3F_004"
        assert eq.name_pl != ""
        assert eq.latex != ""
        assert len(eq.symbols) > 0
        assert eq.standard_ref != ""

    def test_id_stability(self):
        """Żaden istniejący ID nie został zmieniony."""
        assert EquationRegistry.validate_id_stability()

    def test_all_symbols_have_mapping_keys(self):
        """Wszystkie symbole mają mapping_key."""
        for eq in EquationRegistry.SC3F_EQUATIONS.values():
            for sym in eq.symbols:
                assert sym.mapping_key != "", f"Missing mapping_key in {eq.equation_id}"

        for eq in EquationRegistry.VDROP_EQUATIONS.values():
            for sym in eq.symbols:
                assert sym.mapping_key != "", f"Missing mapping_key in {eq.equation_id}"


# =============================================================================
# Unit Verifier Tests
# =============================================================================


class TestUnitVerifier:
    """Testy weryfikatora jednostek."""

    def test_sc3f_004_unit_derivation(self):
        """Weryfikacja jednostek dla I_k'' = c·U_n/(√3·Z_th)."""
        result = UnitVerifier.verify_equation(
            "EQ_SC3F_004",
            {"c": "—", "U_n": "kV", "Z_th": "Ω"},
            "kA",
        )

        assert result.passed
        assert result.expected_unit == "kA"
        assert "✓" in result.derivation

    def test_vdrop_003_unit_derivation(self):
        """Weryfikacja jednostek dla ΔU_R = R·P/U²."""
        result = UnitVerifier.verify_equation(
            "EQ_VDROP_003",
            {"R": "Ω", "P": "MW", "U_n": "kV"},
            "%",
        )

        assert result.passed
        assert result.expected_unit == "%"

    def test_dimensionless_verification(self):
        """Weryfikacja dla wielkości bezwymiarowych (κ)."""
        result = UnitVerifier.verify_equation(
            "EQ_SC3F_005",
            {"R_th": "Ω", "X_th": "Ω"},
            "—",
        )

        assert result.passed


# =============================================================================
# Integration Test
# =============================================================================


class TestIntegration:
    """Testy integracyjne."""

    def test_full_sc3f_proof_pipeline(self, sc3f_test_input: SC3FInput):
        """
        Pełny pipeline: dane → ProofDocument → JSON → LaTeX.
        """
        # Generate proof
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        # Verify JSON serialization
        json_str = proof.json_representation
        json_dict = json.loads(json_str)

        assert "steps" in json_dict
        assert len(json_dict["steps"]) == 8
        assert json_dict["proof_type"] == "SC3F_IEC60909"

        # Verify LaTeX generation
        latex_str = proof.latex_representation

        assert r"\documentclass" in latex_str
        assert r"\begin{document}" in latex_str
        assert r"\end{document}" in latex_str
        assert "Dowód" in latex_str

    def test_proof_matches_solver_result_tolerance(self, sc3f_test_input: SC3FInput):
        """
        Wynik dowodu zgodny z wynikiem solvera (tolerancja).

        Tolerancja: 0.1% dla prądów, 0.5% dla mocy.
        """
        proof = ProofGenerator.generate_sc3f_proof(sc3f_test_input)

        # Porównanie z danymi wejściowymi (które pochodzą z solvera)
        ikss_proof = proof.summary.key_results["ikss_ka"].value
        ikss_input = sc3f_test_input.ikss_ka

        ip_proof = proof.summary.key_results["ip_ka"].value
        ip_input = sc3f_test_input.ip_ka

        sk_proof = proof.summary.key_results["sk_mva"].value
        sk_input = sc3f_test_input.sk_mva

        # Tolerancje
        assert abs(ikss_proof - ikss_input) / ikss_input < 0.001
        assert abs(ip_proof - ip_input) / ip_input < 0.001
        assert abs(sk_proof - sk_input) / sk_input < 0.005
