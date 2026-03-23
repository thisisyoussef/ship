# AI Cost Analysis

I separated this write-up into two different cost views so the numbers stay honest:

- my attributed development spend from the seat plans I used
- OpenAI API-equivalent token math for the measured FleetGraph trace window
- production projections for the model the live FleetGraph deployment is actually tracing today, with the repo default called out separately

I refreshed the LangSmith trace evidence on March 22, 2026 and March 23, 2026 UTC, and I checked the pricing references below on March 22, 2026 against the linked official pricing pages.

## Development and Testing Costs

I based the measured development evidence on the captured FleetGraph Tuesday window already recorded in the repo, then re-verified that same window directly through the `ship-fleetgraph` LangSmith CLI project:

- LangSmith project window: `2026-03-17T12:02:20Z` to `2026-03-17T12:32:47Z`
- `fleetgraph.runtime` root traces: `13`
- `fleetgraph.llm.generate` child invocations: `9`
- total tokens recorded on child runs: `6,310`
- estimated token split reused from the submission workbook: `5,386` input and `924` output

| Item | Amount |
| --- | --- |
| OpenAI API-equivalent input tokens | about `5,386` input tokens, or about `$0.0008` at current `GPT-4o mini` list pricing |
| OpenAI API-equivalent output tokens | about `924` output tokens, or about `$0.0006` at current `GPT-4o mini` list pricing |
| Total invocations during development | `9` measured `fleetgraph.llm.generate` invocations in the captured FleetGraph evidence window |
| OpenAI API-equivalent total | about `$0.0014` for that measured trace window |
| Claude Code Max attributed spend | about `$20.00`, using `10%` of Anthropic Max 20x at `$200/month` |
| Codex attributed spend | about `$10.62`, using `23%` of one week of ChatGPT Pro at `$200/month ÷ 4.33 weeks` |
| Total development spend | about `$30.62` in attributed seat cost for this assignment slice, with the API-equivalent math shown separately for reference |

### Development Assumptions

- I treated my "Claude Code Max plan" as Anthropic Max 20x, because that is Anthropic's current top Max tier and the closest public match for heavy Claude Code usage.
- I treated my "Codex weekly plan" as a weekly share of ChatGPT Pro because OpenAI does not publish a standalone weekly Codex seat price. That is an inference, not a directly published Codex weekly SKU.
- If my Codex seat was actually ChatGPT Plus instead of Pro, the Codex portion would drop from about `$10.62` to about `$1.06`, and the total attributed development spend would drop from about `$30.62` to about `$21.06`.
- The Tuesday CLI re-query matched the earlier workbook numbers exactly: `13` root traces, `9` LLM child invocations, and `6,310` total child-run tokens in that recorded window.
- The public Railway traces I refreshed on March 23, 2026 show the live deployment currently running `gpt-4o-mini-2024-07-18`, even though the checked-in fallback default in `api/src/services/fleetgraph/llm/factory.ts` is still `gpt-5-mini` when `FLEETGRAPH_OPENAI_MODEL` is unset.
- I normalized the measured token window to the live traced `GPT-4o mini` rate so the API-equivalent math matches what the deployed FleetGraph runtime is actually doing today instead of the repo fallback default.
- The OpenAI API-equivalent numbers above are reference math, not billed OpenAI invoice values. My actual development spend came through seat-plan usage.

## Production Cost Projections

The live March 23, 2026 LangSmith traces I refreshed today show the current FleetGraph deployment running `gpt-4o-mini-2024-07-18`, so I used `GPT-4o mini` pricing at `$0.15 / 1M` input tokens and `$0.60 / 1M` output tokens for the projection below. I am keeping the repo-default note explicit: if `FLEETGRAPH_OPENAI_MODEL` is unset, the checked-in fallback in `api/src/services/fleetgraph/llm/factory.ts` is still `gpt-5-mini`.

That makes this projection lower than the earlier workbook and proxy-based draft, because it now follows the actual traced live model instead of a `gpt-5-mini` or `GPT-5.4 mini` stand-in.

| 100 Users | 1,000 Users | 10,000 Users |
| --- | --- | --- |
| `$1.00/month` | `$10.00/month` | `$99.99/month` |

### Production Assumptions

I assumed:

- proactive runs per project per day: about `6`
- on-demand invocations per user per day: about `0.7`
- active project assumption: about `1` project per `4` users
- average tokens per invocation: about `701` total tokens
- estimated average token mix per invocation: about `598` input and `103` output
- estimated cost per run: about `$0.0001515`
- estimated runs per day:
  - `100` users: about `220`
  - `1,000` users: about `2,200`
  - `10,000` users: about `22,000`
- deterministic sweeps that find nothing are assumed to stay below the LLM path and are not counted as paid model invocations

## Sources

- FleetGraph trace evidence in the repo:
  - [`docs/evidence/fleetgraph-mvp-evidence.md`](../../evidence/fleetgraph-mvp-evidence.md)
  - [`docs/assignments/fleetgraph/FLEETGRAPH.md`](./FLEETGRAPH.md)
  - [`api/src/services/fleetgraph/llm/factory.ts`](../../../api/src/services/fleetgraph/llm/factory.ts)
- Anthropic:
  - [Claude Max pricing](https://claude.com/pricing/max)
- OpenAI:
  - [API pricing](https://openai.com/api/pricing/)
  - [ChatGPT-4o / GPT-4o family model page](https://developers.openai.com/api/docs/models/chatgpt-4o-latest)
  - [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
  - [Codex rate card](https://help.openai.com/en/articles/20001106-codex-rate-card)
  - [ChatGPT Plus pricing](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus)
  - [ChatGPT Pro pricing](https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro)
