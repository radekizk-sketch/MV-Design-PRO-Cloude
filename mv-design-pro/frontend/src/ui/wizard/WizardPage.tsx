/**
 * WizardPage — Kreator budowy sieci SN/nN z ENM
 *
 * Kreator krok po kroku (K1-K10) prowadzący użytkownika
 * przez proces budowy kompletnej sieci średniego napięcia.
 * Proces zaczyna się od GPZ — punkt zasilania (K2) jest kluczowy.
 *
 * Każdy krok edytuje EnergyNetworkModel (ENM) — autosave via PUT.
 * Integracja: wizardStateMachine (gate logic) + WizardSldPreview (live SLD).
 *
 * BINDING: Etykiety po polsku, brak kodów projektowych.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  EnergyNetworkModel,
  OverheadLine,
  Cable,
  Transformer,
  Source,
  Load,
  ValidationResult,
} from '../../types/enm';
import { computeWizardState, getStepStatusColor, getOverallStatusLabel } from './wizardStateMachine';
import type { WizardState } from './wizardStateMachine';
import { WizardSldPreview } from './WizardSldPreview';
import { useWizardStore } from './useWizardStore';
import type { WizardIssueApi } from './useWizardStore';
import { useSnapshotStore } from '../topology/snapshotStore';
import { clsx } from 'clsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const AUTOSAVE_DEBOUNCE_MS = 500;

interface WizardStep {
  id: string;
  number: number;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'K1', number: 1, title: 'Parametry modelu', description: 'Nazwa projektu, częstotliwość, opis' },
  { id: 'K2', number: 2, title: 'Punkt zasilania (GPZ)', description: 'Szyna główna SN + sieć zasilająca — początek budowy' },
  { id: 'K3', number: 3, title: 'Struktura szyn i sekcji', description: 'Sekcjonowanie szyn, sprzęgła' },
  { id: 'K4', number: 4, title: 'Gałęzie (linie / kable)', description: 'Parametry linii: R, X, długość' },
  { id: 'K5', number: 5, title: 'Transformatory', description: 'Dane znamionowe: Sn, uk%, Pk' },
  { id: 'K6', number: 6, title: 'Odbiory i generacja', description: 'Odbiorniki (P, Q) i źródła OZE' },
  { id: 'K7', number: 7, title: 'Uziemienia i składowe zerowe', description: 'Przegląd kompletności Z0' },
  { id: 'K8', number: 8, title: 'Walidacja', description: 'Sprawdzenie gotowości obliczeń' },
  { id: 'K9', number: 9, title: 'Schemat jednokreskowy', description: 'Podgląd SLD z referencjami ENM' },
  { id: 'K10', number: 10, title: 'Uruchom analizy', description: 'Zwarcia 3F, rozpływ mocy' },
];

function createDefaultENM(): EnergyNetworkModel {
  return {
    header: {
      enm_version: '1.0', name: '', description: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      revision: 0, hash_sha256: '', defaults: { frequency_hz: 50, unit_system: 'SI' },
    },
    buses: [], branches: [], transformers: [], sources: [], loads: [], generators: [], substations: [], bays: [], junctions: [], corridors: [], measurements: [], protection_assignments: [],
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function getCaseId(): string {
  const match = window.location.hash.match(/caseId=([^&]+)/);
  return match?.[1] ?? 'default';
}

async function fetchENM(caseId: string): Promise<EnergyNetworkModel> {
  const r = await fetch(`${API_BASE}/api/cases/${caseId}/enm`);
  if (!r.ok) throw new Error(`GET ENM: ${r.status}`);
  return r.json();
}

async function saveENM(caseId: string, enm: EnergyNetworkModel): Promise<EnergyNetworkModel> {
  const r = await fetch(`${API_BASE}/api/cases/${caseId}/enm`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enm),
  });
  if (!r.ok) throw new Error(`PUT ENM: ${r.status}`);
  return r.json();
}

async function validateENM(caseId: string): Promise<ValidationResult> {
  const r = await fetch(`${API_BASE}/api/cases/${caseId}/enm/validate`);
  if (!r.ok) throw new Error(`Validate: ${r.status}`);
  return r.json();
}

async function runShortCircuit(caseId: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${API_BASE}/api/cases/${caseId}/runs/short-circuit`, { method: 'POST' });
  if (!r.ok) throw new Error(`Run SC: ${r.status}`);
  return r.json();
}

// ---------------------------------------------------------------------------
// Reusable UI components — Industrial Grade
// ---------------------------------------------------------------------------

function FieldRow({ label, children, unit }: { label: string; children: React.ReactNode; unit?: string }) {
  return (
    <div className="wizard-field-row">
      <label className="wizard-field-label">{label}{unit && <span className="text-chrome-400 font-normal ml-1">[{unit}]</span>}</label>
      <div className="wizard-field-value">{children}</div>
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="ind-input" />
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="ind-select">
      {children}
    </select>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-semibold text-ind-800 mb-3 mt-4 first:mt-0">{children}</h4>;
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-chrome-400 mb-3">{children}</p>;
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-6 w-6 items-center justify-center rounded-ind text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Usuń">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="ind-btn text-ind-600 bg-ind-50 hover:bg-ind-100 border border-ind-200 mt-3">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step content components (K1-K10)
// ---------------------------------------------------------------------------

type StepProps = { enm: EnergyNetworkModel; onChange: (e: EnergyNetworkModel) => void };

function StepK1({ enm, onChange }: StepProps) {
  return (
    <div>
      <FieldRow label="Nazwa projektu">
        <Input value={enm.header.name} onChange={(v) => onChange({ ...enm, header: { ...enm.header, name: v } })} placeholder="np. GPZ Centrum" />
      </FieldRow>
      <FieldRow label="Opis">
        <Input value={enm.header.description ?? ''} onChange={(v) => onChange({ ...enm, header: { ...enm.header, description: v || null } })} placeholder="Opcjonalny opis projektu" />
      </FieldRow>
      <FieldRow label="Częstotliwość" unit="Hz">
        <Input type="number" value={enm.header.defaults.frequency_hz} onChange={(v) => onChange({ ...enm, header: { ...enm.header, defaults: { ...enm.header.defaults, frequency_hz: Number(v) || 50 } } })} />
      </FieldRow>
    </div>
  );
}

function StepK2({ enm, onChange }: StepProps) {
  const bus = enm.buses.find((b) => b.tags.includes('source'));
  const src = enm.sources[0];

  const update = (patch: { busName?: string; voltage?: number; sk3?: number; rx?: number; model?: Source['model'] }) => {
    const busRef = bus?.ref_id ?? 'bus_sn_main';
    const srcRef = src?.ref_id ?? 'source_grid';
    const buses = [...enm.buses];
    const sources = [...enm.sources];
    const bi = buses.findIndex((b) => b.ref_id === busRef);
    if (bi < 0) {
      buses.push({ id: crypto.randomUUID(), ref_id: busRef, name: patch.busName ?? 'Szyna główna SN', tags: ['source'], meta: {}, voltage_kv: patch.voltage ?? 15, phase_system: '3ph' });
    } else {
      if (patch.busName !== undefined) buses[bi] = { ...buses[bi], name: patch.busName };
      if (patch.voltage !== undefined) buses[bi] = { ...buses[bi], voltage_kv: patch.voltage };
    }
    const si = sources.findIndex((s) => s.ref_id === srcRef);
    if (si < 0) {
      sources.push({ id: crypto.randomUUID(), ref_id: srcRef, name: 'Sieć zasilająca', tags: [], meta: {}, bus_ref: busRef, model: patch.model ?? 'short_circuit_power', sk3_mva: patch.sk3 ?? 250, rx_ratio: patch.rx ?? 0.1 });
    } else {
      if (patch.sk3 !== undefined) sources[si] = { ...sources[si], sk3_mva: patch.sk3 };
      if (patch.rx !== undefined) sources[si] = { ...sources[si], rx_ratio: patch.rx };
      if (patch.model !== undefined) sources[si] = { ...sources[si], model: patch.model };
    }
    onChange({ ...enm, buses, sources });
  };

  return (
    <div>
      {/* GPZ emphasis — this is the starting point */}
      <div className="mb-4 p-3 bg-ind-50 border border-ind-200 rounded-md">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-ind-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <span className="text-sm font-semibold text-ind-800">Punkt zasilania GPZ</span>
        </div>
        <p className="text-xs text-ind-600">Zdefiniuj szynę główną SN i parametry sieci zasilającej. To jest punkt wyjścia do budowy całej sieci.</p>
      </div>

      <SectionTitle>Szyna źródłowa</SectionTitle>
      <FieldRow label="Nazwa szyny"><Input value={bus?.name ?? 'Szyna główna SN'} onChange={(v) => update({ busName: v })} /></FieldRow>
      <FieldRow label="Napięcie znamionowe" unit="kV"><Input type="number" value={bus?.voltage_kv ?? 15} onChange={(v) => update({ voltage: Number(v) || 15 })} /></FieldRow>

      <SectionTitle>Źródło zasilania</SectionTitle>
      <FieldRow label="Model">
        <Select value={src?.model ?? 'short_circuit_power'} onChange={(v) => update({ model: v as Source['model'] })}>
          <option value="short_circuit_power">Moc zwarciowa Sk&quot;</option>
          <option value="thevenin">Impedancja Thevenin (R, X)</option>
          <option value="external_grid">Sieć zewnętrzna</option>
        </Select>
      </FieldRow>
      <FieldRow label="Sk''" unit="MVA"><Input type="number" value={src?.sk3_mva ?? 250} onChange={(v) => update({ sk3: Number(v) || 0 })} /></FieldRow>
      <FieldRow label="R/X"><Input type="number" value={src?.rx_ratio ?? 0.1} onChange={(v) => update({ rx: Number(v) || 0.1 })} /></FieldRow>
    </div>
  );
}

