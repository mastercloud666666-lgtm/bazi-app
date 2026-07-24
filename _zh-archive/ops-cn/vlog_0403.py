# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
"""
减肥自律VLOG 剪辑脚本
素材: 剪映草稿0403（4段竖屏健身视频）
导演思路: Hook开场 → 决心 → 快切运动高光 → 看手表收尾 → 打卡文字
时长: 约45秒
"""
import os

SKILL_ROOT = r"C:\Users\tgspc\.claude\skills\jianying-editor"
sys.path.insert(0, os.path.join(SKILL_ROOT, "scripts"))
from jy_wrapper import JyProject

# ── 素材路径 ──────────────────────────────────────────────────────
VIDEO_DIR = r"C:\Users\tgspc\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft\0403\video"
V1 = os.path.join(VIDEO_DIR, "6PFYAUCU-KVXG-K308-GUR1-XMZ8772CYDKS.mp4")  # 卧室，背对，9m53s
V2 = os.path.join(VIDEO_DIR, "I3TP1C8K-ZKZM-3T2G-DXUK-6QENCJFXZM45.mp4")  # 客厅白T，20m01s
V3 = os.path.join(VIDEO_DIR, "XAPE7ZY2-1CDH-6W65-XTJH-ZDTU08KVBZB1.mp4")  # 客厅白T，31m51s
V4 = os.path.join(VIDEO_DIR, "XT0O6SV0-FK4Z-EZFL-FQTM-X1H0PB5NTVPX.mp4")  # 客厅内衣，29m43s

# ── 建项目（竖屏 9:16）────────────────────────────────────────────
project = JyProject("减肥VLOG_0403", width=1080, height=1920, overwrite=True)

# ═══════════════════════════════════════════════════════════════════
# 镜头序列（导演剪辑思路）
#
# [0-3s]   HOOK:  v4叉腰正面站立 — 先看结果，勾住观众
# [3-5s]   铺垫: v1背对减肥贴纸  — "今天你减肥了吗"背景入场
# [5-8s]   爆发: v1甩臂起跳      — 运动开始
# [8-10s]  快切: v2双臂上举跳    — 切换视角
# [10-12s] 快切: v3拳击动作      — 力量感
# [12-14s] 快切: v4单腿平衡      — 控制感
# [14-16s] 快切: v2高跳          — 节奏高点
# [16-19s] 呼吸: v3侧展双臂      — 慢一拍缓冲
# [19-22s] 收尾: v2看手表        — "运动完成"标志镜头
# [22-25s] 打卡: v1侧面看手机    — 真实打卡动作
# [25-28s] 身材: v4正面站立      — 最终形象帧
# ═══════════════════════════════════════════════════════════════════

clips = [
    # (source, source_start_s, duration_s, label)
    (V4,  445,  3.0,  "hook_正面叉腰"),
    (V1,    5,  2.0,  "背对贴纸"),
    (V1,   29,  3.0,  "甩臂起跳"),
    (V2,   60,  2.5,  "双臂上举跳"),
    (V3,   95,  2.5,  "拳击动作"),
    (V4,  891,  2.5,  "单腿平衡"),
    (V2,  300,  2.0,  "高跳快切"),
    (V3, 1433,  3.0,  "侧展双臂"),
    (V2,  580,  3.5,  "看手表收尾"),
    (V1,  580,  3.0,  "打卡看手机"),
    (V4, 1337,  3.0,  "踢腿拉伸_结尾"),
]

timeline_pos = 0.0
for src, ss, dur, label in clips:
    seg = project.add_media_safe(
        src,
        start_time=f"{timeline_pos:.2f}s",
        duration=f"{dur}s",
        source_start=f"{ss}s",
        track_name="主轨"
    )
    print(f"  ✓ [{timeline_pos:.1f}s] {label} ({dur}s from {ss}s)")
    timeline_pos += dur

total = timeline_pos
print(f"\n总时长: {total:.1f}s ({int(total//60)}分{int(total%60)}秒)")

# ═══════════════════════════════════════════════════════════════════
# 文字层
# ═══════════════════════════════════════════════════════════════════
texts = [
    # (start_s, duration_s, content, anim)
    (0.5,  2.5, "Day 1  开始了",        "向上滑动"),
    (8.0,  3.0, "🔥 燃脂进行中",        "渐显"),
    (19.0, 3.0, "✅ 今日打卡完成",       "弹跳"),
    (22.0, 3.0, "坚持，就是变美的开始", "渐显"),
    (total - 3, 2.5, "#减肥日记  #自律",  "向上滑动"),
]

for ts, dur, content, anim in texts:
    if ts < total:
        project.add_text_simple(content, start_time=f"{ts}s", duration=f"{dur}s", anim_in=anim)
        print(f"  ✓ 文字[{ts}s] {content}")

# ── 保存 ──────────────────────────────────────────────────────────
project.save()
print("\n草稿已保存：减肥VLOG_0403")
print("在剪映里打开该草稿，建议再加一首励志BGM（100-120BPM）")
