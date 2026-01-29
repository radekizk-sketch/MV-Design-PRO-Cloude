# Type Catalog UI (P8.2 + P13a)

**CANONICAL ALIGNMENT:**
- `CATALOG_BROWSER_CONTRACT.md`: Type Library Browser specification
- `SYSTEM_SPEC.md § 4`: Type Catalog (Library)
- `POWERFACTORY_COMPLIANCE.md § 14`: Type Catalog UI compliance

## Components

### TypeLibraryBrowser (P13a)
Przeglądarka biblioteki typów w stylu PowerFactory.

**Features:**
- 4 zakładki: Typy linii, Typy kabli, Typy transformatorów, Typy aparatury łączeniowej
- Lista typów z filtrowaniem (nazwa, producent, ID)
- Deterministyczne sortowanie: manufacturer → name → id
- Panel szczegółów typu (read-only)
- Wszystkie etykiety w języku polskim

**Usage:**
```tsx
import { TypeLibraryBrowser } from '@/ui/catalog';

<TypeLibraryBrowser
  initialTab="LINE"
  onSelectType={(typeId, category) => {
    console.log('Selected type:', typeId, 'from', category);
  }}
/>
```

### TypePicker (P8.2)
Modal selector dla przypisywania typu do instancji.

## Compliance

**P13a DoD:**
- ✅ Ekran "Biblioteka typów" (4 zakładki) w 100% PL
- ✅ Listy typów filtrowalne i deterministycznie sortowane
- ✅ Property Grid ma type_ref picker dla Line/Cable/Trafo/Switch
- ✅ Parametry typu są read-only, lokalne parametry instancji edytowalne
- ✅ Testy PASS (determinism + smoke UI)
