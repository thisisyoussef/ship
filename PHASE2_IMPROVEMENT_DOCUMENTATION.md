# Phase 2 Improvement Summary

This file is now just a pointer to the reproducible submission flow. The authoritative evidence for final grading comes from the audit harness output, not from handwritten checkpoints.

Primary entrypoints:

- `pnpm audit:grade`
- [docs/g4/methodology.md](./docs/g4/methodology.md)
- [docs/g4/improvement-verification-guide.md](./docs/g4/improvement-verification-guide.md)
- [docs/g4/commit-map.md](./docs/g4/commit-map.md)
- [docs/g4/audit-report.md](./docs/g4/audit-report.md)

Authoritative artifact layout:

```text
artifacts/g4-repro/<run-id>/baseline/summary.json
artifacts/g4-repro/<run-id>/submission/summary.json
artifacts/g4-repro/<run-id>/comparison.json
artifacts/g4-repro/<run-id>/dashboard.html
```

Use the hosted dashboard at `https://audit-dashboard-yner.onrender.com` when you want the same comparison to run virtually. The hosted dashboard is password-gated; the credential is supplied with the submission rather than committed into the repo.
