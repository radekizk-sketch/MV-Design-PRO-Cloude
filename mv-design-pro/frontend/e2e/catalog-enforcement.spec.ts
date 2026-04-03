import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const BACKEND_BASE = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://127.0.0.1:8000';
const SOURCE_ID = 'src-gpz-15kv-250mva-rx010';
const CABLE_ID = 'cable-tfk-yakxs-3x120';
const LINE_ID = 'line-base-al-st-50';
const CATALOG_VERSION = '2024.1';

type DomainOpEnvelope = {
  error?: string | null;
  snapshot?: {
    buses?: Array<{ ref_id: string }>;
    corridors?: Array<{ ordered_segment_refs?: string[] }>;
  };
};

let entityCounter = 0;
let opCounter = 0;

function nextEntitySuffix(): string {
  entityCounter += 1;
  return String(entityCounter).padStart(4, '0');
}

function nextIdempotencyKey(name: string): string {
  opCounter += 1;
  return `catalog-enforcement-${name}-${String(opCounter).padStart(4, '0')}`;
}

function buildCatalogBinding(catalogNamespace: string, catalogItemId: string) {
  return {
    catalog_namespace: catalogNamespace,
    catalog_item_id: catalogItemId,
    catalog_item_version: CATALOG_VERSION,
  };
}

async function createProjectAndCase(request: APIRequestContext): Promise<{ projectId: string; caseId: string }> {
  const suffix = nextEntitySuffix();

  const projectResponse = await request.post(`${BACKEND_BASE}/api/projects`, {
    data: {
      name: `E2E Katalog ${suffix}`,
      description: 'Test katalog-first',
      mode: 'TO-BE',
      voltage_level_kv: 15.0,
      frequency_hz: 50.0,
    },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: string };

  const caseResponse = await request.post(`${BACKEND_BASE}/api/study-cases`, {
    data: {
      project_id: project.id,
      name: `Przypadek katalog ${suffix}`,
      description: '',
      config: {},
      set_active: true,
    },
  });
  expect(caseResponse.ok()).toBeTruthy();
  const studyCase = (await caseResponse.json()) as { id: string };

  return {
    projectId: project.id,
    caseId: studyCase.id,
  };
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
}

async function executeDomainOp(
  request: APIRequestContext,
  caseId: string,
  name: string,
  payload: Record<string, unknown>,
) {
  return request.post(`${BACKEND_BASE}/api/cases/${caseId}/enm/domain-ops`, {
    data: {
      project_id: '',
      snapshot_base_hash: '',
      operation: {
        name,
        idempotency_key: nextIdempotencyKey(name),
        payload,
      },
    },
  });
}

async function executeDomainOpOk(
  request: APIRequestContext,
  caseId: string,
  name: string,
  payload: Record<string, unknown>,
): Promise<DomainOpEnvelope> {
  const response = await executeDomainOp(request, caseId, name, payload);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as DomainOpEnvelope;
  expect(body.error ?? null).toBeNull();
  return body;
}

async function expectCatalogRequired(response: Awaited<ReturnType<typeof executeDomainOp>>): Promise<void> {
  expect(response.status()).toBe(422);
  const body = (await response.json()) as { detail?: { code?: string; message_pl?: string } };
  expect(body.detail?.code).toBe('catalog.ref_required');
  expect(body.detail?.message_pl ?? '').toMatch(/katalog/i);
}

async function addGridSource(request: APIRequestContext, caseId: string): Promise<void> {
  await executeDomainOpOk(request, caseId, 'add_grid_source_sn', {
    voltage_kv: 15.0,
    sk3_mva: 250.0,
    rx_ratio: 0.1,
    catalog_binding: buildCatalogBinding('ZRODLO_SN', SOURCE_ID),
  });
}

async function addCableSegment(request: APIRequestContext, caseId: string, lengthM = 200): Promise<string> {
  const op = await executeDomainOpOk(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: lengthM,
      name: `Kabel ${lengthM}`,
      catalog_binding: buildCatalogBinding('KABEL_SN', CABLE_ID),
    },
  });
  const segmentRef = op.snapshot?.corridors?.[0]?.ordered_segment_refs?.at(-1);
  expect(segmentRef).toBeTruthy();
  return segmentRef!;
}

async function addOverheadSegment(request: APIRequestContext, caseId: string, lengthM = 800): Promise<string> {
  const op = await executeDomainOpOk(request, caseId, 'continue_trunk_segment_sn', {
    segment: {
      rodzaj: 'LINIA',
      dlugosc_m: lengthM,
      name: `Linia ${lengthM}`,
      catalog_binding: buildCatalogBinding('LINIA_SN', LINE_ID),
    },
  });
  const segmentRef = op.snapshot?.corridors?.[0]?.ordered_segment_refs?.at(-1);
  expect(segmentRef).toBeTruthy();
  return segmentRef!;
}

