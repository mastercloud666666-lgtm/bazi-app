#!/usr/bin/env python3
"""
gen_xhs_posts.py — 小红书帖子批量生成脚本
滕云子命理 · tengyunzi.com

用法:
  python gen_xhs_posts.py               # 生成下一批帖子 (auto-detect ID)
  python gen_xhs_posts.py --batch 4     # 指定批次编号
  python gen_xhs_posts.py --count 20    # 指定生成数量
  python gen_xhs_posts.py --article hunyin-peipai  # 只生成指定文章的帖子
  python gen_xhs_posts.py --list        # 列出所有文章和已覆盖状态
  python gen_xhs_posts.py --stats       # 显示覆盖统计

输出: xiaohongshu/posts_batchN.json
"""

import json
import os
import glob
import argparse
import sys
from pathlib import Path

# ─────────────────────────────────────────────
# 配置
# ─────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
XHS_DIR = SCRIPT_DIR
BLOG_DIR = SCRIPT_DIR.parent / "public" / "blog"

# 所有已知博客文章 → (支柱类型, cta类型, 话题关键词)
ARTICLE_MAP = {
    # 知识科普 (支柱5)
    "bazi-rumen":            ("知识科普", "general", "八字入门"),
    "yongshen-xiji":         ("知识科普", "general", "用神喜忌"),
    "dayun-jiexi":           ("知识科普", "general", "大运解析"),
    "bazi-geju":             ("知识科普", "general", "八字格局"),
    "shensha-daquan":        ("知识科普", "general", "神煞大全"),
    "dizhi-xingchong":       ("知识科普", "general", "地支刑冲"),
    "rizhu-qiangru":         ("知识科普", "general", "日主强弱"),
    "kongwang-fenxi":        ("知识科普", "general", "空亡分析"),
    "bazi-zhun-bu-zhun":     ("知识科普", "general", "八字准不准"),
    "bazi-paipan-zenme-kan": ("知识科普", "general", "八字排盘"),
    "bazi-qiming":           ("知识科普", "general", "八字起名"),
    "ziwei-rumen":           ("知识科普", "general", "紫微入门"),
    "2026-liunian":          ("知识科普", "general", "2026流年"),
    "caiku-kaimu":           ("知识科普", "general", "财库开墓"),
    "fengshui-wangcai":      ("知识科普", "general", "风水旺财"),
    # 五行缺失系列
    "wuxing-que-jin":        ("知识科普", "general", "缺金"),
    "wuxing-que-mu":         ("知识科普", "general", "缺木"),
    "wuxing-que-shui":       ("知识科普", "general", "缺水"),
    "wuxing-que-huo":        ("知识科普", "general", "缺火"),
    "wuxing-que-tu":         ("知识科普", "general", "缺土"),

    # 困境解读 (支柱1)
    "shilian-zenmeban":      ("困境解读", "emotion", "失恋"),
    "shiye-bushun":          ("困境解读", "general", "事业不顺"),
    "caiyun-cha-zenmeban":   ("困境解读", "general", "财运差"),
    "jiaolv-yazhong":        ("困境解读", "general", "焦虑压力"),
    "jiating-maodun":        ("困境解读", "general", "家庭矛盾"),
    "rensheng-mimang":       ("困境解读", "general", "人生迷茫"),
    "shenti-zong-buhao":     ("困境解读", "general", "身体健康"),
    "zhongnian-weiji":       ("困境解读", "general", "中年危机"),
    "jiaolv-yazhong":        ("困境解读", "general", "焦虑压力"),
    "jiankang-wuxing":       ("困境解读", "general", "健康五行"),

    # 时机决策 (支柱2)
    "jinnian-shihe-huan-gongzuo":   ("时机决策", "general", "换工作"),
    "shangban-haishi-chuangye":      ("时机决策", "general", "上班创业"),
    "caiyun-shenme-shihou-qilai":   ("时机决策", "general", "财运时机"),
    "weilai-yinian-fanpan-jihui":   ("时机决策", "general", "翻盘机会"),
    "weilai-sannian-fengxian":      ("时机决策", "general", "未来风险"),
    "jinnian-shihe-jiehun":         ("时机决策", "emotion", "结婚时机"),
    "jinnian-shihe-lizhi":          ("时机决策", "general", "离职时机"),
    "shenme-shihou-shihe-huanchengshi": ("时机决策", "general", "换城市"),
    "shenme-shihou-shihe-maifang":  ("时机决策", "general", "买房时机"),
    "shenme-shihou-shihe-yaohaizi": ("时机决策", "general", "生育时机"),
    "hehuo-chuangye-fengxian":      ("时机决策", "general", "合伙风险"),

    # 信号清单 (支柱3)
    "zongshi-yudao-lantaohua":      ("信号清单", "emotion", "烂桃花"),
    "taisui-chongke":               ("信号清单", "general", "太岁冲克"),
    "po-cai-zenme-poju":            ("信号清单", "general", "破财"),
    # 生肖2026系列
    "shengxiao-2026-shu":  ("信号清单", "general", "属鼠2026"),
    "shengxiao-2026-niu":  ("信号清单", "general", "属牛2026"),
    "shengxiao-2026-hu":   ("信号清单", "general", "属虎2026"),
    "shengxiao-2026-tu":   ("信号清单", "general", "属兔2026"),
    "shengxiao-2026-long": ("信号清单", "general", "属龙2026"),
    "shengxiao-2026-she":  ("信号清单", "general", "属蛇2026"),
    "shengxiao-2026-ma":   ("信号清单", "general", "属马2026"),
    "shengxiao-2026-yang": ("信号清单", "general", "属羊2026"),
    "shengxiao-2026-hou":  ("信号清单", "general", "属猴2026"),
    "shengxiao-2026-ji":   ("信号清单", "general", "属鸡2026"),
    "shengxiao-2026-gou":  ("信号清单", "general", "属狗2026"),
    "shengxiao-2026-zhu":  ("信号清单", "general", "属猪2026"),

    # 感情类 (支柱4) — 最高互动
    "hunyin-weiji":                  ("感情类", "emotion", "婚姻危机"),
    "ganqing-wanhui":                ("感情类", "emotion", "感情挽回"),
    "ganqing-jixu-huanshi-zhisun":   ("感情类", "emotion", "感情止损"),
    "fuhe-you-meiyou-jihui":         ("感情类", "emotion", "复合机会"),
    "hepan-hunyin-wendingdu":        ("感情类", "emotion", "合盘婚姻"),
    "hepan-suanming":                ("感情类", "emotion", "合盘算命"),
    "nvming-hunyin":                 ("感情类", "emotion", "女命婚姻"),
    "nvming-taohua":                 ("感情类", "emotion", "女命桃花"),
    "nanming-wanhun":                ("感情类", "emotion", "男命晚婚"),
    "ganqing-taohua":                ("感情类", "emotion", "感情桃花"),
    "hunyin-peipai":                 ("感情类", "emotion", "婚姻配对"),
    "caiyun-fenxi":                  ("困境解读", "general", "财运分析"),
    "shiye-chuangye":                ("时机决策", "general", "事业创业"),
}

