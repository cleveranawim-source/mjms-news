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

const isCell = (c: any): c is TtCell => c && Number.isInteger(c.period) && typeof c.subject === 'string' && typeof c.special === 'boolean';
const isDay = (d: any): d is TtDay =>
  d && typeof d.ymd === 'string' && Array.isArray(d.cells) && d.cells.every(isCell);
const isClass = (c: any): c is ClassTimetable =>
  c && typeof c.id === 'string' && typeof c.name === 'string' && Number.isInteger(c.grade) && Array.isArray(c.days) && c.days.every(isDay);

/** 못 받거나 꼴이 틀리면 null — 화면은 시간표 칸을 감추거나 안내만 한다. */
export async function loadTimetable(api: string, fetcher: typeof fetch = fetch): Promise<TimetableFeed | null> {
  try {
    const res = await fetcher(api, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const feed = await res.json();
    if (!feed || feed.version !== 1 || !Array.isArray(feed.days) || !Array.isArray(feed.classes)) return null;
    return feed.classes.every(isClass) ? (feed as TimetableFeed) : null;
  } catch {
    return null;
  }
}

/** 그날 바뀐 칸(교시 순). */
export function todayChanges(feed: TimetableFeed, classId: string, ymd: string): TtCell[] {
  const day = feed.classes.find((c) => c.id === classId)?.days.find((d) => d.ymd === ymd);
  return (day?.cells ?? []).filter((c) => c.changed).sort((a, b) => a.period - b.period);
}

/** 칠판에 쓰는 한 줄. 예: 3교시 과학 (원래 체육) */
export function changeLine(cell: TtCell): string {
  const why = cell.changed?.from ? `원래 ${cell.changed.from}` : cell.changed?.note;
  return `${cell.period}교시 ${cell.subject}${why ? ` (${why})` : ''}`;
}

export function timetableDayHTML(day: TtDay): string {
  if (day.off) return `<ul class="tt-day"><li class="tt-off">${escapeHTML(day.off)}</li></ul>`;
  const rows = day.cells
    .filter((c) => c.subject !== '' || day.until === null || c.period <= day.until)
    .map((c) => {
      const tag = c.special ? '<span class="tt-tag">창체</span>' : '';
      const note = c.changed
        ? `<em class="tt-change">바뀜${c.changed.from ? ` (원래 ${escapeHTML(c.changed.from)})` : ''}</em>${c.changed.note ? `<small>${escapeHTML(c.changed.note)}</small>` : ''}`
        : '';
      return `<li class="${c.changed ? 'tt-changed' : ''}"><b>${c.period}교시</b><span class="tt-subject">${escapeHTML(c.subject) || '-'}</span>${tag}${note}</li>`;
    });
  if (day.until !== null) rows.push(`<li class="tt-until">오늘은 ${day.until}교시까지</li>`);
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
