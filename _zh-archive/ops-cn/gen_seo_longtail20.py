#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import html, json
from pathlib import Path
from opencc import OpenCC

TODAY='2026-03-28'
ROOT=Path(__file__).resolve().parent
BLOG=ROOT/'public'/'blog'
BLOG_TW=BLOG/'zh-hant'
BLOG_EN=BLOG/'en'
SITEMAP=ROOT/'public'/'sitemap.xml'
SITEMAP_P=ROOT/'public'/'sitemap-priority.xml'
cc=OpenCC('s2t')

POSTS=[
('bazi-tiaocao-zhangxin-chuangkou','八字看什么时候跳槽更容易涨薪？先看窗口再行动','想跳槽又怕降薪？从八字看你的职位跃迁窗口、行业匹配度和涨薪概率，少走职业弯路。','When Is the Best Time to Job-Hop for a Salary Raise?','Thinking about switching jobs but worried about salary risk? Use Bazi timing to identify your best growth window.'),
('bazi-tizhi-nei-haishi-shichang','体制内还是市场化岗位更适合你？八字职业路径判断','想知道你更适合体制内稳定路线，还是市场化高弹性岗位？从八字看职业安全感与上升模式。','Government-Track or Market Role: Which Path Fits You?','Use Bazi to evaluate whether a stable-track or market-growth career model is a better long-term fit.'),
('bazi-fuye-chaoguo-zhuyema','副业能超过主业吗？八字看你的第二收入天花板','副业做不起来，常见问题不是不努力，而是模式选错。八字帮你判断副业潜力与变现路径。','Can Your Side Hustle Overtake Your Main Income?','If your side hustle is stuck, the issue may be model mismatch. Bazi helps identify your best monetization path.'),
('bazi-shihe-zuo-xiaoshou-ma','你适合做销售吗？八字看成交力与抗压能力','不是所有人都适合高压销售。用八字判断你的表达力、拿单节奏与长期续航能力。','Are You Built for Sales? Bazi View on Closing Power','Sales is not for everyone. Use Bazi to evaluate communication style, closing rhythm, and pressure tolerance.'),
('bazi-shihe-zuo-zimeiti-ma','你适合做自媒体吗？八字看内容变现与个人IP潜力','自媒体不是人人都能长期做成。八字帮你判断表达风格、涨粉路径和商业化节奏。','Should You Build a Creator Brand?','Not everyone can build a sustainable media brand. Use Bazi to identify your expression style and monetization rhythm.'),
('bazi-shihe-kaidian-ma','适合开店吗？八字看开店时机、选址与回本节奏','想开店怕踩坑？从八字看你是否适合实体经营、何时开店更稳、怎么降低回本风险。','Should You Open a Physical Store?','Opening a store is high risk if timing is wrong. Use Bazi to evaluate fit, location rhythm, and payback safety.'),
('bazi-hezuo-shengyi-fengxian','合伙做生意靠谱吗？八字看合作风险与分钱模式','合伙最怕关系好、账目乱。八字帮你判断合伙适配度、合作雷区与分润结构。','Is Business Partnership Worth It?','Partnerships fail from unclear roles and profit rules. Use Bazi to evaluate partner fit and conflict risk.'),
('bazi-fuzhai-fanshen-shijian','负债后还能翻身吗？八字看回款节奏与翻盘窗口','负债阶段最怕继续错决策。通过八字看你什么时候现金流回正、如何降低破财风险。','Can You Recover from Debt?','Debt recovery is about timing and strategy. Use Bazi to identify your cashflow recovery window and risk controls.'),
('bazi-guiren-yun-shenme-shihou-lai','贵人运什么时候来？八字看关键人脉与机会入口','贵人不是等来的，是在对的节奏里遇到的。八字帮你看贵人类型、出现阶段和合作方式。','When Does Mentor Luck Arrive?','Breakthroughs often come through the right people at the right time. Bazi helps identify that window.'),
('bazi-dayun-zhuanhao-xinhao','大运转好前有什么信号？八字看人生上升前奏','好运来之前通常有迹可循。通过八字识别大运转强信号，提前布局事业、财运与关系。','Signs Before a Major Luck Shift','Use Bazi to detect early momentum shift signals and prepare before your growth cycle starts.'),
('bazi-shenme-shihou-yudao-zhengyuan','什么时候会遇到正缘？八字看正缘出现时间与场景','想知道正缘什么时候来？通过八字看感情窗口、遇见场景和关系推进节奏，少走反复关系。','When Will You Meet the Right Partner?','Use Bazi to identify your relationship window, likely encounter scenes, and pacing strategy.'),
('bazi-yi-di-lian-neng-jiehun-ma','异地恋能走到结婚吗？八字看关系稳定度与落地概率','异地恋最怕长期消耗。通过八字看两人的相处结构、冲突点和结婚落地窗口。','Can a Long-Distance Relationship Lead to Marriage?','Distance is not the only issue. Use Bazi to assess relationship structure, conflict points and marriage timing.'),
('bazi-laogong-chugui-hunyin-nengbuneng-yao','遭遇出轨后婚姻还能要吗？八字看修复可能与止损边界','出轨后该挽回还是止损？通过八字看关系修复概率、反复风险与后续决策边界。','After Infidelity: Repair or Cut Losses?','Use Bazi to evaluate repair probability, repeat-risk, and practical decision boundaries after betrayal.'),
('bazi-fenshou-hou-fuhe-jilv','分手后还有复合机会吗？八字看复合概率与最佳时机','分手后想挽回但怕更受伤？从八字看复合机会、沟通窗口与关系是否值得重启。','Any Chance to Reconcile After Breakup?','Use Bazi to evaluate relationship restart probability and communication timing before emotional overinvestment.'),
('hepan-buhe-shifou-bixu-fenshou','合盘不合就一定要分手吗？看清可磨合还是高消耗','合盘不高不代表一定结束。通过合盘看关系冲突类型、可修复程度和长期稳定可能。','Low Compatibility Means Breakup? Not Always','A low score is not always the end. Compatibility structure helps judge repairability and long-term stability.'),
('hepan-shui-fuchu-gengduo','合盘怎么看谁付出更多？避免关系长期失衡','关系里总感觉自己更累？用合盘看双方投入结构、情绪消耗点与平衡策略。','Who Invests More in the Relationship?','If one side keeps feeling exhausted, check your relationship investment pattern and response gap.'),
('bazi-taohua-duo-dan-bu-wending','桃花很多却总不稳定？八字看感情反复的根源','有桃花不等于有结果。八字帮你看为什么总遇到短期关系、如何提升稳定恋爱概率。','Many Romantic Chances but No Stability?','Attraction does not guarantee outcomes. Use Bazi to identify recurring patterns and improve relationship stability.'),
('bazi-beiyun-shijian-chuangkou','什么时候备孕成功率更高？八字看备孕时间窗口','备孕反复不顺时，节奏比盲目努力更重要。通过八字看备孕窗口、压力点与家庭协同。','Best Timing for Pregnancy Planning','When planning gets stuck, timing and stress rhythm matter. Bazi helps identify a better window.'),
('bazi-jinnian-shihe-kaiche-ma','今年适合买车吗？八字看大额消费与现金流安全线','买车是提升效率还是增加负担？通过八字看今年买车时机、预算边界与风险控制。','Should You Buy a Car This Year?','A car can improve efficiency or create financial drag. Use Bazi timing to decide your safest purchase window.'),
('bazi-huan-chengshi-fazhan-jihui','要不要换城市发展？八字看城市迁移与机会放大','留在原城市还是换城市重启？通过八字判断迁移动机、机会密度与落地风险。','Should You Move City for Better Growth?','Stay or move? Use Bazi to evaluate relocation timing, opportunity density, and landing risk.'),
]

