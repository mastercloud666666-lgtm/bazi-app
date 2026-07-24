# -*- coding: utf-8 -*-
"""
健身卡点 v4 — 0.2-0.4s 变速极限卡点 60秒
BGM: 快闪 卡点 活力 放克
节奏: 每轮 [0.3, 0.2, 0.4, 0.3] = 1.2s × 50轮 = 60.0s
规则:
  - 四路各50个独立时间戳，共200刀无重复
  - V1内部间隔≥11s，V2≥22s，V3≥37s，V4≥33s
  - 切割节奏 [0.3, 0.2, 0.4, 0.3] 制造加速/减速感
  - 轮转: V4正面内衣 → V1背面 → V2正面白T → V3正面白T
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SKILL_ROOT = r"C:\Users\tgspc\.claude\skills\jianying-editor"
sys.path.insert(0, os.path.join(SKILL_ROOT, "scripts"))
from jy_wrapper import JyProject

VIDEO_DIR = r"C:\Users\tgspc\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft\0403\video"
V1 = os.path.join(VIDEO_DIR, "6PFYAUCU-KVXG-K308-GUR1-XMZ8772CYDKS.mp4")  # 卧室背对  9m53s (593s)
V2 = os.path.join(VIDEO_DIR, "I3TP1C8K-ZKZM-3T2G-DXUK-6QENCJFXZM45.mp4")  # 客厅白T  20m01s (1201s)
V3 = os.path.join(VIDEO_DIR, "XAPE7ZY2-1CDH-6W65-XTJH-ZDTU08KVBZB1.mp4")  # 客厅白T  31m51s (1911s)
V4 = os.path.join(VIDEO_DIR, "XT0O6SV0-FK4Z-EZFL-FQTM-X1H0PB5NTVPX.mp4")  # 客厅内衣  29m43s (1783s)

BGM = r"C:\Users\tgspc\bazi-app\bgm_kapoint2.m4a"  # 快闪 卡点 活力 放克

project = JyProject("健身卡点4_0403", width=1080, height=1920, overwrite=True)

# ═══════════════════════════════════════════════════════════════
# 50个独立时间戳 × 4路视频 = 200刀，全程无重复动作
# V4步长≈34s  V1步长≈11s  V2步长≈23s  V3步长≈37s
# ═══════════════════════════════════════════════════════════════

# V4: 客厅内衣 1783s → 50个时间戳
v4_ts = [
     10,  44,  78, 112, 146, 180, 214, 248, 282, 316,
    350, 384, 418, 452, 486, 520, 554, 588, 622, 656,
    690, 724, 758, 792, 826, 860, 894, 928, 962, 996,
   1030,1064,1098,1132,1166,1200,1234,1268,1302,1336,
   1370,1404,1438,1472,1506,1540,1574,1608,1642,1676
]

# V1: 卧室背对 593s → 50个时间戳
v1_ts = [
      5,  16,  27,  38,  49,  60,  71,  82,  93, 104,
    115, 126, 137, 148, 159, 170, 181, 192, 203, 214,
    225, 236, 247, 258, 269, 280, 291, 302, 313, 324,
    335, 346, 357, 368, 379, 390, 401, 412, 423, 434,
    445, 456, 467, 478, 489, 500, 511, 522, 533, 545
]

# V2: 客厅白T 1201s → 50个时间戳
v2_ts = [
      8,  31,  54,  77, 100, 123, 146, 169, 192, 215,
    238, 261, 284, 307, 330, 353, 376, 399, 422, 445,
    468, 491, 514, 537, 560, 583, 606, 629, 652, 675,
    698, 721, 744, 767, 790, 813, 836, 859, 882, 905,
    928, 951, 974, 997,1020,1043,1066,1089,1112,1135
]

# V3: 客厅白T 1911s → 50个时间戳
v3_ts = [
     12,  49,  86, 123, 160, 197, 234, 271, 308, 345,
    382, 419, 456, 493, 530, 567, 604, 641, 678, 715,
    752, 789, 826, 863, 900, 937, 974,1011,1048,1085,
   1122,1159,1196,1233,1270,1307,1344,1381,1418,1455,
   1492,1529,1566,1603,1640,1677,1714,1751,1788,1825
]

# 每轮4刀 [V4, V1, V2, V3]，时长用整数微秒 [0.3, 0.2, 0.4, 0.3] = 1.2s
# 50轮 × 1200000us = 60000000us = 60.0s
# 用整数微秒传参，避免 safe_tim 浮点截断导致的偏移错误
ROUND_DURS_US = [300000, 200000, 400000, 300000]  # microseconds
VIDS = [V4, V1, V2, V3]
TS   = [v4_ts, v1_ts, v2_ts, v3_ts]

clips = []
for i in range(50):
    for j in range(4):
        clips.append((VIDS[j], TS[j][i], ROUND_DURS_US[j]))

assert len(clips) == 200, f"clip count error: {len(clips)}"
assert sum(d for _,_,d in clips) == 60_000_000, f"duration error: {sum(d for _,_,d in clips)}"

# ── 输出时间轴 ────────────────────────────────────────────────────
timeline_us = 0  # integer microseconds, no float drift
for idx, (src, ss, dur_us) in enumerate(clips):
    name = {V1:"V1", V2:"V2", V3:"V3", V4:"V4"}[src]
    project.add_media_safe(src,
        start_time=timeline_us,          # int → safe_tim returns as-is
        duration=dur_us,                 # int → safe_tim returns as-is
        source_start=ss * 1_000_000,     # int microseconds
        track_name="主轨")
    print(f"  [{timeline_us/1e6:.2f}s] {name}@{ss}s ({dur_us/1e6}s)")
    timeline_us += dur_us

total = timeline_us / 1_000_000  # convert to seconds for display/BGM
print(f"\n画面时长: {total:.1f}s  ({len(clips)}刀)")

# ── BGM ───────────────────────────────────────────────────────────
print("\n加载BGM: 快闪 卡点 活力 放克...")
bgm = project.add_audio_safe(BGM, start_time=0, duration=timeline_us, track_name="BGM")
print("  BGM已加载" if bgm else "  BGM加载失败，请在剪映中手动添加")

# ── 文字锚点 (60s有空间，放5个) ──────────────────────────────────
project.add_text_simple("动起来",             start_time=300000,    duration=1500000, anim_in="渐显")
project.add_text_simple("每天30分钟",          start_time=15000000,  duration=1500000, anim_in="渐显")
project.add_text_simple("坚持，就是变美的开始", start_time=30000000,  duration=2000000, anim_in="渐显")
project.add_text_simple("Day 1",              start_time=45000000,  duration=1500000, anim_in="渐显")
project.add_text_simple("#健身日常  #自律",    start_time=57500000,  duration=2000000, anim_in="渐显")

project.save()
print(f"\n草稿已保存: 健身卡点4_0403")
print(f"时长 {total:.0f}s | {len(clips)}刀 | 0.2-0.4s变速卡点 | BGM已嵌入")
