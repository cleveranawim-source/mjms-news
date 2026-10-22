// 날짜는 모두 'YYYY-MM-DD' 문자열로 다룬다. 시간대 때문에 하루가 밀리는 일을 막기 위해서다.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
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