M={
'zh-Hans':{'lang':'zh-CN','brand':'云子命理','home':'首页','hepan':'合盘分析','blog':'命理知识','crumb':'首页 / 命理知识 / 高意图专题','badge':'高意图长尾专题页','rt':'约 5 分钟阅读','aud':'哪些人最需要先看这个问题','why':'为什么这个问题总会卡住','core':'命理视角的核心看点','step':'可执行的三步建议','faq':'常见问题','cta_t':'先免费排盘，再看完整版深度报告','cta_d':'输入出生信息，先看基础判断；按需解锁完整版 24 维系统解析与逐年建议。','btn':'立即开始排盘','rel':'相关阅读：','f':'© 2026 云子命理 · tengyunzi.com','q1':'可以看具体时间窗口吗？','q2':'没有准确出生时辰还能看吗？','q3':'看完后怎么落地执行？','a1':'可以。通过大运和流年、流月叠加，能看到更适合行动与更需谨慎的阶段。','a2':'可以先用三柱做方向判断；有时辰时，具体节奏和细节会更精准。','a3':'建议按“30天-90天-半年”拆分行动计划，先做低风险动作，再逐步放大投入。','p1':'这类问题，看似是“要不要做”，本质往往是“什么时候做、怎么做、先做哪一步”。如果只凭情绪和外部建议，很容易在关键节点重复试错。','p2':'我们会结合命局结构（先天优势与短板）+ 大运流年（阶段节奏）+ 现实目标（收入、关系、健康、家庭）三层来判断，不只给结论，更给行动顺序。','s1':'第1步：先判定你当前处于“发力期”还是“修复期”','s2':'第2步：明确最小行动单元，先做低风险验证','s3':'第3步：在高胜率窗口集中投入，放大结果','entry1':'核心入口：八字看财运','entry2':'核心入口：八字看事业','entry3':'核心入口：八字看婚姻'},
'en':{'lang':'en','brand':'Yunzi Destiny','home':'Home','hepan':'Compatibility','blog':'BLOG','crumb':'Home / BLOG / High-Intent Topics','badge':'High-Intent Long-Tail Page','rt':'about 5 min read','aud':'Who Should Read This First','why':'Why This Problem Keeps Getting Stuck','core':'Core Bazi Angles We Use','step':'3 Action Steps You Can Execute','faq':'FAQ','cta_t':'Start with a Free Bazi Chart, Upgrade Only If Needed','cta_d':'Enter your birth info for a baseline view, then unlock full 24-dimension analysis when you are ready.','btn':'Start Free Chart','rel':'Related:','f':'© 2026 Yunzi Destiny · tengyunzi.com','q1':'Can this show specific timing windows?','q2':'Can I still analyze without exact birth hour?','q3':'How do I execute after reading the report?','a1':'Yes. By combining natal chart with decade luck and yearly/monthly cycles, we can identify better action windows and caution periods.','a2':'Yes. A 3-pillar baseline still gives direction. With exact birth hour, timing details become more precise.','a3':'Break decisions into 30-day, 90-day, and 6-month plans. Start with low-risk moves, then scale successful actions.','p1':'This is rarely just a yes/no decision. The real question is timing, sequence, and risk exposure. Wrong timing often causes repeated trial-and-error.','p2':'We combine three layers: natal structure (strengths/limits), luck timing (phase rhythm), and real-life goals (income, relationships, health, family).','s1':'Step 1: Identify whether you are in an expansion phase or recovery phase','s2':'Step 2: Define the smallest low-risk action to validate direction','s3':'Step 3: Increase investment only in high-probability windows','entry1':'Core Entry: Wealth Analysis','entry2':'Core Entry: Career Analysis','entry3':'Core Entry: Relationship Analysis'}
}
M['zh-Hant']={k:(cc.convert(v) if isinstance(v,str) else v) for k,v in M['zh-Hans'].items()};M['zh-Hant']['lang']='zh-Hant'


