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

// 선생님이 시간표 교체를 과목 「학교 행사」로만 적은 칸(시험·체험학습 날)에는 그날 학사일정 이름을 붙인다.
const SCHOOL_EVENT = '학교 행사';
type ScheduleEvent = { title: string; start: string; end: string; grades: number[]; kind: string };

/**
 * 「학교 행사」로 바뀐 칸의 과목을 그날 그 학년 학사일정 이름으로(「기말고사」). 원래 과목은 그대로 둔다.
 * 그 학년만의 행사가 딱 하나면 그것, 없으면 전 학년 행사가 딱 하나일 때만. 후보가 여럿이면 알 수 없으니 그대로 둔다.
 */
export function nameSchoolEvents(feed: TimetableFeed | null, schedule: ScheduleEvent[] | null | undefined): TimetableFeed | null {
  if (!feed || !schedule) return feed;
  const nameFor = (grade: number, ymd: string): string | null => {
    const on = schedule.filter((e) => e.kind === 'event' && e.start <= ymd && ymd <= e.end);
    const mine = on.filter((e) => e.grades.includes(grade));
    const all = on.filter((e) => e.grades.length === 0);
    const pick = mine.length ? mine : all;
    return pick.length === 1 ? pick[0].title : null;
  };
  return {
    ...feed,
    classes: feed.classes.map((c) => ({
      ...c,
      days: c.days.map((d) => {
        if (!d.cells.some((x) => x.changed && x.subject === SCHOOL_EVENT)) return d;
        const name = nameFor(c.grade, d.ymd);
        return name ? { ...d, cells: d.cells.map((x) => (x.changed && x.subject === SCHOOL_EVENT ? { ...x, subject: name } : x)) } : d;
      }),
    })),
  };
}

/** 바뀐 칸 한 줄의 재료: 「1교시 영어」 + 원래 과목(줄긋기) 또는 학사일정 이름. 「오늘은 N교시까지」는 글자 그대로. */
export type ChangeItem = { text: string; from: string | null; note: string | null };

const itemOf = (c: TtCell): ChangeItem => ({
  text: `${c.period}교시 ${c.subject || '수업 없음'}`,
  from: c.changed?.from ?? null,
  note: c.changed?.from ? null : (c.changed?.note ?? null),
});

// 바뀐 칸 규칙은 여기 한 곳: 교시 순, 「N교시까지」 뒤 비운 칸은 줄마다 쓰지 않고 until 하나로 알린다.
function changesOf(cls: ClassTimetable | undefined, ymd: string): { cells: TtCell[]; until: number | null } {
  const day = cls?.days.find((d) => d.ymd === ymd);
  const until = day?.until ?? null;
  const all = (day?.cells ?? []).filter((c) => c.changed).sort((a, b) => a.period - b.period);
  const cut = (c: TtCell) => until !== null && c.subject === '' && c.period > until;
  return { cells: all.filter((c) => !cut(c)), until: all.some(cut) ? until : null };
}

// 칠판은 짧아야 하므로 이어진 교시가 같은 과목으로 바뀌었으면 한 묶음으로(시험·행사 날 「1~6교시 학교 행사」).
function runs(cells: TtCell[]): TtCell[][] {
  const out: TtCell[][] = [];
  for (const c of cells) {
    const last = out.at(-1)?.at(-1);
    if (last && last.period + 1 === c.period && last.subject === c.subject) out.at(-1)!.push(c);
    else out.push([c]);
  }
  return out;
}

/** 칠판 「오늘 바뀐 수업」 줄의 재료. 잘린 교시는 「오늘은 N교시까지」 한 줄(다음 등교일이면 「그날은」). */
export function changeItems(feed: TimetableFeed, classId: string, ymd: string, day = '오늘은'): (ChangeItem | string)[] {
  const { cells, until } = changesOf(feed.classes.find((c) => c.id === classId), ymd);
  const items: (ChangeItem | string)[] = runs(cells).map((run) => {
    const one = itemOf(run[0]);
    if (run.length === 1) return one;
    // 원래 과목·학사일정 이름이 모두 같을 때만 남긴다(「5~6교시 영어 ~~체육~~」). 다르면 시간표 화면에서 본다.
    const all = run.map(itemOf);
    const same = (k: 'from' | 'note') => (all.every((i) => i[k] === one[k]) ? one[k] : null);
    return { text: `${run[0].period}~${run.at(-1)!.period}교시 ${run[0].subject || '수업 없음'}`, from: same('from'), note: same('note') };
  });
  if (until !== null) items.push(`${day} ${until}교시까지`);
  return items;
}

