# Constitution Check

## Story Metadata
- Story ID: AI-HARNESS-TDD-PIPELINE-HARDENING
- Story Title: Multi-agent TDD pipeline with property and mutation gates
- Date: 2026-03-16
- Author: Codex

## Constraints Review
- [x] Keeps the harness in `.ai/` as the live workspace instead of introducing a parallel control plane.
- [x] Preserves test-first execution, but replaces the single-agent black box with explicit file-based handoffs.
- [x] Adds objective quality gates without requiring product-runtime behavior changes.
- [x] Keeps repo-owned scripts/configs under version control for repeatable use.
- [x] Avoids direct edits to product APIs or UI behavior unrelated to the harness.

## Exceptions / Notes
- This story updates AI-architecture files, so `bash scripts/check_ai_wiring.sh` is a hard gate.
- The implementation focuses on harness contracts, helper scripts, and package support rather than a full autonomous agent runner.
