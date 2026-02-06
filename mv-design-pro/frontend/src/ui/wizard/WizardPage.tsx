/**
 * WizardPage — Kreator budowy sieci SN/nN
 *
 * Kreator krok po kroku (K1-K10) prowadzący użytkownika
 * przez proces budowy kompletnej sieci średniego napięcia.
 *
 * Kroki:
 * K1 — Parametry modelu (napięcie, częstotliwość, c_max/c_min)
 * K2 — Punkt zasilania (szyna główna + źródło)
 * K3 — Struktura szyn i sekcji
 * K4 — Gałęzie (linie/kable)
 * K5 — Transformatory
 * K6 — Odbiory i generacja OZE
 * K7 — Uziemienia i składowe zerowe
 * K8 — Walidacja "Gotowość obliczeń"
 * K9 — SLD CAD (auto-layout)
 * K10 — Uruchom analizy
 *
 * BINDING: Etykiety po polsku, brak kodów projektowych.
 */

import { useState, useCallback } from 'react';

/** Wizard step definition */
interface WizardStep {
  id: string;
  number: number;
  title: string;
  description: string;
  isComplete: boolean;
  isBlocked: boolean;
  blockReason?: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'K1',
    number: 1,
    title: 'Parametry modelu',
    description: 'Nazwa projektu, poziomy napięć SN/nN, częstotliwość, współczynniki c',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K2',
    number: 2,
    title: 'Punkt zasilania',
    description: 'Szyna główna SN + sieć zasilająca (Thevenin / moc zwarciowa)',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K3',
    number: 3,
    title: 'Struktura szyn i sekcji',
    description: 'Sekcjonowanie szyn, sprzęgła, pola odpływowe',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K4',
    number: 4,
    title: 'Gałęzie (linie / kable)',
    description: 'Parametry linii: R, X, B, długość, przekrój, impedancja Z0',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K5',
    number: 5,
    title: 'Transformatory',
    description: 'Dane znamionowe: Sn, uk%, Pk, grupa połączeń, impedancja Z0',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K6',
    number: 6,
    title: 'Odbiory i generacja',
    description: 'Odbiorniki (P, Q, cosφ) i źródła OZE (PV, wiatr, BESS)',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K7',
    number: 7,
    title: 'Uziemienia i składowe zerowe',
    description: 'Punkt neutralny transformatora: izolowany / dławik / bezpośredni / rezystor',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K8',
    number: 8,
    title: 'Walidacja',
    description: 'Sprawdzenie gotowości obliczeń — lista braków z priorytetami',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K9',
    number: 9,
    title: 'Schemat jednokreskowy',
    description: 'Auto-layout SLD, inspektor właściwości, etykiety elementów',
    isComplete: false,
    isBlocked: false,
  },
  {
    id: 'K10',
    number: 10,
    title: 'Uruchom analizy',
    description: 'Zwarcia 3F/1F/2F/2F-Z, rozpływ mocy, dobór nastaw I>/I>>',
    isComplete: false,
    isBlocked: false,
  },
];

/** Analysis type for K10 */
interface AnalysisOption {
  id: string;
  label: string;
  description: string;
  available: boolean;
}

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    id: 'sc-3f',
    label: 'Zwarcie trójfazowe (3F)',
    description: 'IEC 60909 — prąd początkowy Ik\'\', udarowy Ip, cieplny Ith',
    available: true,
  },
  {
    id: 'sc-1f',
    label: 'Zwarcie jednofazowe (1F)',
    description: 'IEC 60909 — składowe Z1+Z2+Z0 szeregowo',
    available: true,
  },
  {
    id: 'sc-2f',
    label: 'Zwarcie dwufazowe (2F)',
    description: 'IEC 60909 — składowe Z1+Z2',
    available: true,
  },
  {
    id: 'sc-2fz',
    label: 'Zwarcie dwufazowe z ziemią (2F-Z)',
    description: 'IEC 60909 — Z1 + Z2||Z0',
    available: true,
  },
  {
    id: 'loadflow',
    label: 'Rozpływ mocy',
    description: 'Newton-Raphson — napięcia węzłowe, przepływy mocy, straty',
    available: true,
  },
  {
    id: 'protection',
    label: 'Dobór nastaw I>/I>>',
    description: 'Metoda Hoppla — selektywność, wytrzymałość cieplna, SPZ',
    available: true,
  },
];

