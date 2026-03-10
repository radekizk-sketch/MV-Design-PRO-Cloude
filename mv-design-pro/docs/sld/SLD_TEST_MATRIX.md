# SLD_TEST_MATRIX

## Backend
- `tests/e2e/test_v1_analysis_pipeline.py`
- `tests/application/sld/test_sld_parity.py`

## Frontend
- `src/ui/sld/__tests__/powerFlowOverlayGeometryInvariant.test.tsx`
- `src/ui/engineering-readiness/__tests__/readinessLivePanel.integration.test.tsx`
- `src/ui/sld/__tests__/sldCanonicalHygiene.test.ts`

## Browser E2E
- `frontend/e2e/create-first-case.spec.ts` (smoke)
- `frontend/e2e/critical-run-flow.spec.ts` (real backend)

## CI
- `.github/workflows/frontend-e2e-smoke.yml` (real-backend critical E2E)