# 固定标签
FIXED_TAGS = ["八字命理", "命理解读", "云子命理"]

# 按支柱的轮换标签
PILLAR_TAGS = {
    "感情类":  ["感情运势", "八字合婚", "桃花运", "感情测算"],
    "时机决策": ["今年运势", "流年大运", "命理决策"],
    "信号清单": ["玄学", "命理", "生辰八字"],
    "困境解读": ["命理解读", "玄学", "生辰八字"],
    "知识科普": ["命理入门", "玄学", "生辰八字", "算命"],
}

# CTA 末尾文案
CTA_TEXT = {
    "emotion": "🔮 想知道你们的具体情况，主页合盘测算👇\n\n#八字命理 #命理解读 #云子命理",
    "general": "🔮 想知道你的具体情况，主页有免费测算入口👇\n\n#八字命理 #命理解读 #云子命理",
}


def load_all_posts():
    """加载所有已生成的帖子，返回 {source_article: post_id} 映射"""
    covered = {}
    for batch_file in sorted(glob.glob(str(XHS_DIR / "posts_batch*.json"))):
        try:
            with open(batch_file, encoding="utf-8") as f:
                posts = json.load(f)
            for post in posts:
                covered[post["source_article"]] = post["id"]
        except Exception as e:
            print(f"⚠️  跳过损坏文件 {batch_file}: {e}")
    return covered


def get_next_batch_number():
    """自动检测下一批次编号"""
    existing = glob.glob(str(XHS_DIR / "posts_batch*.json"))
    if not existing:
        return 1
    nums = []
    for f in existing:
        name = Path(f).stem  # posts_batch1
        try:
            nums.append(int(name.replace("posts_batch", "")))
        except ValueError:
            pass
    return max(nums) + 1 if nums else 1


def get_next_post_id():
    """自动检测下一个帖子编号"""
    covered = load_all_posts()
    if not covered:
        return 1
    max_id = 0
    for batch_file in sorted(glob.glob(str(XHS_DIR / "posts_batch*.json"))):
        try:
            with open(batch_file, encoding="utf-8") as f:
                posts = json.load(f)
            for post in posts:
                num = int(post["id"].replace("XHS", ""))
                max_id = max(max_id, num)
        except Exception:
            pass
    return max_id + 1


