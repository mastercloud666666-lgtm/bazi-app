from pathlib import Path
from shutil import copy2

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DOWNLOADS = ROOT / "public" / "downloads"
OUTPUT_PDF = ROOT / "output" / "pdf"

PUBLIC_DOWNLOADS.mkdir(parents=True, exist_ok=True)
OUTPUT_PDF.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#102F49")
BLUE = colors.HexColor("#2F75B5")
BLUE_DARK = colors.HexColor("#1D5687")
PALE = colors.HexColor("#EEF5FA")
PALE_2 = colors.HexColor("#F7FAFC")
STEEL = colors.HexColor("#7897B0")
MUTED = colors.HexColor("#556B7D")
LINE = colors.HexColor("#C9D9E5")
WHITE = colors.white
GOLD = colors.HexColor("#D7A938")
FIRE = colors.HexColor("#C6543E")
EARTH = colors.HexColor("#9A6033")
WOOD = colors.HexColor("#4D8A5B")
WATER = colors.HexColor("#2B73A8")
METAL = colors.HexColor("#88762C")


def register_fonts():
    font_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "arialbd.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia", str(font_dir / "georgia.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia-Bold", str(font_dir / "georgiab.ttf")))
    pdfmetrics.registerFont(
        TTFont("NotoSC", str(font_dir / "simhei.ttf"))
    )
    pdfmetrics.registerFont(
        TTFont("NotoSC-Bold", str(font_dir / "simhei.ttf"))
    )
    pdfmetrics.registerFontFamily(
        "Arial",
        normal="Arial",
        bold="Arial-Bold",
    )
    pdfmetrics.registerFontFamily(
        "Georgia",
        normal="Georgia",
        bold="Georgia-Bold",
    )


register_fonts()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="Kicker",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=8.5,
        leading=11,
        textColor=BLUE,
        spaceAfter=5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        parent=styles["Title"],
        fontName="Georgia-Bold",
        fontSize=34,
        leading=39,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=7 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSubtitle",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=13,
        leading=20,
        textColor=MUTED,
        spaceAfter=9 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionTitle",
        parent=styles["Heading1"],
        fontName="Georgia-Bold",
        fontSize=23,
        leading=28,
        textColor=NAVY,
        spaceBefore=2 * mm,
        spaceAfter=7 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionTitleSmall",
        parent=styles["Heading1"],
        fontName="Georgia-Bold",
        fontSize=18,
        leading=23,
        textColor=NAVY,
        spaceAfter=4 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Subhead",
        parent=styles["Heading2"],
        fontName="Arial-Bold",
        fontSize=12,
        leading=16,
        textColor=NAVY,
        spaceBefore=4 * mm,
        spaceAfter=2.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontName="Arial",
        fontSize=10.4,
        leading=16,
        textColor=MUTED,
        spaceAfter=4 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BodySmall",
        parent=styles["BodyText"],
        fontName="Arial",
        fontSize=8.5,
        leading=12,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyWhite",
        parent=styles["BodyText"],
        fontName="Arial",
        fontSize=10,
        leading=15,
        textColor=WHITE,
    )
)
styles.add(
    ParagraphStyle(
        name="ChartChinese",
        parent=styles["Normal"],
        fontName="NotoSC-Bold",
        fontSize=21,
        leading=25,
        alignment=TA_CENTER,
        textColor=NAVY,
    )
)
styles.add(
    ParagraphStyle(
        name="ChartLabel",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=7.2,
        leading=9,
        alignment=TA_CENTER,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="Quote",
        parent=styles["BodyText"],
        fontName="Georgia",
        fontSize=13,
        leading=20,
        textColor=NAVY,
        leftIndent=7 * mm,
        rightIndent=7 * mm,
        spaceBefore=3 * mm,
        spaceAfter=5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="TOC",
        parent=styles["BodyText"],
        fontName="Arial-Bold",
        fontSize=10.5,
        leading=16,
        textColor=NAVY,
        spaceAfter=2.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="CardNumber",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=8,
        leading=10,
        textColor=BLUE,
        spaceAfter=2 * mm,
    )
)


def page_decor(canvas, doc):
    canvas.saveState()
    width, height = doc.pagesize
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.55)
        canvas.line(doc.leftMargin, 14 * mm, width - doc.rightMargin, 14 * mm)
        canvas.setFont("Arial-Bold", 7.5)
        canvas.setFillColor(NAVY)
        canvas.drawString(doc.leftMargin, 8.5 * mm, "TENGYUNZI")
        canvas.setFont("Arial", 7.5)
        canvas.setFillColor(STEEL)
        canvas.drawRightString(
            width - doc.rightMargin, 8.5 * mm, f"{doc.page:02d}"
        )
    canvas.restoreState()


def numbered_rule(number, title, text):
    number_cell = Table(
        [[Paragraph(f"{number:02d}", styles["CardNumber"])]],
        colWidths=[11 * mm],
        rowHeights=[11 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        ),
    )
    copy = [
        Paragraph(title, styles["Subhead"]),
        Paragraph(text, styles["Body"]),
    ]
    row = Table(
        [[number_cell, copy]],
        colWidths=[15 * mm, 145 * mm],
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ]
        ),
    )
    return row


