#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import html
import json
import math
import re
from datetime import date
from pathlib import Path

from opencc import OpenCC


TODAY = date.today().isoformat()
ROOT = Path(__file__).resolve().parent
BLOG = ROOT / "public" / "blog"
BLOG_TW = BLOG / "zh-hant"
BLOG_EN = BLOG / "en"
SITEMAP = ROOT / "public" / "sitemap.xml"
SITEMAP_PRIORITY = ROOT / "public" / "sitemap-priority.xml"
INDEX_PATH = BLOG / "index.html"
cc = OpenCC("s2t")

POSTS: list[dict] = [
    {
        "slug": "bazi-shihe-kaogong-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合考公：你更适合稳定编制还是市场赛道？",
        "title_en": "Is the Civil Service Exam a Good Fit for You? A Bazi View",
        "desc_zh": "想考公却怕走错路？从八字看你是否适合规则强、晋升慢但稳定的职业路径，判断现在该冲刺、观望还是转向。",
        "desc_en": "Thinking about the civil service exam? Use Bazi to evaluate whether a stable, rule-heavy career path fits your chart and your current timing.",
        "query_zh": "考公",
        "query_en": "taking the civil service exam",
        "hook_zh": "很多人纠结考公，不是不知道编制稳定，而是不清楚自己到底适不适合长期待在规则密集、晋升节奏偏慢的体系里。",
        "hook_en": "Many people hesitate over the civil service path not because they dislike stability, but because they are unsure whether they can thrive inside a rule-dense and slower-promotion system.",
        "decision_zh": "稳定、考试成本、地域选择和长期晋升耐受度",
        "decision_en": "stability, exam cost, city choice, and tolerance for slow promotion",
        "scenes_zh": ["已经工作一两年，发现市场化岗位压力大、开始重新评估稳定路径的人。", "家里强烈建议考公，但自己又担心投入两三年后发现并不适合的人。", "手上同时有考公、考编、企业 offer 几个选项，想先排清优先级的人。"],
        "scenes_en": ["People reassessing stability after feeling worn down by fast market roles.", "People pushed by family toward public exams but worried about spending years on the wrong path.", "People comparing civil service, public institution, and corporate offers at the same time."],
        "fit_zh": ["命局官印相生、喜印喜官的人，通常更适应考试、制度、流程和层级秩序。", "大运走印运或官运时，证书、资格、编制和平台背书更容易转成现实收益。", "做事节奏偏稳、耐得住重复训练的人，更容易把备考投入变成结果。", "如果现实目标是落户、家庭稳定、回家乡发展，考公往往更能放大命局里的安全感需求。"],
        "fit_en": ["Charts with strong officer-resource support usually adapt better to exams, procedures, hierarchy, and public systems.", "Luck cycles that strengthen officer or resource themes often make credentials and institutional platforms pay off more clearly.", "People who can tolerate repetition and long preparation are more likely to convert exam effort into results.", "If the real goal is settlement, family stability, or returning to a hometown, the public track may fit better."],
        "risk_zh": ["命局食伤旺、极度追求表达和即时反馈的人，容易对流程慢、限制多的环境产生消耗感。", "大运走财运但官印无力时，投入考公的机会成本可能高于直接去市场赚钱。", "如果现实资源并不支持长期备考，比如现金流紧、家庭压力大，就要谨慎拉长战线。", "只是因为焦虑、跟风或家人催促而考公，通常很难熬过真正的复习周期。"],
        "risk_en": ["People with very strong output energy and a need for quick feedback may feel drained in slow, constrained systems.", "If your current cycle rewards market action more than institutional structure, the opportunity cost of exam preparation may be high.", "When cash flow and family conditions do not support long preparation, extending the battle line becomes risky.", "If the motive is only anxiety, trend-following, or family pressure, it is hard to survive the full prep cycle."],
    },
    {
        "slug": "bazi-shihe-kaoyan-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合考研：继续深造会抬高上限还是拖慢节奏？",
        "title_en": "Should You Take the Postgraduate Exam? A Bazi Timing Check",
        "desc_zh": "考研到底是延迟就业还是放大竞争力？从八字看你适不适合读研、什么时候上岸概率更高，以及读完是否真的值回成本。",
        "desc_en": "Is graduate school a delay tactic or a real upgrade? Use Bazi to judge whether postgraduate study fits your chart, timing, and long-term payoff.",
        "query_zh": "考研",
        "query_en": "taking the postgraduate entrance exam",
        "hook_zh": "考研的核心从来不只是学历，而是你是否适合把两到三年的时间换成更高的平台、更强的专业门槛和更稳的职业起点。",
        "hook_en": "The postgraduate exam is not only about a degree. It is about whether two or three years of study can truly buy you a higher platform and stronger career barrier.",
        "decision_zh": "学历投资回报、研究训练耐受度和毕业后的职业兑现能力",
        "decision_en": "education ROI, tolerance for research-style training, and post-graduation conversion ability",
        "scenes_zh": ["本科毕业临近，既怕直接就业吃亏，又怕考研只是继续逃避选择的人。", "已经工作但想读在职或脱产研究生，想判断这笔投入是否真的有回报的人。", "目标行业明确依赖学历门槛，比如医学、法学、金融研究、科研等方向的人。"],
        "scenes_en": ["Students nearing graduation who fear both poor job outcomes and a wrong graduate-school bet.", "Working professionals considering a full-time or part-time master's degree and wanting a payoff check first.", "People aiming for industries where credentials matter heavily, such as medicine, law, finance research, or academia."],
        "fit_zh": ["印星得力、官印结构稳定的人，通常更适合系统学习、考试和知识积累型路径。", "大运走印运时，读研更容易获得导师、学校、平台和证书层面的加成。", "命局本身偏适合研究、写作、长周期训练的人，读研不是拖延，而是正常抬高上限。", "如果目标岗位明确要求硕士学历，继续深造会比盲目就业更有效率。"],
        "fit_en": ["Charts supported by strong resource energy often do better in structured study, exams, and long-term knowledge accumulation.", "Resource-driven luck cycles usually make mentors, schools, credentials, and academic platforms more supportive.", "If your chart fits research, writing, or deep training, graduate school raises your ceiling instead of delaying life.", "When the target role clearly requires a master's degree, the study investment can be more efficient than random job hopping."],
        "risk_zh": ["命局更偏食伤财、适合快速输出和市场实践的人，读研可能会产生明显时间成本。", "大运偏财旺而印弱时，继续读书容易心散、效率低，还可能错过工作窗口。", "只是因为不知道做什么而考研，通常会把原本的迷茫延长，而不是解决。", "如果家庭资源和经济压力不支持读研，就要先评估现实承压能力。"],
        "risk_en": ["People whose charts favor output, commerce, and fast practice may experience obvious time-cost pressure in graduate school.", "When market-oriented luck is strong but study support is weak, it becomes easy to lose focus and miss job windows.", "Choosing graduate school only because you feel lost often prolongs confusion instead of solving it.", "If family and financial conditions do not support more study, real-world pressure must be assessed first."],
    },
    {
        "slug": "bazi-shihe-chuguo-liuxue-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合出国留学：海外经历会放大机会还是增加消耗？",
        "title_en": "Should You Study Abroad? A Bazi Check on Timing and Fit",
        "desc_zh": "出国留学值不值，关键不是别人说好不好，而是你的命局是否适合远行、跨文化环境和高成本换平台的路线。",
        "desc_en": "Whether study abroad is worth it depends less on trend talk and more on whether your chart supports relocation, adaptation, and high-cost platform upgrades.",
        "query_zh": "出国留学",
        "query_en": "studying abroad",
        "hook_zh": "留学不是一张自动生效的镀金卡，它更像一次高成本换环境、换视野、换圈层的动作，适合的人会被放大，不适合的人则会被透支。",
        "hook_en": "Study abroad is not an automatic golden ticket. It is a high-cost move that changes environment, exposure, and network level. For the right chart it multiplies value; for the wrong fit it can become pure drain.",
        "decision_zh": "迁移适配度、语言文化承压能力和留学后的长期兑现空间",
        "decision_en": "relocation fit, language-and-culture pressure tolerance, and long-term payoff after the overseas investment",
        "scenes_zh": ["家里愿意支持出国，但你自己拿不准海外环境是不是能发挥优势的人。", "准备申请硕士或博士，希望先判断自己适不适合长期海外生活的人。", "已经在国内工作，考虑通过留学切换赛道、切换国家或提升简历的人。"],
        "scenes_en": ["People whose family can support overseas study but who are unsure whether a foreign environment actually fits them.", "Applicants for master's or PhD programs who want to judge long-term overseas living before committing.", "Professionals considering study abroad as a way to switch industry, country, or resume level."],
        "fit_zh": ["命局驿马动、迁移信息明显的人，通常更能从远行、换城市、换国家中得到成长机会。", "大运流年带动印星和贵人星时，留学更容易遇到导师、学校或平台层面的助力。", "如果命局本身喜水木、喜开放流动环境，海外经历常常能带来认知和资源升级。", "目标非常明确，比如读完就想走科研、国际化岗位、跨国平台的人，留学更容易兑现成本。"],
        "fit_en": ["Charts with strong relocation or travel signals often gain more from moving far, changing cities, and changing countries.", "When current cycles activate study support and helpful people, overseas education gets more platform help.", "If your chart benefits from mobile and open environments, study abroad can upgrade perspective and networks.", "When the post-study goal is clear, such as research, international work, or global platforms, the investment is easier to justify."],
        "risk_zh": ["命局土重、极度依赖熟人环境和稳定生活节奏的人，跨文化适应成本会明显更高。", "如果只是为了逃离当前压力而出国，留学很可能把问题从国内带到国外。", "财务压力大却没有清晰回报路径，容易在留学过程中产生长期负债焦虑。", "大运本身偏闭塞、回缩的时候，盲目远行反而会放大孤独和消耗。"],
        "risk_en": ["Charts that rely heavily on familiar networks and stable routine may face much higher adaptation costs in foreign settings.", "If the real motive is only escape from current pressure, the same confusion often follows you abroad.", "When financial pressure is high and the payoff path is unclear, study abroad can turn into long-term debt anxiety.", "If your current cycle is contracting rather than expanding, forced relocation may increase loneliness instead of opportunity."],
    },
    {
        "slug": "bazi-shihe-yimin-fazhan-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合移民发展：长期定居海外是机遇还是错配？",
        "title_en": "Is Immigration a Good Long-Term Choice? A Bazi Perspective",
        "desc_zh": "移民不是一次旅游决策，而是语言、职业、身份、家庭结构的整体迁移。用八字判断你是否适合长期海外定居与重新起盘。",
        "desc_en": "Immigration is not travel. It is a full migration of language, work, identity, and family structure. Use Bazi to judge whether overseas settlement fits your long-term pattern.",
        "query_zh": "移民发展",
        "query_en": "immigrating for long-term development",
        "hook_zh": "很多人问自己适不适合移民，本质上不是问国外好不好，而是在问：我能不能承受重建社交、职业和身份认同的长期代价。",
        "hook_en": "When people ask whether immigration suits them, they are rarely asking whether another country is better. They are asking whether they can absorb the long-term cost of rebuilding career, social ties, and identity.",
        "decision_zh": "长期迁移、职业重建和家庭系统重排的承受能力",
        "decision_en": "tolerance for long-term relocation, career rebuilding, and family-system reordering",
        "scenes_zh": ["已经拿到身份途径，但还在犹豫到底要不要真正搬过去的人。", "夫妻或全家一起考虑移民，担心有人适应、有人失衡的人。", "在国内发展一般，想通过移民重启人生但又怕代价过高的人。"],
        "scenes_en": ["People who already have an immigration pathway but are unsure whether to truly move.", "Couples or families evaluating immigration together and worried that not everyone will adapt equally.", "People hoping to restart life through immigration after average domestic progress, but who fear the cost of being wrong."],
        "fit_zh": ["命局迁移信息明显、贵人运在外地或海外更强的人，往往更容易在异国建立新资源。", "大运走到适合换环境、换平台的阶段时，移民可能成为人生势能切换的关键动作。", "如果原命局在熟人社会里反而施展不开，离开原有圈层后更容易重新排序优势。", "目标国家、职业规划、家庭分工都已经清晰的人，移民成功率通常远高于先过去再说的人。"],
        "fit_en": ["Charts with strong relocation signals and stronger external support often rebuild resources more easily abroad.", "When your current cycle supports changing platform and environment, immigration can become a real momentum shift.", "If your original social environment suppresses your strengths, leaving the old circle may help your advantages re-order themselves.", "People with a clear target country, career path, and family role design usually execute immigration far better than those who just want to leave first and think later."],
        "risk_zh": ["命局高度依赖本土资源、人情网络和家族支持的人，移民后的空转期可能非常长。", "如果只是把移民当作情绪出口，没有明确职业路径，很容易出现身份有了、生活反而更乱的情况。", "夫妻命局节奏差异过大时，一个人变好、另一个人失衡的风险会明显上升。", "财务预算不足、语言准备不够，却寄希望于到了自然就会好，通常是高风险开局。"],
        "risk_en": ["People whose charts rely heavily on local networks and family support may face a very long idle period after moving.", "If immigration is treated only as an emotional exit without a clear career path, life can become messier even after status is secured.", "When partners' cycles differ too much, one may rise while the other loses balance after migration.", "Weak language preparation and budget, combined with hope that things will sort themselves out after arrival, usually create a risky start."],
    },
    {
        "slug": "bazi-shihe-zuo-chengxuyuan-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合做程序员：技术路线能不能成为你的长期饭碗？",
        "title_en": "Are You Suited to Be a Programmer? A Bazi Career Fit Check",
        "desc_zh": "程序员并不是只看智商和学历，更看长期专注、逻辑结构、独处耐受和持续学习能力。用八字先判断路线匹配度。",
        "desc_en": "Programming is not just about IQ and degrees. It also requires long attention span, structured thinking, comfort with solitude, and sustained learning. Bazi can help assess the fit.",
        "query_zh": "做程序员",
        "query_en": "working as a programmer",
        "hook_zh": "程序员这条路，最怕的不是学不会，而是前几年靠意志撑住，后面越来越厌倦深度思考和长时间独立解决问题的工作方式。",
        "hook_en": "The real risk in programming is not inability to learn. It is surviving the first few years by willpower and then burning out on deep thinking and long stretches of independent problem solving.",
        "decision_zh": "逻辑结构、专注力、孤独耐受和技术成长节奏",
        "decision_en": "logic, focus, tolerance for solitude, and long-term technical growth rhythm",
        "scenes_zh": ["准备转行做前后端、测试、数据或算法，想先判断自己是不是技术盘的人。", "已经在互联网行业工作，但总怀疑自己更适合管理、产品或运营的人。", "家里建议学技术求稳，但你担心长期写代码会不会越做越痛苦的人。"],
        "scenes_en": ["People planning to switch into frontend, backend, testing, data, or algorithm work and wanting a fit check first.", "People already in tech who suspect they may fit product, operations, or management better than pure coding.", "People pushed toward the technical route for stability but worried about long-term coding fatigue."],
        "fit_zh": ["命局印星、食神搭配得当的人，往往能把学习、理解、沉淀和输出形成稳定闭环。", "喜金水、逻辑结构感强、能长期待在抽象系统里的人，更容易在技术路线上形成壁垒。", "大运走印运或食神运时，适合深度学习技术、打基础、做长期积累型职业。", "如果你对规则、框架、系统优化天然有兴趣，程序员路线通常不是忍耐，而是顺手。"],
        "fit_en": ["Charts with balanced resource and output energy often build a stable loop of learning, understanding, practice, and delivery.", "People who benefit from logical and abstract systems usually form technical moats more easily.", "Resource or output-oriented luck cycles often support deep study, technical foundations, and long-horizon skill growth.", "If you naturally enjoy systems, rules, frameworks, and optimization, coding feels aligned rather than forced."],
        "risk_zh": ["命局极旺伤官却不收敛的人，想法多但耐性不足，容易被长期细碎工程消耗。", "如果强烈依赖社交反馈和即时成就感，技术深工种往往会让你越做越闷。", "大运偏财旺、市场机会多的时候，继续死磕纯技术未必是最佳收益路径。", "把程序员当作容易赚高薪的标签进入，通常撑不过真正的学习曲线。"],
        "risk_en": ["People with very strong uncontained output energy may have ideas but lack patience for long, detailed engineering work.", "If you rely heavily on constant social feedback and quick wins, deep technical roles can become emotionally dull.", "When your current cycle rewards market-facing movement more than technical depth, pure coding may not be the highest-return path.", "Entering programming only because it sounds high-paying often collapses once the real learning curve appears."],
    },
    {
        "slug": "bazi-shihe-zuo-chanpin-jingli-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合做产品经理：你更擅长统筹判断还是执行落地？",
        "title_en": "Should You Become a Product Manager? A Bazi Read on Role Fit",
        "desc_zh": "产品经理真正考验的是沟通、判断、统筹、取舍与抗压。先用八字判断你适不适合站在中间位。",
        "desc_en": "Product management tests communication, judgment, prioritization, and pressure tolerance. Bazi can help judge whether the middle role fits you.",
        "query_zh": "做产品经理",
        "query_en": "working as a product manager",
        "hook_zh": "产品经理最难的地方不在于会不会写文档，而在于你能不能同时面对模糊信息、多人博弈和连续不断的取舍压力。",
        "hook_en": "The hardest part of product management is not writing documents. It is handling ambiguity, multi-party conflict, and endless trade-off pressure at the same time.",
        "decision_zh": "统筹能力、表达协调、抗冲突能力和长期责任心",
        "decision_en": "coordination, communication, conflict tolerance, and long-horizon ownership",
        "scenes_zh": ["从技术、运营、设计转产品，想知道自己是适合做桥梁还是更适合做专业纵深的人。", "已经在做产品，但经常怀疑自己是在硬撑、不是天生适配的人。", "拿到产品和其他岗位 offer，想先判断自己更适合哪种工作模式的人。"],
        "scenes_en": ["People moving from engineering, operations, or design into product and wondering whether they fit the bridge role.", "Current PMs who constantly feel they are forcing themselves rather than growing naturally in the role.", "People comparing PM offers with other jobs and wanting clarity on work-style fit first."],
        "fit_zh": ["命局食伤与印星配合好的人，通常既能理解逻辑，也能把复杂信息讲清楚。", "官星不弱、责任心强的人，更适合承担排优先级、扛结果和协调冲突的职责。", "大运走到利沟通、利平台协作的时候，产品岗位更容易出成绩而不是只背锅。", "如果你对用户需求、业务判断和资源整合本身有兴趣，产品经理会越做越顺。"],
        "fit_en": ["Charts where output and resource energy cooperate often support both understanding complexity and explaining it clearly.", "People with enough officer energy and ownership are better at prioritization, responsibility, and conflict handling.", "When the current cycle supports communication and platform collaboration, PM work becomes more productive instead of only stressful.", "If you genuinely enjoy user needs, business logic, and resource integration, product work often gets smoother over time."],
        "risk_zh": ["命局过于偏执行或偏单点深工，容易在持续沟通和横向协调中感到疲惫。", "过度追求明确答案、无法接受信息模糊的人，产品岗位会长期制造焦虑。", "如果表达欲强但不愿承担结果，容易停留在会说不会扛的瓶颈里。", "只是因为产品岗位看起来体面、工资高而转岗，通常很快会被真实工作打脸。"],
        "risk_en": ["People who fit deep single-point execution better may feel exhausted by endless cross-team coordination.", "If you cannot tolerate ambiguity and constantly need clear answers, PM work can generate chronic anxiety.", "Strong expression without ownership often creates a ceiling: you can talk, but cannot carry outcomes.", "Switching only because the title sounds good or pays better usually fails once real pressure shows up."],
    },
    {
        "slug": "bazi-shihe-zuo-zixun-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合做咨询：你适合高强度输出和方案型工作吗？",
        "title_en": "Are You Suited for Consulting? A Bazi View on High-Pressure Output Work",
        "desc_zh": "咨询行业拼的不只是聪明，更是表达、分析、交付和高压下的持续输出能力。用八字看你是否适合方案型职业。",
        "desc_en": "Consulting demands analysis, communication, delivery, and sustained output under pressure. Bazi can help evaluate the fit.",
        "query_zh": "做咨询",
        "query_en": "working in consulting",
        "hook_zh": "咨询这条路的门槛不只是会分析，而是能不能在高节奏、高标准和频繁反馈里，一直保持稳定的输出和判断质量。",
        "hook_en": "Consulting is not only about analysis. It is about sustaining quality output and judgment under fast pace, high standards, and constant feedback.",
        "decision_zh": "分析深度、表达强度、客户压力和项目节奏的适配度",
        "decision_en": "fit for analysis depth, communication intensity, client pressure, and project rhythm",
        "scenes_zh": ["考虑去管理咨询、战略咨询、职业咨询等方案型岗位的人。", "已经在乙方、服务型公司工作，想判断自己是不是典型咨询盘的人。", "想做自由咨询顾问，但不确定自己能不能长期靠脑力交付吃饭的人。"],
        "scenes_en": ["People considering management, strategy, or specialized advisory roles.", "People already in service firms who want to know whether they truly fit a consulting-style chart.", "People considering independent consulting and wondering whether they can make a living from knowledge delivery long term."],
        "fit_zh": ["命局食伤有力、印星能收的人，往往既有思考深度，也有清晰表达和交付能力。", "喜互动、愿意持续和外界沟通的人，更容易在项目驱动和客户反馈中保持状态。", "大运走食伤生财时，方案输出更容易被看见，也更容易形成收入转化。", "如果你本来就擅长把复杂问题拆解成结构化建议，咨询会越做越值钱。"],
        "fit_en": ["Charts with strong output supported by study energy often combine deep thinking with clear delivery.", "People who like ongoing interaction usually stay more energized in project and client loops.", "Output-to-wealth cycles usually make advisory work more visible and easier to monetize.", "If you naturally break complex problems into structured advice, consulting tends to become more valuable with time."],
        "risk_zh": ["命局偏静、偏内收、不喜欢频繁表达的人，在高沟通密度环境里很容易耗空。", "如果你更适合慢工深耕型岗位，咨询行业的项目制节奏可能会让你长期失衡。", "只喜欢思考、不喜欢交付和面对客户的人，做咨询很难真正做大。", "把咨询想成高薪说话工作而忽略体力和脑力消耗，通常会低估代价。"],
        "risk_en": ["Charts that prefer quiet, inward, low-expression environments may be emptied out by dense communication work.", "If you fit slow deep craft better, project-based consulting rhythm can destabilize you over time.", "People who enjoy thinking but dislike delivery and client contact struggle to scale in consulting.", "Treating consulting as only a glamorous speaking job usually underestimates the real physical and mental cost."],
    },
    {
        "slug": "bazi-shihe-zuo-douyin-zhibo-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合做抖音直播：你有镜头感和持续变现能力吗？",
        "title_en": "Should You Do Douyin Live Streaming? A Bazi Read on Camera and Monetization Fit",
        "desc_zh": "直播不是只看胆子大不大，更看表达节奏、情绪稳定、持续输出和商业转化。用八字判断你适不适合吃镜头饭。",
        "desc_en": "Live streaming depends on expression rhythm, emotional stability, sustained output, and commercial conversion. Bazi can help judge the fit.",
        "query_zh": "做抖音直播",
        "query_en": "doing Douyin live streaming",
        "hook_zh": "直播真正难的地方不是开播那一刻，而是能不能在镜头前长期稳定输出、承受起伏，并把流量变成可持续收入。",
        "hook_en": "The hard part of live streaming is not going live once. It is staying stable on camera over time, handling volatility, and turning attention into sustainable income.",
        "decision_zh": "镜头表现、情绪韧性、内容持续性和商业闭环能力",
        "decision_en": "camera presence, emotional resilience, content consistency, and monetization loop ability",
        "scenes_zh": ["想尝试直播带货、知识直播或陪伴型直播，但不确定自己能不能长期做下去的人。", "已经拍短视频，却迟迟不敢开播，想知道自己是不是镜头型命局的人。", "直播做了一段时间但流量和转化都不稳，想先看问题出在匹配度还是节奏上的人。"],
        "scenes_en": ["People considering ecommerce, educational, or companionship-style live streaming and wondering whether they can sustain it.", "Creators already making short videos but afraid to go live, and who want to know whether they truly fit camera work.", "Streamers with unstable traffic and conversion who want to know whether the issue is fit or timing."],
        "fit_zh": ["命局食伤旺而不乱的人，通常表达自然、反应快，更容易建立镜头存在感。", "财星能接住流量的人，往往不只是有人看，还更容易形成成交和复购。", "大运走食伤生财时，内容输出和商业化更容易同时抬头。", "如果你本身就喜欢互动、分享和即兴表达，直播通常比纯剪辑内容更适合你。"],
        "fit_en": ["Charts with strong but organized output energy often build natural expression and fast live response.", "People whose wealth stars can receive attention are more likely to convert viewers into buyers and repeat customers.", "Output-to-wealth cycles often lift both visibility and conversion at the same time.", "If you naturally enjoy interaction, sharing, and improvisation, live streaming may fit better than pure edited content."],
        "risk_zh": ["命局易受外界评价影响、情绪起伏大的人，直播的即时反馈很可能放大内耗。", "如果只想赚快钱，却不愿稳定开播、反复打磨内容，直播很难跑出结果。", "食伤过旺却没有财星承接的人，常见情况是热闹有了、变现不足。", "不喜欢被看见、被催促或被持续比较的人，直播路线会越来越重。"],
        "risk_en": ["People strongly affected by outside evaluation may find live feedback amplifies emotional exhaustion.", "If the goal is only quick cash without consistent broadcasting and repeated improvement, results rarely hold.", "Strong expression without enough wealth conversion support often creates attention without monetization.", "If you dislike being seen, pushed, and constantly compared, the live-streaming route gets heavier over time."],
    },
    {
        "slug": "bazi-shihe-zuo-kuajing-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合做跨境电商：海外市场会成为你的增量窗口吗？",
        "title_en": "Should You Do Cross-Border E-commerce? A Bazi Opportunity Check",
        "desc_zh": "跨境电商看起来机会多，但背后是选品、供应链、平台规则和汇率压力。先用八字看你是否适合远市场生意。",
        "desc_en": "Cross-border e-commerce involves product judgment, supply-chain control, platform rules, and FX pressure. Bazi can help assess whether it fits you.",
        "query_zh": "做跨境电商",
        "query_en": "doing cross-border e-commerce",
        "hook_zh": "跨境电商不是简单把国内生意搬到海外，而是同时经营市场差异、平台规则、现金流周期和供应链稳定性的复杂游戏。",
        "hook_en": "Cross-border e-commerce is not simply moving domestic business overseas. It is a complex game involving market differences, platform rules, cash-flow cycles, and supply-chain stability.",
        "decision_zh": "远市场经营、供应链掌控和回款节奏适配度",
        "decision_en": "fit for overseas-market operation, supply-chain control, and cash-return timing",
        "scenes_zh": ["想从国内电商转跨境，但不确定自己能不能吃得消更长链条的人。", "正在考虑做亚马逊、独立站、TikTok Shop 等海外平台的人。", "已经做跨境却被库存、广告和回款拖住，想判断是命局不配还是打法不对的人。"],
        "scenes_en": ["People switching from domestic ecommerce and unsure whether they can handle a longer operational chain.", "People evaluating Amazon, independent sites, TikTok Shop, or other overseas platforms.", "Current operators trapped by inventory, ad cost, or delayed cash return who want to separate fit from execution issues."],
        "fit_zh": ["命局带迁移信息、财星和食伤配合的人，通常更适合远市场、跨平台、跨人群的生意模式。", "大运走财运且能稳住风险的人，更容易在跨境业务里形成持续现金流。", "如果你擅长选品、数据判断和流程优化，跨境的复杂度反而会变成护城河。", "原有资源已经有供应链、工厂或海外客户基础的人，做跨境更容易放大优势。"],
        "fit_en": ["Charts combining relocation signals, wealth stars, and output energy often fit remote-market business better.", "Wealth-oriented cycles with decent risk control support more stable cash flow in cross-border business.", "If you are good at product selection, data judgment, and process optimization, cross-border complexity can become your moat.", "People who already have supply-chain or overseas-customer resources can amplify those edges much faster."],
        "risk_zh": ["命局风险承受力弱、现金流焦虑重的人，跨境的长回款周期会持续制造压力。", "只看到别人赚钱，却忽略平台合规、物流、税务和账户风险，很容易中途失血。", "没有供应链、没有品类判断，只靠冲动入局，往往会被库存和广告吞掉。", "如果当前大运更适合稳守，不适合扩张，盲目做跨境会把资金压力放大。"],
        "risk_en": ["People with weak risk tolerance or heavy cash-flow anxiety may struggle with long payment cycles.", "Seeing only success stories while ignoring compliance, logistics, tax, and account risk often leads to mid-way losses.", "Jumping in without supply-chain support or product judgment usually means inventory and ads eat the budget.", "If your current cycle favors stability over expansion, forcing a cross-border business can magnify financial pressure."],
    },
    {
        "slug": "bazi-jinnian-shihe-maifang-haishi-zufang",
        "cat": "finance",
        "cta_url": "",
        "title_zh": "八字看今年适合买房还是租房：先保现金流还是提前锁定资产？",
        "title_en": "Buy or Rent This Year? A Bazi View on Housing Timing",
        "desc_zh": "买房与租房的关键，不是别人怎么说，而是你的现金流、家庭安排和当前运势能不能接住房贷与固定资产。",
        "desc_en": "The buy-or-rent question depends less on public opinion and more on whether your cash flow and current cycle can absorb a mortgage and fixed assets.",
        "query_zh": "买房还是租房",
        "query_en": "buying versus renting a home this year",
        "hook_zh": "住房决策的本质从来不是面子，而是资产负担、家庭节奏和你未来几年行动自由度之间的平衡。",
        "hook_en": "Housing decisions are not really about status. They are about balancing asset burden, family rhythm, and your freedom to act over the next few years.",
        "decision_zh": "现金流安全线、家庭阶段和固定资产承受能力",
        "decision_en": "cash-flow safety, family timing, and tolerance for fixed-asset commitments",
        "scenes_zh": ["手里有首付，但担心买完房现金流被锁死的人。", "已经结婚或准备成家，住房问题不得不定，却不想在错误年份背上重担的人。", "在大城市长期租房，开始纠结继续租更灵活还是尽快买更安心的人。"],
        "scenes_en": ["People with a down payment who worry that buying will freeze their cash flow.", "People entering marriage or family life who must make a housing decision but want to avoid the wrong year.", "Long-term big-city renters deciding between flexibility and asset security."],
        "fit_zh": ["命局财库稳、土气能承的人，通常更适合在合适年份把资金沉淀为不动产。", "大运流年利置业、利家庭稳定时，买房往往不是负担，而是资产锚点。", "如果工作和城市规划已经明确，中长期不会频繁变动，买房的确定性会更高。", "家庭成员对住房目标一致、还贷能力清晰的人，更容易把买房变成正向安排。"],
        "fit_en": ["Charts with stable wealth storage and enough grounding often handle real-estate commitments better.", "When the cycle supports settlement and family stability, buying may become an anchor rather than a burden.", "If job and city plans are already clear, long-term ownership becomes easier to justify.", "Families aligned on housing goals and repayment ability usually turn the purchase into a positive structure."],
        "risk_zh": ["当前大运不稳、工作变数大时，过早买房可能会压缩后续的职业调整空间。", "命局偏流动、适合先多尝试的人，硬性上车常常会让你后面进退两难。", "如果首付来自高杠杆或家庭关系本身就紧张，房子很容易变成新的压力源。", "只是因为害怕房价、害怕错过而买房，通常不是稳妥的出发点。"],
        "risk_en": ["When work and luck are unstable, buying too early may reduce later career flexibility.", "Charts that fit mobility and experimentation often suffer when forced into fixed commitments too soon.", "If the down payment relies on leverage or tense family dynamics, the house can become a fresh pressure source.", "Buying mainly out of fear of missing out is rarely a strong starting point."],
    },
    {
        "slug": "bazi-shenme-shihou-neng-cun-dao-qian",
        "cat": "finance",
        "cta_url": "",
        "title_zh": "八字看什么时候能存到钱：你缺的到底是收入、节奏还是守财能力？",
        "title_en": "When Will You Finally Save Money? A Bazi Look at Wealth Retention",
        "desc_zh": "赚得不少却总存不下，问题不一定只在收入。用八字看你是来财不稳、花销结构有问题，还是阶段节奏不对。",
        "desc_en": "If you earn but still cannot save, the issue may not be income alone. Bazi helps judge whether the problem is unstable inflow, spending pattern, or timing.",
        "query_zh": "什么时候能存到钱",
        "query_en": "when you will finally be able to save money",
        "hook_zh": "很多人的财富焦虑不是赚不到，而是每次快攒住的时候又有新的支出、决策失误或节奏打断，让账户始终回不到安全区。",
        "hook_en": "For many people, the anxiety is not about never earning. It is about reaching the edge of savings again and again, only to be pulled back by spending, bad decisions, or poor timing.",
        "decision_zh": "来财节奏、守财能力和阶段性破财风险",
        "decision_en": "income rhythm, wealth retention ability, and periodic loss risk",
        "scenes_zh": ["收入不算低，但手里永远留不住钱的人。", "刚工作几年，想知道自己什么时候会从月光进入真正积累期的人。", "总在换工作、换城市、换行业，想判断财富为什么总被中断的人。"],
        "scenes_en": ["People whose income is not low, but whose bank balance never really stays up.", "Young professionals wondering when they will move from survival to actual accumulation.", "People who keep changing jobs, cities, or industries and want to know why wealth building keeps resetting."],
        "fit_zh": ["命局财星有根、财库能守的人，通常更容易在正确阶段逐步把钱留下来。", "大运走到财运但不被比劫严重分流时，储蓄能力往往会明显改善。", "如果命局本身就偏稳，且现实生活开始减少大额试错，存钱速度会突然快起来。", "当工作模式从高波动转向稳定兑现，你会发现存钱第一次变成结果而不是口号。"],
        "fit_en": ["Charts with rooted wealth stars and usable wealth storage usually retain money more effectively over time.", "When wealth cycles arrive without heavy leakage from competition or obligation, saving often improves quickly.", "If the chart is naturally stable and life stops demanding large trial-and-error costs, saving speed rises noticeably.", "When work shifts from volatile guessing to stable payoff, savings finally become an outcome instead of a slogan."],
        "risk_zh": ["比劫旺而财弱的人，常见情况是赚钱不差，但很容易被人情、合作或冲动消费分走。", "命局破财信号重、阶段又在高变动期时，想快速存钱往往事倍功半。", "如果财运来了却没有储蓄结构，再好的收入也可能被生活方式吃掉。", "总想靠一次翻盘、一笔投资或一笔大单解决问题，往往反而拖慢积累。"],
        "risk_en": ["People with strong leakage or competition energy may earn decently but lose money through social obligation, partnership, or impulse spending.", "When loss signals are active and life is still volatile, trying to save aggressively often feels inefficient.", "If better income arrives before a saving structure exists, lifestyle expansion can swallow the gain.", "Trying to solve everything with one big reversal or one lucky deal often delays real accumulation."],
    },
    {
        "slug": "bazi-shihetouzi-ma",
        "cat": "finance",
        "cta_url": "",
        "title_zh": "八字看适不适合投资：你是适合稳健配置还是高波动博弈？",
        "title_en": "Should You Invest? A Bazi Read on Risk Style and Timing",
        "desc_zh": "投资不是能不能赚的问题，而是你适合什么风险级别、什么周期、什么节奏。先用八字判断再谈进场。",
        "desc_en": "Investment is not only about whether you can profit. It is about what risk level, cycle, and rhythm fit your chart. Bazi can help define that before you enter.",
        "query_zh": "适不适合投资",
        "query_en": "whether you are suited for investing",
        "hook_zh": "投资最怕的不是亏一次，而是认知、节奏和仓位结构都不匹配，导致每次进场都像在和自己的性格硬碰硬。",
        "hook_en": "The biggest risk in investing is not one losing trade. It is letting your cognition, timing, and position structure fight against your own nature every time you enter.",
        "decision_zh": "风险偏好、资金节奏和对波动的承受能力",
        "decision_en": "risk appetite, capital rhythm, and tolerance for volatility",
        "scenes_zh": ["看到别人投资赚钱，也想参与，但总担心自己一进场就踩错节奏的人。", "已经买过基金、股票、币圈或房产，想知道自己到底适合哪种策略的人。", "本职收入稳定，开始考虑做资产配置，但不想被情绪带着走的人。"],
        "scenes_en": ["People drawn to investing after watching others profit, but who fear entering at the wrong rhythm.", "People who already tried funds, stocks, crypto, or property and want to know what style actually fits them.", "People with stable primary income who want asset allocation without being dragged by emotion."],
        "fit_zh": ["命局财星清、印星稳的人，通常更适合做有纪律、重框架的投资，而不是情绪型交易。", "大运流年利财，但又有足够约束时，投资判断往往更稳。", "如果你本身能接受等待、回撤和复盘，投资更容易成为长期工具而不是刺激游戏。", "已有主业现金流支撑的人，做投资通常比靠投资救命的人更安全。"],
        "fit_en": ["Charts with clear wealth energy and steady study-control support are better at disciplined investing than emotional trading.", "When wealth timing arrives together with enough restraint and structure, investment decisions tend to be calmer.", "If you can tolerate waiting, drawdowns, and review, investing is more likely to become a tool rather than a thrill ride.", "People with strong primary cash flow usually invest more safely than those trying to be rescued by the market."],
        "risk_zh": ["命局比劫重、冲动强的人，最怕仓位失控和频繁追涨杀跌。", "如果当前阶段现金流本来就脆弱，再叠加高风险投资，容易形成双重压力。", "把投资当成逃离现实工作的出口，通常会在波动里放大焦虑。", "没有方法却迷信运气，往往会把本来不错的财运浪费在错误工具上。"],
        "risk_en": ["People with strong impulsive or competitive energy are most vulnerable to oversized positions and chasing price.", "If cash flow is already fragile, adding high-risk investing creates double pressure.", "Treating investing as an escape from real work usually amplifies anxiety during volatility.", "Relying on luck without method often wastes otherwise decent timing on the wrong tools."],
    },
    {
        "slug": "bazi-xiangqin-zongshi-shibai-yuanyin",
        "cat": "relationship",
        "cta_url": "/#form-section",
        "title_zh": "八字看相亲总失败的原因：问题出在缘分、筛选还是相处方式？",
        "title_en": "Why Does Matchmaking Keep Failing? A Bazi View on Repeated Misses",
        "desc_zh": "相亲老是见光死，不一定是你条件不够，而可能是择偶节奏、沟通模式和命局窗口没有对上。用八字先排查问题。",
        "desc_en": "If matchmaking keeps failing, it may not be because your conditions are weak. It may be a mismatch of timing, screening standards, and interaction style. Bazi can help diagnose it.",
        "query_zh": "相亲总失败",
        "query_en": "why matchmaking keeps failing",
        "hook_zh": "相亲失败最折磨人的地方，不只是一次次无果，而是你会开始怀疑：到底是自己眼光有问题、表达有问题，还是时机根本就不对。",
        "hook_en": "What hurts most about repeated matchmaking failure is not one bad meeting. It is the creeping doubt: are your standards wrong, is your expression wrong, or is the timing itself off?",
        "decision_zh": "择偶标准、相处方式和感情窗口是否匹配",
        "decision_en": "alignment between standards, interaction style, and relationship timing",
        "scenes_zh": ["见的人不少，但总是聊几次就散，没有明显推进的人。", "条件不差，却总遇到不来电、时间对不上或价值观冲突的人。", "家里催得很急，自己也想稳定下来，但现实推进总是不顺的人。"],
        "scenes_en": ["People who meet many candidates but see every interaction fade after a few conversations.", "People with decent conditions who repeatedly meet poor chemistry, timing mismatch, or value conflict.", "People under family pressure who do want stability but keep hitting friction in real progress."],
        "fit_zh": ["命局桃花不乱、配偶信息清晰的人，通常更知道自己真正适合什么样的关系。", "大运流年带来正缘信息时，相亲效率往往会明显提高，不再总是空耗。", "如果你能把筛选条件和真实需求分开，关系推进会比过去顺得多。", "沟通节奏稳、边界感清晰的人，更容易在相亲场景里建立可靠感。"],
        "fit_en": ["Charts with clearer relationship signals often understand what kind of partnership truly fits them.", "When current cycles activate genuine relationship timing, matchmaking efficiency usually rises sharply.", "Separating rigid checklist standards from real emotional needs often improves outcomes a lot.", "People with stable pacing and clear boundaries build trust more easily in matchmaking settings."],
        "risk_zh": ["桃花杂乱、标准摇摆的人，常见情况是对象很多，但真正能落地的关系很少。", "如果命局当下不在感情窗口，再强推相亲也容易出现谁都不合适的感受。", "表达方式过于防御、过于审判或过于讨好，都会让关系在前几次接触就失温。", "只在意条件排序，不看相处成本和长期稳定性，往往会重复同一种失败。"],
        "risk_en": ["Scattered romantic signals and unstable standards often create many options but very few viable outcomes.", "If the current cycle is not relationship-friendly, pushing hard on matchmaking often makes everyone feel wrong.", "Over-defensive, over-judging, or over-pleasing communication styles all cool down connection early.", "Ranking only external conditions while ignoring relational cost and long-term stability repeats the same failure pattern."],
    },
    {
        "slug": "hepan-jiehun-qian-bixu-kan-shenme",
        "cat": "relationship",
        "cta_url": "/hepan.html",
        "title_zh": "合盘看结婚前必须看什么：不是只看合不合，更要看能不能过日子",
        "title_en": "What Must You Check Before Marriage? A Compatibility Reading Guide",
        "desc_zh": "结婚前看合盘，不是为了算一个吉凶分数，而是要看价值观、冲突模式、婚后分工和风险边界能不能长期承受。",
        "desc_en": "Premarital compatibility is not about one lucky score. It is about values, conflict patterns, post-marriage roles, and whether the relationship can survive real life.",
        "query_zh": "结婚前看合盘",
        "query_en": "what to check in compatibility before marriage",
        "hook_zh": "结婚前最怕的不是看不到甜蜜，而是没看见日常琐事、金钱分工、家人介入和冲突升级这些真正决定婚后质量的问题。",
        "hook_en": "Before marriage, the real danger is not missing the sweet parts. It is missing the daily frictions, money structure, family involvement, and conflict escalation patterns that define married life.",
        "decision_zh": "价值观同步、婚后分工和冲突修复能力",
        "decision_en": "value alignment, post-marriage role design, and conflict repair ability",
        "scenes_zh": ["已经谈到结婚，但双方在买房、彩礼、城市和父母边界上开始出现分歧的人。", "感情很好，却隐约担心婚后会不会因为生活方式不同而持续拉扯的人。", "二选一犹豫中，想通过合盘看清谁更适合长期过日子的人。"],
        "scenes_en": ["Couples near marriage who already feel tension over housing, gifts, cities, or parent boundaries.", "Couples who feel good emotionally but quietly worry that married life habits may clash.", "People choosing between two partners and wanting a more grounded long-term view."],
        "fit_zh": ["双方核心价值观和生活目标一致时，合盘即使不完美，也更有长期稳定基础。", "命局冲合有度、彼此能互补而不过度消耗，是适合结婚的重要信号。", "大运节奏相对同步的人，婚后在事业、家庭和孩子议题上更容易同频。", "如果冲突后愿意修复、愿意沟通，而不是习惯冷战或翻旧账，婚后风险会低很多。"],
        "fit_en": ["When core values and life goals align, even imperfect charts can still build stable marriage foundations.", "Compatibility patterns that complement rather than drain each other are important marriage signals.", "Couples whose major luck cycles move in a similar rhythm often coordinate career and family decisions more smoothly.", "If both sides repair after conflict instead of freezing or reopening old wounds, marriage risk drops substantially."],
        "risk_zh": ["只看到热恋期的吸引力，却忽略双方在金钱、家庭和边界上的底层分歧，是常见隐患。", "命局严重互耗、一个人长期高付出另一个人长期回避时，婚后摩擦会持续放大。", "如果双方大运方向完全相反，一个人要冲事业、一个人要稳定家庭，矛盾会变得结构化。", "没有讨论过现实议题就急着结婚，通常比八字不合更危险。"],
        "risk_en": ["Seeing only attraction while ignoring deeper differences in money, family, and boundaries is a common hidden risk.", "When one person keeps over-giving and the other keeps avoiding, incompatibility grows after marriage.", "If major life cycles point in opposite directions, conflict becomes structural after marriage.", "Rushing into marriage without discussing real-life issues is often riskier than any simple compatibility score."],
    },
    {
        "slug": "bazi-jinnian-shihe-jiehun-haishi-xian-tanliang",
        "cat": "relationship",
        "cta_url": "/hepan.html",
        "title_zh": "八字看今年适合结婚还是先谈两年：快定下来还是再观察？",
        "title_en": "Marry This Year or Wait Two More Years? A Bazi Timing Guide",
        "desc_zh": "感情到了结婚节点，最怕不是拖，而是拖错；也怕不是冲，而是冲早。用八字看今年适不适合把关系落地。",
        "desc_en": "At the marriage decision point, the risk is not simply waiting or acting. It is waiting at the wrong time or moving too early. Bazi helps judge whether this year is right for commitment.",
        "query_zh": "今年适合结婚还是先谈两年",
        "query_en": "whether to marry this year or wait two more years",
        "hook_zh": "很多关系的问题不在于爱不爱，而在于两个人是不是都到了可以承担婚姻成本的阶段，能不能把现在的甜蜜真正接成长期结构。",
        "hook_en": "The issue is often not whether there is love. It is whether both people are in a stage that can truly carry the cost and structure of marriage.",
        "decision_zh": "落地时机、关系成熟度和婚后承压能力",
        "decision_en": "timing of commitment, relationship maturity, and post-marriage pressure tolerance",
        "scenes_zh": ["双方感情稳定，但在今年领证还是再观察一段时间上拿不准的人。", "已经被家里催婚，自己却担心现在结婚会不会太早的人。", "一方很想结婚、一方觉得再磨合更稳，想看节奏到底该偏向哪边的人。"],
        "scenes_en": ["Couples with stable feelings who are unsure whether to register this year or keep observing.", "People under family pressure but worried that this year may still be early.", "Couples split between immediate commitment and longer adjustment."],
        "fit_zh": ["流年合婚、婚姻宫稳定、双方现实条件同步时，今年结婚通常更容易顺势推进。", "如果两个人的大运都处在愿意承担责任、愿意安定下来的阶段，落地概率更高。", "该谈的现实问题已经谈清楚，婚后分工和城市安排不再模糊，是可以推进的重要信号。", "关系里已经经历过冲突且修复过，说明不是只会甜，而是具备婚姻所需的韧性。"],
        "fit_en": ["When the current year supports marriage and real-life conditions align, formal commitment is easier to push through.", "If both partners are in cycles that support responsibility and settlement, marriage timing improves.", "Clear agreements on city, roles, and money are major signs that the relationship can move forward.", "A couple that has already repaired real conflict usually has stronger marriage resilience than one that has only stayed sweet."],
        "risk_zh": ["感情虽然稳定，但现实议题全都没谈，仓促结婚后往往会在细节里爆发。", "如果一方处在事业强冲期、另一方强求稳定，节奏错位会让婚后压力倍增。", "流年本身冲婚姻宫时，推进婚礼、领证、买房等大动作要更谨慎。", "为了回应外界催促而结婚，通常会把短期焦虑换成长期拉扯。"],
        "risk_en": ["Stable feelings without real-life agreements often explode later in small domestic details.", "If one side is in a hard career push while the other demands immediate settlement, post-marriage pressure multiplies.", "Years that directly disturb the relationship palace call for more caution on marriage and other major commitments.", "Marrying mainly to satisfy outside pressure often trades short-term relief for long-term friction."],
    },

    {
        "slug": "bazi-shihe-kai-gongsi-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合开公司：你适合自己扛盘还是更适合借平台做大？",
        "title_en": "Should You Start a Company? A Bazi Check on Founder Fit",
        "desc_zh": "开公司不是只看有没有野心，更看你是否能扛责任、带团队、管现金流和长期不确定性。先用八字判断创业盘。",
        "desc_en": "Starting a company is not just about ambition. It also requires ownership, team management, cash-flow control, and tolerance for uncertainty.",
        "query_zh": "开公司",
        "query_en": "starting a company",
        "hook_zh": "很多人以为创业的门槛是想法，其实更大的门槛是持续扛责任、做取舍、顶住波动，以及在没人替你兜底时还能继续前进。",
        "hook_en": "People often think the threshold for founding a company is having an idea. In reality, the larger test is carrying responsibility, making trade-offs, and moving without a safety net.",
        "decision_zh": "责任承载、团队协同和现金流管理能力",
        "decision_en": "capacity for ownership, team coordination, and cash-flow management",
        "scenes_zh": ["已经有项目或客户资源，想从个体接单升级成公司的人。", "上班多年，越来越想自己做，但又担心开公司后压力失控的人。", "合伙、注册、招人都提上日程，想先判断自己是不是老板型命局的人。"],
        "scenes_en": ["People with early projects or clients who want to turn solo work into a real company.", "Employees who increasingly want to build something themselves but worry about losing control of pressure.", "People preparing registration, hiring, or partnership and wanting to know whether they fit a founder chart."],
        "fit_zh": ["命局财官食伤流通顺的人，通常更有能力同时看业务、看团队、看结果。", "大运走财运或食伤生财阶段时，开公司更容易把输出转成组织收益。", "如果你本身就不怕决策、敢担责任、能容忍不确定性，创业盘往往更明显。", "已有稳定客户或资源，不是从零硬赌的人，开公司更容易起盘。"],
        "fit_en": ["Charts where wealth, authority, and output energies circulate well often handle business, people, and outcomes more effectively.", "Wealth cycles or output-to-wealth phases make it easier to turn personal capability into organizational revenue.", "If you naturally tolerate responsibility, decision pressure, and uncertainty, founder fit becomes much clearer.", "People starting with existing customers or resources usually launch companies more smoothly than those gambling from zero."],
        "risk_zh": ["命局更适合专业深工、但不适合带人和抗压的人，开公司会让优势被管理任务稀释。", "如果只是厌倦上班而开公司，却没有业务闭环，通常很快会被现金流打回现实。", "大运不利扩张、现实资源又不足时，开公司可能比继续借平台更危险。", "把注册公司当成身份升级，而不是经营升级，常常是错位开局。"],
        "risk_en": ["People better suited to deep professional work than leadership may see their strengths diluted by management burden.", "Starting a company only because you hate employment, without a business loop, usually runs into cash reality quickly.", "If your current cycle does not support expansion and resources are thin, using a larger platform may be safer than founding now.", "Treating company registration as a status upgrade instead of an operating upgrade is a common misalignment."],
    },
    {
        "slug": "bazi-shihe-huan-hangye-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合换行业：是该继续深耕还是趁窗口重启？",
        "title_en": "Should You Change Industry? A Bazi Timing Check for Career Reset",
        "desc_zh": "换行业最怕的不是从头开始，而是明明该转却不敢转，或者本不该转却因为焦虑乱换。用八字先看窗口再行动。",
        "desc_en": "The real danger in changing industry is not starting over. It is either refusing to pivot when you should, or pivoting randomly from anxiety.",
        "query_zh": "换行业",
        "query_en": "changing industry",
        "hook_zh": "行业切换最大的成本，从来不是学历和经验归零，而是你在错误的时候换、或者在早该离开的赛道上继续硬熬。",
        "hook_en": "The biggest cost of switching industries is not losing some experience. It is changing at the wrong moment, or staying too long in a lane that no longer fits.",
        "decision_zh": "赛道匹配度、转换窗口和重新积累成本",
        "decision_en": "industry fit, transition timing, and the cost of rebuilding",
        "scenes_zh": ["在当前行业待了几年，越来越觉得天花板低、状态差的人。", "想从传统行业转互联网、从乙方转甲方或从大厂转小团队的人。", "手上已经有新方向，但又担心过去经验全部浪费的人。"],
        "scenes_en": ["People who have spent years in one industry and increasingly feel stuck or depleted.", "People moving from traditional sectors to tech, agency to in-house, or large company to smaller teams.", "People who already see a new direction but fear wasting their accumulated experience."],
        "fit_zh": ["命局本身多才多用、适合跨领域整合的人，换行业往往不是归零，而是重组优势。", "大运进入新周期、旧平台红利见顶时，换行业往往比原地硬撑更有效率。", "如果新行业更符合你的命局用神，短期阵痛后通常会换来更长的顺势期。", "你已经在新方向上有技能、资源或副业验证时，转型成功率会高很多。"],
        "fit_en": ["Charts built for multi-domain integration often use industry changes to reassemble strengths rather than reset to zero.", "When a new cycle begins and the old platform dividend peaks, changing industry can be more efficient than enduring.", "If the new industry matches your useful elements better, short pain often leads to a longer smooth phase.", "Existing skills, side projects, or early validation in the new field raise transition success sharply."],
        "risk_zh": ["只是因为眼前辛苦就换行业，而没有判断自己究竟是不适合岗位还是不适合赛道，容易重复同样的问题。", "大运仍然适合在旧行业完成积累时，过早跳走会导致两头都没站稳。", "没有资金缓冲、没有过渡计划，换行业很容易先把生活秩序打乱。", "把转行当成情绪解药，而不是长期策略，通常会让焦虑在新行业继续复制。"],
        "risk_en": ["Changing industry only because the present feels hard, without knowing whether the mismatch is role or sector, repeats the same pain.", "If the current cycle still supports accumulation in the old field, leaving too early can destabilize both sides.", "Without a cash buffer or transition plan, an industry switch can quickly damage daily life order.", "Treating a pivot as emotional medicine instead of long-term strategy usually copies the same anxiety into a new field."],
    },
    {
        "slug": "bazi-shihe-ziyou-zhiye-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合自由职业：你能靠自驱和长期波动活下来吗？",
        "title_en": "Are You Suited for Freelancing? A Bazi Read on Self-Driven Work",
        "desc_zh": "自由职业看起来自由，真正考验的是自驱、接单、交付、现金流和情绪稳定。先看你是不是适合不被人管的命局。",
        "desc_en": "Freelancing looks free, but the real tests are self-drive, client acquisition, delivery, cash flow, and emotional stability.",
        "query_zh": "自由职业",
        "query_en": "freelancing",
        "hook_zh": "自由职业的难点不是没人管，而是没人替你兜底：你既要自己找机会，也要自己扛空窗，还要自己把专业能力变成稳定现金流。",
        "hook_en": "The hard part of freelancing is not the freedom. It is the lack of a safety net: you must find opportunities, survive idle periods, and turn skill into reliable cash flow yourself.",
        "decision_zh": "自驱力、接单能力和高波动收入适应度",
        "decision_en": "self-drive, client-winning ability, and adaptation to volatile income",
        "scenes_zh": ["不想继续坐班，开始考虑独立接单、顾问、创作或服务型自由职业的人。", "已经在兼职接单，想知道自己适不适合彻底转成自由职业的人。", "曾经试过自由职业，但因为收入不稳又退回上班，想知道问题出在哪里的人。"],
        "scenes_en": ["People thinking about independent client work, consulting, creation, or service-based freelancing.", "People already taking side gigs who want to know whether full-time freelancing is realistic.", "People who tried freelancing once, returned to employment, and now want to know what really went wrong."],
        "fit_zh": ["命局食伤生财、有自主输出能力的人，通常更能把个人能力直接变成收入。", "如果不依赖强管理也能保持节奏，自由职业会比坐班更能释放你的优势。", "大运利人脉、利曝光、利口碑时，独立接单成功率会明显上升。", "已经具备稳定技能标签和客户来源的人，自由职业往往不是冒险，而是顺势升级。"],
        "fit_en": ["Charts with output-to-wealth dynamics often monetize personal skill more directly.", "If you can maintain pace without external management, freelancing may release your strengths better than office work.", "Cycles that support exposure, reputation, and network-building usually improve independent client acquisition.", "People who already have clear skills and client channels often treat freelancing as an upgrade rather than a gamble."],
        "risk_zh": ["极度需要外部结构、考核和团队推动的人，自由职业容易拖延和失速。", "命局不善交付、不善开口要价时，能力再强也可能长期赚不到对应的钱。", "如果家庭和现金流承压很重，自由职业的波动会被放大得更难受。", "只是厌烦上班就裸辞去自由职业，通常低估了销售自己的难度。"],
        "risk_en": ["People who need strong structure, supervision, and team push may drift badly in freelancing.", "If you struggle with delivery or pricing, even strong skill may fail to produce fair income.", "When family pressure and cash-flow burden are already heavy, freelance volatility feels much harsher.", "Quitting only because employment feels annoying usually underestimates how hard it is to sell yourself consistently."],
    },
    {
        "slug": "bazi-shihe-zuo-jiaoyu-peixun-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合做教育培训：你更适合教别人还是只适合自己做？",
        "title_en": "Should You Work in Education or Training? A Bazi Teaching Fit Check",
        "desc_zh": "教育培训不只是会不会讲，更看你能不能持续输出、理解他人、建立方法并承受长期服务关系。先看命局匹配。",
        "desc_en": "Education and training require more than the ability to explain. They demand sustained output, empathy, method-building, and tolerance for long client relationships.",
        "query_zh": "做教育培训",
        "query_en": "working in education and training",
        "hook_zh": "能把自己做明白，和能把别人教会，是两种完全不同的能力。教育培训真正考验的是耐心、方法和持续承担他人成长结果的能力。",
        "hook_en": "Being able to do something well and being able to teach it well are very different capacities. Education work tests patience, method, and the ability to carry other people's growth process.",
        "decision_zh": "表达、共情、方法设计和长期陪伴能力",
        "decision_en": "expression, empathy, method design, and long-term accompaniment ability",
        "scenes_zh": ["考虑进入教培、职业培训、知识课程或辅导行业的人。", "自己专业能力不错，正在犹豫要不要把经验变成课程和服务的人。", "已经在教学或培训岗位，但怀疑自己是不是更适合幕后而不是前台的人。"],
        "scenes_en": ["People considering tutoring, training, coaching, or course-based knowledge work.", "Professionals wondering whether to turn hard-won expertise into lessons and services.", "Current teachers or trainers who suspect they may fit backstage work better than direct teaching."],
        "fit_zh": ["命局印星和食伤配合佳的人，通常既能理解知识，也能把知识拆解给别人。", "如果你对别人开窍、成长、变好这件事有耐心，教育培训更容易做出长期口碑。", "大运利表达、利贵人、利平台传播时，课程和教学成果更容易放大。", "已经有方法论、有案例、有稳定内容输出的人，更适合把教育培训做成事业。"],
        "fit_en": ["Charts where study energy and output energy cooperate often support both learning and teaching.", "If you have patience for other people's growth, education work is more likely to build long-term reputation.", "Cycles that help expression, mentorship, and platform spread make teaching outcomes easier to amplify.", "People who already have methods, cases, and consistent content are much more likely to build a real training business."],
        "risk_zh": ["只想展示自己，不愿反复陪人练、陪人问、陪人卡点的人，做培训会很快失去耐心。", "表达能力弱、面对人群容易耗空的人，更适合做研究或产品而不是前台教学。", "如果只是把教育培训当成快速收钱项目，很容易在服务过程中翻车。", "当前大运不利曝光和人际时，强做培训可能事倍功半。"],
        "risk_en": ["People who only want to display expertise but dislike repeated questions and practice support may lose patience quickly in teaching.", "If public-facing communication drains you heavily, research or product work may fit better than front-stage training.", "Treating education only as a quick-cash project often collapses during the service process.", "If the current cycle does not support visibility and relationship work, forcing a training path may feel inefficient."],
    },
    {
        "slug": "bazi-shihe-zuo-zhishi-fufei-ma",
        "cat": "career",
        "cta_url": "",
        "title_zh": "八字看适不适合做知识付费：你的经验能不能变成稳定产品？",
        "title_en": "Should You Build a Knowledge Product Business? A Bazi Monetization Check",
        "desc_zh": "知识付费不是把会的东西说出来就行，还要能定位、包装、交付和持续成交。用八字看你适不适合把经验产品化。",
        "desc_en": "Knowledge monetization is more than explaining what you know. It requires positioning, packaging, delivery, and repeat conversion.",
        "query_zh": "做知识付费",
        "query_en": "building a knowledge monetization business",
        "hook_zh": "知识付费最容易踩的坑，不是内容不够好，而是内容、产品、流量和成交四个环节根本没有形成闭环。",
        "hook_en": "The biggest trap in knowledge monetization is rarely weak content. It is the absence of a loop connecting content, product, traffic, and conversion.",
        "decision_zh": "经验产品化、持续表达和商业闭环能力",
        "decision_en": "ability to productize experience, express consistently, and build a business loop",
        "scenes_zh": ["有专业经验，想做课程、社群、咨询或陪跑服务的人。", "已经做内容，但总觉得粉丝看了很多、付费很少的人。", "想把副业做成知识产品，却不确定自己适不适合长期站到台前的人。"],
        "scenes_en": ["People with real expertise who want to sell courses, communities, consulting, or guided services.", "Creators who already have content attention but weak paid conversion.", "Side-hustlers wondering whether they fit a long-term knowledge product path."],
        "fit_zh": ["命局食伤生财明显的人，往往更适合通过表达、教学、方法输出来赚钱。", "如果你能把经验拆成流程、模板和标准动作，知识付费更容易变成产品而非一次性咨询。", "大运利曝光和利人脉时，内容分发和口碑传播通常会更顺。", "已经有真实案例、结果证明和服务反馈的人，知识付费变现会更稳。"],
        "fit_en": ["Charts with obvious output-to-wealth dynamics often monetize through explanation, teaching, and frameworks.", "If you can turn experience into process, templates, and repeatable steps, knowledge work becomes a product instead of one-off advice.", "Cycles that support visibility and relationships usually improve distribution and word-of-mouth.", "People with real cases, proof, and feedback monetize much more steadily than idea-only creators."],
        "risk_zh": ["只有表达欲，没有结果和方法论的人，知识付费很容易空心化。", "不愿意长期做内容、不愿意反复讲同一件事的人，很难把产品做起来。", "如果你对成交、销售和用户运营非常抗拒，知识付费会卡在最后一步。", "把知识付费理解成躺赚，通常会在真正做交付时被现实教育。"],
        "risk_en": ["People with expression desire but no results or method often create hollow knowledge products.", "If you cannot repeat, refine, and publish consistently, it is hard to build a real product.", "Strong resistance to sales and user operations often blocks knowledge work at the final mile.", "Treating knowledge monetization as passive easy money usually collapses once delivery begins."],
    },
    {
        "slug": "shengxiao-2026-shu-caiyun",
        "cat": "finance",
        "cta_url": "",
        "title_zh": "属鼠 2026 年财运怎么样：正财偏财谁更有机会？",
        "title_en": "Rat Sign in 2026: What Does Wealth Luck Look Like?",
        "desc_zh": "想知道属鼠的人在 2026 年财运是稳中有升，还是容易进进出出？从生肖流年与命理结构看正财、偏财和守财节奏。",
        "desc_en": "Want to know whether Rat-sign wealth in 2026 is stable, expanding, or leaky? This reading looks at income type, side wealth, and wealth retention rhythm.",
        "query_zh": "属鼠 2026 年财运",
        "query_en": "Rat sign wealth luck in 2026",
        "hook_zh": "很多人问属鼠 2026 年财运，不只是关心能不能赚，而是想知道这一年赚的钱是更适合稳稳留下来，还是容易一边进一边出。",
        "hook_en": "People asking about Rat-sign wealth in 2026 usually want more than a simple profit forecast. They want to know whether money will stay, leak, or need a more defensive rhythm.",
        "decision_zh": "正财稳定性、偏财机会和守财能力",
        "decision_en": "salary stability, side-income opportunity, and wealth retention ability",
        "scenes_zh": ["正在考虑加薪、换岗、副业或投资的人。", "过去两年收入起伏较大，想看 2026 年会不会更稳的人。", "手里有一笔资金，纠结该继续攒还是做更积极配置的人。"],
        "scenes_en": ["People considering a raise, job move, side hustle, or investment plan.", "People whose income has fluctuated in recent years and want to know whether 2026 is steadier.", "People holding a sum of money and deciding whether to save or allocate it more actively."],
        "fit_zh": ["如果命局本身财星有根，2026 年更容易把收入从波动变成留存。", "适合走稳健收入的人，这一年通常更适合先把底盘做厚。", "已经有明确主业和副业分工的人，更容易在 2026 年看到财富效率提升。", "如果现实生活进入稳定期，属鼠人在 2026 年更容易建立新的储蓄节奏。"],
        "fit_en": ["If the natal chart already supports rooted wealth, 2026 is more likely to turn unstable income into retained income.", "For people suited to steady earning, this year often rewards building a stronger base first.", "Those with clear separation between primary income and side income tend to improve financial efficiency in 2026.", "If life itself is entering a steadier phase, Rat-sign natives often find it easier to build a saving rhythm."],
        "risk_zh": ["如果总想靠偏财快速突破，2026 年反而可能因为节奏过急而放大回撤。", "人情支出、冲动消费和错误合伙，仍然是财运被分走的常见来源。", "看到机会就频繁加码，容易让本来不错的正财被打乱。", "如果现金流基础还没站稳，就不适合把所有希望压在高波动收益上。"],
        "risk_en": ["If you try to rely only on side wealth for a quick breakthrough, 2026 may magnify reversals through impatience.", "Social spending, impulsive consumption, and bad partnership remain common leakage points.", "Adding risk too often can disturb otherwise decent primary income.", "If cash-flow fundamentals are still weak, it is unwise to place all hope on high-volatility returns."],
    },
    {
        "slug": "shengxiao-2026-hu-shiye",
        "cat": "career",
        "cta_url": "",
        "title_zh": "属虎 2026 年事业运：适合往上冲，还是先稳住位置？",
        "title_en": "Tiger Sign in 2026: Push Career Growth or Hold Position?",
        "desc_zh": "属虎的人 2026 年事业运是适合冲岗位、换平台，还是先守住基本盘？从流年节奏看升职、跳槽与职场压力。",
        "desc_en": "Should Tiger-sign natives push for promotion in 2026, switch platforms, or focus on stability first? This reading checks promotion, platform changes, and job pressure.",
        "query_zh": "属虎 2026 年事业运",
        "query_en": "Tiger sign career luck in 2026",
        "hook_zh": "事业运最怕看错节奏。对属虎的人来说，2026 年到底是适合主动冲、还是应该先稳住位置和资源，差别可能非常大。",
        "hook_en": "Career timing matters more than raw effort. For Tiger-sign natives, the difference between pushing too hard and moving at the right moment can be huge in 2026.",
        "decision_zh": "升职机会、跳槽窗口和职场承压能力",
        "decision_en": "promotion chance, job-switch timing, and pressure tolerance at work",
        "scenes_zh": ["已经有升职想法，但担心今年动作太大的人。", "手里有新机会，却拿不准要不要离开旧平台的人。", "工作越来越忙，想判断 2026 年值不值得继续硬顶的人。"],
        "scenes_en": ["People considering promotion but unsure whether this year supports a bigger move.", "People holding a new opportunity but uncertain whether to leave the old platform.", "People under increasing workload who want to know whether 2026 is worth pushing through."],
        "fit_zh": ["如果过去几年一直在打基础，2026 年更适合作成果兑现。", "岗位上已经有可见成绩的人，更容易在这一年获得认可与资源。", "愿意主动沟通、争取和承担责任的人，事业运更容易被放大。", "如果现实里有更大平台或更清晰路径，属虎人在 2026 年适合认真评估升级机会。"],
        "fit_en": ["If the past few years were spent building foundations, 2026 is better suited to converting that work into visible results.", "People who already have measurable performance are more likely to gain recognition and resources.", "Those willing to communicate, push, and carry responsibility can amplify career luck more effectively.", "If a bigger platform or clearer path is already visible, Tiger-sign natives should evaluate the upgrade seriously."],
        "risk_zh": ["如果状态本来就透支，2026 年一味硬冲可能把身体和关系一起拖累。", "只因为焦虑而换平台，容易把旧问题带到新岗位。", "没有新资源承接就裸跳，事业运很容易由主动变被动。", "与上级、制度或团队关系紧张时，不宜同时做太多大动作。"],
        "risk_en": ["If you are already depleted, forcing an aggressive push in 2026 may drag down both health and relationships.", "Switching platforms only from anxiety often transports the old problems into a new role.", "Jumping without real support can turn a proactive career move into a defensive one.", "When tension with management, systems, or team is already high, avoid stacking too many major moves at once."],
    },
    {
        "slug": "shengxiao-2026-tu-taohua",
        "cat": "relationship",
        "cta_url": "/#form-section",
        "title_zh": "属兔 2026 年桃花运：会遇到正缘，还是只是短暂心动？",
        "title_en": "Rabbit Sign in 2026: Real Relationship Luck or Short-Lived Attraction?",
        "desc_zh": "属兔的人 2026 年桃花运到底是更适合脱单，还是容易遇到热闹但不稳定的关系？从流年节奏看感情推进窗口。",
        "desc_en": "Does Rabbit-sign love luck in 2026 support a real relationship, or only exciting but unstable attraction? This reading checks emotional timing and relationship quality.",
        "query_zh": "属兔 2026 年桃花运",
        "query_en": "Rabbit sign love luck in 2026",
        "hook_zh": "桃花多不等于感情顺。属兔的人在 2026 年更需要分清楚，自己遇到的是能落地的关系，还是只是短时间带来情绪波动的吸引。",
        "hook_en": "More attraction does not automatically mean better love outcomes. Rabbit-sign natives in 2026 especially need to tell the difference between viable connection and short emotional excitement.",
        "decision_zh": "脱单机会、关系稳定度和感情推进节奏",
        "decision_en": "chance of meeting someone, relationship stability, and timing for emotional progress",
        "scenes_zh": ["单身已久，希望看 2026 年是不是值得主动认识新人的人。", "最近桃花不少，但总担心来得快去得也快的人。", "已经有暧昧对象，想判断能不能在 2026 年真正走向稳定的人。"],
        "scenes_en": ["Singles who want to know whether 2026 is worth more active social and dating effort.", "People seeing more attention lately but worried the excitement will fade quickly.", "People already in a vague emotional situation and wondering whether 2026 can make it stable."],
        "fit_zh": ["如果命局感情信息本来清晰，2026 年更容易把相识推进成实际关系。", "愿意慢一点筛选、看长期而不是只看心动的人，更容易遇到正缘。", "原本社交圈就比较稳定的人，这一年更容易从熟人或靠谱渠道里遇到合适对象。", "如果过去感情模式已经开始调整，2026 年会更容易进入成熟关系。"],
        "fit_en": ["If the natal chart already shows clearer relationship signals, 2026 is better at turning meetings into real partnership.", "People willing to screen slowly and look at long-term fit are more likely to meet a suitable partner.", "Those with more stable social circles often meet better people through trusted channels this year.", "If your past relationship pattern has already been improving, 2026 can support a more mature connection."],
        "risk_zh": ["只看情绪浓度、不看现实边界，容易让 2026 年的桃花变成短期消耗。", "旧关系没放下就进入新关系，会让感情线更乱。", "如果命局本来桃花杂，主动认识很多人并不一定会更快稳定。", "一旦遇到明显忽冷忽热或回避型对象，越投入越容易消耗自己。"],
        "risk_en": ["Focusing only on emotional intensity while ignoring real-life boundaries can turn 2026 attraction into short-term drain.", "Entering something new before letting go of the old makes the emotional pattern more chaotic.", "If the natal chart already shows scattered romance, meeting many people does not automatically create stability.", "If someone is obviously hot-and-cold or avoidant, deeper involvement usually costs more than it gives."],
    },
    {
        "slug": "shengxiao-2026-long-fanxiaoren",
        "cat": "career",
        "cta_url": "",
        "title_zh": "属龙 2026 年犯小人吗：职场与合作里要防什么？",
        "title_en": "Dragon Sign in 2026: Is There a Higher Risk of Hidden Opposition?",
        "desc_zh": "属龙的人 2026 年是否容易遇到小人、暗耗、职场背后阻力？从生肖流年看合作、口舌和关系消耗点。",
        "desc_en": "Will Dragon-sign natives face more hidden opposition, gossip, or workplace resistance in 2026? This reading looks at cooperation risk and relationship drain.",
        "query_zh": "属龙 2026 年犯小人吗",
        "query_en": "Dragon sign hidden-opposition risk in 2026",
        "hook_zh": "很多时候所谓犯小人，不是突然有人针对你，而是节奏不对、边界太松或资源分配失衡，最后让矛盾慢慢积累到爆发。",
        "hook_en": "What people call hidden opposition is often not sudden betrayal. It is more often mistimed action, loose boundaries, and resource imbalance that slowly accumulates into conflict.",
        "decision_zh": "合作风险、口舌是非和职场边界管理",
        "decision_en": "partnership risk, gossip pressure, and boundary management at work",
        "scenes_zh": ["团队里关系复杂，已经感觉有人暗中使绊的人。", "准备合作新项目，但担心分工不清后面出问题的人。", "最近职场压力大，怕 2026 年人际问题拖住发展的人。"],
        "scenes_en": ["People already feeling subtle obstruction inside a complex team environment.", "People starting a new cooperation and worried that unclear roles will later become conflict.", "People under career pressure who fear that interpersonal issues may block progress in 2026."],
        "fit_zh": ["如果边界清楚、规则讲明白，很多小人风险会在前期就被削弱。", "原本就有稳定核心关系和靠谱同盟的人，在 2026 年更容易守住位置。", "凡事留痕、先说清责任与收益的人，更容易把暗耗变成可控成本。", "把精力放回结果而不是情绪的人，在复杂关系里更容易保持优势。"],
        "fit_en": ["Clear boundaries and explicit rules weaken a large portion of hidden-opposition risk up front.", "People who already have a reliable inner circle and trusted allies are better protected in 2026.", "Those who document decisions and clarify responsibility and benefit early control conflict more effectively.", "People who focus on outcomes rather than emotional reaction usually keep stronger positions in complex environments."],
        "risk_zh": ["过度相信口头承诺、忽略细节约定，容易在后期吃亏。", "情绪上头就正面冲突，反而会放大小问题。", "合作边界模糊、人情分不清时，小人往往不是别人，而是自己给了入口。", "如果同时和太多人绑定利益，属龙人在 2026 年更要防资源分散和背后议论。"],
        "risk_en": ["Overtrusting verbal promises while ignoring detail agreements can create later losses.", "Exploding emotionally in direct conflict often magnifies smaller problems.", "When partnership boundaries are blurred, the entry point for hidden opposition is often self-created.", "If too many interests are tied together at once, Dragon-sign natives should watch resource spread and back-channel talk in 2026."],
    },
    {
        "slug": "shengxiao-2026-ma-chuangye",
        "cat": "career",
        "cta_url": "",
        "title_zh": "属马 2026 年适合创业吗：机会年还是高压试错年？",
        "title_en": "Horse Sign in 2026: Is It a Good Year to Start a Business?",
        "desc_zh": "属马的人 2026 年适合创业、开店、合伙或做副业放大吗？从流年节奏看扩张窗口、资金压力和试错成本。",
        "desc_en": "Should Horse-sign natives start a business, open a store, form a partnership, or scale a side business in 2026? This reading looks at expansion timing and risk cost.",
        "query_zh": "属马 2026 年适合创业吗",
        "query_en": "Is 2026 good for Horse sign entrepreneurship",
        "hook_zh": "创业最怕的不是辛苦，而是明明该先验证却直接重投入。对属马的人来说，2026 年更关键的是判断这是放大年，还是高压试错年。",
        "hook_en": "The greatest entrepreneurial risk is not hard work. It is heavy commitment before validation. For Horse-sign natives, 2026 is about judging whether this is an expansion year or a pressure-testing year.",
        "decision_zh": "扩张窗口、试错成本和资金承压能力",
        "decision_en": "expansion timing, cost of experimentation, and ability to carry pressure",
        "scenes_zh": ["已经有创业念头或副业基础，想在 2026 年做大的人。", "准备和朋友合伙，担心感情和利益混在一起的人。", "不想继续上班，但也怕今年创业会太冒险的人。"],
        "scenes_en": ["People who already have a business idea or side-income base and want to scale in 2026.", "People planning to partner with friends and worried about mixing relationship with money.", "People who no longer want employment but fear that 2026 may still be too risky for founding."],
        "fit_zh": ["如果项目已经有雏形和现金流苗头，2026 年更适合放大而不是从零想象。", "执行力强、反应快、能边做边修正的人，更容易把创业节奏拉起来。", "愿意先小规模试、再逐步扩大的人，在 2026 年更容易把风险压住。", "如果有成熟资源承接，比如客户、供应链或内容流量，创业的成功率会高很多。"],
        "fit_en": ["If the project already has a shape and early cash signals, 2026 is better for scaling than fantasizing from zero.", "People who act quickly and adjust as they go often build stronger entrepreneurial rhythm.", "Those willing to test small and scale gradually are more likely to keep risk under control in 2026.", "If mature resources already exist, such as customers, supply chain, or traffic, the chance of success rises sharply."],
        "risk_zh": ["没有项目验证就直接辞职或砸钱，容易把创业变成高成本情绪动作。", "合伙边界没讲清时，后期冲突会比业务问题更快到来。", "如果现金流本来就紧，2026 年不适合一次押太多筹码。", "只因为看到别人创业赚钱就冲进去，往往会忽略自己真正擅长的模式。"],
        "risk_en": ["Quitting or spending heavily before validation can turn entrepreneurship into an expensive emotional action.", "When partnership boundaries are unclear, conflict often arrives faster than business growth.", "If cash flow is already tight, 2026 is not the year to stack too many chips at once.", "Jumping in only because others look profitable often ignores your real mode of strength."],
    },
]

