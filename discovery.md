# Discovery Write-Up

This write-up captures three things I learned from the audited baseline of the Ship codebase before the later improvement work. I drew each discovery from the audit findings and then traced it back to the code that revealed the pattern in practice.

## 1. AST-based type-safety auditing instead of grep-based counting

### 10. Name the thing I discovered

I discovered a much more reliable way to audit TypeScript safety by using an AST-based scan instead of depending on plain text search.

### 11. Where I found it in the codebase

- `docs/g4/audit-report.md`, lines 75-92

### 12. What it does and why it matters

The audit measured unsafe constructs such as `any`, type assertions, non-null assertions, and `@ts-ignore` comments by walking real TypeScript syntax across `web/`, `api/`, and `shared/`. That mattered because plain text search would have produced weaker results. It can overcount unrelated matches, miss context, and make the findings harder to defend. The AST-based approach gave a more trustworthy picture of where unsafe typing was actually concentrated, which made the type-safety section of the audit more precise and more useful.

### 13. How I would apply this knowledge in a future project

In a future project, I would use syntax-aware analysis for code-quality audits whenever I need to understand how a large TypeScript codebase is really behaving. That approach would help me find the real hotspots faster and make stronger recommendations based on actual code structure rather than noisy text matches.

## 2. A unified document model that treats many product entities as one underlying system

### 10. Name the thing I discovered

I discovered that Ship is built around a unified document model rather than separate data models for each feature area.

### 11. Where I found it in the codebase

- `docs/g4/audit-report.md`, lines 3-7
- `api/src/db/schema.sql`, lines 98-120
- `shared/src/types/document.ts`, lines 235-317

### 12. What it does and why it matters

The audit report made it clear that Ship follows the principle that everything is a document. Programs, projects, weeks, issues, plans, and retros all share the same core model. The schema supports that decision with a single `documents` table and a `document_type` enum, while the shared TypeScript types narrow that base model into variants such as `IssueDocument`, `ProjectDocument`, and `WeeklyRetroDocument`. This matters because it keeps the architecture consistent across the stack. Instead of maintaining disconnected models for each product surface, the system can reuse shared behavior while still preserving type-specific logic where it is needed.

### 13. How I would apply this knowledge in a future project

I would apply this pattern in a project where multiple entities share the same lifecycle, permissions, editing behavior, or relationships. I would keep the storage model simple and then use typed application-layer variants so the code remains both flexible and explicit.

## 3. The biggest frontend bundle cost came from the editor and collaboration architecture

### 10. Name the thing I discovered

I discovered that the heaviest frontend performance cost was tied to the editor and collaboration stack rather than ordinary interface code.

### 11. Where I found it in the codebase

- `docs/g4/audit-report.md`, lines 217-229
- `web/src/components/Editor.tsx`, lines 3-22
- `web/package.json`

### 12. What it does and why it matters

The audit showed that the main frontend bundle was large and that the editor and collaboration stack were a major reason why. Looking at the editor implementation explains that result. The editor pulls in TipTap, Yjs, collaboration extensions, syntax highlighting, tables, tasks, comments, and other rich editing capabilities. This mattered because it showed that the performance issue was connected to a deliberate product choice rather than random code bloat. The application's richest capability was also one of its most expensive technical costs.

### 13. How I would apply this knowledge in a future project

In a future project, if I knew the product depended on a rich editor or collaboration stack, I would plan route-level loading and chunk boundaries much earlier. That would let me preserve advanced functionality without making every user pay the full cost on initial load.
