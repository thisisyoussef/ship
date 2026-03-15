import { useEffect, useMemo, useState } from 'react';

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
  artifactNames: string[];
};

type Comparison = {
  runId: string;
  generatedAt: string;
  categories: Record<
    string,
    {
      label: string;
      before: number;
      after: number;
      delta: number;
      percentChange: number;
      unit: string;
      rootCause: {
        title: string;
        baselineProblem: string;
        whyFixWorks: string;
      };
    }
  >;
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

const CATEGORY_BUTTONS = [
  ['type-safety', 'Type safety'],
  ['bundle-size', 'Bundle size'],
  ['api-response', 'API response'],
  ['db-efficiency', 'DB efficiency'],
  ['test-quality', 'Test quality'],
  ['runtime-handling', 'Runtime handling'],
  ['accessibility', 'Accessibility'],
] as const;

export function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [password, setPassword] = useState('');
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<{ easy: string; manual: string } | null>(null);

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
    }, 10_000);
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
    await refreshRuns();
    setSelectedRunId(payload.run.id);
  }

  if (!session?.authenticated) {
    return (
      <main className="shell shell--login">
        <section className="login-panel">
          <p className="eyebrow">Render-hosted Ship audit</p>
          <h1>Run the same reproducible comparison the grader can run locally.</h1>
          <p className="lede">
            This dashboard queues a real baseline-vs-submission compare, stores the artifacts, and shows the exact commands and reproduction recipes for every run.
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

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Virtual audit runner</p>
          <h1>One click to compare Treasury’s baseline against the clean submission branch.</h1>
          <p className="lede">
            Every run records the resolved SHAs, canonical corpus counts, exact commands, and downloadable artifacts. The local and hosted paths are intentionally the same.
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
              {submitting === 'full' ? 'Queueing…' : 'Run full comparison'}
            </button>
          </div>
          <div className="category-grid">
            {CATEGORY_BUTTONS.map(([categoryId, label]) => (
              <button
                key={categoryId}
                className="ghost-button"
                onClick={() => queueRun('category', categoryId)}
                disabled={Boolean(submitting)}
              >
                {submitting === categoryId ? 'Queueing…' : label}
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Latest result</p>
          {selectedRun ? (
            <>
              <h2>{selectedRun.mode === 'full' ? 'Full comparison' : selectedRun.category}</h2>
              <p className={`status-pill status-pill--${selectedRun.status}`}>{selectedRun.status}</p>
              <p className="meta-line">
                {selectedRun.baselineRepo}@{selectedRun.baselineRef}
              </p>
              <p className="meta-line">
                {selectedRun.submissionRepo}@{selectedRun.submissionRef}
              </p>
              <p className="meta-line">
                {selectedRun.baselineSha ?? 'pending'} → {selectedRun.submissionSha ?? 'pending'}
              </p>
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
                  <strong>{run.mode === 'full' ? 'Full comparison' : run.category}</strong>
                  <p>{new Date(run.requestedAt).toLocaleString()}</p>
                </div>
                <span className={`status-pill status-pill--${run.status}`}>{run.status}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel panel--detail">
          <p className="eyebrow">Run detail</p>
          {selectedRun?.comparisonJson ? (
            <>
              <div className="recipe-grid">
                <RecipeCard title="Easy mode" value={recipes?.easy ?? 'Loading…'} />
                <RecipeCard title="Manual mode" value={recipes?.manual ?? 'Loading…'} />
              </div>

              <div className="category-results">
                {Object.entries(selectedRun.comparisonJson.categories).map(([categoryId, category]) => (
                  <section key={categoryId} className="result-card">
                    <div className="result-card__head">
                      <div>
                        <p className="eyebrow">{category.label}</p>
                        <h3>{category.rootCause.title}</h3>
                      </div>
                      <div className="result-metric">
                        <span>Before</span>
                        <strong>{category.before} {category.unit}</strong>
                        <span>After {category.after} {category.unit}</span>
                      </div>
                    </div>
                    <p className="meta-line">{category.rootCause.baselineProblem}</p>
                    <p className="meta-line meta-line--strong">{category.rootCause.whyFixWorks}</p>
                    <p className="meta-line">
                      Delta {category.delta} {category.unit} ({category.percentChange}%)
                    </p>
                  </section>
                ))}
              </div>

              <div className="artifact-row">
                {selectedRun.artifactNames.map((artifactName) => (
                  <a key={artifactName} href={`/api/runs/${selectedRun.id}/artifacts/${artifactName}`} className="ghost-button">
                    Download {artifactName}
                  </a>
                ))}
              </div>
            </>
          ) : selectedRun ? (
            <>
              <p className="meta-line">Status: {selectedRun.status}</p>
              {selectedRun.error ? <p className="error-text">{selectedRun.error}</p> : null}
              <p className="empty-state">The worker will attach comparison details here when the run finishes.</p>
            </>
          ) : (
            <p className="empty-state">Choose a run to inspect.</p>
          )}
        </article>
      </section>
    </main>
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
