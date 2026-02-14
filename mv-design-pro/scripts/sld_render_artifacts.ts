/**
 * sld_render_artifacts.ts — CI render artifact generator (RUN #3H DOMKNIECIE §8).
 *
 * Generates deterministic SLD render artifacts for CI pipeline:
 * - Loads golden networks (self-contained topology builders)
 * - Applies example overrides
 * - Produces artifact manifest files:
 *     artifacts/<networkId>__<layoutHash>__<overridesHash>.svg.json
 *     artifacts/<networkId>__<layoutHash>__<overridesHash>.png.json
 *
 * The .json files contain the full render metadata (node positions,
 * edge routes, effective bounds) which would be consumed by an SVG/PNG
 * renderer (not implemented in v1 — CI verifies determinism of metadata).
 *
 * USAGE:
 *   npx tsx scripts/sld_render_artifacts.ts
 *
 * PIPELINE:
 *   TopologyInput → VisualGraph → LayoutResult → applyOverrides → EffectiveLayout
 *   → artifact manifest (JSON with SVG/PNG metadata)
 */

import * as fs from 'fs';
import * as path from 'path';

// Inline golden network builder (same as test fixtures — self-contained)
// We import from the frontend source tree
import { buildVisualGraphFromTopology } from '../frontend/src/ui/sld/core/topologyAdapterV2';
import { computeLayout } from '../frontend/src/ui/sld/core/layoutPipeline';
import { computeLayoutResultHash } from '../frontend/src/ui/sld/core/layoutResult';
import type { LayoutResultV1 } from '../frontend/src/ui/sld/core/layoutResult';
import { applyOverrides } from '../frontend/src/ui/sld/core/applyOverrides';
import type { EffectiveLayoutV1 } from '../frontend/src/ui/sld/core/applyOverrides';
import {
  OverrideScopeV1,
  OverrideOperationV1,
  OVERRIDES_VERSION,
  computeOverridesHash,
  canonicalizeOverrides,
} from '../frontend/src/ui/sld/core/geometryOverrides';
import type { ProjectGeometryOverridesV1, GeometryOverrideItemV1 } from '../frontend/src/ui/sld/core/geometryOverrides';
import type { TopologyInputV1 } from '../frontend/src/ui/sld/core/topologyInputReader';
import { BranchKind, StationKind } from '../frontend/src/ui/sld/core/topologyInputReader';

// =============================================================================
// GOLDEN NETWORKS
// =============================================================================

