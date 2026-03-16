# FLEETGRAPH

Use this as the working submission document for the FleetGraph assignment.

## Current Repo Clarification

- The source PDF still mentions Claude-only integration.
- For this repo, FleetGraph should remain provider-agnostic and use OpenAI as the preferred default unless another provider is explicitly justified.

## Agent Responsibility

Define:
- What the agent monitors proactively
- What it reasons about on demand
- What it can do autonomously
- What requires human approval
- Who it notifies and under what conditions
- How it derives project membership and role context
- How current-view context shapes on-demand behavior

## Graph Diagram

Add either:
- a Mermaid diagram, or
- a LangGraph Studio screenshot

The diagram must cover both proactive and on-demand paths, including conditional branches.

## Use Cases

Minimum: 5.

| # | Role | Trigger | Agent Detects / Produces | Human Decides |
|---|------|---------|---------------------------|---------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

## Trigger Model

Document whether the proactive mode uses polling, webhooks, or a hybrid model.

Include:
- latency tradeoffs
- reliability tradeoffs
- cost tradeoffs
- why the chosen model is defensible for Ship

## Test Cases

For each use case, record the triggering Ship state, the expected output, and the trace link.

| # | Ship State | Expected Output | Trace Link |
|---|------------|-----------------|------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

## Architecture Decisions

Cover:
- framework choice
- node design rationale
- state management approach
- deployment model
- auth approach for proactive mode
- human-in-the-loop boundaries

## Cost Analysis

### Development and Testing Costs

| Item | Amount |
|------|--------|
| Selected LLM API - input tokens | |
| Selected LLM API - output tokens | |
| Total invocations during development | |
| Total development spend | |

### Production Cost Projections

| Users | Monthly Cost |
|-------|--------------|
| 100 | |
| 1,000 | |
| 10,000 | |

Assumptions:
- Preferred default provider: OpenAI
- Proactive runs per project per day:
- On-demand invocations per user per day:
- Average tokens per invocation:
- Cost per run:
- Estimated runs per day:
