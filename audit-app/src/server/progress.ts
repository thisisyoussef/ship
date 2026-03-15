const CATEGORY_ORDER = [
  'type-safety',
  'bundle-size',
  'api-response',
  'db-efficiency',
  'test-quality',
  'runtime-handling',
  'accessibility',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  'type-safety': 'Type safety',
  'bundle-size': 'Bundle size',
  'api-response': 'API response',
  'db-efficiency': 'DB efficiency',
  'test-quality': 'Test quality',
  'runtime-handling': 'Runtime handling',
  accessibility: 'Accessibility',
};

export type RunMode = 'full' | 'category';
type StepStatus = 'pending' | 'running' | 'passed' | 'failed';

type CategoryProgress = {
  id: string;
  label: string;
  status: StepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  summaryValue: number | null;
  unit: string | null;
  error: string | null;
};

type TargetProgress = {
  repoUrl: string | null;
  ref: string | null;
  sha: string | null;
  setupStatus: StepStatus;
  categories: Record<string, CategoryProgress>;
};

export type ProgressSnapshot = {
  status: 'queued' | 'running' | 'finished' | 'failed';
  mode: RunMode;
  selectedCategories: string[];
  message: string;
  phase: string;
  activeTarget: string | null;
  activeCategory: string | null;
  activeCommand: {
    id: string;
    command: string;
    startedAt: string;
  } | null;
  completedSteps: number;
  totalSteps: number;
  targets: Record<'baseline' | 'submission', TargetProgress>;
  updatedAt: string;
};

export type AuditProgressEvent = {
  timestamp?: string;
  type: string;
  level?: string;
  phase?: string | null;
  targetLabel?: string | null;
  categoryId?: string | null;
  commandId?: string | null;
  stream?: string | null;
  message: string;
  payload?: Record<string, unknown> | null;
};

export function createInitialProgress(mode: RunMode, category: string | null): ProgressSnapshot {
  const selectedCategories =
    mode === 'category' && category ? [category] : Array.from(CATEGORY_ORDER);

  return {
    status: 'queued',
    mode,
    selectedCategories,
    message: 'Queued. Waiting for GitHub Actions to pick up this run.',
    phase: 'queue',
    activeTarget: null,
    activeCategory: null,
    activeCommand: null,
    completedSteps: 0,
    totalSteps: 2 + selectedCategories.length * 2,
    targets: {
      baseline: createTargetProgress(selectedCategories),
      submission: createTargetProgress(selectedCategories),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function applyProgressEvent(
  progress: ProgressSnapshot,
  event: AuditProgressEvent
): ProgressSnapshot {
  const next = structuredClone(progress);
  const timestamp = event.timestamp ?? new Date().toISOString();
  const nextMessage = event.message.trim();

  next.updatedAt = timestamp;
  next.phase = event.phase ?? next.phase;
  next.message = nextMessage.length > 0 ? nextMessage : progress.message;

  const targetKey = event.targetLabel === 'baseline' || event.targetLabel === 'submission'
    ? event.targetLabel
    : null;
  const target = targetKey ? next.targets[targetKey] : null;
  const categoryId = event.categoryId ?? null;
  const category = target && categoryId ? target.categories[categoryId] : null;

  switch (event.type) {
    case 'run-start':
      next.status = 'running';
      next.phase = 'setup';
      break;
    case 'target-resolved':
      if (target && event.payload) {
        target.repoUrl = stringOrNull(event.payload.repoUrl);
        target.ref = stringOrNull(event.payload.ref);
        target.sha = stringOrNull(event.payload.sha);
      }
      break;
    case 'target-prepare-start':
      if (target) {
        target.setupStatus = 'running';
        next.activeTarget = targetKey;
      }
      break;
    case 'target-prepare-end':
      if (target) {
        target.setupStatus = 'passed';
        next.activeTarget = null;
      }
      break;
    case 'category-start':
      if (category) {
        category.status = 'running';
        category.startedAt = category.startedAt ?? timestamp;
        next.activeTarget = targetKey;
        next.activeCategory = categoryId;
      }
      break;
    case 'category-end':
      if (category) {
        category.status = toStepStatus(event.payload?.status);
        category.finishedAt = timestamp;
        category.summaryValue = numberOrNull(event.payload?.summaryValue);
        category.unit = stringOrNull(event.payload?.unit);
        category.error = stringOrNull(event.payload?.error);
        next.activeCategory = null;
      }
      break;
    case 'command-start':
      next.activeCommand = {
        id: event.commandId ?? 'command',
        command: event.message,
        startedAt: timestamp,
      };
      break;
    case 'command-end':
      if (!next.activeCommand || next.activeCommand.id === event.commandId) {
        next.activeCommand = null;
      }
      break;
    case 'run-finished':
      next.status = 'finished';
      next.phase = 'finished';
      next.activeTarget = null;
      next.activeCategory = null;
      next.activeCommand = null;
      break;
    case 'run-error':
      next.status = 'failed';
      next.phase = 'failed';
      next.activeCommand = null;
      break;
    default:
      break;
  }

  next.completedSteps = countCompletedSteps(next);
  return next;
}

function createTargetProgress(selectedCategories: string[]): TargetProgress {
  return {
    repoUrl: null,
    ref: null,
    sha: null,
    setupStatus: 'pending',
    categories: Object.fromEntries(
      selectedCategories.map((categoryId) => [
        categoryId,
        {
          id: categoryId,
          label: CATEGORY_LABELS[categoryId] ?? categoryId,
          status: 'pending',
          startedAt: null,
          finishedAt: null,
          summaryValue: null,
          unit: null,
          error: null,
        },
      ])
    ),
  };
}

function countCompletedSteps(progress: ProgressSnapshot) {
  let completed = 0;
  for (const target of Object.values(progress.targets)) {
    if (target.setupStatus === 'passed' || target.setupStatus === 'failed') {
      completed += 1;
    }
    for (const category of Object.values(target.categories)) {
      if (category.status === 'passed' || category.status === 'failed') {
        completed += 1;
      }
    }
  }
  return completed;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toStepStatus(value: unknown): StepStatus {
  if (value === 'passed' || value === 'failed' || value === 'running') {
    return value;
  }
  return 'failed';
}