/** 칠판 「6교시까지」: 그날 마지막 교시(「N교시까지」가 있으면 그것). 쉬는 날이거나 그날·반이 피드에 없으면 null. */
export function lastPeriod(feed: TimetableFeed | null, classId: string, ymd: string): number | null {
  const day = feed?.classes.find((c) => c.id === classId)?.days.find((d) => d.ymd === ymd);
  if (!day || day.off) return null;
  if (day.until !== null) return day.until;
  const periods = day.cells.filter((c) => c.subject !== '').map((c) => c.period);
  return periods.length ? Math.max(...periods) : null;
}

/** 원래 과목(줄긋기) 또는 학사일정 이름(작게). 줄긋기는 들리지 않으므로 「원래」를 숨은 글자로 둔다. 칠판과 시간표 안내판이 같이 쓴다. */
export function changeWhyHTML(i: { from: string | null; note: string | null }): string {
  if (i.from) return ` <s><span class="sr-only">원래 </span>${escapeHTML(i.from)}</s>`;
  return i.note ? ` <small>${escapeHTML(i.note)}</small>` : '';
}

// 이번 주부터 몇 주 뒤인지로 이름을 붙인다. 지난주는 피드에 없지만 오면 날짜로.
const WEEK_NAMES = ['이번 주', '다음 주', '다다음 주'];

