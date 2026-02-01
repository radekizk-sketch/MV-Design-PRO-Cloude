/**
 * Feature Flags — konfiguracja funkcjonalności UI
 *
 * ZASADY:
 * - Każda flaga domyślnie może być nadpisana przez env variable
 * - Format env: VITE_FF_<NAZWA_FLAGI>
 * - Wszystkie flagi są read-only w runtime
 *
 * UŻYCIE:
 * import { featureFlags } from '@/ui/config/featureFlags';
 * if (featureFlags.ENABLE_MATH_RENDERING) { ... }
 */

// =============================================================================
// Helper
// =============================================================================

/**
 * Parsuj wartość env na boolean.
 * Akceptuje: "true", "1", "yes" jako true, reszta to false.
 */
function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Bezpiecznie pobierz zmienną env dla Vite.
 * Używa import.meta.env jeśli dostępne, inaczej zwraca undefined.
 */
function getViteEnv(key: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any).env;
    return env?.[key];
  } catch {
    return undefined;
  }
}

// =============================================================================
// Feature Flags
// =============================================================================

export interface FeatureFlags {
  /**
   * ENABLE_MATH_RENDERING
   *
   * Włącza renderowanie wzorów matematycznych LaTeX przez KaTeX
   * w widoku "Ślad obliczeń".
   *
   * Gdy wyłączone: LaTeX wyświetlany jako czysty tekst (kod).
   * Gdy włączone: LaTeX renderowany wizualnie przez KaTeX.
   *
   * Domyślnie: true (ON)
   * Env override: VITE_FF_ENABLE_MATH_RENDERING
   */
  ENABLE_MATH_RENDERING: boolean;
}

/**
 * Globalne feature flags.
 * Frozen object — immutable w runtime.
 */
export const featureFlags: Readonly<FeatureFlags> = Object.freeze({
  ENABLE_MATH_RENDERING: parseEnvBoolean(
    getViteEnv('VITE_FF_ENABLE_MATH_RENDERING'),
    true // domyślnie ON
  ),
});

/**
 * Hook do dostępu do feature flags w komponentach React.
 * Zwraca immutable obiekt flag.
 */
export function useFeatureFlags(): Readonly<FeatureFlags> {
  return featureFlags;
}

/**
 * Sprawdź czy konkretna flaga jest włączona.
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}
