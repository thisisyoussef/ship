# Phase 2 Improvement Summary

This file is now a compact pointer to the reproducible audit flow.

Primary entrypoints:

- `pnpm audit:grade`
- [docs/g4/methodology.md](./docs/g4/methodology.md)
- [docs/g4/improvement-verification-guide.md](./docs/g4/improvement-verification-guide.md)
- [docs/g4/commit-map.md](./docs/g4/commit-map.md)

Historical before/after checkpoints carried forward into the clean branch:

| Category | Historical before | Historical after |
| --- | ---: | ---: |
| Type Safety | `1291` AST-audited violations | `902` violations |
| Bundle Size | `2025.10 KB` main entry chunk | `287.05 KB` documented target |
| API Response | `/api/documents` p95 `980 ms` at c50 | `/api/documents` p95 `136 ms` |
| DB Efficiency | `5` route-local queries | `3` route-local queries |

The official grading path should use the harness output under `artifacts/g4-repro/<run-id>/`, not the historical note above.
