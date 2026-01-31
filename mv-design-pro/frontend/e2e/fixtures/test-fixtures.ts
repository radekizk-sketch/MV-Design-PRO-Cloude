/**
 * E2E Test Fixtures — E2E_STABILIZATION
 *
 * Deterministic test data for E2E tests.
 * These fixtures ensure consistent behavior across test runs.
 *
 * USAGE:
 * - Import fixtures in test files
 * - Use Playwright route mocking to intercept API calls
 * - Return fixture data instead of real API responses
 */

// =============================================================================
// Project Context Fixtures
// =============================================================================

export const TEST_PROJECT = {
  id: 'test-project-001',
  name: 'Projekt Testowy',
};

export const TEST_CASE = {
  id: 'test-case-001',
  name: 'Przypadek Testowy 3F',
  kind: 'ShortCircuitCase' as const,
  resultStatus: 'FRESH' as const,
};

export const TEST_SNAPSHOT = {
  id: 'test-snapshot-001',
  createdAt: '2025-01-15T10:00:00Z',
};

export const TEST_RUN = {
  id: 'test-run-001',
  snapshotId: TEST_SNAPSHOT.id,
  caseId: TEST_CASE.id,
  solverKind: 'IEC_60909_SHORT_CIRCUIT',
  resultState: 'FRESH',
  createdAt: '2025-01-15T10:05:00Z',
};

// =============================================================================
// SLD Topology Fixtures (minimal)
// =============================================================================

export const TEST_SLD_TOPOLOGY = {
  nodes: [
    {
      id: 'bus-001',
      elementType: 'Bus',
      elementName: 'Szyna 110kV',
      position: { x: 200, y: 100 },
      inService: true,
      width: 60,
      height: 8,
    },
    {
      id: 'bus-002',
      elementType: 'Bus',
      elementName: 'Szyna 20kV',
      position: { x: 200, y: 300 },
      inService: true,
      width: 60,
      height: 8,
    },
  ],
  branches: [
    {
      id: 'trafo-001',
      elementType: 'TransformerBranch',
      elementName: 'TR1 110/20kV',
      position: { x: 200, y: 200 },
      fromBus: 'bus-001',
      toBus: 'bus-002',
      inService: true,
    },
  ],
};

// =============================================================================
// Results Fixtures
// =============================================================================

export const TEST_BUS_RESULTS = {
  rows: [
    {
      bus_id: 'bus-001',
      name: 'Szyna 110kV',
      un_kv: 110,
      u_kv: 108.5,
      u_pu: 0.9864,
      angle_deg: 0,
      flags: [],
    },
    {
      bus_id: 'bus-002',
      name: 'Szyna 20kV',
      un_kv: 20,
      u_kv: 19.8,
      u_pu: 0.99,
      angle_deg: -2.5,
      flags: [],
    },
  ],
};

export const TEST_BRANCH_RESULTS = {
  rows: [
    {
      branch_id: 'trafo-001',
      name: 'TR1 110/20kV',
      from_bus: 'bus-001',
      to_bus: 'bus-002',
      i_a: 125.5,
      p_mw: 12.5,
      q_mvar: 3.2,
      s_mva: 12.9,
      loading_pct: 45.2,
      flags: [],
    },
  ],
};

export const TEST_SHORT_CIRCUIT_RESULTS = {
  rows: [
    {
      target_id: 'bus-001',
      target_name: 'Szyna 110kV',
      fault_type: '3F',
      ikss_ka: 15.234,
      ip_ka: 38.521,
      ith_ka: 15.891,
      sk_mva: 2905.3,
    },
    {
      target_id: 'bus-002',
      target_name: 'Szyna 20kV',
      fault_type: '3F',
      ikss_ka: 8.123,
      ip_ka: 20.456,
      ith_ka: 8.456,
      sk_mva: 281.4,
    },
  ],
};

// =============================================================================
// Proof/Trace Fixtures
// =============================================================================

export const TEST_EXTENDED_TRACE = {
  snapshot_id: TEST_SNAPSHOT.id,
  input_hash: 'abc123def456789012345678901234567890',
  white_box_trace: [
    {
      step: 1,
      phase: 'INITIALIZATION',
      description: 'Inicjalizacja danych wejściowych',
      equation_id: 'EQ_INIT_001',
    },
    {
      step: 2,
      phase: 'CALCULATION',
      description: 'Obliczenie impedancji zastępczej',
      equation_id: 'EQ_Z_001',
    },
    {
      step: 3,
      phase: 'CALCULATION',
      description: 'Obliczenie prądu zwarciowego Ik"',
      equation_id: 'EQ_IK_001',
    },
  ],
};

// =============================================================================
// Results Index Fixture
// =============================================================================

export const TEST_RESULTS_INDEX = {
  run_header: {
    run_id: TEST_RUN.id,
    snapshot_id: TEST_SNAPSHOT.id,
    case_id: TEST_CASE.id,
    solver_kind: TEST_RUN.solverKind,
    result_state: TEST_RUN.resultState,
    created_at: TEST_RUN.createdAt,
  },
  available_views: ['BUSES', 'BRANCHES', 'SHORT_CIRCUIT', 'TRACE'],
};

// =============================================================================
// App State Fixture (for localStorage seeding)
// =============================================================================

export const TEST_APP_STATE = {
  state: {
    activeProjectId: TEST_PROJECT.id,
    activeProjectName: TEST_PROJECT.name,
    activeCaseId: TEST_CASE.id,
    activeCaseName: TEST_CASE.name,
    activeCaseKind: TEST_CASE.kind,
    activeCaseResultStatus: TEST_CASE.resultStatus,
    activeMode: 'MODEL_EDIT',
    activeRunId: TEST_RUN.id,
    activeSnapshotId: TEST_SNAPSHOT.id,
    caseManagerOpen: false,
    issuePanelOpen: false,
    activeAnalysisType: 'SHORT_CIRCUIT',
  },
  version: 1,
};

// =============================================================================
// Selection Store Fixture
// =============================================================================

export const TEST_SELECTION_STATE = {
  state: {
    selectedElementIds: [],
    hoveredElementId: null,
    focusedElementId: null,
  },
  version: 1,
};
