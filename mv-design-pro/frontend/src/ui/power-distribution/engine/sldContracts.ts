/**
 * sldContracts.ts — Kanoniczne kontrakty danych silnika SLD.
 *
 * ARCHITEKTURA: Warstwa KONTRAKTOW — czyste typy danych.
 *
 * ZASADY:
 * - Immutable (readonly).
 * - Deterministyczny (sortowane po id).
 * - Brak fizyki, brak mutacji modelu.
 * - Brak zaleznosci od warstwy renderowania.
 * - Pelna separacja: semantyka ≠ geometria ≠ render.
 *
 * HIERARCHIA TYPOW:
 *   ObiektSld → PoleSld → ElementAparatury → Port
 *   SiecSld → ObiektSld[] → PolaczenieSld[]
 *   WynikUkladuSld → GeometriaObiektu[] → TrasaPolaczenia[]
 */

// =============================================================================
// § 1. PRYMITYWY GEOMETRYCZNE
// =============================================================================

/** Punkt 2D w przestrzeni swiata (piksele). */
export interface Punkt2D {
  readonly x: number;
  readonly y: number;
}

/** Prostokat w przestrzeni swiata. */
export interface Prostokat {
  readonly x: number;
  readonly y: number;
  readonly szerokosc: number;
  readonly wysokosc: number;
}

// =============================================================================
// § 2. TYPY OBIEKTOW SLD (KANONICZNE)
// =============================================================================

/** Typ obiektu SLD — odpowiada roli w sieci SN. */
export const TypObiektuSld = {
  /** Glowny Punkt Zasilajacy */
  GPZ: 'GPZ',
  /** Stacja przelotowa */
  STACJA_PRZELOTOWA: 'STACJA_PRZELOTOWA',
  /** Stacja odgalezieniowa */
  STACJA_ODGALEZIENIOWA: 'STACJA_ODGALEZIENIOWA',
  /** Stacja koncowa */
  STACJA_KONCOWA: 'STACJA_KONCOWA',
  /** Stacja sekcyjna (2+ sekcje szyn z sprzeglem) */
  STACJA_SEKCYJNA: 'STACJA_SEKCYJNA',
  /** Rozdzielnia sieciowa */
  ROZDZIELNIA_SIECIOWA: 'ROZDZIELNIA_SIECIOWA',
  /** Punkt normalnie otwarty */
  PUNKT_NOP: 'PUNKT_NOP',
  /** Obiekt z generacja OZE */
  OBIEKT_GENERACJA: 'OBIEKT_GENERACJA',
} as const;

export type TypObiektuSld = (typeof TypObiektuSld)[keyof typeof TypObiektuSld];

// =============================================================================
// § 3. TYPY POL (KANONICZNE)
// =============================================================================

/** Typ pola rozdzielczego. */
export const TypPola = {
  /** Pole liniowe wejsciowe (zasilanie z magistrali) */
  LINIOWE_WEJSCIOWE: 'LINIOWE_WEJSCIOWE',
  /** Pole liniowe wyjsciowe (zasilanie dalszych stacji) */
  LINIOWE_WYJSCIOWE: 'LINIOWE_WYJSCIOWE',
  /** Pole odgalezieniowe */
  ODGALEZIENIOWE: 'ODGALEZIENIOWE',
  /** Pole transformatorowe SN/nN */
  TRANSFORMATOROWE: 'TRANSFORMATOROWE',
  /** Pole zrodla PV */
  ZRODLO_PV: 'ZRODLO_PV',
  /** Pole zrodla BESS */
  ZRODLO_BESS: 'ZRODLO_BESS',
  /** Pole sprzegla sekcyjnego */
  SPRZEGLO: 'SPRZEGLO',
  /** Pole pomiarowe */
  POMIAROWE: 'POMIAROWE',
} as const;

export type TypPola = (typeof TypPola)[keyof typeof TypPola];

/** Kierunek pola wzgledem szyny. */
export const KierunekPola = {
  GORA: 'GORA',
  DOL: 'DOL',
  LEWO: 'LEWO',
  PRAWO: 'PRAWO',
} as const;

export type KierunekPola = (typeof KierunekPola)[keyof typeof KierunekPola];

// =============================================================================
// § 4. ELEMENTY APARATUROWE (KANONICZNE)
// =============================================================================

