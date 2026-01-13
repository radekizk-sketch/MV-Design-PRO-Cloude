"""
Unit tests for the branch module.

Tests cover:
- T1: LineBranch total impedance calculation
- T2: LineBranch shunt admittance with uS->S conversion
- T3: TransformerBranch per-unit impedance calculation
- T4: Branch.from_dict with string and Enum input
- T5: Branch.validate with wrong branch_type type
- T6: Validation of NaN/inf values
"""

import math
import sys
from pathlib import Path

import pytest

# Add backend/src to path for imports
backend_src = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(backend_src))

from network_model.core.branch import (
    Branch,
    BranchType,
    LineBranch,
    TransformerBranch,
)


class TestLineBranchImpedance:
    """T1: LineBranch - total impedance calculation."""

    def test_impedance_basic(self):
        """For r=0.2, x=0.4, L=10: Z == 2 + j4 exactly."""
        line = LineBranch(
            id="line1",
            from_node="A",
            to_node="B",
            branch_type=BranchType.LINE,
            r_ohm_per_km=0.2,
            x_ohm_per_km=0.4,
            b_us_per_km=0.0,
            length_km=10.0,
            rated_current_a=100.0,
        )

        z = line.get_impedance()

        assert z.real == pytest.approx(2.0, abs=1e-12)
        assert z.imag == pytest.approx(4.0, abs=1e-12)


class TestLineBranchAdmittance:
    """T2: LineBranch - shunt admittance with uS->S conversion."""

    def test_admittance_us_to_s_conversion(self):
        """
        For b_us_per_km=10, L=10:
        B_total = 10 * 1e-6 * 10 = 1e-4 S
        Y_sh == j * 1e-4
        """
        line = LineBranch(
            id="line2",
            from_node="A",
            to_node="B",
            branch_type=BranchType.CABLE,
            r_ohm_per_km=0.1,
            x_ohm_per_km=0.1,
            b_us_per_km=10.0,
            length_km=10.0,
            rated_current_a=200.0,
        )

        y_sh = line.get_admittance()

        assert y_sh.real == pytest.approx(0.0, abs=1e-12)
        assert y_sh.imag == pytest.approx(1e-4, abs=1e-12)


class TestTransformerBranchImpedancePU:
    """T3: TransformerBranch - per-unit impedance calculation."""

    def test_impedance_pu_at_rated_base(self):
        """
        Sn=10 MVA, uk=6%, pk=60 kW:
        - z_pu_sn = 0.06
        - r_pu_sn = (60/1000)/10 = 0.006
        - x_pu_sn = sqrt(0.06^2 - 0.006^2)

        get_impedance_pu(base_mva=10) == 0.006 + j*x_pu_sn
        """
        transformer = TransformerBranch(
            id="trafo1",
            from_node="HV",
            to_node="LV",
            branch_type=BranchType.TRANSFORMER,
            rated_power_mva=10.0,
            voltage_hv_kv=110.0,
            voltage_lv_kv=20.0,
            uk_percent=6.0,
            pk_kw=60.0,
            i0_percent=0.5,
            p0_kw=10.0,
            tap_step_percent=2.5,
        )

        z_pu_sn = 0.06
        r_pu_sn = 0.006
        x_pu_sn = math.sqrt(z_pu_sn**2 - r_pu_sn**2)

        z_pu = transformer.get_impedance_pu(base_mva=10.0)

        assert z_pu.real == pytest.approx(r_pu_sn, rel=1e-12, abs=1e-12)
        assert z_pu.imag == pytest.approx(x_pu_sn, rel=1e-12, abs=1e-12)

    def test_impedance_pu_scaled_to_different_base(self):
        """
        get_impedance_pu(base_mva=100) has R and X scaled x10
        relative to base_mva=10.
        """
        transformer = TransformerBranch(
            id="trafo2",
            from_node="HV",
            to_node="LV",
            branch_type=BranchType.TRANSFORMER,
            rated_power_mva=10.0,
            voltage_hv_kv=110.0,
            voltage_lv_kv=20.0,
            uk_percent=6.0,
            pk_kw=60.0,
            i0_percent=0.5,
            p0_kw=10.0,
            tap_step_percent=2.5,
        )

        z_pu_10 = transformer.get_impedance_pu(base_mva=10.0)
        z_pu_100 = transformer.get_impedance_pu(base_mva=100.0)

        # At base_mva=100, values should be 10x larger
        assert z_pu_100.real == pytest.approx(z_pu_10.real * 10, rel=1e-12, abs=1e-12)
        assert z_pu_100.imag == pytest.approx(z_pu_10.imag * 10, rel=1e-12, abs=1e-12)


