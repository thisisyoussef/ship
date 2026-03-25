# Feature Spec

## Metadata

- Story ID: US-102
- Story Title: Expanded current product spec blueprint
- Author: Codex
- Date: 2026-03-25
- Related phase gate: Phase 1 core Ship baseline documentation

## Problem Statement

US-101 created a first-pass current-product pack, but it still leaves too much implied knowledge in the route files, shared components, and route handlers. A new engineer can now find the major modules, but still has to reverse-engineer exact route rules, state handling, field-level contracts, compatibility behavior, and mutation flows from source. The repo needs a second-pass blueprint expansion so the pack reads like a build contract instead of a summary.

## Pack Objectives

- Objective 1: Expand the route contract so canonical routes, redirects, query params, tab parsing, shell mode derivation, and hidden/legacy behaviors are explicit.
- Objective 2: Expand the screen contract so loading, empty, blocked, review, and mutation-result states are documented for every major surface.
- Objective 3: Expand the domain/data contract so field-level document properties, enums, approvals, computed fields, and compatibility shims are spelled out.
- Objective 4: Expand the workflow contract so create/update/delete/review/apply flows are described in user-facing and backend-facing terms.
- Objective 5: Keep the pack repo-grounded by correcting transitional areas instead of flattening them into idealized product prose.
- Objective 6: Make the pack usable as a rebuild checklist and acceptance contract, not just as a discovery guide.

## User Stories

- As a product lead, I want a checked-in product spec folder that is detailed enough to hand to an engineer as a build blueprint.
- As an engineer joining Ship, I want route rules, state rules, field definitions, and action contracts so I can rebuild current behavior without reading every file first.
- As a maintainer, I want transitional and legacy behavior documented honestly so future cleanup work starts from the true current state.

## Acceptance Criteria

- [ ] AC-1: The spec pack exists at `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/` and includes dedicated blueprint docs for routing/navigation, screen states, shared interaction patterns, document field reference, workflow/action contracts, and acceptance/rebuild criteria.
- [ ] AC-2: The pack documents all major product surfaces currently reachable from the frontend route map, including auth/public/admin/settings routes, team routes, document detail flows, and FleetGraph.
- [ ] AC-3: The pack documents the unified document model, per-type property fields, associations, approvals, visibility, compatibility layers, and conversion/storage behavior closely enough for an engineer to rebuild the data model.
- [ ] AC-4: The pack documents the current shared editor/collaboration behavior and the current REST/WebSocket/service capability map closely enough for an engineer to reproduce the current feature set.
- [ ] AC-5: The pack documents the major user-triggered action flows, including week/accountability actions, review flows, conversions, team operations, feedback intake, admin actions, and FleetGraph review/apply behavior.
- [ ] AC-6: The pack includes a practical rebuild order plus an acceptance checklist instead of only descriptive notes.

## Edge Cases

- The product contains both current and transitional patterns; the pack must label deprecated or transitional areas instead of pretending they do not exist.
- Some behavior is cross-cutting rather than route-local, especially the shared editor, collaboration substrate, and FleetGraph overlays.
- Several legacy route aliases redirect into `/documents/:id/*`; the spec must distinguish canonical routes from compatibility routes.
- FleetGraph behavior spans proactive queue state, on-demand analysis, follow-up conversation turns, and human-in-the-loop review/apply flows.
- Conversions are a current example of a split model: the active mutation path is in-place and snapshot-based, while some user-facing copy and the conversion-history page still describe or surface the older archived-original/new-document pattern.
- Person documents use `properties.user_id` as a real runtime contract even though the shared type definition lags behind that truth.
- Sprint/week ownership and completeness also straddle old and new shapes: week authoring uses `owner_id`, while some older sprint paths still read `assignee_ids[0]`.

## Non-Functional Requirements

- Accuracy: every section must be backed by checked-in repo evidence.
- Completeness: every major route family and document type must appear somewhere in the pack.
- Implementability: the pack should tell an engineer what to build, not just what the repo contains.
- Traceability: sections should identify the canonical local sources they were derived from.
- Usability: an engineer should be able to answer “what route?”, “what state?”, “what fields?”, and “what mutation?” from the docs without first opening the source.

## Out Of Scope

- Redesigning the product information architecture
- Proposing new features beyond the current implementation
- Rewriting or normalizing current code patterns
- Producing a pixel-perfect visual design system document

## Done Definition

- The spec pack can stand on its own as a current-state engineer handoff.
- The pack names the core product areas, the major shared behaviors, the field-level contracts, and the current backend contract surfaces.
- The task breakdown and acceptance checklist give a coherent implementation and verification order for rebuilding the product.
- Queue and checkpoint docs are updated so the follow-up blueprint pass is discoverable from the repo alone.
