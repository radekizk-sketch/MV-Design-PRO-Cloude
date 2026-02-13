/**
 * Load Flow SLD Overlay Tests — PR-LF-04
 *
 * INVARIANTS VERIFIED:
 * - No hardcoded thresholds (0.95/1.05)
 * - Token-only coloring (no hex colors)
 * - Deterministic rendering (sort by bus_id / branch_id)
 * - Explicit overlay modes (voltage / loading / flow)
 * - No solver imports
 * - No physics calculations
 * - No model mutations
 * - No alert() / confirm() / prompt()
 * - Polish labels in mode selector
 * - Store overlay mode state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { usePowerFlowResultsStore } from '../store';
import type { LoadFlowOverlayMode } from '../types';
import { LOAD_FLOW_OVERLAY_MODE_LABELS } from '../types';

// =============================================================================
// File Content Analysis
// =============================================================================

const OVERLAY_PATH = path.resolve(
  __dirname,
  '..',
  'PowerFlowSldOverlay.tsx'
);
const OVERLAY_SOURCE = fs.readFileSync(OVERLAY_PATH, 'utf-8');

// =============================================================================
// Store Reset
// =============================================================================

function resetStore() {
  usePowerFlowResultsStore.getState().reset();
}

// =============================================================================
// §1 — No Hardcoded Thresholds
// =============================================================================

describe('PR-LF-04: Overlay — No Hardcoded Thresholds', () => {
  it('should not contain hardcoded voltage thresholds (0.95/1.05)', () => {
    const thresholdPatterns = [
      /[<>]=?\s*0\.95/,
      /[<>]=?\s*1\.05/,
      /0\.95\s*[<>]=?/,
      /1\.05\s*[<>]=?/,
    ];

    for (const pattern of thresholdPatterns) {
      expect(OVERLAY_SOURCE).not.toMatch(pattern);
    }
  });

  it('should not contain hardcoded loading thresholds in non-comment lines', () => {
    const lines = OVERLAY_SOURCE.split('\n');
    const violations: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (trimmed.includes('className')) return;

      if (/loading_pct\s*[<>]=?\s*\d{2,3}/.test(line)) {
        violations.push(`  Line ${idx + 1}: ${trimmed}`);
      }
    });

    expect(violations).toHaveLength(0);
  });
});

// =============================================================================
// §2 — Token-Only Coloring
// =============================================================================

describe('PR-LF-04: Overlay — Token-Only Coloring', () => {
  it('should not contain hex color literals', () => {
    const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
    const lines = OVERLAY_SOURCE.split('\n');
    const violations: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (hexPattern.test(line)) {
        violations.push(`  Line ${idx + 1}: ${trimmed}`);
      }
      hexPattern.lastIndex = 0;
    });

    expect(violations).toHaveLength(0);
  });

  it('should use VISUAL_STATE_STYLE from overlay types', () => {
    expect(OVERLAY_SOURCE).toContain('VISUAL_STATE_STYLE');
  });

  it('should use OverlayVisualState type', () => {
    expect(OVERLAY_SOURCE).toContain('OverlayVisualState');
  });

  it('should import from sld-overlay/overlayTypes', () => {
    expect(OVERLAY_SOURCE).toContain("from '../sld-overlay/overlayTypes'");
  });
});

// =============================================================================
// §3 — Deterministic Sort
// =============================================================================

describe('PR-LF-04: Overlay — Deterministic Rendering', () => {
  it('should sort bus results by bus_id', () => {
    expect(OVERLAY_SOURCE).toContain('a.bus_id.localeCompare(b.bus_id)');
  });

  it('should sort branch results by branch_id', () => {
    expect(OVERLAY_SOURCE).toContain('a.branch_id.localeCompare(b.branch_id)');
  });

  it('should use deterministic fixed-point number formatting', () => {
    const toFixedCount = (OVERLAY_SOURCE.match(/\.toFixed\(/g) || []).length;
    expect(toFixedCount).toBeGreaterThan(3);
  });

  it('should not use Date.now() or Math.random()', () => {
    expect(OVERLAY_SOURCE).not.toMatch(/Date\.now\(\)/);
    expect(OVERLAY_SOURCE).not.toMatch(/Math\.random\(\)/);
  });
});

// =============================================================================
// §4 — Explicit Overlay Modes
// =============================================================================

describe('PR-LF-04: Overlay — Explicit Modes', () => {
  it('should define all three overlay modes', () => {
    expect(OVERLAY_SOURCE).toContain("overlayMode === 'voltage'");
    expect(OVERLAY_SOURCE).toContain("overlayMode === 'flow'");
    expect(OVERLAY_SOURCE).toContain("overlayMode === 'loading'");
  });

  it('should have Polish mode labels', () => {
    expect(LOAD_FLOW_OVERLAY_MODE_LABELS.voltage).toBe('Napięcia');
    expect(LOAD_FLOW_OVERLAY_MODE_LABELS.loading).toBe('Obciążenie');
    expect(LOAD_FLOW_OVERLAY_MODE_LABELS.flow).toBe('Kierunek przepływu');
  });

  it('should export OverlayModeSelector component', () => {
    expect(OVERLAY_SOURCE).toContain('export function OverlayModeSelector');
  });

  it('should have data-testid for mode selector', () => {
    expect(OVERLAY_SOURCE).toContain('data-testid="lf-overlay-mode-selector"');
  });

  it('should have data-testid for each mode button', () => {
    expect(OVERLAY_SOURCE).toContain('data-testid={`lf-overlay-mode-${mode}`}');
  });

  it('should have data-testid for overlay toggle', () => {
    expect(OVERLAY_SOURCE).toContain('data-testid="lf-overlay-toggle"');
  });
});

// =============================================================================
// §5 — No Solver Imports
// =============================================================================

describe('PR-LF-04: Overlay — No Solver Imports', () => {
  it('should not import from solver modules', () => {
    const solverPatterns = [
      /from\s+['"].*solver/i,
      /from\s+['"].*newton/i,
      /from\s+['"].*gauss/i,
      /from\s+['"].*jacobian/i,
      /from\s+['"].*ybus/i,
    ];

    for (const pattern of solverPatterns) {
      expect(OVERLAY_SOURCE).not.toMatch(pattern);
    }
  });

  it('should not contain physics calculations', () => {
    const physicsPatterns = [
      /Math\.sqrt\s*\(/,
      /Math\.atan2\s*\(/,
      /Math\.sin\s*\(/,
      /Math\.cos\s*\(/,
      /impedance/i,
      /admittance/i,
      /reactance/i,
    ];

    for (const pattern of physicsPatterns) {
      const lines = OVERLAY_SOURCE.split('\n');
      const violations: string[] = [];
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        if (pattern.test(line)) {
          violations.push(`  Line ${idx + 1}: ${trimmed}`);
        }
      });
      expect(violations).toHaveLength(0);
    }
  });

  it('should not compute reactive power (Q)', () => {
    // Overlay should DISPLAY Q, not COMPUTE it
    const computePatterns = [
      /=\s*[^=].*\*\s*Math\.sin/,
      /=\s*[^=].*\*\s*Math\.cos/,
      /cos_phi/i,
      /power_factor/i,
    ];

    for (const pattern of computePatterns) {
      expect(OVERLAY_SOURCE).not.toMatch(pattern);
    }
  });

  it('should not modify ResultSet', () => {
    const mutationPatterns = [
      /\.push\s*\(/,
      /\.splice\s*\(/,
      /\.pop\s*\(/,
      /\.shift\s*\(/,
      /\.unshift\s*\(/,
    ];

    // Allow [...array].sort() but not array.push()
    const lines = OVERLAY_SOURCE.split('\n');
    const violations: string[] = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      for (const pattern of mutationPatterns) {
        if (pattern.test(line)) {
          violations.push(`  Line ${idx + 1}: ${trimmed}`);
        }
      }
    });
    expect(violations).toHaveLength(0);
  });
});

// =============================================================================
// §6 — No Alert/Confirm/Prompt
// =============================================================================

describe('PR-LF-04: Overlay — No Blocking Popups', () => {
  const FORBIDDEN = [
    { pattern: /\balert\s*\(/, name: 'alert()' },
    { pattern: /\bconfirm\s*\(/, name: 'confirm()' },
    { pattern: /\bprompt\s*\(/, name: 'prompt()' },
  ];

  for (const { pattern, name } of FORBIDDEN) {
    it(`should not contain ${name}`, () => {
      const lines = OVERLAY_SOURCE.split('\n');
      const violations: string[] = [];
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (pattern.test(line)) {
          violations.push(`  Line ${idx + 1}: ${trimmed}`);
        }
      });
      expect(violations).toHaveLength(0);
    });
  }
});

// =============================================================================
// §7 — Store Overlay Mode Management
// =============================================================================

describe('PR-LF-04: Overlay — Store Mode Management', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should start with voltage as default overlay mode', () => {
    const { overlayMode } = usePowerFlowResultsStore.getState();
    expect(overlayMode).toBe('voltage');
  });

  it('should change overlay mode', () => {
    const { setOverlayMode } = usePowerFlowResultsStore.getState();

    const modes: LoadFlowOverlayMode[] = ['voltage', 'loading', 'flow'];
    for (const mode of modes) {
      act(() => {
        setOverlayMode(mode);
      });
      expect(usePowerFlowResultsStore.getState().overlayMode).toBe(mode);
    }
  });

  it('should preserve overlay mode across tab changes', () => {
    const { setOverlayMode, setActiveTab } = usePowerFlowResultsStore.getState();

    act(() => {
      setOverlayMode('loading');
    });
    act(() => {
      setActiveTab('BRANCHES');
    });

    expect(usePowerFlowResultsStore.getState().overlayMode).toBe('loading');
  });

  it('should reset overlay mode on store reset', () => {
    const { setOverlayMode, reset } = usePowerFlowResultsStore.getState();

    act(() => {
      setOverlayMode('flow');
    });
    expect(usePowerFlowResultsStore.getState().overlayMode).toBe('flow');

    act(() => {
      reset();
    });
    expect(usePowerFlowResultsStore.getState().overlayMode).toBe('voltage');
  });
});

// =============================================================================
// §8 — Polish UI Labels
// =============================================================================

describe('PR-LF-04: Overlay — Polish Labels', () => {
  it('should have Polish toggle labels', () => {
    expect(OVERLAY_SOURCE).toContain('Nakładka wł.');
    expect(OVERLAY_SOURCE).toContain('Nakładka wył.');
  });

  it('should have Polish outdated warning', () => {
    expect(OVERLAY_SOURCE).toContain('Wyniki nieaktualne');
  });

  it('should have Polish losses label', () => {
    expect(OVERLAY_SOURCE).toContain('Straty:');
  });

  it('should use LOAD_FLOW_OVERLAY_MODE_LABELS for mode buttons', () => {
    expect(OVERLAY_SOURCE).toContain('LOAD_FLOW_OVERLAY_MODE_LABELS[mode]');
  });
});

// =============================================================================
// §9 — No Geometry/Zoom Dependence
// =============================================================================

describe('PR-LF-04: Overlay — No Geometry/Zoom Dependence', () => {
  it('should not compute zoom-dependent sizes', () => {
    const zoomPatterns = [
      /transform.*scale\s*\(/,
      /zoomLevel/i,
      /zoom\s*\*/,
      /\*\s*zoom/,
    ];

    for (const pattern of zoomPatterns) {
      const lines = OVERLAY_SOURCE.split('\n');
      const violations: string[] = [];
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        if (pattern.test(line)) {
          violations.push(`  Line ${idx + 1}: ${trimmed}`);
        }
      });
      expect(violations).toHaveLength(0);
    }
  });

  it('should use pointer-events-none for overlay container', () => {
    expect(OVERLAY_SOURCE).toContain('pointer-events-none');
  });
});