def build_tags(pillar, extra_topic):
    """构建标签列表"""
    tags = list(FIXED_TAGS)
    pillar_specific = PILLAR_TAGS.get(pillar, [])
    if extra_topic and extra_topic not in tags:
        tags.append(extra_topic)
    tags.extend(t for t in pillar_specific if t not in tags)
    return tags[:6]  # 小红书建议不超过6个标签


def make_stub_post(post_id, article_slug, pillar, cta_type, topic_keyword):
    """
    生成帖子存根（占位符）
    实际内容需要人工填写或接入 LLM API
    """
    tags = build_tags(pillar, topic_keyword)
    hashtag_str = " ".join(f"#{t}" for t in tags)

    # 根据支柱生成帖子结构模板
    if pillar == "困境解读":
        body_template = (
            f"【{topic_keyword}】这种情况你有没有经历过\n\n"
            "在命理里，这种情况通常有以下原因：\n\n"
            "• 原因1：[命理原因]\n"
            "• 原因2：[命理原因]\n"
            "• 转机信号：[具体描述]\n"
            "• 现在可以做的一件事：[可操作建议]\n\n"
            f"🔮 想知道你的具体情况，主页有免费测算入口\n\n{hashtag_str}"
        )
    elif pillar == "时机决策":
        body_template = (
            f"很多人问我：{topic_keyword}，到底什么时候合适？\n\n"
            "命理里，有3个信号可以判断：\n\n"
            "✅ 适合的信号：\n① [信号1]\n② [信号2]\n③ [信号3]\n\n"
            "❌ 不适合的信号：\n→ [信号1]\n→ [信号2]\n\n"
            f"🔮 主页测算你的时机\n\n{hashtag_str}"
        )
    elif pillar == "信号清单":
        body_template = (
            f"【{topic_keyword}】你中了几个？\n\n"
            "📍 5个命理信号：\n\n"
            "1️⃣ 信号一：[描述]\n"
            "2️⃣ 信号二：[描述]\n"
            "3️⃣ 信号三：[描述]\n"
            "4️⃣ 信号四：[描述]\n"
            "5️⃣ 信号五：[描述]\n\n"
            "中了3个以上：[说明]\n"
            "中了1-2个：[说明]\n"
            "0个：[说明]\n\n"
            f"评论区说说你中了几个👇\n\n{hashtag_str}"
        )
    elif pillar == "感情类":
        body_template = (
            f"如果你正在经历{topic_keyword}——\n\n"
            "在八字里，这种情况是可以判断的：\n\n"
            "🔍 [核心命理分析]\n\n"
            "✅ [积极信号]\n"
            "❌ [需要注意的信号]\n\n"
            "💡 [实用建议]\n\n"
            f"🔮 主页合盘分析\n\n{hashtag_str}"
        )
    else:  # 知识科普
        body_template = (
            f"什么是{topic_keyword}？\n\n"
            "很多人对这个概念有误解——\n\n"
            "📚 [概念解释]\n\n"
            "🔍 [常见情况1]\n"
            "🔍 [常见情况2]\n"
            "🔍 [常见情况3]\n\n"
            "💡 了解{topic_keyword}，可以帮你：\n"
            "→ [用处1]\n"
            "→ [用处2]\n\n"
            f"🔮 主页免费测算\n\n{hashtag_str}"
        )

    return {
        "id": f"XHS{post_id:03d}",
        "pillar": pillar,
        "source_article": article_slug,
        "title": f"【{topic_keyword}】命理里的{pillar}解读",
        "body": body_template,
        "tags": tags,
        "cta_type": cta_type,
        "image_prompt": f"{pillar}风格，{topic_keyword}主题，清晰卡片式排版",
        "_status": "STUB_NEEDS_EDITING",  # 标记为待编辑
    }


def cmd_list(args):
    """列出所有文章及覆盖状态"""
    covered = load_all_posts()
    print(f"\n{'='*60}")
    print(f"{'文章 slug':<40} {'支柱':<8} {'状态'}")
    print(f"{'='*60}")

    covered_count = 0
    for slug, (pillar, cta_type, keyword) in ARTICLE_MAP.items():
        status = f"✅ {covered[slug]}" if slug in covered else "⬜ 未生成"
        if slug in covered:
            covered_count += 1
        print(f"{slug:<40} {pillar:<8} {status}")

    print(f"\n总计: {len(ARTICLE_MAP)} 篇文章，已覆盖: {covered_count}，待生成: {len(ARTICLE_MAP) - covered_count}")