def four_pillars_chart(include_hour=True):
    headers = ["YEAR", "MONTH", "DAY", "HOUR"]
    stems = ["庚", "壬", "戊", "—" if not include_hour else "甲"]
    branches = ["午", "午", "子", "—" if not include_hour else "寅"]
    notes = ["Metal / Horse", "Water / Horse", "Earth / Rat", "Unknown"]
    data = [
        [Paragraph(h, styles["ChartLabel"]) for h in headers],
        [Paragraph(s, styles["ChartChinese"]) for s in stems],
        [Paragraph(b, styles["ChartChinese"]) for b in branches],
        [Paragraph(n, styles["ChartLabel"]) for n in notes],
    ]
    table = Table(
        data,
        colWidths=[37 * mm] * 4,
        rowHeights=[10 * mm, 17 * mm, 17 * mm, 11 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PALE),
                ("BACKGROUND", (0, 2), (-1, 2), PALE_2),
                ("BOX", (0, 0), (-1, -1), 0.75, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.55, LINE),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 1 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1 * mm),
            ]
        ),
    )
    return table


def element_strip():
    items = [
        ("WOOD", "#EAF5EC", "#3F7749"),
        ("FIRE", "#FBEDEA", "#B84735"),
        ("EARTH", "#F5EEE7", "#85512D"),
        ("METAL", "#F5F1DD", "#746421"),
        ("WATER", "#E9F2F9", "#286792"),
    ]
    data = [
        [
            Paragraph(
                label,
                ParagraphStyle(
                    f"element-{label}",
                    parent=styles["ChartLabel"],
                    textColor=colors.HexColor(fg),
                    fontSize=8,
                ),
            )
            for label, _, fg in items
        ]
    ]
    return Table(
        data,
        colWidths=[29.6 * mm] * 5,
        rowHeights=[10 * mm],
        style=TableStyle(
            [
                *[
                    ("BACKGROUND", (i, 0), (i, 0), colors.HexColor(bg))
                    for i, (_, bg, _) in enumerate(items)
                ],
                ("BOX", (0, 0), (-1, -1), 0.55, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.55, WHITE),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        ),
    )


def callout(title, text):
    return Table(
        [
            [Paragraph(title, styles["Subhead"])],
            [Paragraph(text, styles["Body"])],
        ],
        colWidths=[160 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.65, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 7 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7 * mm),
                ("TOPPADDING", (0, 0), (-1, 0), 5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
                ("TOPPADDING", (0, 1), (-1, 1), 1 * mm),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 5 * mm),
            ]
        ),
    )


