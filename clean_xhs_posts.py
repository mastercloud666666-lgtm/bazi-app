"""Apply compliance rewrite to all XHS posts — same rules as the website."""
import json, os, re

d = r'C:\Users\tgspc\bazi-app\xiaohongshu'

# Social media version — lighter touch than website ICP compliance
# "命理" is OK on 小红书, but "算命/改运/化解/风水/占卜" get flagged
REPLACEMENTS = [
    ('算命', '八字解读'),
    ('改运', '优化调整'),
    ('化解', '应对'),
    ('风水', '环境布局'),
    ('占卜', '参考分析'),
    ('预测', '提前看'),
    ('云子命理', '云子文化'),
    ('滕云子命理', '云子文化'),
    ('大师', '研究员'),
]

def clean_text(text: str) -> str:
    if not text:
        return text
    # Sort by length descending for atomic replacement
    patterns = sorted(REPLACEMENTS, key=lambda x: len(x[0]), reverse=True)
    escaped = [(re.escape(old), new) for old, new in patterns]
    regex = '|'.join(old for old, _ in escaped)
    mapping = {old: new for old, new in patterns}
    return re.sub(regex, lambda m: mapping[m.group(0)], text)

def clean_post(post: dict) -> dict:
    for key in ['title', 'body', 'tags', 'description']:
        if key in post and isinstance(post[key], str):
            post[key] = clean_text(post[key])
        elif key in post and isinstance(post[key], list):
            post[key] = [clean_text(t) if isinstance(t, str) else t for t in post[key]]
    return post

# Process all batches
total = 0
for fn in sorted(os.listdir(d)):
    if not fn.endswith('.json'):
        continue
    path = os.path.join(d, fn)
    with open(path, 'r', encoding='utf-8') as f:
        posts = json.load(f)

    cleaned = [clean_post(p) for p in posts]

    # Backup original
    bak = path + '.bak'
    if not os.path.exists(bak):
        os.rename(path, bak)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)
    total += len(cleaned)
    print(f'{fn}: {len(cleaned)} posts cleaned')

print(f'\n{total} total posts rewritten. Originals backed up as .bak files.')

# Show a sample
print('\n--- Sample before/after ---')
sample_bak = os.path.join(d, 'posts_batch1.json.bak')
if os.path.exists(sample_bak):
    with open(sample_bak, 'r', encoding='utf-8') as f:
        old = json.load(f)
    with open(os.path.join(d, 'posts_batch1.json'), 'r', encoding='utf-8') as f:
        new = json.load(f)
    if old and new:
        print(f'BEFORE: {old[0].get("title","")[:100]}')
        print(f'AFTER:  {new[0].get("title","")[:100]}')
