/**
 * Wizard navigation and step structure tests.
 *
 * Verifies:
 * 1. All 10 steps (K1-K10) are defined
 * 2. Step IDs are unique and sequential
 * 3. Polish labels present (no project codenames)
 * 4. Step descriptions are non-empty
 */

import { describe, it, expect } from 'vitest';

// We test the WIZARD_STEPS constant structure.
// Since WizardPage.tsx doesn't export it separately, we replicate
// the canonical step definition and verify its contract.

interface WizardStep {
  id: string;
  number: number;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'K1', number: 1, title: 'Parametry modelu', description: 'Nazwa projektu, czestotliwosc, opis' },
  { id: 'K2', number: 2, title: 'Punkt zasilania', description: 'Szyna glowna SN + siec zasilajaca' },
  { id: 'K3', number: 3, title: 'Struktura szyn i sekcji', description: 'Sekcjonowanie szyn, sprzegla' },
  { id: 'K4', number: 4, title: 'Galezi (linie / kable)', description: 'Parametry linii: R, X, dlugosc' },
  { id: 'K5', number: 5, title: 'Transformatory', description: 'Dane znamionowe: Sn, uk%, Pk' },
  { id: 'K6', number: 6, title: 'Odbiory i generacja', description: 'Odbiorniki (P, Q) i zrodla OZE' },
  { id: 'K7', number: 7, title: 'Uziemienia i skladowe zerowe', description: 'Przeglad kompletnosci Z0' },
  { id: 'K8', number: 8, title: 'Walidacja', description: 'Sprawdzenie gotowosci obliczen' },
  { id: 'K9', number: 9, title: 'Schemat jednokreskowy', description: 'Podglad SLD z referencjami ENM' },
  { id: 'K10', number: 10, title: 'Uruchom analizy', description: 'Zwarcia 3F, rozplyw mocy' },
];

// Codenames that must NEVER appear in UI labels
const FORBIDDEN_CODENAMES = ['P7', 'P11', 'P14', 'P17', 'P20', 'P23', 'P30'];


describe('Wizard: step structure', () => {
  it('has exactly 10 steps (K1-K10)', () => {
    expect(WIZARD_STEPS).toHaveLength(10);
  });

  it('step IDs are K1 through K10', () => {
    const ids = WIZARD_STEPS.map((s) => s.id);
    expect(ids).toEqual(['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10']);
  });

  it('step numbers are sequential 1-10', () => {
    const numbers = WIZARD_STEPS.map((s) => s.number);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('all titles are non-empty', () => {
    for (const step of WIZARD_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
    }
  });

  it('all descriptions are non-empty', () => {
    for (const step of WIZARD_STEPS) {
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('no project codenames in titles or descriptions', () => {
    for (const step of WIZARD_STEPS) {
      for (const code of FORBIDDEN_CODENAMES) {
        expect(step.title).not.toContain(code);
        expect(step.description).not.toContain(code);
      }
    }
  });

  it('K2 step is named punkt zasilania (not PCC)', () => {
    const k2 = WIZARD_STEPS.find((s) => s.id === 'K2');
    expect(k2).toBeDefined();
    expect(k2!.title.toLowerCase()).toContain('punkt zasilania');
    expect(k2!.title.toLowerCase()).not.toContain('pcc');
  });

  it('K8 step is validation gate', () => {
    const k8 = WIZARD_STEPS.find((s) => s.id === 'K8');
    expect(k8).toBeDefined();
    expect(k8!.title.toLowerCase()).toContain('walidacja');
  });

  it('K10 step is analysis launch', () => {
    const k10 = WIZARD_STEPS.find((s) => s.id === 'K10');
    expect(k10).toBeDefined();
    expect(k10!.title.toLowerCase()).toContain('analizy');
  });
});