def cover_footer():
    return Table(
        [
            [
                Paragraph("TENGYUNZI", styles["ChartLabel"]),
                Paragraph("tengyunzi.com", styles["ChartLabel"]),
            ]
        ],
        colWidths=[80 * mm, 80 * mm],
        style=TableStyle(
            [
                ("LINEABOVE", (0, 0), (-1, 0), 0.75, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        ),
    )


def build_starter_guide(path):
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=25 * mm,
        leftMargin=25 * mm,
        topMargin=24 * mm,
        bottomMargin=22 * mm,
        title="BaZi Starter Guide",
        author="Tengyunzi",
        subject="An English introduction to BaZi and the Four Pillars",
    )
    story = [
        Spacer(1, 17 * mm),
        Paragraph("A PRACTICAL INTRODUCTION", styles["Kicker"]),
        Paragraph("BaZi Starter Guide", styles["CoverTitle"]),
        Paragraph(
            "Read the Four Pillars as a structured map of temperament, "
            "relationships, work patterns, and timing.",
            styles["CoverSubtitle"],
        ),
        Spacer(1, 5 * mm),
        four_pillars_chart(include_hour=False),
        Spacer(1, 7 * mm),
        element_strip(),
        Spacer(1, 23 * mm),
        cover_footer(),
        PageBreak(),
        Paragraph("START HERE", styles["Kicker"]),
        Paragraph("What this guide will give you", styles["SectionTitle"]),
        Paragraph(
            "BaZi is often introduced as a collection of symbols. A useful "
            "reading goes further: it connects those symbols into a coherent "
            "description of how a person tends to use energy, respond to "
            "pressure, form relationships, and move through changing seasons.",
            styles["Body"],
        ),
        Paragraph(
            "This short guide gives you the vocabulary needed to understand a "
            "Four Pillars chart without turning it into a fixed verdict.",
            styles["Body"],
        ),
        Spacer(1, 3 * mm),
        numbered_rule(1, "The Four Pillars", "How year, month, day, and hour organize the chart."),
        numbered_rule(2, "Heavenly Stems", "The visible mode through which elemental energy is expressed."),
        numbered_rule(3, "Earthly Branches", "Seasonal context, stored energy, and the twelve animal signs."),
        numbered_rule(4, "Five Elements", "A language for movement, balance, support, and control."),
        numbered_rule(5, "Day Master", "The reference point used to interpret the rest of the chart."),
        numbered_rule(6, "Luck Cycles", "How timing changes the emphasis without changing the whole person."),
        Spacer(1, 5 * mm),
        callout(
            "A responsible starting point",
            "Use BaZi as a framework for reflection and decision support. "
            "It is not a replacement for medical, legal, financial, or mental-health advice.",
        ),
        PageBreak(),
        Paragraph("01 · THE SYSTEM", styles["Kicker"]),
        Paragraph("A map of pattern and timing", styles["SectionTitle"]),
        Paragraph(
            "<b>BaZi</b>, also called the <b>Four Pillars of Destiny</b>, maps "
            "the year, month, day, and hour of birth into eight Chinese "
            "characters. Each character belongs to a cycle and carries "
            "information about element, polarity, season, and relationship.",
            styles["Body"],
        ),
        Paragraph(
            "The chart is not read one symbol at a time. Meaning comes from "
            "relationships: what supports the Day Master, what drains it, "
            "which qualities are abundant or scarce, and how the structure "
            "changes when a new cycle arrives.",
            styles["Body"],
        ),
        Paragraph(
            "A useful reading separates three layers:",
            styles["Subhead"],
        ),
        numbered_rule(1, "Baseline pattern", "The birth chart describes the starting configuration."),
        numbered_rule(2, "Lived expression", "Family, culture, choices, and skills shape how the pattern appears."),
        numbered_rule(3, "Timing", "Luck cycles and annual influences change which themes become easier or louder."),
        Spacer(1, 5 * mm),
        Paragraph(
            "A chart describes tendencies and conditions. It does not remove "
            "choice, context, effort, or uncertainty.",
            styles["Quote"],
        ),
        PageBreak(),
        Paragraph("02 · THE STRUCTURE", styles["Kicker"]),
        Paragraph("The Four Pillars", styles["SectionTitle"]),
        four_pillars_chart(include_hour=True),
        Spacer(1, 7 * mm),
        Paragraph(
            "Every pillar contains a <b>Heavenly Stem</b> above an "
            "<b>Earthly Branch</b>. The upper character is more visible; the "
            "lower character carries seasonal and stored influences.",
            styles["Body"],
        ),
        numbered_rule(1, "Year Pillar", "Ancestral context, public environment, and early social field."),
        numbered_rule(2, "Month Pillar", "Seasonal strength, work environment, and the formative family system."),
        numbered_rule(3, "Day Pillar", "The Day Master and the intimate or private sphere."),
        numbered_rule(4, "Hour Pillar", "Projects, later life, long-range aims, and private aspirations."),
        callout(
            "If the birth hour is unknown",
            "A meaningful reading is still possible from the year, month, and "
            "day pillars. Hour-specific conclusions should be marked as provisional.",
        ),
        PageBreak(),
        Paragraph("03 · VISIBLE ENERGY", styles["Kicker"]),
        Paragraph("The Ten Heavenly Stems", styles["SectionTitle"]),
        Paragraph(
            "The Five Elements each appear in a Yang and a Yin form. Together "
            "they create ten Heavenly Stems. These are not personality labels; "
            "they are modes through which elemental energy becomes visible.",
            styles["Body"],
        ),
    ]
    stem_rows = [
        ("Wood", "甲 Jia", "乙 Yi", "Initiation, growth, adaptability"),
        ("Fire", "丙 Bing", "丁 Ding", "Visibility, warmth, refinement"),
        ("Earth", "戊 Wu", "己 Ji", "Stability, integration, cultivation"),
        ("Metal", "庚 Geng", "辛 Xin", "Structure, precision, discernment"),
        ("Water", "壬 Ren", "癸 Gui", "Movement, insight, connection"),
    ]
    stem_data = [
        [
            Paragraph("ELEMENT", styles["ChartLabel"]),
            Paragraph("YANG", styles["ChartLabel"]),
            Paragraph("YIN", styles["ChartLabel"]),
            Paragraph("CORE MOVEMENT", styles["ChartLabel"]),
        ]
    ]
    for row in stem_rows:
        stem_data.append(
            [
                Paragraph(row[0], styles["BodySmall"]),
                Paragraph(f'<font name="NotoSC-Bold">{row[1].split()[0]}</font> {row[1].split()[1]}', styles["BodySmall"]),
                Paragraph(f'<font name="NotoSC-Bold">{row[2].split()[0]}</font> {row[2].split()[1]}', styles["BodySmall"]),
                Paragraph(row[3], styles["BodySmall"]),
            ]
        )
    story.extend(
        [
            Table(
                stem_data,
                colWidths=[28 * mm, 28 * mm, 28 * mm, 76 * mm],
                rowHeights=[10 * mm] + [14 * mm] * 5,
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), PALE),
                        ("BOX", (0, 0), (-1, -1), 0.65, LINE),
                        ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                    ]
                ),
            ),
            Spacer(1, 6 * mm),
            Paragraph(
                "The Day Stem is called the <b>Day Master</b>. It becomes the "
                "reference point for interpreting the rest of the chart.",
                styles["Body"],
            ),
            PageBreak(),
            Paragraph("04 · SEASONAL CONTEXT", styles["Kicker"]),
            Paragraph("The Twelve Earthly Branches", styles["SectionTitle"]),
            Paragraph(
                "The Earthly Branches anchor the chart in season and time. "
                "They are commonly represented by the twelve zodiac animals, "
                "but each branch also stores one or more elemental influences.",
                styles["Body"],
            ),
        ]
    )
    branches = [
        ("子 Zi", "Rat", "Water", "23:00–01:00"),
        ("丑 Chou", "Ox", "Earth", "01:00–03:00"),
        ("寅 Yin", "Tiger", "Wood", "03:00–05:00"),
        ("卯 Mao", "Rabbit", "Wood", "05:00–07:00"),
        ("辰 Chen", "Dragon", "Earth", "07:00–09:00"),
        ("巳 Si", "Snake", "Fire", "09:00–11:00"),
        ("午 Wu", "Horse", "Fire", "11:00–13:00"),
        ("未 Wei", "Goat", "Earth", "13:00–15:00"),
        ("申 Shen", "Monkey", "Metal", "15:00–17:00"),
        ("酉 You", "Rooster", "Metal", "17:00–19:00"),
        ("戌 Xu", "Dog", "Earth", "19:00–21:00"),
        ("亥 Hai", "Pig", "Water", "21:00–23:00"),
    ]
    branch_data = []
    for i in range(0, 12, 2):
        cells = []
        for symbol, animal, element, hours in branches[i : i + 2]:
            chinese, roman = symbol.split()
            cells.append(
                [
                    Paragraph(
                        f'<font name="NotoSC-Bold" size="17">{chinese}</font> '
                        f"<b>{roman} · {animal}</b>",
                        styles["Body"],
                    ),
                    Paragraph(f"{element} · {hours}", styles["BodySmall"]),
                ]
            )
        branch_data.append(cells)
    story.extend(
        [
            Table(
                branch_data,
                colWidths=[80 * mm, 80 * mm],
                rowHeights=[26 * mm] * 6,
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), PALE_2),
                        ("BOX", (0, 0), (-1, -1), 0.65, LINE),
                        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6 * mm),
                    ]
                ),
            ),
            PageBreak(),
            Paragraph("05 · BALANCE", styles["Kicker"]),
            Paragraph("The Five Elements", styles["SectionTitle"]),
            element_strip(),
            Spacer(1, 8 * mm),
            Paragraph(
                "Wood, Fire, Earth, Metal, and Water describe movement, not "
                "material objects. Their meaning comes from two linked cycles.",
                styles["Body"],
            ),
            Paragraph("The productive cycle", styles["Subhead"]),
            Paragraph(
                "<b>Wood feeds Fire. Fire creates Earth. Earth bears Metal. "
                "Metal enriches Water. Water nourishes Wood.</b> This cycle "
                "shows support, output, and the movement of resources.",
                styles["Body"],
            ),
            Paragraph("The regulating cycle", styles["Subhead"]),
            Paragraph(
                "<b>Wood controls Earth. Earth contains Water. Water controls "
                "Fire. Fire shapes Metal. Metal cuts Wood.</b> Regulation can "
                "create discipline and usefulness; excess control can create pressure.",
                styles["Body"],
            ),
            callout(
                "Balance does not mean equal percentages",
                "A strong chart may need an element that releases or regulates "
                "energy. A weak chart may need support. Season and structure matter more than a simple count.",
            ),
            Spacer(1, 6 * mm),
            Paragraph(
                "Think in terms of function: What is abundant? What is useful? "
                "What is missing? Which relationship changes the whole pattern?",
                styles["Quote"],
            ),
            PageBreak(),
            Paragraph("06 · THE REFERENCE POINT", styles["Kicker"]),
            Paragraph("Day Master and chart strength", styles["SectionTitle"]),
            Paragraph(
                "The Heavenly Stem of the Day Pillar is the Day Master. It is "
                "the reference point used to classify the other elements as "
                "support, expression, resources, authority, or wealth.",
                styles["Body"],
            ),
            numbered_rule(1, "Season", "The Month Branch establishes the dominant climate."),
            numbered_rule(2, "Roots", "Branches can anchor and reinforce the Day Master."),
            numbered_rule(3, "Support", "Resource and companion elements can strengthen it."),
            numbered_rule(4, "Drain and pressure", "Output, wealth, and authority can use or regulate its energy."),
            Spacer(1, 4 * mm),
            Paragraph(
                "Strength is not the same as goodness. A strong Day Master may "
                "need direction and release; a weaker Day Master may be highly "
                "effective when the environment provides the right support.",
                styles["Body"],
            ),
            callout(
                "Avoid one-word identities",
                "“You are Earth” is only a beginning. The same Earth Day Master "
                "can express very differently depending on season, roots, combinations, and timing.",
            ),
            PageBreak(),
            Paragraph("07 · CHANGE OVER TIME", styles["Kicker"]),
            Paragraph("Luck Cycles and annual timing", styles["SectionTitle"]),
            Paragraph(
                "A BaZi chart is read through time. Ten-year Luck Cycles change "
                "the background conditions, while annual and monthly influences "
                "bring shorter waves of opportunity, pressure, visibility, or recovery.",
                styles["Body"],
            ),
            numbered_rule(1, "Ten-year cycle", "The long chapter: environment, priorities, and repeated themes."),
            numbered_rule(2, "Annual influence", "The year’s emphasis and its interaction with the birth chart."),
            numbered_rule(3, "Monthly influence", "Useful for sequencing attention and pacing decisions."),
            Spacer(1, 5 * mm),
            Paragraph(
                "Timing does not mean that one date guarantees an outcome. It "
                "helps you ask better questions: When should I consolidate? "
                "When is experimentation easier? When should I leave more room "
                "for recovery, negotiation, or verification?",
                styles["Body"],
            ),
            Paragraph(
                "Use timing to improve preparation, not to outsource judgment.",
                styles["Quote"],
            ),
            PageBreak(),
            Paragraph("08 · READING WELL", styles["Kicker"]),
            Paragraph("A responsible reading sequence", styles["SectionTitle"]),
            numbered_rule(1, "Confirm the inputs", "Date, local time, place, gender, and whether the hour is known."),
            numbered_rule(2, "Establish the season", "Begin with the Month Branch and the overall climate."),
            numbered_rule(3, "Assess the Day Master", "Look for roots, support, drain, and pressure."),
            numbered_rule(4, "Identify the structure", "Find the relationships that organize the chart."),
            numbered_rule(5, "Translate into lived language", "Connect symbols to work, relationships, habits, and choices."),
            numbered_rule(6, "Add timing last", "Interpret cycles only after the baseline chart is coherent."),
            Spacer(1, 5 * mm),
            callout(
                "Good interpretation is testable",
                "A useful reading should give you clear observations to verify "
                "against your life. It should name uncertainty and avoid fear-based claims.",
            ),
            PageBreak(),
            Paragraph("YOUR NEXT STEP", styles["Kicker"]),
            Paragraph("Bring the chart into focus", styles["SectionTitle"]),
            Paragraph(
                "You now have the core vocabulary: pillars, stems, branches, "
                "elements, Day Master, and timing. The next step is to see how "
                "these relationships combine in one chart.",
                styles["Body"],
            ),
            Spacer(1, 4 * mm),
            callout(
                "Start with a free chart",
                "Use the Tengyunzi calculator to generate your Four Pillars. "
                "If the birth hour is unknown, choose “Unknown” and keep hour-specific interpretation provisional.",
            ),
            Spacer(1, 8 * mm),
            Paragraph("Continue at tengyunzi.com", styles["SectionTitleSmall"]),
            Paragraph(
                "<b>Free Calculator</b> · Generate the chart<br/>"
                "<b>What’s Inside</b> · Preview all 24 report sections<br/>"
                "<b>Immediate AI Report</b> · $6.99, delivered after payment<br/>"
                "<b>Written by Tengyunzi</b> · $99, delivered within 72 hours",
                styles["Body"],
            ),
        ]
    )
    doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)


STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
STEM_ROMAN = ["Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui"]
BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
BRANCH_ROMAN = ["Zi", "Chou", "Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai"]
ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"]
ELEMENTS = ["Wood", "Wood", "Fire", "Fire", "Earth", "Earth", "Metal", "Metal", "Water", "Water"]


def year_record(year):
    index = (year - 1984) % 60
    stem_index = index % 10
    branch_index = index % 12
    return (
        str(year),
        f"{STEMS[stem_index]}{BRANCHES[branch_index]}",
        f"{STEM_ROMAN[stem_index]} {BRANCH_ROMAN[branch_index]}",
        ANIMALS[branch_index],
        ELEMENTS[stem_index],
    )


def zodiac_year_table(start, end):
    data = [
        [
            Paragraph("YEAR", styles["ChartLabel"]),
            Paragraph("PILLAR", styles["ChartLabel"]),
            Paragraph("ANIMAL", styles["ChartLabel"]),
            Paragraph("ELEMENT", styles["ChartLabel"]),
        ]
    ]
    for year in range(start, end + 1):
        number, chars, roman, animal, element = year_record(year)
        data.append(
            [
                Paragraph(number, styles["BodySmall"]),
                Paragraph(
                    f'<font name="NotoSC-Bold">{chars}</font> {roman}',
                    styles["BodySmall"],
                ),
                Paragraph(animal, styles["BodySmall"]),
                Paragraph(element, styles["BodySmall"]),
            ]
        )
    rows = end - start + 1
    return Table(
        data,
        colWidths=[17 * mm, 36 * mm, 24 * mm, 24 * mm],
        rowHeights=[7 * mm] + [7 * mm] * rows,
        repeatRows=1,
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PALE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE_2]),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ]
        ),
    )