/** Typ elementu aparaturowego w polu. */
export const TypAparatu = {
  WYLACZNIK: 'WYLACZNIK',
  ODLACZNIK: 'ODLACZNIK',
  UZIEMNIK: 'UZIEMNIK',
  PRZEKLADNIK_PRADOWY: 'PRZEKLADNIK_PRADOWY',
  PRZEKLADNIK_NAPIECIOWY: 'PRZEKLADNIK_NAPIECIOWY',
  ZABEZPIECZENIE: 'ZABEZPIECZENIE',
  BEZPIECZNIK: 'BEZPIECZNIK',
  GLOWICA_KABLOWA: 'GLOWICA_KABLOWA',
  TRANSFORMATOR: 'TRANSFORMATOR',
  GENERATOR_PV: 'GENERATOR_PV',
  GENERATOR_BESS: 'GENERATOR_BESS',
  FALOWNIK: 'FALOWNIK',
} as const;

export type TypAparatu = (typeof TypAparatu)[keyof typeof TypAparatu];

/** Element aparaturowy w polu. */
export interface ElementAparatury {
  readonly id: string;
  readonly typ: TypAparatu;
  readonly etykieta: string;
  /** Odniesienie do katalogu (null = brak — FixAction) */
  readonly katalogRef: string | null;
  /** Odniesienie do zabezpieczenia (dla ZABEZPIECZENIE — boundCbId) */
  readonly powiazanieZabezpieczenia: string | null;
}

// =============================================================================
// § 5. POLE SLD (SEMANTYCZNE)
// =============================================================================

/** Pole rozdzielcze — byt pierwszej klasy. */
export interface PoleSld {
  readonly id: string;
  /** ID obiektu nadrzednego (stacja/GPZ) */
  readonly obiektId: string;
  /** Typ pola */
  readonly typ: TypPola;
  /** Kierunek pola wzgledem szyny */
  readonly kierunek: KierunekPola;
  /** Kolejnosc w grupie kierunkowej (0-based, deterministyczna) */
  readonly kolejnosc: number;
  /** Etykieta pola (np. "Pole liniowe L1") */
  readonly etykieta: string;
  /** Czy pole jest jawne (zdefiniowane w modelu) czy niejawne (wynikowe) */
  readonly jawne: boolean;
  /** Lancuch aparatury (sekwencyjny tor od szyny do portu) */
  readonly aparatura: readonly ElementAparatury[];
  /** ID obiektu docelowego (stacja na drugim koncu polaczenia) */
  readonly celId: string | null;
  /** Preferencja kotwiczenia celu (pomocniczo dla sortowania) */
  readonly celKotwica: 'GORA' | 'DOL' | 'LEWO' | 'PRAWO' | null;
  /** Podpowiedz X celu (pomocniczo dla sortowania antykrzyzowaniowego) */
  readonly celXHint: number | null;
}

// =============================================================================
// § 6. OBIEKT SLD (SEMANTYCZNY)
// =============================================================================

/** Obiekt SLD — stacja, GPZ, rozdzielnia, punkt NOP. */
export interface ObiektSld {
  readonly id: string;
  /** Typ obiektu */
  readonly typ: TypObiektuSld;
  /** Nazwa obiektu (etykieta) */
  readonly nazwa: string;
  /** Napiecie znamionowe [kV] */
  readonly napiecieKv: number;
  /** Pola rozdzielcze (sortowane po id) */
  readonly pola: readonly PoleSld[];
  /** Liczba sekcji szyn (1 = normalna, 2 = sekcyjna) */
  readonly sekcjeSzyn: number;
  /** Pozycja bazowa na schemacie (wyliczana przez adapter lub reczna) */
  readonly pozycjaBazowa: Punkt2D | null;
}

// =============================================================================
// § 7. POLACZENIE SLD (SEMANTYCZNE)
// =============================================================================

/** Typ polaczenia miedzy obiektami. */
export const TypPolaczenia = {
  /** Odcinek toru glownego (magistrala) */
  TOR_GLOWNY: 'TOR_GLOWNY',
  /** Odgalezienie od toru glownego */
  ODGALEZIENIE: 'ODGALEZIENIE',
  /** Polaczenie pierscienia */
  PIERSCIEN: 'PIERSCIEN',
  /** Polaczenie rezerwowe / lacznik */
  REZERWOWE: 'REZERWOWE',
  /** Polaczenie wewnetrzne (wewnatrz stacji) */
  WEWNETRZNE: 'WEWNETRZNE',
} as const;

export type TypPolaczenia = (typeof TypPolaczenia)[keyof typeof TypPolaczenia];

