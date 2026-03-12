import { describe, expect, it } from 'vitest';
import { buildReferenceScenario, type ReferenceScenarioId } from '../referenceTopologies';
import { buildVisualGraphFromTopology } from '../topologyAdapterV2';
import { computeVisualGraphHash } from '../visualGraph';

const scenarios: ReferenceScenarioId[] = ['leaf', 'pass', 'branch', 'ring', 'multi'];

describe('referenceTopologies', () => {
  it.each(scenarios)('builds %s with non-empty symbols and canonical annotations', (scenario) => {
    const result = buildReferenceScenario(scenario);

    expect(result.symbols.length).toBeGreaterThan(0);
    expect(result.input.sources.length).toBeGreaterThan(0);
    expect(result.canonicalAnnotations).not.toBeNull();
    expect((result.canonicalAnnotations?.trunkNodes.length ?? 0) > 0).toBe(true);
  });

  it('ring scenario has NOP segment', () => {
    const result = buildReferenceScenario('ring');
    const hasNop = result.input.branches.some((branch) => branch.isNormallyOpen);
    expect(hasNop).toBe(true);
  });

  it('scenariusze referencyjne mają jawne logicalViews dla trunk/branch/ring', () => {
    const leaf = buildReferenceScenario('leaf').input.logicalViews;
    const branch = buildReferenceScenario('branch').input.logicalViews;
    const ring = buildReferenceScenario('ring').input.logicalViews;

    expect((leaf?.trunks.length ?? 0) > 0).toBe(true);
    expect((branch?.branches.length ?? 0) > 0).toBe(true);
    expect((ring?.rings.length ?? 0) > 0).toBe(true);
  });

  describe('multi — wzorzec główny sieci wieloodcinkowej', () => {
    it('buduje sieć z 5 segmentami magistrali, 3 odgałęzieniami, ringiem i NOP', () => {
      const result = buildReferenceScenario('multi');
      const lv = result.input.logicalViews;

      // 5 trunk segments
      expect(lv?.trunks[0].segmentIds.length).toBe(5);
      // 3 branches
      expect(lv?.branches.length).toBe(3);
      // 1 ring with NOP
      expect(lv?.rings.length).toBe(1);
      expect(lv?.rings[0].normallyOpenSegmentId).toBe('line_s5_s1_nop');
    });

    it('zawiera 9 stacji o różnych rolach topologicznych', () => {
      const result = buildReferenceScenario('multi');
      expect(result.input.stations.length).toBe(9);

      const stationById = new Map(result.input.stations.map(s => [s.id, s]));
      // S4 jest sekcyjna (SWITCHING)
      expect(stationById.get('st4')?.stationType).toBe('SWITCHING');
      // S4 ma 2 szyny SN
      expect(stationById.get('st4')?.busIds.length).toBe(2);
    });

    it('zawiera generator PV na stacji B4', () => {
      const result = buildReferenceScenario('multi');
      expect(result.input.generators.length).toBe(1);
      expect(result.input.generators[0].kind).toBe('PV');
      expect(result.input.generators[0].connectionVariant).toBe('nn_side');
    });

    it('NOP jest jawnie modelowany jako normallyOpen branch', () => {
      const result = buildReferenceScenario('multi');
      const nopBranch = result.input.branches.find(b => b.id === 'line_s5_s1_nop');
      expect(nopBranch).toBeDefined();
      expect(nopBranch!.isNormallyOpen).toBe(true);
    });

    it('adapter produkuje poprawny kontrakt topologii wizualnej', () => {
      const result = buildReferenceScenario('multi');
      const adapter = buildVisualGraphFromTopology(result.input);
      const vt = adapter.visualTopology;

      // GPZ
      expect(vt.gpz.length).toBe(1);
      // Szyny SN >= 10 (GPZ + stacje trunk + stacje branch)
      expect(vt.busbarsSn.length).toBeGreaterThanOrEqual(10);
      // Trunk segments = 5
      expect(vt.trunkSegments.length).toBe(5);
      // Branch segments >= 3 (at least one per branch)
      expect(vt.branchSegments.length).toBeGreaterThanOrEqual(3);
      // Stacje = 9
      expect(vt.stations.length).toBe(9);
      // NOP
      expect(vt.nops.length).toBeGreaterThanOrEqual(1);
      // Ring connectors
      expect(vt.ringConnectors.length).toBeGreaterThanOrEqual(1);
    });

    it('stacje mają poprawne role semantyczne', () => {
      const result = buildReferenceScenario('multi');
      const adapter = buildVisualGraphFromTopology(result.input);
      const roleMap = new Map(adapter.visualTopology.stations.map(s => [s.domainElementId, s.stationRole]));

      // S4 sekcyjna
      expect(roleMap.get('st4')).toBe('sekcyjna');
      // B2 końcowa
      expect(roleMap.get('stb2')).toBe('koncowa');
    });

    it('jest deterministyczny 100x', () => {
      const hashes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = buildReferenceScenario('multi');
        const adapter = buildVisualGraphFromTopology(result.input);
        hashes.add(computeVisualGraphHash(adapter.graph));
      }
      expect(hashes.size).toBe(1);
    });

    it('generuje symbole i layout bez błędów', () => {
      const result = buildReferenceScenario('multi');
      // Symbols should be created for all elements
      expect(result.symbols.length).toBeGreaterThan(20);
      // Annotations should include trunk information
      expect(result.canonicalAnnotations).not.toBeNull();
      expect(result.canonicalAnnotations!.trunkNodes.length).toBeGreaterThan(0);
    });
  });
});
