import type { CanonicalOpName } from '../../types/domainOps';

export type CreatorTool =
  | 'select'
  | 'move'
  | 'add_gpz'
  | 'continue_trunk'
  | 'insert_station'
  | 'start_branch'
  | 'connect_ring'
  | 'set_nop'
  | 'add_pv'
  | 'add_bess'
  | 'edit_properties'
  | 'assign_catalog'
  | 'delete_element'
  | null;

export interface CreatorToolDef {
  id: Exclude<CreatorTool, null>;
  label: string;
  icon: string;
  description: string;
  group: 'NARZEDZIA' | 'BUDOWA_SIECI';
  canonicalOp: CanonicalOpName | null;
  requiresSldContext: boolean;
  requiresSource?: boolean;
  requiresRing?: boolean;
}

export type EditorObjectTypeId =
  | 'GPZ'
  | 'STACJA_KONCOWA'
  | 'STACJA_PRZELOTOWA'
  | 'STACJA_ODGALEZNA'
  | 'STACJA_SEKCYJNA'
  | 'ZKSN'
  | 'PUNKT_ROZGALEZNY'
  | 'PV'
  | 'BESS';

export interface EditorPortProfile {
  id: string;
  label: string;
  role: 'TRUNK_IN' | 'TRUNK_OUT' | 'BRANCH_OUT' | 'RING' | 'NN_SOURCE';
  direction: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  hitRadiusPx: number;
}

export interface EditorObjectTypeDef {
  id: EditorObjectTypeId;
  label: string;
  category: 'SIEC_SN' | 'STACJE' | 'TEREN' | 'OZE';
  domainType: string;
  semanticType: string;
  ports: EditorPortProfile[];
  createOp: CanonicalOpName;
}

export const CREATOR_TOOLS: CreatorToolDef[] = [
  {
    id: 'select',
    label: 'Wybierz',
    icon: '🖱',
    description: 'Wybór elementu i przejście do inspektora.',
    group: 'NARZEDZIA',
    canonicalOp: null,
    requiresSldContext: false,
  },
  {
    id: 'move',
    label: 'Przesuń',
    icon: '✥',
    description: 'Przesuwanie geometrii z użyciem portów i snapowania.',
    group: 'NARZEDZIA',
    canonicalOp: null,
    requiresSldContext: false,
  },
  {
    id: 'edit_properties',
    label: 'Edytuj właściwości',
    icon: '🛠',
    description: 'Edycja parametrów elementu przez ENM_OP update.',
    group: 'NARZEDZIA',
    canonicalOp: 'update_element_parameters',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'delete_element',
    label: 'Usuń z modelu',
    icon: '🗑',
    description: 'Usunięcie elementu z modelu przez operację domenową.',
    group: 'NARZEDZIA',
    canonicalOp: 'delete_element',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'assign_catalog',
    label: 'Przypisz katalog',
    icon: '📚',
    description: 'Przypisanie typu katalogowego do wskazanego elementu.',
    group: 'NARZEDZIA',
    canonicalOp: 'assign_catalog_to_element',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'add_gpz',
    label: 'Dodaj GPZ',
    icon: '⚡',
    description: 'Dodaje punkt zasilania GPZ i rozpoczyna budowę sieci SN.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'add_grid_source_sn',
    requiresSldContext: false,
  },
  {
    id: 'continue_trunk',
    label: 'Dodaj odcinek magistrali',
    icon: '━',
    description: 'Kontynuuje trunk od aktywnego terminala magistrali.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'continue_trunk_segment_sn',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'insert_station',
    label: 'Wstaw stację w odcinek',
    icon: '▣',
    description: 'Wstawia stację SN/nN na wskazanym segmencie magistrali.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'insert_station_on_segment_sn',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'start_branch',
    label: 'Dodaj odgałęzienie',
    icon: '┣',
    description: 'Tworzy branch z poprawnego portu semantycznego.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'start_branch_segment_sn',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'connect_ring',
    label: 'Połącz ring',
    icon: '◌',
    description: 'Łączy dwa terminale secondary ring.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'connect_secondary_ring_sn',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'set_nop',
    label: 'Ustaw NOP',
    icon: '⊘',
    description: 'Ustawia normalnie otwarty punkt na segmencie ring.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'set_normal_open_point',
    requiresSldContext: true,
    requiresRing: true,
  },
  {
    id: 'add_pv',
    label: 'Dodaj PV',
    icon: '☀',
    description: 'Dodaje źródło PV po stronie nN.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'add_pv_inverter_nn',
    requiresSldContext: true,
    requiresSource: true,
  },
  {
    id: 'add_bess',
    label: 'Dodaj BESS',
    icon: '▤',
    description: 'Dodaje magazyn energii BESS po stronie nN.',
    group: 'BUDOWA_SIECI',
    canonicalOp: 'add_bess_inverter_nn',
    requiresSldContext: true,
    requiresSource: true,
  },
];

