"""
'잠김' 을 도형으로 그린다. 글꼴을 쓰지 않는 이유:
- 쓸 수 있는 한글 글꼴이 GPL 중국어 글꼴뿐이라 스토어 앱 로고에 쓰기 곤란하다
- 로고는 원래 글꼴로 찍는 것이 아니라 그리는 것이다
좌표는 음절 하나를 0..1 정사각형으로 보고 적는다.
"""
from PIL import Image, ImageDraw

SS = 4  # 4배로 그린 뒤 줄여서 계단을 없앤다


class Pen:
    def __init__(self, draw, ox, oy, size, color, stroke):
        self.d = draw
        self.ox, self.oy, self.size = ox, oy, size
        self.c = color
        self.s = stroke  # 획 두께 (0..1 기준)

    def px(self, x, y):
        return (self.ox + x * self.size, self.oy + y * self.size)

    def bar(self, x0, y0, x1, y1):
        """가로 또는 세로 획 하나. 끝을 둥글게 해서 인쇄물 같지 않게 한다."""
        w = self.s * self.size
        a, b = self.px(x0, y0), self.px(x1, y1)
        self.d.line([a, b], fill=self.c, width=int(round(w)), joint="curve")
        r = w / 2
        for (cx, cy) in (a, b):
            self.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=self.c)

    def box(self, x0, y0, x1, y1):
        """ㅁ — 속이 빈 네모."""
        for seg in ((x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)):
            self.bar(*seg)


# 받침 ㅁ. 진짜 글자와 겹쳐 보고 잡은 값이다.
# 처음에는 칸을 꽉 채웠는데, 그러면 글자가 짓눌려 다른 글자처럼 보였다.
# ㅁ 은 위 자모보다 좁고 낮다.
BATCHIM = (0.09, 0.650, 0.83, 0.950)


def mieum(p):
    p.box(*BATCHIM)


def jam(p):
    """잠 = ㅈ + ㅏ 위, ㅁ 아래"""
    # ㅈ — 가로획 하나에 삐침 둘. 삐침이 짧으면 ㅅ 처럼 보인다.
    p.bar(0.04, 0.09, 0.55, 0.09)
    p.bar(0.30, 0.11, 0.05, 0.50)
    p.bar(0.30, 0.11, 0.53, 0.50)
    # ㅏ — 곁줄기는 세로획의 **오른쪽**으로 나간다.
    # 왼쪽으로 그리면 ㅓ 가 되어 '잠' 이 '점' 으로 읽힌다. 실제로 한 번 그렇게 냈다.
    p.bar(0.72, 0.03, 0.72, 0.50)
    p.bar(0.72, 0.30, 0.94, 0.30)
    mieum(p)


def gim(p):
    """김 = ㄱ + ㅣ 위, ㅁ 아래"""
    # ㄱ — 다리가 안쪽으로 기운다. 곧게 내리면 ㅣ 와 나란해져 다른 글자로 읽힌다.
    p.bar(0.04, 0.09, 0.58, 0.09)
    p.bar(0.58, 0.11, 0.40, 0.50)
    # ㅣ — 곁줄기가 없다. 붙이면 ㅓ 가 되어 '김' 이 '검' 으로 읽힌다.
    p.bar(0.80, 0.03, 0.80, 0.50)
    mieum(p)


def draw_wordmark(img, x, y, size, gap, color, stroke=0.115):
    """잠김 두 글자를 나란히."""
    d = ImageDraw.Draw(img)
    jam(Pen(d, x, y, size, color, stroke))
    gim(Pen(d, x + size + gap, y, size, color, stroke))
