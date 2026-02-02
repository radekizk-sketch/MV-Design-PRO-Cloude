/**
 * Verdict Messages — Komunikaty werdyktów UI
 *
 * CANONICAL ALIGNMENT:
 * - 100% Polish UI
 * - NOT-A-SOLVER: This is PRESENTATION layer only
 * - Wewnętrzne werdykty (ZGODNE/GRANICZNE/NIEZGODNE) pozostają bez zmian
 * - Zmiana dotyczy WYŁĄCZNIE warstwy prezentacji
 *
 * Mapowanie werdyktów na przyjazne komunikaty użytkownika:
 * - ZGODNE → "Zgodne"
 * - GRANICZNE → "Na granicy dopuszczalności"
 * - NIEZGODNE → "Wymaga korekty"
 */

// =============================================================================
// Verdict Types (internal, unchanged)
// =============================================================================

export type ReferenceVerdict = 'ZGODNE' | 'GRANICZNE' | 'NIEZGODNE';
export type CoordinationVerdict = 'PASS' | 'MARGINAL' | 'FAIL' | 'ERROR';

// =============================================================================
// UI Status Labels (user-facing)
// =============================================================================

/**
 * Mapowanie werdyktów na etykiety statusu UI.
 * Zastępuje "wyrokowe" komunikaty przyjazniejszymi dla użytkownika.
 */
export const VERDICT_UI_LABELS: Record<ReferenceVerdict, string> = {
  ZGODNE: 'Zgodne',
  GRANICZNE: 'Na granicy dopuszczalności',
  NIEZGODNE: 'Wymaga korekty',
};

/**
 * Mapowanie werdyktów koordynacji na etykiety statusu UI.
 */
export const COORDINATION_VERDICT_UI_LABELS: Record<CoordinationVerdict, string> = {
  PASS: 'Zgodne',
  MARGINAL: 'Na granicy dopuszczalności',
  FAIL: 'Wymaga korekty',
  ERROR: 'Wystąpił błąd',
};

// =============================================================================
// Structured Message Interface
// =============================================================================

/**
 * Struktura komunikatu UI dla wyników innych niż "Zgodne".
 * Format: Status → Przyczyna → Skutek → Zalecenie
 */
export interface VerdictMessage {
  /** Krótki status (etykieta/badge) */
  status: string;
  /** Przyczyna techniczna (jeśli dostępna) */
  cause?: string;
  /** Skutek (jeśli dostępny) */
  effect?: string;
  /** Zalecenie dla użytkownika */
  recommendation?: string;
}

// =============================================================================
// Default Messages
// =============================================================================

const DEFAULT_RECOMMENDATION =
  'Brak automatycznego zalecenia – sprawdź szczegóły w śladzie obliczeń.';

/**
 * Domyślne opisy dla werdyktów UI.
 */
export const VERDICT_UI_DESCRIPTIONS: Record<ReferenceVerdict, string> = {
  ZGODNE: 'Wszystkie kryteria spełnione, konfiguracja prawidłowa.',
  GRANICZNE:
    'Warunki spełnione z ograniczeniami. Zalecana weryfikacja marginesów bezpieczeństwa.',
  NIEZGODNE:
    'Kryteria niespełnione. Wymagana korekta konfiguracji przed zatwierdzeniem.',
};

/**
 * Domyślne opisy dla werdyktów koordynacji UI.
 */
export const COORDINATION_VERDICT_UI_DESCRIPTIONS: Record<CoordinationVerdict, string> = {
  PASS: 'Koordynacja prawidłowa, wszystkie kryteria spełnione.',
  MARGINAL:
    'Koordynacja z niskim marginesem. Zalecana weryfikacja parametrów.',
  FAIL: 'Brak prawidłowej koordynacji. Wymagana korekta nastaw.',
  ERROR: 'Wystąpił błąd podczas analizy. Sprawdź dane wejściowe.',
};

// =============================================================================
// Message Builders
// =============================================================================