def cmd_stats(args):
    """显示覆盖统计"""
    covered = load_all_posts()

    by_pillar = {}
    for slug, (pillar, cta_type, keyword) in ARTICLE_MAP.items():
        if pillar not in by_pillar:
            by_pillar[pillar] = {"total": 0, "done": 0}
        by_pillar[pillar]["total"] += 1
        if slug in covered:
            by_pillar[pillar]["done"] += 1

    print(f"\n📊 小红书内容覆盖统计")
    print(f"{'='*40}")
    for pillar, counts in by_pillar.items():
        pct = int(counts["done"] / counts["total"] * 100)
        bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
        print(f"{pillar:<8} {bar} {counts['done']}/{counts['total']} ({pct}%)")

    total = len(ARTICLE_MAP)
    done = len(covered)
    print(f"\n总覆盖率: {done}/{total} ({int(done/total*100)}%)")

    # 批次文件统计
    batches = sorted(glob.glob(str(XHS_DIR / "posts_batch*.json")))
    print(f"\n已有批次文件: {len(batches)} 个")
    total_posts = 0
    for b in batches:
        try:
            with open(b, encoding="utf-8") as f:
                posts = json.load(f)
            total_posts += len(posts)
            print(f"  {Path(b).name}: {len(posts)} 篇帖子")
        except Exception:
            pass
    print(f"  合计: {total_posts} 篇帖子")


def cmd_generate(args):
    """生成新一批帖子（存根，需后续填充内容）"""
    covered = load_all_posts()

    # 确定目标文章
    if args.article:
        targets = [(args.article, ARTICLE_MAP[args.article])] if args.article in ARTICLE_MAP else []
        if not targets:
            print(f"❌ 未知文章: {args.article}")
            sys.exit(1)
    else:
        # 找出所有未覆盖的文章
        targets = [
            (slug, info)
            for slug, info in ARTICLE_MAP.items()
            if slug not in covered
        ]

    if not targets:
        print("✅ 所有文章已生成对应帖子！")
        return

    # 截取数量
    count = min(args.count, len(targets))
    targets = targets[:count]

    # 确定起始 ID 和批次编号
    start_id = get_next_post_id()
    batch_num = args.batch if args.batch else get_next_batch_number()

    output_file = XHS_DIR / f"posts_batch{batch_num}.json"

    posts = []
    for i, (slug, (pillar, cta_type, keyword)) in enumerate(targets):
        post_id = start_id + i
        post = make_stub_post(post_id, slug, pillar, cta_type, keyword)
        posts.append(post)
        print(f"  生成 XHS{post_id:03d}: [{pillar}] {slug} ({keyword})")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 生成完成: {output_file}")
    print(f"   共 {len(posts)} 篇存根帖子")
    print(f"   ⚠️  存根帖子标有 _status: 'STUB_NEEDS_EDITING'，请填充真实内容后删除此字段")


def main():
    parser = argparse.ArgumentParser(
        description="小红书帖子批量生成工具 · 滕云子命理"
    )
    subparsers = parser.add_subparsers()

    # list 命令
    p_list = subparsers.add_parser("list", help="列出所有文章及覆盖状态")
    p_list.set_defaults(func=cmd_list)

    # stats 命令
    p_stats = subparsers.add_parser("stats", help="显示覆盖统计")
    p_stats.set_defaults(func=cmd_stats)

    # generate 命令 (默认)
    p_gen = subparsers.add_parser("generate", help="生成新一批帖子存根")
    p_gen.add_argument("--batch", type=int, help="指定批次编号（默认自动递增）")
    p_gen.add_argument("--count", type=int, default=20, help="生成数量（默认20）")
    p_gen.add_argument("--article", type=str, help="只生成指定文章的帖子")
    p_gen.set_defaults(func=cmd_generate)

    # 兼容旧版: 直接运行不带子命令
    parser.add_argument("--list", action="store_true", help="列出所有文章覆盖状态")
    parser.add_argument("--stats", action="store_true", help="显示覆盖统计")
    parser.add_argument("--batch", type=int, help="指定批次编号")
    parser.add_argument("--count", type=int, default=20, help="生成数量（默认20）")
    parser.add_argument("--article", type=str, help="只生成指定文章")

    args = parser.parse_args()

    if hasattr(args, "func"):
        args.func(args)
    elif args.list:
        cmd_list(args)
    elif args.stats:
        cmd_stats(args)
    else:
        cmd_generate(args)


if __name__ == "__main__":
    main()
