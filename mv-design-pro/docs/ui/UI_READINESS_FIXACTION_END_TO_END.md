# Gotowosc i FixAction -- przeplyw E2E

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Data            | 2026-03-28                                                                   |
| Zakres          | End-to-end przeplyw: blocker --> FixAction --> modal/nawigacja --> naprawa    |
| Pliki kluczowe  | `ReadinessBar.tsx`, `fixActionModalBridge.ts`, `SchemaCompletenessPanel.tsx`  |
| Status dokumentu| **ZAMKNIETY**                                                                |

---

## 1. Architektura przepływu

```
Backend (ENMValidator / ReadinessGate)
  |
  v
FixAction { code, action_type, modal_type?, element_ref? }
  |
  v
ReadinessBar.handleFixAction(action)
  |
  +-- NAVIGATE_TO_ELEMENT --> selectElement + sld:center-on-element
  |
  +-- OPEN_MODAL --> resolveModalType(modal_type) --> modal:open event
  |       |
  |       +-- fallback: CODE_TO_MODAL_TYPE[code] --> resolveModalType
  |       +-- fallback: openOperationForm('update_element_parameters')
  |
  +-- SELECT_CATALOG --> openOperationForm('assign_catalog_to_element')
  |
  +-- ADD_MISSING_DEVICE --> resolveModalType(modal_type) --> modal:open event
```

---

## 2. Kanoniczne FixActionType

Backend wysyla `action_type` jako jeden z 4 kanonicznych typow:

| action_type            | Semantyka                                                    | Efekt w UI                                             |
|------------------------|--------------------------------------------------------------|--------------------------------------------------------|
| `NAVIGATE_TO_ELEMENT`  | Nawiguj do elementu na SLD                                   | `selectElement(id)` + `CustomEvent('sld:center-on-element')` |
| `OPEN_MODAL`           | Otworz modal edycji/kreacji                                  | `resolveModalType(modal_type)` --> `CustomEvent('modal:open')` |
| `SELECT_CATALOG`       | Otworz przegladarke katalogu dla elementu                    | `openOperationForm('assign_catalog_to_element')`       |
| `ADD_MISSING_DEVICE`   | Dodaj brakujace urzadzenie (zabezpieczenie, pole, itp.)      | `resolveModalType(modal_type)` --> `CustomEvent('modal:open')` |

---

## 3. Tabela: Blocker code --> FixAction --> Modal

| Blocker code            | action_type          | modal_type (backend)     | ModalId (frontend)                 | Efekt                           |
|-------------------------|----------------------|--------------------------|------------------------------------|---------------------------------|
| `missing_source`        | OPEN_MODAL           | SourceModal              | MODAL_DODAJ_ZRODLO_SN             | Otworz formularz dodawania GPZ  |
| `no_source`             | OPEN_MODAL           | SourceModal              | MODAL_DODAJ_ZRODLO_SN             | j.w.                            |
| `missing_transformer`   | OPEN_MODAL           | TransformerModal         | MODAL_DODAJ_TRANSFORMATOR          | Formularz dodawania trafo       |
| `no_transformer`        | OPEN_MODAL           | TransformerModal         | MODAL_DODAJ_TRANSFORMATOR          | j.w.                            |
| `missing_catalog`       | SELECT_CATALOG       | CatalogPicker            | MODAL_ZMIEN_TYP_Z_KATALOGU        | Przegladarka katalogu           |
| `no_catalog`            | SELECT_CATALOG       | CatalogPicker            | MODAL_ZMIEN_TYP_Z_KATALOGU        | j.w.                            |
| `missing_protection`    | ADD_MISSING_DEVICE   | ProtectionBindingModal   | MODAL_DODAJ_ZABEZPIECZENIE         | Formularz zabezpieczenia        |
| `no_protection`         | ADD_MISSING_DEVICE   | ProtectionBindingModal   | MODAL_DODAJ_ZABEZPIECZENIE         | j.w.                            |
| `missing_load`          | OPEN_MODAL           | LoadModal                | MODAL_DODAJ_ODBIOR                 | Formularz odbioru               |
| `missing_generator`     | OPEN_MODAL           | GeneratorModal           | MODAL_ZMIEN_PARAMETRY              | Edycja parametrow generatora    |
| `missing_field_device`  | ADD_MISSING_DEVICE   | FieldDeviceModal         | MODAL_DODAJ_POLE_SN               | Formularz pola stacji           |
| `missing_bay`           | ADD_MISSING_DEVICE   | FieldDeviceModal         | MODAL_DODAJ_POLE_SN               | j.w.                            |
| `voltage_mismatch`      | NAVIGATE_TO_ELEMENT  | --                       | --                                 | Nawigacja do elementu           |
| `isolated_bus`          | NAVIGATE_TO_ELEMENT  | --                       | --                                 | Nawigacja do busa               |
| `impedance_zero`        | OPEN_MODAL           | NodeModal                | MODAL_ZMIEN_PARAMETRY              | Edycja parametrow               |
| `zero_seq_missing`      | OPEN_MODAL           | 'Uzupelnij Z0'           | MODAL_ZMIEN_PARAMETRY              | Edycja Z0                       |

