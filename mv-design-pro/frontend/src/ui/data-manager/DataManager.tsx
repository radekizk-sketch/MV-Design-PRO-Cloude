/**
 * Data Manager Component (PF-style Menedżer Danych)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § B: Data Manager table
 * - wizard_screens.md § 2: Element lists
 * - sld_rules.md § G.2: Selection sync
 *
 * Features:
 * - Table view with deterministic column ordering
 * - Multi-column sorting with ID tie-breaker
 * - Filtering: in_service, type_ref, switch state
 * - Search by ID + Name
 * - Batch edit (MODEL_EDIT only)
 * - Mode gating
 */

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import type {
  DataManagerColumn,
  DataManagerRow,
  DataManagerSort,
  DataManagerFilter,
  ElementType,
  OperatingMode,
  BatchEditOperation,
  SwitchState,
} from '../types';
import { useSelectionStore } from '../selection/store';
import { useTreeSelection } from '../selection/hooks';

// ============================================================================
// Column Definitions (Deterministic Ordering)
// ============================================================================

const COLUMNS_BY_TYPE: Record<string, DataManagerColumn[]> = {
  Bus: [
    { key: 'id', label: 'ID', type: 'string', sortable: true, width: 120 },
    { key: 'name', label: 'Nazwa', type: 'string', sortable: true, width: 180 },
    { key: 'inService', label: 'W eksploatacji', type: 'boolean', sortable: true, width: 100 },
    { key: 'voltage_kv', label: 'Napięcie', type: 'number', unit: 'kV', sortable: true, width: 100 },
    { key: 'bus_type', label: 'Typ szyny', type: 'enum', sortable: true, width: 100 },
  ],
  LineBranch: [
    { key: 'id', label: 'ID', type: 'string', sortable: true, width: 120 },
    { key: 'name', label: 'Nazwa', type: 'string', sortable: true, width: 180 },
    { key: 'inService', label: 'W eksploatacji', type: 'boolean', sortable: true, width: 100 },
    { key: 'typeRefName', label: 'Typ', type: 'ref', sortable: true, width: 150 },
    { key: 'length_km', label: 'Długość', type: 'number', unit: 'km', sortable: true, width: 100 },
    { key: 'from_bus', label: 'Z szyny', type: 'ref', sortable: true, width: 120 },
    { key: 'to_bus', label: 'Do szyny', type: 'ref', sortable: true, width: 120 },
  ],
  TransformerBranch: [
    { key: 'id', label: 'ID', type: 'string', sortable: true, width: 120 },
    { key: 'name', label: 'Nazwa', type: 'string', sortable: true, width: 180 },
    { key: 'inService', label: 'W eksploatacji', type: 'boolean', sortable: true, width: 100 },
    { key: 'typeRefName', label: 'Typ', type: 'ref', sortable: true, width: 150 },
    { key: 'rated_power_mva', label: 'Moc znam.', type: 'number', unit: 'MVA', sortable: true, width: 100 },
    { key: 'tap_position', label: 'Poz. zaczep.', type: 'number', sortable: true, width: 80 },
    { key: 'from_bus', label: 'SG', type: 'ref', sortable: true, width: 120 },
    { key: 'to_bus', label: 'DN', type: 'ref', sortable: true, width: 120 },
  ],
  Switch: [
    { key: 'id', label: 'ID', type: 'string', sortable: true, width: 120 },
    { key: 'name', label: 'Nazwa', type: 'string', sortable: true, width: 180 },
    { key: 'inService', label: 'W eksploatacji', type: 'boolean', sortable: true, width: 100 },
    { key: 'switchState', label: 'Stan', type: 'enum', sortable: true, width: 80 },
    { key: 'switch_type', label: 'Rodzaj', type: 'enum', sortable: true, width: 120 },
    { key: 'typeRefName', label: 'Typ urządzenia', type: 'ref', sortable: true, width: 150 },
    { key: 'from_bus', label: 'Z szyny', type: 'ref', sortable: true, width: 120 },
    { key: 'to_bus', label: 'Do szyny', type: 'ref', sortable: true, width: 120 },
  ],
  Source: [
    { key: 'id', label: 'ID', type: 'string', sortable: true, width: 120 },
    { key: 'name', label: 'Nazwa', type: 'string', sortable: true, width: 180 },
    { key: 'inService', label: 'W eksploatacji', type: 'boolean', sortable: true, width: 100 },
    { key: 'source_type', label: 'Rodzaj źródła', type: 'enum', sortable: true, width: 120 },
    { key: 'sk_mva', label: 'Sk"', type: 'number', unit: 'MVA', sortable: true, width: 100 },
    { key: 'bus_id', label: 'Szyna', type: 'ref', sortable: true, width: 120 },
  ],
  Load: [
    { key: 'id', label: 'ID', type: 'string', sortable: true, width: 120 },
    { key: 'name', label: 'Nazwa', type: 'string', sortable: true, width: 180 },
    { key: 'inService', label: 'W eksploatacji', type: 'boolean', sortable: true, width: 100 },
    { key: 'p_mw', label: 'P', type: 'number', unit: 'MW', sortable: true, width: 80 },
    { key: 'q_mvar', label: 'Q', type: 'number', unit: 'Mvar', sortable: true, width: 80 },
    { key: 'bus_id', label: 'Szyna', type: 'ref', sortable: true, width: 120 },
  ],
};

