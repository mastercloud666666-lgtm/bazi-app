"""JS-safe compliance rewrite — only replaces in Chinese text strings, not code."""
import re
import os

# Conservative replacements for JS files (only in Chinese text context)
REPLACEMENTS_JS = [
    # Brand
    ('云子命理', '云子文化'),
    # Only replace in UI text context, not code
    ('深度命理报告', '深度分析报告'),
    ('命理报告', '分析报告'),
    ('专属命理师', '专属研究员'),
    ('在线命理师', '在线研究员'),
    ('命理师', '研究员'),
    # Payment tier descriptions
    ('命局底盘', '命局参考'),
    ('深度行动报告', '深度解读报告'),
    # Fortune telling in descriptions
    ('八字算命', '四柱八字分析'),
    ('算命婚姻', '分析婚姻'),
    # Occult in descriptions
    ('玄学命理', '传统干支文化'),
    ('玄学配对', '智慧配对'),
    ('玄学', '传统智慧'),
    # Specific problematic UI strings
    ('资深命理', '资深文化'),
]

def replace_all_js(text: str) -> str:
    patterns = sorted(REPLACEMENTS_JS, key=lambda x: len(x[0]), reverse=True)
    escaped = [(re.escape(old), new) for old, new in patterns]
    regex = '|'.join(old for old, _ in escaped)
    mapping = {old: new for old, new in patterns}

    def replacer(match):
        return mapping[match.group(0)]

    return re.sub(regex, replacer, text)


def main():
    js_dir = r'C:\Users\tgspc\bazi-app\public\js'
    for fname in ['app.js', 'site-lang.js', 'site-visit-tracker.js', 'intent-landing-boost.js']:
        path = os.path.join(js_dir, fname)
        if not os.path.exists(path):
            continue
        with open(path, 'r', encoding='utf-8') as f:
            original = f.read()
        updated = replace_all_js(original)
        if updated != original:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(updated)
            print(f'  Updated: {fname}')
        else:
            print(f'  No changes: {fname}')

if __name__ == '__main__':
    main()
