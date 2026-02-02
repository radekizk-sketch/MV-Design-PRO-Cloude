/**
 * FIX-12: Tests for Protection Coordination Types
 *
 * Tests cover:
 * - Polish labels presence
 * - Verdict styling
 * - Default values
 */

import { describe, it, expect } from 'vitest';
import {
  LABELS,
  VERDICT_STYLES,
  DEFAULT_CONFIG,
  DEFAULT_CURVE_SETTINGS,
  DEFAULT_STAGE_51,
} from '../types';

describe('Protection Coordination Types', () => {
  describe('LABELS', () => {
    it('should have all required sections', () => {
      expect(LABELS.title).toBeDefined();
      expect(LABELS.subtitle).toBeDefined();
      expect(LABELS.devices).toBeDefined();
      expect(LABELS.settings).toBeDefined();
      expect(LABELS.checks).toBeDefined();
      expect(LABELS.tcc).toBeDefined();
      expect(LABELS.verdict).toBeDefined();
      expect(LABELS.actions).toBeDefined();
      expect(LABELS.tabs).toBeDefined();
    });

    it('should have Polish verdict labels', () => {
      expect(LABELS.verdict.PASS).toBe('Prawidlowa');
      expect(LABELS.verdict.MARGINAL).toBe('Margines niski');
      expect(LABELS.verdict.FAIL).toBe('Nieskoordynowane');
      expect(LABELS.verdict.ERROR).toBe('Blad analizy');
    });

    it('should have Polish device type labels', () => {
      expect(LABELS.deviceTypes.RELAY).toBe('Przekaznik nadpradowy');
      expect(LABELS.deviceTypes.FUSE).toBe('Bezpiecznik');
      expect(LABELS.deviceTypes.RECLOSER).toBe('Wylacznik samoczynny');
      expect(LABELS.deviceTypes.CIRCUIT_BREAKER).toBe('Wylacznik z wyzwalaczem');
    });

    it('should have Polish curve type labels', () => {
      expect(LABELS.curveTypes.SI).toContain('Normalna odwrotna');
      expect(LABELS.curveTypes.VI).toContain('Bardzo odwrotna');
      expect(LABELS.curveTypes.EI).toContain('Ekstremalnie odwrotna');
      expect(LABELS.curveTypes.DT).toContain('niezalezny');
    });

    it('should have all tab labels', () => {
      expect(LABELS.tabs.summary).toBe('Podsumowanie');
      expect(LABELS.tabs.sensitivity).toBe('Czulosc');
      expect(LABELS.tabs.selectivity).toBe('Selektywnosc');
      expect(LABELS.tabs.overload).toBe('Przeciazalnosc');
      expect(LABELS.tabs.tcc).toBe('Wykres TCC');
      expect(LABELS.tabs.trace).toBe('Slad obliczen');
    });
  });

  describe('VERDICT_STYLES', () => {
    it('should have styles for all verdicts', () => {
      expect(VERDICT_STYLES.PASS).toBeDefined();
      expect(VERDICT_STYLES.MARGINAL).toBeDefined();
      expect(VERDICT_STYLES.FAIL).toBeDefined();
      expect(VERDICT_STYLES.ERROR).toBeDefined();
    });

    it('should have appropriate colors for PASS', () => {
      expect(VERDICT_STYLES.PASS.bg).toContain('emerald');
      expect(VERDICT_STYLES.PASS.text).toContain('emerald');
    });

    it('should have appropriate colors for FAIL', () => {
      expect(VERDICT_STYLES.FAIL.bg).toContain('rose');
      expect(VERDICT_STYLES.FAIL.text).toContain('rose');
    });

    it('should have appropriate colors for MARGINAL', () => {
      expect(VERDICT_STYLES.MARGINAL.bg).toContain('amber');
      expect(VERDICT_STYLES.MARGINAL.text).toContain('amber');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_CONFIG.breaker_time_s).toBe(0.05);
      expect(DEFAULT_CONFIG.relay_overtravel_s).toBe(0.05);
      expect(DEFAULT_CONFIG.safety_factor_s).toBe(0.1);
      expect(DEFAULT_CONFIG.sensitivity_margin_pass).toBe(1.5);
      expect(DEFAULT_CONFIG.sensitivity_margin_marginal).toBe(1.2);
      expect(DEFAULT_CONFIG.overload_margin_pass).toBe(1.2);
      expect(DEFAULT_CONFIG.overload_margin_marginal).toBe(1.1);
    });

    it('should have CTI total of 0.2s', () => {
      const cti =
        DEFAULT_CONFIG.breaker_time_s +
        DEFAULT_CONFIG.relay_overtravel_s +
        DEFAULT_CONFIG.safety_factor_s;
      expect(cti).toBe(0.2);
    });
  });

  describe('DEFAULT_CURVE_SETTINGS', () => {
    it('should default to IEC SI curve', () => {
      expect(DEFAULT_CURVE_SETTINGS.standard).toBe('IEC');
      expect(DEFAULT_CURVE_SETTINGS.variant).toBe('SI');
    });

    it('should have typical pickup current', () => {
      expect(DEFAULT_CURVE_SETTINGS.pickup_current_a).toBe(400);
    });

    it('should have reasonable TMS', () => {
      expect(DEFAULT_CURVE_SETTINGS.time_multiplier).toBe(0.3);
    });
  });

  describe('DEFAULT_STAGE_51', () => {
    it('should be enabled by default', () => {
      expect(DEFAULT_STAGE_51.enabled).toBe(true);
    });

    it('should not be directional by default', () => {
      expect(DEFAULT_STAGE_51.directional).toBe(false);
    });

    it('should have curve settings', () => {
      expect(DEFAULT_STAGE_51.curve_settings).toBeDefined();
    });
  });
});

describe('Type Integrity', () => {
  it('should have no project codenames in labels', () => {
    // Convert all labels to a single string for searching
    const allLabels = JSON.stringify(LABELS);

    // Forbidden codenames from CLAUDE.md
    const forbiddenCodenames = ['P7', 'P11', 'P14', 'P15', 'P17', 'P20', 'FIX-'];

    for (const codename of forbiddenCodenames) {
      expect(allLabels).not.toContain(codename);
    }
  });
});
