/**
 * FIX-03 — Results Filters Component Tests
 *
 * Tests for the filter controls component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsFilters, ViolationQuickFilters } from '../ResultsFilters';
import type { FilterState } from '../types';

describe('ResultsFilters', () => {
  it('renders search input', () => {
    const onChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="bus_voltages"
      />
    );

    expect(screen.getByPlaceholderText('Szukaj...')).toBeInTheDocument();
  });

  it('calls onChange when search input changes', () => {
    const onChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="bus_voltages"
      />
    );

    const searchInput = screen.getByPlaceholderText('Szukaj...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(onChange).toHaveBeenCalledWith({ searchQuery: 'test' });
  });

  it('shows status dropdown for bus_voltages view', () => {
    const onChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="bus_voltages"
      />
    );

    expect(screen.getByLabelText('Filtr statusu')).toBeInTheDocument();
  });

  it('shows severity dropdown for violations view', () => {
    const onChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="violations"
      />
    );

    expect(screen.getByLabelText('Filtr statusu')).toBeInTheDocument();
    // Should have severity options
    expect(screen.getByText('Istotny problem')).toBeInTheDocument();
  });

  it('shows clear filters button when filters are active', () => {
    const onChange = vi.fn();
    const filters: FilterState = { searchQuery: 'test' };

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="bus_voltages"
      />
    );

    expect(screen.getByText('Wyczyść filtry')).toBeInTheDocument();
  });

  it('hides clear filters button when no filters are active', () => {
    const onChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="bus_voltages"
      />
    );

    expect(screen.queryByText('Wyczyść filtry')).not.toBeInTheDocument();
  });

  it('clears filters when clear button is clicked', () => {
    const onChange = vi.fn();
    const filters: FilterState = { searchQuery: 'test', statusFilter: 'PASS' };

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="bus_voltages"
      />
    );

    fireEvent.click(screen.getByText('Wyczyść filtry'));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it('shows value range inputs for bus_voltages view', () => {
    const onChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="bus_voltages"
      />
    );

    expect(screen.getByPlaceholderText('Wartość min.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Wartość max.')).toBeInTheDocument();
  });

  it('does not show value range for violations view', () => {
    const onChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResultsFilters
        filters={filters}
        onChange={onChange}
        viewMode="violations"
      />
    );

    expect(screen.queryByPlaceholderText('Wartość min.')).not.toBeInTheDocument();
  });
});

describe('ViolationQuickFilters', () => {
  it('renders all severity filter buttons', () => {
    const onChange = vi.fn();
    const counts = { high: 2, warn: 3, info: 5 };

    render(
      <ViolationQuickFilters
        currentFilter={undefined}
        onChange={onChange}
        counts={counts}
      />
    );

    expect(screen.getByText('Wszystkie')).toBeInTheDocument();
    expect(screen.getByText('Istotny problem')).toBeInTheDocument();
    expect(screen.getByText('Ostrzeżenie')).toBeInTheDocument();
    expect(screen.getByText('Informacja')).toBeInTheDocument();
  });

  it('shows counts on filter buttons', () => {
    const onChange = vi.fn();
    const counts = { high: 2, warn: 3, info: 5 };

    render(
      <ViolationQuickFilters
        currentFilter={undefined}
        onChange={onChange}
        counts={counts}
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument(); // total
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('highlights active filter', () => {
    const onChange = vi.fn();
    const counts = { high: 2, warn: 3, info: 5 };

    render(
      <ViolationQuickFilters
        currentFilter="HIGH"
        onChange={onChange}
        counts={counts}
      />
    );

    const highButton = screen.getByText('Istotny problem').closest('button');
    expect(highButton).toHaveClass('border-blue-500');
  });

  it('calls onChange when filter button is clicked', () => {
    const onChange = vi.fn();
    const counts = { high: 2, warn: 3, info: 5 };

    render(
      <ViolationQuickFilters
        currentFilter={undefined}
        onChange={onChange}
        counts={counts}
      />
    );

    fireEvent.click(screen.getByText('Istotny problem'));

    expect(onChange).toHaveBeenCalledWith('HIGH');
  });

  it('clears filter when clicking active filter', () => {
    const onChange = vi.fn();
    const counts = { high: 2, warn: 3, info: 5 };

    render(
      <ViolationQuickFilters
        currentFilter={undefined}
        onChange={onChange}
        counts={counts}
      />
    );

    fireEvent.click(screen.getByText('Wszystkie'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
