/**
 * StationFieldRenderer — Renderer lancucha aparatow stacyjnych
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
  showTechnicalLabels?: boolean;
}

const SYMBOL_SIZE = 30;
const LABEL_OFFSET_X = 34;
const JUNCTION_HALF_STEP = APPARATUS_CHAIN_STEP_Y / 2;

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

function formatParams(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
}

export const StationFieldRenderer: React.FC<StationFieldRendererProps> = ({
  chain,
  colorSN = ETAP_VOLTAGE_COLORS.SN,
  colorNN = ETAP_VOLTAGE_COLORS.nN,
  showTechnicalLabels = false,
}) => {
  const baseX = chain.apparatus[0]?.position.x ?? 0;
  const baseY = chain.apparatus[0]?.position.y ?? 0;
  const stationHeight = 276 + Math.max(chain.apparatus.length - 4, 0) * APPARATUS_CHAIN_STEP_Y;
  const stationWidth = 520;
  const stationTypeLabel = {
    TYPE_A: 'Typ A — stacja końcowa',
    TYPE_B: 'Typ B — stacja przelotowa',
    TYPE_C: 'Typ C — stacja odgałęźna',
    TYPE_D: 'Typ D — stacja pierścieniowa',
  }[chain.stationType];

  return (
    <g data-sld-role="station-field" data-station-id={chain.stationId} data-station-type={chain.stationType}>
      <rect
        x={baseX - stationWidth / 2}
        y={baseY - 76}
        width={stationWidth}
        height={stationHeight}
        className="sld-station-bbox"
        rx={8}
        ry={8}
      />

      <rect
        x={baseX - stationWidth / 2 + 14}
        y={baseY - 24}
        width={stationWidth - 28}
        height={Math.max(chain.apparatus.length * APPARATUS_CHAIN_STEP_Y + 36, 138)}
        className="sld-abb-switchgear-envelope"
        rx={4}
        ry={4}
        data-sld-role="station-sn-section"
      />

      <text x={baseX} y={baseY - 52} textAnchor="middle" className="sld-info-primary sld-station-title">
        {chain.stationId}
      </text>
      <text x={baseX} y={baseY - 34} textAnchor="middle" className="sld-info-secondary sld-apparatus-label">
        {stationTypeLabel}
      </text>
      <text x={baseX - stationWidth / 2 + 20} y={baseY - 36} className="sld-info-secondary sld-abb-zone-label">
        Sekcja SN
      </text>
      <text x={baseX + stationWidth / 2 - 130} y={baseY - 36} className="sld-info-secondary sld-abb-zone-label">
        Transformacja SN/nN
      </text>
      {showTechnicalLabels && (
        <text x={baseX - stationWidth / 2 + 12} y={baseY - 10} className="sld-info-tertiary sld-apparatus-params">
          Układ funkcjonalny: pole SN → transformator → szyna nN → odejścia
        </text>
      )}

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
            <rect
              x={-52}
              y={-JUNCTION_HALF_STEP + 4}
              width={272}
              height={APPARATUS_CHAIN_STEP_Y - 8}
              className="sld-abb-bay"
              rx={3}
              ry={3}
            />

            <JunctionDot x={0} y={-JUNCTION_HALF_STEP} color={colorSN} />

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

            <g transform={`translate(${-SYMBOL_SIZE / 2}, ${-SYMBOL_SIZE / 2})`}>
              <EtapSymbol symbolId={symbolId} stroke={colorSN} size={SYMBOL_SIZE} />
            </g>

            {index < chain.apparatus.length - 1 && (
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

            <text x={LABEL_OFFSET_X} y={-5} className="sld-info-primary sld-iec-designation">
              {item.designation}
            </text>
            <text x={LABEL_OFFSET_X} y={10} className="sld-info-secondary sld-apparatus-label">
              {item.label}
            </text>
            {showTechnicalLabels && (
              <text x={LABEL_OFFSET_X} y={23} className="sld-info-tertiary sld-apparatus-params">
                {formatParams(item.parameters)}
              </text>
            )}
          </g>
        );
      })}

      {chain.protection.length > 0 && (
        <g data-sld-role="protection-relays">
          {chain.protection.map((relay, idx) => {
            const relayY =
              baseY +
              chain.apparatus.length * APPARATUS_CHAIN_STEP_Y +
              idx * (APPARATUS_CHAIN_STEP_Y * 0.6);
            return (
              <g key={relay.designation} transform={`translate(${baseX - 40}, ${relayY})`}>
                <line x1={40} y1={0} x2={0} y2={0} stroke={colorSN} strokeWidth={STATION_INTERNAL_STROKE} />
                <rect x={-30} y={-10} width={30} height={20} fill="none" stroke={colorSN} strokeWidth={STATION_INTERNAL_STROKE} />
                <text x={-15} y={4} textAnchor="middle" className="sld-info-secondary sld-apparatus-label">
                  {relay.ansiCode}
                </text>
                <text x={35} y={-8} className="sld-info-secondary sld-iec-designation">
                  {relay.designation}
                </text>
                {showTechnicalLabels && (
                  <text x={35} y={8} className="sld-info-tertiary sld-apparatus-params">
                    {relay.function} Ir={relay.setting_Ir_A}A t={relay.setting_t_s}s
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

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
                <rect
                  x={baseX - NN_BUSBAR_WIDTH / 2 - 20}
                  y={nnY - 24}
                  width={NN_BUSBAR_WIDTH + 40}
                  height={56}
                  className="sld-abb-switchgear-envelope"
                  rx={4}
                  ry={4}
                  data-sld-role="station-nn-section"
                />
                <text x={baseX - NN_BUSBAR_WIDTH / 2 + 4} y={nnY - 10} className="sld-info-secondary sld-abb-zone-label">
                  Sekcja nN
                </text>

                <line x1={baseX} y1={nnY - APPARATUS_CHAIN_STEP_Y} x2={baseX} y2={nnY} stroke={colorNN} strokeWidth={STATION_INTERNAL_STROKE} />
                <line
                  x1={baseX - NN_BUSBAR_WIDTH / 2}
                  y1={nnY}
                  x2={baseX + NN_BUSBAR_WIDTH / 2}
                  y2={nnY}
                  stroke={colorNN}
                  strokeWidth={5}
                  strokeLinecap="round"
                />

                {chain.nnBusbar.feeders.map((feeder, fIdx) => {
                  const feederCount = chain.nnBusbar.feeders.length;
                  const feederSpacing = NN_BUSBAR_WIDTH / (feederCount + 1);
                  const feederX = baseX - NN_BUSBAR_WIDTH / 2 + (fIdx + 1) * feederSpacing;
                  return (
                    <g key={feeder.designation} data-sld-role="nn-feeder">
                      <JunctionDot x={feederX} y={nnY} color={colorNN} />
                      <line
                        x1={feederX}
                        y1={nnY}
                        x2={feederX}
                        y2={nnY + APPARATUS_CHAIN_STEP_Y}
                        stroke={colorNN}
                        strokeWidth={STATION_INTERNAL_STROKE}
                      />
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
                          <text x={SYMBOL_SIZE / 4} y={SYMBOL_SIZE / 4 + 3} textAnchor="middle" fontSize={10} fill={colorNN}>
                            {feeder.type === 'generator_pv' ? 'PV' : 'B'}
                          </text>
                        </g>
                      )}
                      <text
                        x={feederX}
                        y={nnY + APPARATUS_CHAIN_STEP_Y + SYMBOL_SIZE / 2 + 14}
                        textAnchor="middle"
                        className="sld-info-secondary sld-apparatus-params"
                      >
                        {feeder.designation} {feeder.power_kW}kW
                      </text>
                    </g>
                  );
                })}

                <text x={baseX + NN_BUSBAR_WIDTH / 2 + 8} y={nnY + 4} className="sld-info-secondary sld-apparatus-label">
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
