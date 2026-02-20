/**
 * UI Terminology Guard — §5 UX 10/10
 *
 * Scans all .tsx files for forbidden terms in JSX content.
 * Forbidden in UI labels (user-visible strings):
 * - "materializacja" / "rematerializuj"
 * - "binding" (in labels, NOT in code)
 * - "namespace" (in labels)
 * - "drift" (in labels)
 * - "readiness" (in UI labels shown to user)
 * - "fix_actions" / "fixActions" (in UI labels)
 * - "blocker" (in UI labels)
 *
 * Allowed replacements:
 * - materializacja → "Wczytanie parametrów z katalogu"
 * - binding → "Powiązanie z katalogiem"
 * - namespace → "Kategoria katalogu"
 * - drift → "Rozbieżność katalogu"
 * - readiness → "Gotowość obliczeń"
 * - fix_actions → "Szybkie naprawy"
 * - blocker → "Brak wymaganych danych"
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Recursively collect all .tsx files
function collectTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !entry.startsWith('__tests__') && entry !== 'node_modules') {
      files.push(...collectTsxFiles(fullPath));
    } else if (entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract JSX string content (rough heuristic: strings in JSX attributes and text)
function extractUiStrings(content: string): { line: number; text: string }[] {
  const results: { line: number; text: string }[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/**')) continue;
    // Skip import statements
    if (line.trim().startsWith('import ')) continue;
    // Skip type/interface definitions
    if (line.trim().startsWith('export type') || line.trim().startsWith('export interface')) continue;

    // Check string literals in JSX-like contexts
    // title="...", placeholder="...", aria-label="..."
    const attrMatches = line.matchAll(/(?:title|placeholder|aria-label|data-tooltip)=["']([^"']+)["']/g);
    for (const m of attrMatches) {
      results.push({ line: i + 1, text: m[1] });
    }

    // Check JSX text children (lines that look like JSX content, not code)
    // Simple heuristic: lines between > and < that contain text
    const jsxTextMatch = line.match(/>([^<>{]+)</);
    if (jsxTextMatch && jsxTextMatch[1].trim().length > 0) {
      results.push({ line: i + 1, text: jsxTextMatch[1] });
    }
  }
  return results;
}

const FORBIDDEN_UI_TERMS = [
  { term: /\bmaterializacj/i, replacement: 'Wczytanie parametrów z katalogu' },
  { term: /\brematerializuj/i, replacement: 'Odśwież parametry z katalogu' },
  { term: /\bbinding\b/i, replacement: 'Powiązanie z katalogiem' },
  { term: /\bnamespace\b/i, replacement: 'Kategoria katalogu' },
  { term: /\bdrift\b/i, replacement: 'Rozbieżność katalogu' },
  { term: /\breadiness\b/i, replacement: 'Gotowość obliczeń' },
  { term: /\bfix.?actions?\b/i, replacement: 'Szybkie naprawy' },
  { term: /\bblocker\b/i, replacement: 'Brak wymaganych danych' },
];

describe('UI Terminology Guard — §5', () => {
  const uiDir = join(__dirname, '..'); // src/ui/
  const tsxFiles = collectTsxFiles(uiDir);

  it('found .tsx files to check', () => {
    expect(tsxFiles.length).toBeGreaterThan(0);
  });

  it('no forbidden terms in UI-visible strings', () => {
    const violations: string[] = [];

    for (const filePath of tsxFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const uiStrings = extractUiStrings(content);

      for (const { line, text } of uiStrings) {
        for (const { term, replacement } of FORBIDDEN_UI_TERMS) {
          if (term.test(text)) {
            const relPath = relative(uiDir, filePath);
            violations.push(
              `${relPath}:${line} — "${text}" contains forbidden term ${term}. Use: "${replacement}"`
            );
          }
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} forbidden UI terms:\n${violations.join('\n')}`
      );
    }
  });
});
