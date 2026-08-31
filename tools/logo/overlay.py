"""
내가 그린 글자를 진짜 글자 위에 겹쳐 어긋난 곳을 본다.
글꼴은 '자로 재는 용도'로만 쓴다. 최종 그림은 전부 직접 그린 도형이라
글꼴 라이선스와 무관하다.
"""
from PIL import Image, ImageDraw, ImageFont
import importlib, sys

REF = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"


def ref_syllable(ch, box):
    """글자 하나를 그려서 실제 획이 차지한 사각형에 꽉 맞춘다."""
    f = ImageFont.truetype(REF, 700)
    tmp = Image.new("L", (1200, 1200), 255)
    ImageDraw.Draw(tmp).text((200, 150), ch, font=f, fill=0)
    bb = Image.eval(tmp, lambda v: 255 - v).getbbox()
    return tmp.crop(bb).resize((box, box), Image.LANCZOS)


def build(mod, out):
    importlib.reload(mod)
    BOX, PAD = 460, 40
    img = Image.new("RGB", (BOX * 2 + PAD * 3, BOX + PAD * 2), "white")
    for i, ch in enumerate("잠김"):
        x = PAD + i * (BOX + PAD)
        ref = ref_syllable(ch, BOX).convert("RGB")
        # 참고 글자는 연한 회색으로
        ref = Image.eval(ref, lambda v: 255 - (255 - v) * 45 // 100)
        img.paste(ref, (x, PAD))
    d = ImageDraw.Draw(img, "RGBA")
    for i, fn in enumerate((mod.jam, mod.gim)):
        x = PAD + i * (BOX + PAD)
        fn(mod.Pen(d, x, PAD, BOX, (200, 30, 30, 150), 0.115))
    img.save(out)


if __name__ == "__main__":
    import hangul
    build(hangul, "overlay.png")
    print("ok")
