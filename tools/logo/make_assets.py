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


def app_mark(size=192):
    """
    앱 화면 안에서 쓰는 자물쇠 표시. 잠금 화면 제목 줄에 들어간다.
    먹색 실루엣 + 투명 배경. 흰 카드 위에 얹힌다.
    """
    def draw(im):
        S = im.size[0]
        padlock(ImageDraw.Draw(im), S / 2, 0.14 * S, 0.62 * S, 0.70 * S, INK, (0, 0, 0, 0), keyhole=False)
    return fit(draw, size, 0.94)


def store_graphic(w=1024, h=500):
    """
    구글 플레이 대표 그래픽. 자물쇠와 이름을 가로로 놓는다.

    **자리를 비율로 박지 않는다.** 예전에는 자물쇠를 `W*0.245`, 글자를 `W*0.40` 에
    두었는데, 자물쇠가 실제로 얼마나 넓은지 재지 않아서 글자 시작점이 자물쇠
    오른쪽 끝보다 앞에 왔다. 둘이 겹쳐 뭉개졌다.

    이제 자물쇠를 먼저 그려 **잉크가 닿은 넓이를 재고**, 그 뒤에 사이를 두고
    글자를 놓는다. 그리고 둘을 묶어 가운데 맞춘다. 아이콘에서 `fit()` 을 만든
    것과 같은 이유다 — 눈대중한 좌표는 그림이 바뀌는 순간 어긋난다.
    """
    W, H = w * 2, h * 2
    img = Image.new("RGB", (W, H), INK)

    # 자물쇠를 따로 그려 실제 크기를 잰다.
    lock = Image.new("RGBA", (int(H * 0.72), int(H * 0.72)), (0, 0, 0, 0))
    LS = lock.size[0]
    padlock(ImageDraw.Draw(lock), LS / 2, 0.12 * LS, 0.62 * LS, 0.72 * LS, WHITE, INK)
    lock = lock.crop(lock.getbbox())

    # 글자 넓이. draw_wordmark 는 '잠' 을 x 에, '김' 을 x + size + gap 에 그린다.
    glyph = H * 0.30
    gap = H * 0.045
    word_w = glyph * 2 + gap

    # 자물쇠와 글자 사이. 글자 하나의 절반쯤 띄우면 붙어 보이지 않는다.
    between = glyph * 0.55

    total = lock.width + between + word_w
    left = (W - total) / 2

    img.paste(lock, (int(left), (H - lock.height) // 2), lock)
    draw_wordmark(img, left + lock.width + between, (H - glyph) / 2, glyph, gap,
                  WHITE, stroke=0.14)
    return img.resize((w, h), Image.LANCZOS)


if __name__ == "__main__":
    os.makedirs(ASSETS, exist_ok=True)
    os.makedirs(STORE, exist_ok=True)
    for name, im in [("icon.png", stacked(1024, INK, WHITE)),
                     ("adaptive-icon.png", adaptive_foreground()),
                     ("notification-icon.png", notification_icon()),
                     ("lock-mark.png", app_mark())]:
        im.save(os.path.join(ASSETS, name))
        print("assets/" + name, im.size, im.mode)
    # 스토어 목록에 쓰는 아이콘. 구글 플레이는 512x512 를 따로 요구한다.
    store_icon = stacked(1024, INK, WHITE).resize((512, 512), Image.LANCZOS)
    store_icon.save(os.path.join(STORE, "store-icon-512.png"))
    print("docs/store/store-icon-512.png", store_icon.size)

    g = store_graphic()
    g.save(os.path.join(STORE, "feature-graphic.png"))
    print("docs/store/feature-graphic.png", g.size)
