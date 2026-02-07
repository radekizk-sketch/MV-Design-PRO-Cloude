/**
 * wizardStateMachine — Deterministyczny automat stanu kreatora sieci
 *
 * Czyste funkcje (bez hookow React).
 * Ten sam ENM → identyczny stan kreatora.
 *
 * BINDING: Etykiety PL, bez nazw kodowych.
 */

import type { EnergyNetworkModel } from '../../types/enm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepStatus = 'empty' | 'partial' | 'complete' | 'error';

export interface StepState {
  readonly stepId: string;
  readonly status: StepStatus;
  readonly completionPercent: number;
  readonly issues: readonly StepIssue[];
}

export interface StepIssue {
  readonly code: string;
  readonly severity: 'BLOCKER' | 'IMPORTANT' | 'INFO';
  readonly messagePl: string;
  readonly elementRef?: string;
}

export interface WizardState {
  readonly steps: readonly StepState[];
  readonly overallStatus: 'empty' | 'incomplete' | 'ready' | 'blocked';
  readonly readinessMatrix: ReadinessMatrix;
  readonly elementCounts: ElementCounts;
}

export interface ReadinessMatrix {
  readonly shortCircuit3F: AnalysisReadiness;
  readonly shortCircuit1F: AnalysisReadiness;
  readonly loadFlow: AnalysisReadiness;
}

export interface AnalysisReadiness {
  readonly available: boolean;
  readonly missingRequirements: readonly string[];
}

export interface ElementCounts {
  readonly buses: number;
  readonly sources: number;
  readonly transformers: number;
  readonly branches: number;
  readonly loads: number;
  readonly generators: number;
}

// ---------------------------------------------------------------------------
// Step evaluation functions (K1-K10)
// ---------------------------------------------------------------------------

function evaluateK1(enm: EnergyNetworkModel): StepState {
  const issues: StepIssue[] = [];
  let completion = 0;

  if (enm.header.name && enm.header.name.trim().length > 0) {
    completion += 50;
  } else {
    issues.push({ code: 'K1_NO_NAME', severity: 'BLOCKER', messagePl: 'Brak nazwy projektu' });
  }

  if (enm.header.defaults.frequency_hz > 0) {
    completion += 50;
  }

  const status: StepStatus = issues.some(i => i.severity === 'BLOCKER')
    ? 'error' : completion === 100 ? 'complete' : completion > 0 ? 'partial' : 'empty';

  return { stepId: 'K1', status, completionPercent: completion, issues };
}

function evaluateK2(enm: EnergyNetworkModel): StepState {
  const issues: StepIssue[] = [];
  let completion = 0;

  const sourceBus = enm.buses.find(b => b.tags.includes('source'));
  if (sourceBus) {
    completion += 34;
    if (sourceBus.voltage_kv > 0) completion += 33;
  } else {
    issues.push({ code: 'K2_NO_SOURCE_BUS', severity: 'BLOCKER', messagePl: 'Brak szyny źródłowej' });
  }

  if (enm.sources.length > 0) {
    completion += 33;
    const src = enm.sources[0];
    if (!src.sk3_mva && !src.r_ohm) {
      issues.push({ code: 'K2_SOURCE_INCOMPLETE', severity: 'IMPORTANT', messagePl: 'Źródło bez parametrów zwarciowych' });
    }
  } else {
    issues.push({ code: 'K2_NO_SOURCE', severity: 'BLOCKER', messagePl: 'Brak źródła zasilania' });
  }

  const status: StepStatus = issues.some(i => i.severity === 'BLOCKER')
    ? 'error' : completion >= 90 ? 'complete' : completion > 0 ? 'partial' : 'empty';

  return { stepId: 'K2', status, completionPercent: Math.min(100, completion), issues };
}

function evaluateK3(enm: EnergyNetworkModel): StepState {
  const issues: StepIssue[] = [];
  const busCnt = enm.buses.length;
  const completion = busCnt > 0 ? 100 : 0;

  if (busCnt === 0) {
    issues.push({ code: 'K3_NO_BUSES', severity: 'BLOCKER', messagePl: 'Brak szyn w modelu' });
  }

  const status: StepStatus = busCnt > 0 ? 'complete' : 'empty';
  return { stepId: 'K3', status, completionPercent: completion, issues };
}

function evaluateK4(enm: EnergyNetworkModel): StepState {
  const issues: StepIssue[] = [];
  const lines = enm.branches.filter(b => b.type === 'line_overhead' || b.type === 'cable');
  const completion = lines.length > 0 ? 100 : 0;

  for (const line of lines) {
    if (!enm.buses.some(b => b.ref_id === line.from_bus_ref)) {
      issues.push({ code: 'K4_DANGLING_FROM', severity: 'BLOCKER', messagePl: `Gałąź ${line.name}: szyna źródłowa nie istnieje`, elementRef: line.ref_id });
    }
    if (!enm.buses.some(b => b.ref_id === line.to_bus_ref)) {
      issues.push({ code: 'K4_DANGLING_TO', severity: 'BLOCKER', messagePl: `Gałąź ${line.name}: szyna docelowa nie istnieje`, elementRef: line.ref_id });
    }
  }

  const status: StepStatus = issues.some(i => i.severity === 'BLOCKER')
    ? 'error' : lines.length > 0 ? 'complete' : 'empty';

  return { stepId: 'K4', status, completionPercent: completion, issues };
}

