#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate zh-Hant and English versions for all /public/blog/*.html articles.

Scope:
- Source articles: /public/blog/*.html (excluding index.html)
- Outputs:
  - /public/blog/<slug>.html          (rewritten zh-Hans with language switcher)
  - /public/blog/zh-hant/<slug>.html  (Traditional Chinese)
  - /public/blog/en/<slug>.html       (English summary + original Chinese body)
"""

from __future__ import annotations

import argparse
import html
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable

from bs4 import BeautifulSoup
from deep_translator import MyMemoryTranslator
from opencc import OpenCC
import translators as ts


TODAY = date.today().isoformat()
ROOT = Path(__file__).resolve().parent
BLOG = ROOT / "public" / "blog"
BLOG_TW = BLOG / "zh-hant"
BLOG_EN = BLOG / "en"
SITEMAP = ROOT / "public" / "sitemap.xml"
CACHE_FILE = ROOT / "tmp_translate_cache.json"

IGNORE = {"index.html"}
CJK_RE = re.compile(r"[\u3400-\u9fff]")
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")

cc = OpenCC("s2t")
translator = MyMemoryTranslator(source="zh-CN", target="en-US")
translation_cache: dict[str, str] = {}
_dirty = 0


@dataclass
class Article:
    slug: str
    title: str
    description: str
    body_html: str
    published: str
    related: list[tuple[str, str]]


I18N = {
    "zh-Hans": {
        "lang": "zh-CN",
        "brand": "云子命理",
        "home": "首页",
        "hepan": "合盘分析",
        "blog": "命理知识",
        "crumb": "首页 / 命理知识",
        "meta_cat": "命理科普",
        "faq_title": "常见问题",
        "faq_q1": "这篇内容适合哪些人先看？",
        "faq_a1": "适合正在做关键人生决策、反复试错、希望先看清趋势再行动的人。",
        "faq_q2": "没有准确出生时辰，还能先看吗？",
        "faq_a2": "可以。先按三柱做方向判断，补全时辰后再看节奏与细节。",
        "faq_q3": "看完后怎么落地执行？",
        "faq_a3": "建议按 30 天、90 天、半年分层执行，优先低风险动作，再逐步加大投入。",
        "cta_title": "先免费排盘，再按需解锁完整版",
        "cta_desc": "输入出生信息，先看基础结论；需要更深层建议时，再解锁完整报告。",
        "cta_btn": "立即开始排盘",
        "related": "相关阅读",
        "footer": "© 2026 云子命理 · tengyunzi.com",
        "lang_zh": "简体中文",
        "lang_tw": "繁體中文",
        "lang_en": "English",
    },
    "zh-Hant": {
        "lang": "zh-Hant",
        "brand": "雲子命理",
        "home": "首頁",
        "hepan": "合盤分析",
        "blog": "命理知識",
        "crumb": "首頁 / 命理知識",
        "meta_cat": "命理科普",
        "faq_title": "常見問題",
        "faq_q1": "這篇內容適合哪些人先看？",
        "faq_a1": "適合正在做關鍵人生決策、反覆試錯、希望先看清趨勢再行動的人。",
        "faq_q2": "沒有準確出生時辰，還能先看嗎？",
        "faq_a2": "可以。先按三柱做方向判斷，補全時辰後再看節奏與細節。",
        "faq_q3": "看完後怎麼落地執行？",
        "faq_a3": "建議按 30 天、90 天、半年分層執行，優先低風險動作，再逐步加大投入。",
        "cta_title": "先免費排盤，再按需解鎖完整版",
        "cta_desc": "輸入出生資訊，先看基礎結論；需要更深層建議時，再解鎖完整報告。",
        "cta_btn": "立即開始排盤",
        "related": "相關閱讀",
        "footer": "© 2026 雲子命理 · tengyunzi.com",
        "lang_zh": "简体中文",
        "lang_tw": "繁體中文",
        "lang_en": "English",
    },
    "en": {
        "lang": "en",
        "brand": "Yunzi Destiny",
        "home": "Home",
        "hepan": "Compatibility",
        "blog": "BLOG",
        "crumb": "Home / BLOG",
        "meta_cat": "Bazi Guide",
        "faq_title": "FAQ",
        "faq_q1": "Who should read this first?",
        "faq_a1": "People facing major choices and wanting lower-risk decisions with clearer timing.",
        "faq_q2": "Can I still read this without exact birth hour?",
        "faq_a2": "Yes. You can start with a 3-pillar baseline and refine timing later.",
        "faq_q3": "How should I act after reading?",
        "faq_a3": "Break actions into 30-day, 90-day, and 6-month plans. Start small, then scale.",
        "cta_title": "Start with a Free Chart, Upgrade Only If Needed",
        "cta_desc": "Get a baseline first. Unlock the full report when you need deeper decision support.",
        "cta_btn": "Start Free Chart",
        "related": "Related Reads",
        "footer": "© 2026 Yunzi Destiny · tengyunzi.com",
        "lang_zh": "简体中文",
        "lang_tw": "繁體中文",
        "lang_en": "English",
    },
}


def has_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def split_chunks(text: str, max_len: int = 320) -> list[str]:
    text = (text or "").strip()
    if len(text) <= max_len:
        return [text] if text else []
    parts = re.split(r"([。！？；\n])", text)
    chunks: list[str] = []
    cur = ""
    for idx in range(0, len(parts), 2):
        seg = parts[idx]
        punc = parts[idx + 1] if idx + 1 < len(parts) else ""
        piece = (seg + punc).strip()
        if not piece:
            continue
        if len(cur) + len(piece) <= max_len:
            cur += piece
        else:
            if cur:
                chunks.append(cur)
            cur = piece
    if cur:
        chunks.append(cur)
    return chunks


def to_en(text: str) -> str:
    global _dirty
    s = (text or "").strip()
    if not s:
        return ""
    if s in translation_cache:
        cached = translation_cache[s]
        # If cached result is exactly the same Chinese source, retry with a better translator.
        if cached != s or not has_cjk(s):
            return cached
    if not has_cjk(s):
        translation_cache[s] = s
        return s
    out_parts: list[str] = []
    for chunk in split_chunks(s):
        tr = ""
        # Primary: translators (bing/google/youdao), better for zh->en paragraph translation.
        for engine in ("bing", "google", "youdao"):
            try:
                tr = ts.translate_text(chunk, translator=engine, from_language="zh", to_language="en")
            except Exception:
                tr = ""
            if tr and tr.strip() and tr.strip() != chunk.strip():
                break
        # Fallback: deep_translator
        if not tr or tr.strip() == chunk.strip():
            try:
                tr = translator.translate(chunk) or ""
            except Exception:
                tr = ""
        if not tr:
            tr = chunk
        out_parts.append(tr.strip())
    out = " ".join([x for x in out_parts if x]).strip() or s
    translation_cache[s] = out
    _dirty += 1
    if _dirty >= 80:
        save_cache()
        _dirty = 0
    return out


def transform_html_text(html_in: str, fn: Callable[[str], str]) -> str:
    soup = BeautifulSoup(html_in or "", "html.parser")
    for node in soup.find_all(string=True):
        if not node or not str(node).strip():
            continue
        if node.parent and node.parent.name in {"script", "style"}:
            continue
        node.replace_with(fn(str(node)))
    return "".join(str(x) for x in soup.contents)


def extract_article(path: Path) -> Article:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(raw, "html.parser")

    h1 = soup.find("h1")
    title = (h1.get_text(" ", strip=True) if h1 else "").strip()
    if not title:
        t = soup.title.get_text(" ", strip=True) if soup.title else path.stem
        title = t.split("|")[0].strip()

    desc = ""
    md = soup.find("meta", attrs={"name": "description"})
    if md and md.get("content"):
        desc = md["content"].strip()
    if not desc:
        p = soup.find("p")
        desc = (p.get_text(" ", strip=True) if p else title)[:140]

    body = soup.select_one(".article-body") or soup.find("article") or soup.find("main")
    if body:
        body_html = "".join(str(x) for x in body.contents).strip()
    else:
        body_html = f"<p>{html.escape(desc)}</p>"

    published = TODAY
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        txt = script.string or script.get_text() or ""
        m = DATE_RE.search(txt)
        if m:
            published = m.group(0)
            break
    if published == TODAY:
        m2 = DATE_RE.search(raw)
        if m2:
            published = m2.group(0)

    related: list[tuple[str, str]] = []
    for a in soup.select(".related a"):
        href = (a.get("href") or "").strip()
        txt = a.get_text(" ", strip=True)
        if href and txt:
            related.append((href, txt))
    if not related:
        for a in soup.select("a[href^='/blog/']")[:3]:
            href = (a.get("href") or "").strip()
            txt = a.get_text(" ", strip=True)
            if href and txt:
                related.append((href, txt))

    return Article(
        slug=path.name,
        title=title,
        description=desc,
        body_html=body_html,
        published=published,
        related=related[:5],
    )


def map_href(lang: str, href: str) -> str:
    href = (href or "").strip()
    if href.startswith("/blog/") and href.endswith(".html"):
        slug = href.split("/")[-1]
        if lang == "zh-Hans":
            return f"/blog/{slug}"
        if lang == "zh-Hant":
            return f"/blog/zh-hant/{slug}"
        return f"/blog/en/{slug}"
    return href


def render_en_body(article: Article) -> str:
    # Full-content English page: keep original structure and translate all visible text.
    return transform_html_text(article.body_html, to_en)


def render_page(article: Article, lang: str) -> str:
    m = I18N[lang]
    slug = article.slug
    zh_url = f"/blog/{slug}"
    tw_url = f"/blog/zh-hant/{slug}"
    en_url = f"/blog/en/{slug}"
    cur_url = {"zh-Hans": zh_url, "zh-Hant": tw_url, "en": en_url}[lang]

    if lang == "zh-Hans":
        title = article.title
        desc = article.description
        body_html = article.body_html
        rel_titles = [(map_href(lang, h), t) for h, t in article.related]
    elif lang == "zh-Hant":
        title = cc.convert(article.title)
        desc = cc.convert(article.description)
        body_html = transform_html_text(article.body_html, cc.convert)
        rel_titles = [(map_href(lang, h), cc.convert(t)) for h, t in article.related]
    else:
        title = to_en(article.title)
        desc = to_en(article.description)
        body_html = render_en_body(article)
        rel_titles = [(map_href(lang, h), to_en(t)) for h, t in article.related]

    schema_article = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": desc,
        "author": {"@type": "Organization", "name": m["brand"]},
        "publisher": {"@type": "Organization", "name": m["brand"], "url": "https://www.tengyunzi.com"},
        "datePublished": article.published,
        "dateModified": TODAY,
        "mainEntityOfPage": f"https://www.tengyunzi.com{cur_url}",
    }
    schema_faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": m["faq_q1"], "acceptedAnswer": {"@type": "Answer", "text": m["faq_a1"]}},
            {"@type": "Question", "name": m["faq_q2"], "acceptedAnswer": {"@type": "Answer", "text": m["faq_a2"]}},
            {"@type": "Question", "name": m["faq_q3"], "acceptedAnswer": {"@type": "Answer", "text": m["faq_a3"]}},
        ],
    }

    related_html = ""
    if rel_titles:
        related_html = "\n".join(
            [f'<li><a href="{html.escape(href)}">{html.escape(txt)}</a></li>' for href, txt in rel_titles]
        )
    else:
        related_html = "<li><a href='/blog/'>/blog/</a></li>"

    selected = {"zh-Hans": "", "zh-Hant": "", "en": ""}
    selected[lang] = " selected"

    return f"""<!DOCTYPE html>
<html lang="{m['lang']}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{html.escape(title)} | {html.escape(m['brand'])}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.tengyunzi.com{cur_url}">
<link rel="alternate" hreflang="zh-CN" href="https://www.tengyunzi.com{zh_url}">
<link rel="alternate" hreflang="zh-Hant" href="https://www.tengyunzi.com{tw_url}">
<link rel="alternate" hreflang="en" href="https://www.tengyunzi.com{en_url}">
<link rel="alternate" hreflang="x-default" href="https://www.tengyunzi.com{zh_url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="https://www.tengyunzi.com{cur_url}">
<script type="application/ld+json">{json.dumps(schema_article, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(schema_faq, ensure_ascii=False)}</script>
<style>
:root{{--navy:#0a2540;--blue:#2563eb;--line:#dbe3f0;--text:#1f2937;--muted:#6b7280}}
*{{box-sizing:border-box}}
body{{margin:0;font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;color:var(--text);line-height:1.78;background:#fff}}
a{{color:#1d4ed8;text-decoration:none}}
.nav{{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);z-index:20}}
.nav-in{{max-width:980px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px}}
.brand{{color:var(--navy);font-weight:700;text-decoration:none}}
.right{{display:flex;align-items:center;gap:14px}}
.links a{{margin-left:16px;color:#4b5563;text-decoration:none;font-size:14px}}
.lang{{height:34px;border:1px solid var(--line);border-radius:8px;padding:0 10px;color:var(--navy);font-size:.9rem}}
.wrap{{max-width:900px;margin:0 auto;padding:28px 20px 64px}}
.crumb{{font-size:13px;color:var(--muted);margin-bottom:12px}}
h1{{font-size:34px;line-height:1.35;color:var(--navy);margin:8px 0 10px}}
h2{{font-size:24px;color:var(--navy);margin:28px 0 10px}}
h3{{font-size:18px;color:#183b66;margin:18px 0 8px}}
p{{margin:0 0 12px}}
ul,ol{{margin:0 0 14px 22px}}
.meta{{font-size:13px;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:22px}}
.article-body h2{{font-size:22px}}
.article-body h3{{font-size:18px}}
.summary-box{{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:16px 0}}
.orig-cn{{margin-top:20px;border:1px dashed #c7d2fe;border-radius:10px;padding:12px 14px;background:#fafbff}}
.faq{{margin-top:26px;padding:18px;border:1px solid #d7e4ff;border-radius:12px;background:#f9fbff}}
.faq-item{{padding:10px 0;border-bottom:1px dashed #dbe3f0}}
.faq-item:last-child{{border-bottom:none;padding-bottom:0}}
.cta{{margin-top:30px;background:#0c2140;color:#fff;padding:26px;border-radius:14px;text-align:center}}
.cta p{{color:#d7e3ff;margin-bottom:14px}}
.btn{{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700}}
.related{{margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}}
.related ul{{list-style:none;margin:10px 0 0;padding:0}}
.related li{{padding:8px 0;border-bottom:1px solid #edf2f7}}
.related li:last-child{{border-bottom:none}}
footer{{margin-top:32px;color:var(--muted);font-size:13px;text-align:center}}
@media (max-width:760px){{
  h1{{font-size:28px}}
  h2{{font-size:22px}}
  .nav-in{{flex-wrap:wrap}}
  .links{{order:3;width:100%}}
  .links a{{margin-left:0;margin-right:16px}}
}}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-in">
    <a class="brand" href="/index.html">{html.escape(m['brand'])}</a>
    <div class="right">
      <div class="links">
        <a href="/index.html">{html.escape(m['home'])}</a>
        <a href="/hepan.html">{html.escape(m['hepan'])}</a>
        <a href="/blog/">{html.escape(m['blog'])}</a>
      </div>
      <select id="lang" class="lang">
        <option value="zh-Hans"{selected['zh-Hans']}>{html.escape(m['lang_zh'])}</option>
        <option value="zh-Hant"{selected['zh-Hant']}>{html.escape(m['lang_tw'])}</option>
        <option value="en"{selected['en']}>{html.escape(m['lang_en'])}</option>
      </select>
    </div>
  </div>
</nav>

<main class="wrap">
  <div class="crumb">{html.escape(m['crumb'])}</div>
  <h1>{html.escape(title)}</h1>
  <div class="meta">{html.escape(m['brand'])} · {html.escape(article.published)} · {html.escape(m['meta_cat'])}</div>
  <div class="article-body">
{body_html}
  </div>

  <section class="faq">
    <h2>{html.escape(m['faq_title'])}</h2>
    <div class="faq-item"><h3>{html.escape(m['faq_q1'])}</h3><p>{html.escape(m['faq_a1'])}</p></div>
    <div class="faq-item"><h3>{html.escape(m['faq_q2'])}</h3><p>{html.escape(m['faq_a2'])}</p></div>
    <div class="faq-item"><h3>{html.escape(m['faq_q3'])}</h3><p>{html.escape(m['faq_a3'])}</p></div>
  </section>

  <div class="cta">
    <h3>{html.escape(m['cta_title'])}</h3>
    <p>{html.escape(m['cta_desc'])}</p>
    <a class="btn" href="/index.html">{html.escape(m['cta_btn'])}</a>
  </div>

  <div class="related">
    <h2>{html.escape(m['related'])}</h2>
    <ul>
{related_html}
    </ul>
  </div>

  <footer>{html.escape(m['footer'])}</footer>
</main>

<script>
(() => {{
  const map = {{
    "zh-Hans": "{zh_url}",
    "zh-Hant": "{tw_url}",
    "en": "{en_url}"
  }};
  const s = document.getElementById("lang");
  if (!s) return;
  s.addEventListener("change", () => {{
    const v = s.value || "zh-Hans";
    localStorage.setItem("site_lang_pref_v2", v);
    location.href = map[v] || map["zh-Hans"];
  }});
}})();
</script>
</body>
</html>
"""


def add_sitemap_entries(urls: list[str]) -> int:
    if not SITEMAP.exists():
        return 0
    txt = SITEMAP.read_text(encoding="utf-8", errors="ignore")
    new_entries: list[str] = []
    for u in urls:
        if u in txt:
            continue
        new_entries.append(
            f"  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.62</priority></url>"
        )
    if not new_entries:
        return 0
    updated = txt.replace("</urlset>", "\n" + "\n".join(new_entries) + "\n</urlset>")
    SITEMAP.write_text(updated, encoding="utf-8")
    return len(new_entries)


def load_cache() -> None:
    if not CACHE_FILE.exists():
        return
    try:
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            translation_cache.update({str(k): str(v) for k, v in data.items()})
    except Exception:
        pass


def save_cache() -> None:
    try:
        CACHE_FILE.write_text(json.dumps(translation_cache, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=1, help="1-based start index")
    parser.add_argument("--end", type=int, default=0, help="1-based end index (inclusive), 0=all")
    parser.add_argument(
        "--langs",
        type=str,
        default="zh,tw,en",
        help="comma list: zh,tw,en (e.g. en or zh,tw,en)",
    )
    args = parser.parse_args()

    BLOG_TW.mkdir(parents=True, exist_ok=True)
    BLOG_EN.mkdir(parents=True, exist_ok=True)
    load_cache()

    sources = sorted([p for p in BLOG.glob("*.html") if p.name not in IGNORE])
    if not sources:
        print("No source blog pages found.")
        return

    start = max(1, args.start)
    end = len(sources) if args.end <= 0 else min(len(sources), args.end)
    if start > end:
        print("Invalid range.")
        return
    sources = sources[start - 1 : end]

    langs = {x.strip().lower() for x in args.langs.split(",") if x.strip()}
    do_zh = "zh" in langs
    do_tw = "tw" in langs
    do_en = "en" in langs

    generated = 0
    sitemap_urls: list[str] = []
    for idx, path in enumerate(sources, start=start):
        article = extract_article(path)
        if do_zh:
            zh_page = render_page(article, "zh-Hans")
            (BLOG / article.slug).write_text(zh_page, encoding="utf-8")
        if do_tw:
            tw_page = render_page(article, "zh-Hant")
            (BLOG_TW / article.slug).write_text(tw_page, encoding="utf-8")
        if do_en:
            en_page = render_page(article, "en")
            (BLOG_EN / article.slug).write_text(en_page, encoding="utf-8")

        sitemap_urls.append(f"https://www.tengyunzi.com/blog/zh-hant/{article.slug}")
        sitemap_urls.append(f"https://www.tengyunzi.com/blog/en/{article.slug}")
        generated += 1
        print(f"[{idx}] {article.slug}")
        save_cache()

    added = add_sitemap_entries(sitemap_urls)
    print(f"Generated multilingual pages for {generated} source articles.")
    print(f"Sitemap new entries added: {added}")
    print(f"Translation cache size: {len(translation_cache)}")
    save_cache()


if __name__ == "__main__":
    main()
