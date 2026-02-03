/**
 * UI-04: TCC Interpretation Panel Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TccInterpretationPanel } from '../TccInterpretationPanel';
import type { SelectivityCheck, ProtectionDevice } from '../types';

const mockDevices: ProtectionDevice[] = [
  {
    id: 'device-1',
    name: 'Przekaźnik Q1',
    device_type: 'RELAY',
    location_element_id: 'bus-1',
    settings: {
      stage_51: {
        enabled: true,
        pickup_current_a: 400,
        directional: false,
      },
    },
  },
  {
    id: 'device-2',
    name: 'Bezpiecznik F2',
    device_type: 'FUSE',
    location_element_id: 'bus-2',
    settings: {
      stage_51: {
        enabled: true,
        pickup_current_a: 100,
        directional: false,
      },
    },
  },
];

describe('TccInterpretationPanel', () => {
  describe('when no selectivity checks', () => {
    it('renders empty state with no conflicts message', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={[]}
          devices={mockDevices}
        />
      );

      expect(screen.getByText('Brak konfliktów')).toBeInTheDocument();
    });
  });

  describe('when all checks pass', () => {
    const passingChecks: SelectivityCheck[] = [
      {
        upstream_device_id: 'device-1',
        downstream_device_id: 'device-2',
        analysis_current_a: 1000,
        t_upstream_s: 0.5,
        t_downstream_s: 0.2,
        margin_s: 0.3,
        required_margin_s: 0.2,
        verdict: 'PASS',
        verdict_pl: 'Zgodne',
        notes_pl: 'Margines czasowy wystarczający',
      },
    ];

    it('shows no conflicts message for passing checks', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={passingChecks}
          devices={mockDevices}
        />
      );

      expect(screen.getByText('Brak konfliktów')).toBeInTheDocument();
    });
  });

  describe('when conflicts exist', () => {
    const conflictingChecks: SelectivityCheck[] = [
      {
        upstream_device_id: 'device-1',
        downstream_device_id: 'device-2',
        analysis_current_a: 1500,
        t_upstream_s: 0.15,
        t_downstream_s: 0.12,
        margin_s: 0.03,
        required_margin_s: 0.2,
        verdict: 'FAIL',
        verdict_pl: 'Wymaga korekty',
        notes_pl: 'Brak selektywności',
      },
    ];

    it('renders conflict count', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={conflictingChecks}
          devices={mockDevices}
        />
      );

      expect(screen.getByText('1 konflikt')).toBeInTheDocument();
    });

    it('shows device names in conflict item', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={conflictingChecks}
          devices={mockDevices}
        />
      );

      expect(screen.getByText('Bezpiecznik F2')).toBeInTheDocument();
      expect(screen.getByText('Przekaźnik Q1')).toBeInTheDocument();
    });

    it('shows recommendation for FAIL verdict', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={conflictingChecks}
          devices={mockDevices}
        />
      );

      expect(screen.getByText(/Zalecenie:/)).toBeInTheDocument();
    });
  });

  describe('collapsibility', () => {
    const checks: SelectivityCheck[] = [
      {
        upstream_device_id: 'device-1',
        downstream_device_id: 'device-2',
        analysis_current_a: 1500,
        t_upstream_s: 0.2,
        t_downstream_s: 0.1,
        margin_s: 0.1,
        required_margin_s: 0.15,
        verdict: 'MARGINAL',
        verdict_pl: 'Na granicy',
        notes_pl: 'Mały margines',
      },
    ];

    it('is expanded by default', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={checks}
          devices={mockDevices}
        />
      );

      expect(screen.getByTestId('conflict-item-0')).toBeInTheDocument();
    });

    it('can be collapsed', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={checks}
          devices={mockDevices}
        />
      );

      const toggleButton = screen.getByRole('button', { expanded: true });
      fireEvent.click(toggleButton);

      expect(screen.queryByTestId('conflict-item-0')).not.toBeInTheDocument();
    });

    it('respects defaultCollapsed prop', () => {
      render(
        <TccInterpretationPanel
          selectivityChecks={checks}
          devices={mockDevices}
          defaultCollapsed={true}
        />
      );

      expect(screen.queryByTestId('conflict-item-0')).not.toBeInTheDocument();
    });
  });
});
