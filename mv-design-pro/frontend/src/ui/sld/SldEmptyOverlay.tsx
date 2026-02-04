/**
 * SLD Empty Overlay — PowerFactory/ETAP Style Empty State Banner
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Layout narzędziowy ZAWSZE renderowany
 * - wizard_screens.md § 2.2: Empty state handling
 *
 * POWERFACTORY/ETAP RULE:
 * > SLD Canvas jest ZAWSZE widoczny i DOSTĘPNY
 * > Baner informacyjny NIE BLOKUJE canvasa
 * > Zoom, pan, zaznaczanie działają pod banerem
 *
 * ETAP-GRADE DESIGN:
 * - Profesjonalny, spokojny wygląd
 * - Ikony techniczne (siatka, schemat)
 * - Ciepłe, stonowane kolory
 * - Jasna hierarchia informacji
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
// Icons for empty states (technical, professional)
// =============================================================================

const EmptyStateIcons: Record<SldEmptyState, React.ReactNode> = {
  NO_PROJECT: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  NO_CASE: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  NO_SNAPSHOT: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  NO_MODEL: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  LOADING: (
    <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// =============================================================================
// Empty State Messages (Polish) — ETAP-grade styling
// =============================================================================

const EMPTY_STATE_CONFIG: Record<SldEmptyState, {
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  accentColor: string;
}> = {
  NO_PROJECT: {
    title: 'Brak aktywnego projektu',
    description: 'Utwórz lub otwórz projekt, aby rozpocząć modelowanie sieci.',
    bgColor: 'bg-amber-50/90',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-900',
    iconColor: 'text-amber-600',
    accentColor: 'bg-amber-600',
  },
  NO_CASE: {
    title: 'Nie wybrano przypadku obliczeniowego',
    description: 'Wybierz istniejący lub utwórz nowy przypadek, aby uruchomić obliczenia.',
    bgColor: 'bg-slate-50/95',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-800',
    iconColor: 'text-slate-500',
    accentColor: 'bg-blue-600',
  },
  NO_SNAPSHOT: {
    title: 'Brak aktywnego snapshotu',
    description: 'Wybierz snapshot w drzewie projektu lub utwórz nowy.',
    bgColor: 'bg-violet-50/90',
    borderColor: 'border-violet-300',
    textColor: 'text-violet-900',
    iconColor: 'text-violet-500',
    accentColor: 'bg-violet-600',
  },
  NO_MODEL: {
    title: 'Pusty schemat jednokreskowy',
    description: 'Dodaj elementy za pomocą paska narzędzi, aby rozpocząć projektowanie sieci.',
    bgColor: 'bg-stone-50/95',
    borderColor: 'border-stone-300',
    textColor: 'text-stone-700',
    iconColor: 'text-stone-400',
    accentColor: 'bg-stone-500',
  },
  LOADING: {
    title: 'Ładowanie schematu...',
    description: 'Trwa ładowanie danych modelu sieci.',
    bgColor: 'bg-slate-50/95',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-600',
    iconColor: 'text-slate-400',
    accentColor: 'bg-slate-400',
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
      {/* ETAP-grade professional styling */}
      <div
        className={clsx(
          'pointer-events-auto',
          'rounded-lg border shadow-md backdrop-blur-sm',
          'px-5 py-4',
          'flex items-center gap-4',
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Left: Icon */}
        <div
          className={clsx(
            'flex-shrink-0 p-2 rounded-lg',
            config.iconColor,
            'bg-white/50'
          )}
        >
          {EmptyStateIcons[resolvedState]}
        </div>

        {/* Middle: Message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className={clsx('text-sm font-semibold', config.textColor)}
              data-testid="sld-empty-overlay-title"
            >
              {config.title}
            </h3>
            {activeMode === 'RESULT_VIEW' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                Tryb wyników
              </span>
            )}
          </div>
          <p className={clsx('text-sm leading-snug', config.textColor, 'opacity-75')}>
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
                  'px-4 py-2 text-sm font-medium rounded-md',
                  config.accentColor, 'text-white',
                  'hover:opacity-90',
                  'transition-all duration-150',
                  'shadow-sm hover:shadow'
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
                  'px-4 py-2 text-sm font-medium rounded-md',
                  config.accentColor, 'text-white',
                  'hover:opacity-90',
                  'transition-all duration-150',
                  'shadow-sm hover:shadow'
                )}
                data-testid="sld-empty-overlay-create-case"
              >
                Utwórz pierwszy przypadek
              </button>
            )}
            {hasCases && onCreateCase && (
              <button
                type="button"
                onClick={onCreateCase}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-md',
                  'bg-white/80 text-slate-700 border border-slate-300',
                  'hover:bg-white hover:border-slate-400',
                  'transition-all duration-150'
                )}
                data-testid="sld-empty-overlay-create-new"
              >
                Nowy przypadek
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SldEmptyOverlay;
