"""
앱에 들어가는 아이콘 파일을 만든다.

    pip install Pillow
    python3 tools/logo/make_assets.py

색과 배치는 정해진 것이다 — 먹색 바탕, 흰 자물쇠, 자물쇠 위 · 잠김 아래.
바꾸려면 layouts.py 의 값을 고치고 이 스크립트를 다시 돌린다.

좌표를 눈대중으로 잡지 않는다. 그림을 투명 바탕에 한 번 그린 뒤 실제로 잉크가
닿은 사각형을 재서, 그 사각형을 원하는 자리에 맞춘다. 눈대중으로 잡았다가
적응형 아이콘이 콩알만 해지고 알림 아이콘이 잘린 적이 있다.
"""
import os
from PIL import Image, ImageDraw
from layouts import stacked, padlock, INK, WHITE
from hangul import draw_wordmark, SS

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
ASSETS = os.path.join(ROOT, "assets")
STORE = os.path.join(ROOT, "docs", "store")


def fit(draw_fn, canvas, occupy):
    """
    draw_fn(img) 이 그린 그림을 canvas 크기 안에서 occupy 비율로 키워 가운데 놓는다.
    occupy 는 '그림이 차지할 변의 비율'이다.
    """
    work = canvas * SS
    scratch = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    draw_fn(scratch)
    box = scratch.getbbox()
    if box is None:
        raise ValueError("아무것도 그리지 않았다")
    art = scratch.crop(box)
    target = int(work * occupy)
    scale = min(target / art.width, target / art.height)
    art = art.resize((max(1, int(art.width * scale)), max(1, int(art.height * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    out.paste(art, ((work - art.width) // 2, (work - art.height) // 2), art)
    return out.resize((canvas, canvas), Image.LANCZOS)


def _lock_and_word(img, fg, hole_bg, keyhole=True):
    S = img.size[0]
    d = ImageDraw.Draw(img)
    padlock(d, S / 2, 0.135 * S, 0.42 * S, 0.47 * S, fg, hole_bg, keyhole=keyhole)
    gap = 0.038 * S
    gw = (0.56 * S - gap) / 2
    draw_wordmark(img, (S - (2 * gw + gap)) / 2, 0.695 * S, gw, gap, fg, stroke=0.14)


def adaptive_foreground(size=1024):
    """
    안드로이드 적응형 아이콘의 '앞면'.

    폰마다 아이콘을 동그라미·네모·물방울로 제 맘대로 깎는다. 바깥쪽은 잘려 나갈 수
    있어서 가운데 66% 안에만 그림을 둔다. 여기서는 62% 로 조금 더 여유를 뒀다.
    바탕은 app.json 이 색으로 깐다.
    """
    # 열쇠구멍은 바탕이 투명이므로 뚫어도 보이지 않는다. 대신 먹색으로 채워 넣는다.
    return fit(lambda im: _lock_and_word(im, WHITE, INK), size, 0.62)


def notification_icon(size=192):
    """
    안드로이드 알림줄 아이콘. 흰 실루엣 + 투명 배경만 쓸 수 있고, 색은 OS 가 입힌다.
    이 크기에서 글자와 열쇠구멍은 뭉개지므로 자물쇠 모양만 남긴다.
    """
    def draw(im):
        S = im.size[0]
        padlock(ImageDraw.Draw(im), S / 2, 0.2 * S, 0.5 * S, 0.6 * S, WHITE, (0, 0, 0, 0), keyhole=False)
    return fit(draw, size, 0.72)


def store_graphic(w=1024, h=500):
    """구글 플레이 대표 그래픽. 자물쇠와 이름을 가로로 놓는다."""
    W, H = w * 2, h * 2
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    lock = Image.new("RGBA", (int(H * 0.72), int(H * 0.72)), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lock)
    LS = lock.size[0]
    padlock(ld, LS / 2, 0.12 * LS, 0.62 * LS, 0.72 * LS, WHITE, INK)
    lock = lock.crop(lock.getbbox())
    img.paste(lock, (int(W * 0.245), (H - lock.height) // 2), lock)
    gw = H * 0.30
    draw_wordmark(img, W * 0.40, (H - gw) / 2, gw, H * 0.045, WHITE, stroke=0.14)
    return img.resize((w, h), Image.LANCZOS)


if __name__ == "__main__":
    os.makedirs(ASSETS, exist_ok=True)
    os.makedirs(STORE, exist_ok=True)
    for name, im in [("icon.png", stacked(1024, INK, WHITE)),
                     ("adaptive-icon.png", adaptive_foreground()),
                     ("notification-icon.png", notification_icon())]:
        im.save(os.path.join(ASSETS, name))
        print("assets/" + name, im.size, im.mode)
    g = store_graphic()
    g.save(os.path.join(STORE, "feature-graphic.png"))
    print("docs/store/feature-graphic.png", g.size)
