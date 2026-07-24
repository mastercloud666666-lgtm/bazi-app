# -*- coding: utf-8 -*-
"""
爆款健身卡点短视频
BGM: Energy Electronic Sports Music (120BPM 约)
卡点节拍: 每1.5s/2.0s一剪，共约24s
镜头语言:
  - 开场用最强力量感帧HOOK住观众
  - 正面/背面交替切换制造视觉变化
  - 中间插一个慢拍"呼吸帧"再爆发
  - 收尾用看手表制造"完成感"情绪
  - 文字极简：一句话+标签
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

project = JyProject("健身卡点_0403", width=1080, height=1920, overwrite=True)

# ═══════════════════════════════════════════════════════════════
#  卡点镜头序列  |  120BPM → 每拍0.5s，每2拍=1.0s
#
#  镜头逻辑：
#  ① HOOK:   正面力量帧 (叉腰宽腿)  ← 停止滑动的第一帧
#  ② 变化:   切背影 (贴纸)           ← 视角打破期待
#  ③ 爆发组: 正-背-正 快切            ← 节奏感
#  ④ 呼吸:   慢动作展臂               ← 让眼睛休息一拍
#  ⑤ 再爆:   踢腿+拳击+跳跃           ← 第二波高潮
#  ⑥ 收尾:   看手表                   ← 情绪落地
#  ⑦ 定格:   正面站立 fade out        ← 记住这张脸
# ═══════════════════════════════════════════════════════════════

clips = [
    # (src, source_start_s, duration_s, 镜头说明)
    (V4, 445,   1.5,  "HOOK 叉腰正面"),       # 0.0
    (V1,  29,   1.5,  "切背影 甩臂"),          # 1.5  视角翻转
    (V2,  60,   1.5,  "正面 双臂跳"),          # 3.0
    (V3,  95,   1.0,  "拳击出拳"),             # 4.5  快
    (V4, 891,   1.5,  "单腿平衡 叉胸"),        # 5.5  控制感
    (V1, 296,   1.5,  "背对 头顶双手"),         # 7.0  切背
    (V2, 900,   1.5,  "正面 跳跃臂上举"),      # 8.5
    (V3, 477,   2.0,  "展臂 呼吸帧"),          # 10.0 慢拍缓冲
    (V4,1337,   1.5,  "踢腿 再爆"),            # 12.0 重启爆发
    (V1, 148,   1.0,  "背影 快切"),            # 13.5 快
    (V3,1433,   1.5,  "侧展双臂"),             # 14.5
    (V2, 300,   1.5,  "高跳 节奏高点"),        # 16.0 高潮
    (V4, 445,   1.0,  "正面回调"),             # 17.5 快
    (V2, 580,   3.0,  "看手表 完成感"),        # 18.5 慢收尾
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
print(f"\n画面时长: {total:.1f}s")

# ═══════════════════════════════════════════════════════════════
#  BGM: 激昂节奏 IntenseRhythm (107.9s, 动感)
#  JianYing music_id: 7491925146615302171
# ═══════════════════════════════════════════════════════════════
BGM_PATH = r"C:\Users\tgspc\bazi-app\bgm_kapoint.m4a"
print("\n加载BGM...")
bgm = project.add_audio_safe(
    BGM_PATH,
    start_time="0s",
    duration=f"{total:.1f}s",
    track_name="BGM"
)
if bgm:
    print("  BGM已加载: 激昂节奏 IntenseRhythm")
else:
    print("  BGM加载失败，请在剪映中手动添加音乐")

# ═══════════════════════════════════════════════════════════════
#  文字: 极简，不重叠
# ═══════════════════════════════════════════════════════════════
project.add_text_simple(
    "动起来",
    start_time="0.3s", duration="1.2s",
    anim_in="向上滑动"
)
project.add_text_simple(
    "每天30分钟",
    start_time=f"{total - 4.0:.1f}s", duration="2.0s",
    anim_in="渐显"
)
project.add_text_simple(
    "#健身日常  #自律",
    start_time=f"{total - 1.8:.1f}s", duration="1.5s",
    anim_in="向上滑动"
)

project.save()
print(f"\n草稿已保存: 健身卡点_0403")
print(f"时长 {total:.0f}s | BGM 已嵌入 | 打开剪映即可预览")
