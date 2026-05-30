"""Add CTA section to blog pages that don't have one, and enhance weak CTAs."""
import os
import re

BLOG_DIR = r'C:\Users\tgspc\bazi-app\public\blog'

CTA_HTML = '''
<div class="cta-box" style="margin-top:32px;background:linear-gradient(135deg,#0A2540 0%,#1E3A5F 100%);color:#fff;padding:28px 24px;border-radius:12px;text-align:center;">
  <h3 style="margin-top:0;color:#fff;font-size:1.2rem;">你的八字里藏着什么？</h3>
  <p style="color:rgba(255,255,255,.85);margin-bottom:16px;font-size:.95rem;line-height:1.7;">
    免费排盘先看日主强弱和性格轮廓<br>完整版解锁24维深度分析：事业财运、感情婚姻、未来十年大运节奏
  </p>
  <a href="/index.html" style="display:inline-block;background:#0066CC;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:1rem;">免费排盘 →</a>
  <p style="margin-top:12px;font-size:.8rem;color:rgba(255,255,255,.6);">已有超过 10,000 人通过云子文化了解自己的人生走向</p>
</div>
'''

def has_strong_cta(content: str) -> bool:
    """Check if page already has a compelling CTA."""
    patterns = ['cta-box', '立即.*八字报告', '开始排盘', '解锁.*深度']
    return sum(1 for p in patterns if re.search(p, content)) >= 2

def add_cta(path: str):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if has_strong_cta(content):
        return False

    if '</body>' in content:
        content = content.replace('</body>', f'{CTA_HTML}\n</body>')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def main():
    updated = 0
    for fname in sorted(os.listdir(BLOG_DIR)):
        if not fname.endswith('.html'):
            continue
        path = os.path.join(BLOG_DIR, fname)
        if add_cta(path):
            updated += 1
            print(f'  +CTA: {fname}')

    print(f'\n{updated} files updated')

if __name__ == '__main__':
    main()
