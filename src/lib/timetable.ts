// 학급 시간표: AI 교무실(mjms-office)의 /api/news/timetable이 주는 이번 주·다음 주 시간표.
// 선생님 이름·교실·수락 대기 교체는 AI 교무실이 싣지 않는다. 오는 글자는 모두 escape해서 그린다.
import { escapeHTML } from './html.ts';
import { addDays, weekday, nextSchoolDay } from './dates.ts';

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

const mdw = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일 ${weekday(ymd)}`;

/** 한 주 전체 표: 열 = 날짜(월~금), 행 = 교시. 바뀐 칸은 노랑 단추 — 누르면 원래 수업이 표 아래에 나온다(page가 data-reveal을 읽는다). */
export function weekTableHTML(cls: ClassTimetable, weekDays: string[], today: string): string {
  const days = weekDays.map((ymd) => cls.days.find((d) => d.ymd === ymd) ?? { ymd, off: null, until: null, cells: [] as TtCell[] });
  const rows = Math.max(1, ...days.flatMap((d) => d.cells.map((c) => Number(c.period))), ...days.map((d) => Number(d.until ?? 0)));
  const cls_ = (d: TtDay, extra = '') => `${d.ymd === today ? 'tt-today ' : ''}${extra}`.trim();
  const head = days
    .map((d) => `<th scope="col" class="${cls_(d)}"><span>${escapeHTML(weekday(d.ymd))}</span><small>${Number(d.ymd.slice(8))}일</small>${d.until !== null && !d.off ? `<small class="tt-until-h">${Number(d.until)}교시까지</small>` : ''}</th>`)
    .join('');
  const body: string[] = [];
  for (let p = 1; p <= rows; p++) {
    const tds = days.map((d) => {
      if (d.off) return p === 1 ? `<td rowspan="${rows}" class="${cls_(d, 'tt-off-col')}">${escapeHTML(d.off)}</td>` : '';
      const cell = d.cells.find((c) => Number(c.period) === p);
      const cut = d.until !== null && p > d.until;
      if (!cell || cut || (cell.subject === '' && !cell.changed)) return `<td class="${cls_(d, cut ? 'tt-cut' : 'tt-blank')}"></td>`;
      const tag = cell.special && cell.subject !== '창체' ? '<i class="tt-mark">창체</i>' : '';
      const inner = `<span>${escapeHTML(cell.subject) || '수업 없음'}</span>${tag}`;
      const sp = cell.special ? ' tt-special' : '';
      if (!cell.changed) return `<td class="${cls_(d, sp.trim())}">${inner}</td>`;
      const why = cell.changed.from ? `원래 ${cell.changed.from}` : cell.changed.note;
      const reveal = `${mdw(d.ymd)} ${p}교시: ${cell.subject || '수업 없음'}${why ? ` (${why})` : ''}${cell.changed.from && cell.changed.note ? ` · ${cell.changed.note}` : ''}`;
      return `<td class="${cls_(d, 'tt-changed' + sp)}"><button type="button" data-reveal="${escapeHTML(reveal)}" aria-expanded="false" aria-label="${escapeHTML(`${p}교시 ${cell.subject || '수업 없음'}, 바뀐 수업. 누르면 원래 수업이 보여요`)}">${inner}</button></td>`;
    });
    body.push(`<tr><th scope="row">${p}</th>${tds.join('')}</tr>`);
  }
  return `<table class="tt-grid"><caption class="sr-only">${escapeHTML(cls.name)} 주간 시간표</caption><thead><tr><td></td>${head}</tr></thead><tbody>${body.join('')}</tbody></table>`;
}

/** 「오늘 바뀐 수업」 상자가 다룰 날: 오늘, 주말·쉬는 날이면 다음 등교일. */
export function changesTarget(cls: ClassTimetable, today: string): { ymd: string; label: string } {
  const offs = cls.days.filter((d) => d.off).map((d) => ({ start: d.ymd, end: d.ymd }));
  const closed = ['토', '일'].includes(weekday(today)) || offs.some((o) => o.start === today);
  if (!closed) return { ymd: today, label: `오늘 바뀐 수업 (${mdw(today)})` };
  const ymd = nextSchoolDay(today, offs);
  return { ymd, label: `다음 등교일 바뀐 수업 (${mdw(ymd)})` };
}

export function changesBoxHTML(cls: ClassTimetable, ymd: string, label: string): string {
  const lines = changeLines({ version: 1, generatedAt: '', days: [], classes: [cls] }, cls.id, ymd);
  const empty = label.startsWith('오늘') ? '오늘은 바뀐 수업이 없어요' : '바뀐 수업이 없어요';
  const list = lines.length ? `<ul>${lines.map((l) => `<li>${escapeHTML(l)}</li>`).join('')}</ul>` : `<p>${empty}</p>`;
  return `<h3>${escapeHTML(label)}</h3>${list}`;
}
