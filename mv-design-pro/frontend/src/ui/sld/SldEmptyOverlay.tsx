/**
 * SLD Empty Overlay — PowerFactory/ETAP Style Empty State
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Layout narzędziowy ZAWSZE renderowany
 * - wizard_screens.md § 2.2: Empty state handling
 *
 * POWERFACTORY/ETAP RULE:
 * > SLD Canvas jest ZAWSZE widoczny (z overlayem jeśli brak modelu)
 * > Brak "pustych ekranów" — widoczne są narzędzia, siatka, toolbar
 *
 * FEATURES:
 * - Semi-transparent overlay over empty canvas
 * - Informational message in Polish
 * - Hints for user actions
 * - Does NOT hide the canvas, toolbar, or other controls
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
  icon: React.ReactNode;
  title: string;
  description: string;
  hint?: string;
}> = {
  NO_PROJECT: {
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    title: 'Brak aktywnego projektu',
    description: 'Utwórz lub otwórz projekt, aby rozpocząć modelowanie sieci.',
    hint: 'Przejdź do Plik → Nowy projekt lub Plik → Otwórz projekt',
  },
  NO_CASE: {
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'Brak aktywnego przypadku',
    description: 'Wybierz lub utwórz przypadek obliczeniowy.',
    hint: 'Kliknij "Zmień przypadek" na pasku narzędzi',
  },
  NO_SNAPSHOT: {
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Brak aktywnego snapshotu',
    description: 'Snapshot modelu nie jest aktywny.',
    hint: 'Wybierz snapshot w drzewie projektu lub utwórz nowy',
  },
  NO_MODEL: {
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Pusty model sieci',
    description: 'Model sieci jest pusty. Dodaj elementy, aby rozpocząć.',
    hint: 'Użyj paska narzędzi, aby dodać szyny, linie i inne elementy',
  },
  LOADING: {
    icon: (
      <svg className="w-10 h-10 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
    title: 'Ładowanie...',
    description: 'Trwa ładowanie danych modelu.',
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
   * Show action button.
   */
  showAction?: boolean;

  /**
   * Action button label.
   */
  actionLabel?: string;

  /**
   * Action button callback.
   */
  onAction?: () => void;

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
  showAction = false,
  actionLabel,
  onAction,
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

  return (
    <div
      className={clsx(
        'absolute inset-0 z-10',
        'flex items-center justify-center',
        'bg-gray-100/80 backdrop-blur-[2px]',
        'pointer-events-auto',
        className
      )}
      data-testid="sld-empty-overlay"
      data-state={resolvedState}
    >
      <div
        className={clsx(
          'bg-white rounded-lg shadow-lg',
          'px-8 py-6 max-w-md mx-4',
          'text-center'
        )}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4 text-gray-400">
          {config.icon}
        </div>

        {/* Title */}
        <h3
          className="text-lg font-semibold text-gray-800 mb-2"
          data-testid="sld-empty-overlay-title"
        >
          {config.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">
          {config.description}
        </p>

        {/* Hint */}
        {config.hint && (
          <p className="text-xs text-gray-400 mb-4">
            {config.hint}
          </p>
        )}

        {/* Mode indicator */}
        {activeMode === 'RESULT_VIEW' && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Tryb wyników — tylko do odczytu</span>
          </div>
        )}

        {/* Action button */}
        {showAction && actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium',
              'bg-blue-600 text-white',
              'hover:bg-blue-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'transition-colors'
            )}
            data-testid="sld-empty-overlay-action"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default SldEmptyOverlay;
