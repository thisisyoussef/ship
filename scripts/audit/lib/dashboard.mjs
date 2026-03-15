import { CATEGORY_DEFINITIONS, ROOT_CAUSES } from './constants.mjs';

export function renderDashboard({ comparison, baselineSummary, submissionSummary, recipes }) {
  const rows = CATEGORY_DEFINITIONS.map((category) => {
    const result = comparison.categories[category.id];
    if (!result) {
      return '';
    }

    return `
      <section class="card">
        <div class="card__head">
          <div>
            <p class="eyebrow">${category.label}</p>
            <h2>${escapeHtml(ROOT_CAUSES[category.id].title)}</h2>
          </div>
          <div class="metric">
            <span>Before</span>
            <strong>${formatMetric(result.before, category.unit)}</strong>
            <span>After ${formatMetric(result.after, category.unit)}</span>
          </div>
        </div>
        <p class="root-cause">${escapeHtml(ROOT_CAUSES[category.id].baselineProblem)}</p>
        <p class="root-cause root-cause--fix">${escapeHtml(ROOT_CAUSES[category.id].whyFixWorks)}</p>
        <div class="details">
          <div>
            <h3>Delta</h3>
            <p>${formatMetric(result.delta, category.unit, true)} (${result.percentChange}%)</p>
          </div>
          <div>
            <h3>Corpus</h3>
            <p>${formatCorpus(submissionSummary.corpus ?? baselineSummary.corpus)}</p>
          </div>
          <div>
            <h3>Artifacts</h3>
            <p>${escapeHtml(result.artifactHint)}</p>
          </div>
        </div>
        <details>
          <summary>Exact commands</summary>
          ${renderCommandList(baselineSummary, category.id, 'Baseline')}
          ${renderCommandList(submissionSummary, category.id, 'Submission')}
        </details>
      </section>
    `;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ship Audit Compare</title>
    <style>
      :root {
        --ink: #18212f;
        --muted: #5d6a7e;
        --card: rgba(255, 255, 255, 0.78);
        --line: rgba(24, 33, 47, 0.14);
        --accent: #005ea2;
        --accent-soft: #d9ecfb;
        --good: #0b6e4f;
        --bad: #b50909;
        --bg-top: #f2e7d5;
        --bg-bottom: #e7eff5;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(255,255,255,0.7), transparent 40%),
          linear-gradient(180deg, var(--bg-top), var(--bg-bottom));
        font-family: "Avenir Next", "Segoe UI", sans-serif;
      }

      main {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 32px 0 48px;
      }

      .hero {
        display: grid;
        gap: 20px;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(14px);
        box-shadow: 0 24px 70px rgba(24, 33, 47, 0.08);
      }

      .hero h1 {
        margin: 0;
        font-family: Georgia, "Iowan Old Style", serif;
        font-size: clamp(2rem, 3vw, 3.4rem);
        line-height: 1.05;
      }

      .hero p {
        margin: 0;
        color: var(--muted);
        max-width: 72ch;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }

      .pill, .card {
        border: 1px solid var(--line);
        background: var(--card);
        backdrop-filter: blur(12px);
      }

      .pill {
        border-radius: 18px;
        padding: 16px 18px;
      }

      .pill span {
        display: block;
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }

      .pill strong {
        display: block;
        margin-top: 8px;
        font-size: 1.15rem;
      }

      .recipes {
        display: grid;
        gap: 16px;
        margin-top: 24px;
      }

      textarea {
        width: 100%;
        min-height: 148px;
        padding: 14px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: #fffefb;
        color: var(--ink);
        font: 0.88rem/1.45 "SFMono-Regular", "Consolas", monospace;
      }

      .card {
        margin-top: 18px;
        border-radius: 24px;
        padding: 22px;
      }

      .card__head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }

      .eyebrow {
        margin: 0 0 8px;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }

      .card h2 {
        margin: 0;
        font-size: 1.28rem;
      }

      .metric {
        min-width: 180px;
        padding: 14px 16px;
        border-radius: 18px;
        background: var(--accent-soft);
      }

      .metric span {
        display: block;
        color: var(--muted);
        font-size: 0.78rem;
      }

      .metric strong {
        display: block;
        margin: 8px 0 4px;
        font-size: 1.45rem;
      }

      .root-cause {
        color: var(--muted);
        line-height: 1.6;
      }

      .root-cause--fix {
        color: var(--ink);
      }

      .details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin: 18px 0;
      }

      .details h3 {
        margin: 0 0 4px;
        font-size: 0.78rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .details p {
        margin: 0;
      }

      details {
        border-top: 1px solid var(--line);
        padding-top: 12px;
      }

      summary {
        cursor: pointer;
        font-weight: 600;
      }

      pre {
        overflow-x: auto;
        padding: 14px;
        border-radius: 16px;
        background: #fcfaf5;
        border: 1px solid rgba(24, 33, 47, 0.08);
        font: 0.82rem/1.45 "SFMono-Regular", "Consolas", monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">Ship audit reproducibility dashboard</p>
          <h1>Baseline vs submission, with the exact commands and corpus behind every number.</h1>
          <p>This artifact was generated by the same repo-owned harness used by the CLI and the Render-hosted dashboard. It captures the resolved SHAs, the canonical seeded dataset, and the raw command contract for all seven categories.</p>
        </div>
        <div class="grid">
          <div class="pill">
            <span>Baseline</span>
            <strong>${escapeHtml(baselineSummary.repoUrl)}@${escapeHtml(baselineSummary.ref)}</strong>
            <span>${escapeHtml(baselineSummary.sha)}</span>
          </div>
          <div class="pill">
            <span>Submission</span>
            <strong>${escapeHtml(submissionSummary.repoUrl)}@${escapeHtml(submissionSummary.ref)}</strong>
            <span>${escapeHtml(submissionSummary.sha)}</span>
          </div>
          <div class="pill">
            <span>Corpus</span>
            <strong>${formatCorpus(submissionSummary.corpus ?? baselineSummary.corpus)}</strong>
          </div>
          <div class="pill">
            <span>Run id</span>
            <strong>${escapeHtml(comparison.runId)}</strong>
            <span>${escapeHtml(comparison.generatedAt)}</span>
          </div>
        </div>
      </section>

      <section class="recipes">
        <div class="card">
          <p class="eyebrow">Easy mode</p>
          <textarea readonly>${escapeHtml(recipes.easy)}</textarea>
        </div>
        <div class="card">
          <p class="eyebrow">Manual mode</p>
          <textarea readonly>${escapeHtml(recipes.manual)}</textarea>
        </div>
      </section>

      ${rows}
    </main>
  </body>
</html>`;
}

function renderCommandList(summary, categoryId, label) {
  const category = summary.categories[categoryId];
  const commandIds = new Set(category.commandIds ?? []);
  const commands = summary.commands.filter((command) => commandIds.has(command.id));
  if (commands.length === 0) {
    return '';
  }

  const content = commands
    .map((command) => `${command.command}\n# cwd: ${command.cwd}\n# exit: ${command.exitCode ?? 'running'}`)
    .join('\n\n');

  return `
    <p class="eyebrow">${escapeHtml(label)}</p>
    <pre>${escapeHtml(content)}</pre>
  `;
}

function formatMetric(value, unit, allowSigned = false) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return `n/a ${unit}`;
  }
  const prefix = allowSigned && value > 0 ? '+' : '';
  return `${prefix}${value} ${unit}`;
}

function formatCorpus(corpus) {
  if (!corpus) {
    return 'not collected';
  }
  return `${corpus.documents} documents / ${corpus.issues} issues / ${corpus.weeks} weeks / ${corpus.users} users`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