PACK = {
    "zh-Hans": {
        "lang": "zh-CN",
        "brand": "云子命理",
        "home": "首页",
        "blog": "命理知识",
        "hepan": "合盘分析",
        "crumb": "首页 / 命理知识 / SEO 专题",
        "badge": "2026 高意图命理专题",
        "who": "哪些人最应该先看这个问题",
        "why": "为什么这个问题不能只靠感觉",
        "fit": "哪些信号代表更适合",
        "risk": "哪些信号代表要更谨慎",
        "mistake": "最容易踩的误区",
        "steps": "更稳妥的行动顺序",
        "faq": "常见问题",
        "related": "相关阅读",
        "updated": "更新于",
        "read": "约",
        "mins": "分钟阅读",
        "lang_zh": "简体中文",
        "lang_tw": "繁體中文",
        "lang_en": "English",
        "footer": "© 2026 云子命理 · tengyunzi.com",
        "index_title": "新上架 SEO 命理专题",
        "index_desc": "20 个不与站内旧文重复的高意图主题，已同步生成简体中文、繁體中文与 English 版本。",
    },
    "en": {
        "lang": "en",
        "brand": "Yunzi Destiny",
        "home": "Home",
        "blog": "Blog",
        "hepan": "Compatibility",
        "crumb": "Home / Blog / SEO Topics",
        "badge": "2026 High-Intent Destiny Topics",
        "who": "Who Should Read This First",
        "why": "Why This Should Not Be Decided by Feeling Alone",
        "fit": "Signals That Suggest a Better Fit",
        "risk": "Signals That Call for More Caution",
        "mistake": "Most Common Mistakes",
        "steps": "A Safer Action Order",
        "faq": "FAQ",
        "related": "Related Reads",
        "updated": "Updated",
        "read": "About",
        "mins": "min read",
        "lang_zh": "简体中文",
        "lang_tw": "繁體中文",
        "lang_en": "English",
        "footer": "© 2026 Yunzi Destiny · tengyunzi.com",
        "index_title": "New SEO Topic Cluster",
        "index_desc": "20 high-intent topics that do not duplicate existing site content, published in Simplified Chinese, Traditional Chinese, and English.",
    },
}

