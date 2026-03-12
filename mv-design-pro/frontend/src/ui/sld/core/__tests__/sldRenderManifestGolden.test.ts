import { describe, it, expect } from 'vitest';
import { buildVisualGraphFromTopology } from '../topologyAdapterV2';
import { computeLayout } from '../layoutPipeline';
import { buildSldRenderManifest } from '../sldRenderManifest';
import { buildFixtureRadial, buildFixtureRingNop, buildFixturePvBess } from './sldRenderManifest.fixtures';

function buildManifest(name: string, build: () => ReturnType<typeof buildFixtureRadial>) {
  const input = build();
  const adapter = buildVisualGraphFromTopology(input);
  const layout = computeLayout(adapter.graph, undefined, adapter.stationBlockDetails);
  return buildSldRenderManifest({ scenarioId: name, visualGraph: adapter.graph, layoutResult: layout, visualTopology: adapter.visualTopology });
}

describe('SLD Render Manifest Golden (Step VII)', () => {
  const scenarios = [
    ['radial', buildFixtureRadial],
    ['ring_nop', buildFixtureRingNop],
    ['pv_bess', buildFixturePvBess],
  ] as const;

  for (const [name, build] of scenarios) {
    it(`${name}: matches golden snapshot artifact`, () => {
      const manifest = buildManifest(name, build);
      expect(manifest).toMatchSnapshot();
    });

    it(`${name}: deterministic across reruns`, () => {
      const m1 = buildManifest(name, build);
      const m2 = buildManifest(name, build);
      expect(m1).toEqual(m2);
    });

    it(`${name}: permutation-invariant input order`, () => {
      const base = build();
      const permuted = {
        ...base,
        connectionNodes: [...base.connectionNodes].reverse(),
        branches: [...base.branches].reverse(),
        stations: [...base.stations].reverse(),
        generators: [...base.generators].reverse(),
        sources: [...base.sources].reverse(),
        loads: [...base.loads].reverse(),
      };
      const adapter1 = buildVisualGraphFromTopology(base);
      const adapter2 = buildVisualGraphFromTopology(permuted);
      const layout1 = computeLayout(adapter1.graph, undefined, adapter1.stationBlockDetails);
      const layout2 = computeLayout(adapter2.graph, undefined, adapter2.stationBlockDetails);
      const m1 = buildSldRenderManifest({ scenarioId: name, visualGraph: adapter1.graph, layoutResult: layout1, visualTopology: adapter1.visualTopology });
      const m2 = buildSldRenderManifest({ scenarioId: name, visualGraph: adapter2.graph, layoutResult: layout2, visualTopology: adapter2.visualTopology });
      expect(m1).toEqual(m2);
    });
  }

  it('dodaje podsumowanie kontraktu topologii wizualnej, gdy jest przekazane', () => {
    const input = buildFixtureRadial();
    const adapter = buildVisualGraphFromTopology(input);
    const layout = computeLayout(adapter.graph, undefined, adapter.stationBlockDetails);
    const manifest = buildSldRenderManifest({
      scenarioId: 'visual-topology-summary',
      visualGraph: adapter.graph,
      layoutResult: layout,
      visualTopology: adapter.visualTopology,
    });

    expect(manifest.visualTopologySummary).toBeDefined();
    expect(manifest.visualTopologySummary?.segmentyMagistrali).toBeGreaterThan(0);
    expect(manifest.visualTopologySummary?.stacje).toBeGreaterThan(0);
  });

});
