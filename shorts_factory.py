# -*- coding: utf-8 -*-
"""
YouTube Shorts 自动化视频工厂
全自动：生成内容 → 剪映合成 → 导出视频
每天 12 条生肖运势 Shorts，15-30 秒每条
"""

import sys, os, io, json, textwrap, uuid
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ── Config ──────────────────────────────────────────────────
SKILL_ROOT = r"C:\Users\tgspc\.claude\skills\jianying-editor"
sys.path.insert(0, os.path.join(SKILL_ROOT, "scripts"))
from jy_wrapper import JyProject

BGM_PATH = r"C:\Users\tgspc\bazi-app\bgm_kapoint.m4a"
OUTPUT_DIR = r"C:\Users\tgspc\bazi-app\output\shorts"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 12 生肖
ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

# 今日概览文案模板 — 每天换日期即可
def daily_overview_text(date_str: str) -> str:
    return f"{date_str} 十二生肖运势参考\n传统文化 · 仅供娱乐"

# 单生肖文案 — 调用 AI 生成（或使用模板）
def generate_zodiac_fortune(zodiac: str, date_str: str) -> dict:
    """
    返回 {zodiac, overall, career, love, lucky_color, lucky_number, advice}
    实际使用时可调用 DeepSeek API 生成
    """
    # 模板文案（演示用，实际部署替换为 AI 生成）
    fortunes = {
        '鼠': {'overall': '★★★☆☆', 'career': '稳中有升，适合复盘', 'love': '桃花隐现，多参加社交', 'lucky_color': '蓝色', 'lucky_number': '3', 'advice': '今天适合做计划而非行动'},
        '牛': {'overall': '★★★★☆', 'career': '贵人运强，大胆提案', 'love': '感情稳定，适合沟通', 'lucky_color': '绿色', 'lucky_number': '8', 'advice': '抓住上午的窗口期'},
        '虎': {'overall': '★★★★★', 'career': '能量爆棚，冲刺关键任务', 'love': '魅力四射，容易吸引注意', 'lucky_color': '红色', 'lucky_number': '1', 'advice': '不要过度消耗精力'},
        '兔': {'overall': '★★★☆☆', 'career': '按部就班，保持耐心', 'love': '容易怀旧，放下过去', 'lucky_color': '粉色', 'lucky_number': '6', 'advice': '适合整理和清理'},
        '龙': {'overall': '★★★★☆', 'career': '创意爆发，展示才华', 'love': '主动一点会有惊喜', 'lucky_color': '金色', 'lucky_number': '5', 'advice': '分享想法会得到支持'},
        '蛇': {'overall': '★★★☆☆', 'career': '需要专注，避免分心', 'love': '少说多听，避免争执', 'lucky_color': '紫色', 'lucky_number': '2', 'advice': '下午运势转好'},
        '马': {'overall': '★★☆☆☆', 'career': '容易冲动，三思后行', 'love': '避免翻旧账', 'lucky_color': '棕色', 'lucky_number': '7', 'advice': '今天适合低调行事'},
        '羊': {'overall': '★★★★☆', 'career': '合作运佳，团队协作', 'love': '温馨时刻，适合约会', 'lucky_color': '米色', 'lucky_number': '9', 'advice': '相信直觉'},
        '猴': {'overall': '★★★☆☆', 'career': '灵活应变，随机而动', 'love': '幽默感吸引异性', 'lucky_color': '橙色', 'lucky_number': '4', 'advice': '保持轻松心态'},
        '鸡': {'overall': '★★★★★', 'career': '精准高效，成绩显著', 'love': '认真对待每一段对话', 'lucky_color': '白色', 'lucky_number': '0', 'advice': '完美主义适度即可'},
        '狗': {'overall': '★★★☆☆', 'career': '忠诚可靠，稳步推进', 'love': '真诚是最好的策略', 'lucky_color': '黄色', 'lucky_number': '3', 'advice': '帮助他人也会帮到自己'},
        '猪': {'overall': '★★★★☆', 'career': '好运相伴，顺势而为', 'love': '享受当下，别想太多', 'lucky_color': '黑色', 'lucky_number': '6', 'advice': '放松心情享受生活'},
    }
    return fortunes.get(zodiac, fortunes['鼠'])