/** Polaczenie semantyczne miedzy dwoma obiektami. */
export interface PolaczenieSld {
  readonly id: string;
  /** ID obiektu poczatkowego */
  readonly odId: string;
  /** ID pola poczatkowego (port wyjsciowy) */
  readonly odPolaId: string;
  /** ID obiektu koncowego */
  readonly doId: string;
  /** ID pola koncowego (port wejsciowy) */
  readonly doPolaId: string;
  /** Typ polaczenia */
  readonly typ: TypPolaczenia;
  /** Typ linii (kabel/napowietrzna) */
  readonly typLinii: 'KABEL' | 'NAPOWIETRZNA';
  /** Dlugosc [km] (null = nieznana) */
  readonly dlugoscKm: number | null;
  /** Etykieta (np. "YAKXs 3x120mm2, 1.5 km") */
  readonly etykieta: string;
  /** Czy normalnie otwarty (NOP) */
  readonly normalnieOtwarty: boolean;
}

// =============================================================================
// § 8. SIEC SLD (PELNY MODEL SEMANTYCZNY)
// =============================================================================

/** Pelny model semantyczny sieci SLD. */
export interface SiecSld {
  /** Wszystkie obiekty (sortowane po id) */
  readonly obiekty: readonly ObiektSld[];
  /** Wszystkie polaczenia (sortowane po id) */
  readonly polaczenia: readonly PolaczenieSld[];
}

// =============================================================================
// § 9. PORT (BYT PIERWSZEJ KLASY)
// =============================================================================

/** Rola portu. */
export const RolaPortu = {
  /** Port wejsciowy (zasilanie przychodzace) */
  WEJSCIE: 'WEJSCIE',
  /** Port wyjsciowy (zasilanie wychodzace) */
  WYJSCIE: 'WYJSCIE',
  /** Port odgalezienia */
  ODGALEZIENIE: 'ODGALEZIENIE',
  /** Port generatora */
  GENERATOR: 'GENERATOR',
  /** Port szyny zbiorczej (lewy/prawy koniec) */
  SZYNA_LEWO: 'SZYNA_LEWO',
  SZYNA_PRAWO: 'SZYNA_PRAWO',
} as const;

export type RolaPortu = (typeof RolaPortu)[keyof typeof RolaPortu];

/** Port — jawny punkt polaczeniowy z wspolrzednymi absolutnymi. */
export interface PortSld {
  readonly id: string;
  /** ID pola do ktorego nalezy port */
  readonly polaId: string;
  /** ID obiektu */
  readonly obiektId: string;
  /** Rola portu */
  readonly rola: RolaPortu;
  /** Kierunek wyjscia portu (dla trasowania) */
  readonly kierunekWyjscia: KierunekPola;
  /** Wspolrzedne absolutne portu (wyliczane przez silnik geometrii) */
  readonly pozycja: Punkt2D;
}

// =============================================================================
// § 10. GEOMETRIA SZYNY (WYNIK OBLICZEN)
// =============================================================================

/** Geometria szyny zbiorczej obiektu. */
export interface GeometriaSzyny {
  /** ID obiektu */
  readonly obiektId: string;
  /** Lewy gorny rog szyny */
  readonly x: number;
  readonly y: number;
  /** Wymiary szyny */
  readonly szerokosc: number;
  readonly wysokosc: number;
  /** Sekcje (1 lub 2 dla stacji sekcyjnej) */
  readonly sekcje: readonly {
    readonly sekcjaId: string;
    readonly x1: number;
    readonly x2: number;
  }[];
}

// =============================================================================
// § 11. GEOMETRIA POLA (WYNIK OBLICZEN)
// =============================================================================

/** Geometria pojedynczego pola po ukladzie. */
export interface GeometriaPola {
  readonly polaId: string;
  readonly obiektId: string;
  /** Bounding box pola */
  readonly obrys: Prostokat;
  /** Pozycja poczatku toru (od szyny) */
  readonly poczatekToru: Punkt2D;
  /** Pozycja konca toru (port polaczeniowy) */
  readonly koniecToru: Punkt2D;
  /** Pozycje elementow aparaturowych (sekwencyjne) */
  readonly pozycjeAparaturowe: readonly {
    readonly elementId: string;
    readonly pozycja: Punkt2D;
    readonly rozmiar: { readonly szer: number; readonly wys: number };
    readonly obrot: number;
  }[];
  /** Port polaczeniowy (fizyczny koniec pola) */
  readonly port: PortSld;
}

