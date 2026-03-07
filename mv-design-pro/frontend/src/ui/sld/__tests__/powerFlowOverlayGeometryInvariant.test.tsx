import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { PowerFlowOverlay } from '../PowerFlowOverlay';

describe('PowerFlowOverlay — kontrakt geometrii SLD', () => {
  it('render overlay nie mutuje geometrii wejściowej (pozycji) elementów', () => {
    const branchFlows = [
      {
        branchId: 'line_1',
        activePower_MW: 1.2,
        reactivePower_Mvar: 0.3,
        current_A: 120,
        loading_pct: 45,
        midpoint: { x: 200, y: 300 },
        direction: { dx: 1, dy: 0 },
      },
    ];

    const nodeVoltages = [
      {
        nodeId: 'bus_1',
        voltage_pu: 0.99,
        voltage_kV: 14.9,
        position: { x: 180, y: 250 },
        violation: false,
      },
    ];

    const before = JSON.stringify({ branchFlows, nodeVoltages });

    render(
      <svg>
        <PowerFlowOverlay branchFlows={branchFlows} nodeVoltages={nodeVoltages} />
      </svg>,
    );

    const after = JSON.stringify({ branchFlows, nodeVoltages });
    expect(after).toBe(before);
  });
});
