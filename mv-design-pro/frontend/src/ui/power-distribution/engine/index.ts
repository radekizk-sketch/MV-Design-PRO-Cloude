/**
 * engine/index.ts — Eksporty silnika SLD.
 *
 * ARCHITEKTURA:
 *   Etap 1: adapterSemantyczny (Snapshot → SiecSld)
 *   Etap 2: polaEfektywne (jawne + niejawne)
 *   Etap 3: sortowanieAntykrzyzowaniowe
 *   Etap 4-7: geometriaSzyny (busbar + pola + aparatura + porty)
 *   Etap 8: trasowanieOrtogonalne (Manhattan routing)
 *   Etap 9: rendererSld (SVG)
 *   Pipeline: pipelineSld (orkiestrator)
 */

// Kontrakty
export type {
  Punkt2D,
  Prostokat,
  ObiektSld,
  PoleSld,
  ElementAparatury,
  PolaczenieSld,
  SiecSld,
  PortSld,
  GeometriaSzyny,
  GeometriaPola,
  GeometriaObiektu,
  PunktLamania,
  TrasaPolaczenia,
  WynikUkladuSld,
} from './sldContracts';

export {
  TypObiektuSld,
  TypPola,
  KierunekPola,
  TypAparatu,
  TypPolaczenia,
  RolaPortu,
  ETYKIETY_TYPY_OBIEKTOW,
  ETYKIETY_TYPY_POL,
  ETYKIETY_APARATY,
} from './sldContracts';

// Pipeline
export { uruchomPipelineSld, uruchomPipelineZSieci } from './pipelineSld';
export type { DaneWejsciowe, ObiektWejsciowy, PolaWejsciowe, PolaczenieWejsciowe } from './pipelineSld';

// Renderer
export { RendererSld } from './rendererSld';
export type { RendererSldProps } from './rendererSld';

// Sieci kontrolne
export {
  siecProstaMagistrala,
  siecZOdgalezieniem,
  siecPierscienZNop,
  siecZGeneracjaOze,
  siecStacjaSekcyjna,
} from './sieciKontrolne';
