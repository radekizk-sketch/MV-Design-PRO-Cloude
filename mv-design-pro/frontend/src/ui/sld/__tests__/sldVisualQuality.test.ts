import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fitToContent } from '../types';
import { buildReferenceScenario, type ReferenceScenarioId } from '../core/referenceTopologies';

const SCENARIOS: ReferenceScenarioId[] = ['leaf', 'pass', 'branch', 'ring'];

function projectedAreaRatio(scenarioId: ReferenceScenarioId): number {
  const scenario = buildReferenceScenario(scenarioId);
  const viewport = fitToContent(scenario.symbols, 1000, 600, 28, 0.9);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const symbol of scenario.symbols) {
    const screenX = symbol.position.x * viewport.zoom + viewport.offsetX;
    const screenY = symbol.position.y * viewport.zoom + viewport.offsetY;
    minX = Math.min(minX, screenX);
    minY = Math.min(minY, screenY);
    maxX = Math.max(maxX, screenX);
    maxY = Math.max(maxY, screenY);
  }

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  return (width * height) / (1000 * 600);
}

describe('SLD quality gates — skala i język', () => {
  it.each(SCENARIOS)('minimalna skala użytkowa dla %s', (scenarioId) => {
    const scenario = buildReferenceScenario(scenarioId);
    const viewport = fitToContent(scenario.symbols, 1000, 600, 28, 0.9);
    expect(viewport.zoom).toBeGreaterThanOrEqual(0.9);
  });

  it.each(SCENARIOS)('minimalne wykorzystanie obszaru roboczego dla %s', (scenarioId) => {
    expect(projectedAreaRatio(scenarioId)).toBeGreaterThan(0.16);
  });

  it('brak mikrotekstu w kanonicznym arkuszu SLD', () => {
    const cssPath = path.resolve(process.cwd(), 'src/ui/sld/sld-canonical.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    const fontSizes = [...css.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(fontSizes.length).toBeGreaterThan(0);
    expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(10);
  });

  it('brak anglicyzmów użytkowych w etykietach referencyjnych', () => {
    const forbidden = ['trunk', 'branch', 'leaf', 'pass', 'ring'];
    const labels = SCENARIOS.flatMap((scenarioId) => {
      const scenario = buildReferenceScenario(scenarioId);
      return [
        ...scenario.input.connectionNodes.map((n) => n.name),
        ...scenario.input.branches.map((b) => b.name),
        ...scenario.input.stations.map((s) => s.name),
        ...scenario.input.loads.map((l) => l.name),
      ];
    });

    const lowerLabels = labels.map((label) => label.toLowerCase());
    for (const forbiddenWord of forbidden) {
      expect(lowerLabels.some((label) => label.includes(forbiddenWord))).toBe(false);
    }
  });
});