// ============================================================================
// Polish Labels
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  Bus: 'Szyny',
  LineBranch: 'Linie',
  CableBranch: 'Kable',
  TransformerBranch: 'Transformatory',
  Switch: 'Łączniki',
  Source: 'Źródła',
  Load: 'Odbiory',
};

const SWITCH_STATE_LABELS: Record<string, string> = {
  OPEN: 'Otwarty',
  CLOSED: 'Zamknięty',
  ALL: 'Wszystkie',
};

// ============================================================================
// Props
// ============================================================================

interface DataManagerProps {
  elementType: ElementType;
  rows: DataManagerRow[];
  mode: OperatingMode;
  onRowSelect?: (row: DataManagerRow) => void;
  onBatchEdit?: (selectedIds: string[], operation: BatchEditOperation) => Promise<void>;
  onOpenTypePicker?: (elementIds: string[], category: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DataManager({
  elementType,
  rows,
  mode,
  onRowSelect,
  onBatchEdit,
  onOpenTypePicker,
}: DataManagerProps) {
  // Selection state
  const { selectedElement, centerSldOnElement } = useSelectionStore();
  const { handleTreeClick } = useTreeSelection();

  // Local state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<DataManagerSort>({ column: 'name', direction: 'asc' });
  const [filter, setFilter] = useState<DataManagerFilter>({
    inServiceOnly: false,
    withTypeOnly: false,
    withoutTypeOnly: false,
    switchStateFilter: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [batchEditPending, setBatchEditPending] = useState(false);

  // Get columns for this element type
  const columns = COLUMNS_BY_TYPE[elementType] ?? COLUMNS_BY_TYPE.Bus;

  // Check if batch edit is allowed
  const canBatchEdit = mode === 'MODEL_EDIT';

  // Filter rows
  const filteredRows = useMemo(() => {
    let result = [...rows];

    // Search filter (ID + Name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (row) =>
          row.id.toLowerCase().includes(query) ||
          row.name.toLowerCase().includes(query)
      );
    }

    // In service filter
    if (filter.inServiceOnly) {
      result = result.filter((row) => row.inService);
    }

    // Type filter
    if (filter.withTypeOnly) {
      result = result.filter((row) => row.typeRef !== null);
    }
    if (filter.withoutTypeOnly) {
      result = result.filter((row) => row.typeRef === null);
    }

    // Switch state filter
    if (elementType === 'Switch' && filter.switchStateFilter !== 'ALL') {
      result = result.filter((row) => row.switchState === filter.switchStateFilter);
    }

    return result;
  }, [rows, searchQuery, filter, elementType]);

  // Sort rows (with deterministic ID tie-breaker)
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const aVal = getRowValue(a, sort.column);
      const bVal = getRowValue(b, sort.column);

      let compare = 0;
      if (aVal === null && bVal === null) compare = 0;
      else if (aVal === null) compare = 1;
      else if (bVal === null) compare = -1;
      else if (typeof aVal === 'string' && typeof bVal === 'string') {
        compare = aVal.localeCompare(bVal, 'pl');
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        compare = aVal - bVal;
      } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        compare = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        compare = String(aVal).localeCompare(String(bVal), 'pl');
      }

      // Apply sort direction
      if (sort.direction === 'desc') compare = -compare;

      // Tie-breaker: ID
      if (compare === 0) {
        compare = a.id.localeCompare(b.id);
      }

      return compare;
    });
    return sorted;
  }, [filteredRows, sort]);

  // Handle column header click
  const handleColumnClick = useCallback((columnKey: string) => {
    setSort((prev) => ({
      column: columnKey,
      direction: prev.column === columnKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Handle row click
  const handleRowClick = useCallback(
    (row: DataManagerRow) => {
      handleTreeClick(row.id, row.elementType, row.name);
      centerSldOnElement(row.id);
      onRowSelect?.(row);
    },
    [handleTreeClick, centerSldOnElement, onRowSelect]
  );

  // Handle checkbox change
  const handleCheckboxChange = useCallback((rowId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(sortedRows.map((row) => row.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [sortedRows]
  );

  // Batch edit handlers
  const handleBatchSetInService = useCallback(
    async (value: boolean) => {
      if (!canBatchEdit || selectedIds.size === 0) return;
      setBatchEditPending(true);
      try {
        await onBatchEdit?.(Array.from(selectedIds), { type: 'SET_IN_SERVICE', value });
        setSelectedIds(new Set());
      } finally {
        setBatchEditPending(false);
      }
    },
    [canBatchEdit, selectedIds, onBatchEdit]
  );

  const handleBatchClearType = useCallback(async () => {
    if (!canBatchEdit || selectedIds.size === 0) return;
    setBatchEditPending(true);
    try {
      await onBatchEdit?.(Array.from(selectedIds), { type: 'CLEAR_TYPE' });
      setSelectedIds(new Set());
    } finally {
      setBatchEditPending(false);
    }
  }, [canBatchEdit, selectedIds, onBatchEdit]);

  const handleBatchAssignType = useCallback(() => {
    if (!canBatchEdit || selectedIds.size === 0) return;
    const category =
      elementType === 'LineBranch'
        ? 'LINE'
        : elementType === 'TransformerBranch'
        ? 'TRANSFORMER'
        : elementType === 'Switch'
        ? 'SWITCH_EQUIPMENT'
        : null;
    if (category) {
      onOpenTypePicker?.(Array.from(selectedIds), category);
    }
  }, [canBatchEdit, selectedIds, elementType, onOpenTypePicker]);

  const handleBatchSetSwitchState = useCallback(
    async (state: SwitchState) => {
      if (!canBatchEdit || selectedIds.size === 0 || elementType !== 'Switch') return;
      setBatchEditPending(true);
      try {
        await onBatchEdit?.(Array.from(selectedIds), { type: 'SET_SWITCH_STATE', state });
        setSelectedIds(new Set());
      } finally {
        setBatchEditPending(false);
      }
    },
    [canBatchEdit, selectedIds, elementType, onBatchEdit]
  );

  const allSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  // Check if element type supports type_ref
  const supportsTypeRef = ['LineBranch', 'TransformerBranch', 'Switch'].includes(elementType);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              MENEDŻER DANYCH: {CATEGORY_LABELS[elementType] ?? elementType}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {sortedRows.length} z {rows.length} elementów
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {getModeLabel(mode)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 px-4 py-2 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Szukaj po ID lub nazwie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={filter.inServiceOnly}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, inServiceOnly: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            W eksploatacji
          </label>

          {supportsTypeRef && (
            <>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={filter.withTypeOnly}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      withTypeOnly: e.target.checked,
                      withoutTypeOnly: e.target.checked ? false : prev.withoutTypeOnly,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                Z typem
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={filter.withoutTypeOnly}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      withoutTypeOnly: e.target.checked,
                      withTypeOnly: e.target.checked ? false : prev.withTypeOnly,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                Bez typu
              </label>
            </>
          )}

          {elementType === 'Switch' && (
            <select
              value={filter.switchStateFilter}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  switchStateFilter: e.target.value as 'ALL' | 'OPEN' | 'CLOSED',
                }))
              }
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="ALL">{SWITCH_STATE_LABELS.ALL}</option>
              <option value="OPEN">{SWITCH_STATE_LABELS.OPEN}</option>
              <option value="CLOSED">{SWITCH_STATE_LABELS.CLOSED}</option>
            </select>
          )}
        </div>
      </div>

      {/* Batch Edit Toolbar (MODEL_EDIT only) */}
      {canBatchEdit && selectedIds.size > 0 && (
        <div className="border-b border-gray-200 bg-blue-50 px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-blue-700 font-medium">
            Zaznaczono: {selectedIds.size}
          </span>
          <div className="flex-1" />
          <span className="text-xs text-gray-500 mr-2">Edytuj zbiorczo:</span>
          <button
            onClick={() => handleBatchSetInService(true)}
            disabled={batchEditPending}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
          >
            Włącz
          </button>
          <button
            onClick={() => handleBatchSetInService(false)}
            disabled={batchEditPending}
            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
          >
            Wyłącz
          </button>
          {supportsTypeRef && (
            <>
              <button
                onClick={handleBatchAssignType}
                disabled={batchEditPending}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Przypisz typ...
              </button>
              <button
                onClick={handleBatchClearType}
                disabled={batchEditPending}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Wyczyść typ
              </button>
            </>
          )}
          {elementType === 'Switch' && (
            <>
              <button
                onClick={() => handleBatchSetSwitchState('CLOSED')}
                disabled={batchEditPending}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
              >
                Zamknij
              </button>
              <button
                onClick={() => handleBatchSetSwitchState('OPEN')}
                disabled={batchEditPending}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
              >
                Otwórz
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {/* Checkbox column (MODEL_EDIT only) */}
              {canBatchEdit && (
                <th className="px-2 py-2 text-left border-b border-gray-200 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-3 py-2 text-left border-b border-gray-200 font-medium text-gray-700',
                    col.sortable && 'cursor-pointer hover:bg-gray-100'
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleColumnClick(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.unit && (
                      <span className="text-gray-400 font-normal">[{col.unit}]</span>
                    )}
                    {sort.column === col.key && (
                      <span className="text-blue-500">
                        {sort.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.id}
                className={clsx(
                  'border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                  selectedElement?.id === row.id && 'bg-blue-50',
                  !row.inService && 'text-gray-400'
                )}
                onClick={() => handleRowClick(row)}
              >
                {/* Checkbox */}
                {canBatchEdit && (
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(row.id, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-3 py-2',
                      row.validationMessages.some((m) => m.field === col.key) &&
                        'bg-red-50 text-red-700'
                    )}
                  >
                    {renderCellValue(row, col)}
                  </td>
                ))}
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (canBatchEdit ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Brak elementów do wyświetlenia
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-500">
        Razem: {rows.length} | Wyświetlono: {sortedRows.length}
        {selectedIds.size > 0 && ` | Zaznaczono: ${selectedIds.size}`}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRowValue(row: DataManagerRow, key: string): unknown {
  if (key === 'inService') return row.inService;
  if (key === 'typeRefName') return row.typeRefName;
  if (key === 'switchState') return row.switchState;
  return row.data[key] ?? null;
}

function renderCellValue(row: DataManagerRow, col: DataManagerColumn): React.ReactNode {
  const value = getRowValue(row, col.key);

  if (value === null || value === undefined) {
    return <span className="text-gray-300">—</span>;
  }

  if (col.type === 'boolean') {
    return value ? '✓' : '✗';
  }

  if (col.key === 'switchState') {
    return SWITCH_STATE_LABELS[value as string] ?? value;
  }

  if (col.type === 'number' && typeof value === 'number') {
    return value.toFixed(col.key.includes('kv') || col.key.includes('mva') ? 2 : 3);
  }

  return String(value);
}

function getModeLabel(mode: OperatingMode): string {
  switch (mode) {
    case 'MODEL_EDIT':
      return 'Tryb: Edycja modelu';
    case 'CASE_CONFIG':
      return 'Tryb: Konfiguracja (tylko odczyt modelu)';
    case 'RESULT_VIEW':
      return 'Tryb: Wyniki (tylko odczyt)';
    default:
      return mode;
  }
}

export default DataManager;