/** 날짜를 주(월요일) 단위로 묶고 「이번 주」·「다음 주」·「다다음 주」·「3주 뒤」 이름을 붙인다(날짜 범위는 단추 아래 줄에 따로). */
export function weekGroups(days: string[], today: string): { label: string; days: string[] }[] {
  const thisMonday = mondayOf(today);
  const groups = new Map<string, string[]>();
  for (const d of days) groups.set(mondayOf(d), [...(groups.get(mondayOf(d)) ?? []), d]);
  return [...groups].map(([m, ds]) => {
    const n = Math.round((Date.parse(m) - Date.parse(thisMonday)) / (7 * 86400000));
    return { label: n < 0 ? `${md(m)} 주` : (WEEK_NAMES[n] ?? `${n}주 뒤`), days: ds };
  });
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const mondayOf = (ymd: string) => addDays(ymd, -((DAYS.indexOf(weekday(ymd)) + 6) % 7));
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`;
const mdw = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일 ${weekday(ymd)}`;

/** 그 주 월~금: 「10/19~23」, 달이 바뀌면 「9/28~10/2」. */
export function weekRange(monday: string): string {
  const fri = addDays(monday, 4);
  return `${md(monday)}~${fri.slice(5, 7) === monday.slice(5, 7) ? Number(fri.slice(8)) : md(fri)}`;
}

/** 한 주 전체 표: 열 = 날짜(월~금), 행 = 교시. 바뀐 칸은 굵은 남색 과목 + 아래 줄 그은 원래 과목(없으면 사유를 작게). */
export function weekTableHTML(cls: ClassTimetable, weekDays: string[], today: string): string {
  const days = weekDays.map((ymd) => cls.days.find((d) => d.ymd === ymd) ?? { ymd, off: null, until: null, cells: [] as TtCell[] });
  const rows = Math.max(1, ...days.flatMap((d) => d.cells.map((c) => Number(c.period))), ...days.map((d) => Number(d.until ?? 0)));
  const at = (d: TtDay, extra = '') => {
    const c = `${d.ymd === today ? 'tt-today ' : ''}${extra}`.trim();
    return c ? ` class="${c}"` : '';
  };
  const dayNo = (d: TtDay) => Number(d.ymd.slice(8));
  const head = days
    .map((d) => {
      const date = d.ymd === today ? `<span class="sr-only">${dayNo(d)}일 </span>오늘` : `${dayNo(d)}<span class="sr-only">일</span>`;
      const until = d.until !== null && !d.off ? `<small class="tt-until-h">${Number(d.until)}교시까지</small>` : '';
      return `<th scope="col"${at(d)}><span>${escapeHTML(weekday(d.ymd))}</span><small>${date}</small>${until}</th>`;
    })
    .join('');
  const body: string[] = [];
  for (let p = 1; p <= rows; p++) {
    const tds = days.map((d) => {
      if (d.off) return p === 1 ? `<td rowspan="${rows}"${at(d, 'tt-off-col')}><span>${escapeHTML(d.off)}</span></td>` : '';
      const cell = d.cells.find((c) => Number(c.period) === p);
      const cut = d.until !== null && p > d.until;
      if (!cell || cut || (cell.subject === '' && !cell.changed)) return `<td${at(d, cut ? 'tt-cut' : '')}></td>`;
      const subject = cell.subject || '수업 없음';
      const special = cell.special && cell.subject !== '창체';
      // 과목과 「창체」가 붙어 읽히지 않게 숨은 쉼표를 둔다
      const tag = special ? '<small class="tt-special"><span class="sr-only">, </span>창체</small>' : '';
      if (!cell.changed) return `<td${at(d)}>${escapeHTML(subject)}${tag}</td>`;
      const { from, note } = cell.changed;
      const why = from ? `<s>${escapeHTML(from)}</s>` : note ? `<small class="tt-note">${escapeHTML(note)}</small>` : '';
      const label = `${weekday(d.ymd)}요일 ${p}교시 ${subject}${special ? '(창체)' : ''}, ${from ? `원래 ${from}, ` : note ? `${note}, ` : ''}바뀜`;
      return `<td${at(d, 'tt-changed')} aria-label="${escapeHTML(label)}"><b>${escapeHTML(subject)}</b>${why}${tag}</td>`;
    });
    body.push(`<tr><th scope="row">${p}<span class="sr-only">교시</span></th>${tds.join('')}</tr>`);
  }
  const caption = `${cls.name} 시간표 ${weekRange(mondayOf(weekDays[0]))}`;
  return `<table class="tt-grid"><caption class="sr-only">${escapeHTML(caption)}</caption><thead><tr><td class="tt-corner"></td>${head}</tr></thead><tbody>${body.join('')}</tbody></table>`;
}

/** 「오늘 바뀐 수업」 안내판이 다룰 날: 오늘, 주말·쉬는 날이면 다음 등교일(날짜를 제목 옆에). */
export function changesTarget(cls: ClassTimetable, today: string): { ymd: string; label: string; empty: string; date: string } {
  const offs = cls.days.filter((d) => d.off).map((d) => ({ start: d.ymd, end: d.ymd }));
  const closed = ['토', '일'].includes(weekday(today)) || offs.some((o) => o.start === today);
  if (!closed) return { ymd: today, label: '오늘 바뀐 수업', empty: '바뀐 수업 없어요', date: '' };
  const ymd = nextSchoolDay(today, offs);
  return { ymd, label: '다음 등교일 바뀐 수업', empty: '바뀐 수업 없어요', date: mdw(ymd) };
}

/** 안내판: 줄 = 「1교시」 · 굵은 과목 + 줄 그은 원래 과목. 없으면 「바뀐 수업 없어요」, 그날이 피드에 없으면 「그날 시간표가 아직 없어요」. */
export function changesBoxHTML(cls: ClassTimetable, ymd: string, label: string, empty = '바뀐 수업 없어요', date = ''): string {
  const { cells, until } = changesOf(cls, ymd);
  const rows = cells.map((c) => `<li><span>${c.period}교시</span><span><b>${escapeHTML(c.subject || '수업 없음')}</b>${changeWhyHTML(itemOf(c))}</span></li>`);
  if (until !== null) rows.push(`<li><span>${until + 1}교시부터</span><span>수업 없음</span></li>`);
  // 피드에 그 날짜가 없으면 「바뀐 수업 없음」이라고 단정하지 않는다.
  const none = cls.days.some((d) => d.ymd === ymd) ? empty : '그날 시간표가 아직 없어요';
  const list = rows.length ? `<ul class="sign-rows tt-change-rows">${rows.join('')}</ul>` : `<p class="sign-note">${escapeHTML(none)}</p>`;
  const when = date ? `<span class="sign-date">${escapeHTML(date)}</span>` : '';
  return `<section class="sign tt-changes" aria-labelledby="tt-changes-title"><div class="sign-head"><h2 id="tt-changes-title">${escapeHTML(label)}</h2>${when}</div>${list}</section>`;
}