function StepIndicator({ step, isActive, onClick }: {
  step: WizardStep;
  isActive: boolean;
  onClick: () => void;
}) {
  const bgColor = step.isComplete
    ? '#22c55e'
    : isActive
    ? '#3b82f6'
    : step.isBlocked
    ? '#ef4444'
    : '#6b7280';

  return (
    <button
      onClick={onClick}
      disabled={step.isBlocked}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        borderRadius: '8px',
        background: isActive ? '#eff6ff' : '#fff',
        cursor: step.isBlocked ? 'not-allowed' : 'pointer',
        width: '100%',
        textAlign: 'left',
        opacity: step.isBlocked ? 0.5 : 1,
      }}
      title={step.isBlocked ? step.blockReason : step.description}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: bgColor,
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {step.isComplete ? '\u2713' : step.number}
      </span>
      <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400 }}>
        {step.title}
      </span>
    </button>
  );
}

export function WizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps] = useState<WizardStep[]>(WIZARD_STEPS);
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());

  const activeStep = steps[currentStep];

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
  }, [steps.length]);

  const toggleAnalysis = useCallback((id: string) => {
    setSelectedAnalyses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div
      data-testid="wizard-page"
      style={{
        display: 'flex',
        height: '100%',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Left sidebar — step list */}
      <div
        style={{
          width: '260px',
          borderRight: '1px solid #e5e7eb',
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>
          Kreator sieci
        </h3>
        {steps.map((step, idx) => (
          <StepIndicator
            key={step.id}
            step={step}
            isActive={idx === currentStep}
            onClick={() => setCurrentStep(idx)}
          />
        ))}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: '720px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>
              {activeStep.id}: {activeStep.title}
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              {activeStep.description}
            </p>
          </div>

          {/* K10: Analysis selection */}
          {activeStep.id === 'K10' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ANALYSIS_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: opt.available ? 'pointer' : 'not-allowed',
                    opacity: opt.available ? 1 : 0.5,
                    backgroundColor: selectedAnalyses.has(opt.id) ? '#eff6ff' : '#fff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedAnalyses.has(opt.id)}
                    onChange={() => toggleAnalysis(opt.id)}
                    disabled={!opt.available}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {opt.description}
                    </div>
                  </div>
                </label>
              ))}
              {selectedAnalyses.size > 0 && (
                <button
                  style={{
                    marginTop: '16px',
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Uruchom wybrane analizy ({selectedAnalyses.size})
                </button>
              )}
            </div>
          )}

          {/* Placeholder for other steps */}
          {activeStep.id !== 'K10' && (
            <div
              style={{
                padding: '32px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '14px',
              }}
            >
              Formularz kroku {activeStep.id} — {activeStep.title}
              <br />
              <span style={{ fontSize: '12px' }}>
                Edycja danych sieci z auto-zapisem (PUT /api/cases/&#123;cid&#125;/network)
              </span>
            </div>
          )}

          {/* Navigation buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '24px',
              gap: '12px',
            }}
          >
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              style={{
                padding: '8px 20px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#fff',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                opacity: currentStep === 0 ? 0.5 : 1,
                fontSize: '14px',
              }}
            >
              Wstecz
            </button>
            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '6px',
                background: currentStep === steps.length - 1 ? '#9ca3af' : '#3b82f6',
                color: '#fff',
                cursor: currentStep === steps.length - 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {currentStep === steps.length - 1 ? 'Zakoncz' : 'Dalej'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
