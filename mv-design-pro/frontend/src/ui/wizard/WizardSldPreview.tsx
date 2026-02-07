/**
 * WizardSldPreview — Podgląd SLD w kreatorze sieci
 *
 * Konwertuje EnergyNetworkModel → symbole SLD → topological layout → SVG.
 * Deterministyczny: ten sam ENM → identyczny schemat.
 *
 * BINDING: Etykiety PL, bez nazw kodowych.
 */

import { useMemo } from 'react';
import type {
  EnergyNetworkModel,
} from '../../types/enm';
import type { AnySldSymbol, BusSymbol, BranchSymbol, SourceSymbol, LoadSymbol, Position } from '../sld-editor/types';
import { computeTopologicalLayout } from '../sld-editor/utils/topological-layout';
import { ETAP_STROKE, ETAP_VOLTAGE_COLORS } from '../sld/sldEtapStyle';

// ---------------------------------------------------------------------------
// ENM → SLD symbol conversion
// ---------------------------------------------------------------------------

function enmToSldSymbols(enm: EnergyNetworkModel): AnySldSymbol[] {
  const symbols: AnySldSymbol[] = [];
  const busRefToId = new Map<string, string>();

  // Buses → BusSymbol
  for (const bus of enm.buses) {
    const id = `sym_bus_${bus.ref_id}`;
    busRefToId.set(bus.ref_id, id);
    symbols.push({
      id,
      elementId: bus.ref_id,
      elementType: 'Bus',
      elementName: bus.name,
      position: { x: 0, y: 0 },
      inService: true,
      width: 200,
      height: 8,
    } as BusSymbol);
  }

  // Sources → SourceSymbol
  for (const src of enm.sources) {
    const busSymId = busRefToId.get(src.bus_ref) ?? '';
    symbols.push({
      id: `sym_src_${src.ref_id}`,
      elementId: src.ref_id,
      elementType: 'Source',
      elementName: src.name,
      position: { x: 0, y: 0 },
      inService: true,
      connectedToNodeId: busSymId,
    } as SourceSymbol);
  }

  // Transformers → BranchSymbol (TransformerBranch)
  for (const tr of enm.transformers) {
    const hvId = busRefToId.get(tr.hv_bus_ref) ?? '';
    const lvId = busRefToId.get(tr.lv_bus_ref) ?? '';
    symbols.push({
      id: `sym_tr_${tr.ref_id}`,
      elementId: tr.ref_id,
      elementType: 'TransformerBranch',
      elementName: tr.name,
      position: { x: 0, y: 0 },
      inService: true,
      fromNodeId: hvId,
      toNodeId: lvId,
      points: [],
    } as BranchSymbol);
  }

  // Branches (lines/cables) → BranchSymbol (LineBranch)
  for (const br of enm.branches) {
    const fromId = busRefToId.get(br.from_bus_ref) ?? '';
    const toId = busRefToId.get(br.to_bus_ref) ?? '';
    symbols.push({
      id: `sym_br_${br.ref_id}`,
      elementId: br.ref_id,
      elementType: 'LineBranch',
      elementName: br.name,
      position: { x: 0, y: 0 },
      inService: br.status === 'closed',
      fromNodeId: fromId,
      toNodeId: toId,
      points: [],
      branchType: br.type === 'cable' ? 'CABLE' : 'LINE',
    } as BranchSymbol);
  }

  // Loads → LoadSymbol
  for (const ld of enm.loads) {
    const busSymId = busRefToId.get(ld.bus_ref) ?? '';
    symbols.push({
      id: `sym_ld_${ld.ref_id}`,
      elementId: ld.ref_id,
      elementType: 'Load',
      elementName: ld.name,
      position: { x: 0, y: 0 },
      inService: true,
      connectedToNodeId: busSymId,
    } as LoadSymbol);
  }

  // Generators → SourceSymbol
  for (const gen of enm.generators) {
    const busSymId = busRefToId.get(gen.bus_ref) ?? '';
    symbols.push({
      id: `sym_gen_${gen.ref_id}`,
      elementId: gen.ref_id,
      elementType: 'Source',
      elementName: gen.name,
      position: { x: 0, y: 0 },
      inService: true,
      connectedToNodeId: busSymId,
    } as SourceSymbol);
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// SVG rendering helpers
// ---------------------------------------------------------------------------

function getVoltageColor(voltageKv?: number): string {
  if (!voltageKv) return ETAP_VOLTAGE_COLORS.default;
  if (voltageKv >= 110) return ETAP_VOLTAGE_COLORS.WN;
  if (voltageKv >= 6) return ETAP_VOLTAGE_COLORS.SN;
  return ETAP_VOLTAGE_COLORS.nN;
}

interface SymbolSvgProps {
  symbol: AnySldSymbol;
  position: Position;
  enm: EnergyNetworkModel;
}

function SymbolSvg({ symbol, position, enm }: SymbolSvgProps) {
  const x = position.x;
  const y = position.y;

  if (symbol.elementType === 'Bus') {
    const bus = enm.buses.find(b => b.ref_id === symbol.elementId);
    const color = getVoltageColor(bus?.voltage_kv);
    const w = (symbol as BusSymbol).width || 200;
    return (
      <g>
        <line
          x1={x - w / 2} y1={y}
          x2={x + w / 2} y2={y}
          stroke={color}
          strokeWidth={ETAP_STROKE.busbar}
          strokeLinecap="round"
        />
        <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
          {symbol.elementName}
        </text>
      </g>
    );
  }

  if (symbol.elementType === 'Source') {
    return (
      <g>
        <circle cx={x} cy={y} r={14} fill="none" stroke={ETAP_VOLTAGE_COLORS.WN}
          strokeWidth={ETAP_STROKE.symbol} />
        <line x1={x - 6} y1={y - 6} x2={x + 6} y2={y + 6}
          stroke={ETAP_VOLTAGE_COLORS.WN} strokeWidth={1.5} />
        <line x1={x - 6} y1={y + 6} x2={x + 6} y2={y - 6}
          stroke={ETAP_VOLTAGE_COLORS.WN} strokeWidth={1.5} />
        <text x={x} y={y - 20} textAnchor="middle" fontSize="10" fill="#374151">
          {symbol.elementName}
        </text>
      </g>
    );
  }

  if (symbol.elementType === 'TransformerBranch') {
    return (
      <g>
        <circle cx={x} cy={y - 8} r={12} fill="none" stroke={ETAP_VOLTAGE_COLORS.SN}
          strokeWidth={ETAP_STROKE.symbol} />
        <circle cx={x} cy={y + 8} r={12} fill="none" stroke={ETAP_VOLTAGE_COLORS.nN}
          strokeWidth={ETAP_STROKE.symbol} />
        <text x={x + 20} y={y + 4} fontSize="10" fill="#374151">
          {symbol.elementName}
        </text>
      </g>
    );
  }

  if (symbol.elementType === 'LineBranch') {
    const br = symbol as BranchSymbol;
    const isDashed = br.branchType === 'CABLE';
    return (
      <g>
        <line x1={x - 10} y1={y - 15} x2={x + 10} y2={y + 15}
          stroke={ETAP_VOLTAGE_COLORS.SN}
          strokeWidth={ETAP_STROKE.feeder}
          strokeDasharray={isDashed ? '6,3' : undefined} />
        <text x={x + 16} y={y + 4} fontSize="9" fill="#6b7280">
          {symbol.elementName}
        </text>
      </g>
    );
  }

  if (symbol.elementType === 'Load') {
    return (
      <g>
        <polygon points={`${x},${y - 12} ${x - 10},${y + 8} ${x + 10},${y + 8}`}
          fill="none" stroke="#374151" strokeWidth={ETAP_STROKE.symbol} />
        <text x={x} y={y + 24} textAnchor="middle" fontSize="9" fill="#6b7280">
          {symbol.elementName}
        </text>
      </g>
    );
  }

  // Default fallback
  return (
    <g>
      <rect x={x - 15} y={y - 15} width={30} height={30}
        fill="none" stroke="#9ca3af" strokeWidth={1} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill="#6b7280">
        {symbol.elementName}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Connection rendering
// ---------------------------------------------------------------------------

interface ConnectionLineProps {
  from: Position;
  to: Position;
}

function ConnectionLine({ from, to }: ConnectionLineProps) {
  // Orthogonal routing: vertical → horizontal → vertical
  const midY = (from.y + to.y) / 2;
  const path = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
  return (
    <path d={path} fill="none" stroke="#9ca3af" strokeWidth={ETAP_STROKE.feeder} />
  );
}

// ---------------------------------------------------------------------------
// Main preview component
// ---------------------------------------------------------------------------

interface WizardSldPreviewProps {
  enm: EnergyNetworkModel;
}

export function WizardSldPreview({ enm }: WizardSldPreviewProps) {
  const symbols = useMemo(() => enmToSldSymbols(enm), [enm]);

  const layoutResult = useMemo(() => {
    if (symbols.length === 0) return null;
    return computeTopologicalLayout(symbols);
  }, [symbols]);

  const positions = layoutResult?.positions ?? new Map<string, Position>();

  // Compute canvas bounds from positions
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pos of positions.values()) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    }
    if (!isFinite(minX)) return { x: 0, y: 0, w: 400, h: 300 };
    const pad = 60;
    return {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
  }, [positions]);

  // Build connections from symbol relationships
  const connections = useMemo(() => {
    const conns: { from: Position; to: Position }[] = [];
    for (const sym of symbols) {
      const symPos = positions.get(sym.id);
      if (!symPos) continue;

      if (sym.elementType === 'Source' || sym.elementType === 'Load') {
        const targetId = (sym as SourceSymbol | LoadSymbol).connectedToNodeId;
        const targetPos = positions.get(targetId);
        if (targetPos) {
          conns.push({ from: symPos, to: targetPos });
        }
      }

      if (sym.elementType === 'LineBranch' || sym.elementType === 'TransformerBranch') {
        const branch = sym as BranchSymbol;
        const fromPos = positions.get(branch.fromNodeId);
        const toPos = positions.get(branch.toNodeId);
        if (fromPos) conns.push({ from: symPos, to: fromPos });
        if (toPos) conns.push({ from: symPos, to: toPos });
      }
    }
    return conns;
  }, [symbols, positions]);

  if (symbols.length === 0) {
    return (
      <div style={{ padding: '24px', border: '2px dashed #d1d5db', borderRadius: '8px',
        textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '14px', marginBottom: '8px' }}>Brak elementów do wyświetlenia</div>
        <div style={{ fontSize: '12px' }}>Dodaj szyny, źródła i gałęzie w poprzednich krokach</div>
      </div>
    );
  }

  return (
    <div data-testid="wizard-sld-preview" style={{ border: '1px solid #e5e7eb', borderRadius: '8px',
      background: '#fafafa', overflow: 'auto' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb',
        fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>Schemat jednokreskowy (podgląd)</span>
        <span>{symbols.length} elementów | {layoutResult?.diagnostics.layoutTimeMs?.toFixed(1) ?? '–'} ms</span>
      </div>
      <svg
        data-testid="wizard-sld-svg"
        width="100%"
        height={Math.max(300, bounds.h)}
        viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
        style={{ display: 'block' }}
      >
        {/* Grid */}
        <defs>
          <pattern id="wizard-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h}
          fill="url(#wizard-grid)" />

        {/* Connections */}
        {connections.map((conn, i) => (
          <ConnectionLine key={`conn-${i}`} from={conn.from} to={conn.to} />
        ))}

        {/* Symbols */}
        {symbols.map(sym => {
          const pos = positions.get(sym.id);
          if (!pos) return null;
          return <SymbolSvg key={sym.id} symbol={sym} position={pos} enm={enm} />;
        })}
      </svg>
    </div>
  );
}
