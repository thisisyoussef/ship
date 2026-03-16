# Final Demo Script: GitHub Actions Reproduction Path

Use this script for the final recording after the reproducibility feedback.

Open these tabs before you start:

- `README.md` audit submission section
- `docs/archive/g4/commit-map.md`
- `https://github.com/thisisyoussef/ship/actions/workflows/audit-runner.yml`
- `https://github.com/thisisyoussef/ship/actions/runs/23119211004`

This full run is the current source of truth for the demo:

- baseline SHA: `076a18371da0a09f88b5329bd59611c4bc9536bb`
- submission SHA: `563581aad8ec5e445c79faa0dbc1d97869df629e`
- Type safety: `1294 -> 904`
- Bundle size: `2025.14 KB -> 287.05 KB`
- API response time: `1136.3 ms -> 111.82 ms`
- DB efficiency: `10 -> 4`
- Test quality: `50% -> 100%`
- Runtime handling: `1 -> 0`
- Accessibility: `8 -> 0`

## 1. Audit Entry

"The final submission starts in the repo, not in a slide deck. The audit submission section links directly to the GitHub Actions workflow, the run history, the latest verified full run, the measured submission branch, and the baseline repo. That means another engineer can start from the same links I am using right now."

**Next when you say:** "the same links I am using right now"

## 2. Workflow Page

"This workflow is prefilled for the canonical comparison: Treasury `master` as the baseline and my `codex/submission-clean` branch as the submission. The workflow entrypoint lives on `master` for GitHub dispatch compatibility, but it immediately checks out `codex/submission-clean` before running the harness, so the measured code path stays correct."

**Next when you say:** "the measured code path stays correct"

## 3. Full Run Shape

"This is the authoritative successful run. The structure matters: there is one kickoff job, seven separate category jobs, and one aggregate report job. So each category has its own logs, commands, evidence bundle, and result instead of disappearing inside one opaque shell step."

**Next when you say:** "one opaque shell step"

## 4. Kickoff Proof

"Kickoff records the exact baseline repo and ref, the exact submission repo and ref, and the runtime corpus of five hundred eighty documents, one hundred five issues, thirty-five weeks, and twenty-three users. That answers the reproducibility question before any benchmark starts."

**Next when you say:** "before any benchmark starts"

## 5. Scorecard

"The final measured result on this run is: type safety from 1,294 to 904, bundle entry cost from 2,025.14 kilobytes to 287.05, API P95 from 1,136.3 milliseconds to 111.82, sprint-board statements from 10 to 4, test quality from 50 percent to 100 percent, runtime issues from 1 to 0, and accessibility issues from 8 to 0."

**Next when you say:** "accessibility issues from eight to zero"

## 6. Category 1

"Category 1 shows the exact type-check commands, then an AST scan for explicit `any`, `as`, non-null assertions, and TypeScript ignore directives. The point here is that strict mode already existed. The real problem was unsafe trust at route boundaries, especially in `weeks.ts`, `projects.ts`, `issues.ts`, and the unified document path."

**Next when you say:** "unsafe trust at route boundaries"

## 7. Category 2

"Category 2 runs a real Vite production build with source maps, then parses the emitted manifest to find the actual entry chunk. That is why the report can talk about startup cost instead of just total app size. The measured win is route-level lazy loading, which is why users stop paying the editor and collaboration cost on first load."

**Next when you say:** "on first load"

## 8. Category 3

"Category 3 seeds the canonical corpus, authenticates as the seed admin user, and hits the measured endpoints at concurrency ten, twenty-five, and fifty with two hundred requests per band. The slowest measured path dropped from 1,136.3 milliseconds to 111.82. The reason was not a bad SQL plan. It was repeated session writes and repeated serialization, so the fix throttled activity writes and cached serialized list responses."

**Next when you say:** "cached serialized list responses"

## 9. Category 4

"Category 4 traces the SQL for `GET /api/weeks/:id/issues` and reports the exact statements. Baseline paid for 10 statements. Submission paid for 4. That is important because the fix was not a speculative index. It was collapsing sprint verification and issue loading into fewer access-aware queries while preserving the same behavior."

**Next when you say:** "while preserving the same behavior"

## 10. Category 5

"Category 5 goes deeper than a single percent. The headline is built from the repo's own API and web suites. In the verified baseline run, the API suite was 451 out of 451, but the web suite was 138 pass and 13 fail, so the category landed at 50 percent. In submission, the API suite was 454 out of 454 and the web suite was 161 out of 161, so the category reached 100 percent."

**Next when you say:** "the category reached one hundred percent"

## 11. Category 5 Evidence

"The report also lists the exact failed tests by name, not just totals. That includes the failing `DetailsExtension`, `useSessionTimeout`, and `document-tabs` cases in baseline. There is also a repeated Playwright stale-data run stored as supplemental evidence. I keep that separate on purpose: the headline reflects suite health, and the repeated Playwright run is extra stability proof rather than a hidden scoring rule."

**Next when you say:** "extra stability proof"

## 12. Category 6

"Category 6 combines focused Vitest coverage with runtime Playwright flows. The baseline problem was that direct document entry could still be interrupted by the action-items modal and the recovery path was weak. Submission passes the error-boundary test and the runtime flows, so the category drops from one runtime issue to zero."

**Next when you say:** "from one runtime issue to zero"

## 13. Category 7

"Category 7 runs Playwright plus axe against the same seeded corpus. In baseline, the audited pages had eight issues: one docs-tree structure issue, two docs-tree axe violations, and five `my-week` contrast violations. Submission drops that to zero, and the report shows which rules failed instead of just giving a green badge."

**Next when you say:** "instead of just giving a green badge"

## 14. Aggregate Report

"Once the seven category jobs finish, the aggregate job merges them into one readable artifact bundle. That bundle includes `comparison.json`, `diagnostics/report.md`, `dashboard.html`, and both per-target summaries. The report also gives direct reproduction commands using `git clone`, `pnpm install`, `pnpm build:shared`, `pnpm exec playwright install`, and `node ./scripts/audit/cli.mjs`."

**Next when you say:** "direct reproduction commands"

## 15. Commit Map

"The other half of the feedback was commit isolation. This commit map answers that directly. The first-parent `master` trail shows the canonical category merges: `7ccde92`, `51068df`, `8002425`, `71e4591`, `409fe1d`, `f3bf6ed`, and `be396af`. Then `codex/submission-clean` replays those category changes and adds the reproducibility chain for the harness, reporting, GitHub Actions execution, artifact handling, and reliability fixes."

**Next when you say:** "the reproducibility chain"

## 16. Close

"So the final submission is not just a set of improvements. It is a reproducible engineering record. A reviewer can open the workflow, inspect a successful run, drill into any single category, read the exact commands and artifacts, and then cross-check the commit map to see exactly where each change came from."

**End after:** "exactly where each change came from"
