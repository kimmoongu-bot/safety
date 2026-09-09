/**
 * 넣어 쓰는 남의 것들.
 *
 * 글꼴 두 벌이 SIL Open Font License 1.1 이다. 이 허락서는 **저작권 표시와 허락서를
 * 사본마다 함께 배포할 것**을 요구한다. 글꼴 파일의 이름표(name table) 안에도 들어
 * 있지만(잘라 낼 때 `--name-IDs=*` 로 지켰다), 사람이 읽을 수 있는 곳에도 둔다.
 * 파일 안에만 있으면 아무도 못 본다.
 *
 * 허락서 본문은 번역하지 않는다. 원문이 효력을 갖는다.
 */
export type ThirdParty = {
  name: string;
  copyright: string;
  /** 어디에 쓰나. 화면에 그대로 나가지 않고, 문장 목록의 열쇠다. */
  useKey: 'info.fontLatin' | 'info.fontJapanese';
  /**
   * 원본 허락서 파일 (`assets/fonts/`). 화면에서 읽지는 않는다 —
   * 검사가 여기 적은 저작권 표시와 원본이 같은지 볼 때 쓴다.
   */
  licenseFile: string;
};

export const THIRD_PARTY: readonly ThirdParty[] = [
  {
    name: 'Pretendard',
    copyright:
      'Copyright (c) 2021, Kil Hyung-jin (https://github.com/orioncactus/pretendard), with Reserved Font Name Pretendard.',
    useKey: 'info.fontLatin',
    licenseFile: 'Pretendard-OFL.txt',
  },
  {
    name: 'Noto Sans JP',
    copyright:
      "Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'.",
    useKey: 'info.fontJapanese',
    licenseFile: 'NotoSansJP-OFL.txt',
  },
];

/** SIL Open Font License 1.1 본문. 두 글꼴이 같은 허락서를 쓴다. */
export const OFL_TEXT = `-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.`;

/**
 * 문의받을 주소.
 *
 * **아직 비어 있다.** 스토어에 올리기 전에 반드시 정해야 한다 (플레이 필수 항목).
 * 비어 있는 동안에는 문의 줄을 화면에 내보내지 않는다 — 눌러도 아무 일도 안 나는
 * 단추를 보여 주는 것이 아무것도 없는 것보다 나쁘다.
 */
export const CONTACT_EMAIL = '';