function evaluateK5(enm: EnergyNetworkModel): StepState {
  const issues: StepIssue[] = [];
  const trafoCnt = enm.transformers.length;
  const completion = trafoCnt > 0 ? 100 : 0;

  for (const t of enm.transformers) {
    if (t.uk_percent <= 0) {
      issues.push({ code: 'K5_UK_ZERO', severity: 'BLOCKER', messagePl: `Trafo ${t.name}: uk% = 0`, elementRef: t.ref_id });
    }
    if (t.sn_mva <= 0) {
      issues.push({ code: 'K5_SN_ZERO', severity: 'BLOCKER', messagePl: `Trafo ${t.name}: Sn = 0`, elementRef: t.ref_id });
    }
  }

  // Transformers are optional - not a blocker if missing
  const status: StepStatus = issues.some(i => i.severity === 'BLOCKER')
    ? 'error' : trafoCnt > 0 ? 'complete' : 'empty';

  return { stepId: 'K5', status, completionPercent: completion, issues };
}

function evaluateK6(enm: EnergyNetworkModel): StepState {
  const issues: StepIssue[] = [];
  const loadCnt = enm.loads.length + enm.generators.length;
  const completion = loadCnt > 0 ? 100 : 0;

  for (const ld of enm.loads) {
    if (!enm.buses.some(b => b.ref_id === ld.bus_ref)) {
      issues.push({ code: 'K6_LOAD_DANGLING', severity: 'BLOCKER', messagePl: `Odbiór ${ld.name}: szyna nie istnieje`, elementRef: ld.ref_id });
    }
  }

  const status: StepStatus = issues.some(i => i.severity === 'BLOCKER')
    ? 'error' : loadCnt > 0 ? 'complete' : 'empty';

  return { stepId: 'K6', status, completionPercent: completion, issues };
}

function evaluateK7(enm: EnergyNetworkModel): StepState {
  const issues: StepIssue[] = [];
  const lines = enm.branches.filter(b => b.type === 'line_overhead' || b.type === 'cable');
  const linesWithoutZ0 = lines.filter(l => {
    const lo = l as any;
    return lo.r0_ohm_per_km == null && lo.x0_ohm_per_km == null;
  });
  const srcWithoutZ0 = enm.sources.filter(s => s.r0_ohm == null && s.x0_ohm == null && s.z0_z1_ratio == null);

  if (linesWithoutZ0.length > 0) {
    issues.push({ code: 'K7_LINES_NO_Z0', severity: 'INFO', messagePl: `${linesWithoutZ0.length} gałęzi bez impedancji zerowej Z0` });
  }
  if (srcWithoutZ0.length > 0) {
    issues.push({ code: 'K7_SRC_NO_Z0', severity: 'INFO', messagePl: `${srcWithoutZ0.length} źródeł bez impedancji zerowej Z0` });
  }

  const total = lines.length + enm.sources.length;
  const withZ0 = (lines.length - linesWithoutZ0.length) + (enm.sources.length - srcWithoutZ0.length);
  const completion = total > 0 ? Math.round((withZ0 / total) * 100) : 100;

  return { stepId: 'K7', status: completion === 100 ? 'complete' : 'partial', completionPercent: completion, issues };
}

function evaluateK8(wizardSteps: StepState[]): StepState {
  const issues: StepIssue[] = [];
  const blockerSteps = wizardSteps.filter(s => s.status === 'error' && s.stepId !== 'K8');

  if (blockerSteps.length > 0) {
    issues.push({
      code: 'K8_HAS_BLOCKERS',
      severity: 'BLOCKER',
      messagePl: `${blockerSteps.length} kroków z blokerami: ${blockerSteps.map(s => s.stepId).join(', ')}`,
    });
  }

  const completion = blockerSteps.length === 0 ? 100 : 0;
  const status: StepStatus = blockerSteps.length === 0 ? 'complete' : 'error';
  return { stepId: 'K8', status, completionPercent: completion, issues };
}

// K9 and K10 are always "complete" as they are display/action steps
function evaluateK9(): StepState {
  return { stepId: 'K9', status: 'complete', completionPercent: 100, issues: [] };
}

function evaluateK10(readiness: ReadinessMatrix): StepState {
  const available = readiness.shortCircuit3F.available || readiness.loadFlow.available;
  return { stepId: 'K10', status: available ? 'complete' : 'partial', completionPercent: available ? 100 : 50, issues: [] };
}

// ---------------------------------------------------------------------------
// Readiness matrix
// ---------------------------------------------------------------------------