CATEGORY = {
    "career": {
        "zh": {
            "focus_intro": "职业选择不只是兴趣题，更是工作方式、上升路径、风险承受和现实资源的综合题。命理判断的重点，是看你和这个赛道的底层工作结构是否匹配。",
            "focus": [
                "先看命局结构与用神喜忌，判断你更适合稳定规则型、技术深工型，还是表达经营型工作。",
                "再看官印、食伤、财星与比劫，确认你是适合考试平台、专业路线，还是市场竞争路线。",
                "然后看大运流年，区分现在是蓄力期、切换期还是适合重投入的上升窗口。",
                "最后把学历、城市、家庭支持和现金流一起放进来，避免只看命理不看现实。",
            ],
            "mistakes": [
                "把短期焦虑误当成长期方向。",
                "只看别人赚不赚钱，不看自己适不适合这套工作结构。",
                "还没做低成本验证，就直接重投入。",
            ],
            "steps": [
                "先看自己目前处于发力期、修复期还是切换期。",
                "再做最小验证，例如副业、实习、试项目或短周期准备。",
                "确认方向和窗口都对了，再集中资源重投入。",
            ],
            "faq": [
                ("没有准确出生时辰，还能先看职业方向吗？", "可以。三柱先看大方向与工作模式，补全时辰后再细化具体时间点和岗位细节。"),
                ("命理说适合，就一定能做成吗？", "不是自动成功。命理更像告诉你哪里更顺、什么时候更值得压筹码，现实执行仍然决定结果。"),
                ("已经做了几年才发现不合适，还能调整吗？", "能。很多人的转机都出现在大运切换期，关键是先分清暂时不顺还是长期错配。"),
            ],
            "cta_title": "先免费排盘，再判断这条职业路线值不值得重投入",
            "cta_desc": "如果你正处在考试、转岗、转行、创业或副业节点，先看清命盘结构和阶段节奏，再做决定会更稳。",
            "cta_btn": "立即免费排盘",
            "cta_url": "/#form-section",
        },
        "en": {
            "focus_intro": "Career choices are not only about interest. They are also about work style, growth pattern, risk tolerance, and real-world support. Bazi is useful when it helps you judge whether the underlying structure of a track matches your chart.",
            "focus": [
                "Start with natal structure and useful elements to see whether you fit stable-rule systems, deep technical work, or expressive market-facing work.",
                "Then read officer, resource, output, wealth, and peer patterns to judge exam platforms, specialist routes, or competitive market routes.",
                "Next, use decade luck and yearly timing to separate build phases, transition phases, and true expansion windows.",
                "Finally, bring education, city, family support, and cash flow into the reading so direction is grounded in reality.",
            ],
            "mistakes": [
                "Treating short-term anxiety like long-term destiny.",
                "Watching where other people make money without checking work-structure fit.",
                "Making a heavy commitment before running a low-cost test.",
            ],
            "steps": [
                "Check whether you are in an expansion, repair, or transition phase first.",
                "Run a low-risk validation next, such as a side project, short prep cycle, or trial role.",
                "Only after direction and timing align should you concentrate major resources.",
            ],
            "faq": [
                ("Can I still judge career direction without an exact birth hour?", "Yes. A three-pillar chart can already show broad work style and direction. The birth hour mainly sharpens timing and detail."),
                ("If the chart says a path fits, does that guarantee success?", "No. Bazi shows smoother directions and better timing windows. Execution still decides outcomes."),
                ("I already spent years in the wrong lane. Is it too late?", "Usually not. Many real turning points happen around major luck shifts. The key is separating a temporary setback from a long-term mismatch."),
            ],
            "cta_title": "Check the Timing Before You Make a Heavy Career Bet",
            "cta_desc": "If you are facing exams, a role switch, entrepreneurship, or a major career reset, start with the chart structure and current cycle first.",
            "cta_btn": "Start Free Chart",
            "cta_url": "/#form-section",
        },
    },
    "finance": {
        "zh": {
            "focus_intro": "财富问题往往不只是“会不会赚”，更常见的是钱来得稳不稳、留不留得住，以及当下能不能承受相应风险。",
            "focus": [
                "先看财星、财库与用神，判断你更适合积累型财富还是高波动型财富。",
                "再看比劫、伤官和破财信息，确认钱最容易从哪里漏掉。",
                "然后看大运流年，区分现在是守财期、扩张期还是修复现金流的阶段。",
                "最后结合负债、房贷、家庭责任和职业稳定度，判断现实能否承接这笔财务动作。",
            ],
            "mistakes": [
                "把别人的成功路径直接套到自己身上。",
                "看到短期机会就重仓，没有缓冲和退出预案。",
                "只看赚得快不快，不看留不留得住。",
            ],
            "steps": [
                "先明确目标是保现金流、稳资产还是提高收益。",
                "再设定投入边界、时间周期和可承受回撤。",
                "最后先轻仓验证，再决定是否加码。",
            ],
            "faq": [
                ("命理能看具体赚多少钱吗？", "更擅长看财富模式、阶段节奏和风险边界，具体数字还要结合行业、能力和现实选择。"),
                ("财运好就适合高风险操作吗？", "不一定。机会变多不等于可以无纪律冒险，仍要看命局结构与当下阶段。"),
                ("以前一直存不住钱，还有机会改变吗？", "有。很多人的守财能力会随着阶段变化、生活结构稳定和决策方式调整而明显变强。"),
            ],
            "cta_title": "先看清你的财富节奏，再决定要不要大动作",
            "cta_desc": "如果你正面临买房、投资、负债安排或大额支出，先排盘看守财与扩张窗口，会比凭情绪更稳。",
            "cta_btn": "立即免费排盘",
            "cta_url": "/#form-section",
        },
        "en": {
            "focus_intro": "Money questions are rarely only about earning. More often they are about whether income is stable, whether money stays, and whether current life can absorb the associated risk.",
            "focus": [
                "Start with wealth stars, wealth storage, and useful elements to see whether you fit accumulation or high-volatility wealth patterns.",
                "Then examine leakage signals to learn where money most easily escapes.",
                "Next, read decade luck and yearly timing to separate preservation, expansion, and cash-flow repair phases.",
                "Finally, combine the reading with debt, housing pressure, family duties, and job stability.",
            ],
            "mistakes": [
                "Copying someone else's wealth path without checking fit.",
                "Taking oversized positions in a short-term opportunity without a buffer.",
                "Watching only the speed of gain, not the ability to keep it.",
            ],
            "steps": [
                "Clarify whether the current goal is cash-flow protection, asset stability, or return growth.",
                "Set boundaries for position size, time horizon, and acceptable drawdown.",
                "Test lightly first and increase commitment only after evidence appears.",
            ],
            "faq": [
                ("Can Bazi show the exact amount of money I will make?", "It is better at showing wealth style, timing, and risk boundaries. Exact results still depend on work, skill, and decisions."),
                ("If wealth timing is good, does that mean high risk is fine?", "Not automatically. Better timing means more opportunity, not unlimited discipline-free risk."),
                ("If I have never been able to save, can that still change?", "Yes. Many people develop better retention once life stabilizes and decision habits improve."),
            ],
            "cta_title": "Read Your Wealth Rhythm Before Making a Big Move",
            "cta_desc": "If you are facing property, investing, debt structure, or a major purchase, it helps to see your preservation and expansion window first.",
            "cta_btn": "Start Free Chart",
            "cta_url": "/#form-section",
        },
    },
    "relationship": {
        "zh": {
            "focus_intro": "感情问题最怕只看有没有感觉。真正决定能不能走远的，往往是节奏、边界、冲突修复和现实安排是否能长期承受。",
            "focus": [
                "先看婚姻宫、桃花和配偶星，确认吸引力和长期结构是不是同向的。",
                "再看双方冲合与节奏，判断是互补促进还是长期互耗。",
                "然后看大运流年，区分推进窗口、观察窗口和高风险冲突窗口。",
                "最后把家庭边界、城市选择、金钱分工和未来规划放进来，避免只谈情绪不谈落地。",
            ],
            "mistakes": [
                "只看甜蜜和吸引力，不看长期相处成本。",
                "把外界催促和年纪焦虑，当成必须推进关系的理由。",
                "回避现实议题，觉得以后自然会解决。",
            ],
            "steps": [
                "先看当前是不是关系推进窗口。",
                "再把钱、家、城市、父母边界和未来计划谈清楚。",
                "最后观察冲突后能不能修复，而不是只看表面合不合。",
            ],
            "faq": [
                ("命理说有缘，就一定会顺利吗？", "不一定。有缘不等于不用经营，窗口只是更容易推进，关系质量仍然取决于现实互动与选择。"),
                ("合盘一般，是不是就不能继续？", "不等于不能继续。关键要看冲突类型是否可修复、现实成本是否可承受。"),
                ("没有对象也能先看感情问题吗？", "可以。单盘也能看关系模式、择偶偏好、感情窗口和常见消耗点。"),
            ],
            "cta_title": "先看清关系节奏和风险，再决定要不要推进",
            "cta_desc": "如果你在相亲、恋爱、结婚或婚后关系里反复犹豫，先看清节奏，再推进会更稳。",
            "cta_btn": "开始分析",
            "cta_url": "/hepan.html",
        },
        "en": {
            "focus_intro": "Relationship questions go wrong when people focus only on chemistry. Long-term outcomes usually depend on timing, boundaries, conflict repair, and whether real-life structure can hold.",
            "focus": [
                "Start with the relationship palace, romantic indicators, and spouse stars to see whether attraction and long-term structure point in the same direction.",
                "Then check interaction patterns to see whether the pair complements or drains each other.",
                "Next, separate progress windows from observation windows and high-conflict caution periods.",
                "Finally, bring family boundaries, city choice, money roles, and future plans into the reading.",
            ],
            "mistakes": [
                "Seeing sweetness and attraction while ignoring long-term relational cost.",
                "Treating outside pressure or age anxiety as proof that the relationship must move now.",
                "Avoiding real-life topics and assuming love will solve them later.",
            ],
            "steps": [
                "Check whether the current period truly supports relationship progress.",
                "Talk through money, home, city, parents, and future plans one by one.",
                "Watch whether conflict gets repaired or only frozen.",
            ],
            "faq": [
                ("If the chart says there is affinity, does that guarantee a smooth relationship?", "No. Timing may support progress, but relationship quality still depends on real interaction and choices."),
                ("If compatibility is average, does that mean we should stop?", "Not automatically. What matters is whether the conflict is repairable and the real-life cost is bearable."),
                ("Can I read relationship issues without a partner?", "Yes. A single chart can still show relational patterns, partner preference, timing windows, and common points of drain."),
            ],
            "cta_title": "Read the Relationship Rhythm Before You Push the Next Step",
            "cta_desc": "If you are hesitating around dating, commitment, marriage, or repair, start with the timing and structure first.",
            "cta_btn": "Start Compatibility",
            "cta_url": "/hepan.html",
        },
    },
}


