/**
 * P11b — Results Export (CSV/PDF)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Export functionality like PowerFactory
 * - wizard_screens.md: RESULT_VIEW mode, Polish labels
 * - SYSTEM_SPEC.md: READ-ONLY, no mutations
 *
 * FEATURES:
 * - CSV export with Polish column headers
 * - PDF export via browser print dialog
 * - Respects active tab (Szyny/Gałęzie/Zwarcia)
 * - Header: projekt / przypadek / data
 *
 * 100% POLISH UI
 */

import { useCallback, useRef, useState } from 'react';
import type { BusResultRow, BranchResultRow, ShortCircuitRow, ResultsInspectorTab, RunHeader } from './types';

// =============================================================================
// Types
// =============================================================================

interface ExportData {
  activeTab: ResultsInspectorTab;
  busRows: BusResultRow[];
  branchRows: BranchResultRow[];
  shortCircuitRows: ShortCircuitRow[];
  runHeader: RunHeader;
  projectName?: string;
  caseName?: string;
}

interface ResultsExportProps {
  exportData: ExportData;
}

// =============================================================================
// CSV Column Definitions (Polish)
// =============================================================================

const BUS_CSV_COLUMNS = [
  { key: 'name', label: 'Nazwa' },
  { key: 'bus_id', label: 'ID węzła' },
  { key: 'un_kv', label: 'Un [kV]' },
  { key: 'u_kv', label: 'U [kV]' },
  { key: 'u_pu', label: 'U [pu]' },
  { key: 'angle_deg', label: 'Kąt [°]' },
  { key: 'flags', label: 'Flagi' },
] as const;

const BRANCH_CSV_COLUMNS = [
  { key: 'name', label: 'Nazwa' },
  { key: 'branch_id', label: 'ID gałęzi' },
  { key: 'from_bus', label: 'Od węzła' },
  { key: 'to_bus', label: 'Do węzła' },
  { key: 'i_a', label: 'I [A]' },
  { key: 'p_mw', label: 'P [MW]' },
  { key: 'q_mvar', label: 'Q [Mvar]' },
  { key: 's_mva', label: 'S [MVA]' },
  { key: 'loading_pct', label: 'Obciążenie [%]' },
  { key: 'flags', label: 'Flagi' },
] as const;

const SHORT_CIRCUIT_CSV_COLUMNS = [
  { key: 'target_name', label: 'Węzeł zwarcia' },
  { key: 'target_id', label: 'ID węzła' },
  { key: 'fault_type', label: 'Rodzaj zwarcia' },
  { key: 'ikss_ka', label: "Ik'' [kA]" },
  { key: 'ip_ka', label: 'ip [kA]' },
  { key: 'ith_ka', label: 'Ith [kA]' },
  { key: 'sk_mva', label: "Sk'' [MVA]" },
] as const;

const TAB_LABELS: Record<ResultsInspectorTab, string> = {
  BUSES: 'Szyny',
  BRANCHES: 'Gałęzie',
  SHORT_CIRCUIT: 'Zwarcia',
  TRACE: 'Ślad obliczeń',
};

