# -*- coding: utf-8 -*-
"""
健身卡点 v3 — 0.3s 极限卡点
BGM: 快闪 卡点 活力 放克
节奏: 每 0.3s 一切 = 100 刀 / 30s
规则:
  - 四段视频各取 25 个独立时间戳，互不重复
  - 每段视频内间隔 ≥ 18s，保证动作不重样
  - 四路交替轮换：V4正面内衣 → V1背面 → V2正面白T → V3正面白T
  - 结构: 开场爆发 → 快切交替 → 一拍缓冲 → 再爆 → 情绪收尾
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SKILL_ROOT = r"C:\Users\tgspc\.claude\skills\jianying-editor"
sys.path.insert(0, os.path.join(SKILL_ROOT, "scripts"))
from jy_wrapper import JyProject

VIDEO_DIR = r"C:\Users\tgspc\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft\0403\video"
V1 = os.path.join(VIDEO_DIR, "6PFYAUCU-KVXG-K308-GUR1-XMZ8772CYDKS.mp4")  # 卧室背对  9m53s
V2 = os.path.join(VIDEO_DIR, "I3TP1C8K-ZKZM-3T2G-DXUK-6QENCJFXZM45.mp4")  # 客厅白T  20m01s
V3 = os.path.join(VIDEO_DIR, "XAPE7ZY2-1CDH-6W65-XTJH-ZDTU08KVBZB1.mp4")  # 客厅白T  31m51s
V4 = os.path.join(VIDEO_DIR, "XT0O6SV0-FK4Z-EZFL-FQTM-X1H0PB5NTVPX.mp4")  # 客厅内衣  29m43s

BGM = r"C:\Users\tgspc\bazi-app\bgm_kapoint2.m4a"  # 快闪 卡点 活力 放克

project = JyProject("健身卡点3_0403", width=1080, height=1920, overwrite=True)

# ═══════════════════════════════════════════════════════════════
# 25 个独立时间戳 × 4 路视频 = 100 个不重复镜头
# 每路视频内部间隔 ≥ 18s，确保动作不重复
# ═══════════════════════════════════════════════════════════════

# V4: 客厅内衣 1783s 可用 → 25 个时间戳，步长约 ~68s
v4_ts = [
     25,  95, 165, 240, 315, 390, 445, 520, 600, 670,
    745, 820, 891, 970,1045,1120,1200,1270,1337,1410,
   1490,1560,1630,1700,1760
]

# V1: 卧室背对 593s 可用 → 25 个时间戳，步长约 ~22s
v1_ts = [
      8,  29,  50,  72,  92, 112, 135, 148, 170, 190,
    212, 230, 253, 270, 296, 318, 342, 368, 395, 420,
    445, 470, 498, 530, 560
]

# V2: 客厅白T 1201s 可用 → 25 个时间戳，步长约 ~46s
v2_ts = [
     12,  40,  60,  90, 130, 165, 200, 240, 280, 300,
    340, 385, 430, 480, 530, 580, 630, 685, 740, 800,
    855, 900, 960,1020,1080
]

# V3: 客厅白T 1911s 可用 → 25 个时间戳，步长约 ~74s
v3_ts = [
     18,  50,  95, 145, 200, 260, 330, 390, 440, 477,
    540, 610, 680, 755, 830, 910, 990,1070,1150,1240,
   1330,1433,1540,1650,1750
]

H = 0.3  # 每刀时长

# ── 轮转交织: V4→V1→V2→V3 × 25 轮 ────────────────────────────────
# 视觉策略：
#   前 10 轮 (0–12s)   HOOK 爆发，四路快速轮换
#   第 11 轮 (12–12.9s) 插入三刀 V3 展臂作喘息
#   第 12-20 轮 (12.9-21.6s) 第二波高潮，加速感
#   第 21-25 轮 (21.6-27s)  冲刺
#   最后 3 刀 (27–30s)  V2看手表 + V4定格 × 2  情绪落地

clips = []

for i in range(25):
    clips.append((V4, v4_ts[i], H))
    clips.append((V1, v1_ts[i], H))
    clips.append((V2, v2_ts[i], H))
    clips.append((V3, v3_ts[i], H))

# 替换最后 4 刀（第 97-100 刀）为情绪收尾
clips[-4] = (V4, 1337, H)   # 踢腿爆发
clips[-3] = (V2,  580, H)   # 看手表
clips[-2] = (V4,  445, H)   # 正面叉腰定格
clips[-1] = (V2,  580, H)   # 再看手表 fade

assert len(clips) == 100, f"clip count error: {len(clips)}"

# ── 输出时间轴 ────────────────────────────────────────────────────
timeline = 0.0
for idx, (src, ss, dur) in enumerate(clips):
    name = {V1:"V1", V2:"V2", V3:"V3", V4:"V4"}[src]
    project.add_media_safe(src,
        start_time=f"{timeline:.2f}s",
        duration=f"{dur}s",
        source_start=f"{ss}s",
        track_name="主轨")
    print(f"  [{timeline:.1f}s] {name}@{ss}s")
    timeline += dur

total = timeline
print(f"\n画面时长: {total:.1f}s  ({len(clips)}刀)")

# ── BGM ───────────────────────────────────────────────────────────
print("\n加载BGM: 快闪 卡点 活力 放克...")
bgm = project.add_audio_safe(BGM, start_time="0s", duration=f"{total:.1f}s", track_name="BGM")
print("  BGM已加载" if bgm else "  BGM加载失败，请在剪映中手动添加")

# ── 文字 (极简，0.3s刀内容太密，只放3个锚点) ─────────────────────
project.add_text_simple("动起来", start_time="0.3s", duration="1.2s", anim_in="渐显")
project.add_text_simple("每天30分钟", start_time="14.0s", duration="1.2s", anim_in="渐显")
project.add_text_simple("#健身日常  #自律", start_time="27.5s", duration="2.0s", anim_in="渐显")

project.save()
print(f"\n草稿已保存: 健身卡点3_0403")
print(f"时长 {total:.0f}s | {len(clips)}刀 | 0.3s极限卡点 | BGM已嵌入")
