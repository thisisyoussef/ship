from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "output" / "pdf" / "fleetgraph_submission_phase_1_3.pdf"

NAVY = colors.HexColor("#15233A")
RUST = colors.HexColor("#C85D34")
SAND = colors.HexColor("#F6F0E7")
INK = colors.HexColor("#223142")
MUTED = colors.HexColor("#5E6A78")
GOLD = colors.HexColor("#D2A34B")
LINE = colors.HexColor("#D9D0C4")
WHITE = colors.white


def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=30,
            textColor=WHITE,
            alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=WHITE,
        ),
        "phase": ParagraphStyle(
            "phase",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=6,
        ),
        "section": ParagraphStyle(
            "section",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=WHITE,
            alignment=TA_LEFT,
        ),
        "card_title": ParagraphStyle(
            "card_title",
            parent=base["Heading4"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=13,
            textColor=NAVY,
        ),
        "table_header": ParagraphStyle(
            "table_header",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.4,
            leading=12,
            textColor=WHITE,
            alignment=TA_LEFT,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=INK,
        ),
        "muted": ParagraphStyle(
            "muted",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13,
            textColor=MUTED,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11.6,
            textColor=colors.HexColor("#D7E1EE"),
            alignment=TA_CENTER,
        ),
    }


def cover_block(styles: dict[str, ParagraphStyle]) -> list:
    return [
        Spacer(1, 1.25 * inch),
        Paragraph("FleetGraph Submission Brief", styles["title"]),
        Paragraph(
            "Phase 1 through Phase 3 answers, distilled from the Ship codebase reconnaissance.",
            styles["subtitle"],
        ),
        Spacer(1, 0.3 * inch),
        Paragraph(
            "Model assumption: provider-agnostic. This brief does not hard-lock FleetGraph to Claude.",
            styles["subtitle"],
        ),
        Spacer(1, 2.6 * inch),
        Paragraph("Prepared for FleetGraph in Ship", styles["small"]),
        Spacer(1, 0.08 * inch),
        Paragraph("Grounded in Ship REST routes, schema, auth, realtime, and UI structure", styles["small"]),
    ]


