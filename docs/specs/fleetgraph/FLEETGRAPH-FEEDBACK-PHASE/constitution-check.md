# Constitution Check

## Story Context
- Story ID: FLEETGRAPH-FEEDBACK-PHASE
- Story Title: Define the first FleetGraph post-MVP feedback pack
- Owner: Codex
- Date: 2026-03-17

## Architecture Constraints
- [x] The pack keeps FleetGraph on the same REST-only Ship data boundary.
- [x] The pack does not introduce direct FleetGraph reads from Ship product tables.
- [x] The pack focuses on UI inspectability, navigation, and usability on top of the shipped MVP path.

## Technology Constraints
- [x] Uses the existing Ship web/api stack and deployed Railway demo path.
- [x] No new runtime provider or deployment platform is required for this planning pack.
- [x] Any follow-on implementation should preserve the current Railway public proof lane while keeping AWS production untouched unless explicitly needed.

## Quality Constraints
- [x] TDD-first execution remains required for downstream implementation stories.
- [x] Future visible stories must remain inspectable from the sanctioned public demo.
- [x] The pack ends with a refreshed UI audit path so user QA stays concrete after the fixes land.

## Security Constraints
- [x] No hardcoded secrets added.
- [x] Demo usability fixes must not weaken existing auth, CSRF, or service-auth boundaries.
- [x] Discoverability improvements must not expose private-only content outside existing Ship access rules.

## Performance Constraints
- [x] Navigation fixes should not degrade core page-load behavior or introduce unbounded list rendering.
- [x] Scroll fixes should preserve the existing editor and tab layouts without adding extra nested scroll traps.

## UI-Specific Constraints
- [x] The pack must make FleetGraph proof lanes reachable from normal UI navigation, not just popup or command-palette entry.
- [x] The pack must keep the deployed document page usable for manual QA, including vertical scrolling on the affected week pages.
- [x] The pack should end with a refreshed pack-level user audit checklist for full UI verification.

## Exceptions
- Exception: None.
- Rationale: N/A
- Approval: N/A

## Result
- [x] Constitution check passed
- [ ] Blocking issues identified (list below)

Blocking issues:
- None.