/**
 * Buduje strukturalny komunikat UI na podstawie werdyktu i dostępnych danych.
 *
 * @param verdict - Werdykt wewnętrzny
 * @param diagnosticMessage - Komunikat diagnostyczny z backendu (jeśli dostępny)
 * @param validationNotes - Notatki walidacyjne (jeśli dostępne)
 * @returns Strukturalny komunikat VerdictMessage
 */
export function buildVerdictMessage(
  verdict: ReferenceVerdict,
  diagnosticMessage?: string | null,
  validationNotes?: string | null
): VerdictMessage {
  const status = VERDICT_UI_LABELS[verdict];

  if (verdict === 'ZGODNE') {
    return { status };
  }

  const message: VerdictMessage = {
    status,
    cause: diagnosticMessage ?? undefined,
  };

  // Add effect based on verdict
  if (verdict === 'NIEZGODNE') {
    message.effect = 'Wynik nie może być zatwierdzony do realizacji.';
  } else if (verdict === 'GRANICZNE') {
    message.effect = 'Wynik wymaga szczególnej uwagi przed zatwierdzeniem.';
  }

  // Add recommendation
  message.recommendation = validationNotes ?? DEFAULT_RECOMMENDATION;

  return message;
}

/**
 * Buduje strukturalny komunikat UI dla werdyktu koordynacji.
 *
 * @param verdict - Werdykt koordynacji
 * @param notesPl - Notatki z analizy (jeśli dostępne)
 * @returns Strukturalny komunikat VerdictMessage
 */
export function buildCoordinationVerdictMessage(
  verdict: CoordinationVerdict,
  notesPl?: string | null
): VerdictMessage {
  const status = COORDINATION_VERDICT_UI_LABELS[verdict];

  if (verdict === 'PASS') {
    return { status };
  }

  const message: VerdictMessage = {
    status,
    cause: notesPl ?? undefined,
  };

  // Add effect based on verdict
  if (verdict === 'FAIL') {
    message.effect = 'W obecnej konfiguracji możliwe jest błędne zadziałanie zabezpieczenia.';
  } else if (verdict === 'MARGINAL') {
    message.effect = 'Margines bezpieczeństwa jest niewystarczający.';
  } else if (verdict === 'ERROR') {
    message.effect = 'Analiza nie mogła zostać ukończona.';
  }

  // Add recommendation if not provided
  if (!notesPl) {
    message.recommendation = DEFAULT_RECOMMENDATION;
  }

  return message;
}

// =============================================================================
// Color Mappings (consistent across UI)
// =============================================================================

/**
 * Kolory dla werdyktów UI (bez czerwonych "alertów błędu" dla "Wymaga korekty").
 * Używamy łagodniejszych tonów dla wyników wymagających korekty.
 */
export const VERDICT_UI_COLORS: Record<ReferenceVerdict, string> = {
  ZGODNE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  GRANICZNE: 'bg-amber-100 text-amber-800 border-amber-300',
  NIEZGODNE: 'bg-orange-100 text-orange-800 border-orange-300',
};

export const VERDICT_UI_BADGE_COLORS: Record<ReferenceVerdict, string> = {
  ZGODNE: 'bg-emerald-600 text-white',
  GRANICZNE: 'bg-amber-500 text-white',
  NIEZGODNE: 'bg-orange-500 text-white',
};

/**
 * Kolory dla werdyktów koordynacji UI.
 */
export const COORDINATION_VERDICT_UI_COLORS: Record<
  CoordinationVerdict,
  { bg: string; text: string; border: string }
> = {
  PASS: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  MARGINAL: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
  },
  FAIL: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
  },
  ERROR: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
};

// =============================================================================
// Cause Extractors (from existing diagnostic data)
// =============================================================================

/**
 * Typowe przyczyny techniczne mapowane na czytelne komunikaty.
 * Używane do parsowania komunikatów diagnostycznych z backendu.
 */