def section_band(text: str, styles: dict[str, ParagraphStyle]) -> Table:
    table = Table([[Paragraph(text, styles["section"])]], colWidths=[7.3 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def card(title: str, answer: str, rationale: str, styles: dict[str, ParagraphStyle]) -> KeepTogether:
    rows = [
        [Paragraph(title, styles["card_title"])],
        [Paragraph(f"<b>Answer.</b> {answer}", styles["body"])],
        [Paragraph(f"<b>Rationale.</b> {rationale}", styles["muted"])],
    ]
    table = Table(rows, colWidths=[7.3 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2E4D8")),
                ("BACKGROUND", (0, 1), (-1, -1), SAND),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return KeepTogether([table, Spacer(1, 0.14 * inch)])


def data_table(rows: list[list[str]], widths: list[float], styles: dict[str, ParagraphStyle]) -> Table:
    wrapped = []
    for index, row in enumerate(rows):
        style = styles["table_header"] if index == 0 else styles["body"]
        wrapped.append([Paragraph(cell, style) for cell in row])
    table = Table(wrapped, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return table


def draw_page(canvas, doc) -> None:
    canvas.saveState()
    if canvas.getPageNumber() == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=1, stroke=0)
        canvas.setFillColor(RUST)
        canvas.rect(0.55 * inch, 0.55 * inch, 0.22 * inch, doc.pagesize[1] - 1.1 * inch, fill=1, stroke=0)
        canvas.setFillColor(GOLD)
        canvas.rect(doc.pagesize[0] - 1.65 * inch, doc.pagesize[1] - 1.05 * inch, 1.1 * inch, 0.22 * inch, fill=1, stroke=0)
    else:
        canvas.setFillColor(NAVY)
        canvas.rect(0.5 * inch, doc.pagesize[1] - 0.45 * inch, doc.pagesize[0] - inch, 0.06 * inch, fill=1, stroke=0)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(0.6 * inch, 0.45 * inch, "FleetGraph Submission Brief")
        canvas.drawRightString(doc.pagesize[0] - 0.6 * inch, 0.45 * inch, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def story(styles: dict[str, ParagraphStyle]) -> list:
    items: list = cover_block(styles) + [PageBreak(), Paragraph("Phase 1: Define Your Agent", styles["phase"])]

    phase_1_cards = [
        ("What events should the agent monitor proactively?", "Monitor missing standups, week-start drift, approval gaps, deadline risk, workload imbalance, and blocker proxies.", "These are the strongest signals Ship already models through week status, approvals, target dates, issue states, assignments, and iterations."),
        ("What constitutes a condition worth surfacing?", "Surface only threshold-crossing conditions that create a concrete next decision, such as a missed standup by noon, a week still in planning after start, or a project with a target date inside 7 days and stale high-priority work.", "The main product risk is notification fatigue. Worth-surfacing logic has to be explicit and quiet by default."),
        ("What can the agent do without human approval?", "Read Ship state, reason over it, store FleetGraph insight state, send proactive cards, and draft suggested actions or comments.", "Ship does not have an agent-specific audit lane or bot-safe mutation scope yet, so autonomous behavior should stay read-only."),
        ("What must always require confirmation?", "Any Ship write that changes visible team state: issue reassignment or state changes, week start and carryover, approvals, request-change actions, persistent comments, bulk edits, and destructive actions.", "These actions affect ownership, scope, and review state, and Ship's permissions are still human-role based."),
        ("How does the agent know who is on a project?", "By combining project and program ownership fields, issue assignees, team assignments, team people, and normalized legacy relationship fields such as `project_id` and `assignee_ids`.", "Project membership is not exposed as one clean source. It is a derived view across mixed-shape Ship data."),
        ("How does the agent know who to notify?", "Target the person who owns the next decision first: assignee for personal work, week owner for sprint health, accountable person or manager for approvals, and Director lens for cross-project risk.", "Ship's `role` field is a presentation signal, not an auth boundary, so targeting has to be responsibility-first."),
        ("How does on-demand mode use the current view?", "The frontend passes `document_id`, `document_type`, `active_tab`, `nested_path`, and optional `project_context_id` from `UnifiedDocumentPage` and `CurrentDocumentContext` into the graph entry state.", "Ship already organizes user context through `/documents/:id/*`, so embedded chat should reuse that instead of inventing a separate page."),
    ]
    items.extend(card(*entry, styles) for entry in phase_1_cards)

    items += [Spacer(1, 0.06 * inch), section_band("Use Case Discovery", styles), Spacer(1, 0.18 * inch)]
    use_cases = [
        ("1. Engineer standup rescue", "Role: Engineer<br/>Trigger: Active week, business day, no standup by noon<br/>Agent: Detects the miss, shows issue count, and links to the right week or standup surface<br/>Human decides: Post now, snooze, or ignore", "Ship already computes this accountability gap dynamically, so it is a real operational pain point, not an invented one."),
        ("2. PM week-start drift", "Role: PM<br/>Trigger: Start day passes and the week is still `planning` or empty<br/>Agent: Produces a short summary of what is missing and who owns the week<br/>Human decides: Start the week, add scope, or intentionally leave it idle", "This maps directly to Ship's explicit week status model and issue associations."),
        ("3. PM approval gap", "Role: PM<br/>Trigger: Plan or review is `changes_requested` or remains unapproved for 1 business day after submission<br/>Agent: Identifies the approver, the blocked artifact, and the next action<br/>Human decides: Approve, request changes, or revise the document", "Approval state already lives in Ship document properties and existing endpoints."),
        ("4. Director deadline risk", "Role: Director<br/>Trigger: Project target date is within 7 days and high-priority work is still open or stale<br/>Agent: Produces a risk brief naming the at-risk project and stale issues<br/>Human decides: Escalate, rescope, or accept the risk", "Ship already exposes target dates, issue priority, and activity timing."),
        ("5. PM workload rebalance", "Role: PM<br/>Trigger: One person owns more than 50 percent of open estimate or more than 2x the median load<br/>Agent: Surfaces the skew and candidate work to move<br/>Human decides: Reassign now or keep the current distribution", "Ship has enough assignment and estimate data to support this even though normalization is required."),
        ("6. Context-aware page assistant", "Role: Engineer or PM<br/>Trigger: User opens an issue, sprint, or project page and asks a question<br/>Agent: Pulls together the current document, related work, comments, and next actions into one answer<br/>Human decides: What to do next with less digging", "The current UI already spreads context across tabs and related documents, which makes this a clear retrieval and synthesis pain point."),
    ]
    items.extend(card(title, answer, rationale, styles) for title, answer, rationale in use_cases)

    items += [Spacer(1, 0.08 * inch), section_band("Trigger Model Decision", styles), Spacer(1, 0.18 * inch)]
    trigger_cards = [
        ("When does the proactive agent run without a user present?", "It runs after high-signal Ship writes are enqueued and on a scheduled 4 minute sweep for time-based drift conditions.", "This covers both hot updates and slow-burn accountability or deadline conditions."),
        ("Poll vs webhook vs hybrid", "Choose hybrid: route-level enqueue hooks for hot writes plus a scheduled sweep. Pure polling is simple but wasteful and close to the latency limit. Pure webhook or socket-driven triggering is not durable in Ship today.", "Ship has browser delivery events but not a replayable backend event bus, so hybrid is the only honest fit."),
        ("How stale is too stale?", "Standups are stale the same business day by noon. Week starts are stale after a 4 hour grace window. Approval gaps are stale after 1 business day. High-priority issue risk is stale at 48 hours. Blocker proxies become meaningful after 3 business days or 2 repeated blocker reports.", "Each threshold maps to an actual Ship workflow rather than a generic stale-data rule."),
    ]
    items.extend(card(*entry, styles) for entry in trigger_cards)
    items.append(
        data_table(
            [
                ["Scale", "Workspaces", "Sweeps/day", "REST reads/day", "Reasoning runs/day"],
                ["100 projects", "10", "3,600", "18,000", "600"],
                ["1,000 projects", "100", "36,000", "180,000", "6,000"],
            ],
            [1.25 * inch, 1.0 * inch, 1.1 * inch, 1.45 * inch, 1.65 * inch],
            styles,
        )
    )

    items += [PageBreak(), Paragraph("Phase 2: Graph Architecture", styles["phase"])]
    phase_2_cards = [
        ("What are the context, fetch, reasoning, action, and output nodes?", "Context nodes resolve trigger type, actor lens, and current page metadata. Fetch nodes load workspace snapshots or document-centric clusters. Reasoning nodes score candidates and synthesize next actions. Action nodes classify quiet output versus HITL-gated writes. Output nodes emit chat answers, proactive cards, or approved mutations.", "This split keeps the graph traceable and ensures the model only reasons after real Ship data has been normalized."),
        ("Which fetch nodes run in parallel?", "For proactive sweeps: projects, weeks, issues, team people, and accountability items. For issue pages: issue detail, history, iterations, children, comments, and people. For week pages: week detail, issues, standups, review, and people. For project pages: project detail, issues, weeks, retro, activity, and people.", "These calls are independent once the scope is known, so parallelism reduces latency without complicating correctness."),
        ("Where are the conditional edges and what triggers them?", "After normalization and deterministic scoring, the graph branches to a quiet exit when no candidate survives thresholds, to reasoning when at least one candidate matters, to HITL when a Ship write is proposed, and to fallback when fetches fail or data is incomplete.", "Distinct branches are necessary so LangSmith clearly shows clean runs versus problem-detected runs."),
        ("What state does the graph carry across a session?", "Trigger metadata, actor lens, route context, raw payloads, normalized Ship graph, candidate findings, reasoning output, action plan, and partial-failure flags.", "The graph needs that state to keep fetches and reasoning coherent inside a single run."),
        ("What state persists between proactive runs?", "Insight fingerprints, evidence hashes, first-seen and last-seen timestamps, last-notified time, snooze windows, dismissals, resolved state, and LangGraph checkpoint data.", "Without durable state, the agent cannot dedupe, interrupt safely, or respect user snoozes."),
        ("How do you avoid redundant API calls?", "Use in-run memoization plus short TTL caches: team people for 10 to 15 minutes, project lists for 2 minutes, week lists for 1 to 2 minutes, and issue-heavy views for 30 to 60 seconds.", "Ship remains the source of truth, but short caches prevent waste and help stay under rate limits."),
        ("Which actions require confirmation?", "Any persistent Ship mutation: issue changes, week start or carryover, approvals, request-change actions, and posting comments.", "These actions change visible team state and should stay human-owned in MVP."),
        ("What does confirmation look like in Ship?", "An embedded FleetGraph card offers `Apply`, `Dismiss`, `Snooze`, and `View evidence`. `Apply` opens a small confirm modal that shows the exact object, change, and endpoint that will be called.", "The confirmation path should live where the user is already working, not in a separate admin flow."),
        ("What happens if the human dismisses or snoozes?", "Dismiss writes a cooldown against the current insight fingerprint. Snooze delays resurfacing until the selected time or until evidence changes materially.", "This keeps the agent useful without repeating the same advice on every sweep."),
        ("What does the agent do when Ship API is down?", "Retry briefly with jitter, mark the run degraded, suppress proactive alerts, and fall back to read-only help only when cached context is still safe to use.", "The right failure mode is quiet caution, not speculative action."),
        ("How does it degrade gracefully?", "Lower confidence on partial data, label blocker findings as heuristic when necessary, and avoid any mutation or high-confidence escalation until live evidence is complete again.", "This preserves trust when only part of the context is available."),
        ("What gets cached and for how long?", "People and role data up to 15 minutes, project and week list snapshots up to 5 minutes in degraded mode, and issue details only briefly for read-only answers.", "That balances usability with the rule that Ship is still the live system of record."),
    ]
    items.extend(card(*entry, styles) for entry in phase_2_cards)

    items += [PageBreak(), Paragraph("Phase 3: Stack and Deployment", styles["phase"])]
    phase_3_cards = [
        ("Where does the proactive agent run when no user is present?", "In a dedicated FleetGraph background worker process that sits alongside Ship's API routes but still calls Ship through REST only.", "This preserves the REST-only boundary while allowing scheduled and queued work."),
        ("How is it kept alive?", "A long-running worker handles queued event runs and a scheduler fires the 4 minute sweeps.", "That is more reliable than trying to fake proactive behavior out of browser sessions."),
        ("How does it authenticate without a user session?", "With a Ship API token created through `/api/api-tokens`, ideally tied to a dedicated FleetGraph service user per workspace.", "Ship already supports Bearer token auth, so background runs do not need a browser session."),
        ("How does the trigger model achieve under 5 minute detection latency?", "Event-driven runs enqueue immediately, debounce for about 60 to 90 seconds, then execute in about 30 to 60 seconds. Sweep-driven runs happen every 4 minutes, so worst-case latency lands at about 4.5 to 5 minutes.", "This is the tightest defensible window given Ship's current architecture."),
        ("What is the token budget per invocation?", "About 4,000 input plus 700 output tokens for proactive reasoning runs, and about 6,000 input plus 1,000 output tokens for on-demand contextual chat.", "Rule gating keeps clean sweeps out of the model entirely, so only candidate-producing runs consume tokens."),
        ("Where are the cost cliffs?", "The first cliff is Ship API rate limiting at scale. The second is removing deterministic pre-filtering and sending every sweep to the model. The third is swapping the cheap default model for a far more expensive frontier model without tightening thresholds.", "The architecture is affordable only because it controls both API volume and LLM volume before they compound."),
    ]
    items.extend(card(*entry, styles) for entry in phase_3_cards)

    items += [Spacer(1, 0.12 * inch), section_band("Performance Snapshot", styles), Spacer(1, 0.18 * inch)]
    items.append(
        data_table(
            [
                ["Invocation", "Input tokens", "Output tokens", "Approx. cost"],
                ["Proactive reasoning", "4,000", "700", "$0.0024"],
                ["On-demand chat", "6,000", "1,000", "$0.0035"],
            ],
            [2.25 * inch, 1.2 * inch, 1.2 * inch, 1.35 * inch],
            styles,
        )
    )
    return items


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )
    doc.build(story(styles), onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
