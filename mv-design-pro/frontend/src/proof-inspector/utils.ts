import type { ProofViewMode, StepGroup, StepView, ViewConfig } from './types';

const STEP_GROUP_DEFINITIONS = [
  {
    key: 'SC3F',
    label: 'SC3F',
    matcher: (step: StepView) => step.step_id.startsWith('SC3F'),
  },
  {
    key: 'VDROP',
    label: 'VDROP',
    matcher: (step: StepView) => step.step_id.startsWith('VDROP'),
  },
  {
    key: 'QU',
    label: 'Q(U)',
    matcher: (step: StepView) =>
      step.step_id.startsWith('QU') || step.step_id.includes('Q_U'),
  },
  {
    key: 'SC1',
    label: 'SC1',
    matcher: (step: StepView) => step.step_id.startsWith('SC1'),
  },
];

export function filterSteps(steps: StepView[], query: string): StepView[] {
  if (!query.trim()) return steps;
  const normalized = query.trim().toLowerCase();
  return steps.filter((step) => {
    const haystack = `${step.title} ${step.equation_id}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function groupStepsByCategory(steps: StepView[]): StepGroup[] {
  const groups: StepGroup[] = STEP_GROUP_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    steps: [],
  }));

  steps.forEach((step) => {
    const target = STEP_GROUP_DEFINITIONS.find((definition) =>
      definition.matcher(step)
    );
    const group = groups.find((item) => item.key === target?.key);
    if (group) {
      group.steps.push(step);
    }
  });

  return groups;
}

export function getViewConfig(mode: ProofViewMode): ViewConfig {
  switch (mode) {
    case 'EXECUTIVE':
      return {
        showSummary: true,
        showSteps: false,
        showUnitChecks: false,
        showMappingKeys: false,
        showAcademicDetails: false,
      };
    case 'ACADEMIC':
      return {
        showSummary: true,
        showSteps: true,
        showUnitChecks: true,
        showMappingKeys: true,
        showAcademicDetails: true,
      };
    default:
      return {
        showSummary: true,
        showSteps: true,
        showUnitChecks: true,
        showMappingKeys: true,
        showAcademicDetails: false,
      };
  }
}

export function buildExportFilename(
  documentId: string,
  runId: string | undefined,
  extension: 'json' | 'tex' | 'pdf'
): string {
  const safeDocument = documentId.toLowerCase();
  const safeRun = runId ? runId.toLowerCase() : 'run-unknown';
  return `proof_${safeDocument}_${safeRun}.${extension}`;
}

export function getAnalysisLabel(proofType: string): string {
  const mapping: Record<string, string> = {
    SC3F_IEC60909: 'Zwarcie trójfazowe IEC 60909',
    VDROP: 'Spadek napięcia VDROP',
    QU: 'Regulacja Q(U)',
    SC1F_IEC60909: 'Zwarcie jednofazowe (SC1)',
    SC2F_IEC60909: 'Zwarcie dwufazowe (SC2)',
    SC2FG_IEC60909: 'Zwarcie dwufazowe z ziemią (SC2FG)',
  };
  return mapping[proofType] ?? proofType;
}

export function formatUnitCheckStatus(passed: boolean): string {
  return passed ? 'PASS' : 'FAIL';
}
