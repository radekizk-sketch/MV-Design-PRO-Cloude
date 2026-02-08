/**
 * Protection Diagnostics Test Fixtures
 *
 * Przykładowe dane do testowania UI panelu diagnostyki.
 * Używane w testach oraz jako placeholder data przed integracją z backendem.
 */

import type { ProtectionSanityCheckResult } from '../types';

/**
 * Fixture: pełny zestaw wyników diagnostyki dla demonstracji.
 * Zawiera różne severity, różne elementy i różne kody reguł.
 */
export const DEMO_DIAGNOSTICS_RESULTS: ProtectionSanityCheckResult[] = [
  // ERROR - brak danych bazowych dla napięcia
  {
    severity: 'ERROR',
    code: 'VOLT_MISSING_UN',
    message_pl: 'Brak wartości Un dla nastawy napięciowej',
    element_id: 'BUS_BoundaryNode_001',
    element_type: 'Bus',
    function_ansi: '27',
    function_code: 'UNDERVOLTAGE',
    evidence: { settingType: 'voltage_pu', missingBase: 'u_rated_kv' },
  },

  // ERROR - brak danych bazowych dla prądu
  {
    severity: 'ERROR',
    code: 'OC_MISSING_IN',
    message_pl: 'Brak wartości In dla nastawy prądowej',
    element_id: 'LINE_WN_001',
    element_type: 'LineBranch',
    function_ansi: '50',
    function_code: 'OVERCURRENT_INST',
    evidence: { settingType: 'current_pu', missingBase: 'i_rated_a' },
  },

  // WARN - nakładanie się progów
  {
    severity: 'WARN',
    code: 'OC_OVERLAP',
    message_pl: 'Nakładanie się progów I> i I>> (I> >= I>>)',
    element_id: 'LINE_WN_001',
    element_type: 'LineBranch',
    function_ansi: '50/51',
    function_code: null,
    evidence: { i_gt_pu: 3.5, i_inst_pu: 3.0 },
  },

  // WARN - próg zbyt niski
  {
    severity: 'WARN',
    code: 'OC_I_GT_TOO_LOW',
    message_pl: 'Próg I> zbyt niski (< 1,0×In)',
    element_id: 'TRAFO_001',
    element_type: 'TransformerBranch',
    function_ansi: '51',
    function_code: 'OVERCURRENT_TIME',
    evidence: { i_gt_pu: 0.8, threshold: 1.0 },
  },

  // WARN - SPZ bez funkcji wyzwalającej
  {
    severity: 'WARN',
    code: 'SPZ_NO_TRIP_FUNCTION',
    message_pl: 'SPZ aktywne bez funkcji wyzwalającej',
    element_id: 'LINE_WN_002',
    element_type: 'LineBranch',
    function_ansi: '79',
    function_code: 'AUTO_RECLOSE',
    evidence: { spz_enabled: true, trip_functions: [] },
  },

  // INFO - analiza częściowa
  {
    severity: 'INFO',
    code: 'GEN_PARTIAL_ANALYSIS',
    message_pl: 'Brak danych bazowych — analiza częściowa',
    element_id: 'LINE_WN_001',
    element_type: 'LineBranch',
    function_ansi: null,
    function_code: null,
    evidence: { missing: ['i_rated_a', 'u_rated_kv'] },
  },

  // INFO - analiza częściowa dla innego elementu
  {
    severity: 'INFO',
    code: 'GEN_PARTIAL_ANALYSIS',
    message_pl: 'Brak danych bazowych — analiza częściowa',
    element_id: 'TRAFO_001',
    element_type: 'TransformerBranch',
    function_ansi: null,
    function_code: null,
    evidence: { missing: ['s_rated_mva'] },
  },
];

/**
 * Fixture: wyniki dla pojedynczego elementu (do testowania Inspector sekcji).
 */
export const SINGLE_ELEMENT_DIAGNOSTICS: ProtectionSanityCheckResult[] = [
  {
    severity: 'ERROR',
    code: 'OC_MISSING_IN',
    message_pl: 'Brak wartości In dla nastawy prądowej',
    element_id: 'LINE_TEST_001',
    element_type: 'LineBranch',
    function_ansi: '50',
  },
  {
    severity: 'WARN',
    code: 'OC_OVERLAP',
    message_pl: 'Nakładanie się progów I> i I>> (I> >= I>>)',
    element_id: 'LINE_TEST_001',
    element_type: 'LineBranch',
    function_ansi: '50/51',
  },
];

/**
 * Fixture: puste wyniki (konfiguracja poprawna).
 */
export const EMPTY_DIAGNOSTICS: ProtectionSanityCheckResult[] = [];

/**
 * Fixture: tylko błędy.
 */
export const ERRORS_ONLY: ProtectionSanityCheckResult[] = DEMO_DIAGNOSTICS_RESULTS.filter(
  (r) => r.severity === 'ERROR'
);

/**
 * Fixture: tylko ostrzeżenia.
 */
export const WARNINGS_ONLY: ProtectionSanityCheckResult[] = DEMO_DIAGNOSTICS_RESULTS.filter(
  (r) => r.severity === 'WARN'
);
