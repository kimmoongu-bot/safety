"""먹색 아이콘 배치 후보."""
from PIL import Image, ImageDraw
from hangul import draw_wordmark, SS

INK = (30, 35, 43)
WHITE = (255, 255, 255)
GOLD = (214, 168, 92)


def shackle(d, cx, top, outer_w, straight_h, thick, color):
    r = outer_w / 2 - thick / 2
    cy = top + thick / 2 + r
    d.arc([cx - r, cy - r, cx + r, cy + r], start=180, end=360, fill=color, width=int(round(thick)))
    for side in (-1, 1):
        x = cx + side * r
        d.line([(x, cy), (x, cy + straight_h)], fill=color, width=int(round(thick)))


def padlock(d, cx, top, w, h, color, bg, keyhole=True):
    """속이 찬 자물쇠. 열쇠구멍은 바탕색으로 뚫는다. 비율은 시안서를 참고했다."""
    body_top = top + h * 0.44
    d.rounded_rectangle([cx - w / 2, body_top, cx + w / 2, top + h], radius=w * 0.24, fill=color)
    # 고리는 가늘고 높게. 굵으면 자물쇠가 아니라 손가방으로 보인다.
    shackle(d, cx, top, w * 0.56, h * 0.24, w * 0.125, color)
    if keyhole:
        bh = top + h - body_top
        kcy = body_top + bh * 0.40
        r = w * 0.098
        d.ellipse([cx - r, kcy - r, cx + r, kcy + r], fill=bg)
        d.polygon([(cx - r * 0.58, kcy), (cx + r * 0.58, kcy),
                   (cx + r * 0.36, body_top + bh * 0.76), (cx - r * 0.36, body_top + bh * 0.76)], fill=bg)


def inside(size, bg, fg):
    """자물쇠 몸통 안에 잠김 (지금 것)."""
    S = size * SS
    img = Image.new("RGB", (S, S), bg)
    d = ImageDraw.Draw(img)
    bx0, bx1, btop, bbot = 0.115 * S, 0.885 * S, 0.465 * S, 0.905 * S
    shackle(d, S / 2, 0.075 * S, 0.40 * S, 0.26 * S, 0.10 * S, fg)
    d.rounded_rectangle([bx0, btop, bx1, bbot], radius=0.085 * S, fill=fg)
    w, h = bx1 - bx0, bbot - btop
    gap = 0.05 * w
    gw = (w * 0.84 - gap) / 2
    draw_wordmark(img, bx0 + (w - (2 * gw + gap)) / 2, btop + (h - gw) / 2, gw, gap, bg, stroke=0.135)
    return img.resize((size, size), Image.LANCZOS)


def stacked(size, bg, fg):
    """자물쇠 위, 잠김 아래 (시안서 배치)."""
    S = size * SS
    img = Image.new("RGB", (S, S), bg)
    d = ImageDraw.Draw(img)
    padlock(d, S / 2, 0.135 * S, 0.42 * S, 0.47 * S, fg, bg)
    gap = 0.038 * S
    gw = (0.56 * S - gap) / 2
    draw_wordmark(img, (S - (2 * gw + gap)) / 2, 0.695 * S, gw, gap, fg, stroke=0.14)
    return img.resize((size, size), Image.LANCZOS)


def round_tile(img, radius_ratio=0.225):
    """미리보기용. 폰이 아이콘 모서리를 어떻게 깎는지 보여 준다."""
    from PIL import ImageDraw as _D
    S = img.size[0] * 4
    big = img.resize((S, S), Image.LANCZOS)
    mask = Image.new("L", (S, S), 0)
    _D.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=255)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(big, (0, 0), mask)
    return out.resize(img.size, Image.LANCZOS)
