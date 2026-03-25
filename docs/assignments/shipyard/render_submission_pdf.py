from __future__ import annotations

import math
import re
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
MD_PATH = ROOT / "PRESEARCH.md"
OUT_DIR = ROOT / "output"
ASSETS_DIR = OUT_DIR / "assets"
PDF_PATH = OUT_DIR / "Shipyard_PreSearch_Submission.pdf"

PAGE_WIDTH, PAGE_HEIGHT = LETTER
LEFT_MARGIN = 0.72 * inch
RIGHT_MARGIN = 0.72 * inch
TOP_MARGIN = 0.75 * inch
BOTTOM_MARGIN = 0.68 * inch
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

TITLE_COLOR = colors.HexColor("#102542")
ACCENT = colors.HexColor("#1f6feb")
TEAL = colors.HexColor("#0f766e")
TEXT = colors.HexColor("#14213d")
MUTED = colors.HexColor("#5b6470")
BORDER = colors.HexColor("#d9e1ec")
PANEL = colors.HexColor("#f6f9fc")
CODE_BG = colors.HexColor("#edf2f7")

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def ensure_dirs() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold and Path(FONT_BOLD).exists() else FONT_REGULAR
    return ImageFont.truetype(path, size=size)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if font.getlength(trial) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_shadowed_round_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    *,
    fill: str,
    outline: str,
    radius: int = 26,
) -> None:
    x1, y1, x2, y2 = box
    shadow_box = (x1 + 8, y1 + 10, x2 + 8, y2 + 10)
    draw.rounded_rectangle(shadow_box, radius=radius, fill=(10, 25, 47, 28))
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=3)


def draw_labeled_box(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    subtitle: str,
    *,
    fill: str,
    outline: str,
    title_fill: str = "#ffffff",
    subtitle_fill: str = "#edf6ff",
) -> None:
    draw_shadowed_round_rect(draw, box, fill=fill, outline=outline)
    title_font = load_font(30, bold=True)
    subtitle_font = load_font(19)
    x1, y1, x2, y2 = box
    inner_width = x2 - x1 - 42
    title_lines = wrap_text(title, title_font, inner_width)
    subtitle_lines = wrap_text(subtitle, subtitle_font, inner_width)
    y = y1 + 26
    for line in title_lines:
        draw.text((x1 + 22, y), line, font=title_font, fill=title_fill)
        y += 34
    y += 8
    for line in subtitle_lines:
        draw.text((x1 + 22, y), line, font=subtitle_font, fill=subtitle_fill)
        y += 24


