/**
 * SldDemonstratorPage.tsx — Demonstrator silnika SLD z sieciami kontrolnymi.
 *
 * ARCHITEKTURA: Warstwa PREZENTACJI — demonstracja silnika SLD.
 * Pokazuje 5 kanonicznych sieci kontrolnych renderowanych przez pipeline 9-etapowy.
 * 100% POLISH UI.
 */

import React, { useState, useMemo } from 'react';
import { uruchomPipelineSld } from './engine/pipelineSld';
import { RendererSld } from './engine/rendererSld';
import {
  siecProstaMagistrala,
  siecZOdgalezieniem,
  siecPierscienZNop,
  siecZGeneracjaOze,
  siecStacjaSekcyjna,
} from './engine/sieciKontrolne';
import { zbudujSiecSld } from './engine/adapterSemantyczny';
import type { DaneWejsciowe } from './engine/adapterSemantyczny';
import type { WynikUkladuSld, SiecSld } from './engine/sldContracts';

// =============================================================================
// § 1. DEFINICJE SIECI KONTROLNYCH
// =============================================================================

interface SiecKontrolna {
  readonly id: string;
  readonly nazwa: string;
  readonly opis: string;
  readonly fabryka: () => DaneWejsciowe;
}

const SIECI_KONTROLNE: readonly SiecKontrolna[] = [
  {
    id: 'magistrala',
    nazwa: 'Prosta magistrala',
    opis: 'GPZ → 3 stacje przelotowe → stacja koncowa (15 kV, kabel YAKXs)',
    fabryka: siecProstaMagistrala,
  },
  {
    id: 'odgalezienie',
    nazwa: 'Stacja z odgalezieniem',
    opis: 'Magistrala z odgalezieniem bocznym do stacji odgalezieniowej',
    fabryka: siecZOdgalezieniem,
  },
  {
    id: 'pierscien',
    nazwa: 'Pierscien z NOP',
    opis: '2 tory zasilania z punktem normalnie otwartym (NOP)',
    fabryka: siecPierscienZNop,
  },
  {
    id: 'oze',
    nazwa: 'Stacja z generacja OZE',
    opis: 'Stacja z farma PV (2 MW) i magazynem BESS (1 MW / 2 MWh)',
    fabryka: siecZGeneracjaOze,
  },
  {
    id: 'sekcyjna',
    nazwa: 'Stacja sekcyjna',
    opis: 'GPZ dwutorowy → stacja sekcyjna (2 sekcje szyn, sprzeglo) → 2 stacje koncowe',
    fabryka: siecStacjaSekcyjna,
  },
];

// =============================================================================
// § 2. PANEL INFORMACYJNY
// =============================================================================

interface InfoPanelProps {
  readonly wynik: WynikUkladuSld;
  readonly siec: SiecSld;
  readonly dane: DaneWejsciowe;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ wynik, siec, dane }) => {
  const liczbaPol = siec.obiekty.reduce((sum, ob) => sum + ob.pola.length, 0);
  const liczbaPortow = wynik.obiekty.reduce((sum, g) => sum + g.porty.length, 0);
  const liczbaAparaturow = siec.obiekty.reduce(
    (sum, ob) => sum + ob.pola.reduce((s, p) => s + p.aparatura.length, 0),
    0,
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '8px',
      padding: '12px',
      background: '#F8FAFC',
      borderRadius: '6px',
      border: '1px solid #E2E8F0',
      fontSize: '12px',
    }}>
      <StatBox etykieta="Obiekty (stacje)" wartosc={dane.obiekty.length} />
      <StatBox etykieta="Polaczenia" wartosc={dane.polaczenia.length} />
      <StatBox etykieta="Pola efektywne" wartosc={liczbaPol} />
      <StatBox etykieta="Aparatura" wartosc={liczbaAparaturow} />
      <StatBox etykieta="Porty" wartosc={liczbaPortow} />
      <StatBox etykieta="Trasy" wartosc={wynik.trasy.length} />
      <StatBox etykieta="Obrys [px]" wartosc={`${wynik.obrysCalkowity.szerokosc}x${wynik.obrysCalkowity.wysokosc}`} />
      <StatBox etykieta="Hash" wartosc={wynik.hash} mono />
    </div>
  );
};

