/**
 * Mode Gate Component — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.2: Operating modes
 * - powerfactory_ui_parity.md § A: Mode-based gating
 *
 * Component for declarative mode-based UI gating.
 * Shows children only when mode conditions are met.
 * Optionally shows blocked message when conditions fail.
 *
 * HARD BLOCKS (Polish messages):
 * - MODEL_EDIT: model mutable
 * - CASE_CONFIG: model read-only, case config mutable
 * - RESULT_VIEW: everything read-only
 */

import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { useActiveMode } from '../app-state';
import { notify } from '../notifications/store';
import type { OperatingMode } from '../types';

// =============================================================================
// Types
// =============================================================================

interface ModeGateProps {
  /** Modes in which children are shown */
  allowedModes: OperatingMode[];
  /** Children to render when allowed */
  children: ReactNode;
  /** Fallback to render when blocked (optional) */
  fallback?: ReactNode;
  /** Show blocked message instead of hiding (optional) */
  showBlockedMessage?: boolean;
  /** Custom blocked message (Polish) */
  blockedMessage?: string;
}

interface BlockedOverlayProps {
  /** Children to overlay */
  children: ReactNode;
  /** Whether to show blocked state */
  blocked: boolean;
  /** Custom message for blocked state */
  message?: string;
  /** Click handler when blocked (shows message) */
  onBlockedClick?: () => void;
}

// =============================================================================
// Default Messages (Polish)
// =============================================================================

const DEFAULT_BLOCKED_MESSAGES: Record<OperatingMode, string> = {
  MODEL_EDIT: '', // Never blocked in MODEL_EDIT for model operations
  CASE_CONFIG: 'Edycja modelu zablokowana w trybie konfiguracji przypadku',
  RESULT_VIEW: 'Akcja niedostępna w trybie wyników',
};

// =============================================================================
// ModeGate Component
// =============================================================================

/**
 * Conditionally render children based on operating mode.
 *
 * @example
 * ```tsx
 * <ModeGate allowedModes={['MODEL_EDIT']}>
 *   <EditButton />
 * </ModeGate>
 * ```
 */
export function ModeGate({
  allowedModes,
  children,
  fallback = null,
  showBlockedMessage = false,
  blockedMessage,
}: ModeGateProps) {
  const mode = useActiveMode();
  const isAllowed = allowedModes.includes(mode);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (showBlockedMessage) {
    const message = blockedMessage || DEFAULT_BLOCKED_MESSAGES[mode];
    return (
      <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 italic">
        {message}
      </div>
    );
  }

  return <>{fallback}</>;
}

// =============================================================================
// BlockedOverlay Component
// =============================================================================

/**
 * Overlay component that disables interactions and shows blocked state.
 *
 * @example
 * ```tsx
 * <BlockedOverlay blocked={mode !== 'MODEL_EDIT'} message="Edycja zablokowana">
 *   <Form />
 * </BlockedOverlay>
 * ```
 */
export function BlockedOverlay({
  children,
  blocked,
  message = 'Akcja niedostępna w trybie wyników',
  onBlockedClick,
}: BlockedOverlayProps) {
  const handleClick = () => {
    if (blocked && onBlockedClick) {
      onBlockedClick();
    } else if (blocked) {
      notify(message, 'warning');
    }
  };

  return (
    <div className="relative">
      {children}
      {blocked && (
        <div
          onClick={handleClick}
          className={clsx(
            'absolute inset-0 z-10',
            'bg-gray-100/50 cursor-not-allowed',
            'flex items-center justify-center'
          )}
          title={message}
        >
          <span className="sr-only">{message}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Specialized Gate Components
// =============================================================================

/**
 * Gate for model editing operations.
 * Only shows children in MODEL_EDIT mode.
 */
export function ModelEditGate({
  children,
  fallback,
  showBlockedMessage = false,
}: Omit<ModeGateProps, 'allowedModes'>) {
  return (
    <ModeGate
      allowedModes={['MODEL_EDIT']}
      fallback={fallback}
      showBlockedMessage={showBlockedMessage}
      blockedMessage="Edycja modelu zablokowana. Przejdź do trybu edycji modelu."
    >
      {children}
    </ModeGate>
  );
}

/**
 * Gate for case configuration operations.
 * Shows children in MODEL_EDIT and CASE_CONFIG modes.
 */
export function CaseConfigGate({
  children,
  fallback,
  showBlockedMessage = false,
}: Omit<ModeGateProps, 'allowedModes'>) {
  return (
    <ModeGate
      allowedModes={['MODEL_EDIT', 'CASE_CONFIG']}
      fallback={fallback}
      showBlockedMessage={showBlockedMessage}
      blockedMessage="Konfiguracja przypadku zablokowana w trybie wyników."
    >
      {children}
    </ModeGate>
  );
}

/**
 * Gate for result viewing operations.
 * Only shows children in RESULT_VIEW mode.
 */
export function ResultViewGate({
  children,
  fallback,
}: Omit<ModeGateProps, 'allowedModes' | 'showBlockedMessage'>) {
  return (
    <ModeGate allowedModes={['RESULT_VIEW']} fallback={fallback}>
      {children}
    </ModeGate>
  );
}

export default ModeGate;
