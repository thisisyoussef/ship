# Feature Spec

## Metadata
- Story ID: UI-HUMAN-CENTERED-GUARDRAILS
- Story Title: Add human-centered UI workflow guardrails and pack-level QA artifacts
- Author: Codex
- Date: 2026-03-17
- Related PRD/phase gate: FleetGraph MVP follow-on QA and future visible UI stories

## Problem Statement
The harness already requires visible proof and story-level UI inspection, but recent FleetGraph QA showed a recurring gap: primary UI can still leak technical jargon, action feedback can drift away from real outcomes, and visual follow-up work can get rediscovered ad hoc instead of being captured systematically. The harness needs a lightweight, durable way to check human-centered UI quality after visible stories and a single pack-level audit artifact for shipped UI slices.

## Story Pack Objectives
- Objective 1: Add a lightweight post-UI critic workflow focused on human-centered copy, truthful feedback, progressive disclosure for diagnostics, and modest visual hierarchy review.
- Objective 2: Thread those expectations into the existing visible-story workflow surfaces without bloating non-UI stories.
- Objective 3: Require a pack-level `user-audit-checklist.md` artifact when a visible story pack completes.
- Objective 4: Deliver the FleetGraph MVP pack checklist as the first concrete artifact using that rule.
- How this story or pack contributes to the overall objective set: it turns real FleetGraph QA pain into a reusable harness contract for future UI-visible work.

## User Stories
- As the user, I want UI stories to be checked for human-friendly wording and honest state feedback so the product feels calmer and more trustworthy.
- As the user, I want technical/debug details kept secondary so the main interface speaks my language first.
- As the user, I want one pack-wide audit checklist after a visible pack completes so I can QA the whole shipped slice from prod without reconstructing it from many story handoffs.
- As the maintainer, I want non-blocking UI findings to become suggested tail-end follow-on stories instead of disappearing into chat history.

## Acceptance Criteria
- [ ] AC-1: The harness includes a documented `ui-qa-critic` workflow for visible UI stories.
- [ ] AC-2: The workflow explicitly checks primary user-facing copy, truthful action feedback, diagnostic-detail containment, and modest visual hierarchy.
- [ ] AC-3: Core harness docs point visible UI stories at the critic workflow and pack-level audit artifact rule.
- [ ] AC-4: The UI prompt brief template captures primary-language rules, feedback-trust rules, and diagnostic disclosure policy.
- [ ] AC-5: The FleetGraph MVP pack has a full `user-audit-checklist.md` artifact with routes, interactions, and expected results against the public demo.
- [ ] AC-6: The wiring audit enforces the new workflow references and critic-content contract.

## Edge Cases
- Empty/null inputs: no deployed UI surface is available, so the critic must fall back to blocked-deploy or local-browser evidence.
- Boundary values: a visible story changes one component but does not complete a pack; the critic still runs, but the pack checklist rule does not.
- Invalid/malformed data: a UI story has no trustworthy success payload, so the critic must flag the action-feedback problem instead of inventing success copy.
- External-service failures: screenshot/browser tooling is unavailable, so the workflow falls back to manual route/click-path evidence.

## Non-Functional Requirements
- Security: no secrets or internal-only service details in primary user-facing copy guidance.
- Performance: additions stay lightweight and do not create a heavyweight QA stage for backend-only stories.
- Observability: critic findings reference visible evidence, not vague impressions.
- Reliability: follow-on stories are suggestions, not automatic scope growth.

## UI Requirements
- Required states: deployed proof, blocked proof fallback, story-level UI critic, full-pack audit checklist
- Accessibility contract: audit steps and copy guidance must reference visible text and recovery behavior, not hidden implementation details
- Visual-regression snapshot states: live screenshots or named visible proof artifacts should be referenced when available

## Out of Scope
- Automatically creating or merging follow-on implementation packs without user approval
- Replacing existing story-level UI inspection steps
- Redesigning product UI on this branch
- Requiring the critic for backend-only or trivial non-UI work

## Done Definition
- The new workflow exists and is wired into the relevant harness files.
- The FleetGraph MVP pack includes a full user audit checklist artifact.
- The UI prompt brief template reflects the new human-centered guardrails.
- The wiring audit passes.
