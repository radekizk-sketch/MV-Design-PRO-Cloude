# SLD_REPO_HYGIENE_RULES

## Zakazy
- Zakaz `page.route` w krytycznym browser E2E.
- Zakaz `useDemo={true}` w głównych ścieżkach SLD w `App.tsx`.
- Zakaz równoległych aktywnych pipeline dla geometrii bazowej.

## Wymuszenia
- Testy higieny repo (`sldCanonicalHygiene.test.ts`).
- Krytyczny E2E na realnym backendzie uruchamiany w CI.
