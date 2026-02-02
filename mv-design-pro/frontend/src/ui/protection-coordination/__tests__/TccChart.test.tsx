/**
 * FIX-12B — TCC Chart Tests
 *
 * Tests for TCC chart component.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock ResizeObserver for Recharts ResponsiveContainer
beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});
import { TccChart, TccChartFromResult } from '../TccChart';
import type {
  TCCCurve,
  FaultMarker,
  CoordinationResult,
  ProtectionDevice,
} from '../types';
import { LABELS } from '../types';

// =============================================================================
// Mock Data
// =============================================================================

const mockCurves: TCCCurve[] = [
  {
    device_id: 'device-1',
    device_name: 'Zabezpieczenie 1',
    curve_type: 'IEC_SI',
    pickup_current_a: 400,
    time_multiplier: 0.3,
    color: '#2563eb',
    points: [
      { current_a: 400, current_multiple: 1.0, time_s: 100 },
      { current_a: 800, current_multiple: 2.0, time_s: 2.97 },
      { current_a: 1200, current_multiple: 3.0, time_s: 1.32 },
      { current_a: 2000, current_multiple: 5.0, time_s: 0.68 },
      { current_a: 4000, current_multiple: 10.0, time_s: 0.34 },
    ],
  },
  {
    device_id: 'device-2',
    device_name: 'Zabezpieczenie 2',
    curve_type: 'IEC_VI',
    pickup_current_a: 300,
    time_multiplier: 0.2,
    color: '#dc2626',
    points: [
      { current_a: 300, current_multiple: 1.0, time_s: 100 },
      { current_a: 600, current_multiple: 2.0, time_s: 2.7 },
      { current_a: 900, current_multiple: 3.0, time_s: 0.68 },
      { current_a: 1500, current_multiple: 5.0, time_s: 0.21 },
      { current_a: 3000, current_multiple: 10.0, time_s: 0.08 },
    ],
  },
];

const mockFaultMarkers: FaultMarker[] = [
  {
    id: 'fault-1',
    label_pl: 'Ik3max',
    current_a: 5000,
    fault_type: '3F',
    location: 'bus_1',
  },
  {
    id: 'fault-2',
    label_pl: 'Ik3min',
    current_a: 2500,
    fault_type: '3F',
    location: 'bus_1',
  },
];

const mockDevices: ProtectionDevice[] = [
  {
    id: 'device-1',
    name: 'Zabezpieczenie 1',
    device_type: 'RELAY',
    location_element_id: 'bus_1',
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
    name: 'Zabezpieczenie 2',
    device_type: 'RELAY',
    location_element_id: 'bus_2',
    settings: {
      stage_51: {
        enabled: true,
        pickup_current_a: 300,
        directional: false,
      },
    },
  },
];

const mockResult: CoordinationResult = {
  run_id: 'run-123',
  project_id: 'project-1',
  sensitivity_checks: [],
  selectivity_checks: [],
  overload_checks: [],
  tcc_curves: mockCurves,
  fault_markers: mockFaultMarkers,
  overall_verdict: 'PASS',
  summary: {
    total_devices: 2,
    total_checks: 5,
    sensitivity: { pass: 2, marginal: 0, fail: 0, error: 0 },
    selectivity: { pass: 1, marginal: 0, fail: 0, error: 0 },
    overload: { pass: 2, marginal: 0, fail: 0, error: 0 },
    overall_verdict: 'PASS',
    overall_verdict_pl: 'Koordynacja prawidlowa',
  },
  trace_steps: [],
  created_at: '2024-01-01T12:00:00Z',
};

// =============================================================================
// TccChart Tests
// =============================================================================

describe('TccChart', () => {
  it('should render chart container', () => {
    render(
      <TccChart
        curves={mockCurves}
        faultMarkers={mockFaultMarkers}
      />
    );
    expect(screen.getByTestId('tcc-chart')).toBeInTheDocument();
  });

  it('should display chart title in Polish', () => {
    render(
      <TccChart
        curves={mockCurves}
        faultMarkers={mockFaultMarkers}
      />
    );
    expect(screen.getByText(LABELS.tcc.title)).toBeInTheDocument();
  });

  it('should display chart subtitle', () => {
    render(
      <TccChart
        curves={mockCurves}
        faultMarkers={mockFaultMarkers}
      />
    );
    expect(screen.getByText(LABELS.tcc.subtitle)).toBeInTheDocument();
  });

  it('should show empty state when no curves', () => {
    render(
      <TccChart
        curves={[]}
        faultMarkers={[]}
      />
    );
    expect(screen.getByTestId('tcc-chart-empty')).toBeInTheDocument();
    expect(screen.getByText(LABELS.tcc.noData)).toBeInTheDocument();
  });

  it('should render legend with curve names', () => {
    render(
      <TccChart
        curves={mockCurves}
        faultMarkers={mockFaultMarkers}
        devices={mockDevices}
        showLegend={true}
      />
    );
    expect(screen.getByText('Zabezpieczenie 1')).toBeInTheDocument();
    expect(screen.getByText('Zabezpieczenie 2')).toBeInTheDocument();
  });

  it('should display fault markers in legend', () => {
    render(
      <TccChart
        curves={mockCurves}
        faultMarkers={mockFaultMarkers}
      />
    );
    expect(screen.getByText(/Ik3max/)).toBeInTheDocument();
    expect(screen.getByText(/5000/)).toBeInTheDocument();
  });

  it('should call onDeviceClick when legend item clicked', () => {
    const onDeviceClick = vi.fn();
    render(
      <TccChart
        curves={mockCurves}
        faultMarkers={mockFaultMarkers}
        devices={mockDevices}
        onDeviceClick={onDeviceClick}
      />
    );

    fireEvent.click(screen.getByText('Zabezpieczenie 1'));
    expect(onDeviceClick).toHaveBeenCalledWith('device-1');
  });

  it('should highlight selected device', () => {
    render(
      <TccChart
        curves={mockCurves}
        faultMarkers={mockFaultMarkers}
        devices={mockDevices}
        selectedDeviceId="device-1"
      />
    );

    // The selected device button should have ring styling
    const button = screen.getByText('Zabezpieczenie 1').closest('button');
    expect(button).toHaveClass('ring-2');
  });
});

// =============================================================================
// TccChartFromResult Tests
// =============================================================================

describe('TccChartFromResult', () => {
  it('should render chart from result', () => {
    render(
      <TccChartFromResult
        result={mockResult}
        devices={mockDevices}
      />
    );
    expect(screen.getByTestId('tcc-chart')).toBeInTheDocument();
  });

  it('should display all curves from result', () => {
    render(
      <TccChartFromResult
        result={mockResult}
        devices={mockDevices}
      />
    );
    expect(screen.getByText('Zabezpieczenie 1')).toBeInTheDocument();
    expect(screen.getByText('Zabezpieczenie 2')).toBeInTheDocument();
  });

  it('should display fault markers from result', () => {
    render(
      <TccChartFromResult
        result={mockResult}
        devices={mockDevices}
      />
    );
    expect(screen.getByText(/Ik3max/)).toBeInTheDocument();
  });

  it('should pass device click handler', () => {
    const onDeviceClick = vi.fn();
    render(
      <TccChartFromResult
        result={mockResult}
        devices={mockDevices}
        onDeviceClick={onDeviceClick}
      />
    );

    fireEvent.click(screen.getByText('Zabezpieczenie 1'));
    expect(onDeviceClick).toHaveBeenCalledWith('device-1');
  });

  it('should accept custom height', () => {
    render(
      <TccChartFromResult
        result={mockResult}
        devices={mockDevices}
        height={600}
      />
    );
    // Chart should be rendered (height is internal)
    expect(screen.getByTestId('tcc-chart')).toBeInTheDocument();
  });
});
