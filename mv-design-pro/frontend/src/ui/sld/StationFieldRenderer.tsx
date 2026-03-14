/**
 * StationFieldRenderer — ABB-standard apparatus chain renderer
 *
 * ELEKTROENERGETYKA: Stacja SN/nN ma:
 * - Rozdzielnicę SN z własną szyną SN (krótka szyna wewnętrzna)
 * - Łańcuch aparatów (rozłącznik, wyłącznik, CT) podłączony do szyny SN
 * - Transformator SN/nN
 * - Szynę nN po stronie wtórnej transformatora
 *
 * Szyna SN w stacji ≠ szyna SN w GPZ.
 * GPZ ma szynę zbiorczą SN (główną). Stacja ma szynę rozdzielnicy SN (lokalną).
 */
import React from 'react';
import type { StationApparatusChainV1 } from './core/layoutResult';
import { JunctionDot } from './symbols/JunctionDot';
import { EtapSymbol } from './EtapSymbolRenderer';
import type { EtapSymbolId } from './SymbolResolver';
import {
  APPARATUS_CHAIN_STEP_Y,
  STATION_INTERNAL_STROKE,
  NN_BUSBAR_WIDTH,
} from './IndustrialAesthetics';
import { ETAP_VOLTAGE_COLORS, DER_FEEDER_COLORS } from './sldEtapStyle';

export interface StationFieldRendererProps {
  chain: StationApparatusChainV1;
  colorSN?: string;
  colorNN?: string;
  showTechnicalLabels?: boolean;
}

const SYMBOL_SIZE = 28;
const LABEL_OFFSET_X = 28;
const JUNCTION_HALF_STEP = APPARATUS_CHAIN_STEP_Y / 2;
/** Width of station-internal SN busbar (rozdzielnica SN) [px]. */
const STATION_SN_BUSBAR_WIDTH = 80;

function mapSymbolType(symbolType: string): EtapSymbolId {
  const mapping: Record<string, EtapSymbolId> = {
    disconnector: 'disconnector',
    circuit_breaker: 'circuit_breaker',
    ct: 'ct',
    transformer_2w: 'transformer_2w',
    load: 'load',
    pv: 'pv',
    bess: 'bess',
    generator: 'generator',
    relay: 'relay',
    ground: 'ground',
  };
  return mapping[symbolType] ?? 'disconnector';
}

function derFeederColor(feederType: string, fallback: string): string {
  if (feederType === 'generator_pv') return DER_FEEDER_COLORS.pv;
  if (feederType === 'generator_bess') return DER_FEEDER_COLORS.bess;
  if (feederType === 'generator_wind') return DER_FEEDER_COLORS.wind;
  if (feederType === 'load') return DER_FEEDER_COLORS.load;
  return fallback;
}

function formatParams(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
}

const STATION_TYPE_LABELS: Record<string, string> = {
  TYPE_A: 'Stacja końcowa',
  TYPE_B: 'Stacja przelotowa',
  TYPE_C: 'Stacja odgałęźna',
  TYPE_D: 'Stacja pierścieniowa',
};

