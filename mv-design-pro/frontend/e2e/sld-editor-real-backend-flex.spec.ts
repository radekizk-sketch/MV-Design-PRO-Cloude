import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';

const BACKEND_BASE = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://127.0.0.1:8000';
const CABLE_ID = 'cable-tfk-yakxs-3x120';
const ALT_CABLE_ID = 'cable-nkt-na2xs2y-3x150';
const TRAFO_ID = 'tr-sn-nn-15-04-630kva-dyn11';
const SOURCE_ID = 'src-gpz-15kv-250mva-rx010';
const UPDATED_TRANSFORMER_NAME = 'Transformator terenowy';
const CATALOG_VERSION = '2024.1';

type DomainOpResponse = {
  error?: string | null;
  snapshot?: {
    branches?: Array<{ ref_id: string; from_bus_ref?: string; to_bus_ref?: string }>;
    buses?: Array<{ ref_id: string }>;
    corridors?: Array<{ ordered_segment_refs?: string[] }>;
    transformers?: Array<{ ref_id: string; name?: string }>;
  };
  readiness?: { ready: boolean; status?: string; blockers?: Array<{ code: string; element_ref?: string | null }> };
  fix_actions?: Array<{ code: string; message_pl: string; element_ref?: string | null }>;
};

function buildCatalogBinding(catalogNamespace: string, catalogItemId: string) {
  return {
    catalog_namespace: catalogNamespace,
    catalog_item_id: catalogItemId,
    catalog_item_version: CATALOG_VERSION,
  };
}

let opCounter = 0;
function nextIdempotencyKey(name: string): string {
  opCounter += 1;
  return `e2e-real-${name}-${String(opCounter).padStart(4, '0')}`;
}

async function executeDomainOp(
  request: APIRequestContext,
  caseId: string,
  name: string,
  payload: Record<string, unknown>,
): Promise<DomainOpResponse> {
  const response = await request.post(`${BACKEND_BASE}/api/cases/${caseId}/enm/domain-ops`, {
    data: {
      project_id: caseId,
      snapshot_base_hash: '',
      operation: {
        name,
        idempotency_key: nextIdempotencyKey(name),
        payload,
      },
    },
  });
  if (!response.ok()) {
    const bodyText = await response.text();
    throw new Error(`Domain op ${name} failed (${response.status()}): ${bodyText}`);
  }
  const body = (await response.json()) as DomainOpResponse;
  expect(body.error ?? null).toBeNull();
  return body;
}

async function createCaseFromUi(page: Page): Promise<string> {
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'commit' });
  await page.waitForSelector('[data-testid="app-ready"]', { state: 'attached', timeout: 30000 });
  const createCaseBtn = page.getByTestId('sld-empty-overlay-create-case');
  await expect(createCaseBtn).toBeVisible();
  const createCaseResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/study-cases') && response.request().method() === 'POST',
  );
  await createCaseBtn.click({ force: true });
  const createCaseResponse = await createCaseResponsePromise;
  expect(createCaseResponse.ok()).toBeTruthy();
  const casePayload = (await createCaseResponse.json()) as { id: string };
  await expect(page.getByTestId('active-case-bar')).toContainText('Przypadek');
  return casePayload.id;
}

async function reloadEditorPage(page: Page): Promise<void> {
  const refreshResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes('/enm/domain-ops')
        && response.request().method() === 'POST'
        && (response.request().postData() ?? '').includes('"name":"refresh_snapshot"'),
      { timeout: 15000 },
    )
    .catch(() => null);

  await page.reload({ waitUntil: 'commit' });
  await page.waitForSelector('[data-testid="app-ready"]', { state: 'attached', timeout: 30000 });
  await expect(page.getByTestId('active-case-bar')).toContainText('Przypadek');
  await refreshResponsePromise;
  await expect(page.getByTestId('sld-connections-layer')).toBeAttached();
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
}

async function openSegmentInspector(page: Page, segmentRef: string): Promise<void> {
  const connection = page.getByTestId(`sld-connection-${segmentRef}`);
  await expect(connection).toHaveCount(1, { timeout: 15000 });

  await connection.locator('polyline').first().evaluate((node: SVGPolylineElement) => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
  });

  await expect(page.getByTestId('sld-segment-inspector')).toBeVisible();
}

async function openElementInspector(page: Page, elementRef: string): Promise<void> {
  const symbol = page.getByTestId(`sld-symbol-${elementRef}`);
  await expect(symbol).toHaveCount(1);

  await symbol.evaluate((node: SVGGElement) => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
  });

  await expect(page.getByTestId('sld-engineering-inspector-wrapper')).toBeVisible();
}

async function activateEngineeringFieldEditor(page: Page, fieldKey: string): Promise<void> {
  const fieldRow = page.getByTestId(`engineering-field-${fieldKey}`);
  await expect(fieldRow).toHaveCount(1);

  await fieldRow.evaluate((node: HTMLElement, key: string) => {
    const clickable = node.querySelector('div.cursor-pointer');
    if (!(clickable instanceof HTMLElement)) {
      throw new Error(`Missing editable value cell for engineering-field-${key}`);
    }
    clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
  }, fieldKey);

  await expect(fieldRow.locator('input')).toBeVisible();
}

