/**
 * P16a — Protection Section Component (READ-ONLY)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: PowerFactory-like protection visualization
 * - sld_rules.md § G.1: Synchronizacja selection SLD ↔ Tree ↔ Inspector
 *
 * FEATURES:
 * - Wyświetla przypisane zabezpieczenia dla wybranego elementu
 * - Read-only: brak edycji
 * - Zwijalna sekcja
 * - Tooltip z dodatkowymi informacjami
 *
 * STATUS: PLACEHOLDER (używa fixture data przez useProtectionAssignment)
 *
 * 100% POLISH UI
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useProtectionAssignment } from '../protection';
import type { ElementProtectionAssignment } from '../protection';
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

      {/* Settings summary */}
      {assignment.settings_summary && (
        <div className="bg-gray-50 rounded p-2 space-y-1">
          <div className="text-xs font-medium text-gray-700 mb-1">Nastawy:</div>
          <SettingsSummaryView summary={assignment.settings_summary} />
        </div>
      )}

      {/* Device ID (small) */}
      <div className="mt-2 text-xs text-gray-400 font-mono">ID: {assignment.device_id}</div>
    </div>
  );
}

// =============================================================================
// SettingsSummaryView Component
// =============================================================================

interface SettingsSummaryViewProps {
  summary: ElementProtectionAssignment['settings_summary'];
}

function SettingsSummaryView({ summary }: SettingsSummaryViewProps) {
  if (!summary) return null;

  const settings: Array<{ label: string; value: string }> = [];

  if (summary.i_pickup_a !== undefined) {
    settings.push({ label: 'I>', value: `${summary.i_pickup_a} A` });
  }
  if (summary.i_pickup_fast_a !== undefined) {
    settings.push({ label: 'I>>', value: `${summary.i_pickup_fast_a} A` });
  }
  if (summary.t_delay_s !== undefined) {
    settings.push({ label: 't', value: `${summary.t_delay_s} s` });
  }
  if (summary.curve_type) {
    settings.push({ label: 'Charakterystyka', value: summary.curve_type });
  }
  if (summary.i_rated_a !== undefined) {
    settings.push({ label: 'In', value: `${summary.i_rated_a} A` });
  }

  // Extra settings
  if (summary.extra) {
    for (const [key, value] of Object.entries(summary.extra)) {
      settings.push({ label: key, value: String(value) });
    }
  }

  if (settings.length === 0) {
    return <div className="text-xs text-gray-500 italic">Brak danych nastaw</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {settings.map((setting) => (
        <div key={setting.label} className="flex justify-between text-xs">
          <span className="text-gray-600">{setting.label}:</span>
          <span className="font-mono text-gray-900">{setting.value}</span>
        </div>
      ))}
    </div>
  );
}

export default ProtectionSection;
