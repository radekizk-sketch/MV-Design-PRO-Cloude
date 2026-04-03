import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CatalogBrowser } from '../CatalogBrowser';

const fetchTypesByCategoryMock = vi.fn();

vi.mock('../../catalog', () => ({
  fetchTypesByCategory: (...args: unknown[]) => fetchTypesByCategoryMock(...args),
}));

describe('CatalogBrowser', () => {
  beforeEach(() => {
    fetchTypesByCategoryMock.mockReset();
  });

  it('pobiera liste typow z API dla wspieranej przestrzeni', async () => {
    fetchTypesByCategoryMock.mockResolvedValue([
      {
        id: 'cable-1',
        name: 'Kabel SN 3x120',
        manufacturer: 'Tele-Fonika',
        r_ohm_per_km: 0.21,
        x_ohm_per_km: 0.09,
        rated_current_a: 240,
      },
    ]);

    render(<CatalogBrowser />);

    await waitFor(() => {
      expect(fetchTypesByCategoryMock).toHaveBeenCalledWith('CABLE');
    });

    expect(await screen.findByText('Kabel SN 3x120')).toBeInTheDocument();
    expect(screen.getByText('Tele-Fonika')).toBeInTheDocument();
  });

  it('pobiera katalog dla przekladnikow pradowych zamiast blokowac namespace', async () => {
    fetchTypesByCategoryMock.mockResolvedValue([
      {
        id: 'ct-1',
        name: 'CT 400/5 A kl. 5P20',
        manufacturer: 'ABB',
        ratio_primary_a: 400,
        ratio_secondary_a: 5,
        accuracy_class: '5P20',
      },
    ]);

    render(<CatalogBrowser />);

    fireEvent.click(screen.getByRole('button', { name: /typy przekładników prądowych/i }));

    await waitFor(() => {
      expect(fetchTypesByCategoryMock).toHaveBeenLastCalledWith('CT');
    });

    expect(await screen.findByText('CT 400/5 A kl. 5P20')).toBeInTheDocument();
    expect(screen.getByText('ABB')).toBeInTheDocument();
  });

  it('pokazuje komunikat z klienta API przy braku polaczenia', async () => {
    fetchTypesByCategoryMock.mockRejectedValue(
      new Error('Nie mozna polaczyc sie z API katalogow. Uruchom backend i odswiez widok.'),
    );

    render(<CatalogBrowser />);

    expect(
      await screen.findByText(/nie mozna polaczyc sie z api katalogow/i),
    ).toBeInTheDocument();
  });
});