def lp(lang: str) -> dict:
    if lang == "zh-Hant":
        out = {}
        for k, v in PACK["zh-Hans"].items():
            out[k] = cc.convert(v) if isinstance(v, str) else v
        out["lang"] = "zh-Hant"
        return out
    return PACK["zh-Hans" if lang == "zh-Hans" else "en"]


def cp(cat: str, lang: str) -> dict:
    if lang == "zh-Hant":
        src = CATEGORY[cat]["zh"]
        out = {}
        for k, v in src.items():
            if isinstance(v, str):
                out[k] = cc.convert(v)
            elif isinstance(v, list):
                if v and isinstance(v[0], tuple):
                    out[k] = [(cc.convert(item[0]), cc.convert(item[1])) for item in v]
                else:
                    out[k] = [cc.convert(item) for item in v]
            else:
                out[k] = v
        return out
    return CATEGORY[cat]["zh" if lang == "zh-Hans" else "en"]


def loc(lang: str, slug: str) -> str:
    return f"/blog/{slug}.html" if lang == "zh-Hans" else (f"/blog/zh-hant/{slug}.html" if lang == "zh-Hant" else f"/blog/en/{slug}.html")


def title_of(post: dict, lang: str) -> str:
    return post["title_zh"] if lang == "zh-Hans" else (cc.convert(post["title_zh"]) if lang == "zh-Hant" else post["title_en"])


