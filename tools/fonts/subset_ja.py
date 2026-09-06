#!/usr/bin/env python3
"""
일본어 글꼴을 필요한 글자만 남기고 잘라낸다.

**왜 자르나.** 통짜 Noto Sans JP 는 한 벌에 5.4MB 다. 두 벌이면 11MB 로, 지금
앱 전체(3MB)보다 훨씬 크다. 이 앱의 장점 하나가 가볍다는 것이라 그대로 넣을 수 없다.

**왜 잘라도 되나.** `tests/fontCoverage.test.ts` 가 화면에 쓰는 글자가 글꼴에
실제로 들어 있는지 본다. 일본어 문구를 고치다 새 한자가 들어오면 **검사가 걸린다.**
그때 이 스크립트를 다시 돌리면 된다.

    pip install fonttools brotli
    npm pack @expo-google-fonts/noto-sans-jp
    python3 tools/fonts/subset_ja.py <풀어 놓은 꾸러미 경로>

담는 글자
  - `src/app/i18n/ja.ts` 가 실제로 쓰는 글자 (한자가 여기서 나온다)
  - 히라가나·가타카나 전체 — 문구를 조금 고칠 때 가나는 거의 확실히 필요하다
  - 아스키(영문·숫자·기호) — 일본어 화면에도 `Jamgim`, 복구 코드, 숫자가 나온다
  - 일본어 문장부호

한자만 '쓰는 것만' 담는다. 한자는 수가 많아 넉넉히 담으면 곧바로 메가바이트가 된다.
'자주 쓰는 한자 3000자' 같은 중간값을 유니코드 순서로 자르면 안 된다 — 유니코드 순서는
빈도 순서가 아니라서, 희귀 한자가 들어오고 정작 흔한 글자(語·読·顔)가 빠진다.
"""

import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'assets' / 'fonts'

# 넣을 굵기. Pretendard 와 짝이 맞아야 한다 (보통 / 굵은 것).
WEIGHTS = {
    '400Regular': 'NotoSansJP-Regular.ttf',
    '600SemiBold': 'NotoSansJP-SemiBold.ttf',
}


def japanese_screen_chars() -> set[str]:
    """`ja.ts` 에서 **화면에 나가는** 글자만 모은다. 주석의 한국어는 세지 않는다."""
    source = (ROOT / 'src' / 'app' / 'i18n' / 'ja.ts').read_text(encoding='utf-8')
    found: set[str] = set()
    for single, backtick in re.findall(r"'([^'\n]*)'|`([^`\n]*)`", source):
        found.update(single + backtick)
    return found


def wanted() -> set[str]:
    ascii_printable = {chr(c) for c in range(0x20, 0x7F)}
    kana = {chr(c) for c in range(0x3041, 0x30FF)}
    punctuation = set('、。「」『』（）〈〉・ー〜％：；！？…　＋－×÷／＝')
    return japanese_screen_chars() | ascii_printable | kana | punctuation


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    package = pathlib.Path(sys.argv[1])
    chars = wanted()
    listing = OUT_DIR / '.ja-subset-chars.txt'
    listing.parent.mkdir(parents=True, exist_ok=True)
    listing.write_text(''.join(sorted(chars)), encoding='utf-8')

    for folder, out_name in WEIGHTS.items():
        source = package / folder / f'NotoSansJP_{folder}.ttf'
        if not source.exists():
            print(f'없음: {source}')
            return 1
        target = OUT_DIR / out_name
        subprocess.run(
            ['pyftsubset', str(source), f'--text-file={listing}',
             f'--output-file={target}', '--layout-features=*',
             '--no-hinting', '--desubroutinize',
             # 글꼴 안에 적힌 이름을 전부 남긴다. 기본값은 이것들을 지우는데,
             # 그러면 저작권 문구(0)와 라이선스(13·14)까지 사라진다.
             # OFL 은 라이선스가 글꼴과 함께 다닐 것을 요구한다.
             '--name-IDs=*', '--name-legacy'],
            check=True)
        before = os.path.getsize(source) / 1024 / 1024
        after = os.path.getsize(target) / 1024
        print(f'{out_name}: {before:.1f}MB → {after:.0f}KB   (글자 {len(chars)}종)')

    listing.unlink()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
