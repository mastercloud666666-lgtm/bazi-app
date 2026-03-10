"""
Homepage design mockup — 冥書儀象 (Arcane Script Apparatus)
Outputs: homepage_design.png  (1440×900 desktop mockup)
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import math

FONTS   = "C:/Users/tgspc/.claude/skills/canvas-design/canvas-fonts/"
ZH_BOLD = "C:/Windows/Fonts/msyhbd.ttc"
ZH_REG  = "C:/Windows/Fonts/msyh.ttc"
JURA    = FONTS + "Jura-Light.ttf"
MONO    = FONTS + "JetBrainsMono-Regular.ttf"
CRIMSON = FONTS + "CrimsonPro-Italic.ttf"
LORA    = FONTS + "Lora-Regular.ttf"

W, H    = 1440, 900
OUT     = "C:/Users/tgspc/bazi-app/docs/homepage_design.png"

# ── Palette ──────────────────────────────────────────────────────
BG         = (5,  7, 18)
PANEL      = (10, 14, 36)
CARD       = (15, 21, 50)
CARD2      = (18, 26, 60)
GOLD       = (198, 162, 68)
GOLD_DIM   = (130, 105, 40)
BLUE_DEEP  = (20,  82, 205)
BLUE_CORE  = (48, 117, 238)
BLUE_LIGHT = (147, 186, 251)
WHITE      = (248, 244, 228)
MUTED      = ( 80, 100, 155)
INK3       = (120, 143, 196)


# ── Helpers ──────────────────────────────────────────────────────
def mk(W, H, color=(0,0,0,0)):
    return Image.new("RGBA", (W, H), color)

def composite(base, layer):
    return Image.alpha_composite(base.convert("RGBA"), layer)

def tsize(font, text):
    bb = font.getbbox(text)
    return bb[2]-bb[0], bb[3]-bb[1]


# ── 1. Background: deep void + starfield ─────────────────────────
def make_bg():
    img = Image.new("RGBA", (W, H), (*BG, 255))
    arr = np.array(img)

    rng = np.random.default_rng(42)
    # scattered micro-stars
    for _ in range(900):
        px = rng.integers(490, W-20)
        py = rng.integers(0, H)
        b  = rng.integers(18, 85)
        arr[py, px, :3] = [b, b+8, b+22]
    # left panel faint stars
    for _ in range(120):
        px = rng.integers(10, 480)
        py = rng.integers(0, H)
        b  = rng.integers(8, 28)
        arr[py, px, :3] = [b, b+4, b+12]

    img = Image.fromarray(arr.astype(np.uint8))

    # Right-side nebula glow
    glow = mk(W, H)
    cx, cy = int(W*0.70), int(H*0.50)
    for r in range(480, 0, -6):
        t = 1 - r/480
        a = int(55 * t**2.2)
        c = (int(12+30*t), int(30+80*t), int(120+100*t), a)
        ImageDraw.Draw(glow).ellipse(
            [cx-r, cy-int(r*0.82), cx+r, cy+int(r*0.82)], fill=c)
    img = composite(img, glow)

    # subtle top vignette
    vig = mk(W, H)
    for y in range(120):
        a = int(60*(1-y/120))
        ImageDraw.Draw(vig).line([(0,y),(W,y)], fill=(0,0,0,a))
    img = composite(img, vig)

    return img


# ── 2. Left panel overlay ─────────────────────────────────────────
def draw_left_panel(img):
    panel_w = 490
    layer   = mk(W, H)

    # Panel background gradient
    arr = np.array(layer)
    for x in range(panel_w):
        t = x / panel_w
        a = int(210 * (1 - t**2.5))
        r = int(PANEL[0] + (CARD[0]-PANEL[0])*t)
        g = int(PANEL[1] + (CARD[1]-PANEL[1])*t)
        b = int(PANEL[2] + (CARD[2]-PANEL[2])*t)
        arr[:, x] = [r, g, b, a]
    layer = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    img   = composite(img, layer)

    # Divider line — gold gradient
    div = mk(W, H)
    dd  = ImageDraw.Draw(div)
    for y in range(H):
        t = math.sin(y/H * math.pi)
        a = int(90 * t)
        dd.line([(panel_w, y), (panel_w+1, y)], fill=(*GOLD_DIM, a))
    img = composite(img, div)
    return img


# ── 3. Mandala ────────────────────────────────────────────────────
def draw_mandala(img, cx, cy, R):
    layer = mk(W, H)

    rings = [
        (R,      (*BLUE_LIGHT, 30),  1.0),
        (R*0.88, (*BLUE_LIGHT, 50),  1.0),
        (R*0.75, (*BLUE_CORE,  60),  1.0),
        (R*0.62, (*BLUE_CORE,  75),  1.2),
        (R*0.50, (*BLUE_DEEP,  90),  1.0),
        (R*0.38, (*BLUE_DEEP,  110), 1.5),
        (R*0.27, (*GOLD_DIM,   120), 1.0),
        (R*0.18, (*GOLD,       160), 1.2),
    ]
    for r, c, sw in rings:
        ImageDraw.Draw(layer).ellipse(
            [cx-r, cy-r, cx+r, cy+r],
            outline=c, width=int(sw))

    # 24 spokes
    for i in range(24):
        a   = i * 15 * math.pi / 180
        col = (*BLUE_LIGHT, 35 if i%3 else 55)
        r0, r1 = R*0.185, R*0.98
        x0 = cx + math.cos(a)*r0; y0 = cy + math.sin(a)*r0
        x1 = cx + math.cos(a)*r1; y1 = cy + math.sin(a)*r1
        ImageDraw.Draw(layer).line([(x0,y0),(x1,y1)], fill=col, width=1)

    # tick ring
    for i in range(72):
        a       = i * 5 * math.pi / 180
        r1, r2  = (R*0.748, R*0.778) if i%6==0 else (R*0.750, R*0.770)
        a_val   = 160 if i%6==0 else 80
        c       = (*BLUE_LIGHT, a_val)
        x1 = cx+math.cos(a)*r1; y1 = cy+math.sin(a)*r1
        x2 = cx+math.cos(a)*r2; y2 = cy+math.sin(a)*r2
        ImageDraw.Draw(layer).line([(x1,y1),(x2,y2)], fill=c, width=1)

    # dot ring at 0.90R
    for i in range(24):
        a  = i * 15 * math.pi / 180
        px = cx + math.cos(a)*R*0.90
        py = cy + math.sin(a)*R*0.90
        r  = 3.5 if i%6==0 else 1.8
        c  = (*GOLD, 180) if i%6==0 else (*BLUE_LIGHT, 120)
        ImageDraw.Draw(layer).ellipse([px-r,py-r,px+r,py+r], fill=c)

    # Cardinal direction glows (N S E W)
    for angle_deg, label in [(270,'北'),(90,'南'),(0,'東'),(180,'西')]:
        a  = math.radians(angle_deg)
        px = cx + math.cos(a)*R*1.08
        py = cy + math.sin(a)*R*1.08
        # glow
        g2 = mk(W, H)
        for gr in range(18, 0, -3):
            ga = int(25*(1-gr/18))
            ImageDraw.Draw(g2).ellipse([px-gr,py-gr,px+gr,py+gr],
                                       fill=(*GOLD, ga))
        layer = composite(layer, g2.filter(ImageFilter.GaussianBlur(4)))

    # Render 天干 at r=0.80R
    try:
        font_zh_sm = ImageFont.truetype(ZH_REG, 13)
        tiangan = '甲乙丙丁戊己庚辛壬癸'
        for i, ch in enumerate(tiangan):
            a  = math.radians(i*36 - 90)
            px = cx + math.cos(a)*R*0.80
            py = cy + math.sin(a)*R*0.80
            bb = font_zh_sm.getbbox(ch)
            tx = px - (bb[2]-bb[0])/2
            ty = py - (bb[3]-bb[1])/2
            ImageDraw.Draw(layer).text((tx,ty), ch, font=font_zh_sm,
                                        fill=(*BLUE_DEEP, 140))
        # 地支 at r=0.56R
        dizhi = '子丑寅卯辰巳午未申酉戌亥'
        for i, ch in enumerate(dizhi):
            a  = math.radians(i*30 - 90)
            px = cx + math.cos(a)*R*0.56
            py = cy + math.sin(a)*R*0.56
            bb = font_zh_sm.getbbox(ch)
            tx = px - (bb[2]-bb[0])/2
            ty = py - (bb[3]-bb[1])/2
            ImageDraw.Draw(layer).text((tx,ty), ch, font=font_zh_sm,
                                        fill=(*BLUE_CORE, 160))
    except Exception:
        pass

    # Luoshu center grid
    NUMS  = [[4,9,2],[3,5,7],[8,1,6]]
    CHARS = [['四','九','二'],['三','五','七'],['八','一','六']]
    CELL, GAP = 22, 3
    try:
        fn = ImageFont.truetype(ZH_REG, 10)
        for r in range(3):
            for c in range(3):
                yang = NUMS[r][c]%2==1
                x = cx + (c-1)*(CELL+GAP) - CELL//2
                y = cy + (r-1)*(CELL+GAP) - CELL//2
                fc = (*BLUE_DEEP, 200) if yang else (*BLUE_CORE, 160)
                ImageDraw.Draw(layer).rectangle([x,y,x+CELL,y+CELL], fill=fc,
                                                outline=(*WHITE, 40), width=0)
                ch   = CHARS[r][c]
                bb   = fn.getbbox(ch)
                tw,th = bb[2]-bb[0], bb[3]-bb[1]
                tc = (*WHITE, 200) if yang else (*BLUE_LIGHT, 180)
                ImageDraw.Draw(layer).text(
                    (x+CELL//2-tw//2, y+CELL//2-th//2), ch, font=fn, fill=tc)
    except Exception:
        pass

    # Gold center glow
    for i in range(12, 0, -1):
        a_val = int(15*i)
        ImageDraw.Draw(layer).ellipse(
            [cx-i*3, cy-i*3, cx+i*3, cy+i*3], fill=(*GOLD, a_val))
    ImageDraw.Draw(layer).ellipse([cx-5, cy-5, cx+5, cy+5], fill=(*GOLD, 230))
    ImageDraw.Draw(layer).ellipse([cx-2, cy-2, cx+2, cy+2], fill=(*WHITE, 240))

    return composite(img, layer)


# ── 4. Left panel content ─────────────────────────────────────────
def draw_left_content(img):
    draw = ImageDraw.Draw(img)
    LEFT = 44

    # Navigation
    try:
        fn_nav = ImageFont.truetype(JURA, 12)
        nav_items = [('八字', True), ('合盘', False), ('起名', False),
                     ('占卜', False), ('风水', False)]
        nx = LEFT
        ny = 32
        for label, active in nav_items:
            tw, th = tsize(fn_nav, label)
            if active:
                draw.rectangle([nx-8, ny-5, nx+tw+8, ny+th+5],
                               fill=(*BLUE_DEEP, 40),
                               outline=(*BLUE_DEEP, 80), width=1)
                draw.text((nx, ny), label, font=fn_nav, fill=(*WHITE, 220))
            else:
                draw.text((nx, ny), label, font=fn_nav, fill=(*INK3, 160))
            nx += tw + 28

        # Right nav label
        fn_mono_sm = ImageFont.truetype(MONO, 10)
        rn_text = "2026 · 丙午年"
        try:
            fn_mono_sm2 = ImageFont.truetype(ZH_REG, 10)
            draw.text((440 - tsize(fn_mono_sm, rn_text)[0], 36),
                      "2026 · ", font=fn_mono_sm, fill=(*INK3, 80))
        except Exception:
            pass
    except Exception:
        pass

    # Brand
    try:
        fn_brand = ImageFont.truetype(ZH_REG, 38)
        fn_brand_en = ImageFont.truetype(JURA, 11)
        fn_italic = ImageFont.truetype(CRIMSON, 15)

        brand_y = 90
        brand_text = "天 機 命 理"
        tw, th = tsize(fn_brand, brand_text)

        # Subtle glow behind brand name
        g = mk(W, H)
        for off in range(12, 0, -3):
            a = int(18*(1-off/12))
            ImageDraw.Draw(g).text(
                (LEFT - off//2, brand_y - off//2),
                brand_text, font=fn_brand, fill=(*BLUE_LIGHT, a))
        img = composite(img, g.filter(ImageFilter.GaussianBlur(8)))
        draw = ImageDraw.Draw(img)

        draw.text((LEFT, brand_y), brand_text, font=fn_brand, fill=(*WHITE, 230))

        # Gold rule
        rule_y = brand_y + th + 10
        draw.rectangle([LEFT, rule_y, LEFT+220, rule_y+1], fill=(*GOLD, 180))
        # terminal dot
        draw.ellipse([LEFT+222, rule_y-2, LEFT+227, rule_y+3],
                     fill=(*GOLD, 200))

        # EN brand
        draw.text((LEFT, rule_y+8), "TIĀNJĪ MÍNGLǏ",
                  font=fn_brand_en, fill=(*INK3, 140))

        # Tagline
        tag_y = rule_y + 32
        fn_tag = ImageFont.truetype(ZH_REG, 13)
        draw.text((LEFT, tag_y), "以洛書測命　·　以星運定時",
                  font=fn_tag, fill=(*INK3, 170))

        # Italic quote
        draw.text((LEFT, tag_y+24),
                  "Still water holds the reflection of heaven",
                  font=fn_italic, fill=(*BLUE_LIGHT, 100))
        draw.text((LEFT, tag_y+42),
                  "without effort, without distortion.",
                  font=fn_italic, fill=(*BLUE_LIGHT, 70))

    except Exception as e:
        print("brand error:", e)

    # Form card
    card_y   = 225
    card_x   = LEFT - 6
    card_w   = 440
    card_h   = 560

    # Card background
    card_layer = mk(W, H)
    ImageDraw.Draw(card_layer).rounded_rectangle(
        [card_x, card_y, card_x+card_w, card_y+card_h],
        radius=14, fill=(*CARD2, 200),
        outline=(*BLUE_LIGHT, 28), width=1)
    img = composite(img, card_layer)
    draw = ImageDraw.Draw(img)

    # Top bar
    draw.rectangle([card_x, card_y, card_x+card_w, card_y+5],
                   fill=(*BLUE_DEEP, 220))
    draw.rectangle([card_x, card_y, card_x+card_w//2, card_y+5],
                   fill=(*BLUE_CORE, 220))

    # Section label
    try:
        fn_label = ImageFont.truetype(JURA, 10)
        fn_field = ImageFont.truetype(ZH_REG, 13)
        fn_input = ImageFont.truetype(ZH_REG, 14)

        label_y = card_y + 22
        draw.ellipse([card_x+16, label_y+3, card_x+23, label_y+10],
                     fill=(*BLUE_CORE, 200))
        draw.text((card_x+30, label_y), "填  写  生  辰",
                  font=fn_label, fill=(*BLUE_LIGHT, 180))
        # line after label
        draw.rectangle([card_x+130, label_y+6, card_x+card_w-20, label_y+7],
                       fill=(*BLUE_CORE, 40))

        FX = card_x + 20
        FW = card_w - 40

        # Calendar toggle
        tog_y = label_y + 26
        draw.rounded_rectangle([FX, tog_y, FX+130, tog_y+26],
                                radius=8, fill=(*BLUE_DEEP, 30),
                                outline=(*BLUE_LIGHT, 40), width=1)
        draw.rounded_rectangle([FX+2, tog_y+2, FX+64, tog_y+24],
                                radius=6,
                                fill=(*BLUE_DEEP, 200))
        draw.text((FX+16, tog_y+6), "阳历", font=fn_field, fill=(*WHITE, 220))
        draw.text((FX+80, tog_y+6), "农历", font=fn_field, fill=(*INK3, 140))

        # Year field
        def field_row(y, label, placeholder, w=FW):
            draw.text((FX, y), label, font=fn_label, fill=(*INK3, 130))
            fy = y + 16
            draw.rounded_rectangle([FX, fy, FX+w, fy+32],
                                    radius=7, fill=(*CARD, 200),
                                    outline=(*BLUE_LIGHT, 40), width=1)
            draw.text((FX+12, fy+8), placeholder, font=fn_input,
                      fill=(*MUTED, 140))
            return fy + 32 + 14

        def small_field(x, y, w, label, placeholder):
            draw.text((x, y), label, font=fn_label, fill=(*INK3, 130))
            fy = y + 16
            draw.rounded_rectangle([x, fy, x+w, fy+32],
                                    radius=7, fill=(*CARD, 200),
                                    outline=(*BLUE_LIGHT, 40), width=1)
            draw.text((x+10, fy+8), placeholder, font=fn_input,
                      fill=(*MUTED, 140))

        ry = tog_y + 38
        ry = field_row(ry, "出  生  年  份", "例：1990")

        # Month / Day / Hour row
        sw = (FW - 16) // 3
        small_field(FX,           ry, sw, "月", "— 月 —")
        small_field(FX+sw+8,      ry, sw, "日", "— 日 —")
        small_field(FX+sw*2+16,   ry, sw, "时  辰", "— 时 —")
        ry += 16 + 32 + 14

        # Gender
        draw.text((FX, ry), "性  别", font=fn_label, fill=(*INK3, 130))
        ry += 16
        draw.ellipse([FX, ry+4, FX+10, ry+14], fill=(*BLUE_CORE, 200))
        draw.ellipse([FX+2, ry+6, FX+8, ry+12], fill=(*WHITE, 220))
        draw.text((FX+16, ry), "男命", font=fn_input, fill=(*WHITE, 200))
        draw.ellipse([FX+70, ry+4, FX+80, ry+14],
                     outline=(*INK3, 100), width=1)
        draw.text((FX+86, ry), "女命", font=fn_input, fill=(*INK3, 140))
        ry += 32

        # Birthplace
        ry = field_row(ry, "出  生  地  · 可选，用于真太阳时校正",
                       "北京 / 上海 / 广州 / 纽约")

        # Submit button
        btn_y = ry + 4
        btn_layer = mk(W, H)
        ImageDraw.Draw(btn_layer).rounded_rectangle(
            [FX, btn_y, FX+FW, btn_y+44],
            radius=22,
            fill=(*BLUE_DEEP, 230))
        img = composite(img, btn_layer)
        draw = ImageDraw.Draw(img)
        # Button shine
        shine = mk(W, H)
        for sx in range(int(FW*0.35), int(FW*0.65)):
            t = abs(sx - FW*0.5) / (FW*0.15)
            sa = int(30 * max(0, 1-t))
            ImageDraw.Draw(shine).line(
                [(FX+sx, btn_y+2), (FX+sx, btn_y+20)],
                fill=(255,255,255,sa))
        img = composite(img, shine)
        draw = ImageDraw.Draw(img)

        fn_btn = ImageFont.truetype(ZH_REG, 15)
        btn_text = "排　盘　解　读"
        tw, th = tsize(fn_btn, btn_text)
        draw.text((FX + (FW-tw)//2, btn_y + (44-th)//2),
                  btn_text, font=fn_btn, fill=(*WHITE, 240))
        # Gold dot right
        draw.ellipse([FX+FW-20, btn_y+18, FX+FW-14, btn_y+24],
                     fill=(*GOLD, 200))

        # Feature row
        feat_y   = btn_y + 56
        feat_items = [('☯','格局'), ('✦','神煞'), ('◎','流年'),
                      ('⊕','财库'), ('⟐','感情')]
        feat_w   = FW // len(feat_items)
        draw.line([(FX, feat_y-6), (FX+FW, feat_y-6)],
                  fill=(*BLUE_LIGHT, 25))
        for i, (ico, lbl) in enumerate(feat_items):
            fx2 = FX + i*feat_w + feat_w//2
            draw.text((fx2-6, feat_y), ico, font=fn_label, fill=(*BLUE_CORE, 180))
            draw.text((fx2-10, feat_y+16), lbl, font=fn_label, fill=(*INK3, 120))
            if i < len(feat_items)-1:
                draw.line([(FX+feat_w*(i+1), feat_y+4),
                           (FX+feat_w*(i+1), feat_y+26)],
                          fill=(*BLUE_LIGHT, 20))

    except Exception as e:
        print("form error:", e)

    # Coord stamp
    try:
        fn_coord = ImageFont.truetype(MONO, 9)
        draw.text((LEFT, H-28), "39°54′N  116°23′E  ·  洛書坐標系  ·  JD 2461476",
                  font=fn_coord, fill=(*INK3, 55))
    except Exception:
        pass

    return img


# ── 5. Right panel HUD + signature ───────────────────────────────
def draw_right_hud(img):
    draw = ImageDraw.Draw(img)
    try:
        fn_hud  = ImageFont.truetype(MONO, 10)
        fn_zh   = ImageFont.truetype(ZH_REG, 10)
        fn_sig  = ImageFont.truetype(CRIMSON, 16)

        hx, hy = W-36, 44
        hud_lines = [
            ("COORD SYS · 洛書坐標", False),
            ("EPOCH     · 2026.03.08", False),
            ("MODE      · natal / 排盘", False),
            ("─────────────────────", True),
            ("年　丙　午  ·  fire horse", False),
            ("月　丁　卯  ·  fire rabbit", False),
            ("日　壬　子  ·  water rat", False),
            ("─────────────────────", True),
            ("十神 · 正財 偏官 印星", False),
        ]
        for line, is_rule in hud_lines:
            tw = tsize(fn_hud, line)[0]
            c = (*INK3, 55) if is_rule else (*INK3, 75)
            draw.text((hx-tw, hy), line, font=fn_hud, fill=c)
            hy += 15

        # Signature bottom right
        fn_sig_zh = ImageFont.truetype(ZH_REG, 18)
        sig_text  = "玄水靜鏡"
        tw_s = tsize(fn_sig_zh, sig_text)[0]
        sig_y = H - 60
        draw.text((W-36-tw_s, sig_y), sig_text, font=fn_sig_zh,
                  fill=(*BLUE_DEEP, 130))
        it_text = "Dark Water, Still Mirror"
        tw_i = tsize(fn_sig, it_text)[0]
        draw.text((W-36-tw_i, sig_y+24), it_text, font=fn_sig,
                  fill=(*INK3, 70))
        fn_sub = ImageFont.truetype(MONO, 9)
        sub_t  = "Celestial Cartography · 天機命理"
        tw_sub = tsize(fn_sub, sub_t)[0]
        draw.text((W-36-tw_sub, sig_y+44), sub_t, font=fn_sub,
                  fill=(*INK3, 45))

    except Exception as e:
        print("hud error:", e)
    return img


# ── 6. Grain ─────────────────────────────────────────────────────
def add_grain(img, intensity=3.5):
    arr = np.array(img.convert("RGB"), dtype=np.float32)
    rng = np.random.default_rng(99)
    arr = np.clip(arr + rng.normal(0, intensity, arr.shape), 0, 255)
    return Image.fromarray(arr.astype(np.uint8)).convert("RGBA")


# ── MAIN ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating homepage mockup...")

    img = make_bg()
    img = draw_left_panel(img)
    img = draw_mandala(img, int(W*0.695), int(H*0.508), 320)
    img = draw_left_content(img)
    img = draw_right_hud(img)
    img = add_grain(img)

    img.convert("RGB").save(OUT, "PNG")
    print(f"Saved: {OUT}")