export const StationFieldRenderer: React.FC<StationFieldRendererProps> = ({
  chain,
  colorSN = ETAP_VOLTAGE_COLORS.SN,
  colorNN = ETAP_VOLTAGE_COLORS.nN,
  showTechnicalLabels = false,
}) => {
  const baseX = chain.apparatus[0]?.position.x ?? 0;
  const baseY = chain.apparatus[0]?.position.y ?? 0;
  const apparatusCount = chain.apparatus.length;
  const stationHeight = 160 + Math.max(apparatusCount - 3, 0) * APPARATUS_CHAIN_STEP_Y;
  const stationWidth = 320;
  const stationTypeLabel = STATION_TYPE_LABELS[chain.stationType] ?? chain.stationType;

  return (
    <g data-sld-role="station-field" data-station-id={chain.stationId} data-station-type={chain.stationType}>
      {/* Station bounding box — ABB clean outline */}
      <rect
        x={baseX - stationWidth / 2}
        y={baseY - 48}
        width={stationWidth}
        height={stationHeight}
        rx={6}
        ry={6}
        fill="rgba(248, 250, 252, 0.88)"
        stroke="#94A3B8"
        strokeWidth={1.2}
      />

      {/* Rozdzielnica SN section outline */}
      <rect
        x={baseX - stationWidth / 2 + 10}
        y={baseY - 16}
        width={stationWidth - 20}
        height={Math.max(apparatusCount * APPARATUS_CHAIN_STEP_Y + 16, 100)}
        rx={4}
        ry={4}
        fill="rgba(255, 255, 255, 0.4)"
        stroke="#94A3B8"
        strokeWidth={0.7}
        strokeDasharray="4 2"
        data-sld-role="station-sn-section"
      />

      {/* Station title — compact ABB style */}
      <text x={baseX} y={baseY - 30} textAnchor="middle" className="sld-label-station-title">
        {chain.stationId}
      </text>
      <text x={baseX} y={baseY - 18} textAnchor="middle" className="sld-label-params">
        {stationTypeLabel}
      </text>

      {/* ═══ Szyna SN rozdzielnicy — station-internal SN busbar ═══
           ELEKTROENERGETYKA: Każda stacja SN/nN ma rozdzielnicę SN
           z własną szyną SN. Ta szyna jest podłączona do magistrali
           przez kabel odgałęźny. Aparaty łączą się DO tej szyny. */}
      <g data-sld-role="station-sn-busbar">
        <line
          x1={baseX - STATION_SN_BUSBAR_WIDTH / 2}
          y1={baseY - JUNCTION_HALF_STEP}
          x2={baseX + STATION_SN_BUSBAR_WIDTH / 2}
          y2={baseY - JUNCTION_HALF_STEP}
          stroke={colorSN}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <JunctionDot x={baseX} y={baseY - JUNCTION_HALF_STEP} color={colorSN} />
        <text
          x={baseX + STATION_SN_BUSBAR_WIDTH / 2 + 8}
          y={baseY - JUNCTION_HALF_STEP + 4}
          className="sld-label-params"
        >
          SN
        </text>
      </g>

      {/* Apparatus chain — connected to station SN busbar */}
      {chain.apparatus.map((item, index) => {
        const itemY = baseY + index * APPARATUS_CHAIN_STEP_Y;
        const symbolId = mapSymbolType(item.symbolType);

        return (
          <g
            key={item.designation}
            data-sld-role="apparatus-item"
            data-designation={item.designation}
            transform={`translate(${baseX}, ${itemY})`}
          >
            {/* Apparatus bay — subtle ABB subdivision */}
            <rect
              x={-36}
              y={-JUNCTION_HALF_STEP + 3}
              width={180}
              height={APPARATUS_CHAIN_STEP_Y - 6}
              rx={2}
              ry={2}
              fill="rgba(255, 255, 255, 0.35)"
              stroke="#E2E8F0"
              strokeWidth={0.6}
            />

            <JunctionDot x={0} y={-JUNCTION_HALF_STEP} color={colorSN} />

            {/* Vertical connection to previous apparatus */}
            {index > 0 && (
              <line
                x1={0}
                y1={-JUNCTION_HALF_STEP}
                x2={0}
                y2={-SYMBOL_SIZE / 2}
                stroke={colorSN}
                strokeWidth={STATION_INTERNAL_STROKE}
              />
            )}

            {/* ETAP symbol */}
            <g transform={`translate(${-SYMBOL_SIZE / 2}, ${-SYMBOL_SIZE / 2})`}>
              <EtapSymbol symbolId={symbolId} stroke={colorSN} size={SYMBOL_SIZE} />
            </g>

            {/* Vertical connection to next apparatus */}
            {index < apparatusCount - 1 && (
              <line
                x1={0}
                y1={SYMBOL_SIZE / 2}
                x2={0}
                y2={JUNCTION_HALF_STEP}
                stroke={colorSN}
                strokeWidth={STATION_INTERNAL_STROKE}
              />
            )}

            <JunctionDot x={0} y={JUNCTION_HALF_STEP} color={colorSN} />

            {/* Labels — right side, compact */}
            <text x={LABEL_OFFSET_X} y={-3} className="sld-label-iec-designation">
              {item.designation}
            </text>
            <text x={LABEL_OFFSET_X} y={10} className="sld-label-params">
              {item.label}
            </text>
            {showTechnicalLabels && (
              <text x={LABEL_OFFSET_X} y={21} className="sld-label-params" opacity={0.7}>
                {formatParams(item.parameters)}
              </text>
            )}
          </g>
        );
      })}

      {/* Protection relays — compact ABB relay bubbles */}
      {chain.protection.length > 0 && (
        <g data-sld-role="protection-relays">
          {chain.protection.map((relay, idx) => {
            const relayY =
              baseY +
              apparatusCount * APPARATUS_CHAIN_STEP_Y +
              idx * (APPARATUS_CHAIN_STEP_Y * 0.5);
            return (
              <g key={relay.designation} transform={`translate(${baseX - 32}, ${relayY})`}>
                <line x1={32} y1={0} x2={0} y2={0} stroke={colorSN} strokeWidth={STATION_INTERNAL_STROKE} />
                <rect
                  x={-24}
                  y={-8}
                  width={24}
                  height={16}
                  rx={2}
                  ry={2}
                  fill="none"
                  stroke={colorSN}
                  strokeWidth={STATION_INTERNAL_STROKE}
                />
                <text x={-12} y={3} textAnchor="middle" className="sld-abb-ansi-tag-text">
                  {relay.ansiCode}
                </text>
                <text x={36} y={-4} className="sld-label-iec-designation">
                  {relay.designation}
                </text>
                {showTechnicalLabels && (
                  <text x={36} y={8} className="sld-label-params" opacity={0.7}>
                    {relay.function} {relay.setting_Ir_A}A {relay.setting_t_s}s
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* nN Busbar section — ABB compact */}
      {chain.nnBusbar && (
        <g data-sld-role="nn-busbar">
          {(() => {
            const nnY =
              baseY +
              apparatusCount * APPARATUS_CHAIN_STEP_Y +
              chain.protection.length * (APPARATUS_CHAIN_STEP_Y * 0.5) +
              APPARATUS_CHAIN_STEP_Y;
            return (
              <>
                {/* nN section outline */}
                <rect
                  x={baseX - NN_BUSBAR_WIDTH / 2 - 12}
                  y={nnY - 18}
                  width={NN_BUSBAR_WIDTH + 24}
                  height={44}
                  rx={3}
                  ry={3}
                  fill="rgba(255, 255, 255, 0.4)"
                  stroke="#94A3B8"
                  strokeWidth={0.7}
                  strokeDasharray="4 2"
                  data-sld-role="station-nn-section"
                />
                <text
                  x={baseX - NN_BUSBAR_WIDTH / 2}
                  y={nnY - 6}
                  className="sld-label-params"
                  opacity={0.7}
                >
                  nN
                </text>

                {/* Vertical connection to nN */}
                <line
                  x1={baseX}
                  y1={nnY - APPARATUS_CHAIN_STEP_Y}
                  x2={baseX}
                  y2={nnY}
                  stroke={colorNN}
                  strokeWidth={STATION_INTERNAL_STROKE}
                />
                {/* Horizontal nN busbar — ALWAYS horizontal */}
                <line
                  x1={baseX - NN_BUSBAR_WIDTH / 2}
                  y1={nnY}
                  x2={baseX + NN_BUSBAR_WIDTH / 2}
                  y2={nnY}
                  stroke={colorNN}
                  strokeWidth={4}
                  strokeLinecap="round"
                />

                {/* nN feeders */}
                {chain.nnBusbar.feeders.map((feeder, fIdx) => {
                  const feederCount = chain.nnBusbar.feeders.length;
                  const feederSpacing = NN_BUSBAR_WIDTH / (feederCount + 1);
                  const feederX = baseX - NN_BUSBAR_WIDTH / 2 + (fIdx + 1) * feederSpacing;
                  const fColor = derFeederColor(feeder.type, colorNN);
                  return (
                    <g key={feeder.designation} data-sld-role="nn-feeder" data-feeder-type={feeder.type}>
                      <JunctionDot x={feederX} y={nnY} color={colorNN} />
                      <line
                        x1={feederX}
                        y1={nnY}
                        x2={feederX}
                        y2={nnY + APPARATUS_CHAIN_STEP_Y}
                        stroke={fColor}
                        strokeWidth={STATION_INTERNAL_STROKE}
                      />
                      {feeder.type === 'load' && (
                        <g transform={`translate(${feederX - SYMBOL_SIZE / 4}, ${nnY + APPARATUS_CHAIN_STEP_Y - 4})`}>
                          <polygon
                            points={`${SYMBOL_SIZE / 4},0 0,${SYMBOL_SIZE / 2} ${SYMBOL_SIZE / 2},${SYMBOL_SIZE / 2}`}
                            fill="none"
                            stroke={fColor}
                            strokeWidth={STATION_INTERNAL_STROKE}
                          />
                        </g>
                      )}
                      {feeder.type === 'generator_pv' && (
                        <g transform={`translate(${feederX - SYMBOL_SIZE / 4}, ${nnY + APPARATUS_CHAIN_STEP_Y})`}>
                          {/* PV panel — grid icon */}
                          <rect
                            x={0}
                            y={0}
                            width={SYMBOL_SIZE / 2}
                            height={SYMBOL_SIZE / 2 - 4}
                            fill="none"
                            stroke={fColor}
                            strokeWidth={STATION_INTERNAL_STROKE}
                          />
                          <line x1={SYMBOL_SIZE / 4} y1={0} x2={SYMBOL_SIZE / 4} y2={SYMBOL_SIZE / 2 - 4} stroke={fColor} strokeWidth={1} />
                          <line x1={0} y1={(SYMBOL_SIZE / 2 - 4) / 2} x2={SYMBOL_SIZE / 2} y2={(SYMBOL_SIZE / 2 - 4) / 2} stroke={fColor} strokeWidth={1} />
                        </g>
                      )}
                      {feeder.type === 'generator_bess' && (
                        <g transform={`translate(${feederX - SYMBOL_SIZE / 4}, ${nnY + APPARATUS_CHAIN_STEP_Y})`}>
                          {/* BESS — battery icon */}
                          <rect
                            x={0}
                            y={2}
                            width={SYMBOL_SIZE / 2}
                            height={SYMBOL_SIZE / 2 - 4}
                            fill="none"
                            stroke={fColor}
                            strokeWidth={STATION_INTERNAL_STROKE}
                          />
                          <rect
                            x={SYMBOL_SIZE / 8}
                            y={0}
                            width={SYMBOL_SIZE / 4}
                            height={2}
                            fill={fColor}
                            stroke="none"
                          />
                          <text
                            x={SYMBOL_SIZE / 4}
                            y={SYMBOL_SIZE / 4 + 1}
                            textAnchor="middle"
                            fontSize={8}
                            fontWeight={700}
                            fill={fColor}
                          >
                            B
                          </text>
                        </g>
                      )}
                      <text
                        x={feederX}
                        y={nnY + APPARATUS_CHAIN_STEP_Y + SYMBOL_SIZE / 2 + 12}
                        textAnchor="middle"
                        className="sld-label-params"
                        fill={fColor}
                      >
                        {feeder.designation} {feeder.power_kW}kW
                      </text>
                    </g>
                  );
                })}

                <text
                  x={baseX + NN_BUSBAR_WIDTH / 2 + 8}
                  y={nnY + 4}
                  className="sld-label-params"
                >
                  {chain.nnBusbar.voltageKV}kV
                </text>
              </>
            );
          })()}
        </g>
      )}
    </g>
  );
};
