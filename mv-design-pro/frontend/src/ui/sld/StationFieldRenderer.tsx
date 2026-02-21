/**
 * StationFieldRenderer — Renderer lancucha aparatow stacyjnych
 *
 * Renderuje pionowy lancuch aparatow ze junction dots miedzy kazdym:
 * QS (rozlacznik) -> Q (wylacznik) -> CT (przekladnik) -> T (transformator) -> BUS NN -> feeders
 *
 * Dla stacji OZE: dodatkowe zabezpieczenia (51, 51N, 67) miedzy CB a TR.
 *
 * CANONICAL: IEC 61082, IEC 81346 designations
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
import { ETAP_VOLTAGE_COLORS } from './sldEtapStyle';

export interface StationFieldRendererProps {
  chain: StationApparatusChainV1;
  colorSN?: string;
  colorNN?: string;
}

const SYMBOL_SIZE = 30;
const LABEL_OFFSET_X = 30;
const JUNCTION_HALF_STEP = APPARATUS_CHAIN_STEP_Y / 2;

/**
 * Map symbolType string to EtapSymbolId.
 */
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

/**
 * Format parameters for display.
 */
function formatParams(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
}

export const StationFieldRenderer: React.FC<StationFieldRendererProps> = ({
  chain,
  colorSN = ETAP_VOLTAGE_COLORS.SN,
  colorNN = ETAP_VOLTAGE_COLORS.nN,
}) => {
  const baseX = chain.apparatus[0]?.position.x ?? 0;
  const baseY = chain.apparatus[0]?.position.y ?? 0;

  return (
    <g
      data-sld-role="station-field"
      data-station-id={chain.stationId}
      data-station-type={chain.stationType}
    >
      {/* Station title */}
      <text
        x={baseX}
        y={baseY - 20}
        textAnchor="middle"
        className="sld-station-title"
      >
        {chain.stationId}
      </text>

      {/* Apparatus chain */}
      {chain.apparatus.map((item, index) => {
        const itemY = baseY + index * APPARATUS_CHAIN_STEP_Y;
        const symbolId = mapSymbolType(item.symbolType);
        const isTransformer = item.symbolType === 'transformer_2w';
        const itemColor = isTransformer ? colorSN : colorSN;

        return (
          <g
            key={item.designation}
            data-sld-role="apparatus-item"
            data-designation={item.designation}
            transform={`translate(${baseX}, ${itemY})`}
          >
            {/* Junction dot at input */}
            <JunctionDot x={0} y={-JUNCTION_HALF_STEP} color={itemColor} />

            {/* Vertical connection line from previous */}
            {index > 0 && (
              <line
                x1={0}
                y1={-JUNCTION_HALF_STEP}
                x2={0}
                y2={-SYMBOL_SIZE / 2}
                stroke={itemColor}
                strokeWidth={STATION_INTERNAL_STROKE}
              />
            )}

            {/* Symbol */}
            <g transform={`translate(${-SYMBOL_SIZE / 2}, ${-SYMBOL_SIZE / 2})`}>
              <EtapSymbol
                symbolId={symbolId}
                stroke={itemColor}
                size={SYMBOL_SIZE}
              />
            </g>

            {/* Vertical connection line to next */}
            {index < chain.apparatus.length - 1 && (
              <line
                x1={0}
                y1={SYMBOL_SIZE / 2}
                x2={0}
                y2={JUNCTION_HALF_STEP}
                stroke={itemColor}
                strokeWidth={STATION_INTERNAL_STROKE}
              />
            )}

            {/* Junction dot at output */}
            <JunctionDot x={0} y={JUNCTION_HALF_STEP} color={itemColor} />

            {/* IEC designation label */}
            <text
              x={LABEL_OFFSET_X}
              y={-4}
              className="sld-iec-designation"
            >
              {item.designation}
            </text>

            {/* Apparatus label and parameters */}
            <text
              x={LABEL_OFFSET_X}
              y={10}
              className="sld-apparatus-label"
            >
              {item.label}
            </text>
            <text
              x={LABEL_OFFSET_X}
              y={22}
              className="sld-apparatus-params"
            >
              {formatParams(item.parameters)}
            </text>
          </g>
        );
      })}

      {/* Protection relays (for OZE stations) */}
      {chain.protection.length > 0 && (
        <g data-sld-role="protection-relays">
          {chain.protection.map((relay, idx) => {
            const relayY =
              baseY +
              chain.apparatus.length * APPARATUS_CHAIN_STEP_Y +
              idx * (APPARATUS_CHAIN_STEP_Y * 0.6);
            return (
              <g
                key={relay.designation}
                transform={`translate(${baseX - 40}, ${relayY})`}
              >
                <line
                  x1={40}
                  y1={0}
                  x2={0}
                  y2={0}
                  stroke={colorSN}
                  strokeWidth={STATION_INTERNAL_STROKE}
                />
                <rect
                  x={-30}
                  y={-10}
                  width={30}
                  height={20}
                  fill="none"
                  stroke={colorSN}
                  strokeWidth={STATION_INTERNAL_STROKE}
                />
                <text x={-15} y={4} textAnchor="middle" className="sld-apparatus-label">
                  {relay.ansiCode}
                </text>
                <text x={35} y={-8} className="sld-iec-designation">
                  {relay.designation}
                </text>
                <text x={35} y={8} className="sld-apparatus-params">
                  {relay.function} Ir={relay.setting_Ir_A}A t={relay.setting_t_s}s
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* NN Busbar */}
      {chain.nnBusbar && (
        <g data-sld-role="nn-busbar">
          {(() => {
            const nnY =
              baseY +
              chain.apparatus.length * APPARATUS_CHAIN_STEP_Y +
              chain.protection.length * (APPARATUS_CHAIN_STEP_Y * 0.6) +
              APPARATUS_CHAIN_STEP_Y;
            return (
              <>
                {/* Vertical connection from last apparatus */}
                <line
                  x1={baseX}
                  y1={nnY - APPARATUS_CHAIN_STEP_Y}
                  x2={baseX}
                  y2={nnY}
                  stroke={colorNN}
                  strokeWidth={STATION_INTERNAL_STROKE}
                />
                {/* NN Busbar */}
                <line
                  x1={baseX - NN_BUSBAR_WIDTH / 2}
                  y1={nnY}
                  x2={baseX + NN_BUSBAR_WIDTH / 2}
                  y2={nnY}
                  stroke={colorNN}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
                {/* Junction dots on busbar */}
                {chain.nnBusbar.feeders.map((feeder, fIdx) => {
                  const feederCount = chain.nnBusbar.feeders.length;
                  const feederSpacing = NN_BUSBAR_WIDTH / (feederCount + 1);
                  const feederX = baseX - NN_BUSBAR_WIDTH / 2 + (fIdx + 1) * feederSpacing;
                  return (
                    <g key={feeder.designation} data-sld-role="nn-feeder">
                      <JunctionDot x={feederX} y={nnY} color={colorNN} />
                      {/* Vertical line down from busbar */}
                      <line
                        x1={feederX}
                        y1={nnY}
                        x2={feederX}
                        y2={nnY + APPARATUS_CHAIN_STEP_Y}
                        stroke={colorNN}
                        strokeWidth={STATION_INTERNAL_STROKE}
                      />
                      {/* Feeder symbol */}
                      {feeder.type === 'load' && (
                        <g transform={`translate(${feederX - SYMBOL_SIZE / 4}, ${nnY + APPARATUS_CHAIN_STEP_Y - 5})`}>
                          <polygon
                            points={`${SYMBOL_SIZE / 4},0 0,${SYMBOL_SIZE / 2} ${SYMBOL_SIZE / 2},${SYMBOL_SIZE / 2}`}
                            fill="none"
                            stroke={colorNN}
                            strokeWidth={STATION_INTERNAL_STROKE}
                          />
                        </g>
                      )}
                      {(feeder.type === 'generator_pv' || feeder.type === 'generator_bess') && (
                        <g transform={`translate(${feederX - SYMBOL_SIZE / 4}, ${nnY + APPARATUS_CHAIN_STEP_Y})`}>
                          <circle
                            cx={SYMBOL_SIZE / 4}
                            cy={SYMBOL_SIZE / 4}
                            r={SYMBOL_SIZE / 4}
                            fill="none"
                            stroke={colorNN}
                            strokeWidth={STATION_INTERNAL_STROKE}
                          />
                          <text
                            x={SYMBOL_SIZE / 4}
                            y={SYMBOL_SIZE / 4 + 3}
                            textAnchor="middle"
                            fontSize={8}
                            fill={colorNN}
                          >
                            {feeder.type === 'generator_pv' ? 'PV' : 'B'}
                          </text>
                        </g>
                      )}
                      {/* Feeder label */}
                      <text
                        x={feederX}
                        y={nnY + APPARATUS_CHAIN_STEP_Y + SYMBOL_SIZE / 2 + 14}
                        textAnchor="middle"
                        className="sld-apparatus-params"
                      >
                        {feeder.designation} {feeder.power_kW}kW
                      </text>
                    </g>
                  );
                })}
                {/* NN voltage label */}
                <text
                  x={baseX + NN_BUSBAR_WIDTH / 2 + 8}
                  y={nnY + 4}
                  className="sld-apparatus-label"
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