def desc_of(post: dict, lang: str) -> str:
    return post["desc_zh"] if lang == "zh-Hans" else (cc.convert(post["desc_zh"]) if lang == "zh-Hant" else post["desc_en"])


def text_list(post: dict, key: str, lang: str) -> list[str]:
    source = post[f"{key}_{'zh' if lang != 'en' else 'en'}"]
    return [cc.convert(x) for x in source] if lang == "zh-Hant" else source


def text_val(post: dict, key: str, lang: str) -> str:
    source = post[f"{key}_{'zh' if lang != 'en' else 'en'}"]
    return cc.convert(source) if lang == "zh-Hant" else source


def read_minutes(raw: str) -> int:
    return max(6, min(12, math.ceil(len(raw) / 430)))


def lis(items: list[str], tag: str = "ul") -> str:
    inner = "\n".join(f"<li>{html.escape(x)}</li>" for x in items)
    return f"<{tag}>{inner}</{tag}>"


def faqs_html(faqs: list[tuple[str, str]]) -> str:
    return "\n".join(f'<div class="faq-item"><h3>{html.escape(q)}</h3><p>{html.escape(a)}</p></div>' for q, a in faqs)


def body(post: dict, lang: str) -> tuple[str, list[tuple[str, str]]]:
    l = lp(lang)
    c = cp(post["cat"], lang)
    query = text_val(post, "query", lang)
    hook = text_val(post, "hook", lang)
    decision = text_val(post, "decision", lang)
    scenes = text_list(post, "scenes", lang)
    fit = text_list(post, "fit", lang)
    risk = text_list(post, "risk", lang)
    intro1 = (
        f"搜索“{query}”的人，往往不是只想听一个简单结论，而是在面对真实成本：{decision}。{hook}"
        if lang != "en"
        else f"People searching about {query} are usually not looking for a simple yes-or-no answer. They are facing a real decision cost around {decision}. {hook}"
    )
    intro2 = (
        "命理真正有价值的地方，不是给你贴标签，而是把天赋结构、阶段节奏和现实约束放在一起看。"
        if lang != "en"
        else "The value of Bazi is not in giving you a label. It is in reading chart structure, timing rhythm, and real-life constraints together."
    )
    why = (
        "这类问题之所以反复让人犹豫，是因为你表面上在选一件事，实际上是在选未来几年要承担的生活方式、风险水平和情绪成本。只凭一时感觉，最容易在投入之后才发现真正不匹配的地方。"
        if lang != "en"
        else "Questions like this stay painful because you are not only choosing an option. You are choosing a lifestyle, a risk level, and an emotional cost structure for the next few years. Decisions made from mood alone often reveal the mismatch only after money and time are already committed."
    )
    close = (
        "好的命理判断，不是让你躲开所有风险，而是让你知道哪些风险值得承担、哪些阶段不该硬拼，把有限资源放到更有胜率的位置上。"
        if lang != "en"
        else "A useful reading does not remove all risk. It helps you choose which risks are worth carrying, which periods are not worth forcing, and where your limited resources have the highest probability of compounding."
    )
    content = f"""
<div class="article-body">
  <p>{html.escape(intro1)}</p>
  <p>{html.escape(intro2)}</p>
  <h2>{html.escape(l["who"])}</h2>
  {lis(scenes)}
  <h2>{html.escape(l["why"])}</h2>
  <p>{html.escape(why)}</p>
  <h2>{html.escape("命理上先看哪四个维度" if lang == "zh-Hans" else ("命理上先看哪四個維度" if lang == "zh-Hant" else "Four Bazi Angles to Check First"))}</h2>
  <p>{html.escape(c["focus_intro"])}</p>
  {lis(c["focus"])}
  <h2>{html.escape(l["fit"])}</h2>
  {lis(fit)}
  <h2>{html.escape(l["risk"])}</h2>
  {lis(risk)}
  <h2>{html.escape(l["mistake"])}</h2>
  {lis(c["mistakes"])}
  <h2>{html.escape(l["steps"])}</h2>
  {lis(c["steps"], "ol")}
  <p>{html.escape(close)}</p>
</div>
"""
    return content, c["faq"]


