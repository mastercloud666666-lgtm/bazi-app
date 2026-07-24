# -*- coding: utf-8 -*-
"""
健身卡点 v2 — 0.5s 极速卡点
BGM: 快闪 卡点 活力 放克 (120BPM 放克律动)
节奏: 每 0.5s 一切 = 每拍一剪 (120BPM)，共 40 刀 / 20s
镜头逻辑:
  - 4 段视频循环交替，正面/背面/侧面不断变换打破视觉疲劳
  - 分 4 波：HOOK爆发 → 第二波冲击 → 一拍呼吸 → 再爆 → 定格收尾
  - 最后 1s 留给看手表 + 正面定格，制造"完成感"情绪落点
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SKILL_ROOT = r"C:\Users\tgspc\.claude\skills\jianying-editor"
sys.path.insert(0, os.path.join(SKILL_ROOT, "scripts"))
from jy_wrapper import JyProject

VIDEO_DIR = r"C:\Users\tgspc\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft\0403\video"
V1 = os.path.join(VIDEO_DIR, "6PFYAUCU-KVXG-K308-GUR1-XMZ8772CYDKS.mp4")  # 卧室背对
V2 = os.path.join(VIDEO_DIR, "I3TP1C8K-ZKZM-3T2G-DXUK-6QENCJFXZM45.mp4")  # 客厅正面白T
V3 = os.path.join(VIDEO_DIR, "XAPE7ZY2-1CDH-6W65-XTJH-ZDTU08KVBZB1.mp4")  # 客厅正面白T
V4 = os.path.join(VIDEO_DIR, "XT0O6SV0-FK4Z-EZFL-FQTM-X1H0PB5NTVPX.mp4")  # 客厅正面内衣

BGM = r"C:\Users\tgspc\bazi-app\bgm_kapoint2.m4a"  # 快闪 卡点 活力 放克 (107s)

project = JyProject("健身卡点2_0403", width=1080, height=1920, overwrite=True)

# ═══════════════════════════════════════════════════════════════
#  卡点序列  |  120BPM → 0.5s/拍 → 40 刀 = 20s
#
#  视角轮换策略: V4正面 → V1背面 → V2正面 → V3正面 → 循环
#  动作分布:
#    波次1 (0–5s):   HOOK开场 + 力量感爆发
#    波次2 (5–10s):  视角高密度切换
#    喘息 (10–11s):  两刀略长各0.5s但内容舒展
#    波次3 (11–17s): 第二高潮，踢腿/跳跃循环
#    收尾 (17–20s):  强力收束 → 看手表 → 定格
# ═══════════════════════════════════════════════════════════════

H = 0.5  # 基础切点时长

clips = [
    # ── 波次1: HOOK 爆发 (0–5s, 10刀) ───────────────────────────
    (V4,  445, H, "HOOK 叉腰正面"),      # 0.0  先看结果
    (V1,   29, H, "切背影甩臂"),          # 0.5  视角翻转
    (V2,   60, H, "正面双臂跳"),          # 1.0
    (V3,   95, H, "拳击出拳"),            # 1.5
    (V4,  891, H, "单腿平衡"),            # 2.0  控制感
    (V1,  148, H, "背影快切"),            # 2.5
    (V2,  300, H, "高跳"),                # 3.0
    (V4, 1337, H, "踢腿"),                # 3.5
    (V3,  477, H, "展臂"),                # 4.0
    (V1,  296, H, "背对 头顶双手"),       # 4.5

    # ── 波次2: 高密度切换 (5–10s, 10刀) ─────────────────────────
    (V2,  900, H, "跳跃臂上举"),          # 5.0
    (V4,  445, H, "叉腰正面"),            # 5.5
    (V3, 1433, H, "侧展双臂"),            # 6.0
    (V1,   29, H, "甩臂"),                # 6.5
    (V2,   60, H, "双臂跳"),              # 7.0
    (V4,  891, H, "控制平衡"),            # 7.5
    (V1,  148, H, "背影"),                # 8.0
    (V3,   95, H, "出拳2"),               # 8.5
    (V2,  300, H, "高跳2"),               # 9.0
    (V4, 1337, H, "踢腿2"),               # 9.5

    # ── 一拍喘息 (10–11s, 2刀) ───────────────────────────────────
    (V3,  477, H, "展臂-呼吸"),           # 10.0 视觉松弛
    (V2,  580, H, "手表预览"),            # 10.5 伏笔

    # ── 波次3: 第二高潮 (11–17s, 12刀) ──────────────────────────
    (V1,   29, H, "甩臂再启"),            # 11.0
    (V4,  445, H, "正面"),                # 11.5
    (V3, 1433, H, "侧展"),                # 12.0
    (V4,  891, H, "平衡"),                # 12.5
    (V1,  296, H, "背对"),                # 13.0
    (V2,  900, H, "跳跃"),                # 13.5
    (V3,   95, H, "拳击"),                # 14.0
    (V4, 1337, H, "踢腿再爆"),            # 14.5
    (V1,  148, H, "背影"),                # 15.0
    (V2,  300, H, "高跳3"),               # 15.5
    (V4,  445, H, "正面"),                # 16.0
    (V3,  477, H, "展臂"),                # 16.5

    # ── 收尾冲刺 (17–19s, 4刀) ───────────────────────────────────
    (V1,   29, H, "甩臂冲刺"),            # 17.0
    (V2,  900, H, "跳跃冲刺"),            # 17.5
    (V4, 1337, H, "踢腿最高潮"),          # 18.0
    (V3, 1433, H, "侧展高点"),            # 18.5

    # ── 情绪落地 (19–20s, 2刀) ───────────────────────────────────
    (V2,  580, H, "看手表 完成感"),        # 19.0  情绪锚点
    (V4,  445, H, "正面定格"),             # 19.5  记住这张脸
]

timeline = 0.0
for src, ss, dur, label in clips:
    project.add_media_safe(src,
        start_time=f"{timeline:.2f}s",
        duration=f"{dur}s",
        source_start=f"{ss}s",
        track_name="主轨")
    print(f"  [{timeline:.1f}s +{dur}s]  {label}")
    timeline += dur

total = timeline
print(f"\n画面时长: {total:.1f}s  ({len(clips)}刀)")

# ── BGM ──────────────────────────────────────────────────────────
print("\n加载BGM: 快闪 卡点 活力 放克...")
bgm = project.add_audio_safe(BGM, start_time="0s", duration=f"{total:.1f}s", track_name="BGM")
print("  BGM已加载" if bgm else "  BGM加载失败，请在剪映中手动添加")

# ── 文字 (极简) ───────────────────────────────────────────────────
project.add_text_simple("动起来", start_time="0.3s", duration="0.8s", anim_in="向上滑动")
project.add_text_simple("每天30分钟", start_time="10.0s", duration="0.8s", anim_in="渐显")
project.add_text_simple("#健身日常  #自律", start_time="19.0s", duration="0.8s", anim_in="向上滑动")

project.save()
print(f"\n草稿已保存: 健身卡点2_0403")
print(f"时长 {total:.0f}s | {len(clips)}刀 | 0.5s极速卡点 | BGM已嵌入")