function buildGoldenRadial5(): TopologyInputV1 {
  const nodes = [
    { id: 'bus_gpz', name: 'Szyna GPZ 15kV', voltageKv: 15, stationId: null, busIndex: null, inService: true },
  ];
  const branches: TopologyInputV1['branches'] = [];
  const stations: TopologyInputV1['stations'] = [];
  const loads: TopologyInputV1['loads'] = [];

  for (let i = 1; i <= 5; i++) {
    const pad = String(i).padStart(2, '0');
    const snBusId = `bus_sn_st${pad}`;
    const nnBusId = `bus_nn_st${pad}`;
    const stId = `st${pad}`;
    const fromId = i === 1 ? 'bus_gpz' : `bus_sn_st${String(i - 1).padStart(2, '0')}`;

    nodes.push(
      { id: snBusId, name: `Szyna SN St${pad}`, voltageKv: 15, stationId: stId, busIndex: null, inService: true },
      { id: nnBusId, name: `Szyna nN St${pad}`, voltageKv: 0.4, stationId: stId, busIndex: null, inService: true },
    );
    branches.push(
      { id: `line_${pad}`, name: `Linia SN ${pad}`, fromNodeId: fromId, toNodeId: snBusId, kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-6 120', lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: `tr_${pad}`, name: `TR St${pad}`, fromNodeId: snBusId, toNodeId: nnBusId, kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
    );
    stations.push(
      { id: stId, name: `Stacja ${pad}`, stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: [snBusId, nnBusId], branchIds: [], switchIds: [], transformerIds: [`tr_${pad}`] },
    );
    loads.push(
      { id: `load_${pad}`, name: `Odbiorca ${pad}`, nodeId: nnBusId, inService: true, pMw: 0.1, qMvar: 0.03 },
    );
  }

  return {
    snapshotId: 'golden-radial-5',
    snapshotFingerprint: 'golden_radial_5_fp',
    connectionNodes: nodes,
    branches,
    devices: [],
    stations,
    generators: [],
    sources: [{ id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true }],
    loads,
    protectionBindings: [],
    fixActions: [],
  };
}

// =============================================================================
// OVERRIDE BUILDERS
// =============================================================================

function makeOverridesForLayout(layout: LayoutResultV1): ProjectGeometryOverridesV1 {
  const items: GeometryOverrideItemV1[] = [];

  for (let i = 0; i < Math.min(2, layout.nodePlacements.length); i++) {
    const node = layout.nodePlacements[i];
    items.push({
      elementId: node.nodeId,
      scope: OverrideScopeV1.NODE,
      operation: OverrideOperationV1.MOVE_DELTA,
      payload: { dx: 20 * (i + 1), dy: -20 },
    });
  }

  if (layout.switchgearBlocks.length > 0) {
    const block = layout.switchgearBlocks[0];
    items.push({
      elementId: block.blockId,
      scope: OverrideScopeV1.BLOCK,
      operation: OverrideOperationV1.MOVE_DELTA,
      payload: { dx: 40, dy: 0 },
    });
  }

  return canonicalizeOverrides({
    overridesVersion: OVERRIDES_VERSION,
    studyCaseId: 'ci-render',
    snapshotHash: 'golden_radial_5_fp',
    items,
  });
}

// =============================================================================
// ARTIFACT GENERATOR
// =============================================================================

interface RenderArtifact {
  networkId: string;
  layoutHash: string;
  overridesHash: string;
  effectiveHash: string;
  appliedCount: number;
  nodeCount: number;
  edgeCount: number;
  blockCount: number;
  bounds: { x: number; y: number; width: number; height: number };
  nodePlacements: readonly { nodeId: string; x: number; y: number }[];
}

function generateArtifact(networkId: string, input: TopologyInputV1, overrides: ProjectGeometryOverridesV1 | null): RenderArtifact {
  const adapterResult = buildVisualGraphFromTopology(input);
  const layoutResult = computeLayout(adapterResult.graph, undefined, adapterResult.stationBlockDetails);
  const layoutHash = computeLayoutResultHash(layoutResult);
  const effective = applyOverrides(layoutResult, overrides);
  const overridesHash = overrides ? computeOverridesHash(overrides) : '00000000';

  return {
    networkId,
    layoutHash,
    overridesHash,
    effectiveHash: effective.effectiveHash,
    appliedCount: effective.appliedCount,
    nodeCount: effective.nodePlacements.length,
    edgeCount: effective.edgeRoutes.length,
    blockCount: effective.switchgearBlocks.length,
    bounds: effective.bounds,
    nodePlacements: effective.nodePlacements.map((p) => ({
      nodeId: p.nodeId,
      x: p.position.x,
      y: p.position.y,
    })),
  };
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
  const artifactsDir = path.resolve(__dirname, '..', 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  console.log('SLD Render Artifacts Generator (RUN #3H DOMKNIECIE)');
  console.log(`Output: ${artifactsDir}`);
  console.log('');

  // Golden network: 5-station radial
  const input = buildGoldenRadial5();

  // --- Without overrides ---
  const artifactBase = generateArtifact('golden-radial-5', input, null);
  const baseFilename = `${artifactBase.networkId}__${artifactBase.layoutHash}__${artifactBase.overridesHash}`;

  const baseSvgPath = path.join(artifactsDir, `${baseFilename}.svg.json`);
  const basePngPath = path.join(artifactsDir, `${baseFilename}.png.json`);
  fs.writeFileSync(baseSvgPath, JSON.stringify({ ...artifactBase, format: 'svg' }, null, 2));
  fs.writeFileSync(basePngPath, JSON.stringify({ ...artifactBase, format: 'png' }, null, 2));
  console.log(`[BASE] ${baseFilename}.svg.json`);
  console.log(`[BASE] ${baseFilename}.png.json`);

  // --- With overrides ---
  // Need LayoutResult to generate overrides
  const adapterResult = buildVisualGraphFromTopology(input);
  const layoutResult = computeLayout(adapterResult.graph, undefined, adapterResult.stationBlockDetails);
  const overrides = makeOverridesForLayout(layoutResult);

  const artifactOverrides = generateArtifact('golden-radial-5', input, overrides);
  const overridesFilename = `${artifactOverrides.networkId}__${artifactOverrides.layoutHash}__${artifactOverrides.overridesHash}`;

  const overSvgPath = path.join(artifactsDir, `${overridesFilename}.svg.json`);
  const overPngPath = path.join(artifactsDir, `${overridesFilename}.png.json`);
  fs.writeFileSync(overSvgPath, JSON.stringify({ ...artifactOverrides, format: 'svg' }, null, 2));
  fs.writeFileSync(overPngPath, JSON.stringify({ ...artifactOverrides, format: 'png' }, null, 2));
  console.log(`[OVER] ${overridesFilename}.svg.json`);
  console.log(`[OVER] ${overridesFilename}.png.json`);

  // Determinism check — run 10 times and verify hashes are identical
  console.log('');
  console.log('Determinism check (10 iterations)...');
  let allMatch = true;
  for (let i = 0; i < 10; i++) {
    const art = generateArtifact('golden-radial-5', input, overrides);
    if (art.effectiveHash !== artifactOverrides.effectiveHash) {
      console.log(`  FAIL: iteration ${i} produced different effectiveHash`);
      allMatch = false;
    }
  }
  if (allMatch) {
    console.log('  OK: all 10 iterations produced identical effectiveHash');
  }

  console.log('');
  console.log(`Generated ${4} artifact files in ${artifactsDir}`);
}

main();
