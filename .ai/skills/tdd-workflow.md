# TDD Workflow (Red-Green-Refactor)

## Purpose
Enforce test-first delivery for every behavior change in Ship.

## Non-Negotiables
- No implementation without a failing test first.
- Every bug fix starts with a reproducing test.
- Refactors are behavior-preserving and test-backed.

## Cycle

### 1) RED
- Write the smallest failing test that captures desired behavior.
- Use explicit Given/When/Then docstring blocks.
- Confirm failure reason is expected.

### 2) GREEN
- Implement the smallest code change to pass the failing test.
- Avoid premature abstractions.
- Re-run focused tests first, then broader suite.

### 3) REFACTOR
- Improve readability/structure while keeping tests green.
- Extract duplication and simplify branching.
- Keep files/functions within size targets.

## Test Design Checklist
- [ ] Happy path exists
- [ ] Invalid input path exists
- [ ] Boundary conditions covered
- [ ] External failure behavior covered
- [ ] Error message is safe and actionable

## Command Loop
```bash
<focused-test-command>
<focused-test-command> --maxfail=1
<broader-test-command>
```

## Completion Criteria
- New behavior is fully specified by tests.
- All relevant suites pass.
- Coverage remains above target.
