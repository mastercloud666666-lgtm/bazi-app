"""Atomic Chinese text replacement — prevents cascading sed bugs."""
import re
import os
import sys

# Order matters: longer/more-specific patterns first to avoid partial matches
REPLACEMENTS = [
    # Brand
    ('云子命理', '云子文化'),

    # Compound terms (longest first)
    ('免费八字算命', '免费四柱八字分析'),
    ('八字算命', '四柱八字分析'),
    ('免费八字', '免费四柱八字'),
    ('命理平台', '传统文化平台'),
    ('命理解读', '文化解读'),
    ('命理咨询', '文化咨询服务'),
    ('命理知识', '干支文化知识'),
    ('命理入门', '干支文化入门'),
    ('命理专题', '文化专题'),
    ('命理服务', '文化服务'),
    ('命理配对', '性格配对分析'),
    ('命理缘分', '性格缘分'),
    ('命理学', '传统干支研究'),
    ('资深命理师', '资深研究员'),
    ('命理师', '研究员'),
    ('命理', '传统文化'),

    # Occult/superstition terms
    ('玄学占卜', '传统智慧参考'),
    ('玄学配对', '智慧配对'),
    ('玄学体系', '传统智慧体系'),
    ('玄学', '传统智慧'),
    ('占卜', '参考分析'),
    ('算命', '八字分析'),

    # Fortune/prediction terms
    ('改运策略', '优化建议'),
    ('改运方法', '调整方向'),
    ('改运', '生活建议'),
    ('化解方法', '调整建议'),
    ('化解建议', '应对方法'),
    ('化解方案', '应对方案'),
    ('化解', '调整方向'),

    # Feng shui
    ('家居风水旺财', '家居环境优化'),
    ('家居风水', '家居环境布局'),
    ('风水堪舆', '环境堪舆'),
    ('风水布局', '环境布局'),
    ('风水指南', '环境优化指南'),
    ('风水', '环境布局'),

    # Prediction
    ('流年运势', '流年趋势'),
    ('运势分析', '趋势分析'),
    ('运势', '趋势'),
    ('预测', '趋势解读'),

    # Wealth/Marriage as predictive terms
    ('财运走势', '财务趋势'),
    ('财运分析', '财务分析'),
    ('财运类型', '财务特质'),
    ('财运专题', '财务分析专题'),
    ('婚姻预测', '感情分析'),
    ('婚姻分析', '感情分析'),

    # Other sensitive terms
    ('旺财', '优化财务'),
    ('邪法', '不当方式'),
    ('大师', '研究员'),
]

def replace_all(text: str) -> str:
    """Apply all replacements atomically in one pass per character position."""
    # Build a single regex that matches any pattern
    # Sort by length descending so longer patterns match first
    patterns = sorted(REPLACEMENTS, key=lambda x: len(x[0]), reverse=True)
    escaped = [(re.escape(old), new) for old, new in patterns]
    regex = '|'.join(old for old, _ in escaped)
    mapping = {old: new for old, new in patterns}

    def replacer(match):
        return mapping[match.group(0)]

    return re.sub(regex, replacer, text)


def process_file(path: str, dry_run: bool = False) -> tuple[int, str]:
    """Process one HTML file. Returns (change_count, preview_line)."""
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()

    updated = replace_all(original)

    if updated == original:
        return 0, ''

    if not dry_run:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated)

    # Find one changed line for preview
    for orig_line, upd_line in zip(original.split('\n'), updated.split('\n')):
        if orig_line != upd_line:
            return 1, upd_line.strip()[:120]
    return 1, ''


def main():
    public_dir = r'C:\Users\tgspc\bazi-app\public'
    dry_run = '--dry-run' in sys.argv

    total = 0
    changed_files = 0

    for root, dirs, files in os.walk(public_dir):
        # Skip i18n directories
        dirs[:] = [d for d in dirs if d not in ('en', 'zh-hant', 'downloads')]

        for fname in files:
            if not fname.endswith('.html'):
                continue
            path = os.path.join(root, fname)
            count, preview = process_file(path, dry_run)
            if count > 0:
                changed_files += 1
                total += count
                rel = os.path.relpath(path, public_dir)
                if preview:
                    print(f'  {rel}: {preview}')

    print(f'\n{dry_run and "[DRY RUN] " or ""}{changed_files} files changed')


if __name__ == '__main__':
    main()