def build_zodiac_chart(path):
    pagesize = landscape(A4)
    doc = SimpleDocTemplate(
        str(path),
        pagesize=pagesize,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title="Chinese Zodiac Year Chart 1926–2026",
        author="Tengyunzi",
        subject="Printable zodiac year and sexagenary cycle chart",
    )
    story = [
        Spacer(1, 12 * mm),
        Paragraph("PRINTABLE REFERENCE", styles["Kicker"]),
        Paragraph("Chinese Zodiac Year Chart", styles["CoverTitle"]),
        Paragraph(
            "A 1926–2026 reference for the year pillar, zodiac animal, "
            "and elemental quality in the 60-year cycle.",
            styles["CoverSubtitle"],
        ),
        Spacer(1, 5 * mm),
        callout(
            "Important BaZi date note",
            "The BaZi year usually changes at Li Chun, the solar term near "
            "February 4, rather than on January 1. If a birthday falls near "
            "the beginning of February, calculate the exact Four Pillars before using this chart.",
        ),
        Spacer(1, 10 * mm),
        Table(
            [
                [
                    Paragraph(
                        '<font name="NotoSC-Bold" size="31">甲子</font>',
                        styles["ChartChinese"],
                    ),
                    Paragraph(
                        "<b>60-year cycle</b><br/>Ten Heavenly Stems combine "
                        "with twelve Earthly Branches to form sixty year pillars.",
                        styles["Body"],
                    ),
                    Paragraph(
                        '<font name="NotoSC-Bold" size="31">丙午</font>',
                        styles["ChartChinese"],
                    ),
                    Paragraph(
                        "<b>2026 · Fire Horse</b><br/>Bing Wu is the 43rd "
                        "position in the cycle that began with Jia Zi.",
                        styles["Body"],
                    ),
                ]
            ],
            colWidths=[40 * mm, 75 * mm, 40 * mm, 75 * mm],
            rowHeights=[42 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), PALE_2),
                    ("BOX", (0, 0), (-1, -1), 0.65, LINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6 * mm),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6 * mm),
                ]
            ),
        ),
        Spacer(1, 2 * mm),
        cover_footer(),
        PageBreak(),
        Paragraph("1926–1959", styles["Kicker"]),
        Paragraph("Year pillars at a glance", styles["SectionTitleSmall"]),
        Table(
            [[zodiac_year_table(1926, 1942), zodiac_year_table(1943, 1959)]],
            colWidths=[112 * mm, 112 * mm],
            style=TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (0, 0), 0),
                    ("RIGHTPADDING", (0, 0), (0, 0), 5.5 * mm),
                    ("LEFTPADDING", (1, 0), (1, 0), 5.5 * mm),
                    ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ]
            ),
        ),
        PageBreak(),
        Paragraph("1960–1993", styles["Kicker"]),
        Paragraph("Year pillars at a glance", styles["SectionTitleSmall"]),
        Table(
            [[zodiac_year_table(1960, 1976), zodiac_year_table(1977, 1993)]],
            colWidths=[112 * mm, 112 * mm],
            style=TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (0, 0), 0),
                    ("RIGHTPADDING", (0, 0), (0, 0), 5.5 * mm),
                    ("LEFTPADDING", (1, 0), (1, 0), 5.5 * mm),
                    ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ]
            ),
        ),
        Spacer(1, 5 * mm),
        Paragraph(
            "For an exact chart, use the Tengyunzi calculator with the local "
            "birth date, time, and place.",
            styles["BodySmall"],
        ),
        PageBreak(),
        Paragraph("1994–2026", styles["Kicker"]),
        Paragraph("Year pillars at a glance", styles["SectionTitleSmall"]),
        Table(
            [[zodiac_year_table(1994, 2010), zodiac_year_table(2011, 2026)]],
            colWidths=[112 * mm, 112 * mm],
            style=TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (0, 0), 0),
                    ("RIGHTPADDING", (0, 0), (0, 0), 5.5 * mm),
                    ("LEFTPADDING", (1, 0), (1, 0), 5.5 * mm),
                    ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ]
            ),
        ),
        Spacer(1, 5 * mm),
        Paragraph(
            "For an exact chart, use the Tengyunzi calculator with the local "
            "birth date, time, and place.",
            styles["BodySmall"],
        ),
    ]
    doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)


