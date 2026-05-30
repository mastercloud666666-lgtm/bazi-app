"""Fix remaining issues in XHS posts: soft CTAs + remove hidden triggers."""
import json, os, re

d = r'C:\Users\tgspc\bazi-app\xiaohongshu'

for fn in sorted(os.listdir(d)):
    if not fn.endswith('.json') or fn.endswith('.bak'):
        continue
    path = os.path.join(d, fn)
    with open(path, 'r', encoding='utf-8') as f:
        posts = json.load(f)

    changed = 0
    for p in posts:
        body = p.get('body', '')
        title = p.get('title', '')
        tags = p.get('tags', [])

        # Fix remaining violations
        body = body.replace('风水', '环境布局')
        title = title.replace('风水', '环境布局')

        # Soften CTAs — 小红书 hates commercial-sounding CTAs
        # Replace aggressive CTAs with soft ones
        body = re.sub(r'🔮\s*想.*主页.*测算.*入口', '想了解自己的格局，可以看看主页', body)
        body = re.sub(r'🔮\s*想知道.*主页有.*测算', '想进一步了解，可以看看主页', body)
        body = re.sub(r'主页可以测.*👇', '对这方面好奇的话，可以多了解自己的命局', body)
        body = re.sub(r'🔮\s*主页.*免费.*测算', '想深入了解，可以看看主页', body)
        body = re.sub(r'🔮.*主页.*合盘.*测算', '想深入了解两人关系，可以看看主页的合盘分析', body)

        # Remove standalone "👇" which triggers commercial detection
        body = body.replace('👇', '')

        # Add soft disclaimer at end
        if '仅供' not in body and '参考' not in body[-50:]:
            body += '\n\n以上内容为传统文化分享，仅供参考。'

        # Fix tags
        tags = ['云子文化' if t == '云子命理' else t for t in tags]
        tags = ['传统智慧' if t == '玄学' else t for t in tags]

        p['body'] = body
        p['title'] = title
        p['tags'] = tags
        changed += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    print(f'{fn}: {changed} posts updated')

print('\nDone. Changes: softened CTAs, removed "👇", added disclaimer, fixed 风水, cleaned tags.')
