import { useEffect, useMemo, useRef, useState } from 'react';

type ProgressCategory = {
  id: string;
  label: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  summaryValue: number | null;
  unit: string | null;
  error: string | null;
};

type ProgressTarget = {
  repoUrl: string | null;
  ref: string | null;
  sha: string | null;
  setupStatus: string;
  categories: Record<string, ProgressCategory>;
};

type ProgressSnapshot = {
  status: string;
  mode: 'full' | 'category';
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
  targets: {
    baseline: ProgressTarget;
    submission: ProgressTarget;
  };
  updatedAt: string;
};

type ComparisonCategory = {
  label: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  percentChange: number;
  unit: string;
  baselineStatus: string;
  submissionStatus: string;
  baselineMetrics?: Record<string, unknown>;
  submissionMetrics?: Record<string, unknown>;
  rootCause: {
    title: string;
    baselineProblem: string;
    whyFixWorks: string;
  };
};

type Comparison = {
  runId: string;
  generatedAt: string;
  summary?: {
    overallStatus: string;
    failedCategoryCount: number;
    baselineFailedCategories: Array<{ categoryId: string; error: string | null }>;
    submissionFailedCategories: Array<{ categoryId: string; error: string | null }>;
    comparedCategoryCount: number;
  };
  categories: Record<string, ComparisonCategory>;
};

type RunSummary = {
  id: string;
  executor: string;
  mode: 'full' | 'category';
  category: string | null;
  status: string;
  error: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  baselineRepo: string;
  baselineRef: string;
  baselineSha: string | null;
  submissionRepo: string;
  submissionRef: string;
  submissionSha: string | null;
  githubRunId: number | null;
  githubRunAttempt: number | null;
  githubRunUrl: string | null;
  comparisonJson: Comparison | null;
  progressJson: ProgressSnapshot | null;
  artifactNames: string[];
};

type RunEvent = {
  id: number;
  type: string;
  level: string;
  phase: string | null;
  targetLabel: string | null;
  categoryId: string | null;
  commandId: string | null;
  stream: string | null;
  message: string;
  createdAt: string;
};

type SessionState = {
  authenticated: boolean;
};

type PhaseNode = {
  id: string;
  label: string;
  status: string;
  detail: string;
};

type SignalEvent = RunEvent & {
  badge: string;
  context: string;
};

type MetricEntry = {
  key: string;
  label: string;
  value: string;
};

type RunIssue = {
  id: string;
  level: 'error' | 'warn' | 'info';
  title: string;
  detail: string;
};

const DEFAULT_FORM = {
  baselineRepo: 'https://github.com/US-Department-of-the-Treasury/ship.git',
  baselineRef: 'master',
  submissionRepo: 'https://github.com/thisisyoussef/ship.git',
  submissionRef: 'codex/submission-clean',
};

const CATEGORY_ORDER = [
  'type-safety',
  'bundle-size',
  'api-response',
  'db-efficiency',
  'test-quality',
  'runtime-handling',
  'accessibility',
] as const;

const CATEGORY_GUIDES: Record<
  (typeof CATEGORY_ORDER)[number],
  {
    label: string;
    intro: string;
    commands: string[];
  }
> = {
  'type-safety': {
    label: 'Type safety',
    intro: 'Runs package type-checks, then scans the TypeScript AST for any, as, non-null assertions, and ts-ignore directives.',
    commands: [
      'pnpm --filter @ship/shared type-check',
      'pnpm --filter @ship/api type-check',
      'pnpm --filter @ship/web exec tsc --noEmit',
      'node scripts/audit/lib/type-safety.mjs',
    ],
  },
  'bundle-size': {
    label: 'Bundle size',
    intro: 'Builds the web app with sourcemaps, then parses the emitted entry chunk, gzip size, total bundle size, and chunk count.',
    commands: [
      'pnpm --filter @ship/web exec vite build --sourcemap',
      'node scripts/audit/lib/bundle-size.mjs',
    ],
  },
  'api-response': {
    label: 'API response',
    intro: 'Migrates, seeds, expands the canonical corpus, starts the API, authenticates, then runs the load harness across the five documented endpoints.',
    commands: [
      'pnpm db:migrate',
      'pnpm db:seed',
      'node scripts/audit/lib/corpus.mjs',
      'pnpm --filter @ship/api exec tsx src/index.ts',
      'node scripts/audit/lib/api-response.mjs',
      'Concurrency bands: 10, 25, 50 with 200 requests each',
    ],
  },
  'db-efficiency': {
    label: 'DB efficiency',
    intro: 'Starts the API with a pg trace hook, hits GET /api/weeks/:id/issues once, and records statement count plus total DB time.',
    commands: [
      'pnpm db:migrate',
      'pnpm db:seed',
      'node scripts/audit/lib/corpus.mjs',
      'NODE_OPTIONS=--import=<pg-trace-bootstrap> pnpm --filter @ship/api exec tsx src/index.ts',
      'node scripts/audit/lib/db-efficiency.mjs',
    ],
  },
  'test-quality': {
    label: 'Test quality',
    intro: 'Runs the API and web suites, then launches the regression Playwright flow with --repeat-each=10 on a fresh seeded runtime.',
    commands: [
      'pnpm --filter @ship/api test',
      'pnpm --filter @ship/web test',
      'pnpm db:seed',
      'pnpm exec playwright test scripts/audit/playwright/test-quality.spec.mjs --repeat-each=10',
    ],
  },
  'runtime-handling': {
    label: 'Runtime handling',
    intro: 'Exercises login/bootstrap noise, direct document entry, and error-boundary recovery on a live seeded stack.',
    commands: [
      'pnpm --filter @ship/web test -- web/src/components/ui/ErrorBoundary.test.tsx',
      'pnpm db:migrate',
      'pnpm db:seed',
      'pnpm exec playwright test scripts/audit/playwright/runtime-handling.spec.mjs',
    ],
  },
  accessibility: {
    label: 'Accessibility',
    intro: 'Runs the docs tree and /my-week flows with Playwright plus axe against the same canonical dataset, including structure checks that used to fail before the axe counts were even recorded.',
    commands: [
      'pnpm db:migrate',
      'pnpm db:seed',
      'pnpm exec playwright test scripts/audit/playwright/accessibility.spec.mjs',
    ],
  },
};

