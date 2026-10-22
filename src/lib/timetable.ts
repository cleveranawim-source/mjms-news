// 학급 시간표: AI 교무실(mjms-office)의 /api/news/timetable이 주는 이번 주·다음 주 시간표.
// 선생님 이름·교실·수락 대기 교체는 AI 교무실이 싣지 않는다. 오는 글자는 모두 escape해서 그린다.
import { escapeHTML } from './html.ts';
import { addDays, weekday } from './dates.ts';

export type TtCell = {
  period: number;
  subject: string;
  special: boolean; // 창체
  changed: null | { from: string | null; note: string | null }; // from = 원래 과목, note = 학사일정 제목
};
export type TtDay = { ymd: string; off: string | null; until: number | null; cells: TtCell[] };
export type ClassTimetable = { id: string; name: string; grade: number; days: TtDay[] };
export type TimetableFeed = { version: 1; generatedAt: string; days: string[]; classes: ClassTimetable[] };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const strOrNull = (v: any) => v === null || typeof v === 'string';
const isCell = (c: any): c is TtCell =>
  c && Number.isInteger(c.period) && typeof c.subject === 'string' && typeof c.special === 'boolean' &&
  (c.changed === null || (c.changed && typeof c.changed === 'object' && strOrNull(c.changed.from) && strOrNull(c.changed.note)));
const isDay = (d: any): boolean =>
  d && typeof d.ymd === 'string' && YMD.test(d.ymd) && strOrNull(d.off) &&
  (d.until === null || (Number.isInteger(d.until) && d.until >= 1 && d.until <= 10)) && Array.isArray(d.cells);
// 틀린 날·칸은 버리고, 맨 위 꼴이 틀리면 null. 화면에는 검사를 통과한 값만 들어간다.
const cleanClass = (c: any): ClassTimetable | null =>
  c && typeof c.id === 'string' && typeof c.name === 'string' && Number.isInteger(c.grade) && Array.isArray(c.days)
    ? { id: c.id, name: c.name, grade: c.grade, days: c.days.filter(isDay).map((d: TtDay) => ({ ymd: d.ymd, off: d.off, until: d.until, cells: d.cells.filter(isCell) })) }
    : null;

/** 못 받거나 꼴이 틀리면 null — 화면은 시간표 칸을 감추거나 안내만 한다. */
export async function loadTimetable(api: string, fetcher: typeof fetch = fetch): Promise<TimetableFeed | null> {
  try {
    const res = await fetcher(api, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const feed = await res.json();
    if (!feed || feed.version !== 1 || typeof feed.generatedAt !== 'string' || !Array.isArray(feed.days) || !Array.isArray(feed.classes)) return null;
    const classes = feed.classes.map(cleanClass);
    if (classes.includes(null)) return null;
    return { version: 1, generatedAt: feed.generatedAt, days: feed.days.filter((d: any) => typeof d === 'string' && YMD.test(d)), classes };
  } catch {
    return null;
  }
}

/** 그날 바뀐 칸(교시 순). */
export function todayChanges(feed: TimetableFeed, classId: string, ymd: string): TtCell[] {
  const day = feed.classes.find((c) => c.id === classId)?.days.find((d) => d.ymd === ymd);
  return (day?.cells ?? []).filter((c) => c.changed).sort((a, b) => a.period - b.period);
}

/** 칠판에 쓰는 한 줄. 예: 3교시 과학 (원래 체육). 비운 칸은 「수업 없음」. */
export function changeLine(cell: TtCell): string {
  const why = cell.changed?.from ? `원래 ${cell.changed.from}` : cell.changed?.note;
  return `${cell.period}교시 ${cell.subject || '수업 없음'}${why ? ` (${why})` : ''}`;
}

/** 칠판 「오늘 바뀐 수업」 줄들. 「N교시까지」로 잘린 교시는 줄마다 쓰지 않고 한 줄로 모은다. */
export function changeLines(feed: TimetableFeed, classId: string, ymd: string): string[] {
  const until = feed.classes.find((c) => c.id === classId)?.days.find((d) => d.ymd === ymd)?.until ?? null;
  const cells = todayChanges(feed, classId, ymd);
  const cut = (c: TtCell) => until !== null && c.subject === '' && c.period > until;
  const lines = cells.filter((c) => !cut(c)).map(changeLine);
  if (until !== null && cells.some(cut)) lines.push(`오늘은 ${until}교시까지`);
  return lines;
}

export function timetableDayHTML(day: TtDay): string {
  if (day.off) return `<ul class="tt-day"><li class="tt-off">${escapeHTML(day.off)}</li></ul>`;
  const rows = day.cells
    .filter((c) => c.subject !== '' || day.until === null || c.period <= day.until)
    .map((c) => {
      const tag = c.special && c.subject !== '창체' ? '<span class="tt-tag">창체</span>' : '';
      const note = c.changed
        ? `<em class="tt-change">바뀜${c.changed.from ? ` (원래 ${escapeHTML(c.changed.from)})` : ''}</em>${c.changed.note ? `<small>${escapeHTML(c.changed.note)}</small>` : ''}`
        : '';
      return `<li class="${c.changed ? 'tt-changed' : ''}"><b>${c.period}교시</b><span class="tt-subject">${escapeHTML(c.subject) || '-'}</span>${tag}${note}</li>`;
    });
  if (day.until !== null) rows.push(`<li class="tt-until">오늘은 ${Number(day.until)}교시까지</li>`);
  return `<ul class="tt-day">${rows.join('')}</ul>`;
}

/** 날짜를 주(월요일) 단위로 묶고 '이번 주'·'다음 주' 이름을 붙인다. */
export function weekGroups(days: string[], today: string): { label: string; days: string[] }[] {
  const monday = (ymd: string) => addDays(ymd, -((['일', '월', '화', '수', '목', '금', '토'].indexOf(weekday(ymd)) + 6) % 7));
  const thisMonday = monday(today);
  const groups = new Map<string, string[]>();
  for (const d of days) groups.set(monday(d), [...(groups.get(monday(d)) ?? []), d]);
  return [...groups].map(([m, ds]) => ({
    label: m === thisMonday ? '이번 주' : m === addDays(thisMonday, 7) ? '다음 주' : `${m.slice(5).replace('-', '/')} 주`,
    days: ds,
  }));
}

/** 처음 보일 날: 오늘, 오늘이 없으면(주말) 그다음 날, 모두 지났으면 첫날. */
export function initialDay(days: string[], today: string): string {
  return days.includes(today) ? today : (days.find((d) => d > today) ?? days[0]);
}

export function classButtonsHTML(classes: ClassTimetable[], grade: number, selected: string): string {
  return classes
    .filter((c) => c.grade === grade)
    .map((c) => `<button type="button" class="class-btn" data-class="${escapeHTML(c.id)}" aria-pressed="${c.id === selected}">${escapeHTML(c.name)}</button>`)
    .join('');
}