async function getBusRefs(request: APIRequestContext, caseId: string): Promise<string[]> {
  const enmResponse = await request.get(`${BACKEND_BASE}/api/cases/${caseId}/enm`);
  expect(enmResponse.ok()).toBeTruthy();
  const enm = (await enmResponse.json()) as { buses?: Array<{ ref_id: string }> };
  return (enm.buses ?? []).map((bus) => bus.ref_id);
}

async function expectInlineCatalogError(container: ReturnType<Page['getByTestId']>): Promise<void> {
  const error = container.locator('.text-red-600').first();
  await expect(error).toBeVisible();
  await expect(error).toContainText(/katalog/i);
}

test.describe('Catalog-First Enforcement — realny backend', () => {
  test.skip(process.env.PLAYWRIGHT_REAL_BACKEND !== '1', 'Ten pakiet wymaga realnego backendu.');

  test('formularz słupa rozgałęźnego blokuje wstawienie bez katalogu', async ({ page }) => {
    await createCaseFromUi(page);

    await page.getByTestId('btn-insert-object-branch-pole').click();
    const form = page.getByTestId('insert-branch-pole-form');
    await expect(form).toBeVisible();
    await form.locator('button[type="submit"]').click();

    await expectInlineCatalogError(form);
  });

  test('formularz ZKSN blokuje wstawienie bez katalogu', async ({ page }) => {
    await createCaseFromUi(page);

    await page.getByTestId('btn-insert-object-zksn').click();
    const form = page.getByTestId('insert-zksn-form');
    await expect(form).toBeVisible();
    await form.locator('button[type="submit"]').click();

    await expectInlineCatalogError(form);
  });

  test('formularz łącznika sekcyjnego blokuje wstawienie bez katalogu', async ({ page }) => {
    await createCaseFromUi(page);

    await page.getByTestId('btn-insert-switch').click();
    const form = page.getByTestId('insert-section-switch-form');
    await expect(form).toBeVisible();

    await page.getByPlaceholder('np. SW-001').fill('SW-E2E-001');
    await page.getByPlaceholder('np. Łącznik sekcyjny S1').fill('Łącznik testowy');
    await page.getByRole('button', { name: 'Zastosuj' }).click();

    await expectInlineCatalogError(form);
  });

  test('przycisk domknięcia pierścienia jest nieaktywny bez kandydatów ringu', async ({ page, request }) => {
    const caseId = await createCaseFromUi(page);
    await addGridSource(request, caseId);
    await addCableSegment(request, caseId, 240);
    await reloadEditorPage(page);

    await expect(page.getByTestId('btn-connect-ring')).toBeDisabled();
  });

  test('backend odrzuca insert_branch_pole_on_segment_sn bez katalogu', async ({ request }) => {
    const { caseId } = await createProjectAndCase(request);
    await addGridSource(request, caseId);
    const segmentRef = await addOverheadSegment(request, caseId);

    const response = await executeDomainOp(request, caseId, 'insert_branch_pole_on_segment_sn', {
      segment_id: segmentRef,
      name: 'Słup testowy',
      insert_at: { mode: 'RATIO', value: 0.5 },
    });

    await expectCatalogRequired(response);
  });

  test('backend odrzuca insert_zksn_on_segment_sn bez katalogu', async ({ request }) => {
    const { caseId } = await createProjectAndCase(request);
    await addGridSource(request, caseId);
    const segmentRef = await addCableSegment(request, caseId);

    const response = await executeDomainOp(request, caseId, 'insert_zksn_on_segment_sn', {
      segment_id: segmentRef,
      name: 'ZKSN testowy',
      branch_ports_count: 2,
      switch_state: 'closed',
      insert_at: { mode: 'RATIO', value: 0.5 },
    });

    await expectCatalogRequired(response);
  });

  test('backend odrzuca insert_section_switch_sn bez katalogu', async ({ request }) => {
    const { caseId } = await createProjectAndCase(request);
    await addGridSource(request, caseId);
    const segmentRef = await addCableSegment(request, caseId);

    const response = await executeDomainOp(request, caseId, 'insert_section_switch_sn', {
      segment_id: segmentRef,
      switch_name: 'Łącznik testowy',
      switch_type: 'ROZLACZNIK',
      normal_state: 'closed',
      insert_at: { mode: 'RATIO', value: 0.5 },
    });

    await expectCatalogRequired(response);
  });

  test('backend odrzuca connect_secondary_ring_sn bez katalogu', async ({ request }) => {
    const { caseId } = await createProjectAndCase(request);
    await addGridSource(request, caseId);
    await addCableSegment(request, caseId, 200);
    await addCableSegment(request, caseId, 230);

    const buses = await getBusRefs(request, caseId);
    expect(buses.length).toBeGreaterThanOrEqual(3);

    const response = await executeDomainOp(request, caseId, 'connect_secondary_ring_sn', {
      from_bus_ref: buses[1],
      to_bus_ref: buses[buses.length - 1],
      segment: {
        rodzaj: 'KABEL',
        dlugosc_m: 120,
      },
    });

    await expectCatalogRequired(response);
  });
});