export const CAUSE_TRANSLATIONS: Record<string, string> = {
  // Thermal criteria
  thermal_exceeded: 'Przekroczone kryterium cieplne linii',
  thermal_data_missing: 'Brak danych cieplnych kabla',
  ithn_exceeded: 'Prąd znamionowy cieplny przekroczony',

  // Selectivity criteria
  selectivity_lost: 'Utrata selektywności z zabezpieczeniem nadrzędnym',
  margin_insufficient: 'Niewystarczający margines czasowy',

  // Sensitivity criteria
  sensitivity_insufficient: 'Niewystarczająca czułość zabezpieczenia',
  pickup_too_high: 'Prąd rozruchowy zbyt wysoki',

  // Window criteria
  window_invalid: 'Brak prawidłowego okna nastaw',
  window_too_narrow: 'Okno nastaw zbyt wąskie',

  // General
  data_missing: 'Brak wymaganych danych wejściowych',
  calculation_error: 'Błąd podczas obliczeń',
};

/**
 * Typowe zalecenia mapowane na czytelne komunikaty.
 */
export const RECOMMENDATION_TEMPLATES: Record<string, string> = {
  // Thermal recommendations
  thermal_exceeded: 'Sprawdź dane cieplne w katalogu kabla lub zwiększ przekrój przewodu.',
  thermal_data_missing: 'Uzupełnij dane cieplne kabla w katalogu elementów.',

  // Selectivity recommendations
  selectivity_lost:
    'Rozważ zwiększenie stopniowania czasowego lub zmianę charakterystyki.',
  margin_insufficient:
    'Zwiększ margines czasowy lub zmień nastawy zabezpieczenia nadrzędnego.',

  // Sensitivity recommendations
  sensitivity_insufficient: 'Zmniejsz prąd rozruchowy lub zwiększ czułość.',
  pickup_too_high: 'Zmniejsz prąd rozruchowy zabezpieczenia.',

  // Window recommendations
  window_invalid: 'Sprawdź parametry sieci i nastawy zabezpieczeń.',
  window_too_narrow: 'Rozważ zmianę przekroju lub skrócenie czasu SPZ.',

  // General
  data_missing: 'Uzupełnij brakujące dane wejściowe.',
  calculation_error: 'Sprawdź poprawność danych wejściowych i powtórz obliczenia.',
};

/**
 * Próbuje wyodrębnić przyczynę techniczną z komunikatu diagnostycznego.
 * Jeśli nie znajdzie dopasowania, zwraca oryginalny komunikat.
 *
 * @param diagnosticMessage - Komunikat diagnostyczny z backendu
 * @returns Czytelna przyczyna techniczna
 */
export function extractCause(diagnosticMessage: string | null | undefined): string | undefined {
  if (!diagnosticMessage) return undefined;

  const lowerMessage = diagnosticMessage.toLowerCase();

  for (const [key, translation] of Object.entries(CAUSE_TRANSLATIONS)) {
    if (lowerMessage.includes(key.replace(/_/g, ' ')) || lowerMessage.includes(key)) {
      return translation;
    }
  }

  // Return original message if no translation found
  return diagnosticMessage;
}

/**
 * Próbuje wygenerować zalecenie na podstawie przyczyny.
 *
 * @param cause - Przyczyna techniczna
 * @returns Zalecenie dla użytkownika
 */
export function generateRecommendation(cause: string | null | undefined): string {
  if (!cause) return DEFAULT_RECOMMENDATION;

  const lowerCause = cause.toLowerCase();

  for (const [key, recommendation] of Object.entries(RECOMMENDATION_TEMPLATES)) {
    if (lowerCause.includes(key.replace(/_/g, ' ')) || lowerCause.includes(key)) {
      return recommendation;
    }
  }

  return DEFAULT_RECOMMENDATION;
}

// =============================================================================
// Export index
// =============================================================================

export const VerdictMessages = {
  labels: VERDICT_UI_LABELS,
  coordinationLabels: COORDINATION_VERDICT_UI_LABELS,
  descriptions: VERDICT_UI_DESCRIPTIONS,
  coordinationDescriptions: COORDINATION_VERDICT_UI_DESCRIPTIONS,
  colors: VERDICT_UI_COLORS,
  badgeColors: VERDICT_UI_BADGE_COLORS,
  coordinationColors: COORDINATION_VERDICT_UI_COLORS,
  buildMessage: buildVerdictMessage,
  buildCoordinationMessage: buildCoordinationVerdictMessage,
  extractCause,
  generateRecommendation,
  DEFAULT_RECOMMENDATION,
};
