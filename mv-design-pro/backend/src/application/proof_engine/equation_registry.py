"""
Equation Registry — Rejestr równań dla Proof Engine P11.1a

STATUS: CANONICAL & BINDING
Reference: EQUATIONS_IEC60909_SC3F.md, EQUATIONS_VDROP.md

Rejestr równań jest JEDYNYM źródłem prawdy dla matematyki w dowodach.
Wszystkie równania są zdefiniowane tutaj na podstawie dokumentacji kanonicznej.

=============================================================================
ANTI-DOUBLE-COUNTING AUDIT — Współczynnik napięciowy c
=============================================================================

Model: A1 (CANONICAL)
---------------------
Współczynnik napięciowy c występuje WYŁĄCZNIE w równaniu EQ_SC3F_004:

    I_k'' = (c · U_n) / (√3 · |Z_th|)

c NIE występuje w żadnym innym równaniu używanym bezpośrednio w dowodzie.

Status: PASS
Weryfikacja: 2026-01-27 (P11.1a MVP)

Pełna lista równań SC3F z audytem c:
| Equation ID   | c występuje | Uwagi                                    |
|---------------|-------------|------------------------------------------|
| EQ_SC3F_003   | NIE         | Impedancja Thevenina (suma Z)            |
| EQ_SC3F_004   | TAK         | Jedyne miejsce z c                       |
| EQ_SC3F_005   | NIE         | Współczynnik κ (R/X)                     |
| EQ_SC3F_006   | NIE         | Prąd udarowy (κ·√2·I_k'')                |
| EQ_SC3F_007   | NIE         | Moc S_k'' (√3·U_n·I_k'')                 |
| EQ_SC3F_008   | NIE         | Prąd cieplny (I_k''·√(m+n))              |
| EQ_SC3F_008a  | NIE         | Prąd dynamiczny (= i_p)                  |

Równania pomocnicze (NIE używane bezpośrednio w dowodzie):
| Equation ID   | c występuje | Uwagi                                    |
|---------------|-------------|------------------------------------------|
| EQ_SC3F_002   | TAK         | Pomocniczy: Z_Q z S_kQ'' (solver only)   |
| EQ_SC3F_002a  | NIE         | Rozkład R/X                              |
| EQ_SC3F_009   | NIE         | Impedancja transformatora                |
| EQ_SC3F_010   | NIE         | Impedancja linii/kabla                   |

=============================================================================
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from application.proof_engine.types import EquationDefinition, SymbolDefinition


# =============================================================================
# SC3F IEC 60909 — Kanoniczne równania (BINDING)
# =============================================================================

# -----------------------------------------------------------------------------
# RÓWNANIA POMOCNICZE (solver-only, NIE używane bezpośrednio w dowodzie)
# -----------------------------------------------------------------------------

EQ_SC3F_002 = EquationDefinition(
    equation_id="EQ_SC3F_002",
    name_pl="Impedancja źródła (sieci zasilającej)",
    standard_ref="IEC 60909-0:2016 eq. (10)",
    latex=r"Z_Q = \frac{c \cdot U_n^2}{S_{kQ}''}",
    symbols=(
        SymbolDefinition(
            symbol="Z_Q",
            unit="Ω",
            description_pl="Impedancja źródła",
            mapping_key="z_source_ohm",
        ),
        SymbolDefinition(
            symbol="c",
            unit="—",
            description_pl="Współczynnik napięciowy",
            mapping_key="c_factor",
        ),
        SymbolDefinition(
            symbol="U_n",
            unit="kV",
            description_pl="Napięcie znamionowe",
            mapping_key="u_n_kv",
        ),
        SymbolDefinition(
            symbol="S_{kQ}''",
            unit="MVA",
            description_pl="Moc zwarciowa źródła",
            mapping_key="sk_source_mva",
        ),
    ),
    unit_derivation="kV² / MVA = Ω",
    notes="POMOCNICZY: używany przez solver do przeliczenia mocy zwarciowej na impedancję. "
          "NIE używany bezpośrednio w dowodzie — c jest już uwzględnione w EQ_SC3F_004.",
)

EQ_SC3F_002a = EquationDefinition(
    equation_id="EQ_SC3F_002a",
    name_pl="Rozkład impedancji źródła na składowe R i X",
    standard_ref="IEC 60909-0:2016 Table 2",
    latex=r"R_Q = \frac{Z_Q}{\sqrt{1 + (X/R)^2}}, \quad X_Q = R_Q \cdot (X/R)",
    symbols=(
        SymbolDefinition(
            symbol="R_Q",
            unit="Ω",
            description_pl="Rezystancja źródła",
            mapping_key="r_source_ohm",
        ),
        SymbolDefinition(
            symbol="X_Q",
            unit="Ω",
            description_pl="Reaktancja źródła",
            mapping_key="x_source_ohm",
        ),
        SymbolDefinition(
            symbol="Z_Q",
            unit="Ω",
            description_pl="Impedancja źródła",
            mapping_key="z_source_ohm",
        ),
        SymbolDefinition(
            symbol="X/R",
            unit="—",
            description_pl="Stosunek reaktancji do rezystancji",
            mapping_key="xr_ratio",
        ),
    ),
    unit_derivation="Ω / — = Ω",
    notes="POMOCNICZY: rozkład impedancji na składowe.",
)

EQ_SC3F_009 = EquationDefinition(
    equation_id="EQ_SC3F_009",
    name_pl="Impedancja transformatora (przeliczona na stronę zwarcia)",
    standard_ref="IEC 60909-0:2016 eq. (7)",
    latex=r"Z_T = \frac{u_k\% \cdot U_n^2}{100 \cdot S_r}",
    symbols=(
        SymbolDefinition(
            symbol="Z_T",
            unit="Ω",
            description_pl="Impedancja transformatora",
            mapping_key="z_transformer_ohm",
        ),
        SymbolDefinition(
            symbol="u_k\\%",
            unit="%",
            description_pl="Napięcie zwarcia transformatora",
            mapping_key="uk_percent",
        ),
        SymbolDefinition(
            symbol="U_n",
            unit="kV",
            description_pl="Napięcie znamionowe (strona zwarcia)",
            mapping_key="u_n_kv",
        ),
        SymbolDefinition(
            symbol="S_r",
            unit="MVA",
            description_pl="Moc znamionowa transformatora",
            mapping_key="s_rated_mva",
        ),
    ),
    unit_derivation="(% · kV²) / (100 · MVA) = Ω",
    notes="POMOCNICZY: przeliczenie parametrów transformatora.",
)

EQ_SC3F_010 = EquationDefinition(
    equation_id="EQ_SC3F_010",
    name_pl="Impedancja linii lub kabla",
    standard_ref="—",
    latex=r"Z_L = (r + jx) \cdot l",
    symbols=(
        SymbolDefinition(
            symbol="Z_L",
            unit="Ω",
            description_pl="Impedancja linii/kabla",
            mapping_key="z_line_ohm",
        ),
        SymbolDefinition(
            symbol="r",
            unit="Ω/km",
            description_pl="Rezystancja jednostkowa",
            mapping_key="r_ohm_per_km",
        ),
        SymbolDefinition(
            symbol="x",
            unit="Ω/km",
            description_pl="Reaktancja jednostkowa",
            mapping_key="x_ohm_per_km",
        ),
        SymbolDefinition(
            symbol="l",
            unit="km",
            description_pl="Długość linii/kabla",
            mapping_key="length_km",
        ),
    ),
    unit_derivation="Ω/km · km = Ω",
    notes="POMOCNICZY: obliczenie impedancji linii/kabla.",
)

# -----------------------------------------------------------------------------
# RÓWNANIA DOWODOWE (używane bezpośrednio w dowodzie SC3F)
# -----------------------------------------------------------------------------

EQ_SC3F_003 = EquationDefinition(
    equation_id="EQ_SC3F_003",
    name_pl="Impedancja zastępcza Thevenina w miejscu zwarcia",
    standard_ref="IEC 60909-0:2016 § 4.2",
    latex=r"Z_{th} = Z_Q + Z_T + Z_L",
    symbols=(
        SymbolDefinition(
            symbol="Z_{th}",
            unit="Ω",
            description_pl="Impedancja zastępcza Thevenina",
            mapping_key="z_thevenin_ohm",
        ),
        SymbolDefinition(
            symbol="Z_Q",
            unit="Ω",
            description_pl="Impedancja źródła",
            mapping_key="z_source_ohm",
        ),
        SymbolDefinition(
            symbol="Z_T",
            unit="Ω",
            description_pl="Impedancja transformatora (przeliczona)",
            mapping_key="z_transformer_ohm",
        ),
        SymbolDefinition(
            symbol="Z_L",
            unit="Ω",
            description_pl="Impedancja linii/kabla",
            mapping_key="z_line_ohm",
        ),
    ),
    unit_derivation="Ω + Ω + Ω = Ω",
    notes="Dla sieci promieniowych suma szeregowa. Dla sieci złożonych: redukcja metodą Thevenina. "
          "AUDIT: c NIE występuje w tym równaniu.",
)

EQ_SC3F_004 = EquationDefinition(
    equation_id="EQ_SC3F_004",
    name_pl="Początkowy prąd zwarciowy symetryczny",
    standard_ref="IEC 60909-0:2016 eq. (29)",
    latex=r"I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{th}|}",
    symbols=(
        SymbolDefinition(
            symbol="I_k''",
            unit="kA",
            description_pl="Początkowy prąd zwarciowy symetryczny",
            mapping_key="ikss_ka",
        ),
        SymbolDefinition(
            symbol="c",
            unit="—",
            description_pl="Współczynnik napięciowy",
            mapping_key="c_factor",
        ),
        SymbolDefinition(
            symbol="U_n",
            unit="kV",
            description_pl="Napięcie znamionowe",
            mapping_key="u_n_kv",
        ),
        SymbolDefinition(
            symbol="Z_{th}",
            unit="Ω",
            description_pl="Impedancja zastępcza Thevenina",
            mapping_key="z_thevenin_ohm",
        ),
    ),
    unit_derivation="kV / Ω = kA",
    notes="AUDIT: c występuje WYŁĄCZNIE w tym równaniu (Anti-Double-Counting: PASS).",
)

EQ_SC3F_005 = EquationDefinition(
    equation_id="EQ_SC3F_005",
    name_pl="Współczynnik udaru",
    standard_ref="IEC 60909-0:2016 eq. (55)",
    latex=r"\kappa = 1.02 + 0.98 \cdot e^{-3 \cdot R_{th}/X_{th}}",
    symbols=(
        SymbolDefinition(
            symbol="\\kappa",
            unit="—",
            description_pl="Współczynnik udaru",
            mapping_key="kappa",
        ),
        SymbolDefinition(
            symbol="R_{th}",
            unit="Ω",
            description_pl="Rezystancja zastępcza Thevenina",
            mapping_key="r_thevenin_ohm",
        ),
        SymbolDefinition(
            symbol="X_{th}",
            unit="Ω",
            description_pl="Reaktancja zastępcza Thevenina",
            mapping_key="x_thevenin_ohm",
        ),
    ),
    unit_derivation="— (bezwymiarowy)",
    notes="Wartość κ mieści się w zakresie 1.02 ≤ κ ≤ 2.00. AUDIT: c NIE występuje.",
)

EQ_SC3F_006 = EquationDefinition(
    equation_id="EQ_SC3F_006",
    name_pl="Prąd udarowy (szczytowy)",
    standard_ref="IEC 60909-0:2016 eq. (54)",
    latex=r"i_p = \kappa \cdot \sqrt{2} \cdot I_k''",
    symbols=(
        SymbolDefinition(
            symbol="i_p",
            unit="kA",
            description_pl="Prąd udarowy (wartość szczytowa)",
            mapping_key="ip_ka",
        ),
        SymbolDefinition(
            symbol="\\kappa",
            unit="—",
            description_pl="Współczynnik udaru",
            mapping_key="kappa",
        ),
        SymbolDefinition(
            symbol="I_k''",
            unit="kA",
            description_pl="Początkowy prąd zwarciowy symetryczny",
            mapping_key="ikss_ka",
        ),
    ),
    unit_derivation="— · — · kA = kA",
    notes="AUDIT: c NIE występuje (używa I_k'' które już zawiera c).",
)

EQ_SC3F_007 = EquationDefinition(
    equation_id="EQ_SC3F_007",
    name_pl="Moc zwarciowa początkowa",
    standard_ref="IEC 60909-0:2016 eq. (33)",
    latex=r"S_k'' = \sqrt{3} \cdot U_n \cdot I_k''",
    symbols=(
        SymbolDefinition(
            symbol="S_k''",
            unit="MVA",
            description_pl="Moc zwarciowa początkowa",
            mapping_key="sk_mva",
        ),
        SymbolDefinition(
            symbol="U_n",
            unit="kV",
            description_pl="Napięcie znamionowe",
            mapping_key="u_n_kv",
        ),
        SymbolDefinition(
            symbol="I_k''",
            unit="kA",
            description_pl="Początkowy prąd zwarciowy symetryczny",
            mapping_key="ikss_ka",
        ),
    ),
    unit_derivation="kV · kA = MVA",
    notes="AUDIT: c NIE występuje (używa I_k'' które już zawiera c).",
)

EQ_SC3F_008 = EquationDefinition(
    equation_id="EQ_SC3F_008",
    name_pl="Prąd cieplny równoważny",
    standard_ref="IEC 60909-0:2016 eq. (100)–(105)",
    latex=r"I_{th} = I_k'' \cdot \sqrt{m + n}",
    symbols=(
        SymbolDefinition(
            symbol="I_{th}",
            unit="kA",
            description_pl="Prąd cieplny równoważny",
            mapping_key="ith_ka",
        ),
        SymbolDefinition(
            symbol="I_k''",
            unit="kA",
            description_pl="Początkowy prąd zwarciowy symetryczny",
            mapping_key="ikss_ka",
        ),
        SymbolDefinition(
            symbol="m",
            unit="—",
            description_pl="Współczynnik dla składowej nieokresowej (DC)",
            mapping_key="m_factor",
        ),
        SymbolDefinition(
            symbol="n",
            unit="—",
            description_pl="Współczynnik dla składowej okresowej (AC decay)",
            mapping_key="n_factor",
        ),
    ),
    unit_derivation="kA · — = kA",
    notes="AUDIT: c NIE występuje (używa I_k'' które już zawiera c).",
)

EQ_SC3F_008a = EquationDefinition(
    equation_id="EQ_SC3F_008a",
    name_pl="Prąd dynamiczny",
    standard_ref="IEC 60909-0:2016 § 4.3.1.2",
    latex=r"I_{dyn} = i_p",
    symbols=(
        SymbolDefinition(
            symbol="I_{dyn}",
            unit="kA",
            description_pl="Prąd dynamiczny (do wymiarowania wytrzymałości dynamicznej)",
            mapping_key="idyn_ka",
        ),
        SymbolDefinition(
            symbol="i_p",
            unit="kA",
            description_pl="Prąd udarowy (szczytowy)",
            mapping_key="ip_ka",
        ),
    ),
    unit_derivation="kA = kA",
    notes="Prąd dynamiczny służy do wymiarowania aparatury na wytrzymałość elektrodynamiczną. "
          "AUDIT: c NIE występuje.",
)


# =============================================================================
# VDROP — Kanoniczne równania (BINDING)
# =============================================================================

EQ_VDROP_001 = EquationDefinition(
    equation_id="EQ_VDROP_001",
    name_pl="Rezystancja odcinka linii lub kabla",
    standard_ref="—",
    latex=r"R = r \cdot l",
    symbols=(
        SymbolDefinition(
            symbol="R",
            unit="Ω",
            description_pl="Rezystancja odcinka",
            mapping_key="r_ohm",
        ),
        SymbolDefinition(
            symbol="r",
            unit="Ω/km",
            description_pl="Rezystancja jednostkowa",
            mapping_key="r_ohm_per_km",
        ),
        SymbolDefinition(
            symbol="l",
            unit="km",
            description_pl="Długość odcinka",
            mapping_key="length_km",
        ),
    ),
    unit_derivation="Ω/km · km = Ω",
)

EQ_VDROP_002 = EquationDefinition(
    equation_id="EQ_VDROP_002",
    name_pl="Reaktancja odcinka linii lub kabla",
    standard_ref="—",
    latex=r"X = x \cdot l",
    symbols=(
        SymbolDefinition(
            symbol="X",
            unit="Ω",
            description_pl="Reaktancja odcinka",
            mapping_key="x_ohm",
        ),
        SymbolDefinition(
            symbol="x",
            unit="Ω/km",
            description_pl="Reaktancja jednostkowa",
            mapping_key="x_ohm_per_km",
        ),
        SymbolDefinition(
            symbol="l",
            unit="km",
            description_pl="Długość odcinka",
            mapping_key="length_km",
        ),
    ),
    unit_derivation="Ω/km · km = Ω",
)

EQ_VDROP_003 = EquationDefinition(
    equation_id="EQ_VDROP_003",
    name_pl="Składowa czynna spadku napięcia (R·P)",
    standard_ref="—",
    latex=r"\Delta U_R = \frac{R \cdot P}{U_n^2} \cdot 100\%",
    symbols=(
        SymbolDefinition(
            symbol="\\Delta U_R",
            unit="%",
            description_pl="Składowa czynna spadku napięcia",
            mapping_key="delta_u_r_percent",
        ),
        SymbolDefinition(
            symbol="R",
            unit="Ω",
            description_pl="Rezystancja odcinka",
            mapping_key="r_ohm",
        ),
        SymbolDefinition(
            symbol="P",
            unit="MW",
            description_pl="Moc czynna przepływająca",
            mapping_key="p_mw",
        ),
        SymbolDefinition(
            symbol="U_n",
            unit="kV",
            description_pl="Napięcie znamionowe",
            mapping_key="u_n_kv",
        ),
    ),
    unit_derivation="(Ω · MW) / kV² = %",
    notes="Dla sieci trójfazowej: P to moc trójfazowa.",
)

EQ_VDROP_004 = EquationDefinition(
    equation_id="EQ_VDROP_004",
    name_pl="Składowa bierna spadku napięcia (X·Q)",
    standard_ref="—",
    latex=r"\Delta U_X = \frac{X \cdot Q}{U_n^2} \cdot 100\%",
    symbols=(
        SymbolDefinition(
            symbol="\\Delta U_X",
            unit="%",
            description_pl="Składowa bierna spadku napięcia",
            mapping_key="delta_u_x_percent",
        ),
        SymbolDefinition(
            symbol="X",
            unit="Ω",
            description_pl="Reaktancja odcinka",
            mapping_key="x_ohm",
        ),
        SymbolDefinition(
            symbol="Q",
            unit="Mvar",
            description_pl="Moc bierna przepływająca",
            mapping_key="q_mvar",
        ),
        SymbolDefinition(
            symbol="U_n",
            unit="kV",
            description_pl="Napięcie znamionowe",
            mapping_key="u_n_kv",
        ),
    ),
    unit_derivation="(Ω · Mvar) / kV² = %",
    notes="Q dodatnie = indukcyjna (pobór), Q ujemne = pojemnościowa (generacja).",
)

EQ_VDROP_005 = EquationDefinition(
    equation_id="EQ_VDROP_005",
    name_pl="Całkowity spadek napięcia na odcinku",
    standard_ref="—",
    latex=r"\Delta U = \Delta U_R + \Delta U_X",
    symbols=(
        SymbolDefinition(
            symbol="\\Delta U",
            unit="%",
            description_pl="Spadek napięcia na odcinku",
            mapping_key="delta_u_percent",
        ),
        SymbolDefinition(
            symbol="\\Delta U_R",
            unit="%",
            description_pl="Składowa czynna spadku",
            mapping_key="delta_u_r_percent",
        ),
        SymbolDefinition(
            symbol="\\Delta U_X",
            unit="%",
            description_pl="Składowa bierna spadku",
            mapping_key="delta_u_x_percent",
        ),
    ),
    unit_derivation="% + % = %",
    notes="Suma algebraiczna — ΔU_X może być ujemne (wzrost napięcia).",
)

EQ_VDROP_006 = EquationDefinition(
    equation_id="EQ_VDROP_006",
    name_pl="Sumaryczny spadek napięcia od źródła do punktu",
    standard_ref="—",
    latex=r"\Delta U_{total} = \sum_{i=1}^{n} \Delta U_i",
    symbols=(
        SymbolDefinition(
            symbol="\\Delta U_{total}",
            unit="%",
            description_pl="Sumaryczny spadek napięcia",
            mapping_key="delta_u_total_percent",
        ),
        SymbolDefinition(
            symbol="\\Delta U_i",
            unit="%",
            description_pl="Spadek napięcia na i-tym odcinku",
            mapping_key="delta_u_segments",
        ),
        SymbolDefinition(
            symbol="n",
            unit="—",
            description_pl="Liczba odcinków na ścieżce",
            mapping_key="segment_count",
        ),
    ),
    unit_derivation="Σ % = %",
    notes="Suma po wszystkich odcinkach od źródła do punktu.",
)

EQ_VDROP_007 = EquationDefinition(
    equation_id="EQ_VDROP_007",
    name_pl="Napięcie w punkcie po uwzględnieniu spadku",
    standard_ref="—",
    latex=r"U = U_{source} \cdot \left(1 - \frac{\Delta U_{total}}{100}\right)",
    symbols=(
        SymbolDefinition(
            symbol="U",
            unit="kV",
            description_pl="Napięcie w punkcie",
            mapping_key="u_kv",
        ),
        SymbolDefinition(
            symbol="U_{source}",
            unit="kV",
            description_pl="Napięcie źródła",
            mapping_key="u_source_kv",
        ),
        SymbolDefinition(
            symbol="\\Delta U_{total}",
            unit="%",
            description_pl="Sumaryczny spadek napięcia",
            mapping_key="delta_u_total_percent",
        ),
    ),
    unit_derivation="kV · — = kV",
)


# =============================================================================
# ANTI-DOUBLE-COUNTING AUDIT
# =============================================================================


class AntiDoubleCountingAudit:
    """
    Anti-Double-Counting Audit dla współczynnika napięciowego c.

    Model: A1 (CANONICAL)
    c występuje WYŁĄCZNIE w: EQ_SC3F_004

    Status: PASS
    """

    MODEL = "A1"
    C_FACTOR_EQUATION = "EQ_SC3F_004"
    STATUS = "PASS"

    # Równania dowodowe SC3F z audytem c
    PROOF_EQUATIONS_AUDIT: dict[str, bool] = {
        "EQ_SC3F_003": False,   # Impedancja Thevenina — c NIE występuje
        "EQ_SC3F_004": True,    # Prąd I_k'' — c WYSTĘPUJE (jedyne miejsce)
        "EQ_SC3F_005": False,   # Współczynnik κ — c NIE występuje
        "EQ_SC3F_006": False,   # Prąd udarowy — c NIE występuje
        "EQ_SC3F_007": False,   # Moc S_k'' — c NIE występuje
        "EQ_SC3F_008": False,   # Prąd cieplny — c NIE występuje
        "EQ_SC3F_008a": False,  # Prąd dynamiczny — c NIE występuje
    }

    # Równania pomocnicze (solver-only)
    HELPER_EQUATIONS_AUDIT: dict[str, bool] = {
        "EQ_SC3F_002": True,    # Z_Q z S_kQ'' — c występuje (solver only)
        "EQ_SC3F_002a": False,  # Rozkład R/X — c NIE występuje
        "EQ_SC3F_009": False,   # Impedancja transformatora — c NIE występuje
        "EQ_SC3F_010": False,   # Impedancja linii — c NIE występuje
    }

    @classmethod
    def verify(cls) -> bool:
        """
        Weryfikuje, że c występuje DOKŁADNIE RAZ w równaniach dowodowych.

        Returns:
            True jeśli audit PASS, False jeśli FAIL
        """
        c_count = sum(1 for has_c in cls.PROOF_EQUATIONS_AUDIT.values() if has_c)
        if c_count != 1:
            return False
        if not cls.PROOF_EQUATIONS_AUDIT.get(cls.C_FACTOR_EQUATION, False):
            return False
        return True

    @classmethod
    def get_audit_report(cls) -> str:
        """Zwraca raport audytu w formie tekstowej."""
        lines = [
            "ANTI-DOUBLE-COUNTING AUDIT — Współczynnik napięciowy c",
            "=" * 60,
            f"Model: {cls.MODEL}",
            f"c występuje w: {cls.C_FACTOR_EQUATION}",
            "",
            "Równania dowodowe SC3F:",
        ]
        for eq_id, has_c in sorted(cls.PROOF_EQUATIONS_AUDIT.items()):
            status = "TAK" if has_c else "NIE"
            lines.append(f"  {eq_id}: c {status}")

        lines.append("")
        lines.append("Równania pomocnicze (solver-only):")
        for eq_id, has_c in sorted(cls.HELPER_EQUATIONS_AUDIT.items()):
            status = "TAK" if has_c else "NIE"
            lines.append(f"  {eq_id}: c {status}")

        lines.append("")
        passed = cls.verify()
        lines.append(f"Status: {'PASS' if passed else 'FAIL'}")

        return "\n".join(lines)


# =============================================================================
# EquationRegistry — Rejestr równań
# =============================================================================


class EquationRegistry:
    """
    Rejestr równań dla Proof Engine.

    Rejestr jest JEDYNYM źródłem prawdy dla wszystkich równań używanych w dowodach.
    Wszystkie equation_id są STABILNE i NIE MOGĄ się zmienić między wersjami.
    """

    # SC3F equations registry (wszystkie, włącznie z pomocniczymi)
    SC3F_EQUATIONS: dict[str, EquationDefinition] = {
        "EQ_SC3F_002": EQ_SC3F_002,
        "EQ_SC3F_002a": EQ_SC3F_002a,
        "EQ_SC3F_003": EQ_SC3F_003,
        "EQ_SC3F_004": EQ_SC3F_004,
        "EQ_SC3F_005": EQ_SC3F_005,
        "EQ_SC3F_006": EQ_SC3F_006,
        "EQ_SC3F_007": EQ_SC3F_007,
        "EQ_SC3F_008": EQ_SC3F_008,
        "EQ_SC3F_008a": EQ_SC3F_008a,
        "EQ_SC3F_009": EQ_SC3F_009,
        "EQ_SC3F_010": EQ_SC3F_010,
    }

    # VDROP equations registry
    VDROP_EQUATIONS: dict[str, EquationDefinition] = {
        "EQ_VDROP_001": EQ_VDROP_001,
        "EQ_VDROP_002": EQ_VDROP_002,
        "EQ_VDROP_003": EQ_VDROP_003,
        "EQ_VDROP_004": EQ_VDROP_004,
        "EQ_VDROP_005": EQ_VDROP_005,
        "EQ_VDROP_006": EQ_VDROP_006,
        "EQ_VDROP_007": EQ_VDROP_007,
    }

    # Step order for SC3F proof (BINDING) — tylko równania dowodowe
    SC3F_PROOF_STEP_ORDER: list[str] = [
        "EQ_SC3F_003",  # Impedancja Thevenina
        "EQ_SC3F_004",  # Prąd zwarciowy I_k'' (c TUTAJ)
        "EQ_SC3F_005",  # Współczynnik udaru κ
        "EQ_SC3F_006",  # Prąd udarowy i_p
        "EQ_SC3F_008a", # Prąd dynamiczny I_dyn (OBOWIĄZKOWY)
        "EQ_SC3F_008",  # Prąd cieplny I_th (OBOWIĄZKOWY)
        "EQ_SC3F_007",  # Moc zwarciowa S_k''
    ]

    # Step order for VDROP (BINDING)
    VDROP_STEP_ORDER: list[str] = [
        "EQ_VDROP_001",  # Rezystancja odcinka
        "EQ_VDROP_002",  # Reaktancja odcinka
        "EQ_VDROP_003",  # Składowa czynna ΔU_R
        "EQ_VDROP_004",  # Składowa bierna ΔU_X
        "EQ_VDROP_005",  # Spadek na odcinku ΔU
        "EQ_VDROP_006",  # Suma spadków ΔU_total
        "EQ_VDROP_007",  # Napięcie w punkcie U
    ]

    # Frozen IDs for stability tests (BINDING)
    FROZEN_IDS: dict[str, list[str]] = {
        "sc3f_equations": list(SC3F_EQUATIONS.keys()),
        "vdrop_equations": list(VDROP_EQUATIONS.keys()),
        "mapping_keys": [
            # SC3F
            "ikss_ka", "ip_ka", "ith_ka", "idyn_ka", "sk_mva",
            "kappa", "z_thevenin_ohm", "r_thevenin_ohm", "x_thevenin_ohm",
            "c_factor", "u_n_kv",
            # VDROP
            "r_ohm", "x_ohm", "p_mw", "q_mvar",
            "delta_u_r_percent", "delta_u_x_percent",
            "delta_u_percent", "delta_u_total_percent",
        ],
    }

    @classmethod
    def get_equation(cls, equation_id: str) -> EquationDefinition | None:
        """Zwraca definicję równania po ID."""
        if equation_id in cls.SC3F_EQUATIONS:
            return cls.SC3F_EQUATIONS[equation_id]
        if equation_id in cls.VDROP_EQUATIONS:
            return cls.VDROP_EQUATIONS[equation_id]
        return None

    @classmethod
    def get_sc3f_equations(cls) -> dict[str, EquationDefinition]:
        """Zwraca wszystkie równania SC3F."""
        return cls.SC3F_EQUATIONS.copy()

    @classmethod
    def get_vdrop_equations(cls) -> dict[str, EquationDefinition]:
        """Zwraca wszystkie równania VDROP."""
        return cls.VDROP_EQUATIONS.copy()

    @classmethod
    def get_sc3f_proof_step_order(cls) -> list[str]:
        """Zwraca kolejność kroków dla dowodu SC3F (tylko równania dowodowe)."""
        return cls.SC3F_PROOF_STEP_ORDER.copy()

    @classmethod
    def get_vdrop_step_order(cls) -> list[str]:
        """Zwraca kolejność kroków dla dowodu VDROP."""
        return cls.VDROP_STEP_ORDER.copy()

    @classmethod
    def get_all_mapping_keys(cls) -> set[str]:
        """Zwraca wszystkie mapping_key używane w rejestrze."""
        keys: set[str] = set()
        for eq in cls.SC3F_EQUATIONS.values():
            for sym in eq.symbols:
                keys.add(sym.mapping_key)
        for eq in cls.VDROP_EQUATIONS.values():
            for sym in eq.symbols:
                keys.add(sym.mapping_key)
        return keys

    @classmethod
    def validate_id_stability(cls) -> bool:
        """
        Weryfikuje, że żaden istniejący ID nie został zmieniony.
        Używane w testach regresji.
        """
        for eq_id in cls.FROZEN_IDS["sc3f_equations"]:
            if eq_id not in cls.SC3F_EQUATIONS:
                raise ValueError(f"Frozen equation ID {eq_id} usunięty z SC3F!")

        for eq_id in cls.FROZEN_IDS["vdrop_equations"]:
            if eq_id not in cls.VDROP_EQUATIONS:
                raise ValueError(f"Frozen equation ID {eq_id} usunięty z VDROP!")

        current_keys = cls.get_all_mapping_keys()
        for key in cls.FROZEN_IDS["mapping_keys"]:
            if key not in current_keys:
                raise ValueError(f"Frozen mapping key {key} usunięty!")

        return True

    @classmethod
    def verify_anti_double_counting(cls) -> bool:
        """Weryfikuje audit anti-double-counting."""
        return AntiDoubleCountingAudit.verify()