def draw_arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    *,
    color: str = "#1f6feb",
    width: int = 9,
) -> None:
    draw.line([start, end], fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    arrow_len = 22
    arrow_angle = math.pi / 7
    p1 = (
        int(end[0] - arrow_len * math.cos(angle - arrow_angle)),
        int(end[1] - arrow_len * math.sin(angle - arrow_angle)),
    )
    p2 = (
        int(end[0] - arrow_len * math.cos(angle + arrow_angle)),
        int(end[1] - arrow_len * math.sin(angle + arrow_angle)),
    )
    draw.polygon([end, p1, p2], fill=color)


def draw_tag(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    *,
    fill: str = "#e0f2fe",
    text_fill: str = "#0c4a6e",
) -> None:
    font = load_font(20, bold=True)
    width = int(font.getlength(text)) + 28
    height = 36
    draw.rounded_rectangle((x, y, x + width, y + height), radius=18, fill=fill)
    draw.text((x + 14, y + 8), text, font=font, fill=text_fill)


def create_architecture_diagram(path: Path) -> None:
    img = Image.new("RGBA", (1600, 920), "#fbfdff")
    draw = ImageDraw.Draw(img, "RGBA")

    draw.rounded_rectangle((40, 36, 1560, 150), radius=38, fill="#0f2747")
    title_font = load_font(42, bold=True)
    sub_font = load_font(24)
    draw.text((78, 62), "Shipyard Agent Architecture", font=title_font, fill="#ffffff")
    draw.text(
        (78, 110),
        "Persistent loop, interruptible session inbox, one writing coordinator, and checkpointed recovery",
        font=sub_font,
        fill="#d7e7ff",
    )

    user = (88, 250, 338, 400)
    queue = (386, 250, 666, 400)
    context = (714, 250, 1024, 400)
    coord = (1080, 210, 1480, 430)
    edit = (1022, 500, 1268, 650)
    verify = (1310, 500, 1548, 650)
    explorer = (700, 470, 960, 620)
    verifier = (700, 668, 960, 818)
    recovery = (1028, 708, 1498, 858)

    draw_labeled_box(draw, user, "User Instruction", "New task or follow-up command", fill="#1f6feb", outline="#0b57d0")
    draw_labeled_box(draw, queue, "Session Queue", "Persistent inbox accepts work and interrupt requests without restart", fill="#0f766e", outline="#0b5d56")
    draw_labeled_box(draw, context, "Context Assembly", "Repo rules, file excerpts, runtime errors, queued follow-ups, session summary", fill="#7c3aed", outline="#6d28d9")
    draw_labeled_box(draw, coord, "Coordinator", "Plans, merges queued follow-ups, and is the only agent allowed to write files", fill="#102542", outline="#081322")
    draw_labeled_box(draw, explorer, "Explorer Subagent", "Read-only repo or spec search that returns a ContextReport", fill="#f59e0b", outline="#d97706", title_fill="#ffffff", subtitle_fill="#fff5d6")
    draw_labeled_box(draw, verifier, "Verifier Subagent", "Read-only checks that return a VerificationReport", fill="#14b8a6", outline="#0f766e", title_fill="#ffffff", subtitle_fill="#d7fffb")
    draw_labeled_box(draw, edit, "Edit Engine", "Anchor-based replacement only. No full-file rewrite fallback.", fill="#ef4444", outline="#dc2626", subtitle_fill="#ffe2e2")
    draw_labeled_box(draw, verify, "Verification", "Type-check, targeted tests, and diff guard", fill="#16a34a", outline="#15803d", subtitle_fill="#dcfce7")
    draw_labeled_box(draw, recovery, "Recovery", "Checkpoint revert, re-read, narrower retry, or escalate", fill="#334155", outline="#1e293b", subtitle_fill="#e2e8f0")

    draw_arrow(draw, (338, 325), (386, 325))
    draw_arrow(draw, (666, 325), (714, 325))
    draw_arrow(draw, (1024, 325), (1080, 325))
    draw_arrow(draw, (1260, 430), (1140, 500))
    draw_arrow(draw, (1268, 575), (1310, 575))
    draw_arrow(draw, (1430, 650), (1430, 708), color="#ef4444")
    draw_arrow(draw, (1260, 708), (1260, 430), color="#1f6feb")
    draw_arrow(draw, (960, 545), (1022, 545))
    draw_arrow(draw, (960, 745), (1310, 745))

    draw_tag(draw, 806, 632, "ContextReport")
    draw_tag(draw, 1058, 660, "Checkpoint")
    draw_tag(draw, 438, 422, "Interrupt at safe checkpoint", fill="#dcfce7", text_fill="#166534")
    draw_tag(draw, 1016, 706, "Retry or merge follow-up")
    draw_tag(draw, 804, 836, "VerificationReport", fill="#ccfbf1", text_fill="#115e59")

    img.save(path)


def create_multi_agent_diagram(path: Path) -> None:
    img = Image.new("RGBA", (1600, 920), "#fcfdff")
    draw = ImageDraw.Draw(img, "RGBA")

    draw.rounded_rectangle((40, 36, 1560, 150), radius=38, fill="#102542")
    title_font = load_font(42, bold=True)
    sub_font = load_font(24)
    draw.text((78, 62), "Shipyard Multi-Agent Coordination", font=title_font, fill="#ffffff")
    draw.text(
        (78, 110),
        "Coordinator owns writes, merges queued follow-ups, and keeps one active session authoritative.",
        font=sub_font,
        fill="#d7e7ff",
    )

    user = (645, 200, 955, 330)
    coord = (490, 380, 1110, 610)
    explorer = (80, 430, 400, 590)
    verifier = (1200, 430, 1520, 590)
    store = (610, 700, 990, 840)

    draw_labeled_box(draw, user, "Instruction", "Task or mid-run follow-up enters the active session", fill="#1f6feb", outline="#0b57d0")
    draw_labeled_box(draw, coord, "Coordinator", "Plans the run, chooses targets, merges queued follow-ups, and performs every file write", fill="#0f2747", outline="#081322")
    draw_labeled_box(draw, explorer, "Explorer", "Searches code, specs, logs, and returns a ContextReport", fill="#f59e0b", outline="#d97706", subtitle_fill="#fff4d4")
    draw_labeled_box(draw, verifier, "Verifier", "Runs checks and returns a VerificationReport", fill="#14b8a6", outline="#0f766e", subtitle_fill="#d8fffb")
    draw_labeled_box(draw, store, "Trace + Session Store", "Session summary, checkpoints, queued instructions, and LangSmith trace records", fill="#334155", outline="#1e293b", subtitle_fill="#e2e8f0")

    draw_arrow(draw, (800, 330), (800, 380))
    draw_arrow(draw, (400, 510), (490, 510))
    draw_arrow(draw, (1110, 510), (1200, 510))
    draw_arrow(draw, (800, 610), (800, 700))

    draw_tag(draw, 424, 462, "ContextReport")
    draw_tag(draw, 996, 462, "VerificationReport", fill="#ccfbf1", text_fill="#115e59")
    draw_tag(draw, 700, 636, "EditIntent", fill="#dbeafe", text_fill="#1e3a8a")
    draw_tag(draw, 682, 846, "Checkpoint + trace", fill="#e2e8f0", text_fill="#334155")

    note_font = load_font(22)
    draw.text((104, 620), "Read-only", font=note_font, fill="#b45309")
    draw.text((1260, 620), "Read-only", font=note_font, fill="#0f766e")

    img.save(path)


def replace_links(text: str) -> str:
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 - \2", text)


def format_inline(text: str) -> str:
    text = replace_links(text)
    parts: list[str] = []
    idx = 0
    for match in re.finditer(r"`([^`]+)`", text):
        parts.append(escape(text[idx : match.start()]))
        parts.append(f"<font name='Courier'>{escape(match.group(1))}</font>")
        idx = match.end()
    parts.append(escape(text[idx:]))
    return "".join(parts)


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            alignment=TA_LEFT,
            textColor=TITLE_COLOR,
            spaceAfter=16,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=TITLE_COLOR,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11.8,
            leading=15,
            textColor=TEAL,
            spaceBefore=10,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=13.4,
            textColor=TEXT,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.2,
            textColor=TEXT,
            leftIndent=12,
            firstLineIndent=0,
            spaceAfter=4,
        ),
        "number": ParagraphStyle(
            "Number",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.2,
            textColor=TEXT,
            leftIndent=0,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.6,
            leading=11.5,
            textColor=MUTED,
            spaceAfter=4,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["BodyText"],
            fontName="Courier",
            fontSize=7.8,
            leading=10,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=0,
        ),
    }
    return styles


