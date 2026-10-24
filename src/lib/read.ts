// 이 휴대폰에서 연 가정통신문 id: localStorage['mjms-read'](JSON 배열, 최근 READ_MAX개). 어디로도 보내지 않는다.
// 「새 글」은 2주 안에 올라왔고 이 기기에서 아직 열지 않은 글이다. 가정통신문 목록·한 건 화면의 inline 스크립트도 같은 꼴을 쓴다.
export const READ_KEY = 'mjms-read';
export const READ_MAX = 200;

export function parseRead(raw: string | null): Set<string> {
  try {
    const v = JSON.parse(raw ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/** 연 글을 맨 뒤에 더한다(이미 있으면 맨 뒤로 옮긴다). 오래된 것부터 버려 READ_MAX개까지. */
export function addRead(raw: string | null, id: string): string {
  const ids = [...parseRead(raw)].filter((x) => x !== id);
  return JSON.stringify([...ids, id].slice(-READ_MAX));
}

export function readIds(): Set<string> {
  try {
    return parseRead(localStorage.getItem(READ_KEY));
  } catch {
    return new Set();
  }
}