class TestBranchFromDict:
    """T4: Branch.from_dict - string and Enum input for branch_type."""

    def test_from_dict_with_string_branch_type(self):
        """
        Minimal dict with branch_type="CABLE" should create LineBranch
        with branch_type == BranchType.CABLE.
        """
        data = {
            "id": "cable1",
            "from_node": "N1",
            "to_node": "N2",
            "branch_type": "CABLE",
            "r_ohm_per_km": 0.1,
            "x_ohm_per_km": 0.2,
            "b_us_per_km": 5.0,
            "length_km": 1.0,
            "rated_current_a": 300.0,
        }

        branch = Branch.from_dict(data)

        assert isinstance(branch, LineBranch)
        assert branch.branch_type == BranchType.CABLE

    def test_from_dict_with_enum_branch_type(self):
        """
        Dict with branch_type=BranchType.CABLE should create LineBranch
        with branch_type == BranchType.CABLE.
        """
        data = {
            "id": "cable2",
            "from_node": "N1",
            "to_node": "N2",
            "branch_type": BranchType.CABLE,
            "r_ohm_per_km": 0.1,
            "x_ohm_per_km": 0.2,
            "b_us_per_km": 5.0,
            "length_km": 1.0,
            "rated_current_a": 300.0,
        }

        branch = Branch.from_dict(data)

        assert isinstance(branch, LineBranch)
        assert branch.branch_type == BranchType.CABLE

    def test_from_dict_missing_branch_type(self):
        """Missing branch_type should raise ValueError."""
        data = {
            "id": "line1",
            "from_node": "N1",
            "to_node": "N2",
        }

        with pytest.raises(ValueError, match="Missing 'branch_type'"):
            Branch.from_dict(data)

    def test_from_dict_invalid_branch_type_string(self):
        """Invalid branch_type string should raise ValueError."""
        data = {
            "id": "line1",
            "from_node": "N1",
            "to_node": "N2",
            "branch_type": "UNKNOWN_TYPE",
        }

        with pytest.raises(ValueError, match="Unknown branch_type"):
            Branch.from_dict(data)


class TestBranchValidateBranchType:
    """T5: Branch.validate - branch_type as wrong type."""

    def test_validate_with_string_branch_type_returns_false(self):
        """
        Branch created with branch_type="LINE" (string instead of enum)
        should return validate() == False.
        """
        # Create a LineBranch but bypass proper initialization
        # by directly setting branch_type to a string
        line = LineBranch(
            id="line1",
            from_node="A",
            to_node="B",
            branch_type=BranchType.LINE,  # Initially correct
            r_ohm_per_km=0.2,
            x_ohm_per_km=0.4,
            b_us_per_km=10.0,
            length_km=5.0,
            rated_current_a=100.0,
        )

        # Force branch_type to a string (simulating invalid deserialization)
        object.__setattr__(line, "branch_type", "LINE")

        assert line.validate() is False

    def test_validate_with_proper_enum_returns_true(self):
        """
        Branch with proper BranchType enum should return validate() == True.
        """
        line = LineBranch(
            id="line1",
            from_node="A",
            to_node="B",
            branch_type=BranchType.LINE,
            r_ohm_per_km=0.2,
            x_ohm_per_km=0.4,
            b_us_per_km=10.0,
            length_km=5.0,
            rated_current_a=100.0,
        )

        assert line.validate() is True


class TestValidationNaNInf:
    """T6: Validation of NaN/inf values."""

    def test_linebranch_with_nan_r_returns_false(self):
        """LineBranch with r_ohm_per_km=NaN should validate() == False."""
        line = LineBranch(
            id="line1",
            from_node="A",
            to_node="B",
            branch_type=BranchType.LINE,
            r_ohm_per_km=float("nan"),
            x_ohm_per_km=0.4,
            b_us_per_km=10.0,
            length_km=5.0,
            rated_current_a=100.0,
        )

        assert line.validate() is False

    def test_linebranch_with_inf_x_returns_false(self):
        """LineBranch with x_ohm_per_km=inf should validate() == False."""
        line = LineBranch(
            id="line1",
            from_node="A",
            to_node="B",
            branch_type=BranchType.LINE,
            r_ohm_per_km=0.2,
            x_ohm_per_km=float("inf"),
            b_us_per_km=10.0,
            length_km=5.0,
            rated_current_a=100.0,
        )

        assert line.validate() is False

    def test_transformer_with_inf_uk_returns_false(self):
        """TransformerBranch with uk_percent=inf should validate() == False."""
        transformer = TransformerBranch(
            id="trafo1",
            from_node="HV",
            to_node="LV",
            branch_type=BranchType.TRANSFORMER,
            rated_power_mva=10.0,
            voltage_hv_kv=110.0,
            voltage_lv_kv=20.0,
            uk_percent=float("inf"),
            pk_kw=60.0,
            i0_percent=0.5,
            p0_kw=10.0,
            tap_step_percent=2.5,
        )

        assert transformer.validate() is False

    def test_transformer_with_nan_pk_returns_false(self):
        """TransformerBranch with pk_kw=NaN should validate() == False."""
        transformer = TransformerBranch(
            id="trafo1",
            from_node="HV",
            to_node="LV",
            branch_type=BranchType.TRANSFORMER,
            rated_power_mva=10.0,
            voltage_hv_kv=110.0,
            voltage_lv_kv=20.0,
            uk_percent=6.0,
            pk_kw=float("nan"),
            i0_percent=0.5,
            p0_kw=10.0,
            tap_step_percent=2.5,
        )

        assert transformer.validate() is False

    def test_transformer_with_negative_inf_returns_false(self):
        """TransformerBranch with rated_power_mva=-inf should validate() == False."""
        transformer = TransformerBranch(
            id="trafo1",
            from_node="HV",
            to_node="LV",
            branch_type=BranchType.TRANSFORMER,
            rated_power_mva=float("-inf"),
            voltage_hv_kv=110.0,
            voltage_lv_kv=20.0,
            uk_percent=6.0,
            pk_kw=60.0,
            i0_percent=0.5,
            p0_kw=10.0,
            tap_step_percent=2.5,
        )

        assert transformer.validate() is False