def add_page_frame(canvas, doc) -> None:
    page = canvas.getPageNumber()
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d8e2ec"))
    canvas.setLineWidth(0.8)
    canvas.line(LEFT_MARGIN, PAGE_HEIGHT - 0.48 * inch, PAGE_WIDTH - RIGHT_MARGIN, PAGE_HEIGHT - 0.48 * inch)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(TITLE_COLOR)
    canvas.drawString(LEFT_MARGIN, PAGE_HEIGHT - 0.39 * inch, "Shipyard Pre-Search Submission")
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawRightString(PAGE_WIDTH - RIGHT_MARGIN, 0.42 * inch, f"Page {page}")
    canvas.restoreState()


def render_pdf() -> None:
    styles = build_styles()
    story = []
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=LETTER,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title="Shipyard Pre-Search Submission",
        author="Codex",
    )

    cover = Table(
        [[
            Paragraph("Shipyard Pre-Search", styles["title"]),
            Paragraph(
                "Direct answers to the PRD checklist, with rendered diagrams and submission-ready formatting.",
                styles["body"],
            ),
        ]],
        colWidths=[CONTENT_WIDTH],
    )
    cover.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PANEL),
                ("BOX", (0, 0), (-1, -1), 1, BORDER),
                ("INNERPADDING", (0, 0), (-1, -1), 16),
            ]
        )
    )
    story.extend([cover, Spacer(1, 0.22 * inch)])

    paragraph_buffer: list[str] = []
    code_buffer: list[str] = []
    in_code = False

    def flush_paragraph() -> None:
        nonlocal paragraph_buffer
        if not paragraph_buffer:
            return
        text = " ".join(line.strip() for line in paragraph_buffer).strip()
        if text:
            story.append(Paragraph(format_inline(text), styles["body"]))
        paragraph_buffer = []

    def flush_code() -> None:
        nonlocal code_buffer
        if not code_buffer:
            return
        code_html = "<br/>".join(escape(line).replace(" ", "&nbsp;") for line in code_buffer)
        code_para = Paragraph(code_html, styles["code"])
        block = Table([[code_para]], colWidths=[CONTENT_WIDTH])
        block.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                    ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                    ("INNERPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.extend([block, Spacer(1, 0.1 * inch)])
        code_buffer = []

    lines = MD_PATH.read_text().splitlines()
    for raw_line in lines:
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_paragraph()
            if in_code:
                flush_code()
                in_code = False
            else:
                in_code = True
            continue

        if in_code:
            code_buffer.append(line)
            continue

        if not stripped:
            flush_paragraph()
            story.append(Spacer(1, 0.04 * inch))
            continue

        image_match = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", stripped)
        if image_match:
            flush_paragraph()
            img_path = (MD_PATH.parent / image_match.group(2)).resolve()
            image = RLImage(str(img_path))
            image.drawWidth = CONTENT_WIDTH
            image.drawHeight = CONTENT_WIDTH * (image.imageHeight / image.imageWidth)
            story.extend([image, Spacer(1, 0.12 * inch)])
            continue

        if stripped.startswith("# "):
            flush_paragraph()
            continue

        if stripped.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(format_inline(stripped[3:]), styles["h2"]))
            continue

        if stripped.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(format_inline(stripped[4:]), styles["h3"]))
            continue

        if stripped.startswith("- "):
            flush_paragraph()
            story.append(Paragraph(format_inline(stripped[2:]), styles["bullet"], bulletText="•"))
            continue

        if re.match(r"^\d+\.\s", stripped):
            flush_paragraph()
            story.append(Paragraph(format_inline(stripped), styles["number"]))
            continue

        paragraph_buffer.append(line)

    flush_paragraph()
    flush_code()
    doc.build(story, onFirstPage=add_page_frame, onLaterPages=add_page_frame)


def main() -> None:
    ensure_dirs()
    create_architecture_diagram(ASSETS_DIR / "architecture_flow.png")
    create_multi_agent_diagram(ASSETS_DIR / "multi_agent_coordination.png")
    render_pdf()
    print(PDF_PATH)


if __name__ == "__main__":
    main()