# ── Video Builder ───────────────────────────────────────────
def build_zodiac_shorts(zodiac: str, date_str: str, fortune: dict, output_name: str):
    """创建一条生肖运势 Shorts (1080x1920)"""
    project = JyProject(output_name, width=1080, height=1920, overwrite=True)

    # 1. 背景 — 纯色深色背景（用 Pillow 生成图片）
    bg_path = _make_gradient_bg(zodiac)
    project.add_media_safe(bg_path, start_time="0s", duration="18s", track_name="VideoTrack")

    # 2. BGM
    if os.path.exists(BGM_PATH):
        project.add_audio_safe(BGM_PATH, start_time="0s", duration="18s", track_name="AudioTrack")

    # 3. 片头 — 日期 + 生肖
    project.add_text_simple(
        text=f"{date_str} · 属{zodiac}运势",
        start_time="0.3s", duration="3.0s",
        font_size=13.0, color_rgb=(1, 1, 1),
        transform_y=-0.65,
        anim_in="复古打字机",
        track_name="TitleTrack",
    )

    # 4. 综合运势星级
    project.add_text_simple(
        text=f"综合运势 {fortune['overall']}",
        start_time="3.5s", duration="2.5s",
        font_size=16.0, color_rgb=(1, 0.84, 0),
        transform_y=-0.4,
        anim_in="轻微放大",
        track_name="TextTrack1",
    )

    # 5. 事业
    project.add_text_simple(
        text=f"事业：{fortune['career']}",
        start_time="6.3s", duration="2.5s",
        font_size=12.0, color_rgb=(1, 1, 1),
        transform_y=-0.15,
        anim_in="向右滑动",
        track_name="TextTrack2",
    )

    # 6. 感情
    project.add_text_simple(
        text=f"感情：{fortune['love']}",
        start_time="9.0s", duration="2.5s",
        font_size=12.0, color_rgb=(1, 1, 1),
        transform_y=0.1,
        anim_in="向左滑动",
        track_name="TextTrack3",
    )

    # 7. 幸运提示
    project.add_text_simple(
        text=f"幸运色：{fortune['lucky_color']}   幸运数字：{fortune['lucky_number']}",
        start_time="11.8s", duration="2.5s",
        font_size=11.0, color_rgb=(0.8, 0.9, 1),
        transform_y=0.35,
        anim_in="轻微放大",
        track_name="TextTrack4",
    )

    # 8. 今日建议
    project.add_text_simple(
        text=fortune['advice'],
        start_time="14.5s", duration="2.5s",
        font_size=10.0, color_rgb=(0.7, 0.7, 0.7),
        transform_y=0.6,
        anim_in="向上滑动",
        track_name="TextTrack5",
    )

    # 9. CTA — 引导到网站
    project.add_text_simple(
        text="想了解完整命盘？tengyunzi.com",
        start_time="16.0s", duration="2.0s",
        font_size=8.0, color_rgb=(0.5, 0.5, 0.5),
        transform_y=0.8,
        anim_in="淡入",
        track_name="CTATrack",
    )

    project.save()
    return project


def _make_gradient_bg(zodiac: str) -> str:
    """生成渐变色背景图 1080x1920"""
    from PIL import Image, ImageDraw
    path = os.path.join(OUTPUT_DIR, f"bg_{zodiac}.png")
    if os.path.exists(path):
        return path

    colors = {
        '鼠': ((10, 20, 50), (30, 40, 80)),
        '牛': ((20, 35, 30), (40, 60, 50)),
        '虎': ((50, 15, 10), (80, 30, 20)),
        '兔': ((40, 20, 40), (60, 40, 60)),
        '龙': ((30, 25, 10), (50, 45, 20)),
        '蛇': ((15, 25, 35), (25, 45, 55)),
        '马': ((35, 20, 15), (55, 40, 30)),
        '羊': ((25, 30, 20), (45, 50, 40)),
        '猴': ((30, 20, 25), (50, 40, 45)),
        '鸡': ((20, 20, 30), (40, 40, 50)),
        '狗': ((25, 20, 15), (45, 40, 30)),
        '猪': ((20, 15, 25), (35, 30, 45)),
    }
    top, bot = colors.get(zodiac, ((10, 20, 40), (30, 50, 80)))

    img = Image.new('RGB', (1080, 1920))
    draw = ImageDraw.Draw(img)
    for y in range(1920):
        r = int(top[0] + (bot[0] - top[0]) * y / 1920)
        g = int(top[1] + (bot[1] - top[1]) * y / 1920)
        b = int(top[2] + (bot[2] - top[2]) * y / 1920)
        draw.line([(0, y), (1080, y)], fill=(r, g, b))
    img.save(path)
    return path


# ── Batch Runner ────────────────────────────────────────────
def run_pipeline(date_str: str = None, zodiacs: list = None):
    """批量生成所有生肖视频"""
    if date_str is None:
        from datetime import date
        date_str = date.today().strftime("%Y-%m-%d")

    targets = zodiacs if zodiacs else ZODIAC
    results = []

    for z in targets:
        print(f"\n{'='*40}")
        print(f"Building: {date_str} 属{z}运势 Shorts")
        fortune = generate_zodiac_fortune(z, date_str)
        safe_date = date_str.replace('-', '')
        name = f"Shorts_{safe_date}_{z}"
        try:
            build_zodiac_shorts(z, date_str, fortune, name)
            results.append({'zodiac': z, 'status': 'OK', 'project': name})
        except Exception as e:
            print(f"FAILED {z}: {e}")
            results.append({'zodiac': z, 'status': 'FAILED', 'error': str(e)})

    # Save manifest
    manifest_path = os.path.join(OUTPUT_DIR, f"manifest_{safe_date}.json")
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    ok = sum(1 for r in results if r['status'] == 'OK')
    print(f"\n{'='*40}")
    print(f"Pipeline complete: {ok}/{len(results)} videos built.")
    print(f"Manifest: {manifest_path}")
    print(f"Open JianYing → find drafts starting with 'Shorts_{safe_date}_' → Export all.")
    return results


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--date', help='Date YYYY-MM-DD (default: today)')
    p.add_argument('--zodiac', help='Single zodiac to build (default: all 12)')
    p.add_argument('--single', action='store_true', help='Build only one zodiac')
    args = p.parse_args()

    zodiacs = [args.zodiac] if args.zodiac else None
    if args.single and not args.zodiac:
        from datetime import date
        today_idx = date.today().day % 12
        zodiacs = [ZODIAC[today_idx]]

    run_pipeline(args.date, zodiacs)
