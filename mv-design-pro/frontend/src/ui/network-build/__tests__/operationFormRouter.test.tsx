import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OperationFormRouter } from '../OperationFormRouter';
import { useNetworkBuildStore } from '../networkBuildStore';

vi.mock('../../app-state', () => ({
  useAppStateStore: (selector: (state: { activeCaseId: string }) => unknown) =>
    selector({ activeCaseId: 'case-1' }),
}));

vi.mock('../../topology/snapshotStore', () => ({
  useSnapshotStore: (selector: (state: { snapshot: null; executeDomainOperation: () => Promise<void> }) => unknown) =>
    selector({
      snapshot: null,
      executeDomainOperation: async () => undefined,
    }),
  selectBusOptions: () => [],
}));

describe('OperationFormRouter', () => {
  beforeEach(() => {
    useNetworkBuildStore.setState({ activeOperationForm: null });
  });

  it('renderuje formularz przypisania katalogu zamiast fallback', () => {
    useNetworkBuildStore.setState({
      activeOperationForm: {
        op: 'assign_catalog_to_element',
        context: { element_ref: 'line-1' },
      },
    });

    render(<OperationFormRouter />);

    expect(screen.getByTestId('assign-catalog-form')).toBeInTheDocument();
    expect(screen.queryByText('Formularz dostępny przez modal kontekstowy')).not.toBeInTheDocument();
  });

  it('renderuje formularz edycji parametrów zamiast fallback', () => {
    useNetworkBuildStore.setState({
      activeOperationForm: {
        op: 'update_element_parameters',
        context: { element_ref: 'sw-1', field: 'state' },
      },
    });

    render(<OperationFormRouter />);

    expect(screen.getByTestId('update-element-parameters-form')).toBeInTheDocument();
    expect(screen.queryByText('Formularz dostępny przez modal kontekstowy')).not.toBeInTheDocument();
  });

  it('renderuje formularz wstawienia słupa rozgałęźnego', () => {
    useNetworkBuildStore.setState({
      activeOperationForm: {
        op: 'insert_branch_pole_on_segment_sn',
        context: { segment_id: 'seg-1' },
      },
    });

    render(<OperationFormRouter />);

    expect(screen.getByTestId('insert-branch-pole-form')).toBeInTheDocument();
  });

  it('renderuje formularz wstawienia ZKSN', () => {
    useNetworkBuildStore.setState({
      activeOperationForm: {
        op: 'insert_zksn_on_segment_sn',
        context: { segment_id: 'seg-1' },
      },
    });

    render(<OperationFormRouter />);

    expect(screen.getByTestId('insert-zksn-form')).toBeInTheDocument();
  });
});
