"""Verify compliance rewrite quality - check for cascading bugs."""
import os

public_dir = r'C:\Users\tgspc\bazi-app\public'
bad_patterns = ['文调整方向读', '传调整方向统', '生调整方向活', '环调整方向境',
                '趋势解读解读', '八字分析分析', '文传统化解读']

errors = []
for root, dirs, files in os.walk(public_dir):
    dirs[:] = [d for d in dirs if d not in ('en', 'zh-hant', 'downloads')]
    for f in files:
        if not f.endswith('.html'):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        for bp in bad_patterns:
            if bp in content:
                errors.append(f'{os.path.relpath(path, public_dir)}: contains "{bp}"')

if errors:
    for e in errors:
        print(f'  BAD: {e}')
else:
    print('No cascade errors found')

# Also check key terms are properly replaced
for check_path in ['index.html', 'hepan.html', 'result.html']:
    path = os.path.join(public_dir, check_path)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Extract title
    import re
    title_m = re.search(r'<title>(.*?)</title>', content)
    if title_m:
        print(f'  {check_path} title: {title_m.group(1)[:120]}')
    og_title = re.search(r'<meta property="og:title" content="(.*?)"', content)
    if og_title:
        print(f'  {check_path} og:title: {og_title.group(1)[:120]}')
