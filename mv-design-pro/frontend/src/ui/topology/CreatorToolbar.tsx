/**
 * CreatorToolbar V1 — pasek narzędzi kreatora sieci SN.
 *
 * Mapuje kliknięcia SLD na operacje domenowe V1:
 *   - "Dodaj GPZ"         → add_grid_source_sn
 *   - "Kontynuuj magistralę" → continue_trunk_segment_sn
 *   - "Wstaw stację"      → insert_station_on_segment_sn
 *   - "Odgałęzienie"      → start_branch_segment_sn
 *   - "Zamknij pierścień"  → connect_secondary_ring_sn
 *   - "Punkt NOP"          → set_normal_open_point
 *   - "Transformator"      → add_transformer_sn_nn
 *   - "Katalog"            → assign_catalog_to_element
 *
 * CLICK-DRIVEN: Toolbar ustawia aktywne narzędzie → SLD obsługuje kliknięcie.
 * BINDING: PL labels, no codenames.
 */

import { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreatorTool =
  | 'add_gpz'
  | 'continue_trunk'
  | 'insert_station'
  | 'start_branch'
  | 'connect_ring'
  | 'set_nop'
  | 'add_transformer'
  | 'assign_catalog'
  | null;

interface CreatorToolbarProps {
  activeTool: CreatorTool;
  onToolChange: (tool: CreatorTool) => void;
  /** Whether snapshot has a source (GPZ). If not, only add_gpz is available. */
  hasSource: boolean;
  /** Whether network has a ring topology (enables NOP tool). */
  hasRing: boolean;
  /** Loading state — disable all tools during operation. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

interface ToolDef {
  id: CreatorTool;
  label: string;
  shortcut?: string;
  icon: string;
  description: string;
  /** Only show when condition is true. */
  showWhen?: (props: Pick<CreatorToolbarProps, 'hasSource' | 'hasRing'>) => boolean;
}

const TOOLS: ToolDef[] = [
  {
    id: 'add_gpz',
    label: 'GPZ',
    shortcut: 'G',
    icon: '⚡',
    description: 'Dodaj źródło zasilania (GPZ) — punkt startowy sieci SN',
    showWhen: ({ hasSource }) => !hasSource,
  },
  {
    id: 'continue_trunk',
    label: 'Magistrala',
    shortcut: 'M',
    icon: '━',
    description: 'Kontynuuj magistralę — kliknij koniec magistrali w SLD',
    showWhen: ({ hasSource }) => hasSource,
  },
  {
    id: 'insert_station',
    label: 'Stacja',
    shortcut: 'S',
    icon: '◻',
    description: 'Wstaw stację na segmencie — kliknij segment w SLD',
    showWhen: ({ hasSource }) => hasSource,
  },
  {
    id: 'start_branch',
    label: 'Odgałęzienie',
    shortcut: 'O',
    icon: '┣',
    description: 'Dodaj odgałęzienie — kliknij port BRANCH stacji w SLD',
    showWhen: ({ hasSource }) => hasSource,
  },
  {
    id: 'connect_ring',
    label: 'Pierścień',
    shortcut: 'P',
    icon: '○',
    description: 'Zamknij pierścień — kliknij dwa końce magistrali w SLD',
    showWhen: ({ hasSource }) => hasSource,
  },
  {
    id: 'set_nop',
    label: 'NOP',
    shortcut: 'N',
    icon: '⊘',
    description: 'Ustaw punkt normalnie otwarty — kliknij segment pierścienia',
    showWhen: ({ hasRing }) => hasRing,
  },
  {
    id: 'add_transformer',
    label: 'Transformator',
    shortcut: 'T',
    icon: '⊗',
    description: 'Dodaj transformator SN/nN — kliknij stację w SLD',
    showWhen: ({ hasSource }) => hasSource,
  },
  {
    id: 'assign_catalog',
    label: 'Katalog',
    shortcut: 'K',
    icon: '📋',
    description: 'Przypisz typ katalogowy — kliknij element w SLD',
    showWhen: ({ hasSource }) => hasSource,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatorToolbar({
  activeTool,
  onToolChange,
  hasSource,
  hasRing,
  disabled = false,
}: CreatorToolbarProps) {
  const [hoveredTool, setHoveredTool] = useState<CreatorTool>(null);

  const handleToolClick = useCallback(
    (toolId: CreatorTool) => {
      if (disabled) return;
      onToolChange(activeTool === toolId ? null : toolId);
    },
    [activeTool, onToolChange, disabled],
  );

  const visibleTools = TOOLS.filter(
    (t) => !t.showWhen || t.showWhen({ hasSource, hasRing }),
  );

  return (
    <div className="flex flex-col border-b border-gray-200 bg-gray-50">
      {/* Tools row */}
      <div className="flex items-center gap-1 px-3 py-2">
        <span className="text-xs font-medium text-gray-500 mr-2">KREATOR:</span>
        {visibleTools.map((tool) => (
          <button
            key={tool.id}
            className={`
              flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
              border transition-colors
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${
                activeTool === tool.id
                  ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-sm'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
              }
            `}
            onClick={() => handleToolClick(tool.id)}
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
            disabled={disabled}
            title={tool.description}
          >
            <span className="text-sm">{tool.icon}</span>
            <span>{tool.label}</span>
            {tool.shortcut && (
              <kbd className="ml-1 px-1 bg-gray-100 text-gray-400 text-[9px] rounded border border-gray-200">
                {tool.shortcut}
              </kbd>
            )}
          </button>
        ))}

        {/* Cancel active tool */}
        {activeTool && (
          <button
            className="ml-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            onClick={() => onToolChange(null)}
          >
            Anuluj
          </button>
        )}
      </div>

      {/* Active tool description */}
      {(activeTool || hoveredTool) && (
        <div className="px-3 py-1 bg-blue-50/50 border-t border-gray-100 text-xs text-gray-600">
          {TOOLS.find((t) => t.id === (activeTool ?? hoveredTool))?.description}
        </div>
      )}
    </div>
  );
}