---

## 4. CODE_TO_MODAL_TYPE -- fallback mapping

Gdy backend nie wysyla `modal_type` (wartosc `null`), `ReadinessBar` uzywa
mapowania `CODE_TO_MODAL_TYPE` na podstawie `blocker.code`:

```typescript
const CODE_TO_MODAL_TYPE: Record<string, string> = {
  missing_source:         'SourceModal',
  no_source:              'SourceModal',
  missing_transformer:    'TransformerModal',
  no_transformer:         'TransformerModal',
  missing_catalog:        'CatalogPicker',
  no_catalog:             'CatalogPicker',
  missing_protection:     'ProtectionBindingModal',
  no_protection:          'ProtectionBindingModal',
  missing_load:           'LoadModal',
  missing_generator:      'GeneratorModal',
  missing_field_device:   'FieldDeviceModal',
  missing_bay:            'FieldDeviceModal',
};
```

Mapowanie to jest uzywane **wylacznie** jako fallback. Jesli backend wysyla
`modal_type`, to wartosc z backendu ma priorytet.

---

## 5. BACKEND_MODAL_TYPE_MAP -- bridge modalowy

Plik: `ui/schema-completeness/fixActionModalBridge.ts`

Single Source of Truth mapowania backend `modal_type` --> frontend `ModalId`:

| Backend modal_type        | Frontend ModalId                  | Kontekst                         |
|---------------------------|-----------------------------------|----------------------------------|
| `SourceModal`             | `MODAL_DODAJ_ZRODLO_SN`          | ENMValidator                     |
| `NodeModal`               | `MODAL_ZMIEN_PARAMETRY`          | ENMValidator                     |
| `BranchModal`             | `MODAL_DODAJ_ODGALEZIENIE_SN`    | ENMValidator                     |
| `TransformerModal`        | `MODAL_DODAJ_TRANSFORMATOR`      | ENMValidator                     |
| `LoadModal`               | `MODAL_DODAJ_ODBIOR`             | ENMValidator                     |
| `GeneratorModal`          | `MODAL_ZMIEN_PARAMETRY`          | Generator validation             |
| `CatalogPicker`           | `MODAL_ZMIEN_TYP_Z_KATALOGU`    | Catalog assignment               |
| `FieldDeviceModal`        | `MODAL_DODAJ_POLE_SN`           | Station field validation         |
| `ProtectionBindingModal`  | `MODAL_DODAJ_ZABEZPIECZENIE`    | Protection binding               |
| `StudyCaseSettings`       | `MODAL_ZMIEN_PARAMETRY`          | Study case config                |
| `'Uzupelnij Z0'`          | `MODAL_ZMIEN_PARAMETRY`          | Fault scenario service (PL)      |
| `'Uzupelnij Z2'`          | `MODAL_ZMIEN_PARAMETRY`          | Fault scenario service (PL)      |
| `'Zmien tryb zwarcia'`    | `MODAL_ZMIEN_PARAMETRY`          | Fault scenario service (PL)      |
| `relay_settings`          | `MODAL_DODAJ_ZABEZPIECZENIE`    | Protection API                   |

