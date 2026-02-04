/**
 * ETAP Style System — Snapshot Tests
 *
 * PR-SLD-ETAP-STYLE-02: ETAP 1:1 Visual Parity
 *
 * PURPOSE:
 * - Ensure style tokens remain stable across changes
 * - Prevent accidental regressions in visual styling
 * - Document canonical ETAP style values
 *
 * RULES:
 * - If a snapshot changes, review carefully before accepting
 * - Style changes should be intentional and documented
 */

import { describe, it, expect } from 'vitest';
import {
  ETAP_STROKE,
  ETAP_STROKE_SELECTED,
  ETAP_VOLTAGE_COLORS,
  ETAP_VOLTAGE_MAP,
  ETAP_STATE_COLORS,
  ETAP_FILL_COLORS,
  ETAP_TYPOGRAPHY,
  ETAP_LABEL_ANCHORS,
  ETAP_LINE_LABEL,
  ETAP_CALLOUT,
  ETAP_CALLOUT_ANCHORS,
  ETAP_SYMBOL_SIZES,
  ETAP_GRID,
  getEtapVoltageColor,
  getEtapStrokeColor,
  getEtapFillColor,
  getEtapOpacity,
  getEtapLabelAnchor,
  getEtapSymbolSize,
  getEtapStrokeWidth,
} from '../sldEtapStyle';

