// 날짜는 모두 'YYYY-MM-DD' 문자열로 다룬다. 시간대 때문에 하루가 밀리는 일을 막기 위해서다.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}

// 빌드가 '오늘'로 삼는 날. 테스트가 날짜를 고정할 수 있게 NEWS_TODAY(YYYY-MM-DD)를 먼저 본다. 브라우저 쪽은 seoulToday()를 쓴다.
export function buildToday(): string {
  const o = process.env.NEWS_TODAY;
  return o && /^\d{4}-\d{2}-\d{2}$/.test(o) ? o : seoulToday();
}

export function toISODate(value: string | Date): string {
  return typeof value === 'string' ? value : value.toISOString().slice(0, 10);
}

function parse(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function weekday(iso: string): string {
  return WEEKDAYS[parse(iso).getUTCDay()];
}

type Range = { start: string; end: string };

export function isDayOff(iso: string, daysOff: Range[]): boolean {
  return daysOff.some((d) => d.start <= iso && iso <= d.end);
}

// 주말과 쉬는 날(공휴일·재량휴업일·방학)을 건너뛴 다음 등교일.
export function nextSchoolDay(iso: string, daysOff: Range[] = []): string {
  let next = addDays(iso, 1);
  while (['토', '일'].includes(weekday(next)) || isDayOff(next, daysOff)) next = addDays(next, 1);
  return next;
}

export function formatDate(iso: string): string {
  const d = parse(iso);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${weekday(iso)})`;
}

export function formatMonth(iso: string): string {
  const d = parse(iso);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`;
}

export function formatRange(start: string, end?: string): string {
  if (!end || end === start) return formatDate(start);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${formatDate(start)} ~ ${sameMonth ? formatDate(end).replace(/^\d+월 /, '') : formatDate(end)}`;
}

// 공휴일 달력과 학교 구글 캘린더가 같은 쉬는 날을 따로 싣는다. 날짜 범위가 똑같으면 한 줄로 합치고,
// 「쉬는 날 」 머리말을 뗀 짧은 이름을 고른다. 날짜 계산에는 영향이 없다.
export function mergeDaysOff<T extends { title: string; start: string; end: string }>(daysOff: T[]): T[] {
  const clean = (t: string) => t.replace(/^쉬는 날\s+/, '');
  const byRange = new Map<string, T>();
  for (const d of daysOff) {
    const key = `${d.start}~${d.end}`;
    const have = byRange.get(key);
    const title = clean(d.title);
    if (!have || title.length < have.title.length) byRange.set(key, { ...d, title });
  }
  return [...byRange.values()];
}
