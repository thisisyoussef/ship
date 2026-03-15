# AI Cost Analysis

This project used only `OpenAI Codex Desktop`. No Anthropic tools, Cursor, Claude Code, Copilot, Gemini, or other agentic tools were used in the submitted work.

The analysis below is based on the repo-scoped local Codex logs for `/Users/youss/Development/gauntlet/ship` from `2026-03-09` through `2026-03-13`. I counted `32` non-automation Codex sessions and excluded `2` automation runs. The usage snapshot was frozen on `2026-03-13T14:59:19Z`, with the latest included `token_count` event at `2026-03-13T14:58:03.035Z`.

## Development Costs

### LLM API costs

- Provider: `OpenAI`
- Tool: `Codex Desktop`
- Model labels observed in the project logs: `gpt-5.4` and `gpt-5.3-codex-spark`
- Token-based cost estimate for the project work: `$204.976673*`
- Actual billed incremental cost: `$0*`

I used the Codex Max plan, so the real billed cost for this project work was effectively `$0`. The dollar figure above is a token-price estimate only, included as a reference point for how expensive this amount of usage would be outside the plan.

### Total tokens consumed

| Metric | Total |
| --- | ---: |
| Input tokens | 498,039,771 |
| Cached input tokens | 474,747,520 |
| Non-cached input tokens | 23,292,251 |
| Output tokens | 2,656,666 |
| Reasoning output tokens | 1,222,629 |
| Total tokens | 500,696,437 |

These totals come from the latest local `token_count` snapshot in each included session log.

### Number of API calls made

The local Codex logs do not expose an exact provider-side API request count, so I cannot give an exact number.

The closest measurable local proxy is `4,466` `token_count` checkpoints across the included sessions. That is useful as an activity count, but it is not a billing-grade API call count.

### Coding agent costs

- Coding agent used: `Codex Desktop` only
- Effective billed incremental coding-agent cost for this project: `$0*` under Codex Max
- Exact seat/subscription price: not available from the local evidence

## Which Parts Were AI Most Helpful For? Least Helpful For?

AI was most helpful for codebase comprehension and implementation across a large surface area. It sped up the initial repo read-through, helped trace the `web -> api -> shared` architecture, and made it practical to move through the seven required Phase 2 categories without losing context. It was also especially useful for evidence gathering and write-up work in `PHASE2_NOTES.md`, `discovery.md`, and the audit reporting artifacts.

AI was least helpful for exact cost accounting. The local logs were strong enough to recover tokens and session history, but not exact billed request counts, invoice-grade pricing, or seat cost. It was also less useful when the work shifted into derivative presentation/report phrasing instead of direct code inspection or implementation.

## Did AI Help Understanding, Or Did It Shortcut Understanding?

Mostly, AI helped understanding. The strongest sessions were the ones that read the repo first, then tied conclusions back to concrete files, routes, tests, and docs before making changes. That made it easier to build a working mental model of the system rather than only patching symptoms.

There was still some shortcut risk. Summary-style prompts and status write-ups could drift away from the source if they were not checked back against the code. That happened most clearly in merge-status and reporting work, where a quick summary was not reliable enough and had to be re-verified against the actual repo state.

## Where Did I Have To Override Or Correct AI Suggestions? Why?

I had to correct AI several times during the project:

- Branch and worktree handling had to be corrected when work ended up on the wrong branch or inside a disturbed checkout.
- Merge-status claims had to be corrected after deeper git and file-level verification.
- Push-target assumptions had to be corrected after checking whether work had gone to the fork or the main repo.
- Discovery document formatting had to be corrected when the numbering style was not what I wanted.
- For this cost analysis itself, I explicitly required an evidence-based answer with no guessing, because the clean-looking unsupported version would have been weaker than a narrower but defensible report.

Those corrections mattered because this assignment was not just about shipping code. It also required a reviewable process, accurate reporting, and proof that the conclusions matched the actual repo state.

## What Percentage Of The Final Code Changes Were AI-Generated Vs. Hand-Written?

For this project scope, the final code was `100%` AI-generated and `0%` hand-written.

That attribution is based on two things:

- `OpenAI Codex Desktop` was the only AI coding tool used on the project.
- The submitted code changes in scope were produced through those Codex sessions.

## Evidence Basis

This document is based on local project-scoped Codex evidence, including:

- `~/.codex/state_5.sqlite`
- `~/.codex/session_index.jsonl`
- `~/.codex/sessions/...`
- `~/.codex/archived_sessions/...`
- `npx @ccusage/codex@latest session -s 2026-03-09 -u 2026-03-13 -j`

No local billing export, invoice, or seat-pricing record was available, which is why the exact billed USD values beyond the Codex Max note could not be recovered from local evidence alone.

* I used the Codex Max plan, so actual billed incremental cost for this project work was effectively `$0`. Dollar figures in this document are token-price estimates for reference only.
