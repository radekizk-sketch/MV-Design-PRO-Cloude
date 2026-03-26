/**
 * BaySvgRenderer — ETAP-grade SVG renderer for station bay visualization.
 *
 * CANONICAL CONTRACT (BINDING):
 * - Deterministic: same config → identical SVG output.
 * - Uses bayRenderer.ts computeBayLayout() for geometry calculation.
 * - Uses EtapSymbol for device rendering.
 * - All coordinates on GRID_BASE grid.
 * - No physics calculations.
 *
 * ARCHITECTURE:
 * - PRESENTATION LAYER: rendering only.
 * - Imports geometry from bayRenderer.ts (APPLICATION LAYER).
 * - Imports symbols from EtapSymbolRenderer.tsx.
 */

import React, { useMemo, useCallback } from 'react';
import type { StationConfig, FieldConfig, DeviceConfig } from './types';
import { FIELD_ROLE_LABELS_PL } from './types';
import type {
  StationBlockDetailV1,
  FieldV1,
  DeviceV1,
  BusSectionV1,
} from '../sld/core/fieldDeviceContracts';
import type { RectangleV1 } from '../sld/core/layoutResult';
import type { StationBayLayoutV1, BayGeometryV1 } from '../sld/core/bayRenderer';
import { computeBayLayout } from '../sld/core/bayRenderer';
import { EtapSymbol } from '../sld/EtapSymbolRenderer';
import {
  ETAP_VOLTAGE_COLORS,
  ETAP_STROKE,
  ETAP_TYPOGRAPHY,
} from '../sld/sldEtapStyle';

// =============================================================================
// GEOMETRY CONSTANTS
// =============================================================================

const BLOCK_PADDING = 20;
const BAY_MIN_WIDTH = 80;
const BUSBAR_EXTRA = 10;

// =============================================================================
// CONFIG → StationBlockDetailV1 ADAPTER
// =============================================================================

/**
 * Convert application-level StationConfig to domain-level StationBlockDetailV1.
 *
 * This adapter bridges the editable config model to the immutable layout contract.
 * Deterministic: sorted by ID, no randomness.
 */
