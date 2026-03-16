# TDD Pipeline Hardening

## Reusable Takeaways

- Use `.ai/workflows/tdd-pipeline.md` whenever a story changes tests plus production code.
- Treat `.ai/state/tdd-handoff/<story-id>/` as the source of truth for stage ownership and RED/GREEN evidence.
- Keep Agent 1 limited to the spec, public API surface, and existing tests so the test contract stays adversarial.
- Record Agent 2 objections in `agent2-escalations/` instead of modifying Agent 1 tests.
- Run property tests after example tests are green for data-transform, CRUD, sorting/filtering, or state-transition stories.
- Run `scripts/run_targeted_mutation.sh` on changed files after green when mutation coverage is part of the story contract.
