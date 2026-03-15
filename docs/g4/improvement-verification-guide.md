# Improvement Verification Guide

If the grader wants the exact commit and merge lineage for Categories 1-7, start with [docs/g4/commit-map.md](./commit-map.md). That page labels the canonical `master` merge for each category, the clean `codex/submission-clean` replay commits used by the audit harness, and the later aggregate or submission-only merges that should not be used for category attribution.

GitHub Actions workflow:

- `https://github.com/thisisyoussef/ship/actions/workflows/audit-runner.yml`
- the workflow checks out `codex/submission-clean` before running the harness
- the workflow form is prefilled with the canonical baseline and submission repos/refs
- leave `run_id` and `callback_base_url` blank when running directly from GitHub Actions
- viewing logs and artifacts is the primary hosted verification path
- each category runs as its own labeled GitHub Actions job
- the final aggregate job renders the readable before/after category table
- the uploaded aggregate artifact includes `diagnostics/report.md` with exact commands, SHAs, reproduction recipes, and per-category detail
- manually clicking `Run workflow` requires repository permission

Local fallback:

```bash
pnpm audit:grade
```

Hosted dashboard after Render deploy:

- `https://audit-dashboard-yner.onrender.com`
- password is provided with the submission, not committed in this repo

That command compares Treasury `master` against the current checkout, prepares the canonical corpus, runs all seven categories, and writes:

```text
artifacts/g4-repro/<run-id>/dashboard.html
```

## Copyable Reproduction Recipes

Easy mode:

```bash
git clone --branch codex/submission-clean https://github.com/thisisyoussef/ship.git ship-audit-submission
cd ship-audit-submission
pnpm install --frozen-lockfile
pnpm audit:grade --baseline-repo https://github.com/US-Department-of-the-Treasury/ship.git --baseline-ref master
```

Manual mode:

```bash
git clone --branch master https://github.com/US-Department-of-the-Treasury/ship.git ship-audit-baseline
git clone --branch codex/submission-clean https://github.com/thisisyoussef/ship.git ship-audit-submission
cd ship-audit-submission
pnpm install --frozen-lockfile
pnpm audit:grade --baseline-dir ../ship-audit-baseline --submission-dir .
```

## What The Grader Sees

- exact commands run for every category
- resolved repo URLs, refs, and SHAs
- canonical corpus counts for runtime-backed categories
- raw per-target summaries plus one comparison artifact
- a readable Markdown report in `diagnostics/report.md`
- a generated HTML dashboard with before/after metrics and root-cause notes
- GitHub Actions job steps, command logs, and uploaded workflow artifacts

## Fast Category Reruns

```bash
pnpm audit:grade --category type-safety
pnpm audit:grade --category bundle-size
pnpm audit:grade --category api-response
pnpm audit:grade --category db-efficiency
pnpm audit:grade --category test-quality
pnpm audit:grade --category runtime-handling
pnpm audit:grade --category accessibility
```

## Hosted Flow

GitHub Actions is the execution plane. The hosted app is the read and control surface.

GitHub Actions exposes:

- the `Audit Runner` workflow page
- one visible job per category, with category-specific logs and evidence
- one final aggregate report job that merges category outputs into the final report
- uploaded raw output artifacts for each category plus the aggregate report

The hosted app is password-gated and exposes:

- `Run full comparison`
- one button for each category
- latest result plus short history
- direct artifact downloads for `baseline-summary.json`, `submission-summary.json`, `comparison.json`, `dashboard.html`, and `bundle.tgz`

The GitHub Actions runner posts the exact same artifacts the local CLI writes back into the dashboard, so the hosted result and the local reproduction path stay aligned.

For the official grading path, start with the Actions workflow page and the latest hosted artifacts. If the grader cannot manually trigger the workflow, the fallback remains `pnpm audit:grade` locally.
