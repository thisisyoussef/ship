import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    endImpersonation: vi.fn(),
    impersonating: null,
    isSuperAdmin: false,
    loading: false,
    logout: vi.fn(),
    user: { id: 'user-1', name: 'Demo User' },
  }),
}))

vi.mock('@/hooks/useFocusOnNavigate', () => ({
  useFocusOnNavigate: vi.fn(),
}))

vi.mock('@/hooks/useRealtimeEvents', () => ({
  useRealtimeEvent: vi.fn(),
}))

vi.mock('@/hooks/useSessionTimeout', () => ({
  useSessionTimeout: () => ({
    resetTimer: vi.fn(),
    showWarning: false,
    timeRemaining: 0,
    warningType: null,
  }),
}))

vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: 'workspace-1', name: 'Ship' },
    switchWorkspace: vi.fn(async () => true),
    workspaces: [],
  }),
}))

vi.mock('@/contexts/DocumentsContext', () => ({
  useDocuments: () => ({
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    documents: [],
    updateDocument: vi.fn(),
  }),
}))

vi.mock('@/contexts/ProgramsContext', () => ({
  usePrograms: () => ({
    programs: [],
    updateProgram: vi.fn(),
  }),
}))

vi.mock('@/contexts/IssuesContext', () => ({
  useIssues: () => ({
    createIssue: vi.fn(),
    issues: [],
    updateIssue: vi.fn(),
  }),
}))

vi.mock('@/contexts/ProjectsContext', () => ({
  useProjects: () => ({
    createProject: vi.fn(),
    projects: [],
    updateProject: vi.fn(),
  }),
}))

vi.mock('@/contexts/CurrentDocumentContext', () => ({
  useCurrentDocument: () => ({
    currentDocumentId: null,
    currentDocumentProjectId: null,
    currentDocumentType: null,
  }),
  useCurrentDocumentType: () => null,
}))

vi.mock('@/hooks/useStandupStatusQuery', () => ({
  useStandupStatusQuery: () => ({
    data: { due: false },
  }),
}))

vi.mock('@/hooks/useActionItemsQuery', () => ({
  actionItemsKeys: { all: ['actionItems'] },
  useActionItemsQuery: () => ({
    data: { has_overdue: false, items: [] },
  }),
}))

vi.mock('@/hooks/useFleetGraphFindings', () => ({
  useFleetGraphFindings: vi.fn(),
}))

vi.mock('@/components/CommandPalette', () => ({
  CommandPalette: () => null,
}))

vi.mock('@/components/SessionTimeoutModal', () => ({
  SessionTimeoutModal: () => null,
}))

vi.mock('@/components/UploadNavigationWarning', () => ({
  UploadNavigationWarning: () => null,
}))

vi.mock('@/components/CacheCorruptionAlert', () => ({
  CacheCorruptionAlert: () => null,
}))

vi.mock('@/components/ActionItemsModal', () => ({
  ActionItemsModal: () => null,
}))

vi.mock('@/components/AccountabilityBanner', () => ({
  AccountabilityBanner: () => null,
}))

vi.mock('@/components/ProjectSetupWizard', () => ({
  ProjectSetupWizard: () => null,
}))

vi.mock('@/components/DashboardSidebar', () => ({
  DashboardSidebar: () => <div>Dashboard sidebar</div>,
}))

vi.mock('@/components/sidebars/ProjectContextSidebar', () => ({
  ProjectContextSidebar: () => <div>Project context sidebar</div>,
}))

vi.mock('@/components/ContextTreeNav', () => ({
  ContextTreeNav: () => <div>Context tree</div>,
}))

vi.mock('@/contexts/SelectionPersistenceContext', () => ({
  SelectionPersistenceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

vi.mock('@/lib/actionItemsModal', () => ({
  shouldAutoOpenActionItemsModal: () => false,
  shouldCloseAutoOpenedActionItemsModal: () => false,
}))

import { useFleetGraphFindings } from '@/hooks/useFleetGraphFindings'
import { AppLayout } from './App'

function createWrapper(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/" element={children}>
              <Route path="docs" element={<div>Docs page</div>} />
              <Route path="fleetgraph" element={<div>FleetGraph queue page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('AppLayout', () => {
  beforeEach(() => {
    vi.mocked(useFleetGraphFindings).mockReset()
    vi.mocked(useFleetGraphFindings).mockReturnValue({
      actionErrorMessage: null,
      applyFinding: vi.fn(),
      dismissFinding: vi.fn(),
      findings: [{ id: 'finding-1' }, { id: 'finding-2' }],
      isLoading: false,
      isMutating: false,
      loadErrorMessage: null,
      refetchFindings: vi.fn(),
      resetActionState: vi.fn(),
      reviewFinding: vi.fn(),
      snoozeFinding: vi.fn(),
    } as never)

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    })
  })

  it('shows a FleetGraph rail item with an active findings badge and navigates to the queue route', async () => {
    render(<AppLayout />, {
      wrapper: createWrapper('/docs'),
    })

    expect(screen.getByRole('button', { name: 'FleetGraph' })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'FleetGraph' }))

    expect(await screen.findByText('FleetGraph queue page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'FleetGraph' })).toBeInTheDocument()
  })
})