REPORT_SECTIONS = [
    (
        "Core Elemental Force",
        "The sample Day Master is Yang Earth, born in a strong Fire season. "
        "This creates a steady, organizing presence that prefers to make ideas "
        "usable. The chart does not describe passive stability; it describes "
        "Earth that has been heated, tested, and asked to carry responsibility.",
        "At its best, this pattern becomes dependable leadership and patient "
        "execution. Under strain, it can become over-responsibility: taking on "
        "more than necessary because being useful feels safer than being uncertain.",
    ),
    (
        "Five-Element Balance",
        "Fire and Earth are prominent, while Water appears as a meaningful "
        "counterweight. Metal and Wood are less visible in this shortened "
        "three-pillar sample because the birth hour is unknown.",
        "The practical task is not to make every element equal. It is to create "
        "movement. Water cools and opens perspective; Wood adds direction; "
        "Metal creates a clean method for expressing what has been learned.",
    ),
    (
        "Underlying Motivations",
        "The chart is motivated by usefulness, continuity, and tangible proof. "
        "It tends to trust what can be maintained rather than what creates a "
        "brief impression. Security grows when effort becomes a repeatable system.",
        "A hidden motivation is the wish to remain composed. Because the chart "
        "can carry pressure well, other people may not notice when the inner "
        "load has already become too heavy.",
    ),
    (
        "Natural Strengths and Talents",
        "The strongest talents are synthesis, practical judgment, and the "
        "ability to hold several responsibilities without losing the larger "
        "purpose. This person often sees which part of a plan must be stabilized first.",
        "The gift becomes more visible when paired with a clear method of "
        "communication. Quiet competence can otherwise be mistaken for unlimited "
        "capacity, leading other people to keep adding work.",
    ),
    (
        "Best-Fit Working Style",
        "The chart works best with ownership, a stable objective, and enough "
        "time to understand the real constraints. Constantly changing priorities "
        "without explanation create unnecessary friction.",
        "A strong working rhythm alternates consolidation with exploration: "
        "define the standard, complete a meaningful block, then reopen the field "
        "for new information before committing again.",
    ),
    (
        "How You Create Value",
        "Value is created by turning ambiguity into a sequence people can "
        "follow. The chart is less interested in novelty for its own sake than "
        "in building something that continues to work after the initial excitement.",
        "This makes operations, advisory work, education, product structure, and "
        "long-term client relationships natural fields of contribution.",
    ),
    (
        "Where You Contribute Best",
        "The person contributes best where trust matters and where the outcome "
        "depends on sustained attention. They are often effective at the point "
        "where vision must become standards, schedules, or decisions.",
        "Environments that reward only speed can hide this strength. The right "
        "environment values judgment, continuity, and the ability to improve a "
        "system without creating unnecessary drama.",
    ),
    (
        "Independence and Collaboration",
        "Independence is important because the chart needs room to determine "
        "what is structurally sound. Collaboration works when roles are explicit "
        "and colleagues bring real expertise rather than constant supervision.",
        "The growth edge is to invite input earlier. Waiting until a plan feels "
        "fully formed can make collaboration look like approval-seeking rather "
        "than shared construction.",
    ),
    (
        "Emotional Relating Style",
        "Care is often expressed through reliability, practical help, and "
        "remembering what keeps another person steady. Emotional commitment may "
        "be more obvious in behavior than in spontaneous language.",
        "Because responsibility is a love language here, imbalance appears when "
        "care becomes management. Close relationships improve when support is "
        "offered as a choice rather than assumed as a duty.",
    ),
    (
        "Relationship User Manual",
        "This person responds well to directness, consistency, and calm follow-through. "
        "Unclear promises create more stress than an honest limitation. They need "
        "time to process a change before offering a final position.",
        "When conflict appears, begin with the shared practical reality, then name "
        "the emotional meaning. This order helps the chart remain present instead "
        "of retreating into problem-solving alone.",
    ),
    (
        "Repeating Patterns in Intimacy",
        "A repeating pattern is becoming the stabilizer and then privately "
        "resenting how much stability is required. The pattern begins with "
        "competence and becomes costly when needs remain unspoken.",
        "The corrective pattern is reciprocal responsibility: define what each "
        "person owns, allow help to be imperfect, and notice when predictability "
        "is being used to avoid vulnerability.",
    ),
    (
        "Early Family Imprint",
        "The Month Pillar suggests a formative environment where performance, "
        "practicality, or composure carried weight. Being dependable may have "
        "earned trust earlier than expressing uncertainty did.",
        "This imprint can produce real resilience. It can also make rest feel "
        "like something that must be justified. Adult growth includes treating "
        "recovery as part of responsibility rather than its opposite.",
    ),
    (
        "Your Role in Family Systems",
        "The likely family role is organizer, translator, or quiet problem holder. "
        "Other people may bring unfinished matters because this person has a "
        "history of making them manageable.",
        "A healthier role keeps warmth while returning ownership. Help can be "
        "specific, time-bounded, and requested. Boundaries protect the quality "
        "of care rather than reducing it.",
    ),
    (
        "Social Interaction Style",
        "Socially, the chart is observant before it is expansive. It prefers a "
        "few meaningful points of connection and often becomes more expressive "
        "once the purpose of a group is clear.",
        "The person may appear reserved in unstructured settings but becomes "
        "engaging when the conversation turns concrete, strategic, or useful.",
    ),
    (
        "Symbolic Pattern Reading",
        "Two Horse branches intensify Fire, emphasizing visibility, momentum, "
        "and the pressure to keep moving. The Rat branch introduces Water, "
        "creating a productive tension between acceleration and reflection.",
        "Symbolically, the task is to avoid choosing only one side. Momentum needs "
        "cooling and review; insight needs a structure that allows it to become action.",
    ),
    (
        "Inner Tensions and Integration",
        "The central tension lies between holding steady and remaining responsive. "
        "Too much steadiness becomes rigidity; too much reaction disrupts the "
        "continuity this chart needs.",
        "Integration comes through scheduled revision. Build a stable plan, then "
        "create deliberate moments where assumptions may be changed without "
        "making the whole structure feel unsafe.",
    ),
    (
        "The Sense of Something Missing",
        "What may feel missing is not necessarily ability but permission: "
        "permission to begin before the entire path is secure, to ask for help, "
        "or to change an identity built around being dependable.",
        "The answer is not impulsiveness. It is small, reversible experimentation "
        "that brings fresh evidence into a life otherwise organized around proven methods.",
    ),
    (
        "Resources and Security",
        "Security grows through reserves, clear agreements, and diversified sources "
        "of support. The chart benefits from seeing money, time, relationships, "
        "and health as a connected resource system.",
        "The risk is storing too much responsibility in one place. A resilient "
        "structure distributes knowledge, creates backup, and leaves room for "
        "conditions to change.",
    ),
    (
        "Character Across Life Stages",
        "Earlier stages emphasize proving reliability and learning how systems work. "
        "Middle stages ask the person to move from carrying systems to designing "
        "them. Later stages favor teaching, stewardship, and selective influence.",
        "The developmental shift is from being indispensable in every detail to "
        "creating structures that remain useful without constant personal effort.",
    ),
    (
        "Growth Rhythm",
        "Growth happens through accumulation followed by decisive reorganization. "
        "The person may appear to move slowly while gathering information, then "
        "change direction with surprising firmness once the structure is clear.",
        "This rhythm should be respected. Artificial urgency creates poor commitments; "
        "endless preparation creates stagnation. A defined decision date balances both.",
    ),
    (
        "Blind Spots That Drain You",
        "The largest drains are invisible obligations, perfection disguised as "
        "prudence, and helping before the actual request is understood. Each one "
        "uses strength without producing proportional value.",
        "A useful weekly question is: What am I maintaining only because I once "
        "agreed to it? Releasing one outdated obligation can restore more energy "
        "than adding a new productivity method.",
    ),
    (
        "Central Growth Lessons",
        "The first lesson is that stability must include adaptation. The second "
        "is that responsibility works best when it is chosen and bounded. The "
        "third is that clear expression prevents quiet effort from becoming invisible.",
        "Together these lessons move the chart from endurance toward authorship: "
        "not merely carrying what exists, but deciding what deserves to continue.",
    ),
    (
        "Practical Self-Development",
        "Use three practices: a monthly obligation audit, a written decision rule "
        "for recurring choices, and one protected block for exploration without "
        "an immediate deliverable.",
        "In relationships, practice naming the need before offering the solution. "
        "At work, document the standard so reliability becomes a shared system "
        "rather than a private burden.",
    ),
    (
        "Core Life Theme",
        "The core theme is building forms that can hold real life without becoming "
        "too rigid for life to change. This person is here to turn experience into "
        "structure, but the structure must remain breathable.",
        "The most mature expression is grounded authority: steady enough to be "
        "trusted, open enough to revise, and clear enough that other people can "
        "participate without depending on silent sacrifice.",
    ),
]


