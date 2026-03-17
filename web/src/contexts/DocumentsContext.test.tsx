import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiDelete: vi.fn(),
    apiGet: vi.fn(),
    apiPatch: vi.fn(),
    apiPost: vi.fn(),
  };
});

import { apiGet } from '@/lib/api';
import { DocumentsProvider, useDocuments } from './DocumentsContext';

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
        <DocumentsProvider>{children}</DocumentsProvider>
      </QueryClientProvider>
    );
  };
}

function DocumentsConsumer() {
  const { documents, loading } = useDocuments();

  if (loading) {
    return <div>Loading…</div>;
  }

  return (
    <ul>
      {documents.map((document) => (
        <li key={document.id}>{document.title}</li>
      ))}
    </ul>
  );
}

describe('DocumentsContext', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it('combines wiki and sprint documents for standard document navigation', async () => {
    vi.mocked(apiGet).mockImplementation(async (path: string) => {
      if (path === '/api/documents?type=wiki') {
        return {
          ok: true,
          json: async () => ([
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
          ]),
        } as Response;
      }

      if (path === '/api/documents?type=sprint') {
        return {
          ok: true,
          json: async () => ([
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
          ]),
        } as Response;
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    render(<DocumentsConsumer />, { wrapper: createWrapper() });

    expect(await screen.findByText('Product handbook')).toBeInTheDocument();
    expect(screen.getByText('FleetGraph Demo Week - Review and Apply')).toBeInTheDocument();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith('/api/documents?type=wiki');
      expect(apiGet).toHaveBeenCalledWith('/api/documents?type=sprint');
    });
  });
});
