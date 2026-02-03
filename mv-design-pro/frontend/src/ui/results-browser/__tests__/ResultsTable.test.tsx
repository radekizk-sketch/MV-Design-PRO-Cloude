/**
 * FIX-03 — Results Table Component Tests
 *
 * Tests for the generic results table component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsTable, RowCountFooter } from '../ResultsTable';
import type { ColumnDef, SortConfig } from '../types';

// Mock data
interface TestRow {
  id: string;
  name: string;
  value: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
}

const testColumns: ColumnDef<TestRow>[] = [
  { key: 'name', header: 'Nazwa', type: 'string', sortable: true },
  { key: 'value', header: 'Wartość', type: 'number', decimals: 2, align: 'right', sortable: true },
  { key: 'status', header: 'Status', type: 'status', align: 'center', sortable: true },
];

const testData: TestRow[] = [
  { id: '1', name: 'Element A', value: 10.5, status: 'PASS' },
  { id: '2', name: 'Element B', value: 20.3, status: 'WARNING' },
  { id: '3', name: 'Element C', value: 5.1, status: 'FAIL' },
];

describe('ResultsTable', () => {
  it('renders table with correct headers', () => {
    const onSort = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );

    expect(screen.getByText('Nazwa')).toBeInTheDocument();
    expect(screen.getByText('Wartość')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    const onSort = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );

    expect(screen.getByText('Element A')).toBeInTheDocument();
    expect(screen.getByText('Element B')).toBeInTheDocument();
    expect(screen.getByText('Element C')).toBeInTheDocument();
  });

  it('formats numbers with correct decimal places', () => {
    const onSort = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );

    // Polish locale uses comma as decimal separator
    expect(screen.getByText('10,50')).toBeInTheDocument();
    expect(screen.getByText('20,30')).toBeInTheDocument();
  });

  it('renders status badges with correct labels', () => {
    const onSort = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );

    expect(screen.getByText('ZGODNY')).toBeInTheDocument();
    expect(screen.getByText('OSTRZEŻENIE')).toBeInTheDocument();
    expect(screen.getByText('NIEZGODNY')).toBeInTheDocument();
  });

  it('calls onSort when clicking sortable column header', () => {
    const onSort = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );

    fireEvent.click(screen.getByText('Nazwa'));

    expect(onSort).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
  });

  it('toggles sort direction when clicking same column', () => {
    const onSort = vi.fn();
    const sortConfig: SortConfig = { key: 'name', direction: 'asc' };

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={sortConfig}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );

    fireEvent.click(screen.getByText('Nazwa'));

    expect(onSort).toHaveBeenCalledWith({ key: 'name', direction: 'desc' });
  });

  it('shows sort indicator on sorted column', () => {
    const onSort = vi.fn();
    const sortConfig: SortConfig = { key: 'name', direction: 'asc' };

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={sortConfig}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );

    expect(screen.getByText('ASC')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    const onSort = vi.fn();
    const emptyMessage = 'Brak danych';

    render(
      <ResultsTable
        data={[]}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
        emptyMessage={emptyMessage}
      />
    );

    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('calls onRowSelect when clicking a row', () => {
    const onSort = vi.fn();
    const onRowSelect = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
        onRowSelect={onRowSelect}
      />
    );

    fireEvent.click(screen.getByText('Element A'));

    expect(onRowSelect).toHaveBeenCalledWith(testData[0]);
  });

  it('shows checkboxes when showCheckboxes is true', () => {
    const onSort = vi.fn();
    const onRowCheckboxChange = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
        showCheckboxes={true}
        onRowCheckboxChange={onRowCheckboxChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(testData.length);
  });

  it('highlights selected rows', () => {
    const onSort = vi.fn();

    render(
      <ResultsTable
        data={testData}
        columns={testColumns}
        sortConfig={null}
        onSort={onSort}
        getRowKey={(row) => row.id}
        selectedRowIds={['1']}
      />
    );

    const row = screen.getByTestId('results-table-row-1');
    expect(row).toHaveClass('bg-blue-50');
  });
});

describe('RowCountFooter', () => {
  it('displays correct row count', () => {
    render(<RowCountFooter shown={5} total={10} />);

    expect(screen.getByText(/Wyświetlono 5 z 10 wierszy/)).toBeInTheDocument();
  });

  it('displays same count when all rows shown', () => {
    render(<RowCountFooter shown={10} total={10} />);

    expect(screen.getByText(/Wyświetlono 10 z 10 wierszy/)).toBeInTheDocument();
  });
});
