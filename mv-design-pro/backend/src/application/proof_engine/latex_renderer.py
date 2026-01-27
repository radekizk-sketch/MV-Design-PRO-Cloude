"""
LaTeX Renderer — Generator dokumentów LaTeX dla Proof Engine P11.1a

STATUS: CANONICAL & BINDING
Reference: P11_1a_MVP_SC3F_AND_VDROP.md

Generuje dokumenty LaTeX z ProofDocument:
- Format blokowy ($$...$$) WYŁĄCZNIE
- Bez inline LaTeX
- Terminologia normowa PN-EN (PL)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from application.proof_engine.types import ProofDocument, ProofStep


class LaTeXRenderer:
    """
    Renderer dokumentów LaTeX dla ProofDocument.

    Generuje pełny dokument LaTeX z:
    - Nagłówkiem
    - Krokami dowodu
    - Podsumowaniem wyników
    - Tabelą wyników końcowych
    """

    PREAMBLE = r"""
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[polish]{babel}
\usepackage{amsmath,amssymb}
\usepackage{booktabs}
\usepackage{geometry}
\usepackage{fancyhdr}
\usepackage{lastpage}
\usepackage{xcolor}

\geometry{margin=2.5cm}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\textit{MV-DESIGN-PRO — Proof Engine}}
\fancyhead[R]{\textit{Dowód matematyczny}}
\fancyfoot[C]{\thepage\ / \pageref{LastPage}}

\definecolor{resultbox}{RGB}{230,245,230}

