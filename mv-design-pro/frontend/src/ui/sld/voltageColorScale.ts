/**
 * Voltage color scale for SLD overlays.
 *
 * Maps voltage deviation to a color gradient:
 * - Deep red: V < 0.90 p.u. (severe undervoltage)
 * - Orange: 0.90 ≤ V < 0.95 p.u. (undervoltage warning)
 * - Green: 0.95 ≤ V ≤ 1.05 p.u. (normal)
 * - Orange: 1.05 < V ≤ 1.10 p.u. (overvoltage warning)
 * - Deep red: V > 1.10 p.u. (severe overvoltage)
 *
 * Polish labels. Read-only. No model mutations.
 */

export type VoltageColorLevel = 'normal' | 'warning' | 'critical' | 'unknown';

/**
 * Classify voltage p.u. value into severity level.
 */
export function classifyVoltage(uPu: number | undefined | null): VoltageColorLevel {
  if (uPu === undefined || uPu === null) return 'unknown';
  if (uPu < 0.90 || uPu > 1.10) return 'critical';
  if (uPu < 0.95 || uPu > 1.05) return 'warning';
  return 'normal';
}

/**
 * Get Tailwind text color class for voltage level.
 */
export function getVoltageTextColor(level: VoltageColorLevel): string {
  switch (level) {
    case 'critical':
      return 'text-rose-700 font-semibold';
    case 'warning':
      return 'text-amber-700';
    case 'normal':
      return 'text-emerald-700';
    case 'unknown':
    default:
      return 'text-slate-500';
  }
}

/**
 * Get Tailwind background class for voltage level.
 */
export function getVoltageBgColor(level: VoltageColorLevel): string {
  switch (level) {
    case 'critical':
      return 'bg-rose-50 border-rose-300';
    case 'warning':
      return 'bg-amber-50 border-amber-300';
    case 'normal':
      return 'bg-emerald-50 border-emerald-200';
    case 'unknown':
    default:
      return 'bg-slate-50 border-slate-200';
  }
}

/**
 * Get CSS color string for SVG rendering (bus coloring).
 */
export function getVoltageSvgColor(uPu: number | undefined | null): string {
  const level = classifyVoltage(uPu);
  switch (level) {
    case 'critical':
      return '#e11d48'; // rose-600
    case 'warning':
      return '#d97706'; // amber-600
    case 'normal':
      return '#059669'; // emerald-600
    case 'unknown':
    default:
      return '#64748b'; // slate-500
  }
}

/**
 * Get energy validation status color.
 */
export function getEvStatusColor(evStatus: string | null | undefined): string {
  if (!evStatus) return 'text-slate-400';
  switch (evStatus) {
    case 'FAIL':
      return 'text-rose-600 font-semibold';
    case 'WARNING':
      return 'text-amber-600';
    case 'PASS':
      return 'text-emerald-600';
    case 'NOT_COMPUTED':
      return 'text-slate-400';
    default:
      return 'text-slate-400';
  }
}

/**
 * Get energy validation status badge class.
 */
export function getEvStatusBadgeClass(evStatus: string | null | undefined): string {
  if (!evStatus) return '';
  switch (evStatus) {
    case 'FAIL':
      return 'bg-rose-100 text-rose-700 border-rose-300';
    case 'WARNING':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'PASS':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'NOT_COMPUTED':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200';
  }
}

/**
 * Polish label for energy validation status.
 */
export function getEvStatusLabel(evStatus: string | null | undefined): string {
  if (!evStatus) return '';
  switch (evStatus) {
    case 'FAIL':
      return 'Przekroczenie';
    case 'WARNING':
      return 'Ostrzezenie';
    case 'PASS':
      return 'OK';
    case 'NOT_COMPUTED':
      return 'Brak danych';
    default:
      return '';
  }
}

/**
 * Voltage scale legend entries.
 */
export const VOLTAGE_SCALE_ENTRIES = [
  { label: '< 0.90 p.u.', color: '#e11d48', level: 'critical' as VoltageColorLevel },
  { label: '0.90–0.95 p.u.', color: '#d97706', level: 'warning' as VoltageColorLevel },
  { label: '0.95–1.05 p.u.', color: '#059669', level: 'normal' as VoltageColorLevel },
  { label: '1.05–1.10 p.u.', color: '#d97706', level: 'warning' as VoltageColorLevel },
  { label: '> 1.10 p.u.', color: '#e11d48', level: 'critical' as VoltageColorLevel },
] as const;
