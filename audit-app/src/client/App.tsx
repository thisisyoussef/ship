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
  rootCause: {
    title: string;
    baselineProblem: string;
    whyFixWorks: string;
  };
};

type Comparison = {
  runId: string;
  generatedAt: string;
  categories: Record<string, ComparisonCategory>;
};

type RunSummary = {
  id: string;
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
    intro: 'Runs package type-checks, then scans the TypeScript AST for `any`, `as`, non-null assertions, and ts-ignore directives.',
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
    intro: 'Runs the API and web suites, then launches the regression Playwright flow with `--repeat-each=10` on a fresh seeded runtime.',
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
    intro: 'Runs the docs tree and /my-week flows with Playwright + axe against the same canonical dataset.',
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
      const response = await fetch(`/api/runs/${currentRunId}/events?after=${after}&limit=${reset ? 400 : 200}`, {
        credentials: 'include',
      });
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
  }, [liveEvents.length, terminalAutoFollow]);

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
          <p className="eyebrow">Render-hosted Ship audit</p>
          <h1>Run the full reproducible comparison or walk it category by category.</h1>
          <p className="lede">
            The hosted runner now shows setup, active category progress, and terminal-style output while the worker is still running.
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
            <button type="submit">Open dashboard</button>
          </form>
          {loginError ? <p className="error-text">{loginError}</p> : null}
        </section>
      </main>
    );
  }

  const progress = selectedRun?.progressJson ?? null;
  const progressPercent = progress ? Math.round((progress.completedSteps / Math.max(progress.totalSteps, 1)) * 100) : 0;

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Virtual audit runner</p>
          <h1>One click for the full compare, or a notebook flow for each category.</h1>
          <p className="lede">
            The dashboard now shows the live worker message, exact command stream, and per-category progress so long runs stay inspectable the whole way through.
          </p>
        </div>
        <button className="ghost-button" onClick={handleLogout}>
          Log out
        </button>
      </section>

      <section className="grid grid--controls">
        <article className="panel">
          <p className="eyebrow">Targets</p>
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
            Use the full run for the grader path, or drop into the notebook below and run an individual category in isolation.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Live run</p>
          {selectedRun ? (
            <>
              <div className="status-row">
                <h2>{selectedRun.mode === 'full' ? 'Full comparison' : CATEGORY_GUIDES[selectedRun.category as keyof typeof CATEGORY_GUIDES]?.label ?? selectedRun.category}</h2>
                <p className={`status-pill status-pill--${selectedRun.status}`}>{selectedRun.status}</p>
              </div>
              <p className="meta-line">{progress?.message ?? 'Waiting for worker updates.'}</p>
              <div className="progress-block">
                <div className="progress-track">
                  <span className="progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="progress-meta">
                  <span>{progressPercent}% complete</span>
                  <span>
                    {progress?.completedSteps ?? 0}/{progress?.totalSteps ?? 0} steps
                  </span>
                </div>
              </div>
              <p className="meta-line">
                {selectedRun.baselineRepo}@{selectedRun.baselineRef}
              </p>
              <p className="meta-line">
                {selectedRun.submissionRepo}@{selectedRun.submissionRef}
              </p>
              <p className="meta-line">
                {selectedRun.baselineSha ?? 'pending'} -&gt; {selectedRun.submissionSha ?? 'pending'}
              </p>
              <p className="meta-line">
                Elapsed {formatElapsed(selectedRun)}
              </p>
              {progress?.activeCommand ? (
                <div className="active-command">
                  <span className="eyebrow">Active command</span>
                  <code>{progress.activeCommand.command}</code>
                </div>
              ) : null}
            </>
          ) : (
            <p className="empty-state">No runs yet.</p>
          )}
        </article>
      </section>

      <section className="grid grid--main">
        <article className="panel">
          <p className="eyebrow">History</p>
          <div className="history-list">
            {runs.map((run) => (
              <button
                key={run.id}
                className={`history-item ${run.id === selectedRun?.id ? 'history-item--active' : ''}`}
                onClick={() => setSelectedRunId(run.id)}
              >
                <div>
                  <strong>{run.mode === 'full' ? 'Full comparison' : CATEGORY_GUIDES[run.category as keyof typeof CATEGORY_GUIDES]?.label ?? run.category}</strong>
                  <p>{new Date(run.requestedAt).toLocaleString()}</p>
                </div>
                <span className={`status-pill status-pill--${run.status}`}>{run.status}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel panel--detail">
          <p className="eyebrow">Notebook</p>
          {selectedRun ? (
            <div className="detail-layout">
              <div className="notebook-stack">
                <section className="notebook-section">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Setup</p>
                      <h3>Clone, install, build shared, and seed the canonical corpus.</h3>
                    </div>
                    <button onClick={() => queueRun('full', null)} disabled={Boolean(submitting)}>
                      {submitting === 'full' ? 'Queueing...' : 'Run all steps'}
                    </button>
                  </div>
                  <p className="meta-line">
                    The hosted worker always runs the same setup contract first: clone the requested refs, install with a frozen lockfile, build shared, then prepare the canonical corpus before the measured category logic starts.
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
                        <div className="result-card">
                          <div className="result-card__head">
                            <div>
                              <p className="eyebrow">{comparisonCategory.label}</p>
                              <h3>{comparisonCategory.rootCause.title}</h3>
                            </div>
                            <div className="result-metric">
                              <span>Before</span>
                              <strong>{formatMetric(comparisonCategory.before, comparisonCategory.unit)}</strong>
                              <span>After {formatMetric(comparisonCategory.after, comparisonCategory.unit)}</span>
                            </div>
                          </div>
                          <p className="meta-line">{comparisonCategory.rootCause.baselineProblem}</p>
                          <p className="meta-line meta-line--strong">{comparisonCategory.rootCause.whyFixWorks}</p>
                          <p className="meta-line">
                            Delta {formatMetric(comparisonCategory.delta, comparisonCategory.unit)} ({comparisonCategory.percentChange}%)
                          </p>
                        </div>
                      ) : null}
                    </section>
                  );
                })}

                <section className="notebook-section">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Reproduce locally</p>
                      <h3>Use the same refs and rerun the harness yourself.</h3>
                    </div>
                  </div>
                  <div className="recipe-grid">
                    <RecipeCard title="Easy mode" value={recipes?.easy ?? 'Loading...'} />
                    <RecipeCard title="Manual mode" value={recipes?.manual ?? 'Loading...'} />
                  </div>
                  {selectedRun.artifactNames.length > 0 ? (
                    <div className="artifact-row">
                      {selectedRun.artifactNames.map((artifactName) => (
                        <a key={artifactName} href={`/api/runs/${selectedRun.id}/artifacts/${artifactName}`} className="ghost-button">
                          Download {artifactName}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {selectedRun.error ? <p className="error-text">{selectedRun.error}</p> : null}
                </section>
              </div>

              <aside className="terminal-panel">
                <div className="terminal-panel__head">
                  <div>
                    <p className="eyebrow">Live terminal</p>
                    <h3>{progress?.message ?? 'Waiting for worker output'}</h3>
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
                  <span>Phase: {progress?.phase ?? selectedRun.status}</span>
                  <span>Target: {progress?.activeTarget ?? 'idle'}</span>
                  <span>Category: {progress?.activeCategory ?? 'idle'}</span>
                </div>
                <div className="terminal-view" ref={terminalRef} onScroll={handleTerminalScroll}>
                  {liveEvents.length > 0 ? (
                    <>
                      {liveEvents.map((event) => (
                        <div key={event.id} className={`terminal-line terminal-line--${event.level}`}>
                          <span className="terminal-line__prefix">
                            [{formatClock(event.createdAt)}]
                            {event.targetLabel ? ` ${event.targetLabel}` : ''}
                            {event.categoryId ? `/${event.categoryId}` : ''}
                            {event.stream ? ` ${event.stream}` : ''}
                          </span>
                          <span>{event.message}</span>
                        </div>
                      ))}
                      <div ref={terminalEndRef} className="terminal-view__end" />
                    </>
                  ) : (
                    <div className="terminal-line terminal-line--info">
                      <span className="terminal-line__prefix">[idle]</span>
                      <span>The worker will stream events here as soon as the run starts writing progress.</span>
                    </div>
                  )}
                </div>
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
        <span className={`status-pill status-pill--${status}`}>{status}</span>
      </div>
      <p className="meta-line">{detail}</p>
    </div>
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

function formatTarget(target?: ProgressTarget | null) {
  if (!target) {
    return 'Waiting for worker.';
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
