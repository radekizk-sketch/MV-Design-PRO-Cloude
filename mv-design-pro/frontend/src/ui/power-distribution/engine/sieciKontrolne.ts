/**
 * sieciKontrolne.ts — Kanoniczne sieci kontrolne do testow i demonstracji.
 *
 * SIECI KONTROLNE:
 * 1. Prosta magistrala (GPZ → 3 stacje przelotowe → stacja koncowa)
 * 2. Stacja z odgalezieniem (magistrala + odgalezienie boczne)
 * 3. Pierscien z NOP (2 tory zasilania, punkt NOP)
 * 4. Stacja z generacja OZE (PV + BESS)
 * 5. Stacja z wieloma polami (sekcyjna, transformatorowa, pomiarowa)
 *
 * DETERMINIZM: funkcje czyste, ID statyczne, brak losowosci.
 */

import type { DaneWejsciowe } from './adapterSemantyczny';

// =============================================================================
// § 1. PROSTA MAGISTRALA
// =============================================================================

/**
 * GPZ → ST1 → ST2 → ST3 (koncowa)
 * Magistrala 15kV, 3 stacje przelotowe i 1 koncowa.
 */
export function siecProstaMagistrala(): DaneWejsciowe {
  return {
    obiekty: [
      {
        id: 'gpz-1',
        typ: 'GPZ',
        nazwa: 'GPZ Centrala',
        napiecieKv: 15,
        pozycjaX: 200,
        pozycjaY: 300,
        pola: [
          { id: 'wyj-1', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Pole liniowe L1', celId: 'st-1' },
        ],
      },
      {
        id: 'st-1',
        typ: 'STACJA_PRZELOTOWA',
        nazwa: 'ST-1 Polnocna',
        napiecieKv: 15,
        pozycjaX: 600,
        pozycjaY: 300,
        pola: [
          { id: 'wej-1', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z GPZ', celId: 'gpz-1' },
          { id: 'wyj-2', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie do ST-2', celId: 'st-2' },
          { id: 'tr-1', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
      {
        id: 'st-2',
        typ: 'STACJA_PRZELOTOWA',
        nazwa: 'ST-2 Wschodnia',
        napiecieKv: 15,
        pozycjaX: 1000,
        pozycjaY: 300,
        pola: [
          { id: 'wej-3', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z ST-1', celId: 'st-1' },
          { id: 'wyj-4', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie do ST-3', celId: 'st-3' },
          { id: 'tr-2', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
      {
        id: 'st-3',
        typ: 'STACJA_KONCOWA',
        nazwa: 'ST-3 Koncowa',
        napiecieKv: 15,
        pozycjaX: 1400,
        pozycjaY: 300,
        pola: [
          { id: 'wej-5', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z ST-2', celId: 'st-2' },
          { id: 'tr-3', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
    ],
    polaczenia: [
      { id: 'pol-1', odObiektId: 'gpz-1', doObiektId: 'st-1', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 2.5, etykieta: 'YAKXs 3x120mm2, 2.5 km' },
      { id: 'pol-2', odObiektId: 'st-1', doObiektId: 'st-2', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 1.8, etykieta: 'YAKXs 3x120mm2, 1.8 km' },
      { id: 'pol-3', odObiektId: 'st-2', doObiektId: 'st-3', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 3.0, etykieta: 'YAKXs 3x120mm2, 3.0 km' },
    ],
  };
}

// =============================================================================
// § 2. STACJA Z ODGALEZIENIEM
// =============================================================================

/**
 * GPZ → ST-M (magistrala) → ST-K (koncowa)
 *                ↓
 *              ST-O (odgalezienie)
 */
export function siecZOdgalezieniem(): DaneWejsciowe {
  return {
    obiekty: [
      {
        id: 'gpz-1',
        typ: 'GPZ',
        nazwa: 'GPZ Zasilajacy',
        napiecieKv: 15,
        pozycjaX: 200,
        pozycjaY: 300,
        pola: [
          { id: 'wyj-1', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie magistrali', celId: 'st-m' },
        ],
      },
      {
        id: 'st-m',
        typ: 'STACJA_PRZELOTOWA',
        nazwa: 'ST-M Magistrala',
        napiecieKv: 15,
        pozycjaX: 600,
        pozycjaY: 300,
        pola: [
          { id: 'wej-1', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z GPZ', celId: 'gpz-1' },
          { id: 'wyj-2', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie do ST-K', celId: 'st-k' },
          { id: 'odg-1', typ: 'ODGALEZIENIOWE', kierunek: 'PRAWO', etykieta: 'Odgalezienie do ST-O', celId: 'st-o' },
          { id: 'tr-1', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
      {
        id: 'st-k',
        typ: 'STACJA_KONCOWA',
        nazwa: 'ST-K Koncowa',
        napiecieKv: 15,
        pozycjaX: 1000,
        pozycjaY: 300,
        pola: [
          { id: 'wej-3', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z ST-M', celId: 'st-m' },
          { id: 'tr-2', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
      {
        id: 'st-o',
        typ: 'STACJA_ODGALEZIENIOWA',
        nazwa: 'ST-O Odgalezienie',
        napiecieKv: 15,
        pozycjaX: 600,
        pozycjaY: 700,
        pola: [
          { id: 'wej-4', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z ST-M', celId: 'st-m' },
          { id: 'tr-3', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
    ],
    polaczenia: [
      { id: 'pol-1', odObiektId: 'gpz-1', doObiektId: 'st-m', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 3.0, etykieta: 'YAKXs 3x120mm2' },
      { id: 'pol-2', odObiektId: 'st-m', doObiektId: 'st-k', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 2.0, etykieta: 'YAKXs 3x120mm2' },
      { id: 'pol-3', odObiektId: 'st-m', doObiektId: 'st-o', typ: 'ODGALEZIENIE', typLinii: 'KABEL', dlugoscKm: 1.5, etykieta: 'YAKXs 3x70mm2' },
    ],
  };
}

// =============================================================================
// § 3. PIERSCIEN Z NOP
// =============================================================================

/**
 * GPZ → ST-A → ST-B → NOP → ST-C → GPZ (zamkniety pierscien z NOP)
 */
export function siecPierscienZNop(): DaneWejsciowe {
  return {
    obiekty: [
      {
        id: 'gpz-1',
        typ: 'GPZ',
        nazwa: 'GPZ Pierscien',
        napiecieKv: 15,
        pozycjaX: 600,
        pozycjaY: 100,
        sekcjeSzyn: 2,
        pola: [
          { id: 'wyj-l', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Tor lewy', celId: 'st-a' },
          { id: 'wyj-p', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Tor prawy', celId: 'st-c' },
        ],
      },
      {
        id: 'st-a',
        typ: 'STACJA_PRZELOTOWA',
        nazwa: 'ST-A Lewy tor',
        napiecieKv: 15,
        pozycjaX: 300,
        pozycjaY: 500,
        pola: [
          { id: 'wej-1', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z GPZ', celId: 'gpz-1' },
          { id: 'wyj-1', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie do ST-B', celId: 'st-b' },
          { id: 'tr-1', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
      {
        id: 'st-b',
        typ: 'STACJA_PRZELOTOWA',
        nazwa: 'ST-B Punkt NOP',
        napiecieKv: 15,
        pozycjaX: 600,
        pozycjaY: 800,
        pola: [
          { id: 'wej-2', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z ST-A', celId: 'st-a' },
          { id: 'wyj-2', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'NOP do ST-C', celId: 'st-c' },
          { id: 'tr-2', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
      {
        id: 'st-c',
        typ: 'STACJA_PRZELOTOWA',
        nazwa: 'ST-C Prawy tor',
        napiecieKv: 15,
        pozycjaX: 900,
        pozycjaY: 500,
        pola: [
          { id: 'wej-3', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'NOP z ST-B', celId: 'st-b' },
          { id: 'wyj-3', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'GORA', etykieta: 'Wyjscie do GPZ', celId: 'gpz-1' },
          { id: 'tr-3', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
    ],
    polaczenia: [
      { id: 'pol-1', odObiektId: 'gpz-1', doObiektId: 'st-a', typ: 'PIERSCIEN', typLinii: 'KABEL', dlugoscKm: 2.0, etykieta: 'Tor lewy' },
      { id: 'pol-2', odObiektId: 'st-a', doObiektId: 'st-b', typ: 'PIERSCIEN', typLinii: 'KABEL', dlugoscKm: 1.5, etykieta: 'Odcinek A-B' },
      { id: 'pol-3', odObiektId: 'st-b', doObiektId: 'st-c', typ: 'PIERSCIEN', typLinii: 'KABEL', dlugoscKm: 1.5, etykieta: 'Odcinek NOP B-C', normalnieOtwarty: true },
      { id: 'pol-4', odObiektId: 'st-c', doObiektId: 'gpz-1', typ: 'PIERSCIEN', typLinii: 'KABEL', dlugoscKm: 2.0, etykieta: 'Tor prawy' },
    ],
  };
}

// =============================================================================
// § 4. STACJA Z GENERACJA OZE
// =============================================================================

/**
 * GPZ → ST-G (stacja z generacja PV + BESS)
 */
export function siecZGeneracjaOze(): DaneWejsciowe {
  return {
    obiekty: [
      {
        id: 'gpz-1',
        typ: 'GPZ',
        nazwa: 'GPZ z OZE',
        napiecieKv: 15,
        pozycjaX: 200,
        pozycjaY: 300,
        pola: [
          { id: 'wyj-1', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie do ST-G', celId: 'st-g' },
        ],
      },
      {
        id: 'st-g',
        typ: 'OBIEKT_GENERACJA',
        nazwa: 'ST-G Farma PV + BESS',
        napiecieKv: 15,
        pozycjaX: 700,
        pozycjaY: 300,
        pola: [
          { id: 'wej-1', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z GPZ', celId: 'gpz-1' },
          { id: 'pv-1', typ: 'ZRODLO_PV', kierunek: 'DOL', etykieta: 'Farma PV 2 MW' },
          { id: 'bess-1', typ: 'ZRODLO_BESS', kierunek: 'DOL', etykieta: 'BESS 1 MW / 2 MWh' },
          { id: 'tr-1', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
          { id: 'pom-1', typ: 'POMIAROWE', kierunek: 'GORA', etykieta: 'Pole pomiarowe' },
        ],
      },
    ],
    polaczenia: [
      { id: 'pol-1', odObiektId: 'gpz-1', doObiektId: 'st-g', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 5.0, etykieta: 'YAKXs 3x240mm2, 5.0 km' },
    ],
  };
}

// =============================================================================
// § 5. STACJA SEKCYJNA Z WIELOMA POLAMI
// =============================================================================

/**
 * GPZ → ST-S (sekcyjna, 2 sekcje szyn, sprzeglo, wiele pol)
 */
export function siecStacjaSekcyjna(): DaneWejsciowe {
  return {
    obiekty: [
      {
        id: 'gpz-1',
        typ: 'GPZ',
        nazwa: 'GPZ Dwutorowy',
        napiecieKv: 15,
        pozycjaX: 200,
        pozycjaY: 300,
        sekcjeSzyn: 2,
        pola: [
          { id: 'wyj-s1', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Tor 1 do ST-S', celId: 'st-s' },
          { id: 'wyj-s2', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Tor 2 do ST-S', celId: 'st-s' },
        ],
      },
      {
        id: 'st-s',
        typ: 'STACJA_SEKCYJNA',
        nazwa: 'ST-S Sekcyjna',
        napiecieKv: 15,
        pozycjaX: 700,
        pozycjaY: 300,
        sekcjeSzyn: 2,
        pola: [
          { id: 'wej-t1', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie tor 1', celId: 'gpz-1' },
          { id: 'wej-t2', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie tor 2', celId: 'gpz-1' },
          { id: 'spr-1', typ: 'SPRZEGLO', kierunek: 'GORA', etykieta: 'Sprzeglo sekcyjne' },
          { id: 'tr-s1', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo S1 15/0.4 kV' },
          { id: 'tr-s2', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo S2 15/0.4 kV' },
          { id: 'wyj-k1', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie do ST-K1', celId: 'st-k1' },
          { id: 'wyj-k2', typ: 'LINIOWE_WYJSCIOWE', kierunek: 'DOL', etykieta: 'Wyjscie do ST-K2', celId: 'st-k2' },
        ],
      },
      {
        id: 'st-k1',
        typ: 'STACJA_KONCOWA',
        nazwa: 'ST-K1 Koncowa 1',
        napiecieKv: 15,
        pozycjaX: 500,
        pozycjaY: 700,
        pola: [
          { id: 'wej-k1', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z ST-S', celId: 'st-s' },
          { id: 'tr-k1', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
      {
        id: 'st-k2',
        typ: 'STACJA_KONCOWA',
        nazwa: 'ST-K2 Koncowa 2',
        napiecieKv: 15,
        pozycjaX: 900,
        pozycjaY: 700,
        pola: [
          { id: 'wej-k2', typ: 'LINIOWE_WEJSCIOWE', kierunek: 'GORA', etykieta: 'Wejscie z ST-S', celId: 'st-s' },
          { id: 'tr-k2', typ: 'TRANSFORMATOROWE', kierunek: 'DOL', etykieta: 'Trafo 15/0.4 kV' },
        ],
      },
    ],
    polaczenia: [
      { id: 'pol-1', odObiektId: 'gpz-1', doObiektId: 'st-s', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 4.0, etykieta: 'Tor 1 YAKXs 3x240' },
      { id: 'pol-2', odObiektId: 'gpz-1', doObiektId: 'st-s', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 4.0, etykieta: 'Tor 2 YAKXs 3x240' },
      { id: 'pol-3', odObiektId: 'st-s', doObiektId: 'st-k1', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 1.5, etykieta: 'YAKXs 3x120' },
      { id: 'pol-4', odObiektId: 'st-s', doObiektId: 'st-k2', typ: 'TOR_GLOWNY', typLinii: 'KABEL', dlugoscKm: 1.5, etykieta: 'YAKXs 3x120' },
    ],
  };
}