function StepK3({ enm, onChange }: StepProps) {
  const extra = enm.buses.filter((b) => !b.tags.includes('source'));
  const addBus = () => {
    const n = extra.length + 1;
    onChange({ ...enm, buses: [...enm.buses, { id: crypto.randomUUID(), ref_id: `bus_sn_${n}`, name: `Szyna SN ${n}`, tags: [], meta: {}, voltage_kv: enm.buses[0]?.voltage_kv ?? 15, phase_system: '3ph' }] });
  };
  const rm = (ref: string) => onChange({ ...enm, buses: enm.buses.filter((b) => b.ref_id !== ref), branches: enm.branches.filter((br) => br.from_bus_ref !== ref && br.to_bus_ref !== ref) });

  return (
    <div>
      <HelpText>Dodaj dodatkowe szyny (sekcje) i sprzęgła. Każda szyna reprezentuje jedną sekcję rozdzielnicy.</HelpText>
      <div className="space-y-1.5">
        {extra.map((b) => (
          <div key={b.ref_id} className="wizard-card flex items-center">
            <span className="flex-1 text-sm font-medium text-ind-800">{b.name}</span>
            <span className="text-xs text-chrome-400 mr-3">{b.voltage_kv} kV</span>
            <RemoveButton onClick={() => rm(b.ref_id)} />
          </div>
        ))}
      </div>
      <AddButton onClick={addBus} label="Dodaj szynę" />
    </div>
  );
}

