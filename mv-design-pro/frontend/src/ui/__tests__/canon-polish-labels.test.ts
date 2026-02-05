/**
 * Canon Guard: 100% Polish UI Labels
 *
 * BINDING RULE:
 * - All user-visible UI labels MUST be in Polish
 * - Tab labels, button text, section headers, tooltips — all Polish
 * - English-only UI strings are forbidden
 *
 * This test verifies key UI label constants are in Polish.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const UI_DIR = path.join(__dirname, '..');

/**
 * Verify a file contains expected Polish labels.
 */
function fileContains(relPath: string, expected: string[]): { missing: string[]; fileExists: boolean } {
  const fullPath = path.join(UI_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    return { missing: expected, fileExists: false };
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const missing = expected.filter((label) => !content.includes(label));
  return { missing, fileExists: true };
}

describe('Canon Guard: 100% Polish UI Labels', () => {
  it('should have Polish tab labels in Results Inspector', () => {
    const { missing, fileExists } = fileContains('results-inspector/types.ts', [
      'Szyny',
      'Gałęzie',
      'Zwarcia',
      'Ślad obliczeń',
    ]);
    if (fileExists) {
      expect(missing, `Missing Polish labels in results-inspector/types.ts: ${missing.join(', ')}`).toHaveLength(0);
    }
  });

  it('should have Polish labels in Active Case Bar', () => {
    const { missing, fileExists } = fileContains('active-case-bar/ActiveCaseBar.tsx', [
      'Zmień',
      'Konfiguruj',
      'Oblicz',
      'Wyniki',
    ]);
    if (fileExists) {
      expect(missing, `Missing Polish labels in ActiveCaseBar: ${missing.join(', ')}`).toHaveLength(0);
    }
  });

  it('should have Polish labels in Type Library Browser', () => {
    const { missing, fileExists } = fileContains('catalog/TypeLibraryBrowser.tsx', [
      'Typy linii',
      'Typy kabli',
      'Typy transformatorów',
      'Typy aparatury łączeniowej',
    ]);
    if (fileExists) {
      expect(missing, `Missing Polish labels in TypeLibraryBrowser: ${missing.join(', ')}`).toHaveLength(0);
    }
  });

  it('should have Polish mode names in Mode Gate', () => {
    const { missing, fileExists } = fileContains('mode-gate/ModeGate.tsx', [
      'Edycja modelu zablokowana',
      'Akcja niedostępna w trybie wyników',
    ]);
    if (fileExists) {
      expect(missing, `Missing Polish labels in ModeGate: ${missing.join(', ')}`).toHaveLength(0);
    }
  });

  it('should have Polish labels in Case Manager mode gating', () => {
    const { missing, fileExists } = fileContains('case-manager/useModeGating.ts', [
      'Tworzenie przypadków zablokowane',
      'Zmiana nazwy zablokowana',
      'Usuwanie przypadków zablokowane',
      'Klonowanie przypadków zablokowane',
      'Obliczenia zablokowane',
    ]);
    if (fileExists) {
      expect(missing, `Missing Polish labels in useModeGating: ${missing.join(', ')}`).toHaveLength(0);
    }
  });

  it('should have Polish labels in Inspector Panel', () => {
    const { missing, fileExists } = fileContains('inspector/InspectorPanel.tsx', [
      'Dowód obliczeń',
      'Dowód zgodności',
    ]);
    if (fileExists) {
      expect(missing, `Missing Polish labels in InspectorPanel: ${missing.join(', ')}`).toHaveLength(0);
    }
  });

  it('should NOT contain English-only common UI terms in source files', () => {
    // Check for common English UI labels that should be Polish
    const ENGLISH_TERMS_IN_STRINGS = [
      { pattern: "'Settings'", replacement: "'Ustawienia'" },
      { pattern: "'Delete'", replacement: "'Usuń'" },
      { pattern: "'Save'", replacement: "'Zapisz'" },
      { pattern: "'Cancel'", replacement: "'Anuluj'" },
      { pattern: "'Close'", replacement: "'Zamknij'" },
      { pattern: "'Loading...'", replacement: "'Ładowanie...'" },
      { pattern: "'Error'", replacement: "'Błąd'" },
    ];

    const violations: { file: string; term: string }[] = [];
    const checkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          checkDir(fullPath);
        } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          for (const { pattern, replacement } of ENGLISH_TERMS_IN_STRINGS) {
            // Only flag if the exact English pattern appears as a standalone string
            if (content.includes(pattern)) {
              // Skip if it's in a comment
              const lines = content.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
                if (line.includes(pattern)) {
                  violations.push({
                    file: path.relative(UI_DIR, fullPath),
                    term: `${pattern} → ${replacement}`,
                  });
                  break;
                }
              }
            }
          }
        }
      }
    };

    checkDir(UI_DIR);

    if (violations.length > 0) {
      const messages = violations
        .map((v) => `  ${v.file}: ${v.term}`)
        .join('\n');
      expect.fail(
        `Found ${violations.length} English-only UI label(s):\n${messages}\n\n` +
          'All UI labels must be in Polish.'
      );
    }
  });
});