// =============================================================================
// § 12. GEOMETRIA OBIEKTU (WYNIK OBLICZEN)
// =============================================================================

/** Pelna geometria obiektu po ukladzie. */
export interface GeometriaObiektu {
  readonly obiektId: string;
  /** Obrys calego obiektu (stacja + pola) */
  readonly obrys: Prostokat;
  /** Geometria szyny */
  readonly szyna: GeometriaSzyny;
  /** Geometrie pol (sortowane po polaId) */
  readonly pola: readonly GeometriaPola[];
  /** Wszystkie porty obiektu (sortowane po id) */
  readonly porty: readonly PortSld[];
}

// =============================================================================
// § 13. TRASA ORTOGONALNA (WYNIK TRASOWANIA)
// =============================================================================

/** Punkt lamania trasy (Manhattan routing). */
export interface PunktLamania {
  readonly x: number;
  readonly y: number;
}

/** Trasa polaczenia (ortogonalna, Manhattan). */
export interface TrasaPolaczenia {
  readonly polaczenieId: string;
  /** Port poczatkowy */
  readonly portOd: PortSld;
  /** Port koncowy */
  readonly portDo: PortSld;
  /** Punkty lamania (wlacznie z poczatkiem i koncem) */
  readonly punkty: readonly PunktLamania[];
  /** Typ polaczenia (dla stylu renderowania) */
  readonly typ: TypPolaczenia;
  /** Czy normalnie otwarty */
  readonly normalnieOtwarty: boolean;
}

// =============================================================================
// § 14. WYNIK UKLADU SLD (PELNY)
// =============================================================================

/** Pelny wynik ukladu schematu SLD. */
export interface WynikUkladuSld {
  /** Geometrie obiektow (sortowane po obiektId) */
  readonly obiekty: readonly GeometriaObiektu[];
  /** Trasy polaczen (sortowane po polaczenieId) */
  readonly trasy: readonly TrasaPolaczenia[];
  /** Calkowity obrys schematu */
  readonly obrysCalkowity: Prostokat;
  /** Hash deterministyczny (SHA-256) */
  readonly hash: string;
}

// =============================================================================
// § 15. ETYKIETY POLSKIE (KANONICZNE)
// =============================================================================

export const ETYKIETY_TYPY_OBIEKTOW: Record<TypObiektuSld, string> = {
  GPZ: 'GPZ',
  STACJA_PRZELOTOWA: 'Stacja przelotowa',
  STACJA_ODGALEZIENIOWA: 'Stacja odgalezieniowa',
  STACJA_KONCOWA: 'Stacja koncowa',
  STACJA_SEKCYJNA: 'Stacja sekcyjna',
  ROZDZIELNIA_SIECIOWA: 'Rozdzielnia sieciowa',
  PUNKT_NOP: 'Punkt NOP',
  OBIEKT_GENERACJA: 'Obiekt z generacja',
};

export const ETYKIETY_TYPY_POL: Record<TypPola, string> = {
  LINIOWE_WEJSCIOWE: 'Pole liniowe wejsciowe',
  LINIOWE_WYJSCIOWE: 'Pole liniowe wyjsciowe',
  ODGALEZIENIOWE: 'Pole odgalezieniowe',
  TRANSFORMATOROWE: 'Pole transformatorowe',
  ZRODLO_PV: 'Pole zrodla PV',
  ZRODLO_BESS: 'Pole zrodla BESS',
  SPRZEGLO: 'Pole sprzegla',
  POMIAROWE: 'Pole pomiarowe',
};

export const ETYKIETY_APARATY: Record<TypAparatu, string> = {
  WYLACZNIK: 'Wylacznik',
  ODLACZNIK: 'Odlacznik',
  UZIEMNIK: 'Uziemnik',
  PRZEKLADNIK_PRADOWY: 'Przekladnik pradowy',
  PRZEKLADNIK_NAPIECIOWY: 'Przekladnik napieciowy',
  ZABEZPIECZENIE: 'Zabezpieczenie',
  BEZPIECZNIK: 'Bezpiecznik',
  GLOWICA_KABLOWA: 'Glowica kablowa',
  TRANSFORMATOR: 'Transformator',
  GENERATOR_PV: 'Generator PV',
  GENERATOR_BESS: 'Magazyn energii BESS',
  FALOWNIK: 'Falownik',
};
