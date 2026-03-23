# AI Cost Analysis

This document separates two different cost views so the numbers stay honest:

- actual development spend attributed from the seat plans you said you used
- API-equivalent token math for the measured FleetGraph trace window
- production projections for the current FleetGraph model choice in this repo

All pricing references below were checked on March 22, 2026 against the linked official pricing pages.

## Development and Testing Costs

Measured development evidence comes from the captured FleetGraph Tuesday window already recorded in the repo:

- LangSmith project window: `2026-03-17T12:02:20Z` to `2026-03-17T12:32:47Z`
- `fleetgraph.runtime` root traces: `13`
- `fleetgraph.llm.generate` child invocations: `9`
- total tokens recorded on child runs: `6,310`
- estimated token split reused from the submission workbook: `5,386` input and `924` output

| Item | Amount |
| --- | --- |
| Claude API - input tokens | about `5,386` input tokens, or about `$0.0162` at Claude Sonnet 4.5 list pricing |
| Claude API - output tokens | about `924` output tokens, or about `$0.0139` at Claude Sonnet 4.5 list pricing |
| Total invocations during development | `9` measured `fleetgraph.llm.generate` invocations in the captured FleetGraph evidence window |
| Claude API-equivalent total | about `$0.0300` for that measured trace window |
| Claude Code Max attributed spend | about `$20.00`, using `10%` of Anthropic Max 20x at `$200/month` |
| Codex attributed spend | about `$10.62`, using `23%` of one week of ChatGPT Pro at `$200/month ÷ 4.33 weeks` |
| Total development spend | about `$30.62` in attributed seat cost for this assignment slice |

### Development Assumptions

- I treated your "Claude Code Max plan" as Anthropic Max 20x, because that is Anthropic's current top Max tier and the closest public match for heavy Claude Code usage.
- I treated your "Codex weekly plan" as a weekly share of ChatGPT Pro because OpenAI does not publish a standalone weekly Codex seat price. That is an inference, not a directly published Codex weekly SKU.
- If your Codex seat was actually ChatGPT Plus instead of Pro, the Codex portion would drop from about `$10.62` to about `$1.06`, and the total attributed development spend would drop from about `$30.62` to about `$21.06`.
- The Claude API numbers above are API-equivalent reference math, not billed Anthropic API invoice values. They exist because the assignment asks for a Claude input/output token breakdown, but your actual development spend came through seat-plan usage.

## Production Cost Projections

FleetGraph is currently configured to default to `gpt-5-mini` in code. OpenAI's public pricing page does not publish a separate `gpt-5-mini` row today, so the projection below uses the nearest current public proxy, `GPT-5.4 mini`, at `$0.75 / 1M` input tokens and `$4.50 / 1M` output tokens.

That makes this projection higher than the early Tuesday workbook snapshot, which used an older `gpt-5-mini` price assumption before the current public rate card refresh.

| 100 Users | 1,000 Users | 10,000 Users |
| --- | --- | --- |
| `$6.01/month` | `$60.12/month` | `$601.15/month` |

### Production Assumptions

- proactive runs per project per day: about `6`
- on-demand invocations per user per day: about `0.7`
- active project assumption: about `1` project per `4` users
- average tokens per invocation: about `701` total tokens
- estimated average token mix per invocation: about `598` input and `103` output
- estimated cost per run: about `$0.0009108`
- estimated runs per day:
  - `100` users: about `220`
  - `1,000` users: about `2,200`
  - `10,000` users: about `22,000`
- deterministic sweeps that find nothing are assumed to stay below the LLM path and are not counted as paid model invocations

## Sources

- FleetGraph trace evidence in repo:
  - [`docs/evidence/fleetgraph-mvp-evidence.md`](../../evidence/fleetgraph-mvp-evidence.md)
  - [`docs/assignments/fleetgraph/FLEETGRAPH.md`](./FLEETGRAPH.md)
  - [`api/src/services/fleetgraph/llm/factory.ts`](../../../api/src/services/fleetgraph/llm/factory.ts)
- Anthropic:
  - [Claude Max pricing](https://claude.com/pricing/max)
  - [Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- OpenAI:
  - [API pricing](https://openai.com/api/pricing/)
  - [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
  - [Codex rate card](https://help.openai.com/en/articles/20001106-codex-rate-card)
  - [ChatGPT Plus pricing](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus)
  - [ChatGPT Pro pricing](https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro)
