# SLD Comparison Mode (Tryb porównania w SLD)

**P11c — Results Comparison: SLD Overlay A/B**

## Cel

W trybie porównania wyników (A vs B), SLD może wyświetlać nakładki wyników dla obu runów.

## Zasady (BINDING)

1. **UI NIE LICZY DELTA**: Frontend nie wykonuje żadnych obliczeń różnic między overlay A i B
2. **Przełącznik overlay**: UI umożliwia przełączanie między:
   - Nakładka A (baseline run)
   - Nakładka B (comparison run)
   - Nakładka Δ (delta) — **TYLKO jeśli backend dostarcza endpoint do delta overlay**

3. **Backend responsibility**: Wszelkie obliczenia delta są wykonywane w backendzie (P10b)

## Implementacja

### Użycie istniejącego SldOverlay

Użyj istniejącego komponentu `SldOverlay` z `results-inspector/SldOverlay.tsx`:

```tsx
import { SldOverlay } from '../results-inspector/SldOverlay';
import { fetchSldOverlay } from '../results-inspector/api';

// Fetch overlay for Run A
const overlayA = await fetchSldOverlay(projectId, diagramId, runAId);

// Fetch overlay for Run B
const overlayB = await fetchSldOverlay(projectId, diagramId, runBId);

// Render with toggle
const [activeOverlay, setActiveOverlay] = useState<'A' | 'B'>('A');

<div>
  <div className="flex gap-2 mb-4">
    <button onClick={() => setActiveOverlay('A')}>Nakładka A</button>
    <button onClick={() => setActiveOverlay('B')}>Nakładka B</button>
  </div>

  <SldOverlay
    nodePositions={nodePositions}
    branchPositions={branchPositions}
    visible={true}
    // Pass data based on active selection
    {...(activeOverlay === 'A' ? overlayA : overlayB)}
  />
</div>
```

### Opcjonalnie: Delta overlay (jeśli backend wspiera)

Jeśli backend dostarcza endpoint `/api/projects/{project_id}/sld/{diagram_id}/overlay-delta?run_a={runA}&run_b={runB}`:

```tsx
// Fetch delta overlay (ONLY if backend provides it)
const overlayDelta = await fetchSldOverlayDelta(projectId, diagramId, runAId, runBId);

// Add third option to toggle
<button onClick={() => setActiveOverlay('DELTA')}>Nakładka Δ</button>
```

**WAŻNE**: Jeśli endpoint delta nie istnieje, UI **NIE oblicza delta** — po prostu nie pokazuje trzeciego przycisku.

## 100% Polskie etykiety

- "Nakładka A" (nie "Overlay A")
- "Nakładka B" (nie "Overlay B")
- "Nakładka Δ" (nie "Delta overlay")
- "Pokaż nakładkę wyników" (nie "Show overlay")

## Zabronione (FORBIDDEN)

- ❌ Obliczanie różnic (delta) w UI
- ❌ Dodawanie "proste przeliczenia" w komponencie
- ❌ Modyfikowanie modelu w trybie porównania
- ❌ Tworzenie "delta overlay" po stronie frontendu

## Status implementacji

- ✅ SldOverlay component (P11b) — gotowy do użycia
- ✅ Fetch API dla pojedynczego overlay (P11a)
- ⏳ Przełącznik A/B w ResultsComparisonPage — do dodania jeśli potrzebne
- ⏳ Backend endpoint dla delta overlay — do sprawdzenia czy istnieje

## Przykład użycia (opcjonalny)

Jeśli ResultsComparisonPage potrzebuje wyświetlać SLD z overlay:

1. Dodaj props `showSld?: boolean` do ResultsComparisonPage
2. Jeśli `showSld === true`, renderuj SldOverlay z przełącznikiem A/B
3. Użyj istniejącego `fetchSldOverlay(projectId, diagramId, runId)` dla każdego runa

**Obecnie ResultsComparisonPage skupia się na tabelach porównawczych. Integracja z SLD może być dodana w przyszłości jeśli potrzebna.**
