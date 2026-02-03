/**
 * SLD Empty Overlay — PowerFactory/ETAP Style Empty State Banner
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Layout narzędziowy ZAWSZE renderowany
 * - wizard_screens.md § 2.2: Empty state handling
 *
 * POWERFACTORY/ETAP RULE:
 * > SLD Canvas jest ZAWSZE widoczny i DOSTEPNY
 * > Baner informacyjny NIE BLOKUJE canvasa
 * > Zoom, pan, zaznaczanie dzialaja pod banerem
 *
 * FEATURES:
 * - Non-blocking informational banner at top of canvas
 * - Canvas remains fully interactive (zoom, pan, selection)
 * - Action buttons for case selection/creation
 * - Polish labels
 *
 * 100% POLISH UI
 */

import { clsx } from 'clsx';
import { useHasActiveCase, useActiveMode } from '../app-state';

// =============================================================================
// Empty State Types
// =============================================================================

export type SldEmptyState =
  | 'NO_PROJECT'
  | 'NO_CASE'
  | 'NO_SNAPSHOT'
  | 'NO_MODEL'
  | 'LOADING';

// =============================================================================
// Empty State Messages (Polish)
// =============================================================================

const EMPTY_STATE_CONFIG: Record<SldEmptyState, {
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  NO_PROJECT: {
    title: 'Brak aktywnego projektu',
    description: 'Utworz lub otworz projekt, aby rozpoczac modelowanie sieci.',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
  },
  NO_CASE: {
    title: 'Nie wybrano przypadku obliczeniowego',
    description: 'Wybierz istniejacy lub utworz nowy przypadek, aby uruchomic obliczenia.',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
  },
  NO_SNAPSHOT: {
    title: 'Brak aktywnego snapshotu',
    description: 'Wybierz snapshot w drzewie projektu lub utworz nowy.',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
  },
  NO_MODEL: {
    title: 'Pusty model sieci',
    description: 'Dodaj elementy za pomoca paska narzedzi, aby rozpoczac.',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
  },
  LOADING: {
    title: 'Ladowanie...',
    description: 'Trwa ladowanie danych modelu.',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600',
  },
};

// =============================================================================
// Component Props
// =============================================================================

export interface SldEmptyOverlayProps {
  /**
   * The empty state to display.
   * If not provided, automatically determines based on app state.
   */
  state?: SldEmptyState;

  /**
   * Force show the overlay (for testing).
   */
  forceShow?: boolean;

  /**
   * Whether there are existing cases to select from.
   */
  hasCases?: boolean;

  /**
   * Callback to open case selector.
   */
  onSelectCase?: () => void;

  /**
   * Callback to create a new case.
   */
  onCreateCase?: () => void;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SldEmptyOverlay({
  state,
  forceShow = false,
  hasCases = false,
  onSelectCase,
  onCreateCase,
  className,
}: SldEmptyOverlayProps) {
  const hasActiveCase = useHasActiveCase();
  const activeMode = useActiveMode();

  // Auto-determine state if not provided
  const resolvedState: SldEmptyState | null = state ?? (
    !hasActiveCase ? 'NO_CASE' : null
  );

  // Don't render if no empty state
  if (!resolvedState && !forceShow) {
    return null;
  }

  const config = resolvedState ? EMPTY_STATE_CONFIG[resolvedState] : null;

  if (!config) {
    return null;
  }

  // For NO_CASE state, show action buttons
  const showCaseActions = resolvedState === 'NO_CASE' && (onSelectCase || onCreateCase);

  return (
    <div
      className={clsx(
        'absolute left-0 right-0 top-0 z-10',
        'pointer-events-none',  // Container doesn't block canvas
        'p-4',
        className
      )}
      data-testid="sld-empty-overlay"
      data-state={resolvedState}
    >
      {/* Banner - pointer-events-auto so buttons work */}
      <div
        className={clsx(
          'pointer-events-auto',
          'rounded-lg border shadow-sm',
          'px-4 py-3',
          'flex items-center justify-between gap-4',
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Left: Message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={clsx('text-sm font-medium', config.textColor)}
              data-testid="sld-empty-overlay-title"
            >
              {config.title}
            </h3>
            {activeMode === 'RESULT_VIEW' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                Tryb wynikow
              </span>
            )}
          </div>
          <p className={clsx('text-sm mt-0.5', config.textColor, 'opacity-80')}>
            {config.description}
          </p>
        </div>

        {/* Right: Action buttons */}
        {showCaseActions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasCases && onSelectCase && (
              <button
                type="button"
                onClick={onSelectCase}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded',
                  'bg-blue-600 text-white',
                  'hover:bg-blue-700',
                  'transition-colors'
                )}
                data-testid="sld-empty-overlay-select-case"
              >
                Wybierz przypadek
              </button>
            )}
            {!hasCases && onCreateCase && (
              <button
                type="button"
                onClick={onCreateCase}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded',
                  'bg-blue-600 text-white',
                  'hover:bg-blue-700',
                  'transition-colors'
                )}
                data-testid="sld-empty-overlay-create-case"
              >
                Utworz pierwszy przypadek
              </button>
            )}
            {hasCases && onCreateCase && (
              <button
                type="button"
                onClick={onCreateCase}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded',
                  'bg-white text-gray-700 border border-gray-300',
                  'hover:bg-gray-50',
                  'transition-colors'
                )}
                data-testid="sld-empty-overlay-create-new"
              >
                Nowy przypadek
              </button>
            )}
          </div>
        )}

        {/* Loading indicator */}
        {resolvedState === 'LOADING' && (
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default SldEmptyOverlay;