const StatBox: React.FC<{
  etykieta: string;
  wartosc: string | number;
  mono?: boolean;
}> = ({ etykieta, wartosc, mono }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ color: '#64748B', fontSize: '10px', marginBottom: '2px' }}>{etykieta}</div>
    <div style={{
      fontWeight: 700,
      fontSize: mono ? '11px' : '16px',
      color: '#1E293B',
      fontFamily: mono ? 'monospace' : 'inherit',
    }}>
      {wartosc}
    </div>
  </div>
);

// =============================================================================
// § 3. TABELA OBIEKTOW
// =============================================================================

interface TabelaObiektowProps {
  readonly siec: SiecSld;
  readonly wynik: WynikUkladuSld;
}

const TabelaObiektow: React.FC<TabelaObiektowProps> = ({ siec, wynik }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '11px',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <thead>
        <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
          <th style={thStyle}>ID</th>
          <th style={thStyle}>Nazwa</th>
          <th style={thStyle}>Typ</th>
          <th style={thStyle}>kV</th>
          <th style={thStyle}>Pola</th>
          <th style={thStyle}>Porty</th>
          <th style={thStyle}>Pozycja</th>
          <th style={thStyle}>Szyna [px]</th>
        </tr>
      </thead>
      <tbody>
        {siec.obiekty.map((ob) => {
          const geom = wynik.obiekty.find((g) => g.obiektId === ob.id);
          return (
            <tr key={ob.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={tdStyle}><code>{ob.id}</code></td>
              <td style={tdStyle}>{ob.nazwa}</td>
              <td style={tdStyle}><span style={tagStyle(ob.typ)}>{ob.typ}</span></td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{ob.napiecieKv}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{ob.pola.length}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{geom?.porty.length ?? 0}</td>
              <td style={tdStyle}><code>{ob.pozycjaBazowa ? `${ob.pozycjaBazowa.x}, ${ob.pozycjaBazowa.y}` : 'auto'}</code></td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{geom?.szyna.szerokosc ?? '-'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  color: '#334155',
};

function tagStyle(typ: string): React.CSSProperties {
  const colors: Record<string, string> = {
    GPZ: '#DC2626',
    STACJA_PRZELOTOWA: '#2563EB',
    STACJA_KONCOWA: '#059669',
    STACJA_ODGALEZIENIOWA: '#D97706',
    STACJA_SEKCYJNA: '#7C3AED',
    OBIEKT_GENERACJA: '#0891B2',
    PUNKT_NOP: '#6B7280',
    ROZDZIELNIA_SIECIOWA: '#4338CA',
  };
  const color = colors[typ] ?? '#6B7280';
  return {
    background: `${color}18`,
    color,
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
  };
}

// =============================================================================
// § 4. TABELA POLACZEN
// =============================================================================

interface TabelaPolaczenProps {
  readonly siec: SiecSld;
  readonly wynik: WynikUkladuSld;
}

const TabelaPolaczen: React.FC<TabelaPolaczenProps> = ({ siec, wynik }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '11px',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <thead>
        <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
          <th style={thStyle}>ID</th>
          <th style={thStyle}>Od → Do</th>
          <th style={thStyle}>Typ</th>
          <th style={thStyle}>Linia</th>
          <th style={thStyle}>km</th>
          <th style={thStyle}>NOP</th>
          <th style={thStyle}>Trasa</th>
        </tr>
      </thead>
      <tbody>
        {siec.polaczenia.map((pol) => {
          const trasa = wynik.trasy.find((t) => t.polaczenieId === pol.id);
          return (
            <tr key={pol.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={tdStyle}><code>{pol.id}</code></td>
              <td style={tdStyle}>{pol.odId} → {pol.doId}</td>
              <td style={tdStyle}><span style={tagStyle(pol.typ)}>{pol.typ}</span></td>
              <td style={tdStyle}>{pol.typLinii}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{pol.dlugoscKm ?? '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{pol.normalnieOtwarty ? 'TAK' : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {trasa ? `${trasa.punkty.length} pkt` : <span style={{ color: '#EF4444' }}>brak</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// =============================================================================
// § 5. WIDOK SIECI KONTROLNEJ
// =============================================================================

interface WidokSieciProps {
  readonly definicja: SiecKontrolna;
}

const WidokSieci: React.FC<WidokSieciProps> = ({ definicja }) => {
  const { dane, siec, wynik, nazwy } = useMemo(() => {
    const d = definicja.fabryka();
    const s = zbudujSiecSld(d);
    const w = uruchomPipelineSld(d);
    const n = new Map(d.obiekty.map((ob) => [ob.id, ob.nazwa]));
    return { dane: d, siec: s, wynik: w, nazwy: n };
  }, [definicja]);

  const [zakladka, setZakladka] = useState<'schemat' | 'obiekty' | 'polaczenia'>('schemat');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Informacje statystyczne */}
      <InfoPanel wynik={wynik} siec={siec} dane={dane} />

      {/* Zakladki */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #E2E8F0' }}>
        {(['schemat', 'obiekty', 'polaczenia'] as const).map((z) => (
          <button
            key={z}
            onClick={() => setZakladka(z)}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: zakladka === z ? 700 : 400,
              color: zakladka === z ? '#1D4ED8' : '#64748B',
              background: zakladka === z ? '#EFF6FF' : 'transparent',
              border: 'none',
              borderBottom: zakladka === z ? '2px solid #1D4ED8' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            {z === 'schemat' ? 'Schemat SLD' : z === 'obiekty' ? 'Obiekty' : 'Polaczenia'}
          </button>
        ))}
      </div>

      {/* Zawartosc zakladki */}
      {zakladka === 'schemat' && (
        <div style={{
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          overflow: 'hidden',
          background: '#FFFFFF',
          minHeight: '400px',
        }}>
          <RendererSld wynik={wynik} nazwy={nazwy} wysokosc={500} />
        </div>
      )}
      {zakladka === 'obiekty' && <TabelaObiektow siec={siec} wynik={wynik} />}
      {zakladka === 'polaczenia' && <TabelaPolaczen siec={siec} wynik={wynik} />}
    </div>
  );
};

// =============================================================================
// § 6. GLOWNA STRONA DEMONSTRATORA
// =============================================================================

export const SldDemonstratorPage: React.FC = () => {
  const [aktywna, setAktywna] = useState(SIECI_KONTROLNE[0].id);
  const definicja = SIECI_KONTROLNE.find((s) => s.id === aktywna) ?? SIECI_KONTROLNE[0];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#1E293B',
    }}>
      {/* Naglowek */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FAFBFC',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
          Silnik SLD — Demonstrator sieci kontrolnych
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
          Kanoniczny 9-etapowy pipeline: adapter → pola efektywne → sortowanie → geometria → trasowanie → render SVG
        </p>
      </div>

      {/* Layout: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — lista sieci */}
        <div style={{
          width: '260px',
          borderRight: '1px solid #E2E8F0',
          overflow: 'auto',
          background: '#FAFBFC',
          padding: '8px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sieci kontrolne
          </div>
          {SIECI_KONTROLNE.map((siec) => (
            <button
              key={siec.id}
              onClick={() => setAktywna(siec.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                margin: '2px 0',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: aktywna === siec.id ? '#EFF6FF' : 'transparent',
                color: aktywna === siec.id ? '#1D4ED8' : '#334155',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px' }}>{siec.nazwa}</div>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', lineHeight: 1.3 }}>
                {siec.opis}
              </div>
            </button>
          ))}

          {/* Legenda */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#F1F5F9',
            borderRadius: '6px',
            fontSize: '10px',
            color: '#475569',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Pipeline SLD</div>
            <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.8 }}>
              <li>Adapter semantyczny</li>
              <li>Pola efektywne</li>
              <li>Sortowanie antykrzyzowaniowe</li>
              <li>Geometria szyny</li>
              <li>Rozmieszczenie pol</li>
              <li>Sekwencyjna aparatura</li>
              <li>Porty (first-class)</li>
              <li>Trasowanie Manhattan</li>
              <li>Render SVG</li>
            </ol>
          </div>
        </div>

        {/* Content — aktywna siec */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700 }}>
            {definicja.nazwa}
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748B' }}>
            {definicja.opis}
          </p>
          <WidokSieci key={definicja.id} definicja={definicja} />
        </div>
      </div>
    </div>
  );
};
