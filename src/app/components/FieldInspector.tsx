import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BigButton, Body } from './Basics.tsx';
import type { FieldPick } from '../../core/autofill.ts';
import { font, space } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 칸 정보 — **개발용 빌드에서만** 보인다 (docs/자동완성.md 19장).
 *
 * ## 왜 있나
 *
 * 손택스에서 아이디와 비밀번호가 다 채워졌는데 앱은 "비밀번호를 입력하세요" 라고
 * 했다. 보안 키패드가 자기 값을 따로 들고 있어서, 우리가 칠한 글자를 앱이 쳐다도
 * 안 본 것이다 (18장).
 *
 * 그런 칸은 아예 안 건드리는 것이 맞다. 반쯤 채워 놓고 고치지도 못하게 만드는
 * 것보다 낫다. 그러려면 **그런 칸인 줄 알아봐야** 하는데, 앱이 그 칸을 어떻게
 * 신고하는지 우리는 모른다.
 *
 * 여기서 또 짐작하지 않는다. 온 것을 그대로 보여 주고, **보고 나서** 정한다.
 *
 * ## 기록에 남기지 않는다
 *
 * 여기 오는 것은 **남의 앱 화면**이다 (명세 5.5). `console` 에 찍지 않고 어디에도
 * 저장하지 않는다. 화면에 띄우고 끝이다. 칸에 든 글자는 애초에 긁어 오지도 않는다
 * — 이름표와 표시만 온다.
 *
 * ## 배포판에는 없다
 *
 * `IS_DEV_BUILD` 가 참일 때만 그린다. 남의 앱 화면 구조를 보여 주는 자리가
 * 배포판에 있으면 안 된다.
 */
export function FieldInspector({ raw, pick }: { raw: string; pick: FieldPick }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  const fields = useMemo(() => parse(raw), [raw]);

  return (
    <View style={styles.box}>
      <BigButton
        label={open ? '칸 정보 감추기' : `칸 정보 보기 (${fields.length}개)`}
        tone="plain"
        onPress={() => setOpen((v) => !v)}
      />
      {open ? (
        <View style={styles.list}>
          <Body dim>
            {`고른 칸 — 아이디: ${label(pick.username)} · 비밀번호: ${label(pick.password)}`}
          </Body>
          {fields.length === 0 ? (
            <Body dim>칸이 하나도 없습니다.</Body>
          ) : (
            fields.map((field, i) => (
              <View key={i} style={styles.field}>
                <Text style={styles.head}>{`#${i}`}</Text>
                {Object.entries(field).map(([key, value]) => (
                  <Text key={key} style={styles.line}>{`${key}: ${show(value)}`}</Text>
                ))}
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

/** 못 고른 칸은 번호가 없다. `null` 을 그대로 찍으면 0번과 헷갈린다. */
function label(index: number | null): string {
  return index === null ? '못 고름' : `#${index}`;
}

/**
 * 원문을 푼다. **깨져 있어도 던지지 않는다.**
 *
 * 이건 곁다리 화면이다. 여기서 예외가 나서 채우기 자체가 안 되면 본말이 뒤집힌다.
 */
function parse(raw: string): Record<string, unknown>[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null);
  } catch {
    return [];
  }
}

/** 값을 사람이 읽을 수 있게. 빈 것과 없는 것을 구분해서 적는다. */
function show(value: unknown): string {
  if (value === null || value === undefined) return '없음';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'string') return value === '' ? "''" : value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const useStyles = createStyles((c, f) =>
  StyleSheet.create({
    box: { marginTop: space.lg },
    list: { marginTop: space.md, gap: space.md },
    field: {
      gap: space.xs,
      padding: space.sm,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
    },
    head: { fontFamily: f.familyBold, fontSize: font.caption, color: c.text },
    /*
      고정폭 글꼴로 찍는다. 사진으로 찍어 보내는 것이 쓰임새라, 값이 세로로
      가지런해야 읽힌다. 우리 글꼴은 여기 안 쓴다 — 이건 사람에게 보여 주는
      글이 아니라 기계가 뱉은 값이다.
    */
    line: { fontFamily: 'monospace', fontSize: font.caption, color: c.textDim },
  }),
);