export const EDITOR_OBJECT_TYPES: EditorObjectTypeDef[] = [
  {
    id: 'GPZ',
    label: 'GPZ',
    category: 'SIEC_SN',
    domainType: 'grid_source_sn',
    semanticType: 'GPZ',
    createOp: 'add_grid_source_sn',
    ports: [{ id: 'TRUNK_OUT', label: 'Magistrala', role: 'TRUNK_OUT', direction: 'BOTTOM', hitRadiusPx: 20 }],
  },
  {
    id: 'STACJA_KONCOWA',
    label: 'Stacja końcowa',
    category: 'STACJE',
    domainType: 'station_sn_nn_end',
    semanticType: 'STACJA_A',
    createOp: 'insert_station_on_segment_sn',
    ports: [{ id: 'TRUNK_IN', label: 'Wejście SN', role: 'TRUNK_IN', direction: 'TOP', hitRadiusPx: 18 }],
  },
  {
    id: 'STACJA_PRZELOTOWA',
    label: 'Stacja przelotowa',
    category: 'STACJE',
    domainType: 'station_sn_nn_pass',
    semanticType: 'STACJA_B',
    createOp: 'insert_station_on_segment_sn',
    ports: [
      { id: 'TRUNK_IN', label: 'Wejście SN', role: 'TRUNK_IN', direction: 'LEFT', hitRadiusPx: 18 },
      { id: 'TRUNK_OUT', label: 'Wyjście SN', role: 'TRUNK_OUT', direction: 'RIGHT', hitRadiusPx: 18 },
    ],
  },
  {
    id: 'STACJA_ODGALEZNA',
    label: 'Stacja odgałęźna',
    category: 'STACJE',
    domainType: 'station_sn_nn_branch',
    semanticType: 'STACJA_C',
    createOp: 'insert_station_on_segment_sn',
    ports: [
      { id: 'TRUNK_IN', label: 'Wejście SN', role: 'TRUNK_IN', direction: 'LEFT', hitRadiusPx: 18 },
      { id: 'TRUNK_OUT', label: 'Wyjście SN', role: 'TRUNK_OUT', direction: 'RIGHT', hitRadiusPx: 18 },
      { id: 'BRANCH_OUT', label: 'Odgałęzienie', role: 'BRANCH_OUT', direction: 'BOTTOM', hitRadiusPx: 20 },
    ],
  },
  {
    id: 'STACJA_SEKCYJNA',
    label: 'Stacja sekcyjna',
    category: 'STACJE',
    domainType: 'station_sn_section',
    semanticType: 'STACJA_D',
    createOp: 'insert_section_switch_sn',
    ports: [
      { id: 'TRUNK_IN', label: 'Sekcja A', role: 'TRUNK_IN', direction: 'LEFT', hitRadiusPx: 18 },
      { id: 'TRUNK_OUT', label: 'Sekcja B', role: 'TRUNK_OUT', direction: 'RIGHT', hitRadiusPx: 18 },
      { id: 'RING', label: 'Port ring', role: 'RING', direction: 'BOTTOM', hitRadiusPx: 20 },
    ],
  },
  {
    id: 'ZKSN',
    label: 'ZKSN',
    category: 'TEREN',
    domainType: 'zksn_node',
    semanticType: 'ZKSN',
    createOp: 'insert_zksn_on_segment_sn',
    ports: [
      { id: 'TRUNK_IN', label: 'Wejście', role: 'TRUNK_IN', direction: 'TOP', hitRadiusPx: 18 },
      { id: 'TRUNK_OUT', label: 'Wyjście', role: 'TRUNK_OUT', direction: 'BOTTOM', hitRadiusPx: 18 },
    ],
  },
  {
    id: 'PUNKT_ROZGALEZNY',
    label: 'Punkt rozgałęźny / słup',
    category: 'TEREN',
    domainType: 'branch_pole_sn',
    semanticType: 'BRANCH_POLE',
    createOp: 'insert_branch_pole_on_segment_sn',
    ports: [
      { id: 'TRUNK_IN', label: 'Wejście', role: 'TRUNK_IN', direction: 'TOP', hitRadiusPx: 18 },
      { id: 'TRUNK_OUT', label: 'Wyjście', role: 'TRUNK_OUT', direction: 'BOTTOM', hitRadiusPx: 18 },
      { id: 'BRANCH_OUT', label: 'Branch', role: 'BRANCH_OUT', direction: 'RIGHT', hitRadiusPx: 20 },
    ],
  },
  {
    id: 'PV',
    label: 'PV',
    category: 'OZE',
    domainType: 'pv_inverter_nn',
    semanticType: 'PV',
    createOp: 'add_pv_inverter_nn',
    ports: [{ id: 'NN_SOURCE', label: 'Przyłącze nN', role: 'NN_SOURCE', direction: 'TOP', hitRadiusPx: 18 }],
  },
  {
    id: 'BESS',
    label: 'BESS',
    category: 'OZE',
    domainType: 'bess_inverter_nn',
    semanticType: 'BESS',
    createOp: 'add_bess_inverter_nn',
    ports: [{ id: 'NN_SOURCE', label: 'Przyłącze nN', role: 'NN_SOURCE', direction: 'TOP', hitRadiusPx: 18 }],
  },
];
