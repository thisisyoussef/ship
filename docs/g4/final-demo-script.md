# Final Demo Script

This script matches the slide order in `docs/g4/final-demo-visual.html`.
Read the bold cue at the end of each section, then advance.
At a normal pace this lands around 3.5 to 4 minutes.

## 1. Cover

"This is Ship, a production TypeScript monorepo from the U.S. Department of the Treasury. I audited and improved it across seven required categories, using before-and-after measurements on a realistic seeded dataset instead of an empty local database."

**Next when you say:** "before-and-after measurements"

## 2. Scorecard

"Here is the full result up front. I cleared all seven categories: type safety dropped from 1291 unsafe escapes to 902, the main entry bundle dropped from 2025 kilobytes to 287, the slowest API path dropped from 980 milliseconds to 136 at P95, sprint-board queries dropped from five to three, failing web tests went from thirteen to zero, I shipped three runtime trust fixes, and axe critical plus serious accessibility issues went from five to zero on the audited pages."

**Next when you say:** "five to zero on the audited pages"

## 3. Type Safety

"For type safety, strict mode was already on, so configuration was not the issue. The issue was concentrated unsafe typing at the API boundary, and I fixed the densest routes first: weeks, projects, issues, and the unified document page."

**Next when you say:** "the densest routes first"

## 4. Type Safety Proof

"This is a representative example from `weeks.ts`. Before, the route relied on non-null assertions and `as string` casts. After, it used a shared auth helper, Zod query parsing, and typed rows, so the route stopped guessing and started narrowing. That pattern is why `weeks.ts` alone went from eighty-five local violations to zero."

**Next when you say:** "eighty-five local violations to zero"

## 5. Bundle

"For bundle size, the total bundle stayed large because the app still has a heavy editor stack, but that was not the user-facing win I was targeting. The important fix was initial load cost: the main entry chunk dropped by almost eighty-six percent, which means users no longer pay the editor and collaboration tax on every first paint."

**Next when you say:** "every first paint"

## 6. Bundle Proof

"The root cause was that route pages were statically imported into the entrypoint. I changed those to lazy route chunks with Suspense, and I kept React Query Devtools out of production. The result was a much smaller startup payload without removing any product capability."

**Next when you say:** "without removing any product capability"

## 7. Performance

"For API and database performance, the key lesson was to fix the hot path, not the wrong layer. The slowest route was `GET /api/documents`, but the database plans were already cheap. The real cost was repeated session writes, repeated serialization, and unnecessary round trips."

**Next when you say:** "unnecessary round trips"

## 8. API Proof

"This change shows that clearly. Instead of writing `last_activity` on every authenticated request, I throttled those writes, and I added a short-lived cache for serialized document-list responses. That dropped `GET /api/documents` from nine hundred eighty milliseconds to one hundred thirty-six at P95 under concurrency fifty."

**Next when you say:** "under concurrency fifty"

## 9. DB Proof

"For query efficiency, I did not add a speculative index because the measurements did not support that. The better fix was collapsing sprint verification and issue fetch into one access-aware query, which cut the sprint-board flow from five queries to three while preserving the same `404` and empty-state behavior."

**Next when you say:** "the same 404 and empty-state behavior"

## 10. Tests And Runtime

"On test quality, the repo already had strong infrastructure, but suite health was not clean. I took the failing web suite from one hundred thirty-three pass and thirteen fail to one hundred fifty-three pass and zero fail, fixed a real flake, and added regression coverage in collaboration and retrieval paths. In parallel, I fixed three runtime trust issues: session noise, blocked editor entry, and weak recovery UI."

**Next when you say:** "weak recovery UI"

## 11. Tests Proof

"This flake fix is representative. The old test reused state and depended on a fixed sleep. I replaced that with isolated week data and API-backed polling, so the test became deterministic instead of lucky. After the change, it passed ten out of ten repeated runs."

**Next when you say:** "ten out of ten repeated runs"

## 12. Runtime Proof

"This was the clearest user-facing runtime bug. The action-items modal could auto-open on document routes and steal focus from the editor. I fixed it by separating automatic versus manual modal policy and making that logic route-aware. On screen, you can see the intended result: the modal still appears on `my-week`, where it belongs, but document routes open straight into the editor. The result is simple: document pages are interactive on first click instead of feeling broken."

**Next when you say:** "interactive on first click"

## 13. Accessibility

"Accessibility was where cross-checking mattered most. Lighthouse looked clean, but axe found critical semantics and serious contrast issues. After the fixes, `/docs`, document detail, and `/my-week` all dropped to zero critical and zero serious issues in the audited scans."

**Next when you say:** "zero critical and zero serious issues"

## 14. Accessibility Proof

"These fixes were structural, not cosmetic. I moved invalid children out of the tree widget, and I raised contrast on the current-week badge and future rows in `my-week`. On the right, the live app shots show the visible outcome of those code changes on the docs tree and the my-week page. So the app is not just scoring better; the semantics and keyboard experience are actually more correct."

**Next when you say:** "actually more correct"

## 15. Close

"The main takeaway is that I kept Ship's architecture and improved the edges where users and engineers were paying the cost. This project reinforced a production habit I care about: measure first, find the real bottleneck, and make the smallest change that materially improves the system."

**End after:** "materially improves the system"

## Optional Trim For A Faster Recording

If you need to get closer to 3 minutes, shorten these slides to one sentence each:

- Slide 4: keep only the last sentence about `weeks.ts` going from 85 to 0.
- Slide 9: keep only the sentence about five queries dropping to three.
- Slide 11: keep only the sentence about ten out of ten repeated passes.
