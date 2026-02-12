/**
 * Delta Overlay Token Mapping Tests -- PR-21
 *
 * Verifies that delta overlay tokens (delta_none, delta_change, delta_inactive)
 * are properly mapped in the overlay engine.
 *
 * INVARIANTS:
 * - Delta tokens produce valid CSS classes
 * - No hex colors anywhere in output
 * - Deterministic mapping
 */

import { describe, it, expect } from 'vitest';
import { resolveElementStyle } from '../OverlayEngine';
import { COLOR_TOKEN_MAP } from '../overlayTypes';
import type { OverlayElement } from '../overlayTypes';

const makeDeltaElement = (
  ref: string,
  colorToken: string,
  visualState: 'OK' | 'WARNING' | 'CRITICAL' | 'INACTIVE',
  strokeToken: string = 'normal'
): OverlayElement => ({
  element_ref: ref,
  element_type: 'Source',
  visual_state: visualState,
  numeric_badges: { delta_abs: 10.0, delta_rel: 0.05 },
  color_token: colorToken,
  stroke_token: strokeToken,
  animation_token: null,
});

describe('Delta Overlay Token Mapping (PR-21)', () => {
  it('delta_none token maps to sld-overlay-ok class', () => {
    const element = makeDeltaElement('src_A', 'delta_none', 'OK');
    const style = resolveElementStyle(element);
    expect(style.colorClass).toBe('sld-overlay-ok');
  });

  it('delta_change token maps to sld-overlay-warning class', () => {
    const element = makeDeltaElement('src_B', 'delta_change', 'WARNING', 'bold');
    const style = resolveElementStyle(element);
    expect(style.colorClass).toBe('sld-overlay-warning');
  });

  it('delta_inactive token maps to sld-overlay-inactive class', () => {
    const element = makeDeltaElement('src_C', 'delta_inactive', 'INACTIVE');
    const style = resolveElementStyle(element);
    expect(style.colorClass).toBe('sld-overlay-inactive');
  });

  it('all delta tokens are present in COLOR_TOKEN_MAP', () => {
    expect('delta_none' in COLOR_TOKEN_MAP).toBe(true);
    expect('delta_change' in COLOR_TOKEN_MAP).toBe(true);
    expect('delta_inactive' in COLOR_TOKEN_MAP).toBe(true);
  });

  it('delta token mapping is deterministic', () => {
    const element = makeDeltaElement('src_D', 'delta_change', 'WARNING');
    const style1 = resolveElementStyle(element);
    const style2 = resolveElementStyle(element);
    expect(style1).toEqual(style2);
  });

  it('no hex colors in resolved delta styles', () => {
    const tokens = ['delta_none', 'delta_change', 'delta_inactive'] as const;
    const states = ['OK', 'WARNING', 'INACTIVE'] as const;
    const hexPattern = /#[0-9a-fA-F]{3,8}/;

    for (let i = 0; i < tokens.length; i++) {
      const element = makeDeltaElement(`src_${i}`, tokens[i], states[i]);
      const style = resolveElementStyle(element);
      const styleStr = JSON.stringify(style);
      expect(hexPattern.test(styleStr)).toBe(false);
    }
  });

  it('delta elements pass through numeric badges without modification', () => {
    const badges = {
      ikss_base: 1000.0,
      ikss_other: 1050.0,
      ikss_abs: 50.0,
      ikss_rel: 0.05,
    };
    const element: OverlayElement = {
      element_ref: 'src_test',
      element_type: 'Source',
      visual_state: 'WARNING',
      numeric_badges: badges,
      color_token: 'delta_change',
      stroke_token: 'bold',
      animation_token: null,
    };

    const style = resolveElementStyle(element);
    expect(style.numericBadges).toEqual(badges);
    expect(style.numericBadges['ikss_base']).toBe(1000.0);
    expect(style.numericBadges['ikss_abs']).toBe(50.0);
  });
});
