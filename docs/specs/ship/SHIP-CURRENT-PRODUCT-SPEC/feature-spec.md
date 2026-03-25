# Feature Spec

## Metadata

- Story ID: US-101
- Story Title: Current product spec pack
- Author: Codex
- Date: 2026-03-25
- Related phase gate: Phase 1 core Ship baseline documentation

## Problem Statement

Ship’s current product behavior is spread across route files, page components, shared types, core docs, and FleetGraph assignment material. A new engineer can recover the truth from the repo, but it takes significant code spelunking to understand what the product actually does today, what is core versus optional, and which capabilities are shared versus document-type-specific. The repo needs a single, implementation-ready spec pack that consolidates the current product into a handoffable contract.

## Pack Objectives

- Objective 1: Describe the current product surface area in one place, including main routes, document tabs, supporting admin/settings/auth flows, and FleetGraph.
- Objective 2: Capture the current domain/data model so the engineer understands Ship’s unified-document architecture and weekly/accountability workflow.
- Objective 3: Capture the current backend capability map and collaboration model, including REST, WebSocket, uploads, comments, history, and caching/offline behavior.
- Objective 4: Sequence the implementation into a practical rebuild order instead of leaving the engineer with a flat pile of observations.
- Objective 5: Preserve repo-grounded truth by anchoring the pack in code and living docs instead of chat memory.

## User Stories

- As a product lead, I want a checked-in product spec folder so I can hand it to an engineer as a build contract.
- As an engineer joining Ship, I want a route, domain, and API map so I can reconstruct the current behavior without reading every file first.
- As a maintainer, I want FleetGraph documented as part of the actual product surface, not buried in assignment-only docs.

## Acceptance Criteria

- [ ] AC-1: The spec pack exists at `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/` and includes an index plus implementation-oriented supporting docs.
- [ ] AC-2: The pack documents all major product surfaces currently reachable from the frontend route map, including auth/public/admin/settings routes and the main in-app modes.
- [ ] AC-3: The pack documents the unified document model, week/accountability philosophy, associations, visibility, approvals, conversions, and FleetGraph-specific storage contracts.
- [ ] AC-4: The pack documents shared editor/collaboration behavior and the current REST/WebSocket capability map closely enough for an engineer to reproduce the current feature set.
- [ ] AC-5: The pack includes a practical build/rebuild sequence instead of just descriptive notes.

## Edge Cases

- The product contains both current and transitional patterns; the pack must label deprecated or transitional areas instead of pretending they do not exist.
- Some behavior is cross-cutting rather than route-local, especially the shared editor, collaboration substrate, and FleetGraph overlays.
- Several legacy route aliases redirect into `/documents/:id/*`; the spec must distinguish canonical routes from compatibility routes.
- FleetGraph behavior spans proactive queue state, on-demand analysis, follow-up conversation turns, and human-in-the-loop review/apply flows.

## Non-Functional Requirements

- Accuracy: every section must be backed by checked-in repo evidence.
- Completeness: every major route family and document type must appear somewhere in the pack.
- Implementability: the pack should tell an engineer what to build, not just what the repo contains.
- Traceability: sections should identify the canonical local sources they were derived from.

## Out Of Scope

- Redesigning the product information architecture
- Proposing new features beyond the current implementation
- Rewriting or normalizing current code patterns
- Producing a pixel-perfect visual design system document

## Done Definition

- The spec pack can stand on its own as a current-state engineer handoff.
- The pack names the core product areas, the major shared behaviors, and the current backend contract surfaces.
- The task breakdown gives a coherent implementation order for rebuilding the product.
- Queue and checkpoint docs are updated so the work is discoverable from the repo alone.
