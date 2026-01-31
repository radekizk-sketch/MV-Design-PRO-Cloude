/**
 * P16a/P16b — Protection Section Component (READ-ONLY)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: PowerFactory-like protection visualization
 * - sld_rules.md § G.1: Synchronizacja selection SLD ↔ Tree ↔ Inspector
 * - ANSI/IEEE C37.2: Device function numbers
 *
 * FEATURES:
 * - Wyświetla przypisane zabezpieczenia dla wybranego elementu
 * - SETPOINT jako źródło prawdy (np. "3×In", "0,8×Un")
 * - COMPUTED (A/V) tylko gdy dostępne dane bazowe
 * - Read-only: brak edycji
 * - Zwijalna sekcja
 *
 * STATUS: PLACEHOLDER (używa fixture data przez useProtectionAssignment)
 *
 * 100% POLISH UI
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useProtectionAssignment } from '../protection';
import type { ElementProtectionAssignment, ProtectionSettingsSummary } from '../protection';
import type { ProtectionFunctionSummary } from '../protection';
import {
  PROTECTION_DEVICE_KIND_LABELS,
  PROTECTION_STATUS_LABELS,
  PROTECTION_STATUS_COLORS,
} from '../protection';

// =============================================================================
// Types
// =============================================================================

interface ProtectionSectionProps {
  /** ID elementu sieci */
  elementId: string | null | undefined;

  /** Czy sekcja jest domyślnie zwinięta */
  defaultCollapsed?: boolean;

  /** Dodatkowe klasy CSS */
  className?: string;
}

// =============================================================================
// ProtectionSection Component
// =============================================================================

/**
 * Sekcja zabezpieczeń w inspektorze.
 *
 * Wyświetla przypisane urządzenia zabezpieczeniowe dla wybranego elementu.
 * Read-only — brak edycji.
 *
 * @example
 * ```tsx
 * <ProtectionSection elementId={selectedElement?.id} />
 * ```
 */