\newcommand{\resultbox}[1]{%
  \colorbox{resultbox}{\parbox{0.9\textwidth}{\centering #1}}%
}

"""

    @classmethod
    def render(cls, doc: ProofDocument) -> str:
        """
        Renderuje ProofDocument do LaTeX.

        Args:
            doc: ProofDocument do renderowania

        Returns:
            Pełny dokument LaTeX jako string
        """
        parts = [
            cls.PREAMBLE,
            cls._render_title(doc),
            r"\begin{document}",
            r"\maketitle",
            r"\tableofcontents",
            r"\newpage",
            cls._render_header(doc),
            cls._render_steps(doc),
            cls._render_summary(doc),
            r"\end{document}",
        ]
        return "\n\n".join(parts)

    @classmethod
    def _render_title(cls, doc: ProofDocument) -> str:
        """Renderuje nagłówek dokumentu."""
        return rf"""
\title{{{doc.title_pl}}}
\author{{MV-DESIGN-PRO}}
\date{{{doc.created_at.strftime('%Y-%m-%d %H:%M:%S')}}}
"""

    @classmethod
    def _render_header(cls, doc: ProofDocument) -> str:
        """Renderuje sekcję danych wejściowych."""
        h = doc.header
        lines = [
            r"\section{Dane wejściowe}",
            r"\begin{itemize}",
            rf"  \item Projekt: {cls._escape(h.project_name)}",
            rf"  \item Przypadek: {cls._escape(h.case_name)}",
            rf"  \item Wersja solvera: {cls._escape(h.solver_version)}",
        ]

        if h.fault_location:
            lines.append(rf"  \item Miejsce zwarcia: {cls._escape(h.fault_location)}")
        if h.fault_type:
            lines.append(rf"  \item Typ zwarcia: {cls._escape(h.fault_type)}")
        if h.voltage_factor is not None:
            lines.append(rf"  \item Współczynnik napięciowy $c = {h.voltage_factor:.4f}$")
        if h.source_bus:
            lines.append(rf"  \item Szyna źródłowa: {cls._escape(h.source_bus)}")
        if h.target_bus:
            lines.append(rf"  \item Szyna docelowa: {cls._escape(h.target_bus)}")

        lines.append(r"\end{itemize}")
        return "\n".join(lines)

    @classmethod
    def _render_steps(cls, doc: ProofDocument) -> str:
        """Renderuje kroki dowodu."""
        lines = [r"\section{Dowód}"]

        for step in sorted(doc.steps, key=lambda s: s.step_number):
            lines.append(cls._render_step(step))

        return "\n\n".join(lines)

    @classmethod
    def _render_step(cls, step: ProofStep) -> str:
        """Renderuje pojedynczy krok dowodu."""
        parts = [
            rf"\subsection{{Krok {step.step_number}: {cls._escape(step.title_pl)}}}",
            "",
            r"\textbf{Wzór:}",
            r"\begin{equation}",
            step.equation.latex.strip(),
            r"\end{equation}",
            "",
            r"\textbf{Dane:}",
            r"\begin{itemize}",
        ]

        # Sortowanie input_values alfabetycznie po symbol (determinizm)
        sorted_inputs = sorted(step.input_values, key=lambda v: v.symbol)
        for val in sorted_inputs:
            parts.append(rf"  \item ${val.symbol} = {cls._format_value_latex(val)}$")

        parts.extend([
            r"\end{itemize}",
            "",
            r"\textbf{Podstawienie:}",
            r"\begin{equation}",
            step.substitution_latex,
            r"\end{equation}",
            "",
            r"\textbf{Wynik:}",
            r"\begin{center}",
            rf"\resultbox{{${step.result.symbol} = {cls._format_value_latex(step.result)}$}}",
            r"\end{center}",
            "",
            r"\textbf{Weryfikacja jednostek:}",
            rf"${step.unit_check.derivation}$",
        ])

        return "\n".join(parts)

    @classmethod
    def _render_summary(cls, doc: ProofDocument) -> str:
        """Renderuje podsumowanie wyników."""
        lines = [
            r"\section{Podsumowanie wyników}",
            "",
            r"\begin{center}",
            r"\begin{tabular}{lrr}",
            r"\toprule",
            r"\textbf{Wielkość} & \textbf{Wartość} & \textbf{Jednostka} \\",
            r"\midrule",
        ]

        # Sortowanie key_results alfabetycznie (determinizm)
        for key in sorted(doc.summary.key_results.keys()):
            val = doc.summary.key_results[key]
            value_str = cls._format_numeric_value(val.value)
            lines.append(rf"${val.symbol}$ & {value_str} & {val.unit} \\")

        lines.extend([
            r"\bottomrule",
            r"\end{tabular}",
            r"\end{center}",
            "",
            rf"Liczba kroków: {doc.summary.total_steps}",
            "",
            r"Weryfikacja jednostek: " + (
                r"\textcolor{green}{PASS}" if doc.summary.unit_check_passed
                else r"\textcolor{red}{FAIL}"
            ),
        ])

        if doc.summary.warnings:
            lines.append("")
            lines.append(r"\textbf{Ostrzeżenia:}")
            lines.append(r"\begin{itemize}")
            for warning in doc.summary.warnings:
                lines.append(rf"  \item {cls._escape(warning)}")
            lines.append(r"\end{itemize}")

        return "\n".join(lines)

    @classmethod
    def _escape(cls, text: str) -> str:
        """Escape specjalnych znaków LaTeX."""
        replacements = {
            "&": r"\&",
            "%": r"\%",
            "$": r"\$",
            "#": r"\#",
            "_": r"\_",
            "{": r"\{",
            "}": r"\}",
            "~": r"\textasciitilde{}",
            "^": r"\textasciicircum{}",
        }
        for char, replacement in replacements.items():
            text = text.replace(char, replacement)
        return text

    @classmethod
    def _format_value_latex(cls, val) -> str:
        """Formatuje wartość do LaTeX."""
        if isinstance(val.value, complex):
            r = val.value.real
            i = val.value.imag
            sign = "+" if i >= 0 else "-"
            return rf"{r:.4f} {sign} j{abs(i):.4f}\,\text{{{val.unit}}}"
        elif isinstance(val.value, (int, float)):
            return rf"{val.value:.4f}\,\text{{{val.unit}}}"
        else:
            return rf"{val.value}\,\text{{{val.unit}}}"

    @classmethod
    def _format_numeric_value(cls, value) -> str:
        """Formatuje wartość numeryczną."""
        if isinstance(value, complex):
            r = value.real
            i = value.imag
            sign = "+" if i >= 0 else "-"
            return f"{r:.4f} {sign} j{abs(i):.4f}"
        elif isinstance(value, (int, float)):
            return f"{value:.4f}"
        else:
            return str(value)