test('real backend SLD editor flow: source -> trunk -> station -> branch -> update -> delete -> continue', async ({ page, request }, testInfo) => {
  const caseId = await createCaseFromUi(page);

  await executeDomainOp(request, caseId, 'add_grid_source_sn', {
    voltage_kv: 15.0,
    sk3_mva: 250.0,
    rx_ratio: 0.1,
    catalog_binding: buildCatalogBinding('ZRODLO_SN', SOURCE_ID),
  });
  await capture(page, testInfo, '01-after-source');

  let op = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 210,
      name: 'T1',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });
  op = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 230,
      name: 'T2',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });
  op = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 180,
      name: 'T3',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });

  const segmentRefs = op.snapshot?.corridors?.[0]?.ordered_segment_refs ?? [];
  expect(segmentRefs.length).toBeGreaterThan(1);
  await reloadEditorPage(page);
  await capture(page, testInfo, '02-after-trunk');

  await openSegmentInspector(page, segmentRefs[0]);
  await expect(page.getByTestId('sld-segment-inspector-catalog')).toContainText(CABLE_ID);
  await expect(page.getByTestId('sld-segment-inspector-namespace')).toContainText('KABEL_SN');
  await capture(page, testInfo, '02a-segment-inspector-with-catalog');

  await page.getByTestId('sld-segment-open-catalog-picker').click();
  await page.getByPlaceholder('Szukaj po nazwie lub ID...').fill(ALT_CABLE_ID);
  await page.getByText(ALT_CABLE_ID, { exact: true }).click();
  await expect(page.getByTestId('sld-segment-inspector-catalog')).toContainText(ALT_CABLE_ID);
  await expect(page.getByTestId('sld-segment-catalog-status')).toContainText(ALT_CABLE_ID);
  await capture(page, testInfo, '02b-segment-catalog-reassigned');

  op = await executeDomainOp(request, caseId, 'insert_station_on_segment_sn', {
    segment_id: segmentRefs[1],
    station_type: 'B',
    insert_at: { value: 0.5 },
    station: { sn_voltage_kv: 15.0, nn_voltage_kv: 0.4 },
    transformer: {
      create: true,
      catalog_binding: buildCatalogBinding('TRAFO_SN_NN', TRAFO_ID),
    },
  });
  const stationBus = (op.snapshot?.buses ?? []).find((bus) => bus.ref_id.includes('sn_bus'));
  expect(stationBus).toBeDefined();
  const transformerRef = op.snapshot?.transformers?.[0]?.ref_id;
  expect(transformerRef).toBeTruthy();
  await reloadEditorPage(page);
  await capture(page, testInfo, '03-after-station');

  await openElementInspector(page, transformerRef!);
  await expect(page.getByTestId('engineering-section-typ_i_katalog')).toContainText(TRAFO_ID);
  await capture(page, testInfo, '03a-transformer-inspector');

  await activateEngineeringFieldEditor(page, 'name');
  const nameEditor = page.getByTestId('engineering-field-name').locator('input');
  await nameEditor.fill(UPDATED_TRANSFORMER_NAME);
  await nameEditor.press('Tab');
  await expect(page.getByTestId('engineering-field-name')).toContainText(UPDATED_TRANSFORMER_NAME);

  op = await executeDomainOp(request, caseId, 'start_branch_segment_sn', {
    from_ref: `${stationBus!.ref_id}.BRANCH`,
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 140,
      name: 'B1',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });
  const branchRef = op.snapshot?.branches?.[op.snapshot.branches.length - 1]?.ref_id;
  expect(branchRef).toBeTruthy();
  await reloadEditorPage(page);
  await capture(page, testInfo, '03b-after-branch');

  await executeDomainOp(request, caseId, 'update_element_parameters', {
    element_ref: branchRef,
    parameters: { length_km: 0.155, status: 'closed' },
  });

  await executeDomainOp(request, caseId, 'delete_element', {
    element_ref: branchRef,
  });

  op = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 160,
      name: 'T4',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });
  expect((op.snapshot?.branches ?? []).length).toBeGreaterThan(2);

  await reloadEditorPage(page);
  await capture(page, testInfo, '04-after-delete-and-continue');
  await expect(page.getByTestId('sld-readiness-stack')).toBeVisible();
});

test('real backend supports flexible operation order combinations', async ({ page, request }) => {
  const caseId = await createCaseFromUi(page);

  let snapshot = await executeDomainOp(request, caseId, 'add_grid_source_sn', {
    voltage_kv: 15.0,
    sk3_mva: 250.0,
    catalog_binding: buildCatalogBinding('ZRODLO_SN', SOURCE_ID),
  });

  snapshot = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 200,
      name: 'F1',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });
  const firstSegment = snapshot.snapshot?.corridors?.[0]?.ordered_segment_refs?.[0];
  expect(firstSegment).toBeTruthy();

  await executeDomainOp(request, caseId, 'update_element_parameters', {
    element_ref: firstSegment,
    parameters: { length_km: 0.222 },
  });

  await executeDomainOp(request, caseId, 'delete_element', { element_ref: firstSegment });

  snapshot = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 205,
      name: 'F2',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });
  snapshot = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 210,
      name: 'F3',
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });

  const targetSegment = snapshot.snapshot?.corridors?.[0]?.ordered_segment_refs?.[1];
  expect(targetSegment).toBeTruthy();
  await executeDomainOp(request, caseId, 'insert_station_on_segment_sn', {
    segment_id: targetSegment,
    station_type: 'B',
    insert_at: { value: 0.45 },
    station: { sn_voltage_kv: 15.0, nn_voltage_kv: 0.4 },
    transformer: {
      create: true,
      catalog_binding: buildCatalogBinding('TRAFO_SN_NN', TRAFO_ID),
    },
  });
  const segmentAfterInsert = snapshot.snapshot?.corridors?.[0]?.ordered_segment_refs?.[0];
  expect(segmentAfterInsert).toBeTruthy();

  await reloadEditorPage(page);
  await openSegmentInspector(page, segmentAfterInsert!);
  await expect(page.getByTestId('sld-segment-inspector')).toBeVisible();
});
