/**
 * OperationFormShell — Common shell for domain operation forms.
 *
 * Provides consistent layout: header (title + description), scrollable
 * content area, error banner, and sticky footer with Cancel / Submit buttons.
 *
 * BINDING: 100% PL labels.
 */

import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface OperationFormShellProps {
  title: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  error?: string | null;
  onCancel?: () => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  children: ReactNode;
}

export function OperationFormShell({
  title,
  description,
  submitLabel = 'Zatwierdź',
  cancelLabel = 'Anuluj',
  error,
  onCancel,
  onSubmit,
  submitDisabled = false,
  children,
}: OperationFormShellProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-chrome-200 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-chrome-900">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-chrome-500">{description}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>

      {/* Error banner */}
      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2">
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-chrome-200 bg-chrome-50 px-4 py-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-xs font-medium text-chrome-600 hover:bg-chrome-100"
          >
            {cancelLabel}
          </button>
        )}
        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className={clsx(
              'rounded px-3 py-1.5 text-xs font-semibold text-white',
              submitDisabled
                ? 'cursor-not-allowed bg-chrome-300'
                : 'bg-blue-600 hover:bg-blue-700',
            )}
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
