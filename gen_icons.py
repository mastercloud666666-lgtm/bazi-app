from PIL import Image, ImageDraw
import os

out_dir = r'C:\Users\tgspc\bazi-app\public\images'
os.makedirs(out_dir, exist_ok=True)

for size in [192, 512]:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    navy = (10, 37, 64, 255)
    m = size // 12
    draw.ellipse([m, m, size - m, size - m], fill=navy)
    cx, cy = size // 2, size // 2
    r = size // 7
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    path = os.path.join(out_dir, f'icon-{size}.png')
    img.save(path, 'PNG')
    print(f'OK: {path}')
