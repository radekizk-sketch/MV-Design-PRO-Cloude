/**
 * IEC SLD Color System — ABB/ETAP Industrial Palette
 *
 * Single source of truth for the industrial-grade SLD color scheme.
 * Colors aligned with IEC 60617 / ETAP / ABB conventions.
 *
 * 100% Polish labels in UI-facing exports.
 */

// =============================================================================
// CORE PALETTE
// =============================================================================

export const IEC_COLORS = {
  /** Tło główne */
  bg: '#FFFFFF',
  /** Siatka tła */
  grid: '#E2E8F0',
  /** Tekst główny */
  primaryText: '#0F172A',
  /** Tekst drugorzędny */
  secondaryText: '#475569',
  /** Szyna/linia SN 15kV — głęboki granat ETAP */
  hvBus: '#0A4A90',
  /** Szyna nN 0.4kV — pomarańcz branżowy */
  lvBus: '#D97706',
  /** Odgałęzienie SN */
  branch: '#2563EB',
  /** Obramowanie ramki stacji */
  boxBorder: '#94A3B8',
  /** Wypełnienie ramki stacji */
  boxFill: '#F8FAFC',
  /** Wyłącznik zamknięty (pod napięciem) — czerwony */
  breakerClosed: '#DC2626',
  /** Wyłącznik otwarty (bezpieczny) — zielony */
  breakerOpen: '#16A34A',
  /** Odbiór mocy */
  derLoad: '#EF4444',
  /** Generacja PV (OZE) — słoneczny żółty */
  derPv: '#EAB308',
  /** Magazyn energii (BESS) — szmaragdowy */
  derBess: '#10B981',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const IEC_TYPOGRAPHY = {
  fontFamily: 'Inter, sans-serif',
  monoFontFamily: "'JetBrains Mono', monospace",
  fontSize: {
    title: 12,
    subtitle: 9,
    label: 11,
    param: 10,
    tag: 10,
    small: 9,
  },
  fontWeight: {
    bold: 700,
    semibold: 600,
    medium: 500,
    normal: 400,
  },
} as const;
