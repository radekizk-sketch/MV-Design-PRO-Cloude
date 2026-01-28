import { useEffect, useMemo, useState } from 'react';

import type {
  ExportAvailability,
  InspectorView,
  ProofViewMode,
  StepView,
} from './types';
import { sampleProofData } from './sampleData';
import {
  buildExportFilename,
  filterSteps,
  formatUnitCheckStatus,
  getAnalysisLabel,
  getViewConfig,
  groupStepsByCategory,
} from './utils';

interface ProofInspectorPageProps {
  data?: InspectorView;
}

type ActiveTab = 'STEPS' | 'COUNTERFACTUAL';

function resolveExportAvailability(data: InspectorView): ExportAvailability {
  return {
    json: data.export_availability?.json ?? Boolean(data.export_payloads?.json),
    latex: data.export_availability?.latex ?? Boolean(data.export_payloads?.latex),
    pdf: data.export_availability?.pdf ?? Boolean(data.export_payloads?.pdfBase64),
  };
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadPdf(filename: string, base64: string) {
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = filename;
  link.click();
}

function getStepStatusBadge(step: StepView) {
  const status = formatUnitCheckStatus(step.unit_check.passed);
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${
        step.unit_check.passed
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700'
      }`}
    >
      {status}
    </span>
  );
}

export function ProofInspectorPage({ data = sampleProofData }: ProofInspectorPageProps) {
  const [viewMode, setViewMode] = useState<ProofViewMode>('ENGINEERING');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('STEPS');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    data.steps[0]?.step_id ?? null
  );

  const filteredSteps = useMemo(() => filterSteps(data.steps, search), [data, search]);
  const groups = useMemo(() => groupStepsByCategory(filteredSteps), [filteredSteps]);
  const config = useMemo(() => getViewConfig(viewMode), [viewMode]);
  const exportAvailability = useMemo(
    () => resolveExportAvailability(data),
    [data]
  );

  const selectedStep = useMemo(
    () => data.steps.find((step) => step.step_id === selectedStepId) ?? null,
    [data, selectedStepId]
  );

  useEffect(() => {
    if (!selectedStepId && filteredSteps.length > 0) {
      setSelectedStepId(filteredSteps[0].step_id);
      return;
    }
    if (
      selectedStepId &&
      filteredSteps.length > 0 &&
      !filteredSteps.find((step) => step.step_id === selectedStepId)
    ) {
      setSelectedStepId(filteredSteps[0].step_id);
    }
  }, [filteredSteps, selectedStepId]);

  const orderedStepIds = useMemo(
    () => filteredSteps.map((step) => step.step_id),
    [filteredSteps]
  );

  const handleTreeKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.target as HTMLElement;
    const stepId = target.getAttribute('data-step-id');
    if (!stepId) return;
    const currentIndex = orderedStepIds.indexOf(stepId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, orderedStepIds.length - 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = orderedStepIds.length - 1;

    const nextId = orderedStepIds[nextIndex];
    const nextButton = document.querySelector<HTMLButtonElement>(
      `[data-step-id="${nextId}"]`
    );
    nextButton?.focus();
  };

  const handleExport = (type: 'json' | 'latex' | 'pdf') => {
    const runId = data.header.run_id;
    if (type === 'json' && data.export_payloads?.json) {
      downloadText(buildExportFilename(data.document_id, runId, 'json'), data.export_payloads.json);
    }
    if (type === 'latex' && data.export_payloads?.latex) {
      downloadText(buildExportFilename(data.document_id, runId, 'tex'), data.export_payloads.latex);
    }
    if (type === 'pdf' && data.export_payloads?.pdfBase64) {
      downloadPdf(buildExportFilename(data.document_id, runId, 'pdf'), data.export_payloads.pdfBase64);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Proof Inspector</p>
              <h1 className="text-2xl font-semibold text-slate-900">{data.title}</h1>
              <p className="text-sm text-slate-500">
                Analiza: {data.header.analysis_label ?? getAnalysisLabel(data.proof_type)}
              </p>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Tylko do odczytu
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="space-y-1">
              <p>
                <span className="font-semibold text-slate-700">Projekt:</span>{' '}
                {data.header.project_name}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Przypadek:</span>{' '}
                {data.header.case_name}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Run:</span>{' '}
                {data.header.run_id ?? '—'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Snapshot:</span>{' '}
                {data.header.snapshot_id ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <span className="font-semibold text-slate-700">Wersja solvera:</span>{' '}
                {data.header.solver_version}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Timestamp:</span>{' '}
                {data.header.run_timestamp}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Fingerprint:</span>{' '}
                {data.header.fingerprint ?? '—'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">PCC – punkt wspólnego przyłączenia:</span>{' '}
                {data.header.fault_location ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded border border-slate-200 bg-white p-1">
            {([
              { id: 'EXECUTIVE', label: 'Executive' },
              { id: 'ENGINEERING', label: 'Engineering' },
              { id: 'ACADEMIC', label: 'Academic' },
            ] as const).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                aria-label={`Przełącz tryb ${mode.label}`}
                className={`rounded px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                  viewMode === mode.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={!exportAvailability.json}
              aria-label="Eksportuj proof.json"
              className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => handleExport('latex')}
              disabled={!exportAvailability.latex}
              aria-label="Eksportuj proof.tex"
              className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              LaTeX
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={!exportAvailability.pdf}
              aria-label="Eksportuj proof.pdf"
              className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              PDF
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex gap-2 border-b border-slate-200 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('STEPS')}
              aria-label="Pokaż kroki dowodu"
              className={`px-4 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                activeTab === 'STEPS'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Kroki dowodu
            </button>
            {data.counterfactual && (
              <button
                type="button"
                onClick={() => setActiveTab('COUNTERFACTUAL')}
                aria-label="Pokaż porównanie A/B"
                className={`px-4 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                  activeTab === 'COUNTERFACTUAL'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Porównanie A/B
              </button>
            )}
          </div>

          {activeTab === 'COUNTERFACTUAL' && data.counterfactual ? (
            <div className="mt-4 rounded border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-800">Porównanie A/B</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kliknij wiersz, aby przejść do odpowiadającego kroku w drzewie.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Wielkość</th>
                      <th className="px-3 py-2">A</th>
                      <th className="px-3 py-2">B</th>
                      <th className="px-3 py-2">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.counterfactual.rows.map((row) => (
                      <tr
                        key={row.name}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 font-medium text-slate-700">
                          <button
                            type="button"
                            onClick={() => row.step_id && setSelectedStepId(row.step_id)}
                            aria-label={`Skok do kroku ${row.step_id ?? row.name}`}
                            className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                          >
                            {row.symbol_latex} ({row.unit})
                          </button>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.value_a}</td>
                        <td className="px-3 py-2 text-slate-600">{row.value_b}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{row.delta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
              {config.showSteps ? (
                <aside className="rounded border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">Drzewo dowodu</h2>
                  </div>
                  <div className="mt-4">
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Filtruj po tytule lub equation_id"
                      aria-label="Filtruj kroki dowodu"
                      className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                    />
                  </div>
                  <div className="mt-4 space-y-4" role="tree" onKeyDown={handleTreeKeyDown}>
                    {groups.map((group) => (
                      <div key={group.key}>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          {group.label}
                        </p>
                        <ul className="mt-2 space-y-2">
                          {group.steps.length === 0 ? (
                            <li className="text-xs text-slate-400">Brak kroków</li>
                          ) : (
                            group.steps.map((step) => (
                              <li key={step.step_id}>
                                <button
                                  type="button"
                                  data-step-id={step.step_id}
                                  onClick={() => setSelectedStepId(step.step_id)}
                                  aria-label={`Krok ${step.step_number}: ${step.title} (${step.equation_id})`}
                                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                                    step.step_id === selectedStepId
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium text-slate-800">
                                      {step.step_number}. {step.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {step.equation_id}
                                    </p>
                                  </div>
                                  {getStepStatusBadge(step)}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </aside>
              ) : null}

              <section className="rounded border border-slate-200 bg-white p-4">
                {config.showSummary && (
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-800">Podsumowanie</h2>
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          data.summary.unit_check_passed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        Jednostki: {data.summary.unit_check_passed ? 'PASS' : 'CHECK'}
                      </span>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="px-3 py-2">Wielkość</th>
                            <th className="px-3 py-2">Wartość</th>
                            <th className="px-3 py-2">Jednostka</th>
                            <th className="px-3 py-2">Mapping key</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.summary.key_results).map(([key, value]) => (
                            <tr key={key} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-medium text-slate-700">
                                {value.symbol}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{value.value}</td>
                              <td className="px-3 py-2 text-slate-600">{value.unit}</td>
                              <td className="px-3 py-2 text-xs text-slate-400">{value.mapping_key}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {data.summary.warnings && data.summary.warnings.length > 0 && (
                      <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        {data.summary.warnings.map((warning) => (
                          <p key={warning}>{warning}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {config.showSteps && selectedStep ? (
                  <div className="mt-6 space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Szczegóły kroku</h2>
                      <p className="text-sm text-slate-500">
                        {selectedStep.step_number}. {selectedStep.title} · {selectedStep.equation_id}
                      </p>
                    </div>

                    <section className="rounded border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold text-slate-700">WZÓR</h3>
                      <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {selectedStep.formula_latex}
                      </p>
                      {config.showAcademicDetails && selectedStep.standard_ref && (
                        <p className="mt-2 text-xs text-slate-500">
                          Norma: {selectedStep.standard_ref}
                        </p>
                      )}
                    </section>

                    <section className="rounded border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold text-slate-700">DANE</h3>
                      <div className="mt-2 space-y-2">
                        {selectedStep.input_values.map((value) => (
                          <div key={value.mapping_key} className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-slate-700">{value.symbol}</span>
                            <span className="text-slate-600">
                              {value.value} {value.unit}
                            </span>
                            {config.showAcademicDetails && value.raw_value !== undefined && (
                              <span className="text-xs text-slate-400">raw: {value.raw_value}</span>
                            )}
                            {config.showMappingKeys && (
                              <span className="text-xs text-slate-400">
                                mapping: {value.mapping_key}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold text-slate-700">PODSTAWIENIE</h3>
                      <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {selectedStep.substitution_latex}
                      </p>
                    </section>

                    <section className="rounded border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold text-slate-700">WYNIK</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-800">{selectedStep.result.symbol}</span>
                        <span className="text-slate-600">
                          {selectedStep.result.value} {selectedStep.result.unit}
                        </span>
                        {config.showMappingKeys && (
                          <span className="text-xs text-slate-400">
                            mapping: {selectedStep.result.mapping_key}
                          </span>
                        )}
                      </div>
                    </section>

                    {config.showUnitChecks && (
                      <section className="rounded border border-slate-200 p-4">
                        <h3 className="text-sm font-semibold text-slate-700">JEDNOSTKI</h3>
                        <div className="mt-2 text-sm text-slate-600">
                          <p>Status: {formatUnitCheckStatus(selectedStep.unit_check.passed)}</p>
                          <p>Oczekiwana: {selectedStep.unit_check.expected_unit}</p>
                          <p>Obliczona: {selectedStep.unit_check.computed_unit}</p>
                          <p>Derywacja: {selectedStep.unit_check.derivation}</p>
                        </div>
                      </section>
                    )}
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
