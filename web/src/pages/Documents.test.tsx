import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/DocumentsContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/DocumentsContext')>('@/contexts/DocumentsContext');
  return {
    ...actual,
    useDocuments: vi.fn(),
  };
});

import { ToastProvider } from '@/components/ui/Toast';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useDocuments } from '@/contexts/DocumentsContext';
import { DocumentsPage } from './Documents';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/docs']}>{children}</MemoryRouter>
          </ToastProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  };
}

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.mocked(useDocuments).mockReset();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  it('shows FleetGraph week proof lanes in the standard documents surface', async () => {
    vi.mocked(useDocuments).mockReturnValue({
      createDocument: vi.fn(),
      deleteDocument: vi.fn(),
      documents: [
        {
          created_at: '2026-03-17T00:00:00.000Z',
          document_type: 'wiki',
          id: 'wiki-1',
          parent_id: null,
          position: 0,
          title: 'Product handbook',
          updated_at: '2026-03-17T00:00:00.000Z',
          visibility: 'workspace',
        },
        {
          created_at: '2026-03-17T00:00:00.000Z',
          document_type: 'sprint',
          id: 'sprint-1',
          parent_id: null,
          position: 0,
          title: 'FleetGraph Demo Week - Review and Apply',
          updated_at: '2026-03-17T00:00:00.000Z',
          visibility: 'workspace',
        },
        {
          created_at: '2026-03-17T00:00:00.000Z',
          document_type: 'sprint',
          id: 'sprint-2',
          parent_id: null,
          position: 0,
          title: 'FleetGraph Demo Week - Validation Ready',
          updated_at: '2026-03-17T00:00:00.000Z',
          visibility: 'workspace',
        },
      ],
      loading: false,
      refreshDocuments: vi.fn(),
      updateDocument: vi.fn(),
    });

    render(<DocumentsPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('link', { name: 'FleetGraph Demo Week - Review and Apply' })).toHaveAttribute(
      'href',
      '/documents/sprint-1'
    );
    expect(screen.getByRole('link', { name: 'FleetGraph Demo Week - Validation Ready' })).toHaveAttribute(
      'href',
      '/documents/sprint-2'
    );
    expect(screen.getByRole('link', { name: 'Product handbook' })).toBeInTheDocument();
  });
});
