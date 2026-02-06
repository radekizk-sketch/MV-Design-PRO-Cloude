/**
 * WizardPage — Kreator budowy sieci SN/nN z ENM
 *
 * Kreator krok po kroku (K1-K10) prowadzący użytkownika
 * przez proces budowy kompletnej sieci średniego napięcia.
 *
 * Każdy krok edytuje EnergyNetworkModel (ENM) — autosave via PUT.
 *
 * BINDING: Etykiety po polsku, brak kodów projektowych.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  EnergyNetworkModel,
  Bus,
  Branch,
  OverheadLine,
  Cable,
  Transformer,
  Source,
  Load,
  ValidationResult,
} from '../../types/enm';

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
  { id: 'K2', number: 2, title: 'Punkt zasilania', description: 'Szyna główna SN + sieć zasilająca' },
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
    buses: [], branches: [], transformers: [], sources: [], loads: [], generators: [],
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
// Reusable UI components
// ---------------------------------------------------------------------------

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <label style={{ width: '200px', fontSize: '13px', fontWeight: 500, flexShrink: 0 }}>{label}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', width: '100%' }} />
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', width: '100%' }}>
      {children}
    </select>
  );
}

function GateIndicator({ validation }: { validation: ValidationResult | null }) {
  if (!validation) return null;
  const color = validation.status === 'OK' ? '#22c55e' : validation.status === 'WARN' ? '#eab308' : '#ef4444';
  const bc = validation.issues.filter((i) => i.severity === 'BLOCKER').length;
  const wc = validation.issues.filter((i) => i.severity === 'IMPORTANT').length;
  return (
    <div data-testid="gate-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', background: `${color}15`, border: `1px solid ${color}40`, fontSize: '11px' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
      {validation.status === 'OK' && 'Gotowy'}
      {validation.status === 'WARN' && `${wc} ostrz.`}
      {validation.status === 'FAIL' && `${bc} bloker.`}
    </div>
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
        <Input value={enm.header.description ?? ''} onChange={(v) => onChange({ ...enm, header: { ...enm.header, description: v || null } })} placeholder="Opcjonalny opis" />
      </FieldRow>
      <FieldRow label="Częstotliwość [Hz]">
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
    let bi = buses.findIndex((b) => b.ref_id === busRef);
    if (bi < 0) {
      buses.push({ id: crypto.randomUUID(), ref_id: busRef, name: patch.busName ?? 'Szyna główna SN', tags: ['source'], meta: {}, voltage_kv: patch.voltage ?? 15, phase_system: '3ph' });
    } else {
      if (patch.busName !== undefined) buses[bi] = { ...buses[bi], name: patch.busName };
      if (patch.voltage !== undefined) buses[bi] = { ...buses[bi], voltage_kv: patch.voltage };
    }
    let si = sources.findIndex((s) => s.ref_id === srcRef);
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
      <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Szyna źródłowa</h4>
      <FieldRow label="Nazwa szyny"><Input value={bus?.name ?? 'Szyna główna SN'} onChange={(v) => update({ busName: v })} /></FieldRow>
      <FieldRow label="Napięcie [kV]"><Input type="number" value={bus?.voltage_kv ?? 15} onChange={(v) => update({ voltage: Number(v) || 15 })} /></FieldRow>
      <h4 style={{ margin: '16px 0 12px', fontSize: '14px' }}>Źródło zasilania</h4>
      <FieldRow label="Model">
        <Select value={src?.model ?? 'short_circuit_power'} onChange={(v) => update({ model: v as Source['model'] })}>
          <option value="short_circuit_power">Moc zwarciowa Sk''</option>
          <option value="thevenin">Impedancja Thevenin (R, X)</option>
          <option value="external_grid">Sieć zewnętrzna</option>
        </Select>
      </FieldRow>
      <FieldRow label="Sk'' [MVA]"><Input type="number" value={src?.sk3_mva ?? 250} onChange={(v) => update({ sk3: Number(v) || 0 })} /></FieldRow>
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
      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Dodaj dodatkowe szyny (sekcje) i sprzęgła.</p>
      {extra.map((b) => (
        <div key={b.ref_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          <span style={{ flex: 1, fontSize: '13px' }}>{b.name} ({b.voltage_kv} kV)</span>
          <button onClick={() => rm(b.ref_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px' }}>x</button>
        </div>
      ))}
      <button onClick={addBus} style={{ marginTop: '8px', padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>+ Dodaj szynę</button>
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
  const upd = (ref: string, p: Partial<OverheadLine | Cable>) => onChange({ ...enm, branches: enm.branches.map((b) => b.ref_id === ref ? { ...b, ...p } : b) });
  const rm = (ref: string) => onChange({ ...enm, branches: enm.branches.filter((b) => b.ref_id !== ref) });

  return (
    <div>
      {lines.map((l) => (
        <div key={l.ref_id} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><strong style={{ fontSize: '13px' }}>{l.name}</strong><button onClick={() => rm(l.ref_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>x</button></div>
          <FieldRow label="Nazwa"><Input value={l.name} onChange={(v) => upd(l.ref_id, { name: v })} /></FieldRow>
          <FieldRow label="Z szyny"><Select value={l.from_bus_ref} onChange={(v) => upd(l.ref_id, { from_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
          <FieldRow label="Do szyny"><Select value={l.to_bus_ref} onChange={(v) => upd(l.ref_id, { to_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
          <FieldRow label="Długość [km]"><Input type="number" value={l.length_km} onChange={(v) => upd(l.ref_id, { length_km: Number(v) || 0 })} /></FieldRow>
          <FieldRow label="R [Ohm/km]"><Input type="number" value={l.r_ohm_per_km} onChange={(v) => upd(l.ref_id, { r_ohm_per_km: Number(v) || 0 })} /></FieldRow>
          <FieldRow label="X [Ohm/km]"><Input type="number" value={l.x_ohm_per_km} onChange={(v) => upd(l.ref_id, { x_ohm_per_km: Number(v) || 0 })} /></FieldRow>
        </div>
      ))}
      <button onClick={add} style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>+ Dodaj linie / kabel</button>
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
      {enm.transformers.map((t) => (
        <div key={t.ref_id} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><strong style={{ fontSize: '13px' }}>{t.name}</strong><button onClick={() => rm(t.ref_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>x</button></div>
          <FieldRow label="Szyna HV"><Select value={t.hv_bus_ref} onChange={(v) => upd(t.ref_id, { hv_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
          <FieldRow label="Szyna LV"><Select value={t.lv_bus_ref} onChange={(v) => upd(t.ref_id, { lv_bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
          <FieldRow label="Sn [MVA]"><Input type="number" value={t.sn_mva} onChange={(v) => upd(t.ref_id, { sn_mva: Number(v) || 0 })} /></FieldRow>
          <FieldRow label="UHV [kV]"><Input type="number" value={t.uhv_kv} onChange={(v) => upd(t.ref_id, { uhv_kv: Number(v) || 0 })} /></FieldRow>
          <FieldRow label="ULV [kV]"><Input type="number" value={t.ulv_kv} onChange={(v) => upd(t.ref_id, { ulv_kv: Number(v) || 0 })} /></FieldRow>
          <FieldRow label="uk [%]"><Input type="number" value={t.uk_percent} onChange={(v) => upd(t.ref_id, { uk_percent: Number(v) || 0 })} /></FieldRow>
          <FieldRow label="Pk [kW]"><Input type="number" value={t.pk_kw} onChange={(v) => upd(t.ref_id, { pk_kw: Number(v) || 0 })} /></FieldRow>
        </div>
      ))}
      <button onClick={add} style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>+ Dodaj transformator</button>
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
      <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Odbiory</h4>
      {enm.loads.map((ld) => (
        <div key={ld.ref_id} style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><strong style={{ fontSize: '13px' }}>{ld.name}</strong><button onClick={() => rmLoad(ld.ref_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>x</button></div>
          <FieldRow label="Szyna"><Select value={ld.bus_ref} onChange={(v) => updLoad(ld.ref_id, { bus_ref: v })}>{refs.map((r) => <option key={r} value={r}>{r}</option>)}</Select></FieldRow>
          <FieldRow label="P [MW]"><Input type="number" value={ld.p_mw} onChange={(v) => updLoad(ld.ref_id, { p_mw: Number(v) || 0 })} /></FieldRow>
          <FieldRow label="Q [Mvar]"><Input type="number" value={ld.q_mvar} onChange={(v) => updLoad(ld.ref_id, { q_mvar: Number(v) || 0 })} /></FieldRow>
        </div>
      ))}
      <button onClick={addLoad} style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>+ Dodaj odbiór</button>
    </div>
  );
}

function StepK7({ enm }: StepProps) {
  const noZ0 = enm.branches.filter((b): b is OverheadLine | Cable => (b.type === 'line_overhead' || b.type === 'cable') && b.r0_ohm_per_km == null && b.x0_ohm_per_km == null);
  const srcNoZ0 = enm.sources.filter((s) => s.r0_ohm == null && s.x0_ohm == null && s.z0_z1_ratio == null);
  return (
    <div>
      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Przegląd kompletności składowej zerowej (Z0). Elementy bez Z0 ograniczają analizy zwarć doziemnych.</p>
      {noZ0.length > 0 && <div style={{ marginBottom: '12px', padding: '10px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px' }}><strong>Gałęzie bez Z0:</strong> {noZ0.map((l) => l.ref_id).join(', ')}</div>}
      {srcNoZ0.length > 0 && <div style={{ marginBottom: '12px', padding: '10px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px' }}><strong>Źródła bez Z0:</strong> {srcNoZ0.map((s) => s.ref_id).join(', ')}</div>}
      {noZ0.length === 0 && srcNoZ0.length === 0 && <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '6px', fontSize: '13px' }}>Wszystkie elementy mają kompletne składowe zerowe.</div>}
    </div>
  );
}

function StepK8({ validation, onGoToStep }: { validation: ValidationResult | null; onGoToStep: (s: number) => void }) {
  if (!validation) return <div style={{ fontSize: '13px', color: '#6b7280' }}>Ładowanie walidacji...</div>;
  const sm: Record<string, number> = { K1: 0, K2: 1, K3: 2, K4: 3, K5: 4, K6: 5, K7: 6 };
  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {(['short_circuit_3f', 'short_circuit_1f', 'load_flow'] as const).map((k) => {
          const labels: Record<string, string> = { short_circuit_3f: 'Zwarcie 3F', short_circuit_1f: 'Zwarcie 1F', load_flow: 'Rozpływ mocy' };
          const ok = validation.analysis_available[k];
          return <div key={k} style={{ padding: '10px 14px', borderRadius: '6px', background: ok ? '#dcfce7' : '#fef2f2', fontSize: '13px' }}>{labels[k]}: {ok ? 'dostępne' : 'niedostępne'}</div>;
        })}
      </div>
      {validation.issues.length === 0 && <div style={{ padding: '16px', background: '#dcfce7', borderRadius: '6px', fontSize: '14px', fontWeight: 500 }}>Model sieci jest kompletny i gotowy do obliczeń.</div>}
      {validation.issues.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}><th style={{ textAlign: 'left', padding: '8px' }}>Kod</th><th style={{ textAlign: 'left', padding: '8px' }}>Priorytet</th><th style={{ textAlign: 'left', padding: '8px' }}>Opis</th><th style={{ textAlign: 'left', padding: '8px' }}>Akcja</th></tr></thead>
          <tbody>
            {validation.issues.map((i, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{i.code}</td>
                <td style={{ padding: '8px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: i.severity === 'BLOCKER' ? '#fef2f2' : i.severity === 'IMPORTANT' ? '#fef3c7' : '#f0f9ff', color: i.severity === 'BLOCKER' ? '#ef4444' : i.severity === 'IMPORTANT' ? '#d97706' : '#3b82f6' }}>{i.severity}</span></td>
                <td style={{ padding: '8px' }}>{i.message_pl}</td>
                <td style={{ padding: '8px' }}>{i.wizard_step_hint && sm[i.wizard_step_hint] !== undefined && <button onClick={() => onGoToStep(sm[i.wizard_step_hint])} style={{ padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>{i.wizard_step_hint}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StepK9({ enm }: { enm: EnergyNetworkModel }) {
  return (
    <div>
      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Podgląd schematu jednokreskowego (SLD). Elementy referencjonowane z ENM po ref_id.</p>
      <div style={{ padding: '24px', border: '2px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '14px', marginBottom: '8px' }}>Schemat jednokreskowy</div>
        <div style={{ fontSize: '12px' }}>{enm.buses.length} szyn | {enm.branches.length} gałęzi | {enm.transformers.length} trafo</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>Pełny SLD CAD dostępny w widoku #sld</div>
      </div>
    </div>
  );
}

function StepK10({ validation, runResult, isRunning, onRun }: {
  validation: ValidationResult | null; runResult: Record<string, unknown> | null; isRunning: boolean; onRun: () => void;
}) {
  const canRun = validation?.status !== 'FAIL';
  const results = (runResult as { results?: Array<Record<string, unknown>> })?.results ?? [];
  return (
    <div>
      {!canRun && <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', borderRadius: '6px', fontSize: '13px', color: '#ef4444' }}>Model sieci zawiera blokery — obliczenia zablokowane. Wróć do K8.</div>}
      <button data-testid="run-sc-btn" onClick={onRun} disabled={!canRun || isRunning} style={{ padding: '10px 24px', backgroundColor: canRun ? '#3b82f6' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: canRun && !isRunning ? 'pointer' : 'not-allowed', opacity: isRunning ? 0.7 : 1 }}>
        {isRunning ? 'Obliczanie...' : 'Uruchom zwarcia 3F'}
      </button>
      {results.length > 0 && (
        <div style={{ marginTop: '16px' }} data-testid="sc-results">
          <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Wyniki zwarć 3F</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}><th style={{ textAlign: 'left', padding: '8px' }}>Węzeł</th><th style={{ textAlign: 'right', padding: '8px' }}>Ik'' [A]</th><th style={{ textAlign: 'right', padding: '8px' }}>Ip [A]</th><th style={{ textAlign: 'right', padding: '8px' }}>Ith [A]</th><th style={{ textAlign: 'right', padding: '8px' }}>Sk'' [MVA]</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>{String(r.fault_node_id ?? '').slice(0, 12)}...</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Number(r.ikss_a ?? 0).toFixed(1)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Number(r.ip_a ?? 0).toFixed(1)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Number(r.ith_a ?? 0).toFixed(1)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Number(r.sk_mva ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step sidebar indicator
// ---------------------------------------------------------------------------

function StepIndicator({ step, isActive, onClick }: { step: WizardStep; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} data-testid={`wizard-step-${step.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb', borderRadius: '8px', background: isActive ? '#eff6ff' : '#fff', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isActive ? '#3b82f6' : '#6b7280', color: '#fff', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>{step.number}</span>
      <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400 }}>{step.title}</span>
    </button>
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

  // Load ENM on mount
  useEffect(() => { fetchENM(caseId).then(setEnm).catch(() => {}); }, [caseId]);

  // Validate after load / save
  useEffect(() => { validateENM(caseId).then(setValidation).catch(() => {}); }, [caseId, enm.header.revision]);

  // Autosave with debounce
  const handleChange = useCallback((newEnm: EnergyNetworkModel) => {
    setEnm(newEnm);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      saveENM(caseId, newEnm).then((saved) => { setEnm(saved); setSaveStatus('saved'); validateENM(caseId).then(setValidation).catch(() => {}); }).catch(() => setSaveStatus('error'));
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [caseId]);

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

  const step = WIZARD_STEPS[currentStep];

  return (
    <div data-testid="wizard-page" style={{ display: 'flex', height: '100%', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', borderRight: '1px solid #e5e7eb', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Kreator sieci</h3>
          <GateIndicator validation={validation} />
        </div>
        {WIZARD_STEPS.map((s, i) => <StepIndicator key={s.id} step={s} isActive={i === currentStep} onClick={() => setCurrentStep(i)} />)}
        {saveStatus && <div style={{ marginTop: '8px', fontSize: '11px', color: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'error' ? '#ef4444' : '#6b7280' }}>{saveStatus === 'saved' ? 'Zapisano' : saveStatus === 'saving' ? 'Zapisywanie...' : 'Błąd zapisu'}</div>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{step.id}: {step.title}</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{step.description}</p>
          </div>
          {step.id === 'K1' && <StepK1 enm={enm} onChange={handleChange} />}
          {step.id === 'K2' && <StepK2 enm={enm} onChange={handleChange} />}
          {step.id === 'K3' && <StepK3 enm={enm} onChange={handleChange} />}
          {step.id === 'K4' && <StepK4 enm={enm} onChange={handleChange} />}
          {step.id === 'K5' && <StepK5 enm={enm} onChange={handleChange} />}
          {step.id === 'K6' && <StepK6 enm={enm} onChange={handleChange} />}
          {step.id === 'K7' && <StepK7 enm={enm} onChange={handleChange} />}
          {step.id === 'K8' && <StepK8 validation={validation} onGoToStep={setCurrentStep} />}
          {step.id === 'K9' && <StepK9 enm={enm} />}
          {step.id === 'K10' && <StepK10 validation={validation} runResult={runResult} isRunning={isRunning} onRun={handleRun} />}
          {/* Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', gap: '12px' }}>
            <button onClick={() => setCurrentStep((p) => Math.max(0, p - 1))} disabled={currentStep === 0} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: currentStep === 0 ? 'not-allowed' : 'pointer', opacity: currentStep === 0 ? 0.5 : 1, fontSize: '14px' }}>Wstecz</button>
            <button onClick={() => setCurrentStep((p) => Math.min(9, p + 1))} disabled={currentStep === 9} style={{ padding: '8px 20px', border: 'none', borderRadius: '6px', background: currentStep === 9 ? '#9ca3af' : '#3b82f6', color: '#fff', cursor: currentStep === 9 ? 'not-allowed' : 'pointer', fontSize: '14px' }}>{currentStep === 9 ? 'Zakończ' : 'Dalej'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