def related(post: dict) -> list[dict]:
    same = [x for x in POSTS if x["cat"] == post["cat"] and x["slug"] != post["slug"]]
    return (same[:3] if len(same) >= 3 else [x for x in POSTS if x["slug"] != post["slug"]][:3])


def render(post: dict, lang: str) -> str:
    l = lp(lang)
    c = cp(post["cat"], lang)
    title = title_of(post, lang)
    desc = desc_of(post, lang)
    slug = post["slug"]
    main, faqs = body(post, lang)
    related_html = "\n".join(f'<li><a href="{loc(lang, x["slug"])}">{html.escape(title_of(x, lang))}</a></li>' for x in related(post))
    read_min = read_minutes(re.sub(r"<[^>]+>", "", main))
    article_schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": desc,
        "datePublished": TODAY,
        "dateModified": TODAY,
        "author": {"@type": "Organization", "name": l["brand"]},
        "publisher": {"@type": "Organization", "name": l["brand"], "url": "https://www.tengyunzi.com"},
        "mainEntityOfPage": f"https://www.tengyunzi.com{loc(lang, slug)}",
    }
    faq_schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs],
    }
    return f"""<!DOCTYPE html>
<html lang="{l["lang"]}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{html.escape(title)} | {html.escape(l["brand"])}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.tengyunzi.com{loc(lang, slug)}">
<link rel="alternate" hreflang="zh-CN" href="https://www.tengyunzi.com{loc('zh-Hans', slug)}">
<link rel="alternate" hreflang="zh-Hant" href="https://www.tengyunzi.com{loc('zh-Hant', slug)}">
<link rel="alternate" hreflang="en" href="https://www.tengyunzi.com{loc('en', slug)}">
<meta property="og:type" content="article">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="https://www.tengyunzi.com{loc(lang, slug)}">
<script type="application/ld+json">{json.dumps(article_schema, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(faq_schema, ensure_ascii=False)}</script>
<style>
:root{{--navy:#0A2540;--blue:#2563eb;--line:#DCE4F0;--text:#1F2937;--muted:#667085;--bg:#fff;--soft:#F8FAFC}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;line-height:1.85}}
a{{color:var(--blue);text-decoration:none}}a:hover{{text-decoration:underline}}
.nav{{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid var(--line)}}
.nav-in{{max-width:980px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}}
.brand{{font-weight:700;color:var(--navy)}}.nav-links{{display:flex;gap:16px;align-items:center;flex-wrap:wrap}}.nav-links a{{color:#475467;font-size:.95rem}}
.lang{{height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px}}
.wrap{{max-width:920px;margin:0 auto;padding:28px 20px 64px}}.crumb{{font-size:.86rem;color:var(--muted);margin-bottom:14px}}
.badge{{display:inline-flex;padding:5px 10px;border-radius:999px;border:1px solid #bfd4ff;background:#eff6ff;color:#1d4ed8;font-size:.78rem;font-weight:600;margin-bottom:10px}}
h1{{font-size:2.15rem;line-height:1.42;color:var(--navy);margin:8px 0 14px}}h2{{font-size:1.28rem;color:var(--navy);margin:30px 0 12px;padding-left:12px;border-left:4px solid var(--blue)}}h3{{font-size:1rem;color:var(--navy);margin:0 0 6px}}
p{{margin:0 0 16px}}ul,ol{{margin:0 0 18px 22px;padding:0}}li{{margin-bottom:10px}}
.meta{{display:flex;flex-wrap:wrap;gap:12px;font-size:.88rem;color:var(--muted);padding-bottom:18px;border-bottom:1px solid var(--line);margin-bottom:24px}}
.faq{{margin-top:28px;padding:20px 22px;border:1px solid #D8E3FF;background:#FAFBFF;border-radius:14px}}.faq-item{{padding:12px 0;border-bottom:1px dashed #D7E0EF}}.faq-item:last-child{{border-bottom:none;padding-bottom:0}}
.cta{{margin-top:30px;background:#0A2540;color:#fff;border-radius:16px;padding:28px;text-align:center}}.cta p{{color:rgba(255,255,255,.84);max-width:720px;margin:10px auto 18px}}
.btn{{display:inline-block;padding:12px 24px;border-radius:10px;background:#2563eb;color:#fff;font-weight:700}}
.related{{margin-top:30px;padding-top:22px;border-top:1px solid var(--line)}}.related ul{{list-style:none;margin:0;padding:0}}.related li{{padding:8px 0;border-bottom:1px solid var(--line)}}
footer{{margin-top:38px;text-align:center;color:var(--muted);font-size:.86rem}}@media (max-width:760px){{h1{{font-size:1.72rem}}.nav-in{{flex-wrap:wrap}}}}
</style>
</head>
<body>
<nav class="nav"><div class="nav-in"><a class="brand" href="/index.html">{html.escape(l["brand"])}</a><div class="nav-links"><a href="/index.html">{html.escape(l["home"])}</a><a href="/hepan.html">{html.escape(l["hepan"])}</a><a href="/blog/">{html.escape(l["blog"])}</a><select id="lang-select" class="lang"><option value="zh-Hans"{' selected' if lang == 'zh-Hans' else ''}>{html.escape(l["lang_zh"])}</option><option value="zh-Hant"{' selected' if lang == 'zh-Hant' else ''}>{html.escape(l["lang_tw"])}</option><option value="en"{' selected' if lang == 'en' else ''}>{html.escape(l["lang_en"])}</option></select></div></div></nav>
<main class="wrap">
<div class="crumb">{html.escape(l["crumb"])}</div>
<span class="badge">{html.escape(l["badge"])}</span>
<h1>{html.escape(title)}</h1>
<div class="meta"><span>{html.escape(l["brand"])}</span><span>{html.escape(l["updated"])} {TODAY}</span><span>{html.escape(l["read"])} {read_min} {html.escape(l["mins"])}</span></div>
<p>{html.escape(desc)}</p>
{main}
<section class="faq"><h2>{html.escape(l["faq"])}</h2>{faqs_html(faqs)}</section>
<section class="cta"><h2 style="border-left:none;padding-left:0;color:#fff;margin-top:0">{html.escape(c["cta_title"])}</h2><p>{html.escape(c["cta_desc"])}</p><a class="btn" href="{post['cta_url'] if post['cta_url'] else c['cta_url']}">{html.escape(c["cta_btn"])}</a></section>
<section class="related"><h2>{html.escape(l["related"])}</h2><ul>{related_html}</ul></section>
<footer>{html.escape(l["footer"])}</footer>
</main>
<script>(()=>{{const map={{'zh-Hans':'{loc("zh-Hans", slug)}','zh-Hant':'{loc("zh-Hant", slug)}','en':'{loc("en", slug)}'}};const s=document.getElementById('lang-select');if(s){{s.addEventListener('change',()=>location.href=map[s.value]||map['zh-Hans']);}}}})();</script>
</body></html>"""


