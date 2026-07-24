# -*- coding: utf-8 -*-
"""AI content generator + daily scheduler for Shorts factory."""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DEEPSEEK_URL = os.environ.get('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1/chat/completions')
DEEPSEEK_KEY = os.environ.get('DEEPSEEK_API_KEY', '')

ZODIAC = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']

PROMPT_TEMPLATE = """你是传统文化研究员。今天是{date}。为属{zodiac}的人写今日运势（30字以内），格式：

综合：★☆☆☆☆到★★★★★（选一个）
事业：一句话（10字内）
感情：一句话（10字内）
幸运色：一个颜色
幸运数字：一位数
建议：一句话（15字内）

只输出以上6行，不要其他内容。"""

def ai_fortune(zodiac: str, date_str: str) -> dict:
    """Call DeepSeek to generate a zodiac fortune."""
    import urllib.request, urllib.error
    body = json.dumps({
        'model': 'deepseek-chat',
        'max_tokens': 200,
        'temperature': 0.9,
        'messages': [
            {'role': 'user', 'content': PROMPT_TEMPLATE.format(date=date_str, zodiac=zodiac)}
        ]
    }).encode()
    req = urllib.request.Request(DEEPSEEK_URL, body, {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {DEEPSEEK_KEY}'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        text = data['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f'  AI error for {zodiac}: {e}, using template')
        return None

    result = {}
    for line in text.split('\n'):
        line = line.strip()
        if '：' in line:
            k, v = line.split('：', 1)
            k = k.strip().replace('综合','overall').replace('事业','career').replace('感情','love').replace('幸运色','lucky_color').replace('幸运数字','lucky_number').replace('建议','advice')
            result[k] = v.strip()
    return result if len(result) >= 6 else None


def generate_all(date_str: str = None) -> dict:
    """Generate fortunes for all 12 zodiacs. Falls back to templates on AI failure."""
    if date_str is None:
        from datetime import date
        date_str = date.today().strftime('%Y-%m-%d')

    from shorts_factory import generate_zodiac_fortune as template_fortune

    all_data = {}
    for z in ZODIAC:
        ai = None
        if DEEPSEEK_KEY:
            ai = ai_fortune(z, date_str)
        if ai is None:
            ai = template_fortune(z, date_str)
        all_data[z] = ai
        print(f'  {z}: {ai.get("overall","?")} {ai.get("career","")}')

    path = os.path.join(os.path.dirname(__file__), 'output', 'shorts', f'fortunes_{date_str.replace("-","")}.json')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f'Saved: {path}')
    return all_data


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--date', help='YYYY-MM-DD')
    args = p.parse_args()
    generate_all(args.date)
