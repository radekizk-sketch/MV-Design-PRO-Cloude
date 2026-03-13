/**
 * SchematIdeowySLD — Schemat ideowy SLD w stylu ABB/ETAP (IEC 60617)
 *
 * Profesjonalny schemat ideowy sieci SN z pełną topologią:
 * - GPZ 110/15kV z szyną zbiorczą SN
 * - Magistrala główna (trunk) z odcinkami kablowymi
 * - Stacje przelotowe, odgałęźne, sekcyjne, końcowe
 * - Zasoby rozproszone (DER): PV, BESS, odbiory
 * - Zabezpieczenia (przekaźniki 50/51)
 * - Punkt normalnie otwarty (NOP)
 *
 * KONTRAKT:
 * - Rendering czysto SVG — brak Canvas 2D
 * - Brak fizyki — warstwa prezentacji
 * - Brak mutacji modelu — read-only
 * - 100% Polish labels
 * - Deterministyczny (ten sam wejście → ten sam rendering)
 *
 * CANONICAL ALIGNMENT:
 * - IEC 60617 symbole i konwencje
 * - ETAP / ABB / DIgSILENT visual parity
 * - iecSldColors.ts — jedyne źródło kolorów
 * - IecSldSymbols.tsx — komponenty symboli
 */

import React from 'react';
import { IEC_COLORS, IEC_TYPOGRAPHY } from './iecSldColors';
import {
  ParameterBox,
  IECBreaker,
  IECLoadBreakSwitch,
  Transformer,
  DerIcon,
  StationEnclosure,
  Relay,
  IecSldLegend,
} from './IecSldSymbols';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Schemat ideowy SLD — pełna topologia sieci SN w stylu ABB/ETAP.
 *
 * Renderuje kompletny schemat z GPZ, magistralą, stacjami, DER, zabezpieczeniami.
 * Oś główna magistrali (TRUNK_X) zoptymalizowana dla czytelności.
 */