---

## 6. handleFixAction -- szczegolowy przeplyw

```typescript
handleFixAction(action: FixAction) {
  const payload = action.element_ref ? { element_ref: action.element_ref } : {};

  switch (action.action_type) {
    case 'NAVIGATE_TO_ELEMENT':
      // 1. Zaznacz element w selectionStore
      // 2. Wyslij event sld:center-on-element
      break;

    case 'OPEN_MODAL':
      // 1. Nawiguj do elementu (jesli element_ref)
      // 2. Resolve modal_type:
      //    a) action.modal_type (priorytet)
      //    b) CODE_TO_MODAL_TYPE[action.code] (fallback)
      // 3. resolveModalType() --> ModalId
      // 4. Dispatch modal:open event z ModalId + context
      // 5. Fallback: openOperationForm('update_element_parameters')
      break;

    case 'SELECT_CATALOG':
      // 1. Nawiguj do elementu (jesli element_ref)
      // 2. openOperationForm('assign_catalog_to_element', payload)
      break;

    case 'ADD_MISSING_DEVICE':
      // 1. Resolve modal_type (jak OPEN_MODAL)
      // 2. Dispatch modal:open event
      break;
  }
}
```

---

## 7. BUG NAPRAWIONY: ACTION_TYPE_TO_OP

### Przed naprawa

```typescript
// BLEDNE -- sfabrykowane klucze
const ACTION_TYPE_TO_OP: Record<string, string> = {
  open_edit_modal: 'update_element_parameters',
  navigate_and_select: 'navigate_to_element',
  open_catalog_picker: 'assign_catalog_to_element',
  add_device: 'add_missing_device',
};
```

Klucze (`open_edit_modal`, `navigate_and_select`, ...) nie odpowiadaly
kanonicznym wartosciom `FixActionType` z backendu (`OPEN_MODAL`,
`NAVIGATE_TO_ELEMENT`, ...). Skutek: `ACTION_TYPE_TO_OP[action.action_type]`
zwracal `undefined` --> zadna operacja nie byla wykonywana --> **dead-click**.

### Po naprawie

Zastapiono mape `ACTION_TYPE_TO_OP` przez `switch(action.action_type)` z 4
galezi odpowiadajacymi kanonicznym `FixActionType`. Kazda galaz wykonuje
wlasciwa logike (nawigacja, otwarcie modala, przypisanie katalogu, dodanie
urzadzenia).

### Weryfikacja

- `readinessBar.test.ts` -- 6 przypadkow testowych pokrywajacych 4 action_type
- `fixActionModalBridge.test.ts` -- testy mapowania modal_type
- `fixActionCompleteness.test.ts` -- test kompletnosci mapowania
- CI: frontend-checks workflow -- green

---

## 8. Invarianty

1. **Kazdy blocker MUSI miec FixAction** -- jesli nie, ReadinessBar wyswietla blocker
   bez przycisku Fix (informacyjnie).
2. **Kazdy `modal_type` MUSI byc zmapowany** -- `fixActionModalBridge.ts` jest SSOT.
   Niezmapowane typy logowane w DEV (`console.warn`).
3. **`element_ref` opcjonalny** -- nie kazdy blocker dotyczy konkretnego elementu
   (np. `missing_source` na poczatku budowy sieci).
4. **Determinizm** -- ten sam zestaw blokerow --> te same FixAction --> te same
   modaly. Brak losowosci w mapowaniu.

**Status: ZAMKNIETY**