def report_section_card(number, title, first, second):
    return KeepTogether(
        [
            Table(
                [
                    [
                        Paragraph(f"{number:02d}", styles["CardNumber"]),
                        Paragraph(title, styles["SectionTitleSmall"]),
                    ]
                ],
                colWidths=[14 * mm, 146 * mm],
                style=TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (0, 0), 4 * mm),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
                    ]
                ),
            ),
            Paragraph(first, styles["Body"]),
            Paragraph(second, styles["Body"]),
        ]
    )


def build_report_sample(path):
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=25 * mm,
        leftMargin=25 * mm,
        topMargin=23 * mm,
        bottomMargin=22 * mm,
        title="24-Part BaZi Report Sample",
        author="Tengyunzi",
        subject="An anonymized English sample of the Tengyunzi 24-part BaZi report",
    )
    story = [
        Spacer(1, 15 * mm),
        Paragraph("ANONYMIZED REPORT PREVIEW", styles["Kicker"]),
        Paragraph("A 24-Part BaZi Reading", styles["CoverTitle"]),
        Paragraph(
            "A shortened English sample showing the structure, tone, and "
            "practical depth of a Tengyunzi personal report.",
            styles["CoverSubtitle"],
        ),
        Spacer(1, 6 * mm),
        four_pillars_chart(include_hour=False),
        Spacer(1, 7 * mm),
        callout(
            "Sample profile",
            "Born June 15, 1990 · Singapore · Male · Birth hour unknown. "
            "This profile is synthetic and used only to demonstrate the report format.",
        ),
        Spacer(1, 22 * mm),
        cover_footer(),
        PageBreak(),
        Paragraph("HOW TO READ THIS SAMPLE", styles["Kicker"]),
        Paragraph("A chart becomes useful through translation", styles["SectionTitle"]),
        Paragraph(
            "The report begins with chart structure and then translates it into "
            "work, relationships, resources, development, and practical next steps. "
            "Each section should connect to the same underlying pattern rather than "
            "read like an isolated personality label.",
            styles["Body"],
        ),
        Paragraph(
            "This preview is intentionally shorter than a delivered report. It "
            "shows all 24 section types while protecting client privacy and leaving "
            "room for the deeper chart-specific analysis included after purchase.",
            styles["Body"],
        ),
        Spacer(1, 4 * mm),
        Paragraph("Chart used in the demonstration", styles["Subhead"]),
        four_pillars_chart(include_hour=False),
        Spacer(1, 6 * mm),
        element_strip(),
        Spacer(1, 7 * mm),
        callout(
            "Interpretation boundary",
            "Because the hour is unknown, this sample avoids conclusions that depend "
            "on the Hour Pillar. The report is educational and reflective, not "
            "medical, legal, or financial advice.",
        ),
        PageBreak(),
    ]
    for index, (title, first, second) in enumerate(REPORT_SECTIONS, start=1):
        if index % 2 == 1:
            story.extend(
                [
                    Paragraph(
                        f"PART {((index - 1) // 2) + 1:02d} · REPORT SAMPLE",
                        styles["Kicker"],
                    )
                ]
            )
        story.append(report_section_card(index, title, first, second))
        if index % 2 == 1:
            story.append(Spacer(1, 8 * mm))
        else:
            story.append(PageBreak())
    story.extend(
        [
            Paragraph("CONTINUE YOUR READING", styles["Kicker"]),
            Paragraph("Choose the depth you need", styles["SectionTitle"]),
            Paragraph(
                "The immediate report is generated from your calculated chart "
                "using Tengyunzi’s structured 24-part BaZi framework. The personal "
                "reading is written by Tengyunzi for clients who want closer judgment, "
                "context, and synthesis.",
                styles["Body"],
            ),
            Spacer(1, 5 * mm),
            Table(
                [
                    [
                        Paragraph("<b>Immediate AI Report</b>", styles["Body"]),
                        Paragraph("<b>Written by Tengyunzi</b>", styles["Body"]),
                    ],
                    [
                        Paragraph(
                            "$6.99 · 24 sections · available after payment",
                            styles["BodySmall"],
                        ),
                        Paragraph(
                            "$99 · personal interpretation · delivered within 72 hours",
                            styles["BodySmall"],
                        ),
                    ],
                ],
                colWidths=[80 * mm, 80 * mm],
                rowHeights=[16 * mm, 24 * mm],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), PALE_2),
                        ("BOX", (0, 0), (-1, -1), 0.65, LINE),
                        ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6 * mm),
                    ]
                ),
            ),
            Spacer(1, 20 * mm),
            Paragraph("Read more at tengyunzi.com", styles["SectionTitleSmall"]),
        ]
    )
    doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)


def build_all():
    outputs = [
        (
            PUBLIC_DOWNLOADS / "tengyunzi-bazi-starter-guide.pdf",
            build_starter_guide,
        ),
        (
            PUBLIC_DOWNLOADS / "tengyunzi-zodiac-year-chart.pdf",
            build_zodiac_chart,
        ),
        (
            PUBLIC_DOWNLOADS / "tengyunzi-24-part-report-sample.pdf",
            build_report_sample,
        ),
    ]
    for path, builder in outputs:
        builder(path)
        copy2(path, OUTPUT_PDF / path.name)
        print(f"Generated {path.relative_to(ROOT)}")


if __name__ == "__main__":
    build_all()