export function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [password, setPassword] = useState('');
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<{ easy: string; manual: string } | null>(null);
  const [liveEvents, setLiveEvents] = useState<RunEvent[]>([]);
  const [liveCursor, setLiveCursor] = useState(0);
  const [terminalAutoFollow, setTerminalAutoFollow] = useState(true);
  const liveCursorRef = useRef(0);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null,
    [runs, selectedRunId]
  );

  const progress = selectedRun?.progressJson ?? null;
  const progressPercent = progress
    ? Math.round((progress.completedSteps / Math.max(progress.totalSteps, 1)) * 100)
    : 0;
  const selectedCategoryIds = progress?.selectedCategories ?? getRunCategoryIds(selectedRun);
  const phaseNodes = useMemo(
    () => buildPhaseNodes(selectedRun, progress),
    [progress, selectedRun]
  );
  const signalEvents = useMemo(
    () => buildSignalEvents(liveEvents),
    [liveEvents]
  );
  const runIssues = useMemo(
    () => buildRunIssues(selectedRun, progress, signalEvents),
    [progress, selectedRun, signalEvents]
  );
  const rawTerminalEvents = useMemo(
    () => liveEvents.slice(-320),
    [liveEvents]
  );

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!session?.authenticated) {
      return;
    }

    void refreshRuns();
    const interval = window.setInterval(() => {
      void refreshRuns();
    }, 4_000);
    return () => window.clearInterval(interval);
  }, [session?.authenticated]);

  useEffect(() => {
    if (!selectedRun) {
      setRecipes(null);
      return;
    }

    void fetch(`/api/runs/${selectedRun.id}/recipe`, { credentials: 'include' })
      .then((response) => response.json())
      .then((payload) => setRecipes(payload))
      .catch(() => setRecipes(null));
  }, [selectedRun?.id]);

  useEffect(() => {
    if (!session?.authenticated || !selectedRun) {
      setLiveEvents([]);
      setLiveCursor(0);
      setTerminalAutoFollow(true);
      liveCursorRef.current = 0;
      return;
    }

    let disposed = false;
    const currentRunId = selectedRun.id;

    async function sync(after: number, reset = false) {
      const response = await fetch(
        `/api/runs/${currentRunId}/events?after=${after}&limit=${reset ? 400 : 200}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok || disposed) {
        return;
      }

      const payload = await response.json();
      if (disposed) {
        return;
      }

      mergeRun(payload.run as RunSummary);
      setLiveEvents((current) => {
        if (reset) {
          return payload.events;
        }
        return [...current, ...payload.events].slice(-500);
      });
      const nextCursor = Number(payload.nextCursor ?? after);
      liveCursorRef.current = nextCursor;
      setLiveCursor(nextCursor);
    }

    setLiveEvents([]);
    setLiveCursor(0);
    setTerminalAutoFollow(true);
    liveCursorRef.current = 0;
    void sync(0, true);

    if (selectedRun.status !== 'queued' && selectedRun.status !== 'running') {
      return () => {
        disposed = true;
      };
    }

    const interval = window.setInterval(() => {
      void sync(liveCursorRef.current, false);
    }, 1_500);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [session?.authenticated, selectedRun?.id, selectedRun?.status]);

  useEffect(() => {
    if (!terminalAutoFollow) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      terminalEndRef.current?.scrollIntoView({
        block: 'end',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [rawTerminalEvents.length, terminalAutoFollow]);

  async function refreshSession() {
    const response = await fetch('/api/session', { credentials: 'include' });
    const payload = await response.json();
    setSession(payload);
  }

  async function refreshRuns() {
    const response = await fetch('/api/runs', { credentials: 'include' });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    setRuns(payload.runs);
    setSelectedRunId((current) => current ?? payload.runs[0]?.id ?? null);
  }

  function mergeRun(run: RunSummary) {
    setRuns((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === run.id);
      if (existingIndex === -1) {
        return [run, ...current];
      }

      const next = current.slice();
      next[existingIndex] = run;
      return next;
    });
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError(null);

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setLoginError('Invalid password.');
      return;
    }

    setPassword('');
    await refreshSession();
  }

  async function handleLogout() {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setSession({ authenticated: false });
    setRuns([]);
  }

  async function queueRun(mode: 'full' | 'category', category: string | null) {
    setSubmitting(category ?? mode);
    const response = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mode,
        category,
        ...form,
      }),
    });
    setSubmitting(null);
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    mergeRun(payload.run);
    setSelectedRunId(payload.run.id);
  }

  function handleTerminalScroll() {
    const element = terminalRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setTerminalAutoFollow(distanceFromBottom < 48);
  }

  function jumpToLatest() {
    setTerminalAutoFollow(true);
    terminalEndRef.current?.scrollIntoView({
      block: 'end',
      behavior: 'smooth',
    });
  }

  if (!session?.authenticated) {
    return (
      <main className="shell shell--login">
        <section className="login-panel">
          <div className="login-panel__glow" />
          <p className="eyebrow">Ship audit mission control</p>
          <h1>Run the full reproducible comparison or inspect each category with live execution telemetry.</h1>
          <p className="lede">
            The hosted view now behaves like an operator console: GitHub Actions status, setup milestones,
            category progress, signal feed, and raw terminal output all stay visible while the run is still moving.
          </p>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Shared password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter the audit app password"
              />
            </label>
            <button type="submit">Open mission control</button>
          </form>
          {loginError ? <p className="error-text">{loginError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Virtual audit runner</p>
          <h1>See exactly what the grader would see, while the run is still happening.</h1>
          <p className="lede">
            Each run now shows phase choreography, target resolution, command ownership, and the latest operator signals
            before you ever need to open the raw GitHub Actions page.
          </p>
        </div>
        <div className="hero__status-card">
          <div className="hero__status-head">
            <div>
              <p className="eyebrow">Current run</p>
              <h2>{getRunTitle(selectedRun)}</h2>
            </div>
            <button className="ghost-button" onClick={handleLogout}>
              Log out
            </button>
          </div>
          {selectedRun ? (
            <>
              <div className="hero__status-strip">
                <StatusPill status={selectedRun.status} label={selectedRun.status} />
                <span className="hero__executor">Executor: GitHub Actions</span>
              </div>
              <div className="hero__status-grid">
                <TelemetryCard
                  label="Elapsed"
                  value={formatElapsed(selectedRun)}
                  detail={progress?.message ?? 'Waiting for GitHub Actions updates.'}
                />
                <TelemetryCard
                  label="Refs"
                  value={`${selectedRun.baselineRef} -> ${selectedRun.submissionRef}`}
                  detail={`${shortSha(selectedRun.baselineSha)} -> ${shortSha(selectedRun.submissionSha)}`}
                />
                <TelemetryCard
                  label="Artifacts"
                  value={String(selectedRun.artifactNames.length)}
                  detail={selectedRun.artifactNames.length > 0 ? selectedRun.artifactNames.join(', ') : 'Will appear when the run finishes.'}
                />
                <TelemetryCard
                  label="Alerts"
                  value={String(runIssues.length)}
                  detail={runIssues[0]?.title ?? 'No unexpected errors surfaced yet.'}
                />
              </div>
            </>
          ) : (
            <p className="empty-state">Queue a run to start the hosted comparison.</p>
          )}
        </div>
      </section>

      <section className="grid grid--controls">
        <article className="panel panel--launch">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Launch control</p>
              <h2>Choose the exact repos and refs to compare.</h2>
            </div>
            <div className="panel__pulse" />
          </div>
          <div className="field-grid">
            <label>
              Baseline repo
              <input
                value={form.baselineRepo}
                onChange={(event) => setForm((current) => ({ ...current, baselineRepo: event.target.value }))}
              />
            </label>
            <label>
              Baseline ref
              <input
                value={form.baselineRef}
                onChange={(event) => setForm((current) => ({ ...current, baselineRef: event.target.value }))}
              />
            </label>
            <label>
              Submission repo
              <input
                value={form.submissionRepo}
                onChange={(event) => setForm((current) => ({ ...current, submissionRepo: event.target.value }))}
              />
            </label>
            <label>
              Submission ref
              <input
                value={form.submissionRef}
                onChange={(event) => setForm((current) => ({ ...current, submissionRef: event.target.value }))}
              />
            </label>
          </div>
          <div className="button-row">
            <button onClick={() => queueRun('full', null)} disabled={Boolean(submitting)}>
              {submitting === 'full' ? 'Queueing...' : 'Run full comparison'}
            </button>
          </div>
          <p className="meta-line">
            The full run is the grader path. Individual category buttons below are for focused reruns and debugging.
          </p>
        </article>

        <article className="panel panel--telemetry">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Mission telemetry</p>
              <h2>Track the workflow before the raw logs become noisy.</h2>
            </div>
          </div>
          {selectedRun ? (
            <>
              <PhaseRail nodes={phaseNodes} />
              <div className="telemetry-grid">
                <TelemetryCard
                  label="Active phase"
                  value={formatPhase(progress?.phase ?? selectedRun.status)}
                  detail={progress?.updatedAt ? `Updated ${formatClock(progress.updatedAt)}` : 'No updates yet.'}
                />
                <TelemetryCard
                  label="Active target"
                  value={progress?.activeTarget ?? 'idle'}
                  detail={progress?.activeCategory ?? 'No active category'}
                />
                <TelemetryCard
                  label="GitHub run"
                  value={selectedRun.githubRunId ? `#${selectedRun.githubRunId}` : 'pending'}
                  detail={selectedRun.githubRunAttempt ? `Attempt ${selectedRun.githubRunAttempt}` : 'Waiting for dispatch'}
                  href={selectedRun.githubRunUrl}
                />
                <TelemetryCard
                  label="Progress"
                  value={`${progressPercent}%`}
                  detail={`${progress?.completedSteps ?? 0}/${progress?.totalSteps ?? 0} measured steps`}
                />
                <TelemetryCard
                  label="Signals"
                  value={`${countSignalLevels(signalEvents, 'error')}/${countSignalLevels(signalEvents, 'warn')}`}
                  detail="Errors / warnings in the recent operator feed"
                />
              </div>
              <div className="category-lane">
                {selectedCategoryIds.map((categoryId) => (
                  <CategoryLaneCard
                    key={categoryId}
                    categoryId={categoryId}
                    baselineStatus={progress?.targets.baseline.categories[categoryId]?.status ?? 'pending'}
                    submissionStatus={progress?.targets.submission.categories[categoryId]?.status ?? 'pending'}
                  />
                ))}
              </div>
              {progress?.activeCommand ? (
                <div className="active-command">
                  <span className="eyebrow">Active command</span>
                  <code>{progress.activeCommand.command}</code>
                </div>
              ) : null}
            </>
          ) : (
            <p className="empty-state">No run selected.</p>
          )}
        </article>
      </section>

      <section className="grid grid--main">
        <article className="panel panel--history">
          <p className="eyebrow">History</p>
          <div className="history-list">
            {runs.map((run) => (
              <button
                key={run.id}
                className={`history-item ${run.id === selectedRun?.id ? 'history-item--active' : ''}`}
                onClick={() => setSelectedRunId(run.id)}
              >
                <div>
                  <strong>{getRunTitle(run)}</strong>
                  <p>{new Date(run.requestedAt).toLocaleString()}</p>
                </div>
                <StatusPill status={run.status} label={run.status} />
              </button>
            ))}
          </div>
        </article>

        <article className="panel panel--detail">
          <p className="eyebrow">Operator notebook</p>
          {selectedRun ? (
            <div className="detail-layout">
              <div className="notebook-stack">
                <section className="notebook-section notebook-section--setup">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Setup contract</p>
                      <h3>Clone, install, build shared, and seed the canonical corpus.</h3>
                    </div>
                    <button onClick={() => queueRun('full', null)} disabled={Boolean(submitting)}>
                      {submitting === 'full' ? 'Queueing...' : 'Run all steps'}
                    </button>
                  </div>
                  <p className="meta-line">
                    GitHub Actions runs the same preparation contract every time: clone the requested refs, install with a frozen lockfile,
                    build shared, migrate, seed, and expand to the canonical corpus before any measured category logic begins.
                  </p>
                  <div className="step-status-grid">
                    <StatusCard
                      title="Baseline setup"
                      status={progress?.targets.baseline.setupStatus ?? 'pending'}
                      detail={formatTarget(progress?.targets.baseline)}
                    />
                    <StatusCard
                      title="Submission setup"
                      status={progress?.targets.submission.setupStatus ?? 'pending'}
                      detail={formatTarget(progress?.targets.submission)}
                    />
                  </div>
                  <CodeBlock
                    value={[
                      'git clone --depth 1 --branch <ref> <repo-url> <workdir>',
                      'pnpm install --frozen-lockfile',
                      'pnpm build:shared',
                      'pnpm db:migrate',
                      'pnpm db:seed',
                      'Expand canonical corpus to 580 docs / 105 issues / 35 weeks / 23 users',
                    ].join('\n')}
                  />
                </section>

                {CATEGORY_ORDER.map((categoryId, index) => {
                  const categoryGuide = CATEGORY_GUIDES[categoryId];
                  const comparisonCategory = selectedRun.comparisonJson?.categories[categoryId] ?? null;
                  const baselineProgress = progress?.targets.baseline.categories[categoryId] ?? null;
                  const submissionProgress = progress?.targets.submission.categories[categoryId] ?? null;

                  return (
                    <section key={categoryId} className="notebook-section">
                      <div className="section-head">
                        <div>
                          <p className="eyebrow">Step {index + 1}</p>
                          <h3>{categoryGuide.label}</h3>
                        </div>
                        <button
                          className="ghost-button"
                          onClick={() => queueRun('category', categoryId)}
                          disabled={Boolean(submitting)}
                        >
                          {submitting === categoryId ? 'Queueing...' : 'Run this category'}
                        </button>
                      </div>

                      <p className="meta-line">{categoryGuide.intro}</p>
                      <div className="step-status-grid">
                        <StatusCard
                          title="Baseline"
                          status={comparisonCategory?.baselineStatus ?? baselineProgress?.status ?? 'pending'}
                          detail={renderStatusDetail(baselineProgress)}
                        />
                        <StatusCard
                          title="Submission"
                          status={comparisonCategory?.submissionStatus ?? submissionProgress?.status ?? 'pending'}
                          detail={renderStatusDetail(submissionProgress)}
                        />
                      </div>

                      <CodeBlock value={categoryGuide.commands.join('\n')} />

                      {comparisonCategory ? (
                        <ComparisonOutcome category={comparisonCategory} />
                      ) : null}
                    </section>
                  );
                })}

                <section className="notebook-section">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Reproduce locally</p>
                      <h3>Use the same refs and rerun the harness on your own machine.</h3>
                    </div>
                  </div>
                  <div className="recipe-grid">
                    <RecipeCard title="Easy mode" value={recipes?.easy ?? 'Loading...'} />
                    <RecipeCard title="Manual mode" value={recipes?.manual ?? 'Loading...'} />
                  </div>
                  {selectedRun.artifactNames.length > 0 ? (
                    <div className="artifact-row">
                      {selectedRun.artifactNames.map((artifactName) => (
                        <a
                          key={artifactName}
                          href={`/api/runs/${selectedRun.id}/artifacts/${artifactName}`}
                          className="ghost-button"
                        >
                          Download {artifactName}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {selectedRun.error ? <p className="error-text">{selectedRun.error}</p> : null}
                </section>
              </div>

              <aside className="ops-stack">
                <section className="signal-panel">
                  <div className="signal-panel__head">
                    <div>
                      <p className="eyebrow">Alerts</p>
                      <h3>Unexpected conditions, failed categories, and workflow-level warnings.</h3>
                    </div>
                    <span className="meta-line">{runIssues.length} active</span>
                  </div>
                  <div className="signal-list">
                    {runIssues.length > 0 ? (
                      runIssues.map((issue) => (
                        <article key={issue.id} className={`signal-card signal-card--${issue.level}`}>
                          <div className="signal-card__head">
                            <span className={`event-badge event-badge--${issue.level}`}>{issue.level}</span>
                          </div>
                          <p className="signal-card__context">{issue.title}</p>
                          <p className="signal-card__message">{issue.detail}</p>
                        </article>
                      ))
                    ) : (
                      <div className="signal-card signal-card--empty">
                        <p className="meta-line">No unexpected failures or warnings are currently surfaced for this run.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="signal-panel">
                  <div className="signal-panel__head">
                    <div>
                      <p className="eyebrow">Signal feed</p>
                      <h3>Human-readable state changes and risks.</h3>
                    </div>
                    <span className="meta-line">{signalEvents.length} recent signals</span>
                  </div>
                  <div className="signal-list">
                    {signalEvents.length > 0 ? (
                      signalEvents.map((event) => (
                        <SignalCard key={event.id} event={event} />
                      ))
                    ) : (
                      <div className="signal-card signal-card--empty">
                        <p className="meta-line">Signals will appear here as soon as the run starts reporting setup or measurement milestones.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="terminal-panel">
                  <div className="terminal-panel__head">
                    <div>
                      <p className="eyebrow">Raw terminal</p>
                      <h3>{progress?.message ?? 'Waiting for GitHub Actions output'}</h3>
                    </div>
                    <div className="terminal-panel__controls">
                      {!terminalAutoFollow ? (
                        <button className="ghost-button ghost-button--terminal" onClick={jumpToLatest}>
                          Jump to latest
                        </button>
                      ) : null}
                      <span className="meta-line">Cursor {liveCursor}</span>
                    </div>
                  </div>
                  <div className="terminal-meta">
                    <span>Phase: {formatPhase(progress?.phase ?? selectedRun.status)}</span>
                    <span>Target: {progress?.activeTarget ?? 'idle'}</span>
                    <span>Category: {progress?.activeCategory ?? 'idle'}</span>
                  </div>
                  <div className="terminal-view" ref={terminalRef} onScroll={handleTerminalScroll}>
                    {rawTerminalEvents.length > 0 ? (
                      <>
                        {rawTerminalEvents.map((event) => (
                          <TerminalLine key={event.id} event={event} />
                        ))}
                        <div ref={terminalEndRef} className="terminal-view__end" />
                      </>
                    ) : (
                      <div className="terminal-line terminal-line--info">
                        <div className="terminal-line__meta">
                          <span className="event-badge event-badge--info">idle</span>
                          <span className="terminal-line__prefix">GitHub Actions has not emitted any events yet.</span>
                        </div>
                        <span className="terminal-line__message">
                          As soon as the workflow starts, command ownership, stream source, target, and category context will appear here.
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          ) : (
            <p className="empty-state">Choose a run to inspect.</p>
          )}
        </article>
      </section>
    </main>
  );
}

function PhaseRail({ nodes }: { nodes: PhaseNode[] }) {
  return (
    <div className="phase-rail">
      {nodes.map((node, index) => (
        <div key={node.id} className={`phase-node phase-node--${node.status}`}>
          <div className="phase-node__indicator">
            <span>{index + 1}</span>
          </div>
          <div>
            <strong>{node.label}</strong>
            <p>{node.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TelemetryCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href?: string | null;
}) {
  const content = (
    <>
      <span className="telemetry-card__label">{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </>
  );

  if (href) {
    return (
      <a className="telemetry-card telemetry-card--link" href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return <div className="telemetry-card">{content}</div>;
}

function CategoryLaneCard({
  categoryId,
  baselineStatus,
  submissionStatus,
}: {
  categoryId: string;
  baselineStatus: string;
  submissionStatus: string;
}) {
  const guide = CATEGORY_GUIDES[categoryId as keyof typeof CATEGORY_GUIDES];
  return (
    <div className="category-lane__item">
      <span>{guide?.label ?? categoryId}</span>
      <div className="category-lane__status">
        <StatusPill status={baselineStatus} label={`B ${baselineStatus}`} compact />
        <StatusPill status={submissionStatus} label={`S ${submissionStatus}`} compact />
      </div>
    </div>
  );
}

function ComparisonOutcome({ category }: { category: ComparisonCategory }) {
  const baselineEntries = toMetricEntries(category.baselineMetrics);
  const submissionEntries = toMetricEntries(category.submissionMetrics);

  return (
    <div className="result-card">
      <div className="result-card__head">
        <div>
          <p className="eyebrow">{category.label}</p>
          <h3>{category.rootCause.title}</h3>
        </div>
        <div className="result-metric">
          <span>Before</span>
          <strong>{formatMetric(category.before, category.unit)}</strong>
          <span>After {formatMetric(category.after, category.unit)}</span>
        </div>
      </div>
      <div className="result-card__status-row">
        <StatusPill status={category.baselineStatus} label={`Baseline ${category.baselineStatus}`} />
        <StatusPill status={category.submissionStatus} label={`Submission ${category.submissionStatus}`} />
      </div>
      <p className="meta-line">{category.rootCause.baselineProblem}</p>
      <p className="meta-line meta-line--strong">{category.rootCause.whyFixWorks}</p>
      <p className="meta-line">
        Delta {formatMetric(category.delta, category.unit)} ({category.percentChange}%)
      </p>
      {(baselineEntries.length > 0 || submissionEntries.length > 0) ? (
        <div className="metric-cluster">
          {baselineEntries.length > 0 ? <MetricPanel title="Baseline breakdown" entries={baselineEntries} /> : null}
          {submissionEntries.length > 0 ? <MetricPanel title="Submission breakdown" entries={submissionEntries} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function MetricPanel({ title, entries }: { title: string; entries: MetricEntry[] }) {
  return (
    <div className="metric-panel">
      <p className="eyebrow">{title}</p>
      <div className="metric-panel__grid">
        {entries.map((entry) => (
          <div key={entry.key} className="metric-chip">
            <span>{entry.label}</span>
            <strong>{entry.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalCard({ event }: { event: SignalEvent }) {
  return (
    <article className={`signal-card signal-card--${event.level}`}>
      <div className="signal-card__head">
        <span className={`event-badge event-badge--${event.level}`}>{event.badge}</span>
        <span className="signal-card__time">{formatClock(event.createdAt)}</span>
      </div>
      <p className="signal-card__context">{event.context}</p>
      <p className="signal-card__message">{event.message}</p>
    </article>
  );
}

function TerminalLine({ event }: { event: RunEvent }) {
  return (
    <div key={event.id} className={`terminal-line terminal-line--${event.level}`}>
      <div className="terminal-line__meta">
        <span className={`event-badge event-badge--${event.level}`}>{formatEventBadge(event)}</span>
        <span className="terminal-line__prefix">{formatEventContext(event)}</span>
      </div>
      <span className="terminal-line__message">{event.message}</span>
    </div>
  );
}

function StatusCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="status-card">
      <div className="status-row">
        <strong>{title}</strong>
        <StatusPill status={status} label={status} />
      </div>
      <p className="meta-line">{detail}</p>
    </div>
  );
}

function StatusPill({
  status,
  label,
  compact = false,
}: {
  status: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <span className={`status-pill status-pill--${status} ${compact ? 'status-pill--compact' : ''}`}>
      {label}
    </span>
  );
}

function RecipeCard({ title, value }: { title: string; value: string }) {
  async function copy() {
    await navigator.clipboard.writeText(value);
  }

  return (
    <article className="recipe-card">
      <div className="result-card__head">
        <div>
          <p className="eyebrow">{title}</p>
        </div>
        <button className="ghost-button" onClick={copy}>Copy</button>
      </div>
      <textarea readOnly value={value} />
    </article>
  );
}

function CodeBlock({ value }: { value: string }) {
  async function copy() {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="code-block">
      <div className="status-row">
        <span className="eyebrow">Exact commands</span>
        <button className="ghost-button" onClick={copy}>Copy</button>
      </div>
      <pre>{value}</pre>
    </div>
  );
}

function getRunTitle(run: RunSummary | null) {
  if (!run) {
    return 'No run selected';
  }
  if (run.mode === 'full') {
    return 'Full comparison';
  }
  return CATEGORY_GUIDES[run.category as keyof typeof CATEGORY_GUIDES]?.label ?? run.category ?? 'Category run';
}

function getRunCategoryIds(run: RunSummary | null) {
  if (!run) {
    return Array.from(CATEGORY_ORDER);
  }
  if (run.mode === 'category' && run.category) {
    return [run.category];
  }
  return Array.from(CATEGORY_ORDER);
}

function buildPhaseNodes(run: RunSummary | null, progress: ProgressSnapshot | null): PhaseNode[] {
  const setupDone = Boolean(
    progress &&
      ['passed', 'failed'].includes(progress.targets.baseline.setupStatus) &&
      ['passed', 'failed'].includes(progress.targets.submission.setupStatus)
  );
  const measureDone = Boolean(
    progress &&
      progress.selectedCategories.every((categoryId) => {
        const baselineStatus = progress.targets.baseline.categories[categoryId]?.status;
        const submissionStatus = progress.targets.submission.categories[categoryId]?.status;
        return ['passed', 'failed'].includes(baselineStatus ?? '') && ['passed', 'failed'].includes(submissionStatus ?? '');
      })
  );

  return [
    {
      id: 'queue',
      label: 'Queue',
      status: run?.startedAt ? 'passed' : run?.status === 'running' ? 'running' : run?.status ?? 'pending',
      detail: run?.githubRunUrl ? 'Workflow dispatched.' : 'Waiting for GitHub Actions dispatch.',
    },
    {
      id: 'setup',
      label: 'Setup',
      status: setupDone ? 'passed' : progress?.phase === 'setup' ? 'running' : 'pending',
      detail: setupDone ? 'Both targets cloned and prepared.' : 'Clone, install, build, and seed.',
    },
    {
      id: 'measure',
      label: 'Measure',
      status: measureDone ? 'passed' : progress?.phase === 'measure' ? 'running' : 'pending',
      detail: progress?.activeCategory ? `Active: ${CATEGORY_GUIDES[progress.activeCategory as keyof typeof CATEGORY_GUIDES]?.label ?? progress.activeCategory}` : 'Category metrics and regression flows.',
    },
    {
      id: 'finalize',
      label: 'Finalize',
      status: run?.status === 'finished' ? 'passed' : run?.status === 'failed' ? 'failed' : progress?.phase === 'finalize' ? 'running' : 'pending',
      detail: run?.status === 'finished' ? 'Artifacts stored and dashboard ready.' : 'Bundle artifacts and store the result.',
    },
  ];
}

function buildSignalEvents(events: RunEvent[]): SignalEvent[] {
  return events
    .filter(
      (event) =>
        event.type !== 'command-output' ||
        event.level === 'stderr' ||
        event.level === 'error' ||
        event.level === 'warn'
    )
    .slice(-10)
    .reverse()
    .map((event) => ({
      ...event,
      badge: formatEventBadge(event),
      context: formatEventContext(event),
    }));
}

function toMetricEntries(metrics?: Record<string, unknown>) {
  if (!metrics) {
    return [];
  }

  return Object.entries(metrics)
    .map(([key, value]) => {
      const rendered = renderMetricValue(value);
      if (!rendered) {
        return null;
      }
      return {
        key,
        label: formatMetricKey(key),
        value: rendered,
      };
    })
    .filter((entry): entry is MetricEntry => Boolean(entry))
    .slice(0, 8);
}

function renderMetricValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return value
      .flat()
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return String(item);
        }
        if (item && typeof item === 'object') {
          return JSON.stringify(item);
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
  }
  return null;
}

function formatMetricKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildRunIssues(
  run: RunSummary | null,
  progress: ProgressSnapshot | null,
  signalEvents: SignalEvent[]
): RunIssue[] {
  if (!run) {
    return [];
  }

  const issues: RunIssue[] = [];

  if (run.error) {
    issues.push({
      id: 'run-error',
      level: 'error',
      title: 'Workflow failure',
      detail: run.error,
    });
  }

  const comparisonSummary = run.comparisonJson?.summary;
  if (comparisonSummary?.failedCategoryCount) {
    for (const failure of comparisonSummary.baselineFailedCategories) {
      issues.push({
        id: `baseline-${failure.categoryId}`,
        level: 'warn',
        title: `Baseline ${CATEGORY_GUIDES[failure.categoryId as keyof typeof CATEGORY_GUIDES]?.label ?? failure.categoryId} failed`,
        detail: failure.error ?? 'This category did not produce a comparable result. Open the terminal or artifacts for details.',
      });
    }
    for (const failure of comparisonSummary.submissionFailedCategories) {
      issues.push({
        id: `submission-${failure.categoryId}`,
        level: 'warn',
        title: `Submission ${CATEGORY_GUIDES[failure.categoryId as keyof typeof CATEGORY_GUIDES]?.label ?? failure.categoryId} failed`,
        detail: failure.error ?? 'This category did not produce a comparable result. Open the terminal or artifacts for details.',
      });
    }
  }

  if (progress) {
    for (const [targetLabel, target] of Object.entries(progress.targets)) {
      for (const [categoryId, category] of Object.entries(target.categories)) {
        if (category.status === 'failed' && category.error) {
          issues.push({
            id: `${targetLabel}-${categoryId}-progress`,
            level: 'warn',
            title: `${capitalize(targetLabel)} ${CATEGORY_GUIDES[categoryId as keyof typeof CATEGORY_GUIDES]?.label ?? categoryId} reported a failure`,
            detail: category.error,
          });
        }
      }
    }
  }

  for (const event of signalEvents) {
    if (event.level !== 'error' && event.level !== 'warn') {
      continue;
    }
    issues.push({
      id: `signal-${event.id}`,
      level: event.level === 'error' ? 'error' : 'warn',
      title: event.context,
      detail: event.message,
    });
  }

  return dedupeIssues(issues).slice(0, 8);
}

function formatTarget(target?: ProgressTarget | null) {
  if (!target) {
    return 'Waiting for GitHub Actions.';
  }
  if (target.sha) {
    return `${target.repoUrl ?? 'repo'}@${target.ref ?? 'ref'} (${target.sha.slice(0, 7)})`;
  }
  if (target.repoUrl && target.ref) {
    return `${target.repoUrl}@${target.ref}`;
  }
  return 'Waiting for resolution.';
}

function renderStatusDetail(category?: ProgressCategory | null) {
  if (!category) {
    return 'Queued for this run.';
  }
  if (category.summaryValue !== null) {
    return `${category.summaryValue} ${category.unit ?? ''}`.trim();
  }
  if (category.error) {
    return category.error;
  }
  if (category.startedAt) {
    return `Started ${new Date(category.startedAt).toLocaleTimeString()}`;
  }
  return 'Queued for this run.';
}

function formatMetric(value: number | null, unit: string) {
  if (value === null || value === undefined) {
    return `n/a ${unit}`.trim();
  }
  return `${value} ${unit}`.trim();
}

function formatElapsed(run: RunSummary) {
  const started = run.startedAt ? new Date(run.startedAt).getTime() : new Date(run.requestedAt).getTime();
  const finished = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((finished - started) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString();
}

function formatPhase(value: string) {
  switch (value) {
    case 'queue':
      return 'Queue';
    case 'setup':
      return 'Setup';
    case 'measure':
      return 'Measure';
    case 'finalize':
      return 'Finalize';
    case 'finished':
      return 'Finished';
    case 'failed':
      return 'Failed';
    default:
      return value;
  }
}

function formatEventBadge(event: RunEvent) {
  switch (event.type) {
    case 'run-start':
      return 'run';
    case 'run-finished':
      return 'done';
    case 'run-error':
      return 'fail';
    case 'target-resolved':
      return 'repo';
    case 'target-prepare-start':
      return 'prep';
    case 'target-prepare-end':
      return 'ready';
    case 'category-start':
      return 'step';
    case 'category-end':
      return event.level === 'error' ? 'step fail' : 'step done';
    case 'command-start':
      return 'cmd';
    case 'command-end':
      return event.level === 'error' ? 'cmd fail' : 'cmd done';
    case 'command-output':
      return event.stream === 'stderr' ? 'stderr' : 'stdout';
    case 'workflow-note':
      return 'note';
    default:
      return event.type;
  }
}

function formatEventContext(event: RunEvent) {
  const parts = [formatClock(event.createdAt)];
  if (event.phase) {
    parts.push(formatPhase(event.phase));
  }
  if (event.targetLabel) {
    parts.push(event.targetLabel);
  }
  if (event.categoryId) {
    parts.push(CATEGORY_GUIDES[event.categoryId as keyof typeof CATEGORY_GUIDES]?.label ?? event.categoryId);
  }
  if (event.commandId) {
    parts.push(event.commandId);
  }
  if (event.stream) {
    parts.push(event.stream);
  }
  return parts.join(' / ');
}

function shortSha(value: string | null) {
  return value ? value.slice(0, 7) : 'pending';
}

function dedupeIssues(issues: RunIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.level}:${issue.title}:${issue.detail}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countSignalLevels(events: SignalEvent[], level: 'error' | 'warn') {
  return events.filter((event) => event.level === level).length;
}

function capitalize(value: string) {
  return value.length > 0 ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
}
