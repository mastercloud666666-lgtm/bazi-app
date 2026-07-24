from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer


SOURCE_FILE = Path(r"C:\Users\tgspc\bazi-app\supabase\functions\analyze\index.ts")
OUTPUT_FILE = Path(r"C:\Users\tgspc\Desktop\腾云子-命理报告提示词整理.pdf")


def extract_or_fallback(text: str, pattern: str, flags: int = re.S, fallback: str = "（未匹配到）") -> str:
    match = re.search(pattern, text, flags)
    if not match:
        return fallback
    if match.lastindex and match.lastindex >= 1:
        return match.group(1).strip()
    return match.group(0).strip()


def to_html_multiline(text: str) -> str:
    return escape(text).replace("\n", "<br/>")


def add_section(story: list, heading_style: ParagraphStyle, body_style: ParagraphStyle, title: str, content: str) -> None:
    story.append(Paragraph(escape(title), heading_style))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(to_html_multiline(content), body_style))
    story.append(Spacer(1, 5 * mm))


def main() -> None:
    source_text = SOURCE_FILE.read_text(encoding="utf-8")

    system_msg = extract_or_fallback(
        source_text,
        r"const SYSTEM_MSG = `([\s\S]*?)`;",
    )
    bazi_blueprint = extract_or_fallback(
        source_text,
        r"const BAZI_SECTION_BLUEPRINT_24 = `([\s\S]*?)`;",
    )
    bazi_free_prompt = extract_or_fallback(
        source_text,
        r"if \(free_only\)\s*\{\s*prompt = `([\s\S]*?)`;\s*\}\s*else \{",
    )
    bazi_paid_prompt = extract_or_fallback(
        source_text,
        r"const nextFiveYears = [\s\S]*?prompt = `([\s\S]*?)`;\s*\}\s*// end if free_only else",
    )
    bazi_output_override = extract_or_fallback(
        source_text,
        r"prompt \+= `\s*Output rule override for BAZI:\s*([\s\S]*?)`;",
    )
    bazi_force_canonical = extract_or_fallback(
        source_text,
        r"统一基准约束（用于三档一致性）：([\s\S]*?)`;",
    )
    bazi_tier_vip = extract_or_fallback(
        source_text,
        r"档位约束：完整版必须完整输出第1段到第24段。总字数目标7000-9000字。",
        fallback="档位约束：完整版必须完整输出第1段到第24段。总字数目标7000-9000字。",
    )
    bazi_tier_pro = extract_or_fallback(
        source_text,
        r"档位约束：进阶版只能输出第1段到第16段，不得输出第17段及以后。总字数目标4800-5600字（约5000字）。",
        fallback="档位约束：进阶版只能输出第1段到第16段，不得输出第17段及以后。总字数目标4800-5600字（约5000字）。",
    )
    bazi_tier_basic = extract_or_fallback(
        source_text,
        r"档位约束：初级版只能输出第1段到第8段，不得输出第9段及以后。总字数目标2800-3400字（约3000字）。",
        fallback="档位约束：初级版只能输出第1段到第8段，不得输出第9段及以后。总字数目标2800-3400字（约3000字）。",
    )
    bazi_tier_free = extract_or_fallback(
        source_text,
        r"档位约束：免费版只能输出第1段到第3段，不得输出第4段及以后。总字数目标900-1400字。",
        fallback="档位约束：免费版只能输出第1段到第3段，不得输出第4段及以后。总字数目标900-1400字。",
    )
    section_range_constraint = extract_or_fallback(
        source_text,
        r"function buildSectionRangeConstraint\(sectionStart: number, sectionEnd: number\): string \{\s*return `([\s\S]*?)`;\s*\}",
    )
    hepan_prompt = extract_or_fallback(
        source_text,
        r"else if \(service === 'hepan'\) \{[\s\S]*?maxTokens = 8192;\s*prompt = `([\s\S]*?)`;",
    )

    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    source_meta = (
        "文档用途：整理当前站点用于大模型生成命理报告的核心提示词（含占位符）。\n"
        f"来源文件：{SOURCE_FILE}\n"
        f"生成时间：{generated_at}\n"
        "调用模型（代码中）：deepseek-chat（主分析）、deepseek-vl2（风水读图辅助）。\n"
        "说明：以下内容保持源码语义，便于后续继续维护与迭代。"
    )

    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleCN",
        parent=styles["Title"],
        fontName="STSong-Light",
        fontSize=20,
        leading=26,
    )
    subtitle_style = ParagraphStyle(
        "SubtitleCN",
        parent=styles["Normal"],
        fontName="STSong-Light",
        fontSize=11,
        leading=16,
        textColor="#4B5563",
        wordWrap="CJK",
    )
    heading_style = ParagraphStyle(
        "HeadingCN",
        parent=styles["Heading2"],
        fontName="STSong-Light",
        fontSize=14,
        leading=20,
        spaceBefore=2 * mm,
        spaceAfter=1 * mm,
        wordWrap="CJK",
    )
    body_style = ParagraphStyle(
        "BodyCN",
        parent=styles["Normal"],
        fontName="STSong-Light",
        fontSize=10.5,
        leading=16,
        wordWrap="CJK",
    )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title="腾云子命理报告提示词整理",
        author="Codex",
    )

    story = []
    story.append(Paragraph("腾云子网站命理报告提示词整理", title_style))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(to_html_multiline(source_meta), subtitle_style))
    story.append(Spacer(1, 6 * mm))

    add_section(story, heading_style, body_style, "一、系统提示词（SYSTEM_MSG）", system_msg)
    story.append(PageBreak())

    add_section(story, heading_style, body_style, "二、八字报告24段框架（BAZI_SECTION_BLUEPRINT_24）", bazi_blueprint)
    add_section(story, heading_style, body_style, "三、八字免费版用户提示词（prompt）", bazi_free_prompt)
    story.append(PageBreak())

    add_section(story, heading_style, body_style, "四、八字付费版用户提示词（prompt）", bazi_paid_prompt)
    add_section(story, heading_style, body_style, "五、八字统一输出规则（Output rule override）", bazi_output_override)
    add_section(story, heading_style, body_style, "六、VIP全量一致性约束（forceCanonicalAllSections）", bazi_force_canonical)
    add_section(
        story,
        heading_style,
        body_style,
        "七、档位约束（免费/初级/进阶/完整版）",
        "\n".join([bazi_tier_free, bazi_tier_basic, bazi_tier_pro, bazi_tier_vip]),
    )
    add_section(story, heading_style, body_style, "八、分段生成范围约束（buildSectionRangeConstraint）", section_range_constraint)
    story.append(PageBreak())

    add_section(story, heading_style, body_style, "九、合盘报告提示词（service=hepan）", hepan_prompt)

    doc.build(story)
    print(f"PDF_CREATED: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