export const SchematIdeowySLD: React.FC = () => {
  const TRUNK_X = 500;

  return (
    <div className="w-full min-h-screen bg-slate-200 p-6 flex flex-col items-center font-sans">
      <div className="max-w-7xl w-full space-y-4 pb-20">
        {/* Nagłówek ETAP-style */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4 border-l-4 border-l-blue-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Schemat Ideowy SN — Styl ABB/ETAP
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Standard IEC 60617 &bull; Topologia wieloodgalezieniowa &bull;
                Wersja ortogonalna
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">
                SIEC MIEJSKA
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                REWIZJA: B.02
              </div>
            </div>
          </div>
        </div>

        {/* Obszar SVG */}
        <div
          className="bg-white rounded-xl shadow-xl border border-slate-300 p-6 overflow-auto"
          style={{
            backgroundImage:
              'radial-gradient(#CBD5E1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <svg
            viewBox="0 0 1400 2000"
            className="w-full h-auto bg-transparent"
            data-testid="iec-sld-canvas"
          >
            {/* ═══════════════════════════════════════════════════
                1. GPZ 110/15 kV
                ═══════════════════════════════════════════════════ */}
            <StationEnclosure
              x={TRUNK_X - 150}
              y={40}
              width={300}
              height={140}
              title="GPZ 110/15 kV"
              subtitle="Zrodlo SN - Sekcja I"
            />
            {/* Szyna zbiorcza SN GPZ */}
            <line
              x1={TRUNK_X - 120}
              y1={100}
              x2={TRUNK_X + 120}
              y2={100}
              stroke={IEC_COLORS.hvBus}
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Pion z GPZ do magistrali */}
            <line
              x1={TRUNK_X}
              y1={100}
              x2={TRUNK_X}
              y2={220}
              stroke={IEC_COLORS.hvBus}
              strokeWidth="4"
            />

            <IECBreaker x={TRUNK_X} y={130} label="Q-01" status="closed" />
            {/* CT marker */}
            <circle
              cx={TRUNK_X}
              cy={160}
              r="4"
              fill={IEC_COLORS.bg}
              stroke={IEC_COLORS.primaryText}
              strokeWidth="1.5"
            />
            <line
              x1={TRUNK_X}
              y1={160}
              x2={TRUNK_X + 30}
              y2={160}
              stroke={IEC_COLORS.secondaryText}
              strokeDasharray="3 3"
            />
            <Relay x={TRUNK_X + 50} y={160} code="50/51" />

            <ParameterBox
              x={TRUNK_X + 20}
              y={200}
              title="L-01 Magistrala SN"
              params="1200m &bull; 3 x XRUHAKXS 1x240"
              align="left"
            />

            {/* Pion Magistrali (trunk) — od GPZ do ST-13 */}
            <line
              x1={TRUNK_X}
              y1={220}
              x2={TRUNK_X}
              y2={1850}
              stroke={IEC_COLORS.hvBus}
              strokeWidth="4"
            />

            {/* ═══════════════════════════════════════════════════
                2. ST-08 Zakład Przemysłowy (Odgałęzienie Lewe)
                ═══════════════════════════════════════════════════ */}
            <g transform="translate(0, 320)">
              <circle
                cx={TRUNK_X}
                cy={0}
                r="5"
                fill={IEC_COLORS.hvBus}
              />
              <line
                x1={TRUNK_X}
                y1={0}
                x2={TRUNK_X - 250}
                y2={0}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <ParameterBox
                x={TRUNK_X - 20}
                y={-20}
                title="ODG-01 Przemysl"
                params="150m &bull; 3x120 mm2"
                align="right"
              />

              <StationEnclosure
                x={TRUNK_X - 420}
                y={-80}
                width={170}
                height={260}
                title="ST-08 Zaklad Przemyslowy"
                subtitle="Ciezki odbior komercyjny"
              />

              {/* Wnętrze ST-08 */}
              <line
                x1={TRUNK_X - 250}
                y1={0}
                x2={TRUNK_X - 350}
                y2={0}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <line
                x1={TRUNK_X - 350}
                y1={0}
                x2={TRUNK_X - 350}
                y2={50}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X - 350}
                y={20}
                label="Q-21"
              />
              <Transformer x={TRUNK_X - 350} y={70} specs="1000 kVA" />
              <line
                x1={TRUNK_X - 350}
                y1={90}
                x2={TRUNK_X - 350}
                y2={120}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X - 400}
                y1={120}
                x2={TRUNK_X - 300}
                y2={120}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />
              <DerIcon
                x={TRUNK_X - 350}
                y={120}
                type="load"
                value="800 kW"
              />
            </g>

            {/* ═══════════════════════════════════════════════════
                3. ST-07 Stacja Przelotowa (Na magistrali)
                ═══════════════════════════════════════════════════ */}
            <g transform="translate(0, 580)">
              <ParameterBox
                x={TRUNK_X + 20}
                y={-40}
                title="L-02 Magistrala SN"
                params="850m &bull; 3 x XRUHAKXS 1x240"
                align="left"
              />

              <StationEnclosure
                x={TRUNK_X - 150}
                y={-30}
                width={300}
                height={200}
                title="ST-07 Stacja Przelotowa"
                subtitle="Typ B &bull; Zlacze Kablowe"
              />

              {/* Szyna SN Przelotowa */}
              <line
                x1={TRUNK_X}
                y1={0}
                x2={TRUNK_X + 80}
                y2={0}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X - 80}
                y1={50}
                x2={TRUNK_X + 80}
                y2={50}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Pole IN */}
              <IECLoadBreakSwitch
                x={TRUNK_X}
                y={20}
                label="Q-11 IN"
              />

              {/* Pole OUT */}
              <line
                x1={TRUNK_X + 60}
                y1={50}
                x2={TRUNK_X + 60}
                y2={170}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X + 60}
                y={80}
                label="Q-12 OUT"
              />
              {/* OUT wraca na oś trunk */}
              <line
                x1={TRUNK_X + 60}
                y1={170}
                x2={TRUNK_X}
                y2={170}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />

              {/* Pole TR */}
              <line
                x1={TRUNK_X - 60}
                y1={50}
                x2={TRUNK_X - 60}
                y2={80}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="3"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X - 60}
                y={75}
                label="Q-T1"
                fused
              />
              <Transformer
                x={TRUNK_X - 60}
                y={110}
                specs="400 kVA"
              />
              <line
                x1={TRUNK_X - 60}
                y1={130}
                x2={TRUNK_X - 60}
                y2={140}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X - 100}
                y1={140}
                x2={TRUNK_X - 20}
                y2={140}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <DerIcon
                x={TRUNK_X - 60}
                y={140}
                type="load"
                value="150 kW"
              />
            </g>

            {/* ═══════════════════════════════════════════════════
                4. ST-20 Mikrosieć OZE (Odgałęzienie Prawe)
                ═══════════════════════════════════════════════════ */}
            <g transform="translate(0, 900)">
              <ParameterBox
                x={TRUNK_X + 20}
                y={-40}
                title="L-03 Magistrala SN"
                params="900m &bull; 3 x XRUHAKXS 1x240"
                align="left"
              />

              <circle
                cx={TRUNK_X}
                cy={0}
                r="5"
                fill={IEC_COLORS.hvBus}
              />
              <line
                x1={TRUNK_X}
                y1={0}
                x2={TRUNK_X + 150}
                y2={0}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <ParameterBox
                x={TRUNK_X + 20}
                y={20}
                title="ODG-02 Mikrosiec"
                params="320m &bull; 3x120 mm2"
                align="left"
              />

              <StationEnclosure
                x={TRUNK_X + 150}
                y={-80}
                width={280}
                height={260}
                title="ST-20 Klaster Energii (DER)"
                subtitle="Zasoby OZE + BESS + Ring"
              />

              {/* Wnętrze ST-20 */}
              <line
                x1={TRUNK_X + 150}
                y1={0}
                x2={TRUNK_X + 200}
                y2={0}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <line
                x1={TRUNK_X + 200}
                y1={0}
                x2={TRUNK_X + 200}
                y2={40}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X + 200}
                y={15}
                label="Q-21 IN"
              />

              <line
                x1={TRUNK_X + 180}
                y1={40}
                x2={TRUNK_X + 400}
                y2={40}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Odejście RING */}
              <line
                x1={TRUNK_X + 370}
                y1={40}
                x2={TRUNK_X + 370}
                y2={120}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X + 370}
                y={70}
                label="Q-R1"
              />
              <line
                x1={TRUNK_X + 370}
                y1={120}
                x2={TRUNK_X + 450}
                y2={120}
                stroke={IEC_COLORS.secondaryText}
                strokeWidth="2.5"
                strokeDasharray="8 6"
              />
              <text
                x={TRUNK_X + 455}
                y={123}
                fontFamily={IEC_TYPOGRAPHY.fontFamily}
                fontSize={IEC_TYPOGRAPHY.fontSize.param}
                fill={IEC_COLORS.secondaryText}
              >
                Kier. ST-21 (Ring)
              </text>

              {/* Trafo ST-20 */}
              <line
                x1={TRUNK_X + 280}
                y1={40}
                x2={TRUNK_X + 280}
                y2={70}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="3"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X + 280}
                y={65}
                label="Q-T2"
                fused
              />
              <Transformer
                x={TRUNK_X + 280}
                y={100}
                specs="630 kVA"
              />
              <line
                x1={TRUNK_X + 280}
                y1={120}
                x2={TRUNK_X + 280}
                y2={140}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X + 180}
                y1={140}
                x2={TRUNK_X + 380}
                y2={140}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* DER Elements */}
              <DerIcon
                x={TRUNK_X + 220}
                y={140}
                type="load"
                value="200 kW"
              />
              <DerIcon
                x={TRUNK_X + 280}
                y={140}
                type="pv"
                value="150 kWp"
              />
              <DerIcon
                x={TRUNK_X + 340}
                y={140}
                type="bess"
                value="100 kWh"
              />
            </g>

            {/* ═══════════════════════════════════════════════════
                5. ST-09 Farma PV (Odgałęzienie Lewe 2)
                ═══════════════════════════════════════════════════ */}
            <g transform="translate(0, 1150)">
              <ParameterBox
                x={TRUNK_X + 20}
                y={-40}
                title="L-04 Magistrala SN"
                params="450m &bull; 3 x XRUHAKXS 1x240"
                align="left"
              />

              <circle
                cx={TRUNK_X}
                cy={0}
                r="5"
                fill={IEC_COLORS.hvBus}
              />
              <line
                x1={TRUNK_X}
                y1={0}
                x2={TRUNK_X - 150}
                y2={0}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <ParameterBox
                x={TRUNK_X - 20}
                y={-20}
                title="ODG-03 Elektrownia"
                params="50m &bull; 3x120 mm2"
                align="right"
              />

              <StationEnclosure
                x={TRUNK_X - 350}
                y={-80}
                width={200}
                height={200}
                title="ST-09 Farma PV"
                subtitle="Stacja Wyprowadzenia Mocy"
              />

              {/* Wnętrze ST-09 */}
              <line
                x1={TRUNK_X - 150}
                y1={0}
                x2={TRUNK_X - 250}
                y2={0}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <line
                x1={TRUNK_X - 250}
                y1={0}
                x2={TRUNK_X - 250}
                y2={40}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <IECBreaker
                x={TRUNK_X - 250}
                y={15}
                label="Q-PV"
                status="closed"
              />

              <Transformer
                x={TRUNK_X - 250}
                y={70}
                specs="2000 kVA"
              />
              <line
                x1={TRUNK_X - 250}
                y1={90}
                x2={TRUNK_X - 250}
                y2={100}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X - 300}
                y1={100}
                x2={TRUNK_X - 200}
                y2={100}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />
              <DerIcon
                x={TRUNK_X - 250}
                y={100}
                type="pv"
                value="2.0 MWp"
              />
            </g>

            {/* ═══════════════════════════════════════════════════
                6. ST-12 Stacja Sekcyjna i NOP
                ═══════════════════════════════════════════════════ */}
            <g transform="translate(0, 1450)">
              <ParameterBox
                x={TRUNK_X + 20}
                y={-60}
                title="L-05 Magistrala SN"
                params="850m &bull; 3 x XRUHAKXS 1x240"
                align="left"
              />

              <StationEnclosure
                x={TRUNK_X - 250}
                y={-30}
                width={500}
                height={180}
                title="ST-12 Wezel Rozdzielczy"
                subtitle="Dwie sekcje szyn &bull; Sprzeglo &bull; NOP"
              />

              {/* Szyny Section A & B */}
              <line
                x1={TRUNK_X - 200}
                y1={50}
                x2={TRUNK_X - 20}
                y2={50}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />
              <line
                x1={TRUNK_X + 20}
                y1={50}
                x2={TRUNK_X + 200}
                y2={50}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />
              <text
                x={TRUNK_X - 110}
                y={40}
                fontFamily={IEC_TYPOGRAPHY.fontFamily}
                fontSize={IEC_TYPOGRAPHY.fontSize.param}
                fontWeight={IEC_TYPOGRAPHY.fontWeight.semibold}
                fill={IEC_COLORS.hvBus}
              >
                SEKCJA A
              </text>
              <text
                x={TRUNK_X + 110}
                y={40}
                fontFamily={IEC_TYPOGRAPHY.fontFamily}
                fontSize={IEC_TYPOGRAPHY.fontSize.param}
                fontWeight={IEC_TYPOGRAPHY.fontWeight.semibold}
                fill={IEC_COLORS.hvBus}
              >
                SEKCJA B
              </text>

              {/* Wejście IN → Section A */}
              <line
                x1={TRUNK_X}
                y1={-30}
                x2={TRUNK_X}
                y2={0}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X}
                y1={0}
                x2={TRUNK_X - 150}
                y2={0}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X - 150}
                y1={0}
                x2={TRUNK_X - 150}
                y2={50}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />
              <IECBreaker
                x={TRUNK_X - 150}
                y={20}
                label="Q-31"
                status="closed"
              />

              {/* Sprzęgło (NOP) */}
              <line
                x1={TRUNK_X - 20}
                y1={50}
                x2={TRUNK_X + 20}
                y2={50}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="2"
              />
              <IECBreaker
                x={TRUNK_X}
                y={50}
                label="Q-S (NOP)"
                status="open"
              />

              {/* Wyjście OUT → Section A */}
              <line
                x1={TRUNK_X - 50}
                y1={50}
                x2={TRUNK_X - 50}
                y2={150}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X - 50}
                y={80}
                label="Q-32"
              />
              <line
                x1={TRUNK_X - 50}
                y1={150}
                x2={TRUNK_X}
                y2={150}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />

              {/* Odejście Sekcji B (Rezerwa) */}
              <line
                x1={TRUNK_X + 150}
                y1={50}
                x2={TRUNK_X + 150}
                y2={120}
                stroke={IEC_COLORS.branch}
                strokeWidth="3"
              />
              <IECBreaker
                x={TRUNK_X + 150}
                y={80}
                label="Q-33"
                status="closed"
              />
              <line
                x1={TRUNK_X + 150}
                y1={120}
                x2={TRUNK_X + 300}
                y2={120}
                stroke={IEC_COLORS.secondaryText}
                strokeWidth="2.5"
                strokeDasharray="8 6"
              />
              <text
                x={TRUNK_X + 305}
                y={123}
                fontFamily={IEC_TYPOGRAPHY.fontFamily}
                fontSize={IEC_TYPOGRAPHY.fontSize.param}
                fill={IEC_COLORS.secondaryText}
              >
                Zasilanie Rezerwowe (GPZ-2)
              </text>
            </g>

            {/* ═══════════════════════════════════════════════════
                7. ST-13 Odbiór Końcowy
                ═══════════════════════════════════════════════════ */}
            <g transform="translate(0, 1750)">
              <ParameterBox
                x={TRUNK_X + 20}
                y={-50}
                title="L-06 Magistrala SN"
                params="400m &bull; 3 x XRUHAKXS 1x240"
                align="left"
              />

              <StationEnclosure
                x={TRUNK_X - 100}
                y={-10}
                width={200}
                height={180}
                title="ST-13 Odbior Koncowy"
                subtitle="Zakonczenie ciagu magistralnego"
              />

              <line
                x1={TRUNK_X}
                y1={-10}
                x2={TRUNK_X}
                y2={60}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X - 40}
                y1={60}
                x2={TRUNK_X + 40}
                y2={60}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="6"
                strokeLinecap="round"
              />

              <IECLoadBreakSwitch
                x={TRUNK_X}
                y={30}
                label="Q-41 IN"
              />

              <line
                x1={TRUNK_X}
                y1={60}
                x2={TRUNK_X}
                y2={90}
                stroke={IEC_COLORS.hvBus}
                strokeWidth="3"
              />
              <IECLoadBreakSwitch
                x={TRUNK_X}
                y={85}
                label="Q-T1"
                fused
              />
              <Transformer x={TRUNK_X} y={120} specs="250 kVA" />
              <line
                x1={TRUNK_X}
                y1={140}
                x2={TRUNK_X}
                y2={150}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="4"
              />
              <line
                x1={TRUNK_X - 30}
                y1={150}
                x2={TRUNK_X + 30}
                y2={150}
                stroke={IEC_COLORS.lvBus}
                strokeWidth="5"
                strokeLinecap="round"
              />

              <DerIcon
                x={TRUNK_X}
                y={150}
                type="load"
                value="100 kW"
              />
            </g>

            {/* ═══════════════════════════════════════════════════
                LEGENDA
                ═══════════════════════════════════════════════════ */}
            <IecSldLegend />
          </svg>
        </div>
      </div>
    </div>
  );
};
