/**
 * Element ↔ Catalog Registry — SINGLE SOURCE OF TRUTH
 *
 * REGUŁA PROJEKTOWA: Ten moduł jest JEDYNYM miejscem definiującym
 * powiązanie typ elementu ENM → namespace katalogu → kategoria pickera → węzeł drzewa.
 *
 * Wszystkie inne komponenty (drzewo, context menu, wizard, property grid)
 * CZYTAJĄ z tego rejestru — nigdy nie zgadują samodzielnie.
 *
 * Źródło danych (backend):
 * - readiness_checker.py → BRANCH_TYPE_TO_NAMESPACE
 * - catalog/types.py → CatalogNamespace enum + MATERIALIZATION_CONTRACTS
 * - catalogGate.ts → CATALOG_REQUIRED_OPERATIONS (frontend mirror)
 *
 * INVARIANTS:
 * - Deterministyczne mapowanie (frozen, no runtime mutation)
 * - 100% Polish labels
 * - Każdy element techniczny ma DOKŁADNIE jeden namespace (lub żaden)
 */

import type { CatalogNamespace, TypeCategory } from './types';
import type { TreeNodeType } from '../types';

// =============================================================================
// 1. Element type (ENM snapshot) → CatalogNamespace
// =============================================================================

/**
 * Kanoniczne mapowanie: element.type (z ENM snapshot) → CatalogNamespace.
 *
 * Klucze to wartości pola `type` z modeli ENM (backend/src/enm/models.py).
 * Wartości to namespace z CatalogNamespace enum (backend/src/network_model/catalog/types.py).
 *
 * Elementy bez wpisu = nie wymagają katalogu (np. bus, source, junction).
 */
export const ELEMENT_TYPE_TO_NAMESPACE: Readonly<Record<string, CatalogNamespace>> = {
  // Linie i kable SN (BranchBase derivatives)
  line_overhead: 'LINIA_SN',
  cable: 'KABEL_SN',

  // Transformatory SN/nN
  transformer: 'TRAFO_SN_NN',

  // Aparatura łączeniowa SN
  circuit_breaker: 'APARAT_SN',
  disconnector: 'APARAT_SN',
  load_switch: 'APARAT_SN',
  fuse: 'APARAT_SN',

  // Aparatura łączeniowa nN
  lv_breaker: 'APARAT_NN',
  lv_switch: 'APARAT_NN',
  lv_fuse: 'APARAT_NN',

  // Kable nN
  lv_cable: 'KABEL_NN',

  // Przekładniki pomiarowe
  ct: 'CT',
  vt: 'VT',

  // Odbiorniki
  load: 'OBCIAZENIE',

  // Źródła OZE (nN)
  pv_inverter: 'ZRODLO_NN_PV',
  bess_inverter: 'ZRODLO_NN_BESS',

  // Zabezpieczenia
  protection_device: 'ZABEZPIECZENIE',
  relay: 'ZABEZPIECZENIE',
} as const;

// =============================================================================
// 2. CatalogNamespace → TypeCategory (frontend TypePicker/API)
// =============================================================================

/**
 * Mapowanie namespace katalogu na kategorię pickera typu.
 *
 * Używane przez: TypePicker, TypeLibraryBrowser, fetchTypesByCategory().
 */
export const NAMESPACE_TO_PICKER_CATEGORY: Readonly<Record<CatalogNamespace, TypeCategory>> = {
  LINIA_SN: 'LINE',
  KABEL_SN: 'CABLE',
  TRAFO_SN_NN: 'TRANSFORMER',
  APARAT_SN: 'MV_APPARATUS',
  APARAT_NN: 'LV_APPARATUS',
  KABEL_NN: 'LV_CABLE',
  CT: 'CT',
  VT: 'VT',
  OBCIAZENIE: 'LOAD',
  ZRODLO_NN_PV: 'PV_INVERTER',
  ZRODLO_NN_BESS: 'BESS_INVERTER',
  ZABEZPIECZENIE: 'PROTECTION_DEVICE',
  NASTAWY_ZABEZPIECZEN: 'PROTECTION_DEVICE',
  CONVERTER: 'CONVERTER',
  INVERTER: 'CONVERTER',
} as const;

// =============================================================================
// 3. CatalogNamespace → TreeNodeType (drzewo projektu TYPE_CATALOG)
// =============================================================================

/**
 * Podwęzły TYPE_CATALOG w drzewie projektu.
 *
 * Tylko namespace'y posiadające istniejący TreeNodeType są widoczne w drzewie.
 * Reszta (CT, VT, OBCIAZENIE, PV, BESS, ZABEZPIECZENIE) nie ma jeszcze
 * dedykowanych TreeNodeType — używamy ELEMENT jako fallback.
 */
export const NAMESPACE_TO_TREE_NODE: Readonly<Partial<Record<CatalogNamespace, TreeNodeType>>> = {
  LINIA_SN: 'LINE_TYPES',
  KABEL_SN: 'CABLE_TYPES',
  TRAFO_SN_NN: 'TRANSFORMER_TYPES',
  APARAT_SN: 'SWITCH_EQUIPMENT_TYPES',
} as const;

// =============================================================================
// 4. CatalogNamespace → Polish label
// =============================================================================

/**
 * Polskie etykiety namespace'ów katalogu.
 *
 * Używane w drzewie, dialogach, komunikatach błędów.
 */