function computeReadiness(enm: EnergyNetworkModel, steps: StepState[]): ReadinessMatrix {
  const hasBlockers = steps.some(s => s.status === 'error' && s.stepId !== 'K8' && s.stepId !== 'K9' && s.stepId !== 'K10');
  const hasBuses = enm.buses.length > 0;
  const hasSources = enm.sources.length > 0;
  const hasBranches = enm.branches.length > 0 || enm.transformers.length > 0;

  // Short circuit 3F: needs bus + source + at least one connection
  const sc3fMissing: string[] = [];
  if (!hasBuses) sc3fMissing.push('Brak szyn');
  if (!hasSources) sc3fMissing.push('Brak źródła zasilania');
  if (!hasBranches) sc3fMissing.push('Brak gałęzi lub transformatorów');
  if (hasBlockers) sc3fMissing.push('Model zawiera blokery');

  // Short circuit 1F: needs Z0 data in addition
  const lines = enm.branches.filter(b => b.type === 'line_overhead' || b.type === 'cable');
  const allHaveZ0 = lines.every(l => {
    const lo = l as any;
    return lo.r0_ohm_per_km != null || lo.x0_ohm_per_km != null;
  });
  const srcHaveZ0 = enm.sources.every(s => s.r0_ohm != null || s.x0_ohm != null || s.z0_z1_ratio != null);
  const sc1fMissing = [...sc3fMissing];
  if (!allHaveZ0) sc1fMissing.push('Brak Z0 w gałęziach');
  if (!srcHaveZ0) sc1fMissing.push('Brak Z0 w źródłach');

  // Load flow: needs bus + source + loads with P/Q
  const lfMissing: string[] = [];
  if (!hasBuses) lfMissing.push('Brak szyn');
  if (!hasSources) lfMissing.push('Brak źródła zasilania');
  if (enm.loads.length === 0 && enm.generators.length === 0) lfMissing.push('Brak odbiorów lub generatorów');
  if (hasBlockers) lfMissing.push('Model zawiera blokery');

  return {
    shortCircuit3F: { available: sc3fMissing.length === 0, missingRequirements: sc3fMissing },
    shortCircuit1F: { available: sc1fMissing.length === 0, missingRequirements: sc1fMissing },
    loadFlow: { available: lfMissing.length === 0, missingRequirements: lfMissing },
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute the complete wizard state from ENM.
 * DETERMINISTIC: same ENM → identical state.
 */
export function computeWizardState(enm: EnergyNetworkModel): WizardState {
  const k1 = evaluateK1(enm);
  const k2 = evaluateK2(enm);
  const k3 = evaluateK3(enm);
  const k4 = evaluateK4(enm);
  const k5 = evaluateK5(enm);
  const k6 = evaluateK6(enm);
  const k7 = evaluateK7(enm);
  const prereqSteps = [k1, k2, k3, k4, k5, k6, k7];

  const k8 = evaluateK8(prereqSteps);
  const readiness = computeReadiness(enm, prereqSteps);
  const k9 = evaluateK9();
  const k10 = evaluateK10(readiness);

  const steps = [...prereqSteps, k8, k9, k10];

  const hasBlockers = steps.some(s => s.status === 'error');
  // Required steps: K1 (name), K2 (source), K3 (buses). Optional: K4-K7 (may be empty).
  const requiredSteps = prereqSteps.filter(s => ['K1', 'K2', 'K3'].includes(s.stepId));
  const requiredComplete = requiredSteps.every(s => s.status === 'complete');
  const optionalOk = prereqSteps.filter(s => !['K1', 'K2', 'K3'].includes(s.stepId)).every(s => s.status === 'complete' || s.status === 'empty' || s.status === 'partial');
  const anyData = enm.buses.length > 0 || enm.sources.length > 0;

  let overallStatus: WizardState['overallStatus'];
  if (hasBlockers) overallStatus = 'blocked';
  else if (requiredComplete && optionalOk) overallStatus = 'ready';
  else if (anyData) overallStatus = 'incomplete';
  else overallStatus = 'empty';

  return {
    steps,
    overallStatus,
    readinessMatrix: readiness,
    elementCounts: {
      buses: enm.buses.length,
      sources: enm.sources.length,
      transformers: enm.transformers.length,
      branches: enm.branches.length,
      loads: enm.loads.length,
      generators: enm.generators.length,
    },
  };
}

/**
 * Get step status color for UI.
 */
export function getStepStatusColor(status: StepStatus): string {
  switch (status) {
    case 'complete': return '#22c55e';
    case 'partial': return '#eab308';
    case 'error': return '#ef4444';
    case 'empty':
    default: return '#d1d5db';
  }
}

/**
 * Get overall status label (Polish).
 */
export function getOverallStatusLabel(status: WizardState['overallStatus']): string {
  switch (status) {
    case 'ready': return 'Gotowy do obliczeń';
    case 'incomplete': return 'W trakcie';
    case 'blocked': return 'Blokery';
    case 'empty':
    default: return 'Pusty';
  }
}
