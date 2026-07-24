import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

d = r'C:\Users\tgspc\bazi-app\xiaohongshu'
total = 0
for fn in sorted(os.listdir(d)):
    if not fn.endswith('.json'):
        continue
    path = os.path.join(d, fn)
    with open(path, 'r', encoding='utf-8') as f:
        posts = json.load(f)
    total += len(posts)
    print(f'{fn}: {len(posts)} posts')
    for i, p in enumerate(posts[:1]):
        title = str(p.get('title', '')[:80])
        print(f'  sample: {title}')
print(f'\nTotal: {total} posts ready to publish')
