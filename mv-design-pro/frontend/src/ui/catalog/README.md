# Type Catalog Module (P8.2)

**Status:** IMPLEMENTED
**Canonical:** SYSTEM_SPEC.md § 4, ADR-007

---

## Purpose

Provides UI components and API client for PowerFactory-style Type Library operations:
- **Assign Type** – Select catalog type for element
- **Clear Type** – Remove type_ref assignment
- **Type Picker** – Deterministic type browser with search

---

## Components

### 1. TypePicker

Modal component for selecting catalog types.

**Features:**
- Deterministic ordering: `manufacturer → name → id`
- Search by `name` or `id`
- Category-filtered (LINE, CABLE, TRANSFORMER, SWITCH_EQUIPMENT)
- Highlights current selection
- Polish labels (per wizard_screens.md)

**Usage:**
```tsx
import { TypePicker } from '@/ui/catalog';

<TypePicker
  category="LINE"
  currentTypeId={element.type_ref}
  onSelectType={(typeId, typeName) => handleAssign(typeId)}
  onClose={() => setPickerOpen(false)}
  isOpen={pickerOpen}
/>
```

---

## API Client

All endpoints support type CRUD operations (read-only catalog + assign/clear for elements).

### Fetch Types

```ts
import { fetchLineTypes, fetchTypesByCategory } from '@/ui/catalog';

// Fetch all line types
const lineTypes = await fetchLineTypes();

// Fetch by category (deterministic sort applied)
const types = await fetchTypesByCategory('CABLE');
```

### Assign Type

```ts
import { assignTypeToBranch, assignTypeToTransformer } from '@/ui/catalog';

// Assign to LineBranch
await assignTypeToBranch(projectId, branchId, typeId);

// Assign to TransformerBranch
await assignTypeToTransformer(projectId, transformerId, typeId);

// Assign to Switch (equipment_type)
await assignEquipmentTypeToSwitch(projectId, switchId, typeId);
```

### Clear Type

```ts
import { clearTypeFromBranch } from '@/ui/catalog';

// Clear type_ref (set to null)
await clearTypeFromBranch(projectId, branchId);
```

---

## Integration with Property Grid

The Property Grid automatically renders type_ref fields with action buttons when field type is `'type_ref_with_actions'`:

```ts
// In field-definitions.ts
{
  key: 'type_ref',
  label: 'Typ przewodu (katalog)',
  value: element.type_ref,
  type: 'type_ref_with_actions',
  editable: true,
  source: 'type',
  typeRefName: element.type_name, // Resolved name
  onAssignType: () => openTypePicker(),
  onClearType: () => handleClearType(),
}
```

**Rendering:**
- Displays type name + ID (if assigned) or "Nie przypisano typu"
- Buttons: **"Przypisz typ..."** / **"Zmień typ..."** + **"Wyczyść"**
- Buttons visible only in MODEL_EDIT mode
- Validation messages displayed inline (for TypeNotFoundError)

---

## Integration with Context Menu

Context Menu actions added for elements with type_ref support:

```ts
import { buildContextMenuActions } from '@/ui/context-menu';

const actions = buildContextMenuActions(
  'LineBranch',
  elementId,
  elementName,
  mode,
  {
    hasTypeRef: element.type_ref !== null,
    onAssignType: () => openTypePicker(),
    onClearType: () => handleClearType(),
  }
);
```

**Menu structure (MODEL_EDIT only):**
- Właściwości...
- W eksploatacji [✓]
- **Przypisz typ...** / **Zmień typ...** *(if hasTypeRef)*
- **Wyczyść typ** *(if hasTypeRef)*
- Zaznacz w drzewie
- ...

---

## Validation

When `type_ref` points to a non-existent type:
- Backend returns `ValidationMessage` with `code: "type_not_found"`
- Property Grid displays inline validation message (red text)
- User must manually assign valid type or clear reference

**Example validation:**
```json
{
  "code": "type_not_found",
  "severity": "ERROR",
  "message": "Typ o ID abc-123 nie istnieje w katalogu",
  "field": "type_ref"
}
```

---

## Mode Gating (PowerFactory Parity)

| Mode | Assign Type | Clear Type | View Type |
|------|-------------|------------|-----------|
| MODEL_EDIT | ✅ Allowed | ✅ Allowed | ✅ Visible |
| CASE_CONFIG | ❌ Disabled | ❌ Disabled | ✅ Visible |
| RESULT_VIEW | ❌ Hidden | ❌ Hidden | ✅ Visible |

---

## Deterministic Ordering

Types are sorted deterministically (per P8.2 spec):

```ts
// Sort order: manufacturer (nulls last) → name → id
types.sort((a, b) => {
  const mfrA = a.manufacturer ?? '';
  const mfrB = b.manufacturer ?? '';
  if (mfrA < mfrB) return -1;
  if (mfrA > mfrB) return 1;
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return a.id < b.id ? -1 : 1;
});
```

---

## Files

```
ui/catalog/
├── types.ts         # TypeScript type definitions
├── api.ts           # API client (fetch + assign + clear)
├── TypePicker.tsx   # Modal component
├── index.ts         # Public exports
└── README.md        # This file
```

---

## Testing

See `ui/__tests__/catalog.test.ts` for:
- Type Picker rendering (search, select, cancel)
- Deterministic ordering verification
- API client mocking (assign/clear)
- Property Grid integration (buttons + validation)
- Context Menu integration (mode gating)

---

**END OF CATALOG MODULE README**