def loc(lang,slug):
    return f"/blog/{slug}.html" if lang=='zh-Hans' else (f"/blog/zh-hant/{slug}.html" if lang=='zh-Hant' else f"/blog/en/{slug}.html")

def kw(zh,en,lang):
    return ','.join(en if lang=='en' else ([cc.convert(x) for x in zh] if lang=='zh-Hant' else zh))

def render(post,related,lang):
    slug,zt,zd,et,ed=post
    t=et if lang=='en' else (cc.convert(zt) if lang=='zh-Hant' else zt)
    d=ed if lang=='en' else (cc.convert(zd) if lang=='zh-Hant' else zd)
    m=M[lang]
    aud=['People facing this decision in the next 3-6 months','People with repeated trial-and-error and rising cost','People seeking a clearer and lower-risk action path'] if lang=='en' else (['未来3-6个月就要做这个决策的人','已经反复试错、成本越来越高的人','想要更清晰、低风险行动顺序的人'])
    if lang=='zh-Hant': aud=[cc.convert(x) for x in aud]
    rel='\n      '.join([f'<a href="{loc(lang,r[0])}">{m["rel"]} {html.escape((r[3] if lang=="en" else (cc.convert(r[1]) if lang=="zh-Hant" else r[1])) )}</a>' for r in related])
    faq=[(f'{t} {m["q1"]}',m['a1']),(m['q2'],m['a2']),(m['q3'],m['a3'])]
    schema_a={"@context":"https://schema.org","@type":"Article","headline":t,"description":d,"author":{"@type":"Organization","name":m['brand']},"publisher":{"@type":"Organization","name":m['brand'],"url":"https://www.tengyunzi.com"},"datePublished":TODAY,"dateModified":TODAY,"mainEntityOfPage":f'https://www.tengyunzi.com{loc(lang,slug)}'}
    schema_f={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faq]}
    s_zh=' selected' if lang=='zh-Hans' else ''
    s_tw=' selected' if lang=='zh-Hant' else ''
    s_en=' selected' if lang=='en' else ''
    faq_html='\n'.join([f'<div class="faq-item"><h3>{html.escape(q)}</h3><p>{html.escape(a)}</p></div>' for q,a in faq])
    aud_html='\n      '.join([f'<li>{html.escape(x)}</li>' for x in aud])
    return f'''<!DOCTYPE html><html lang="{m['lang']}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>{html.escape(t)} | {html.escape(m['brand'])}</title><meta name="description" content="{html.escape(d)}"><meta name="robots" content="index,follow"><link rel="canonical" href="https://www.tengyunzi.com{loc(lang,slug)}"><link rel="alternate" hreflang="zh-CN" href="https://www.tengyunzi.com{loc("zh-Hans",slug)}"><link rel="alternate" hreflang="zh-Hant" href="https://www.tengyunzi.com{loc("zh-Hant",slug)}"><link rel="alternate" hreflang="en" href="https://www.tengyunzi.com{loc("en",slug)}"><meta property="og:type" content="article"><meta property="og:title" content="{html.escape(t)}"><meta property="og:description" content="{html.escape(d)}"><meta property="og:url" content="https://www.tengyunzi.com{loc(lang,slug)}"><script type="application/ld+json">{json.dumps(schema_a,ensure_ascii=False)}</script><script type="application/ld+json">{json.dumps(schema_f,ensure_ascii=False)}</script><style>:root{{--navy:#0a2540;--blue:#2563eb;--line:#dbe3f0;--text:#1f2937}}*{{box-sizing:border-box}}body{{margin:0;font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;color:var(--text);line-height:1.78;background:#fff}}.nav{{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);z-index:20}}.nav-in{{max-width:980px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px}}.brand{{color:var(--navy);font-weight:700;text-decoration:none}}.right{{display:flex;align-items:center;gap:14px}}.links a{{margin-left:16px;color:#4b5563;text-decoration:none;font-size:14px}}.lang{{height:34px;border:1px solid var(--line);border-radius:8px;padding:0 10px;color:var(--navy);font-size:.9rem}}.wrap{{max-width:900px;margin:0 auto;padding:28px 20px 64px}}.crumb{{font-size:13px;color:#6b7280;margin-bottom:12px}}.badge{{display:inline-flex;font-size:12px;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;margin-bottom:8px}}h1{{font-size:34px;line-height:1.35;color:var(--navy);margin:8px 0 10px}}h2{{font-size:24px;color:var(--navy);margin:28px 0 10px}}h3{{font-size:18px;color:#183b66;margin:18px 0 8px}}p{{margin:0 0 12px}}ul{{margin:0 0 14px 22px}}.meta{{font-size:13px;color:#6b7280;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:22px}}.box{{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:18px 0}}.faq{{margin-top:26px;padding:18px;border:1px solid #d7e4ff;border-radius:12px;background:#f9fbff}}.faq-item{{padding:10px 0;border-bottom:1px dashed #dbe3f0}}.faq-item:last-child{{border-bottom:none;padding-bottom:0}}.faq-item h3{{margin:0 0 6px;font-size:16px}}.cta{{margin-top:30px;background:#0c2140;color:#fff;padding:26px;border-radius:14px;text-align:center}}.cta p{{color:#d7e3ff;margin-bottom:14px}}.btn{{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700}}.rel{{margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}}.rel a{{display:block;margin:8px 0;color:#1d4ed8;text-decoration:none}}footer{{margin-top:32px;color:#6b7280;font-size:13px;text-align:center}}@media (max-width:760px){{h1{{font-size:28px}}h2{{font-size:22px}}.nav-in{{flex-wrap:wrap}}.links{{order:3;width:100%}}.links a{{margin-left:0;margin-right:16px}}}}</style></head><body><nav class="nav"><div class="nav-in"><a class="brand" href="/index.html">{html.escape(m['brand'])}</a><div class="right"><div class="links"><a href="/index.html">{html.escape(m['home'])}</a><a href="/hepan.html">{html.escape(m['hepan'])}</a><a href="/blog/">{html.escape(m['blog'])}</a></div><select id="lang" class="lang"><option value="zh-Hans"{s_zh}>简体中文</option><option value="zh-Hant"{s_tw}>繁體中文</option><option value="en"{s_en}>English</option></select></div></div></nav><main class="wrap"><div class="crumb">{html.escape(m['crumb'])}</div><span class="badge">{html.escape(m['badge'])}</span><h1>{html.escape((post[3] if lang=='en' else (cc.convert(post[1]) if lang=='zh-Hant' else post[1])))}</h1><div class="meta">{html.escape(m['brand'])} · {TODAY} · {html.escape(m['rt'])}</div><p>{html.escape(d)}</p><h2>{html.escape(m['aud'])}</h2><ul>{aud_html}</ul><h2>{html.escape(m['why'])}</h2><p>{html.escape(m['p1'])}</p><h2>{html.escape(m['core'])}</h2><p>{html.escape(m['p2'])}</p><h2>{html.escape(m['step'])}</h2><div class="box"><ul><li>{html.escape(m['s1'])}</li><li>{html.escape(m['s2'])}</li><li>{html.escape(m['s3'])}</li></ul></div><section class="faq"><h2>{html.escape(m['faq'])}</h2>{faq_html}</section><div class="cta"><h3>{html.escape(m['cta_t'])}</h3><p>{html.escape(m['cta_d'])}</p><a class="btn" href="/index.html">{html.escape(m['btn'])}</a></div><div class="rel">{rel}<a href="/bazi-caiyun.html">{html.escape(m['entry1'])}</a><a href="/bazi-shiye.html">{html.escape(m['entry2'])}</a><a href="/bazi-hunyin.html">{html.escape(m['entry3'])}</a></div><footer>{html.escape(m['f'])}</footer></main><script>(()=>{{const map={{'zh-Hans':'{loc("zh-Hans",slug)}','zh-Hant':'{loc("zh-Hant",slug)}','en':'{loc("en",slug)}'}};const s=document.getElementById('lang');if(!s)return;s.addEventListener('change',()=>{{const v=s.value||'zh-Hans';localStorage.setItem('site_lang_pref_v2',v);location.href=map[v]||map['zh-Hans'];}});}})();</script></body></html>'''


