import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fitToContent } from '../types';
import { buildReferenceScenario, type ReferenceScenarioId } from '../core/referenceTopologies';

const SCENARIOS: ReferenceScenarioId[] = ['leaf', 'pass', 'branch', 'ring'];

function read(relativePath: string): string {
  const absolute = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(absolute, 'utf8');
}

describe('SLD industrial hierarchy gates', () => {
  it('GPZ ma wyższy priorytet wizualny niż ramki stacji', () => {
    const css = read('src/ui/sld/sld-canonical.css');
    const gpzStroke = Number(css.match(/\.sld-gpz-block\s*\{[\s\S]*?stroke-width:\s*([0-9.]+)/)?.[1] ?? 0);
    const stationStroke = Number(css.match(/\.sld-station-bbox\s*\{[\s\S]*?stroke-width:\s*([0-9.]+)/)?.[1] ?? 99);
    expect(gpzStroke).toBeGreaterThan(stationStroke);
  });

  it('stacja SN/nN ma jawne sekcje funkcjonalne SN i nN', () => {
    const stationRenderer = read('src/ui/sld/StationFieldRenderer.tsx');
    expect(stationRenderer.includes('data-sld-role="station-sn-section"')).toBe(true);
    expect(stationRenderer.includes('data-sld-role="station-nn-section"')).toBe(true);
  });

  it('hierarchia tekstu ma trzy poziomy informacji i poziom 3 jest warunkowy', () => {
    const css = read('src/ui/sld/sld-canonical.css');
    expect(css.includes('.sld-info-primary')).toBe(true);
    expect(css.includes('.sld-info-secondary')).toBe(true);
    expect(css.includes('.sld-info-tertiary')).toBe(true);

    const trunkRenderer = read('src/ui/sld/TrunkSpineRenderer.tsx');
    const branchRenderer = read('src/ui/sld/BranchRenderer.tsx');
    const stationRenderer = read('src/ui/sld/StationFieldRenderer.tsx');

    expect(trunkRenderer.includes('showTechnicalLabels &&')).toBe(true);
    expect(branchRenderer.includes('showTechnicalLabels &&')).toBe(true);
    expect(stationRenderer.includes('showTechnicalLabels &&')).toBe(true);
  });

  it.each(SCENARIOS)('czytelność przy normalnym dopasowaniu dla %s', (scenarioId) => {
    const scenario = buildReferenceScenario(scenarioId);
    const viewport = fitToContent(scenario.symbols, 1000, 600, 40, 0.9);
    expect(viewport.zoom).toBeGreaterThanOrEqual(0.9);
  });


  it('poziom A ma większą wagę typograficzną niż poziom B i C', () => {
    const css = read('src/ui/sld/sld-canonical.css');
    const primary = Number(css.match(/\.sld-info-primary\s*\{[\s\S]*?font-size:\s*([0-9.]+)/)?.[1] ?? 0);
    const secondary = Number(css.match(/\.sld-info-secondary\s*\{[\s\S]*?font-size:\s*([0-9.]+)/)?.[1] ?? 0);
    const tertiary = Number(css.match(/\.sld-info-tertiary\s*\{[\s\S]*?font-size:\s*([0-9.]+)/)?.[1] ?? 0);
    expect(primary).toBeGreaterThan(secondary);
    expect(secondary).toBeGreaterThanOrEqual(tertiary);
  });

  it('etykiety poziomu 1 i 2 są zakotwiczone do geometrii obiektów', () => {
    const trunkRenderer = read('src/ui/sld/TrunkSpineRenderer.tsx');
    const branchRenderer = read('src/ui/sld/BranchRenderer.tsx');
    const stationRenderer = read('src/ui/sld/StationFieldRenderer.tsx');

    expect(trunkRenderer.includes('x={trunkX')).toBe(true);
    expect(branchRenderer.includes('x={position.x')).toBe(true);
    expect(stationRenderer.includes('x={baseX')).toBe(true);
  });
});