export const NAMESPACE_LABEL_PL: Readonly<Record<CatalogNamespace, string>> = {
  LINIA_SN: 'Typy linii napowietrznych',
  KABEL_SN: 'Typy kabli SN',
  TRAFO_SN_NN: 'Typy transformatorów SN/nN',
  APARAT_SN: 'Typy aparatury SN',
  APARAT_NN: 'Typy aparatury nN',
  KABEL_NN: 'Typy kabli nN',
  CT: 'Typy przekładników prądowych',
  VT: 'Typy przekładników napięciowych',
  OBCIAZENIE: 'Typy obciążeń',
  ZRODLO_NN_PV: 'Typy falowników PV',
  ZRODLO_NN_BESS: 'Typy falowników BESS',
  ZABEZPIECZENIE: 'Typy zabezpieczeń',
  NASTAWY_ZABEZPIECZEN: 'Szablony nastaw zabezpieczeń',
  CONVERTER: 'Typy konwerterów',
  INVERTER: 'Typy inwerterów',
} as const;

// =============================================================================
// 5. Reverse lookups (derived, deterministic)
// =============================================================================

/**
 * TreeNodeType → CatalogNamespace (odwrotna mapa dla drzewa).
 *
 * Wygenerowana automatycznie z NAMESPACE_TO_TREE_NODE — zero duplikacji.
 */
export const TREE_NODE_TO_NAMESPACE: Readonly<Partial<Record<TreeNodeType, CatalogNamespace>>> =
  Object.fromEntries(
    Object.entries(NAMESPACE_TO_TREE_NODE).map(([ns, treeNode]) => [treeNode, ns as CatalogNamespace])
  );

/**
 * TypeCategory → CatalogNamespace (odwrotna mapa dla pickera).
 *
 * Uwaga: relacja N:1 (kilka namespace → 1 category), więc bierzemy PIERWSZY.
 * Użycie: gdy mamy TypeCategory i chcemy wrócić do namespace.
 */
export const PICKER_CATEGORY_TO_NAMESPACE: Readonly<Partial<Record<TypeCategory, CatalogNamespace>>> =
  Object.fromEntries(
    Object.entries(NAMESPACE_TO_PICKER_CATEGORY)
      .filter(([ns]) => !['NASTAWY_ZABEZPIECZEN', 'CONVERTER', 'INVERTER'].includes(ns))
      .map(([ns, cat]) => [cat, ns as CatalogNamespace])
  );

// =============================================================================
// 6. Query functions (deterministic, pure)
// =============================================================================

/**
 * Pobierz namespace katalogu dla danego typu elementu ENM.
 *
 * @param enmElementType - Wartość pola `type` z elementu ENM snapshot
 * @returns CatalogNamespace lub undefined jeśli element nie wymaga katalogu
 */
export function getNamespaceForElement(enmElementType: string): CatalogNamespace | undefined {
  return ELEMENT_TYPE_TO_NAMESPACE[enmElementType];
}

/**
 * Pobierz kategorię pickera dla namespace katalogu.
 */
export function getPickerCategory(namespace: CatalogNamespace): TypeCategory {
  return NAMESPACE_TO_PICKER_CATEGORY[namespace];
}

/**
 * Pobierz kategorię pickera bezpośrednio z typu elementu ENM.
 *
 * Łączy: element.type → namespace → picker category
 * Zwraca undefined jeśli element nie wymaga katalogu.
 */
export function getPickerCategoryForElement(enmElementType: string): TypeCategory | undefined {
  const ns = getNamespaceForElement(enmElementType);
  if (!ns) return undefined;
  return getPickerCategory(ns);
}

/**
 * Czy dany typ elementu ENM wymaga powiązania katalogowego?
 */
export function requiresCatalogBinding(enmElementType: string): boolean {
  return enmElementType in ELEMENT_TYPE_TO_NAMESPACE;
}

/**
 * Pobierz polską etykietę namespace.
 */
export function getNamespaceLabelPl(namespace: CatalogNamespace): string {
  return NAMESPACE_LABEL_PL[namespace];
}

/**
 * Pobierz namespace dla węzła drzewa TYPE_CATALOG.
 */
export function getNamespaceForTreeNode(treeNodeType: TreeNodeType): CatalogNamespace | undefined {
  return TREE_NODE_TO_NAMESPACE[treeNodeType] as CatalogNamespace | undefined;
}

/**
 * Wszystkie namespace'y widoczne w drzewie projektu.
 *
 * Sortowanie deterministyczne — kolejność wizualna w TYPE_CATALOG:
 * 1. Linie, 2. Kable, 3. Transformatory, 4. Aparatura
 */
export const CATALOG_TREE_NAMESPACES: readonly CatalogNamespace[] = [
  'LINIA_SN',
  'KABEL_SN',
  'TRAFO_SN_NN',
  'APARAT_SN',
] as const;

/**
 * Kompletne informacje o kategorii katalogowej w drzewie.
 */
export interface CatalogTreeEntry {
  namespace: CatalogNamespace;
  treeNodeType: TreeNodeType;
  labelPl: string;
  pickerCategory: TypeCategory;
}

/**
 * Pobierz listę wpisów katalogu widocznych w drzewie projektu.
 *
 * Deterministyczna kolejność, gotowa do renderowania.
 */
export function getCatalogTreeEntries(): CatalogTreeEntry[] {
  return CATALOG_TREE_NAMESPACES.map((ns) => ({
    namespace: ns,
    treeNodeType: NAMESPACE_TO_TREE_NODE[ns]!,
    labelPl: NAMESPACE_LABEL_PL[ns],
    pickerCategory: NAMESPACE_TO_PICKER_CATEGORY[ns],
  }));
}
