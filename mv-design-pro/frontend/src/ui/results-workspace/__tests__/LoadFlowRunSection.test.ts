/**
 * Load Flow Run Section Tests — PR-LF-03
 *
 * INVARIANTS VERIFIED:
 * - No physics calculations in component
 * - No model mutations
 * - Polish labels only (no EN strings)
 * - Deterministic rendering (sorted by bus_id / branch_id)
 * - No hardcoded thresholds for coloring
 * - No alert() / confirm() / prompt()
 * - No solver imports
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// File Content Analysis
// =============================================================================

const COMPONENT_PATH = path.resolve(
  __dirname,
  '..',
  'LoadFlowRunSection.tsx'
);
const COMPONENT_SOURCE = fs.readFileSync(COMPONENT_PATH, 'utf-8');

// =============================================================================
// §1 — No English Strings in UI
// =============================================================================

describe('PR-LF-03: LoadFlowRunSection — No English Strings', () => {
  /**
   * Scan for common English UI words that should be in Polish.
   * We look for JSX text content patterns (not comments or variable names).
   */
  const ENGLISH_UI_PATTERNS = [
    />\s*Loading\b/i,
    />\s*Error\b/i,
    />\s*Results\b/i,
    />\s*Voltage\b/i,
    />\s*Branch\b/i,
    />\s*Losses\b/i,
    />\s*Convergence\b/i,
    />\s*Iterations\b/i,
    />\s*Tolerance\b/i,
    />\s*Power\b/i,
    />\s*Status\b/i,
    />\s*Summary\b/i,
    />\s*Base\b/i,
    />\s*Node\b/i,
    />\s*Angle\b/i,
  ];

  it('should contain no English UI-visible strings', () => {
    const lines = COMPONENT_SOURCE.split('\n');
    const violations: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments and imports
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('export ')
      ) {
        continue;
      }

      for (const pattern of ENGLISH_UI_PATTERNS) {
        if (pattern.test(line)) {
          violations.push(`  Line ${i + 1}: ${trimmed}`);
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found English UI strings in LoadFlowRunSection.tsx:\n${violations.join('\n')}\n\n` +
          'All UI text must be in Polish.'
      );
    }
  });

  it('should have Polish labels for sections', () => {
    expect(COMPONENT_SOURCE).toContain('Status analizy');
    expect(COMPONENT_SOURCE).toContain('Napięcia węzłów');
    expect(COMPONENT_SOURCE).toContain('Przepływy gałęzi');
    expect(COMPONENT_SOURCE).toContain('Straty i bilans');
  });

  it('should have Polish metric labels', () => {
    expect(COMPONENT_SOURCE).toContain('Zbieżność');
    expect(COMPONENT_SOURCE).toContain('Iteracje');
    expect(COMPONENT_SOURCE).toContain('Tolerancja');
    expect(COMPONENT_SOURCE).toContain('Moc bazowa');
  });

  it('should have Polish column headers', () => {
    expect(COMPONENT_SOURCE).toContain('Węzeł');
    expect(COMPONENT_SOURCE).toContain('Gałąź');
    expect(COMPONENT_SOURCE).toContain('Straty P');
    expect(COMPONENT_SOURCE).toContain('Straty Q');
  });

  it('should have Polish loading text', () => {
    expect(COMPONENT_SOURCE).toContain('Ładowanie wyników rozpływu mocy');
  });
});

// =============================================================================
// §2 — No alert() / confirm() / prompt()
// =============================================================================

describe('PR-LF-03: LoadFlowRunSection — No Blocking Popups', () => {
  const FORBIDDEN_PATTERNS = [
    { pattern: /\balert\s*\(/, name: 'alert()' },
    { pattern: /\bconfirm\s*\(/, name: 'confirm()' },
    { pattern: /\bprompt\s*\(/, name: 'prompt()' },
    { pattern: /window\.alert/, name: 'window.alert' },
    { pattern: /window\.confirm/, name: 'window.confirm' },
    { pattern: /window\.prompt/, name: 'window.prompt' },
  ];

  for (const { pattern, name } of FORBIDDEN_PATTERNS) {
    it(`should not contain ${name}`, () => {
      const lines = COMPONENT_SOURCE.split('\n');
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
// §3 — No Solver Imports
// =============================================================================

describe('PR-LF-03: LoadFlowRunSection — No Solver Imports', () => {
  it('should not import from solver modules', () => {
    const solverPatterns = [
      /from\s+['"].*solver/i,
      /from\s+['"].*newton/i,
      /from\s+['"].*gauss/i,
      /from\s+['"].*jacobian/i,
      /from\s+['"].*ybus/i,
    ];

    for (const pattern of solverPatterns) {
      expect(COMPONENT_SOURCE).not.toMatch(pattern);
    }
  });

  it('should not contain physics calculations', () => {
    const physicsPatterns = [
      /Math\.sqrt\s*\(/,
      /Math\.atan2\s*\(/,
      /Math\.sin\s*\(/,
      /Math\.cos\s*\(/,
      /complex\s*\(/i,
      /impedance/i,
      /admittance/i,
      /reactance/i,
    ];

    for (const pattern of physicsPatterns) {
      const lines = COMPONENT_SOURCE.split('\n');
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
});

// =============================================================================
// §4 — Deterministic Rendering
// =============================================================================

describe('PR-LF-03: LoadFlowRunSection — Deterministic Rendering', () => {
  it('should sort bus results by bus_id (localeCompare)', () => {
    expect(COMPONENT_SOURCE).toContain('a.bus_id.localeCompare(b.bus_id)');
  });

  it('should sort branch results by branch_id (localeCompare)', () => {
    expect(COMPONENT_SOURCE).toContain('a.branch_id.localeCompare(b.branch_id)');
  });

  it('should use deterministic fixed-point formatting for numbers', () => {
    // Check that .toFixed() is used for number formatting
    const toFixedCount = (COMPONENT_SOURCE.match(/\.toFixed\(/g) || []).length;
    expect(toFixedCount).toBeGreaterThan(5);
  });

  it('should not use Date.now() or Math.random()', () => {
    expect(COMPONENT_SOURCE).not.toMatch(/Date\.now\(\)/);
    expect(COMPONENT_SOURCE).not.toMatch(/Math\.random\(\)/);
  });
});

// =============================================================================
// §5 — No Hardcoded Thresholds
// =============================================================================

describe('PR-LF-03: LoadFlowRunSection — No Hardcoded Thresholds', () => {
  it('should not contain hardcoded voltage thresholds (0.95/1.05)', () => {
    const thresholdPatterns = [
      /[<>]=?\s*0\.95/,
      /[<>]=?\s*1\.05/,
      /0\.95\s*[<>]=?/,
      /1\.05\s*[<>]=?/,
    ];

    for (const pattern of thresholdPatterns) {
      expect(COMPONENT_SOURCE).not.toMatch(pattern);
    }
  });

  it('should not contain hardcoded loading thresholds', () => {
    const thresholdPatterns = [
      /[<>]=?\s*80/,
      /[<>]=?\s*100/,
    ];

    const lines = COMPONENT_SOURCE.split('\n');
    const violations: string[] = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      // Skip className lines (Tailwind utilities)
      if (trimmed.includes('className')) return;
      for (const pattern of thresholdPatterns) {
        if (pattern.test(line)) {
          violations.push(`  Line ${idx + 1}: ${trimmed}`);
        }
      }
    });
    expect(violations).toHaveLength(0);
  });
});

// =============================================================================
// §6 — No Project Codenames
// =============================================================================

describe('PR-LF-03: LoadFlowRunSection — No Project Codenames', () => {
  const CODENAME_PATTERNS = [
    /\bP7\b/,
    /\bP11\b/,
    /\bP14\b/,
    /\bP17\b/,
    /\bP20[ab]?\b/,
    /\bP22\b/,
  ];

  it('should not contain project codenames in UI-visible strings', () => {
    const lines = COMPONENT_SOURCE.split('\n');
    const violations: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      // Skip comments — codenames are OK in comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      // Skip imports
      if (trimmed.startsWith('import ')) return;

      for (const pattern of CODENAME_PATTERNS) {
        if (pattern.test(line)) {
          violations.push(`  Line ${idx + 1}: ${trimmed}`);
        }
      }
    });

    expect(violations).toHaveLength(0);
  });
});

// =============================================================================
// §7 — Component Structure
// =============================================================================

describe('PR-LF-03: LoadFlowRunSection — Component Structure', () => {
  it('should export LoadFlowRunSection function', () => {
    expect(COMPONENT_SOURCE).toContain('export function LoadFlowRunSection');
  });

  it('should accept runId prop', () => {
    expect(COMPONENT_SOURCE).toContain('runId: string');
  });

  it('should have data-testid for main container', () => {
    expect(COMPONENT_SOURCE).toContain('data-testid="load-flow-run-section"');
  });

  it('should have data-testid for convergence section', () => {
    expect(COMPONENT_SOURCE).toContain('data-testid="lf-convergence-section"');
  });

  it('should have data-testid for bus voltages table', () => {
    expect(COMPONENT_SOURCE).toContain('data-testid="lf-bus-voltages-table"');
  });

  it('should have data-testid for branch flows table', () => {
    expect(COMPONENT_SOURCE).toContain('data-testid="lf-branch-flows-table"');
  });

  it('should have data-testid for losses section', () => {
    expect(COMPONENT_SOURCE).toContain('data-testid="lf-losses-section"');
  });
});