def add_entries(path: Path, entries: list[str]) -> int:
    if not path.exists():
        return 0
    raw = path.read_text(encoding="utf-8", errors="ignore")
    new = [x for x in entries if x not in raw]
    if new:
        path.write_text(raw.replace("</urlset>", "\n" + "\n".join(new) + "\n</urlset>"), encoding="utf-8")
    return len(new)


def update_index() -> None:
    if not INDEX_PATH.exists():
        return
    raw = INDEX_PATH.read_text(encoding="utf-8", errors="ignore")
    section = build_index_section()
    pattern = re.compile(r'<section class="seo-topic-section" id="seo-topics-202604">.*?</section>', re.S)
    raw = pattern.sub(section, raw) if pattern.search(raw) else raw.replace('<div class="grid">', section + '\n<div class="grid">', 1)
    if ".seo-topic-section{" not in raw:
        extra = """
.seo-topic-section{max-width:1100px;margin:36px auto 0;padding:0 24px}
.seo-topic-head{margin-bottom:18px}.seo-topic-title{font-family:var(--serif);font-size:1.55rem;color:var(--navy);margin:0}
.seo-topic-desc{color:var(--gray);font-size:.95rem;max-width:760px}.seo-topic-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
.seo-topic-card{border:1px solid var(--border);border-radius:14px;padding:20px;background:#fff;text-decoration:none;color:inherit;transition:.18s}
.seo-topic-card:hover{box-shadow:0 8px 24px rgba(15,23,42,.08);transform:translateY(-2px);text-decoration:none}
.seo-topic-card h3{font-size:1rem;color:var(--navy);margin:10px 0 8px;line-height:1.5}.seo-topic-card p{font-size:.86rem;color:var(--gray);margin:0}
.seo-topic-badge{display:inline-flex;padding:4px 8px;border-radius:999px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;font-size:.75rem;font-weight:600}
"""
        raw = raw.replace("</style>", extra + "\n</style>", 1)
    INDEX_PATH.write_text(raw, encoding="utf-8")


