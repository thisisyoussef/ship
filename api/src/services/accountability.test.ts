import type { QueryResult, QueryResultRow } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TestAllocation = {
  projectId: string;
  projectName: string;
};

type WorkspaceRow = {
  sprint_start_date: string | Date;
};

type PersonRow = {
  id: string;
};

type AccountabilityDocContent = {
  type: 'doc';
  content: Array<{
    type: 'text';
    text: string;
  }>;
};

type AccountabilityDocRow = {
  id: string;
  content: AccountabilityDocContent;
};

type MockQueryRow = WorkspaceRow | PersonRow | AccountabilityDocRow;

const { queryMock, isBusinessDayMock, getAllocationsMock } = vi.hoisted(() => ({
  queryMock: vi.fn<(text: string, values?: unknown[]) => Promise<QueryResult<MockQueryRow>>>(),
  isBusinessDayMock: vi.fn<(date: string) => boolean>(),
  getAllocationsMock: vi.fn<
    (workspaceId: string, personId: string, userId: string, sprintNumber: number) => Promise<TestAllocation[]>
  >(),
}));

// Mock pool before importing service
vi.mock('../db/client.js', () => ({
  pool: {
    query: queryMock,
  },
}));

// Mock business-days to control date behavior
vi.mock('../utils/business-days.js', async () => {
  const actual = await vi.importActual<typeof import('../utils/business-days.js')>('../utils/business-days.js');
  return {
    ...actual,
    isBusinessDay: isBusinessDayMock,
  };
});

// Mock getAllocations to avoid fragile query ordering
vi.mock('../utils/allocation.js', () => ({
  getAllocations: getAllocationsMock,
}));

import { checkMissingAccountability } from './accountability.js';

