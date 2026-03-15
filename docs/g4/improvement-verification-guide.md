# Improvement Verification Guide

Start here:

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
- a generated HTML dashboard with before/after metrics and root-cause notes

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

## Render Dashboard Flow

The hosted app is password-gated and exposes:

- `Run full comparison`
- one button for each category
- latest result plus short history
- direct artifact downloads for `baseline-summary.json`, `submission-summary.json`, `comparison.json`, `dashboard.html`, and `bundle.tgz`

The GitHub Actions runner posts the exact same artifacts the local CLI writes back into the dashboard, so the hosted result and the local reproduction path stay aligned.

For the official grading path, start with `pnpm audit:grade` locally. Use the hosted dashboard when you want to trigger the same comparison virtually or inspect the latest generated `summary.json`, `comparison.json`, and `dashboard.html` artifacts without rerunning everything on your own machine.