const FLAG_LABELS: Record<string, string> = {
  SLACK: 'Węzeł bilansujący',
  VOLTAGE_VIOLATION: 'Naruszenie napięcia',
  OVERLOADED: 'Przeciążenie',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatNumber(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '';
  return value.toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatFlags(flags: string[]): string {
  if (!flags || flags.length === 0) return '';
  return flags.map((flag) => FLAG_LABELS[flag] ?? flag).join(', ');
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString('pl-PL');
  } catch {
    return isoDate;
  }
}

function escapeCSVField(value: string): string {
  // If value contains comma, newline, or quote - wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// =============================================================================
// CSV Generation
// =============================================================================

function generateBusCSV(rows: BusResultRow[]): string {
  const header = BUS_CSV_COLUMNS.map((col) => escapeCSVField(col.label)).join(';');
  const dataRows = rows.map((row) =>
    [
      escapeCSVField(row.name),
      escapeCSVField(row.bus_id),
      formatNumber(row.un_kv, 1),
      formatNumber(row.u_kv, 3),
      formatNumber(row.u_pu, 4),
      formatNumber(row.angle_deg, 2),
      escapeCSVField(formatFlags(row.flags)),
    ].join(';')
  );
  return [header, ...dataRows].join('\n');
}

function generateBranchCSV(rows: BranchResultRow[]): string {
  const header = BRANCH_CSV_COLUMNS.map((col) => escapeCSVField(col.label)).join(';');
  const dataRows = rows.map((row) =>
    [
      escapeCSVField(row.name),
      escapeCSVField(row.branch_id),
      escapeCSVField(row.from_bus),
      escapeCSVField(row.to_bus),
      formatNumber(row.i_a, 1),
      formatNumber(row.p_mw, 3),
      formatNumber(row.q_mvar, 3),
      formatNumber(row.s_mva, 3),
      formatNumber(row.loading_pct, 1),
      escapeCSVField(formatFlags(row.flags)),
    ].join(';')
  );
  return [header, ...dataRows].join('\n');
}

function generateShortCircuitCSV(rows: ShortCircuitRow[]): string {
  const header = SHORT_CIRCUIT_CSV_COLUMNS.map((col) => escapeCSVField(col.label)).join(';');
  const dataRows = rows.map((row) =>
    [
      escapeCSVField(row.target_name ?? ''),
      escapeCSVField(row.target_id),
      escapeCSVField(row.fault_type ?? ''),
      formatNumber(row.ikss_ka, 3),
      formatNumber(row.ip_ka, 3),
      formatNumber(row.ith_ka, 3),
      formatNumber(row.sk_mva, 1),
    ].join(';')
  );
  return [header, ...dataRows].join('\n');
}

function downloadCSV(content: string, filename: string): void {
  // BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =============================================================================
// PDF Print View Component
// =============================================================================

interface PrintViewProps {
  exportData: ExportData;
  onClose: () => void;
}

function PrintView({ exportData, onClose }: PrintViewProps) {
  const { activeTab, busRows, branchRows, shortCircuitRows, runHeader, projectName, caseName } = exportData;
  const printContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Determine which data to show based on active tab
  const getTableContent = () => {
    switch (activeTab) {
      case 'BUSES':
        return (
          <table className="print-table">
            <thead>
              <tr>
                {BUS_CSV_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {busRows.map((row) => (
                <tr key={row.bus_id}>
                  <td>{row.name}</td>
                  <td className="mono">{row.bus_id.substring(0, 8)}...</td>
                  <td className="num">{formatNumber(row.un_kv, 1)}</td>
                  <td className="num">{formatNumber(row.u_kv, 3)}</td>
                  <td className="num">{formatNumber(row.u_pu, 4)}</td>
                  <td className="num">{formatNumber(row.angle_deg, 2)}</td>
                  <td>{formatFlags(row.flags)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'BRANCHES':
        return (
          <table className="print-table">
            <thead>
              <tr>
                {BRANCH_CSV_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branchRows.map((row) => (
                <tr key={row.branch_id}>
                  <td>{row.name}</td>
                  <td className="mono">{row.branch_id.substring(0, 8)}...</td>
                  <td className="mono">{row.from_bus.substring(0, 8)}...</td>
                  <td className="mono">{row.to_bus.substring(0, 8)}...</td>
                  <td className="num">{formatNumber(row.i_a, 1)}</td>
                  <td className="num">{formatNumber(row.p_mw, 3)}</td>
                  <td className="num">{formatNumber(row.q_mvar, 3)}</td>
                  <td className="num">{formatNumber(row.s_mva, 3)}</td>
                  <td className="num">{formatNumber(row.loading_pct, 1)}</td>
                  <td>{formatFlags(row.flags)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'SHORT_CIRCUIT':
        return (
          <table className="print-table">
            <thead>
              <tr>
                {SHORT_CIRCUIT_CSV_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shortCircuitRows.map((row) => (
                <tr key={row.target_id}>
                  <td>{row.target_name ?? row.target_id.substring(0, 8)}</td>
                  <td className="mono">{row.target_id.substring(0, 8)}...</td>
                  <td>{row.fault_type ?? '—'}</td>
                  <td className="num">{formatNumber(row.ikss_ka, 3)}</td>
                  <td className="num">{formatNumber(row.ip_ka, 3)}</td>
                  <td className="num">{formatNumber(row.ith_ka, 3)}</td>
                  <td className="num">{formatNumber(row.sk_mva, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return <p>Eksport PDF niedostępny dla tej zakładki.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white" data-testid="print-view">
      {/* Screen-only header with controls */}
      <div className="print:hidden border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Podgląd wydruku</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrint}
              data-testid="export-print-btn"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Drukuj / Zapisz PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="export-close-btn"
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printContainerRef} className="p-8 print:p-0">
        {/* Print header */}
        <div className="mb-6 border-b border-slate-300 pb-4 print:mb-4 print:pb-2">
          <h1 className="text-xl font-bold text-slate-900 print:text-lg">
            MV-DESIGN PRO — Wyniki analizy
          </h1>
          <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600 print:text-xs">
            <div>
              <span className="font-medium">Projekt:</span> {projectName ?? runHeader.project_id.substring(0, 8)}
            </div>
            <div>
              <span className="font-medium">Przypadek:</span> {caseName ?? runHeader.case_id.substring(0, 8)}
            </div>
            <div>
              <span className="font-medium">Data eksportu:</span> {formatDate(new Date().toISOString())}
            </div>
            <div>
              <span className="font-medium">Data obliczeń:</span> {formatDate(runHeader.created_at)}
            </div>
            <div>
              <span className="font-medium">Run ID:</span>{' '}
              <span className="font-mono">{runHeader.run_id.substring(0, 8)}</span>
            </div>
            <div>
              <span className="font-medium">Zakładka:</span> {TAB_LABELS[activeTab]}
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="overflow-x-auto">
          {getTableContent()}
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-slate-500 print:mt-4">
          <p>Wygenerowano przez MV-DESIGN PRO</p>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [data-testid="print-view"],
          [data-testid="print-view"] * {
            visibility: visible;
          }
          [data-testid="print-view"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        @media print {
          .print-table {
            font-size: 0.75rem;
          }
        }
        .print-table th,
        .print-table td {
          border: 1px solid #e2e8f0;
          padding: 0.5rem;
          text-align: left;
        }
        .print-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #334155;
        }
        .print-table td.num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .print-table td.mono {
          font-family: monospace;
          font-size: 0.75rem;
        }
        .print-table tr:nth-child(even) {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Main Export Component
// =============================================================================

export function ResultsExport({ exportData }: ResultsExportProps) {
  const [showPrintView, setShowPrintView] = useState(false);
  const { activeTab, busRows, branchRows, shortCircuitRows } = exportData;

  // Determine if export is available for current tab
  const isExportAvailable = activeTab !== 'TRACE';

  const handleExportCSV = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const tabSuffix = activeTab.toLowerCase();

    let csvContent: string;
    switch (activeTab) {
      case 'BUSES':
        csvContent = generateBusCSV(busRows);
        break;
      case 'BRANCHES':
        csvContent = generateBranchCSV(branchRows);
        break;
      case 'SHORT_CIRCUIT':
        csvContent = generateShortCircuitCSV(shortCircuitRows);
        break;
      default:
        return;
    }

    const filename = `wyniki_${tabSuffix}_${timestamp}.csv`;
    downloadCSV(csvContent, filename);
  }, [activeTab, busRows, branchRows, shortCircuitRows]);

  const handleExportPDF = useCallback(() => {
    setShowPrintView(true);
  }, []);

  const handleClosePrintView = useCallback(() => {
    setShowPrintView(false);
  }, []);

  // Don't render anything for TRACE tab
  if (!isExportAvailable) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2" data-testid="results-export">
        <button
          type="button"
          onClick={handleExportCSV}
          data-testid="export-csv-btn"
          title="Eksportuj do CSV"
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          Eksport CSV
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          data-testid="export-pdf-btn"
          title="Eksportuj do PDF"
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          Eksport PDF
        </button>
      </div>

      {showPrintView && (
        <PrintView exportData={exportData} onClose={handleClosePrintView} />
      )}
    </>
  );
}
