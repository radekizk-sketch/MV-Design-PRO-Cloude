/**
 * DesignerWizard
 *
 * Read-only wizard skeleton rendering canonical algorithm steps 1:1.
 * Presentational only: renders provided step data without fetching.
 */

export type WizardStatus = 'ALLOW' | 'BLOCK' | 'RETURN' | 'WARNING';

export interface WizardStep {
  stepNumber: number;
  title: string;
  status: WizardStatus;
  reason?: string | null;
}

interface Props {
  steps: WizardStep[];
}

const statusStyles: Record<WizardStatus, string> = {
  ALLOW: 'bg-green-100 text-green-800',
  BLOCK: 'bg-red-100 text-red-800',
  RETURN: 'bg-yellow-100 text-yellow-800',
  WARNING: 'bg-orange-100 text-orange-800',
};

export function DesignerWizard({ steps }: Props) {
  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-lg font-semibold mb-1">Designer Wizard (Read-Only)</h2>
      <p className="text-xs text-gray-500 mb-4">
        Canonical algorithm steps rendered 1:1. Statuses reflect backend decisions only.
      </p>

      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.stepNumber} className="border rounded p-3 bg-gray-50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs text-gray-500">ALG_STEP {step.stepNumber}</div>
                <div className="font-medium text-gray-900">{step.title}</div>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded font-semibold ${statusStyles[step.status]}`}
              >
                {step.status}
              </span>
            </div>
            {step.reason && (
              <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-words">
                {step.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