function configToBlockDetail(config: StationConfig): StationBlockDetailV1 {
  const fields: FieldV1[] = config.fields.map((fc: FieldConfig) => ({
    id: fc.fieldId,
    stationId: config.stationId,
    busSectionId: fc.busSectionId,
    fieldRole: fc.fieldRole,
    terminals: {
      incomingNodeId: null,
      outgoingNodeId: null,
      branchNodeId: null,
      generatorNodeId: null,
    },
    requiredDevices: { fieldRole: fc.fieldRole, requirements: [] },
    deviceIds: fc.devices.map((d) => d.deviceId).sort(),
    catalogRef: null,
  }));

  const devices: DeviceV1[] = config.fields.flatMap((fc: FieldConfig) =>
    fc.devices.map((dc: DeviceConfig) => ({
      id: dc.deviceId,
      fieldId: fc.fieldId,
      deviceType: dc.deviceType,
      electricalRole: dc.electricalRole,
      powerPathPosition: dc.powerPathPosition,
      catalogRef: null,
      logicalBindings: { boundCbId: null, ctInputIds: [] },
      parameters: {
        ctRatio: null,
        breakingCapacityKa: null,
        ratedCurrentA: null,
        relaySettings: null,
        ratedPowerMva: null,
        ukPercent: null,
        vectorGroup: null,
      },
    })),
  );

  const busSections: BusSectionV1[] = Array.from(
    { length: config.busSectionCount },
    (_, i) => ({
      id: `bus-section-${i + 1}`,
      stationId: config.stationId,
      orderIndex: i,
      catalogRef: null,
    }),
  );

  const hasCoupler = config.embeddingRole === 'LOCAL_SECTIONAL';
  const couplerField = config.fields.find(
    (f) => f.fieldRole === 'COUPLER_SN' || f.fieldRole === 'BUS_TIE',
  );

  return {
    blockId: config.stationId,
    embeddingRole: config.embeddingRole,
    busSections: busSections.sort((a, b) => a.id.localeCompare(b.id)),
    fields: fields.sort((a, b) => a.id.localeCompare(b.id)),
    devices: devices.sort((a, b) => a.id.localeCompare(b.id)),
    ports: {
      trunkInPort: 'trunk-in',
      trunkOutPort: config.embeddingRole !== 'TRUNK_LEAF' ? 'trunk-out' : null,
      branchPort:
        config.embeddingRole === 'TRUNK_BRANCH' ? 'branch-port' : null,
    },
    couplerFieldId: hasCoupler ? (couplerField?.fieldId ?? null) : null,
    deviceAnchors: [],
    fixActions: [],
  };
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface BaySvgRendererProps {
  /** Station configuration to render. */
  config: StationConfig;
  /** Width of the SVG canvas. */
  width?: number;
  /** Height of the SVG canvas. */
  height?: number;
  /** Currently selected field ID. */
  selectedFieldId?: string | null;
  /** Currently selected device ID. */
  selectedDeviceId?: string | null;
  /** Callback when a field (bay) is clicked. */
  onFieldClick?: (fieldId: string) => void;
  /** Callback when a device is clicked. */
  onDeviceClick?: (deviceId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const BaySvgRenderer: React.FC<BaySvgRendererProps> = ({
  config,
  width = 800,
  height = 500,
  selectedFieldId = null,
  selectedDeviceId = null,
  onFieldClick,
  onDeviceClick,
}) => {
  // Compute layout using production bayRenderer
  const layout = useMemo((): StationBayLayoutV1 | null => {
    if (config.fields.length === 0) return null;

    const detail = configToBlockDetail(config);

    const fieldCount = Math.max(config.fields.length, 1);
    const blockWidth = Math.max(fieldCount * BAY_MIN_WIDTH + BLOCK_PADDING * 2, 300);
    const blockHeight = 300;
    const blockX = (width - blockWidth) / 2;
    const blockY = 60;

    const blockBounds: RectangleV1 = {
      x: blockX,
      y: blockY,
      width: blockWidth,
      height: blockHeight,
    };

    return computeBayLayout(detail, blockBounds);
  }, [config, width]);

  const handleFieldClick = useCallback(
    (fieldId: string) => {
      onFieldClick?.(fieldId);
    },
    [onFieldClick],
  );

  const handleDeviceClick = useCallback(
    (e: React.MouseEvent, deviceId: string) => {
      e.stopPropagation();
      onDeviceClick?.(deviceId);
    },
    [onDeviceClick],
  );

  if (!layout) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-slate-50 border border-slate-200 rounded"
      >
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="#64748B"
          fontSize={14}
        >
          Dodaj pola rozdzielcze, aby wyswietlic schemat stacji
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="bg-white border border-slate-200 rounded shadow-sm"
      data-testid="bay-svg-renderer"
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F1F5F9" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#grid-pattern)" />

      {/* Station title */}
      <text
        x={width / 2}
        y={30}
        textAnchor="middle"
        fill="#1E293B"
        fontSize={ETAP_TYPOGRAPHY.fontSize.large}
        fontWeight={ETAP_TYPOGRAPHY.fontWeight.bold}
        fontFamily="Inter, sans-serif"
      >
        {config.stationName}
      </text>
      <text
        x={width / 2}
        y={48}
        textAnchor="middle"
        fill="#64748B"
        fontSize={10}
        fontFamily="Inter, sans-serif"
      >
        {config.embeddingRole === 'TRUNK_LEAF' && 'Stacja koncowa'}
        {config.embeddingRole === 'TRUNK_INLINE' && 'Stacja przelotowa'}
        {config.embeddingRole === 'TRUNK_BRANCH' && 'Stacja odgalezieniowa'}
        {config.embeddingRole === 'LOCAL_SECTIONAL' && 'Stacja sekcyjna'}
      </text>

      {/* Busbar */}
      <line
        x1={layout.busbarGeometry.x1 - BUSBAR_EXTRA}
        y1={layout.busbarGeometry.y}
        x2={layout.busbarGeometry.x2 + BUSBAR_EXTRA}
        y2={layout.busbarGeometry.y}
        stroke={ETAP_VOLTAGE_COLORS.SN}
        strokeWidth={ETAP_STROKE.busbar}
        strokeLinecap="round"
      />

      {/* Bus section labels */}
      {layout.busbarGeometry.sections.map((sec) => (
        <text
          key={sec.sectionId}
          x={(sec.x1 + sec.x2) / 2}
          y={layout.busbarGeometry.y - 8}
          textAnchor="middle"
          fill={ETAP_VOLTAGE_COLORS.SN}
          fontSize={9}
          fontWeight="500"
          fontFamily="Inter, sans-serif"
        >
          {sec.sectionId}
        </text>
      ))}

      {/* Busbar end caps */}
      <circle
        cx={layout.busbarGeometry.x1 - BUSBAR_EXTRA}
        cy={layout.busbarGeometry.y}
        r={3}
        fill={ETAP_VOLTAGE_COLORS.SN}
      />
      <circle
        cx={layout.busbarGeometry.x2 + BUSBAR_EXTRA}
        cy={layout.busbarGeometry.y}
        r={3}
        fill={ETAP_VOLTAGE_COLORS.SN}
      />

      {/* Internal connections (vertical lines between power-path devices) */}
      {layout.internalConnections.map((conn, idx) => (
        <line
          key={`conn-${idx}`}
          x1={conn.from.x}
          y1={conn.from.y}
          x2={conn.to.x}
          y2={conn.to.y}
          stroke="#475569"
          strokeWidth={ETAP_STROKE.feeder}
          strokeLinecap="round"
        />
      ))}

      {/* Bays */}
      {layout.bays.map((bay: BayGeometryV1) => {
        const isSelected = bay.bayId === selectedFieldId;
        const fieldConfig = config.fields.find((f) => f.fieldId === bay.bayId);

        return (
          <g
            key={bay.bayId}
            data-testid={`bay-${bay.bayId}`}
            onClick={() => handleFieldClick(bay.bayId)}
            style={{ cursor: 'pointer' }}
          >
            {/* Bay highlight */}
            <rect
              x={bay.bounds.x}
              y={bay.bounds.y}
              width={bay.bounds.width}
              height={bay.bounds.height}
              fill={isSelected ? 'rgba(59, 130, 246, 0.06)' : 'transparent'}
              stroke={isSelected ? '#3B82F6' : 'transparent'}
              strokeWidth={isSelected ? 1.5 : 0}
              strokeDasharray={isSelected ? '4 2' : undefined}
              rx={2}
            />

            {/* Bay connection to busbar */}
            <line
              x1={(bay.bounds.x + bay.bounds.width / 2)}
              y1={bay.busbarY}
              x2={(bay.bounds.x + bay.bounds.width / 2)}
              y2={bay.busbarY + 10}
              stroke="#475569"
              strokeWidth={ETAP_STROKE.feeder}
            />

            {/* Junction dot at busbar */}
            <circle
              cx={bay.bounds.x + bay.bounds.width / 2}
              cy={bay.busbarY}
              r={3}
              fill={ETAP_VOLTAGE_COLORS.SN}
            />

            {/* Devices within bay */}
            {bay.devices.map((dev) => {
              const isDevSelected = dev.deviceId === selectedDeviceId;

              return (
                <g
                  key={dev.deviceId}
                  transform={`translate(${dev.position.x - dev.size.width / 2}, ${dev.position.y - dev.size.height / 2})`}
                  onClick={(e) => handleDeviceClick(e, dev.deviceId)}
                  data-testid={`device-${dev.deviceId}`}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Device selection highlight */}
                  {isDevSelected && (
                    <rect
                      x={-4}
                      y={-4}
                      width={dev.size.width + 8}
                      height={dev.size.height + 8}
                      fill="rgba(245, 158, 11, 0.12)"
                      stroke="#F59E0B"
                      strokeWidth={1.5}
                      rx={3}
                    />
                  )}

                  {/* Device symbol */}
                  <g transform={dev.rotation !== 0 ? `rotate(${dev.rotation}, ${dev.size.width / 2}, ${dev.size.height / 2})` : undefined}>
                    <EtapSymbol
                      symbolId={dev.symbolId}
                      size={Math.min(dev.size.width, dev.size.height)}
                      stroke={dev.isOnPowerPath ? '#1E293B' : '#94A3B8'}
                      strokeWidth={ETAP_STROKE.symbol}
                    />
                  </g>
                </g>
              );
            })}

            {/* Bay label (field role) */}
            <text
              x={bay.bounds.x + bay.bounds.width / 2}
              y={bay.bounds.y + bay.bounds.height + 14}
              textAnchor="middle"
              fill={isSelected ? '#1D4ED8' : '#475569'}
              fontSize={9}
              fontWeight={isSelected ? '600' : '400'}
              fontFamily="Inter, sans-serif"
            >
              {fieldConfig ? FIELD_ROLE_LABELS_PL[fieldConfig.fieldRole] : bay.bayId}
            </text>

            {/* Cable exit point marker */}
            <line
              x1={bay.cableExitPoint.x - 6}
              y1={bay.cableExitPoint.y}
              x2={bay.cableExitPoint.x + 6}
              y2={bay.cableExitPoint.y}
              stroke="#94A3B8"
              strokeWidth={1.5}
            />
          </g>
        );
      })}

      {/* Coupler geometry for LOCAL_SECTIONAL */}
      {layout.couplerGeometry && (
        <g data-testid="coupler-geometry">
          <EtapSymbol
            symbolId="circuit_breaker"
            size={layout.couplerGeometry.size.width}
            stroke={ETAP_VOLTAGE_COLORS.SN}
            strokeWidth={ETAP_STROKE.symbol}
          />
          <text
            x={layout.couplerGeometry.position.x}
            y={layout.couplerGeometry.position.y + layout.couplerGeometry.size.height + 12}
            textAnchor="middle"
            fill="#64748B"
            fontSize={8}
            fontFamily="Inter, sans-serif"
          >
            Sprzeglo
          </text>
        </g>
      )}

      {/* Trunk ports */}
      {layout.bays.map((bay) => (
        <React.Fragment key={`ports-${bay.bayId}`}>
          {bay.portIn && (
            <g>
              <line
                x1={bay.portIn.x}
                y1={bay.portIn.y - 15}
                x2={bay.portIn.x}
                y2={bay.portIn.y}
                stroke={ETAP_VOLTAGE_COLORS.SN}
                strokeWidth={ETAP_STROKE.feeder}
                markerEnd="url(#arrow-in)"
              />
              <polygon
                points={`${bay.portIn.x},${bay.portIn.y - 15} ${bay.portIn.x - 4},${bay.portIn.y - 22} ${bay.portIn.x + 4},${bay.portIn.y - 22}`}
                fill={ETAP_VOLTAGE_COLORS.SN}
              />
            </g>
          )}
          {bay.portOut && (
            <g>
              <line
                x1={bay.portOut.x}
                y1={bay.portOut.y}
                x2={bay.portOut.x}
                y2={bay.portOut.y + 15}
                stroke={ETAP_VOLTAGE_COLORS.SN}
                strokeWidth={ETAP_STROKE.feeder}
              />
              <polygon
                points={`${bay.portOut.x},${bay.portOut.y + 15} ${bay.portOut.x - 4},${bay.portOut.y + 22} ${bay.portOut.x + 4},${bay.portOut.y + 22}`}
                fill={ETAP_VOLTAGE_COLORS.SN}
              />
            </g>
          )}
        </React.Fragment>
      ))}

      {/* Legend */}
      <g transform={`translate(${width - 160}, ${height - 50})`}>
        <text x={0} y={0} fill="#94A3B8" fontSize={8} fontFamily="Inter, sans-serif">
          Pol: {config.fields.length} | Aparatow:{' '}
          {config.fields.reduce((acc, f) => acc + f.devices.length, 0)}
        </text>
      </g>
    </svg>
  );
};
