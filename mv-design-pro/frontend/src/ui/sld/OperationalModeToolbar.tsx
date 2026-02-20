/**
 * Operational Mode Toolbar — §4 UX 10/10
 *
 * Globalny przełącznik trybu pracy SLD:
 *   [ Normalny ] [ Awaryjny ] [ Zwarcie ]
 *
 * W trybie ZWARCIE: dodatkowe kontrolki typu zwarcia + pola overlay.
 * W trybie AWARYJNY: wskaźnik elementów wyłączonych z eksploatacji.
 *
 * INVARIANTS:
 * - Przełączanie bez reload
 * - Brak mutacji modelu (state only)
 * - All labels Polish
 */

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import {
  useOperationalModeStore,
  OPERATIONAL_MODE_LABELS,
  FAULT_TYPE_LABELS,
  SC_OVERLAY_LABELS,
} from './operationalModeStore';
import type { OperationalMode, FaultType, ScOverlayField } from './operationalModeStore';

// =============================================================================
// Props
// =============================================================================

export interface OperationalModeToolbarProps {
  /** Callback when mode changes — for external state sync */
  onModeChange?: (mode: OperationalMode) => void;
  /** Callback when fault bus is selected — triggers SC analysis */
  onFaultAnalysisRequest?: (busId: string, faultType: FaultType) => void;
  /** Callback when emergency recalc is needed */
  onEmergencyRecalc?: (outOfServiceIds: string[]) => void;
}

// =============================================================================
// Mode button colors
// =============================================================================

const MODE_STYLES: Record<
  OperationalMode,
  { active: string; inactive: string }
> = {
  NORMALNY: {
    active: 'bg-blue-600 text-white',
    inactive: 'bg-white text-gray-700 hover:bg-blue-50',
  },
  AWARYJNY: {
    active: 'bg-amber-600 text-white',
    inactive: 'bg-white text-gray-700 hover:bg-amber-50',
  },
  ZWARCIE: {
    active: 'bg-red-600 text-white',
    inactive: 'bg-white text-gray-700 hover:bg-red-50',
  },
};

// =============================================================================
// Component
// =============================================================================

export const OperationalModeToolbar: React.FC<OperationalModeToolbarProps> = ({
  onModeChange,
  onFaultAnalysisRequest,
  onEmergencyRecalc,
}) => {
  const {
    mode,
    setMode,
    selectedFaultType,
    setFaultType,
    selectedFaultBusId,
    scOverlayField,
    setScOverlayField,
    pendingOutOfServiceIds,
    emergencyRecalcPending,
  } = useOperationalModeStore();

  const handleModeChange = useCallback(
    (newMode: OperationalMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
    },
    [setMode, onModeChange],
  );

  const handleFaultTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFaultType(e.target.value as FaultType);
    },
    [setFaultType],
  );

  const handleScOverlayChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setScOverlayField(e.target.value as ScOverlayField);
    },
    [setScOverlayField],
  );

  const handleRunFaultAnalysis = useCallback(() => {
    if (selectedFaultBusId) {
      onFaultAnalysisRequest?.(selectedFaultBusId, selectedFaultType);
    }
  }, [selectedFaultBusId, selectedFaultType, onFaultAnalysisRequest]);

  const handleRunEmergencyRecalc = useCallback(() => {
    onEmergencyRecalc?.(pendingOutOfServiceIds);
  }, [pendingOutOfServiceIds, onEmergencyRecalc]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200"
      data-testid="operational-mode-toolbar"
    >
      {/* Mode switch buttons */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        {(Object.keys(OPERATIONAL_MODE_LABELS) as OperationalMode[]).map(
          (m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={clsx(
                'px-3 py-1 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-300',
                mode === m ? MODE_STYLES[m].active : MODE_STYLES[m].inactive,
              )}
              data-testid={`mode-btn-${m}`}
            >
              {OPERATIONAL_MODE_LABELS[m]}
            </button>
          ),
        )}
      </div>

      {/* Mode-specific controls */}
      {mode === 'ZWARCIE' && (
        <div className="flex items-center gap-2 ml-2">
          {/* Fault type selector */}
          <select
            value={selectedFaultType}
            onChange={handleFaultTypeChange}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
            data-testid="fault-type-select"
          >
            {(Object.keys(FAULT_TYPE_LABELS) as FaultType[]).map((ft) => (
              <option key={ft} value={ft}>
                {FAULT_TYPE_LABELS[ft]}
              </option>
            ))}
          </select>

          {/* SC overlay field selector */}
          <select
            value={scOverlayField}
            onChange={handleScOverlayChange}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
            data-testid="sc-overlay-select"
          >
            {(Object.keys(SC_OVERLAY_LABELS) as ScOverlayField[]).map(
              (field) => (
                <option key={field} value={field}>
                  {SC_OVERLAY_LABELS[field]}
                </option>
              ),
            )}
          </select>

          {/* Run button */}
          <button
            onClick={handleRunFaultAnalysis}
            disabled={!selectedFaultBusId}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              selectedFaultBusId
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            )}
            data-testid="run-fault-btn"
          >
            Oblicz zwarcie
          </button>

          {/* Status */}
          <span className="text-xs text-gray-500">
            {selectedFaultBusId
              ? `Węzeł: ${selectedFaultBusId}`
              : 'Kliknij węzeł na schemacie'}
          </span>
        </div>
      )}

      {mode === 'AWARYJNY' && (
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-amber-700">
            Wyłączone: {pendingOutOfServiceIds.length}
          </span>
          {emergencyRecalcPending && (
            <button
              onClick={handleRunEmergencyRecalc}
              className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
              data-testid="emergency-recalc-btn"
            >
              Przelicz
            </button>
          )}
          <span className="text-xs text-gray-500">
            Kliknij element aby wyłączyć/włączyć
          </span>
        </div>
      )}

      {mode === 'NORMALNY' && (
        <span className="text-xs text-gray-400 ml-2">
          Standardowy widok operacyjny
        </span>
      )}
    </div>
  );
};

export default OperationalModeToolbar;
