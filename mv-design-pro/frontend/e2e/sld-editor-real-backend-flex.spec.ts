import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';

const BACKEND_BASE = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://127.0.0.1:8000';
const CABLE_ID = 'cable-tfk-yakxs-3x120';
const TRAFO_ID = 'tr-sn-nn-15-04-630kva-dyn11';
const UPDATED_TRANSFORMER_NAME = 'Transformator terenowy';

type DomainOpResponse = {
  error?: string | null;
  snapshot?: {
    branches?: Array<{ ref_id: string; from_bus_ref?: string; to_bus_ref?: string; catalog_ref?: string | null }>;
    buses?: Array<{ ref_id: string }>;
    corridors?: Array<{ ordered_segment_refs?: string[] }>;
    transformers?: Array<{ ref_id: string; name?: string }>;
  };
  readiness?: { ready: boolean; status?: string; blockers?: Array<{ code: string; element_ref?: string | null }> };
  fix_actions?: Array<{ code: string; message_pl: string; element_ref?: string | null }>;
};

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
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForSelector('[data-testid="app-ready"]', { state: 'attached' });
  const createCaseBtn = page.getByTestId('sld-empty-overlay-create-case');
  await expect(createCaseBtn).toBeVisible();
  const createCaseResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/study-cases') && response.request().method() === 'POST',
  );
  await createCaseBtn.click();
  const createCaseResponse = await createCaseResponsePromise;
  expect(createCaseResponse.ok()).toBeTruthy();
  const casePayload = (await createCaseResponse.json()) as { id: string };
  return casePayload.id;
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
}

async function openSegmentInspector(page: Page, segmentRef: string): Promise<void> {
  const connection = page.getByTestId(`sld-connection-${segmentRef}`);
  await expect(connection).toHaveCount(1);

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
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const caseId = await createCaseFromUi(page);

  await executeDomainOp(request, caseId, 'add_grid_source_sn', {
    voltage_kv: 15.0,
    sk3_mva: 250.0,
    rx_ratio: 0.1,
  });
  await capture(page, testInfo, '01-after-source');

  let op = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 210,
      name: 'T1',
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
    },
  });
  op = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 230,
      name: 'T2',
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
    },
  });
  op = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 180,
      name: 'T3',
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
    },
  });

  const segmentRefs = op.snapshot?.corridors?.[0]?.ordered_segment_refs ?? [];
  expect(segmentRefs.length).toBeGreaterThan(1);
  await page.reload();
  await expect(page.getByTestId('sld-connections-layer')).toBeAttached();
  await capture(page, testInfo, '02-after-trunk');

  await openSegmentInspector(page, segmentRefs[0]);
  await expect(page.getByTestId('sld-segment-inspector-catalog')).toContainText(CABLE_ID);
  await expect(page.getByTestId('sld-segment-inspector-namespace')).toContainText('KABEL_SN');
  await capture(page, testInfo, '02a-segment-inspector-with-catalog');

  await executeDomainOp(request, caseId, 'assign_catalog_to_element', {
    element_ref: segmentRefs[0],
    catalog_item_id: null,
    catalog_namespace: 'KABEL_SN',
  });
  await page.reload();
  await expect(page.getByTestId('sld-connections-layer')).toBeAttached();
  await openSegmentInspector(page, segmentRefs[0]);
  await expect(page.getByTestId('sld-segment-inspector-catalog')).toContainText('BRAK');
  await expect(page.getByTestId('sld-segment-catalog-status')).toContainText('Brak przypisanego katalogu');
  await capture(page, testInfo, '02b-segment-inspector-missing-catalog');

  await page.getByTestId('sld-segment-open-catalog-picker').click();
  await page.getByPlaceholder('Szukaj po nazwie lub ID...').fill(CABLE_ID);
  await page.getByText(CABLE_ID, { exact: true }).click();
  await expect(page.getByTestId('sld-segment-inspector-catalog')).toContainText(CABLE_ID);
  await expect(page.getByTestId('sld-segment-catalog-status')).toContainText(CABLE_ID);
  await capture(page, testInfo, '02c-segment-catalog-restored');

  op = await executeDomainOp(request, caseId, 'insert_station_on_segment_sn', {
    segment_ref: segmentRefs[1],
    station_type: 'B',
    insert_at: { value: 0.5 },
    station: { sn_voltage_kv: 15.0, nn_voltage_kv: 0.4 },
    transformer: { create: true, transformer_catalog_ref: TRAFO_ID },
    catalog_binding: {
      catalog_namespace: 'TRAFO_SN_NN',
      catalog_item_id: TRAFO_ID,
      catalog_item_version: '2024.1',
    },
  });
  const stationBus = (op.snapshot?.buses ?? []).find((bus) => bus.ref_id.includes('sn_bus'));
  expect(stationBus).toBeDefined();
  const transformerRef = op.snapshot?.transformers?.[0]?.ref_id;
  expect(transformerRef).toBeTruthy();
  await page.reload();
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
    from_bus_ref: stationBus!.ref_id,
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 140,
      name: 'B1',
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
    },
  });
  const branchRef = op.snapshot?.branches?.[op.snapshot.branches.length - 1]?.ref_id;
  expect(branchRef).toBeTruthy();
  await page.reload();
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
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
    },
  });
  expect((op.snapshot?.branches ?? []).length).toBeGreaterThan(2);

  await page.reload();
  await capture(page, testInfo, '04-after-delete-and-continue');
  await expect(page.getByTestId('sld-readiness-stack')).toBeVisible();
});

test('real backend supports flexible operation order combinations', async ({ page, request }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const caseId = await createCaseFromUi(page);

  let snapshot = await executeDomainOp(request, caseId, 'add_grid_source_sn', {
    voltage_kv: 15.0,
    sk3_mva: 250.0,
  });

  snapshot = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 200,
      name: 'F1',
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
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
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
    },
  });
  snapshot = await executeDomainOp(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 210,
      name: 'F3',
      catalog_ref: CABLE_ID,
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: CABLE_ID,
        catalog_item_version: '2024.1',
      },
    },
    catalog_binding: {
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: CABLE_ID,
      catalog_item_version: '2024.1',
    },
  });

  const targetSegment = snapshot.snapshot?.corridors?.[0]?.ordered_segment_refs?.[1];
  expect(targetSegment).toBeTruthy();
  await executeDomainOp(request, caseId, 'insert_station_on_segment_sn', {
    segment_ref: targetSegment,
    station_type: 'B',
    insert_at: { value: 0.45 },
    station: { sn_voltage_kv: 15.0, nn_voltage_kv: 0.4 },
    transformer: { create: true, transformer_catalog_ref: TRAFO_ID },
    catalog_binding: {
      catalog_namespace: 'TRAFO_SN_NN',
      catalog_item_id: TRAFO_ID,
      catalog_item_version: '2024.1',
    },
  });
  const segmentAfterInsert = snapshot.snapshot?.corridors?.[0]?.ordered_segment_refs?.[0];
  expect(segmentAfterInsert).toBeTruthy();

  await page.reload();
  await expect(page.getByTestId('sld-connections-layer')).toBeAttached();
  await openSegmentInspector(page, segmentAfterInsert!);
  await expect(page.getByTestId('sld-segment-inspector')).toBeVisible();
});