describe('sldEtapStyle', () => {
  describe('Style Token Stability', () => {
    it('ETAP_STROKE hierarchy is stable', () => {
      expect(ETAP_STROKE).toMatchInlineSnapshot(`
        {
          "aux": 1.5,
          "busbar": 5,
          "detail": 1,
          "feeder": 2.5,
          "leader": 1,
          "symbol": 2,
        }
      `);
    });

    it('ETAP_STROKE_SELECTED hierarchy is stable', () => {
      expect(ETAP_STROKE_SELECTED).toMatchInlineSnapshot(`
        {
          "aux": 2,
          "busbar": 6,
          "detail": 1.5,
          "feeder": 3.5,
          "leader": 1.5,
          "symbol": 3,
        }
      `);
    });

    it('ETAP_VOLTAGE_COLORS palette is stable', () => {
      expect(ETAP_VOLTAGE_COLORS).toMatchInlineSnapshot(`
        {
          "SN": "#1D4ED8",
          "WN": "#B91C1C",
          "default": "#374151",
          "nN": "#B45309",
        }
      `);
    });

    it('ETAP_STATE_COLORS palette is stable', () => {
      expect(ETAP_STATE_COLORS).toMatchInlineSnapshot(`
        {
          "deenergized": "#6B7280",
          "energized": null,
          "error": "#DC2626",
          "info": "#2563EB",
          "outOfService": "#9CA3AF",
          "selected": "#2563EB",
          "warning": "#D97706",
        }
      `);
    });

    it('ETAP_FILL_COLORS palette is stable', () => {
      expect(ETAP_FILL_COLORS).toMatchInlineSnapshot(`
        {
          "deenergized": "#F3F4F6",
          "none": "none",
          "normal": "#FFFFFF",
          "selected": "#DBEAFE",
        }
      `);
    });

    it('ETAP_TYPOGRAPHY settings are stable', () => {
      expect(ETAP_TYPOGRAPHY).toMatchInlineSnapshot(`
        {
          "fontFamily": "'Inter', 'Segoe UI', 'Arial', sans-serif",
          "fontSize": {
            "large": 12,
            "medium": 10,
            "small": 9,
            "xsmall": 8,
          },
          "fontWeight": {
            "bold": 700,
            "medium": 500,
            "normal": 400,
            "semibold": 600,
          },
          "labelColor": "#1F2937",
          "lineHeight": {
            "normal": 1.3,
            "relaxed": 1.5,
            "tight": 1.1,
          },
          "secondaryColor": "#4B5563",
        }
      `);
    });

    it('ETAP_SYMBOL_SIZES are stable', () => {
      expect(ETAP_SYMBOL_SIZES).toMatchInlineSnapshot(`
        {
          "Bus": {
            "height": 20,
            "width": 100,
          },
          "LineBranch": {
            "height": 30,
            "width": 50,
          },
          "Load": {
            "height": 44,
            "width": 36,
          },
          "Source": {
            "height": 60,
            "width": 50,
          },
          "Switch": {
            "height": 48,
            "width": 36,
          },
          "TransformerBranch": {
            "height": 56,
            "width": 40,
          },
          "default": {
            "height": 40,
            "width": 40,
          },
        }
      `);
    });

    it('ETAP_GRID settings are stable', () => {
      expect(ETAP_GRID).toMatchInlineSnapshot(`
        {
          "defaultVisible": true,
          "majorColor": "#E5E7EB",
          "majorEvery": 5,
          "majorStrokeWidth": 0.75,
          "minorColor": "#F3F4F6",
          "minorStrokeWidth": 0.5,
          "size": 20,
        }
      `);
    });

    it('ETAP_LABEL_ANCHORS are stable', () => {
      expect(ETAP_LABEL_ANCHORS).toMatchInlineSnapshot(`
        {
          "Bus": {
            "offsetX": 0,
            "offsetY": -12,
            "position": "top",
            "textAnchor": "middle",
          },
          "LineBranch": {
            "offsetX": 0,
            "offsetY": -6,
            "position": "top",
            "textAnchor": "middle",
          },
          "Load": {
            "offsetX": 0,
            "offsetY": 8,
            "position": "bottom",
            "textAnchor": "middle",
          },
          "Source": {
            "offsetX": 0,
            "offsetY": -10,
            "position": "top",
            "textAnchor": "middle",
          },
          "Switch": {
            "offsetX": 0,
            "offsetY": -8,
            "position": "top",
            "textAnchor": "middle",
          },
          "TransformerBranch": {
            "offsetX": 30,
            "offsetY": 0,
            "position": "right",
            "textAnchor": "start",
          },
          "default": {
            "offsetX": 0,
            "offsetY": -8,
            "position": "top",
            "textAnchor": "middle",
          },
        }
      `);
    });

    it('ETAP_CALLOUT settings are stable', () => {
      expect(ETAP_CALLOUT).toMatchInlineSnapshot(`
        {
          "block": {
            "borderRadius": 2,
            "borderWidth": 1,
            "maxWidth": 140,
            "minWidth": 80,
            "padding": 6,
          },
          "colors": {
            "background": "#FFFFFF",
            "border": "#D1D5DB",
            "text": "#1F2937",
            "unit": "#6B7280",
            "value": "#111827",
          },
          "fields": [
            {
              "key": "Un",
              "label": "Un",
              "unit": "kV",
            },
            {
              "key": "Ikss",
              "label": "Ik''",
              "unit": "kA",
            },
            {
              "key": "Skss",
              "label": "Sk''",
              "unit": "MVA",
            },
            {
              "key": "ip",
              "label": "ip",
              "unit": "kA",
            },
            {
              "key": "Ith",
              "label": "Ith",
              "unit": "kA",
            },
          ],
          "labelValueGap": 8,
          "leader": {
            "dashArray": "4,2",
            "length": 30,
            "nodeOffset": 20,
            "strokeColor": "#6B7280",
            "strokeWidth": 1,
          },
          "rowHeight": 16,
        }
      `);
    });
  });

  describe('Stroke Hierarchy Invariants', () => {
    it('busbar stroke is thicker than feeder', () => {
      expect(ETAP_STROKE.busbar).toBeGreaterThan(ETAP_STROKE.feeder);
    });

    it('feeder stroke is thicker than symbol', () => {
      expect(ETAP_STROKE.feeder).toBeGreaterThan(ETAP_STROKE.symbol);
    });

    it('symbol stroke is thicker than aux', () => {
      expect(ETAP_STROKE.symbol).toBeGreaterThan(ETAP_STROKE.aux);
    });

    it('aux stroke is thicker than or equal to leader', () => {
      expect(ETAP_STROKE.aux).toBeGreaterThanOrEqual(ETAP_STROKE.leader);
    });

    it('selected strokes are thicker than normal', () => {
      expect(ETAP_STROKE_SELECTED.busbar).toBeGreaterThan(ETAP_STROKE.busbar);
      expect(ETAP_STROKE_SELECTED.feeder).toBeGreaterThan(ETAP_STROKE.feeder);
      expect(ETAP_STROKE_SELECTED.symbol).toBeGreaterThan(ETAP_STROKE.symbol);
    });
  });

  describe('Helper Functions', () => {
    describe('getEtapVoltageColor', () => {
      it('returns WN color for high voltage', () => {
        expect(getEtapVoltageColor(110)).toBe(ETAP_VOLTAGE_COLORS.WN);
        expect(getEtapVoltageColor(220)).toBe(ETAP_VOLTAGE_COLORS.WN);
        expect(getEtapVoltageColor('400')).toBe(ETAP_VOLTAGE_COLORS.WN);
      });

      it('returns SN color for medium voltage', () => {
        expect(getEtapVoltageColor(10)).toBe(ETAP_VOLTAGE_COLORS.SN);
        expect(getEtapVoltageColor(15)).toBe(ETAP_VOLTAGE_COLORS.SN);
        expect(getEtapVoltageColor(20)).toBe(ETAP_VOLTAGE_COLORS.SN);
        expect(getEtapVoltageColor('30')).toBe(ETAP_VOLTAGE_COLORS.SN);
      });

      it('returns nN color for low voltage', () => {
        expect(getEtapVoltageColor(0.4)).toBe(ETAP_VOLTAGE_COLORS.nN);
        expect(getEtapVoltageColor('0.23')).toBe(ETAP_VOLTAGE_COLORS.nN);
      });

      it('returns default color for unknown voltage', () => {
        expect(getEtapVoltageColor(999)).toBe(ETAP_VOLTAGE_COLORS.default);
        expect(getEtapVoltageColor(undefined)).toBe(ETAP_VOLTAGE_COLORS.default);
      });
    });

    describe('getEtapStrokeColor', () => {
      it('returns selected color when selected', () => {
        expect(getEtapStrokeColor({ selected: true })).toBe(ETAP_STATE_COLORS.selected);
      });

      it('returns out of service color when not in service', () => {
        expect(getEtapStrokeColor({ inService: false })).toBe(ETAP_STATE_COLORS.outOfService);
      });

      it('returns deenergized color when not energized', () => {
        expect(getEtapStrokeColor({ energized: false })).toBe(ETAP_STATE_COLORS.deenergized);
      });

      it('returns voltage color when energized', () => {
        expect(getEtapStrokeColor({ voltageKV: 20 })).toBe(ETAP_VOLTAGE_COLORS.SN);
      });
    });

    describe('getEtapFillColor', () => {
      it('returns selected fill when selected', () => {
        expect(getEtapFillColor({ selected: true })).toBe(ETAP_FILL_COLORS.selected);
      });

      it('returns deenergized fill when not energized', () => {
        expect(getEtapFillColor({ energized: false })).toBe(ETAP_FILL_COLORS.deenergized);
      });

      it('returns normal fill by default', () => {
        expect(getEtapFillColor({})).toBe(ETAP_FILL_COLORS.normal);
      });
    });

    describe('getEtapOpacity', () => {
      it('returns 0.5 when not in service', () => {
        expect(getEtapOpacity({ inService: false })).toBe(0.5);
      });

      it('returns 0.7 when not energized', () => {
        expect(getEtapOpacity({ energized: false })).toBe(0.7);
      });

      it('returns 1 by default', () => {
        expect(getEtapOpacity({})).toBe(1);
      });
    });

    describe('getEtapLabelAnchor', () => {
      it('returns correct anchor for Bus', () => {
        expect(getEtapLabelAnchor('Bus')).toBe(ETAP_LABEL_ANCHORS.Bus);
      });

      it('returns correct anchor for Switch', () => {
        expect(getEtapLabelAnchor('Switch')).toBe(ETAP_LABEL_ANCHORS.Switch);
      });

      it('returns default anchor for unknown type', () => {
        expect(getEtapLabelAnchor('Unknown')).toBe(ETAP_LABEL_ANCHORS.default);
      });
    });

    describe('getEtapSymbolSize', () => {
      it('returns correct size for Bus', () => {
        expect(getEtapSymbolSize('Bus')).toEqual(ETAP_SYMBOL_SIZES.Bus);
      });

      it('returns default size for unknown type', () => {
        expect(getEtapSymbolSize('Unknown')).toEqual(ETAP_SYMBOL_SIZES.default);
      });
    });

    describe('getEtapStrokeWidth', () => {
      it('returns correct stroke for busbar', () => {
        expect(getEtapStrokeWidth('busbar')).toBe(ETAP_STROKE.busbar);
        expect(getEtapStrokeWidth('busbar', true)).toBe(ETAP_STROKE_SELECTED.busbar);
      });

      it('returns correct stroke for feeder', () => {
        expect(getEtapStrokeWidth('feeder')).toBe(ETAP_STROKE.feeder);
        expect(getEtapStrokeWidth('feeder', true)).toBe(ETAP_STROKE_SELECTED.feeder);
      });
    });
  });
});
