import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import * as ErrorBoundaryModule from './ErrorBoundary';

function MaybeBoom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <div>Healthy content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders a reload action in the default fallback UI', () => {
    render(
      <ErrorBoundaryModule.ErrorBoundary>
        <MaybeBoom shouldThrow={true} />
      </ErrorBoundaryModule.ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('lets the user retry the section without a full page reload', () => {
    const { rerender } = render(
      <ErrorBoundaryModule.ErrorBoundary>
        <MaybeBoom shouldThrow={true} />
      </ErrorBoundaryModule.ErrorBoundary>
    );

    rerender(
      <ErrorBoundaryModule.ErrorBoundary>
        <MaybeBoom shouldThrow={false} />
      </ErrorBoundaryModule.ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Healthy content')).toBeInTheDocument();
  });
});