function createQueryResult<Row extends QueryResultRow>(rows: Row[]): QueryResult<Row> {
  return {
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

function mockWorkspaceLookup(sprintStartDate: string | Date): void {
  queryMock.mockResolvedValueOnce(
    createQueryResult<WorkspaceRow>([{ sprint_start_date: sprintStartDate }])
  );
}

function mockPersonLookup(personId: string): void {
  queryMock.mockResolvedValueOnce(createQueryResult<PersonRow>([{ id: personId }]));
}

function mockAccountabilityDoc(id: string, text: string): void {
  queryMock.mockResolvedValueOnce(
    createQueryResult<AccountabilityDocRow>([
      {
        id,
        content: {
          type: 'doc',
          content: [{ type: 'text', text }],
        },
      },
    ])
  );
}

function mockEmptyQuery(): void {
  queryMock.mockResolvedValueOnce(createQueryResult<MockQueryRow>([]));
}

describe('Accountability Service', () => {
  const userId = 'user-123';
  const workspaceId = 'workspace-456';
  const projectId = 'project-abc';
  const personId = 'person-doc-123';

  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue(createQueryResult<MockQueryRow>([]));
    isBusinessDayMock.mockReset();
    isBusinessDayMock.mockReturnValue(true);
    getAllocationsMock.mockReset();
    getAllocationsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to mock the standard setup queries (workspace + person lookup)
  const mockSetupQueries = (sprintStartDate: string | Date = '2024-01-01') => {
    mockWorkspaceLookup(sprintStartDate);
    mockPersonLookup(personId);
  };

  /**
   * Helper to set up a minimal mock sequence for tests that don't care about
   * specific accountability types. After setup queries, the sequence is:
   * - standup active sprints (skipped if !isBusinessDay)
   * - owned sprints (sprint accountability)
   * - past sprints without review
   * - completed projects without retro
   * - changes_requested check
   */
  const mockMinimalQueries = (sprintStartDate: string | Date = '2024-01-01') => {
    isBusinessDayMock.mockReturnValue(false);
    mockSetupQueries(sprintStartDate);
    mockEmptyQuery();
    mockEmptyQuery();
    mockEmptyQuery();
    mockEmptyQuery();
  };

  describe('checkMissingAccountability', () => {
    it('returns empty array when workspace not found', async () => {
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      expect(result).toEqual([]);
    });

    it('returns only weekly_plan/weekly_retro/changes_requested types (standups, sprint, project checks disabled)', async () => {
      mockSetupQueries();

      const result = await checkMissingAccountability(userId, workspaceId);

      const types = result.map((item) => item.type);
      expect(types).not.toContain('standup');
      expect(types).not.toContain('week_start');
      expect(types).not.toContain('week_issues');
      expect(types).not.toContain('project_retro');
    });
  });

  describe('date calculations', () => {
    it('handles workspace start date as Date object', async () => {
      const startDate = new Date('2024-01-01');

      mockWorkspaceLookup(startDate);
      mockPersonLookup(personId);
      mockEmptyQuery();
      mockEmptyQuery();
      mockEmptyQuery();
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);
      expect(result).toBeDefined();
    });

    it('handles workspace start date as string', async () => {
      mockSetupQueries();
      mockEmptyQuery();
      mockEmptyQuery();
      mockEmptyQuery();
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);
      expect(result).toBeDefined();
    });
  });

  describe('per-person weekly plan due window (Saturday through Monday EOD)', () => {
    it('shows next sprint plan as due on Saturday before the week starts', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-06T12:00:00Z'));
      isBusinessDayMock.mockReturnValue(false);

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }]);
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      const planItem = result.find((item) => item.type === 'weekly_plan' && item.weekNumber === 2);
      expect(planItem).toBeDefined();
      expect(planItem?.message).toContain('week 2 plan');
    });

    it('shows current sprint plan as due on Monday (the week has started)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-08T12:00:00Z'));

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }])
        .mockResolvedValueOnce([]);
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      const planItem = result.find((item) => item.type === 'weekly_plan' && item.weekNumber === 2);
      expect(planItem).toBeDefined();
    });

    it('does NOT show next sprint plan on Friday (too early)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-05T12:00:00Z'));

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }]);

      const result = await checkMissingAccountability(userId, workspaceId);

      const planItem = result.find((item) => item.type === 'weekly_plan' && item.weekNumber === 2);
      expect(planItem).toBeUndefined();
    });

    it('shows plan as overdue on Tuesday (after Monday EOD)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-09T12:00:00Z'));

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }])
        .mockResolvedValueOnce([]);
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      const planItem = result.find((item) => item.type === 'weekly_plan' && item.weekNumber === 2);
      expect(planItem).toBeDefined();
      expect(planItem?.dueDate).toBe('2024-01-09');
    });
  });

  describe('per-person weekly retro due window (Thursday through Friday EOD)', () => {
    it('shows retro as due on Thursday', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-04T12:00:00Z'));

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }])
        .mockResolvedValueOnce([]);
      mockAccountabilityDoc('plan-1', 'My plan');
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      const retroItem = result.find((item) => item.type === 'weekly_retro' && item.weekNumber === 1);
      expect(retroItem).toBeDefined();
      expect(retroItem?.message).toContain('retro');
    });

    it('does NOT show retro on Wednesday (too early)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'));

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }])
        .mockResolvedValueOnce([]);
      mockAccountabilityDoc('plan-1', 'My plan');

      const result = await checkMissingAccountability(userId, workspaceId);

      const retroItem = result.find((item) => item.type === 'weekly_retro');
      expect(retroItem).toBeUndefined();
    });

    it('shows retro as overdue on Saturday', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-06T12:00:00Z'));
      isBusinessDayMock.mockReturnValue(false);

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }])
        .mockResolvedValueOnce([]);
      mockAccountabilityDoc('plan-1', 'My plan');
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      const retroItem = result.find((item) => item.type === 'weekly_retro' && item.weekNumber === 1);
      expect(retroItem).toBeDefined();
      expect(retroItem?.dueDate).toBe('2024-01-05');
    });
  });

  describe('next-sprint lookahead', () => {
    it('checks both current AND next sprint for accountability', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-07T12:00:00Z'));
      isBusinessDayMock.mockReturnValue(false);

      getAllocationsMock
        .mockResolvedValueOnce([{ projectId, projectName: 'Current Project' }])
        .mockResolvedValueOnce([{ projectId: 'proj-2', projectName: 'Next Project' }]);

      mockSetupQueries();
      mockEmptyQuery();
      mockAccountabilityDoc('plan-1', 'done');
      mockAccountabilityDoc('retro-1', 'done');
      mockEmptyQuery();
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      const week1Items = result.filter(
        (item) =>
          item.weekNumber === 1
          && (item.type === 'weekly_plan' || item.type === 'weekly_retro')
      );
      expect(week1Items).toHaveLength(0);

      const week2Plan = result.find((item) => item.type === 'weekly_plan' && item.weekNumber === 2);
      expect(week2Plan).toBeDefined();
      expect(week2Plan?.message).toContain('week 2 plan');
      expect(week2Plan?.projectId).toBe('proj-2');
    });

    it('does not duplicate items when plan is due for both current and next sprint', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-09T12:00:00Z'));

      mockMinimalQueries();
      getAllocationsMock
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }])
        .mockResolvedValueOnce([{ projectId, projectName: 'Test Project' }]);
      mockEmptyQuery();

      const result = await checkMissingAccountability(userId, workspaceId);

      const planItems = result.filter((item) => item.type === 'weekly_plan');
      expect(planItems).toHaveLength(1);
      expect(planItems[0]?.weekNumber).toBe(2);
    });
  });
});