def build_index_section() -> str:
    l = PACK["zh-Hans"]
    cards = "\n".join(
        f'<a class="seo-topic-card" href="/blog/{p["slug"]}.html"><span class="seo-topic-badge">新专题</span><h3>{html.escape(p["title_zh"])}</h3><p>{html.escape(p["desc_zh"])}</p></a>'
        for p in POSTS
    )
    return f'<section class="seo-topic-section" id="seo-topics-202604"><div class="seo-topic-grid">{cards}</div></section>'


def main() -> None:
    BLOG.mkdir(parents=True, exist_ok=True)
    BLOG_TW.mkdir(parents=True, exist_ok=True)
    BLOG_EN.mkdir(parents=True, exist_ok=True)
    exists = {p.stem for p in BLOG.glob("*.html") if p.name != "index.html"}
    dup = exists.intersection({p["slug"] for p in POSTS})
    if dup:
        raise SystemExit(f"Duplicate blog slugs already exist: {sorted(dup)}")
    for p in POSTS:
        (BLOG / f'{p["slug"]}.html').write_text(render(p, "zh-Hans"), encoding="utf-8")
        (BLOG_TW / f'{p["slug"]}.html').write_text(render(p, "zh-Hant"), encoding="utf-8")
        (BLOG_EN / f'{p["slug"]}.html').write_text(render(p, "en"), encoding="utf-8")
    add_entries(SITEMAP, [f'  <url><loc>https://www.tengyunzi.com{loc(lang, p["slug"])}</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>{"0.78" if lang == "zh-Hans" else "0.66"}</priority></url>' for p in POSTS for lang in ("zh-Hans","zh-Hant","en")])
    add_entries(SITEMAP_PRIORITY, [f'  <url><loc>https://www.tengyunzi.com/blog/{p["slug"]}.html</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.83</priority></url>' for p in POSTS])
    update_index()
    print(f"generated={len(POSTS) * 3}")


if __name__ == "__main__":
    main()