function StepK4({ enm, onChange }: StepProps) {
  const lines = enm.branches.filter((b): b is OverheadLine | Cable => b.type === 'line_overhead' || b.type === 'cable');
  const refs = enm.buses.map((b) => b.ref_id);
  const add = () => {
    const n = lines.length + 1;
    const nl: OverheadLine = { id: crypto.randomUUID(), ref_id: `line_L${String(n).padStart(2, '0')}`, name: `Linia L${n}`, tags: [], meta: {}, type: 'line_overhead', from_bus_ref: refs[0] ?? '', to_bus_ref: refs[1] ?? refs[0] ?? '', status: 'closed', length_km: 5, r_ohm_per_km: 0.443, x_ohm_per_km: 0.340 };
    onChange({ ...enm, branches: [...enm.branches, nl] });
  };
  const upd = (ref: string, p: Partial<OverheadLine | Cable>) => onChange({ ...enm, branches: enm.branches.map((b) => (b.ref_id === ref ? ({ ...b, ...p } as typeof b) : b)) });
  const rm = (ref: string) => onChange({ ...enm, branches: enm.branches.filter((b) => b.ref_id !== ref) });

  return (
    <div>
      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.ref_id} className="wizard-card">
            <div className="wizard-card-header">
              <span className="text-sm font-semibold text-ind-800">{l.name}</span>
              <RemoveButton onClick={() => rm(l.ref_id)} />
            </div>
            <FieldRow label="Nazwa"><Input value={l.name} onChange={(v) => upd(l.ref_id, { name: v })} /></FieldRow>
            <FieldRow label="Z szyny"><Select value={l.from_bus_ref} onChange={(v) => upd(l.ref_id, { from_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
            <FieldRow label="Do szyny"><Select value={l.to_bus_ref} onChange={(v) => upd(l.ref_id, { to_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
            <FieldRow label="Długość" unit="km"><Input type="number" value={l.length_km} onChange={(v) => upd(l.ref_id, { length_km: Number(v) || 0 })} /></FieldRow>
            <FieldRow label="R" unit="&Omega;/km"><Input type="number" value={l.r_ohm_per_km} onChange={(v) => upd(l.ref_id, { r_ohm_per_km: Number(v) || 0 })} /></FieldRow>
            <FieldRow label="X" unit="&Omega;/km"><Input type="number" value={l.x_ohm_per_km} onChange={(v) => upd(l.ref_id, { x_ohm_per_km: Number(v) || 0 })} /></FieldRow>
          </div>
        ))}
      </div>
      <AddButton onClick={add} label="Dodaj linię / kabel" />
    </div>
  );
}

function StepK5({ enm, onChange }: StepProps) {
  const refs = enm.buses.map((b) => b.ref_id);
  const add = () => {
    const n = enm.transformers.length + 1;
    const t: Transformer = { id: crypto.randomUUID(), ref_id: `trafo_T${n}`, name: `Transformator T${n}`, tags: [], meta: {}, hv_bus_ref: refs[0] ?? '', lv_bus_ref: refs[1] ?? refs[0] ?? '', sn_mva: 25, uhv_kv: 110, ulv_kv: 15, uk_percent: 12, pk_kw: 120 };
    onChange({ ...enm, transformers: [...enm.transformers, t] });
  };
  const upd = (ref: string, p: Partial<Transformer>) => onChange({ ...enm, transformers: enm.transformers.map((t) => t.ref_id === ref ? { ...t, ...p } : t) });
  const rm = (ref: string) => onChange({ ...enm, transformers: enm.transformers.filter((t) => t.ref_id !== ref) });

  return (
    <div>
      <div className="space-y-3">
        {enm.transformers.map((t) => (
          <div key={t.ref_id} className="wizard-card">
            <div className="wizard-card-header">
              <span className="text-sm font-semibold text-ind-800">{t.name}</span>
              <RemoveButton onClick={() => rm(t.ref_id)} />
            </div>
            <FieldRow label="Szyna GN"><Select value={t.hv_bus_ref} onChange={(v) => upd(t.ref_id, { hv_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
            <FieldRow label="Szyna DN"><Select value={t.lv_bus_ref} onChange={(v) => upd(t.ref_id, { lv_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
            <FieldRow label="Sn" unit="MVA"><Input type="number" value={t.sn_mva} onChange={(v) => upd(t.ref_id, { sn_mva: Number(v) || 0 })} /></FieldRow>
            <FieldRow label="UGN" unit="kV"><Input type="number" value={t.uhv_kv} onChange={(v) => upd(t.ref_id, { uhv_kv: Number(v) || 0 })} /></FieldRow>
            <FieldRow label="UDN" unit="kV"><Input type="number" value={t.ulv_kv} onChange={(v) => upd(t.ref_id, { ulv_kv: Number(v) || 0 })} /></FieldRow>
            <FieldRow label="uk" unit="%"><Input type="number" value={t.uk_percent} onChange={(v) => upd(t.ref_id, { uk_percent: Number(v) || 0 })} /></FieldRow>
            <FieldRow label="Pk" unit="kW"><Input type="number" value={t.pk_kw} onChange={(v) => upd(t.ref_id, { pk_kw: Number(v) || 0 })} /></FieldRow>
          </div>
        ))}
      </div>
      <AddButton onClick={add} label="Dodaj transformator" />
    </div>
  );
}

function StepK6({ enm, onChange }: StepProps) {
  const refs = enm.buses.map((b) => b.ref_id);
  const addLoad = () => {
    const n = enm.loads.length + 1;
    onChange({ ...enm, loads: [...enm.loads, { id: crypto.randomUUID(), ref_id: `load_${n}`, name: `Odbiór ${n}`, tags: [], meta: {}, bus_ref: refs[refs.length - 1] ?? '', p_mw: 1, q_mvar: 0.3, model: 'pq' as const }] });
  };
  const updLoad = (ref: string, p: Partial<Load>) => onChange({ ...enm, loads: enm.loads.map((l) => l.ref_id === ref ? { ...l, ...p } : l) });
  const rmLoad = (ref: string) => onChange({ ...enm, loads: enm.loads.filter((l) => l.ref_id !== ref) });

  return (
    <div>
      <SectionTitle>Odbiory</SectionTitle>
      <div className="space-y-3">
        {enm.loads.map((ld) => (
          <div key={ld.ref_id} className="wizard-card">
            <div className="wizard-card-header">
              <span className="text-sm font-semibold text-ind-800">{ld.name}</span>
              <RemoveButton onClick={() => rmLoad(ld.ref_id)} />
            </div>
            <FieldRow label="Szyna"><Select value={ld.bus_ref} onChange={(v) => updLoad(ld.ref_id, { bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
            <FieldRow label="P" unit="MW"><Input type="number" value={ld.p_mw} onChange={(v) => updLoad(ld.ref_id, { p_mw: Number(v) || 0 })} /></FieldRow>
            <FieldRow label="Q" unit="Mvar"><Input type="number" value={ld.q_mvar} onChange={(v) => updLoad(ld.ref_id, { q_mvar: Number(v) || 0 })} /></FieldRow>
          </div>
        ))}
      </div>
      <AddButton onClick={addLoad} label="Dodaj odbiór" />
    </div>
  );
}

function StepK7({ enm }: StepProps) {
  const noZ0 = enm.branches.filter((b): b is OverheadLine | Cable => (b.type === 'line_overhead' || b.type === 'cable') && b.r0_ohm_per_km == null && b.x0_ohm_per_km == null);
  const srcNoZ0 = enm.sources.filter((s) => s.r0_ohm == null && s.x0_ohm == null && s.z0_z1_ratio == null);
  return (
    <div>
      <HelpText>Przegląd kompletności składowej zerowej (Z0). Elementy bez Z0 ograniczają analizy zwarć doziemnych.</HelpText>
      {noZ0.length > 0 && (
        <div className="mb-3 p-3 bg-status-warn-light border border-amber-200 rounded-md text-sm">
          <span className="font-semibold text-amber-800">Gałęzie bez Z0:</span>{' '}
          <span className="text-amber-700">{noZ0.map((l) => l.ref_id).join(', ')}</span>
        </div>
      )}
      {srcNoZ0.length > 0 && (
        <div className="mb-3 p-3 bg-status-warn-light border border-amber-200 rounded-md text-sm">
          <span className="font-semibold text-amber-800">Źródła bez Z0:</span>{' '}
          <span className="text-amber-700">{srcNoZ0.map((s) => s.ref_id).join(', ')}</span>
        </div>
      )}
      {noZ0.length === 0 && srcNoZ0.length === 0 && (
        <div className="p-3 bg-status-ok-light border border-emerald-200 rounded-md text-sm text-emerald-800 font-medium">
          Wszystkie elementy mają kompletne składowe zerowe.
        </div>
      )}
    </div>
  );
}

function StepK8({ validation, onGoToStep }: { validation: ValidationResult | null; onGoToStep: (s: number) => void }) {
  if (!validation) return <div className="text-sm text-chrome-400">Ładowanie walidacji...</div>;
  const sm: Record<string, number> = { K1: 0, K2: 1, K3: 2, K4: 3, K5: 4, K6: 5, K7: 6 };
  return (
    <div>
      {/* Dostępność analiz */}
      <div className="mb-4 flex gap-3 flex-wrap">
        {(['short_circuit_3f', 'short_circuit_1f', 'load_flow'] as const).map((k) => {
          const labels: Record<string, string> = { short_circuit_3f: 'Zwarcie 3F', short_circuit_1f: 'Zwarcie 1F', load_flow: 'Rozpływ mocy' };
          const ok = validation.analysis_available[k];
          return (
            <div key={k} className={clsx('px-3 py-2 rounded-md text-sm font-medium', ok ? 'bg-status-ok-light text-emerald-800' : 'bg-status-error-light text-red-800')}>
              {labels[k]}: {ok ? 'dostępne' : 'niedostępne'}
            </div>
          );
        })}
      </div>

      {validation.issues.length === 0 && (
        <div className="p-4 bg-status-ok-light border border-emerald-200 rounded-md text-sm font-semibold text-emerald-800">
          Model sieci jest kompletny i gotowy do obliczeń.
        </div>
      )}

      {validation.issues.length > 0 && (
        <div className="overflow-hidden rounded-md border border-chrome-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-chrome-50 border-b border-chrome-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Kod</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Priorytet</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Opis</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome-100">
              {validation.issues.map((i, idx) => (
                <tr key={idx} className="hover:bg-chrome-50">
                  <td className="px-3 py-2 font-mono text-xs text-chrome-600">{i.code}</td>
                  <td className="px-3 py-2">
                    <span className={clsx('ind-badge', i.severity === 'BLOCKER' ? 'ind-badge-error' : i.severity === 'WARNING' ? 'ind-badge-warn' : 'ind-badge-info')}>
                      {i.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-chrome-700">{i.message_pl}</td>
                  <td className="px-3 py-2">
                    {i.wizard_step_hint && sm[i.wizard_step_hint] !== undefined && (
                      <button onClick={() => onGoToStep(sm[i.wizard_step_hint])} className="ind-btn text-ind-600 bg-ind-50 hover:bg-ind-100 border border-ind-200 text-[11px]">
                        {i.wizard_step_hint}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StepK9({ enm }: { enm: EnergyNetworkModel }) {
  return (
    <div>
      <HelpText>Podgląd schematu jednokreskowego (SLD). Układ generowany automatycznie przez silnik topologiczny.</HelpText>
      <WizardSldPreview enm={enm} />
      <div className="mt-3 flex gap-3 text-xs text-chrome-400">
        <span>{enm.buses.length} szyn</span>
        <span className="text-chrome-200">|</span>
        <span>{enm.branches.length + enm.transformers.length} gałęzi</span>
        <span className="text-chrome-200">|</span>
        <span>{enm.sources.length} źródeł</span>
        <span className="text-chrome-200">|</span>
        <span>{enm.loads.length} odbiorów</span>
      </div>
      <div className="mt-2 text-xs text-chrome-300">
        Pełny edytor SLD dostępny w widoku <a href="#sld" className="text-ind-500 hover:text-ind-700 underline">Schemat</a>
      </div>
    </div>
  );
}

function StepK10({ validation, wizardState, runResult, isRunning, onRun }: {
  validation: ValidationResult | null; wizardState: WizardState | null; runResult: Record<string, unknown> | null; isRunning: boolean; onRun: () => void;
}) {
  const canRun = validation?.status !== 'FAIL';
  const results = (runResult as { results?: Array<Record<string, unknown>> })?.results ?? [];
  const rm = wizardState?.readinessMatrix;

  const analysisItems = [
    { key: 'sc3f', label: 'Zwarcie 3F', ready: rm?.shortCircuit3F, btn: 'Uruchom zwarcia 3F' },
    { key: 'sc1f', label: 'Zwarcie 1F', ready: rm?.shortCircuit1F, btn: null },
    { key: 'lf', label: 'Rozpływ mocy', ready: rm?.loadFlow, btn: null },
  ];

  return (
    <div>
      {/* Macierz gotowości */}
      <SectionTitle>Macierz gotowości analiz</SectionTitle>
      <div className="mb-4 flex gap-3 flex-wrap">
        {analysisItems.map(({ key, label, ready }) => {
          const ok = ready?.available ?? false;
          return (
            <div key={key} data-testid={`readiness-${key}`} className={clsx('p-3 rounded-md min-w-[180px]', ok ? 'bg-status-ok-light border border-emerald-200' : 'bg-status-error-light border border-red-200')}>
              <div className="text-sm font-medium mb-1">{label}: {ok ? <span className="text-emerald-700">dostępne</span> : <span className="text-red-700">niedostępne</span>}</div>
              {!ok && ready && ready.missingRequirements.length > 0 && (
                <ul className="ml-4 text-[11px] text-chrome-500 list-disc">
                  {ready.missingRequirements.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Statystyki elementów */}
      {wizardState && (
        <div className="mb-4 p-3 bg-chrome-50 rounded-md flex gap-4 flex-wrap text-xs text-chrome-500">
          <span>Szyny: <span className="font-semibold text-chrome-700">{wizardState.elementCounts.buses}</span></span>
          <span>Źródła: <span className="font-semibold text-chrome-700">{wizardState.elementCounts.sources}</span></span>
          <span>Transformatory: <span className="font-semibold text-chrome-700">{wizardState.elementCounts.transformers}</span></span>
          <span>Gałęzie: <span className="font-semibold text-chrome-700">{wizardState.elementCounts.branches}</span></span>
          <span>Odbiory: <span className="font-semibold text-chrome-700">{wizardState.elementCounts.loads}</span></span>
          <span>Generatory: <span className="font-semibold text-chrome-700">{wizardState.elementCounts.generators}</span></span>
        </div>
      )}

      {!canRun && (
        <div className="mb-4 p-3 bg-status-error-light border border-red-200 rounded-md text-sm text-red-800">
          Model sieci zawiera blokery — obliczenia zablokowane. Wróć do K8.
        </div>
      )}

      <button data-testid="run-sc-btn" onClick={onRun} disabled={!canRun || isRunning} className="ind-btn-calculate text-sm px-6 py-2">
        {isRunning ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Obliczanie...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Uruchom zwarcia 3F
          </>
        )}
      </button>

      {results.length > 0 && (
        <div className="mt-4" data-testid="sc-results">
          <SectionTitle>Wyniki zwarć 3F</SectionTitle>
          <div className="overflow-hidden rounded-md border border-chrome-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-chrome-50 border-b border-chrome-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Węzeł</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Ik&quot; [A]</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Ip [A]</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Ith [A]</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-chrome-500 uppercase tracking-wider">Sk&quot; [MVA]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chrome-100">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-chrome-50">
                    <td className="px-3 py-2 font-mono text-xs text-chrome-600">{String(r.fault_node_id ?? '').slice(0, 12)}...</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(r.ikss_a ?? 0).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(r.ip_a ?? 0).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(r.ith_a ?? 0).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(r.sk_mva ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step sidebar indicator
// ---------------------------------------------------------------------------

function StepIndicator({ step, isActive, stepState, onClick }: { step: WizardStep; isActive: boolean; stepState?: WizardState['steps'][number]; onClick: () => void }) {
  const statusColor = stepState ? getStepStatusColor(stepState.status) : '#6b7280';
  const isComplete = stepState?.status === 'complete';
  const hasBlockers = stepState?.issues.some(i => i.severity === 'BLOCKER') ?? false;
  const hasWarnings = (stepState?.issues.length ?? 0) > 0 && !hasBlockers;

  return (
    <button
      onClick={onClick}
      data-testid={`wizard-step-${step.id}`}
      className={clsx(
        'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left transition-colors',
        isActive
          ? 'bg-ind-50 border-2 border-ind-500'
          : 'border border-chrome-200 hover:bg-chrome-50 hover:border-chrome-300',
      )}
    >
      {/* Step number circle */}
      <span
        className={clsx(
          'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors',
          isActive ? 'bg-ind-600 text-white' : isComplete ? 'bg-status-ok text-white' : 'bg-chrome-300 text-white',
        )}
        style={!isActive && !isComplete ? { backgroundColor: statusColor } : undefined}
      >
        {isComplete ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step.number
        )}
      </span>

      {/* Step label + progress */}
      <div className="flex-1 min-w-0">
        <span className={clsx('text-sm truncate block', isActive ? 'font-semibold text-ind-800' : 'font-medium text-chrome-700')}>
          {step.title}
        </span>
        {stepState && stepState.completionPercent > 0 && stepState.completionPercent < 100 && (
          <div className="mt-1 h-1 bg-chrome-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${stepState.completionPercent}%`, backgroundColor: statusColor }} />
          </div>
        )}
      </div>

      {/* Issue count badge */}
      {hasBlockers && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-error text-white text-[10px] font-bold">
          {stepState?.issues.length}
        </span>
      )}
      {hasWarnings && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-warn text-white text-[10px] font-bold">
          {stepState?.issues.length}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Blocker banner
// ---------------------------------------------------------------------------

function BlockerBanner({ issues }: { issues: WizardIssueApi[] }) {
  const blockers = issues.filter(i => i.severity === 'BLOCKER');
  if (blockers.length === 0) return null;
  return (
    <div data-testid="wizard-blocker-banner" className="mb-4 p-3 bg-status-error-light border border-red-200 rounded-md">
      <div className="text-sm font-semibold text-red-800 mb-1.5 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Przejście do następnego kroku jest zablokowane:
      </div>
      <ul className="ml-6 text-xs text-red-700 list-disc space-y-0.5">
        {blockers.map((b, i) => (
          <li key={i}>{b.message_pl}{b.wizard_step_hint ? ` (${b.wizard_step_hint})` : ''}</li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main WizardPage
// ---------------------------------------------------------------------------

export function WizardPage() {
  const [currentStep, setCurrentStep] = useState(() => {
    const m = window.location.hash.match(/\/k(\d+)/i);
    return m ? Math.min(Math.max(Number(m[1]) - 1, 0), 9) : 0;
  });
  const [enm, setEnm] = useState<EnergyNetworkModel>(createDefaultENM);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caseId = getCaseId();

  // Wizard store (Zustand)
  const wizardStore = useWizardStore();
  const refreshSnapshot = useSnapshotStore((s) => s.refreshFromBackend);

  // Wizard state machine — deterministic
  const wizardState = useMemo<WizardState>(() => computeWizardState(enm), [enm]);

  useEffect(() => { wizardStore.recomputeFromEnm(enm); }, [enm]);
  useEffect(() => { wizardStore.setCurrentStep(currentStep); }, [currentStep]);

  // Load ENM on mount
  useEffect(() => {
    fetchENM(caseId).then((loaded) => {
      setEnm(loaded);
      wizardStore.fetchWizardState(caseId).catch(() => {});
    }).catch(() => {});
  }, [caseId]);

  useEffect(() => { validateENM(caseId).then(setValidation).catch(() => {}); }, [caseId, enm.header.revision]);

  // Autosave
  const handleChange = useCallback((newEnm: EnergyNetworkModel) => {
    setEnm(newEnm);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      saveENM(caseId, newEnm).then((saved) => {
        setEnm(saved);
        setSaveStatus('saved');
        validateENM(caseId).then(setValidation).catch(() => {});
        refreshSnapshot(caseId).catch(() => {});
        window.dispatchEvent(new CustomEvent('model-updated', {
          detail: { revision: saved.header.revision, source: 'wizard' },
        }));
      }).catch(() => setSaveStatus('error'));
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [caseId, refreshSnapshot]);

  // Deep-link update
  useEffect(() => {
    const sid = WIZARD_STEPS[currentStep].id.toLowerCase();
    const base = window.location.hash.split('?')[0].split('/')[0];
    window.history.replaceState(null, '', `${base}/${sid}${window.location.search}`);
  }, [currentStep]);

  const handleRun = useCallback(async () => {
    setIsRunning(true); setRunResult(null);
    try { setRunResult(await runShortCircuit(caseId)); } catch (e) { setRunResult({ error: String(e) }); } finally { setIsRunning(false); }
  }, [caseId]);

  const handleNext = useCallback(async () => {
    if (currentStep >= 9) return;
    const nextIdx = currentStep + 1;
    const allowed = await wizardStore.checkCanProceed(caseId, currentStep, nextIdx);
    if (allowed) {
      setCurrentStep(nextIdx);
    }
  }, [currentStep, caseId, wizardStore]);

  const step = WIZARD_STEPS[currentStep];
  const overallLabel = getOverallStatusLabel(wizardState.overallStatus);
  const overallColor = wizardState.overallStatus === 'ready' ? 'bg-status-ok' : wizardState.overallStatus === 'blocked' ? 'bg-status-error' : wizardState.overallStatus === 'incomplete' ? 'bg-status-warn' : 'bg-chrome-300';
  const canGoForward = wizardStore.canProceed && currentStep < 9;

  return (
    <div data-testid="wizard-page" className="flex h-full font-sans">
      {/* Sidebar — kroków kreatora */}
      <div className="w-wizard-sidebar border-r border-chrome-200 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="ind-panel-header justify-between">
          <span>Kreator sieci</span>
          <div
            data-testid="wizard-gate"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-ind text-[10px] font-semibold"
          >
            <span className={clsx('w-2 h-2 rounded-full', overallColor)} />
            <span className="text-chrome-500">{overallLabel}</span>
          </div>
        </div>

        {/* Steps list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {WIZARD_STEPS.map((s, i) => {
            const stepState = wizardState.steps.find(ws => ws.stepId === s.id);
            return <StepIndicator key={s.id} step={s} isActive={i === currentStep} stepState={stepState} onClick={() => setCurrentStep(i)} />;
          })}
        </div>

        {/* Save status */}
        {saveStatus && (
          <div className={clsx('px-3 py-2 text-[11px] border-t border-chrome-200', saveStatus === 'saved' ? 'text-status-ok' : saveStatus === 'error' ? 'text-status-error' : 'text-chrome-400')}>
            {saveStatus === 'saved' ? 'Zapisano automatycznie' : saveStatus === 'saving' ? 'Zapisywanie...' : 'Błąd zapisu'}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto bg-canvas-bg">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {/* Step header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-ind-600 text-white text-sm font-bold">
                {step.number}
              </span>
              <h2 className="text-lg font-bold text-ind-900">{step.title}</h2>
            </div>
            <p className="text-sm text-chrome-400 ml-11">{step.description}</p>
          </div>

          {/* Blocker banner */}
          <BlockerBanner issues={wizardStore.transitionBlockers} />

          {/* Step content */}
          {step.id === 'K1' && <StepK1 enm={enm} onChange={handleChange} />}
          {step.id === 'K2' && <StepK2 enm={enm} onChange={handleChange} />}
          {step.id === 'K3' && <StepK3 enm={enm} onChange={handleChange} />}
          {step.id === 'K4' && <StepK4 enm={enm} onChange={handleChange} />}
          {step.id === 'K5' && <StepK5 enm={enm} onChange={handleChange} />}
          {step.id === 'K6' && <StepK6 enm={enm} onChange={handleChange} />}
          {step.id === 'K7' && <StepK7 enm={enm} onChange={handleChange} />}
          {step.id === 'K8' && <StepK8 validation={validation} onGoToStep={setCurrentStep} />}
          {step.id === 'K9' && <StepK9 enm={enm} />}
          {step.id === 'K10' && <StepK10 validation={validation} wizardState={wizardState} runResult={runResult} isRunning={isRunning} onRun={handleRun} />}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-chrome-200">
            <button
              onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
              disabled={currentStep === 0}
              className={clsx(
                'ind-btn border',
                currentStep === 0
                  ? 'text-chrome-300 bg-chrome-50 border-chrome-100 cursor-not-allowed'
                  : 'text-chrome-600 bg-white border-chrome-200 hover:bg-chrome-50'
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Wstecz
            </button>
            <button
              data-testid="wizard-next-btn"
              onClick={handleNext}
              disabled={!canGoForward}
              className="ind-btn-action"
            >
              {currentStep === 9 ? 'Zakończ' : 'Dalej'}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