export function ProtectionSection({
  elementId,
  defaultCollapsed = false,
  className = '',
}: ProtectionSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const { assignments, hasProtection, isLoading } = useProtectionAssignment(elementId);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // Nie renderuj jeśli brak elementu lub zabezpieczeń
  if (!elementId || (!hasProtection && !isLoading)) {
    return null;
  }

  return (
    <div
      className={clsx('border-t border-gray-100', className)}
      data-testid="inspector-protection-section"
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between px-4 py-2 bg-amber-50 hover:bg-amber-100 transition-colors"
        data-testid="protection-section-toggle"
      >
        <span className="text-xs font-medium text-amber-800 flex items-center gap-2">
          {collapsed ? '▶' : '▼'} Zabezpieczenia
          {hasProtection && (
            <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-xs">
              {assignments.length}
            </span>
          )}
        </span>
        <span className="text-xs text-amber-600">
          {hasProtection ? `${assignments.length} urzadzen` : 'brak'}
        </span>
      </button>

      {/* Section Content */}
      {!collapsed && (
        <div className="px-4 py-3 bg-amber-50/50 space-y-3">
          {isLoading ? (
            <div className="text-xs text-gray-500 italic">Ladowanie...</div>
          ) : hasProtection ? (
            assignments.map((assignment) => (
              <ProtectionAssignmentCard key={assignment.device_id} assignment={assignment} />
            ))
          ) : (
            <div className="text-xs text-gray-500 italic">
              Brak przypisanych zabezpieczen
            </div>
          )}

          {/* Placeholder notice */}
          <div className="mt-2 pt-2 border-t border-amber-200">
            <div className="text-xs text-amber-700 italic flex items-center gap-1">
              <span>*</span>
              <span>Dane demonstracyjne (fixture)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ProtectionAssignmentCard Component
// =============================================================================

interface ProtectionAssignmentCardProps {
  assignment: ElementProtectionAssignment;
}

function ProtectionAssignmentCard({ assignment }: ProtectionAssignmentCardProps) {
  const kindLabel = PROTECTION_DEVICE_KIND_LABELS[assignment.device_kind] ?? assignment.device_kind;
  const statusLabel = PROTECTION_STATUS_LABELS[assignment.status] ?? assignment.status;
  const statusColors = PROTECTION_STATUS_COLORS[assignment.status] ?? 'text-gray-600 bg-gray-50';

  return (
    <div
      className="bg-white border border-amber-200 rounded p-3 shadow-sm"
      data-testid={`protection-assignment-${assignment.device_id}`}
    >
      {/* Device header */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-sm text-gray-900">{assignment.device_name_pl}</div>
        <span className={clsx('px-2 py-0.5 rounded text-xs', statusColors)}>{statusLabel}</span>
      </div>

      {/* Device type */}
      <div className="text-xs text-gray-600 mb-2">{kindLabel}</div>

      {/* Settings summary (nowy model P16b) */}
      {assignment.settings_summary && (
        <SettingsSummaryView summary={assignment.settings_summary} />
      )}

      {/* Device ID (small) */}
      <div className="mt-2 text-xs text-gray-400 font-mono">ID: {assignment.device_id}</div>
    </div>
  );
}

// =============================================================================
// SettingsSummaryView Component (P16b: setpoint + computed)
// =============================================================================

interface SettingsSummaryViewProps {
  summary: ProtectionSettingsSummary;
}

function SettingsSummaryView({ summary }: SettingsSummaryViewProps) {
  if (!summary.functions || summary.functions.length === 0) {
    return <div className="text-xs text-gray-500 italic">Brak danych nastaw</div>;
  }

  return (
    <div className="bg-gray-50 rounded p-2 space-y-2">
      <div className="text-xs font-medium text-gray-700 mb-1">Funkcje zabezpieczeniowe:</div>

      {summary.functions.map((func, index) => (
        <FunctionSummaryRow key={`${func.code}-${index}`} func={func} />
      ))}

      {/* Charakterystyka czasowa (jeśli wspólna) */}
      {summary.curve_type && (
        <div className="text-xs text-gray-600 pt-1 border-t border-gray-200">
          Charakterystyka: <span className="font-mono">{summary.curve_type}</span>
        </div>
      )}

      {/* Dane bazowe (jeśli dostępne) */}
      {summary.base_values && (
        <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
          <span className="italic">Dane bazowe:</span>
          {summary.base_values.i_rated_a !== undefined && (
            <span className="ml-2">In={summary.base_values.i_rated_a} A</span>
          )}
          {summary.base_values.u_rated_kv !== undefined && (
            <span className="ml-2">Un={summary.base_values.u_rated_kv} kV</span>
          )}
          {summary.base_values.f_rated_hz !== undefined && (
            <span className="ml-2">fn={summary.base_values.f_rated_hz} Hz</span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FunctionSummaryRow Component
// =============================================================================

interface FunctionSummaryRowProps {
  func: ProtectionFunctionSummary;
}

function FunctionSummaryRow({ func }: FunctionSummaryRowProps) {
  // Format: "50 I>>: 3×In (≈ 1509 A)" lub "50 I>>: 3×In" gdy brak computed
  const ansiStr = func.ansi.join('/');

  // Formatuj computed value (jeśli dostępne)
  const computedStr = func.computed
    ? ` (≈ ${formatComputedValue(func.computed.value, func.computed.unit)})`
    : '';

  // Czas opóźnienia
  const timeStr = func.time_delay_s !== undefined ? `, T=${func.time_delay_s} s` : '';

  return (
    <div
      className="text-xs border-l-2 border-amber-300 pl-2 py-1"
      data-testid={`protection-function-${func.code}`}
    >
      {/* Główna linia: ANSI label_pl: setpoint (computed) */}
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="font-mono font-medium text-amber-800">{ansiStr}</span>
        <span className="text-gray-700">{func.label_pl}:</span>
        <span className="font-mono font-medium text-gray-900">{func.setpoint.display_pl}</span>
        {computedStr && <span className="text-gray-500">{computedStr}</span>}
        {timeStr && <span className="text-gray-600">{timeStr}</span>}
      </div>

      {/* Charakterystyka (jeśli specyficzna dla funkcji) */}
      {func.curve_type && (
        <div className="text-gray-500 mt-0.5">
          Krzywa: <span className="font-mono">{func.curve_type}</span>
        </div>
      )}

      {/* Notatki (np. dla SPZ) */}
      {func.notes_pl && (
        <div className="text-gray-500 italic mt-0.5">{func.notes_pl}</div>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Formatuje wartość computed dla wyświetlenia.
 */
function formatComputedValue(value: number, unit: string): string {
  const formattedValue = value.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return `${formattedValue} ${unit}`;
}

export default ProtectionSection;