def add_entries(path,entries):
    t=path.read_text(encoding='utf-8')
    new=[e for e in entries if e not in t]
    if new:
        path.write_text(t.replace('</urlset>','\n'+'\n'.join(new)+'\n</urlset>'),encoding='utf-8')
    return len(new)

for d in [BLOG,BLOG_TW,BLOG_EN]: d.mkdir(parents=True,exist_ok=True)
for i,p in enumerate(POSTS):
    rel=[POSTS[(i+1)%len(POSTS)],POSTS[(i+2)%len(POSTS)],POSTS[(i+3)%len(POSTS)]]
    (BLOG/f'{p[0]}.html').write_text(render(p,rel,'zh-Hans'),encoding='utf-8')
    (BLOG_TW/f'{p[0]}.html').write_text(render(p,rel,'zh-Hant'),encoding='utf-8')
    (BLOG_EN/f'{p[0]}.html').write_text(render(p,rel,'en'),encoding='utf-8')

s1=[f'  <url><loc>https://www.tengyunzi.com/blog/{p[0]}.html</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.74</priority></url>' for p in POSTS]
s2=[f'  <url>\n    <loc>https://www.tengyunzi.com/blog/{p[0]}.html</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.79</priority>\n  </url>' for p in POSTS[:12]]
print('generated 3x pages',len(POSTS))
print('sitemap add',add_entries(SITEMAP,s1))
print('priority add',add_entries(SITEMAP_P,s2))
