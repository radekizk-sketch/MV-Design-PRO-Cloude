# SLD Contract Flow V1

## Przepływ kontraktów

```text
Snapshot / TopologyInput
  -> (adapter semantyczny)
SldSemanticGraphV1
  -> (transformacja layout)
LayoutInputGraphV1
  -> (LayoutEngine)
LayoutResultV1
  -> (Renderer)
Warstwy overlay/tokenów
```

## Odpowiedzialności

- **Snapshot / TopologyInput**: domena systemowa, zero geometrii renderera.
- **SldSemanticGraphV1**: semantyka bytu, role, klasy, kontenery.
- **LayoutInputGraphV1**: dane geometryczne i constraints potrzebne wyłącznie do layoutu.
- **LayoutResultV1**: wynik geometrii dla renderera.
- **Renderer**: rysowanie, bez rekonstrukcji topologii.

## Legacy bridge

Dla kompatybilności testów i starszych ścieżek:
- `LayoutInputGraphV1 -> VisualGraphV1 (legacy)`
- używany wyłącznie przez `computeLegacyLayout()`.
