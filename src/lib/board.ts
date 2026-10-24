// 첫 화면 칠판에 적을 내용을 고르고 HTML로 만든다.
// 빌드할 때와 브라우저에서 같은 함수를 써서, 사이트를 다시 빌드하지 않아도 '오늘'이 맞게 보이게 한다.
import { addDays, formatDate, nextSchoolDay, offRanges, weekday } from './dates.ts';
import type { Feed } from './feed.ts';
import { badgeHTML } from './grades.ts';
import { escapeHTML as escape } from './html.ts';
import { pickMeal, type MealView } from './meal.ts';
import { changeItems, changeWhyHTML, type ChangeItem, type TimetableFeed } from './timetable.ts';

export type BoardEvent = { title: string; start: string; end: string; grades: number[] };
export type BoardDday = { title: string; start: string; days: number; grades: number[] };

type Item = { item: string; grades: number[]; slug: string };

export type Board = {
  today: string;
  next: string;
  events: BoardEvent[];
  bringToday: Item[];
  bringNext: Item[];
  meal: MealView | null; // 오늘 급식, 없으면 다음 등교일 급식(칠판 밖 급식 안내판이 쓴다)
  dayOff: string | null; // 오늘이 쉬는 날이면 그 이름
  closed: boolean; // 주말이거나 쉬는 날: 칠판은 다음 등교일(next)을 알린다
  dday: BoardDday[]; // 칠판 귀퉁이 「기말고사 D-2」 후보, 가까운 순(학년마다 CSS가 첫 줄만 보인다)
};

// 교실 칠판 귀퉁이에 적어 두는 D-day: 시험·방학과 학생들이 기다리는 행사만. 회의·교육·예배는 빼고, 쉬는 날은 방학만.
const DDAY_EVENT = /고사|평가|수련회|체육|축제|festival|졸업식|수학여행|현장체험|나들이|탐방/i;
const DDAY_OFF = /방학/;
const DDAY_DAYS = 60;

function ddays(today: string, schedule: Feed['schedule'] | undefined): BoardDday[] {
  const last = addDays(today, DDAY_DAYS);
  return (schedule ?? [])
    .filter((s) => s.start > today && s.start <= last && (s.kind === 'event' ? DDAY_EVENT : s.kind === 'dayoff' ? DDAY_OFF : null)?.test(s.title))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => ({
      title: s.title,
      start: s.start,
      days: Math.round((Date.parse(s.start) - Date.parse(today)) / 86400000),
      grades: s.grades.length ? s.grades : [1, 2, 3],
    }));
}

export function boardFromFeed(today: string, feed: Pick<Feed, 'letters' | 'daysOff' | 'meals'> & { schedule?: Feed['schedule'] }): Board {
  const all = [1, 2, 3];
  // 학년이 비어 있으면 전 학년 대상이다(목록·일정 화면과 같은 규칙).
  const daysOff = offRanges(feed);
  const letters = feed.letters.map((l) => ({ ...l, grades: l.grades.length ? l.grades : all }));
  // 전 학년 쉬는 날·공휴일은 「오늘은 ○○입니다」 줄로 쓰므로 오늘 일정에는 행사와 학년만 쉬는 날만.
  const events = (feed.schedule ?? []).filter((e) => e.kind === 'event' || e.grades.length > 0).map((e) => ({ title: e.title, start: e.start, end: e.end, grades: e.grades.length ? e.grades : all }));
  const next = nextSchoolDay(today, daysOff);
  const dayOff = daysOff.find((d) => d.start <= today && today <= d.end)?.title ?? null;
  const bringOn = (day: string) =>
    letters
      .filter((l) => l.due === day)
      .flatMap((l) => l.bring.map((item) => ({ item, grades: l.grades, slug: l.id })));
  return {
    today,
    next,
    events: events.filter((e) => e.start <= today && today <= e.end),
    bringToday: bringOn(today),
    bringNext: bringOn(next),
    meal: pickMeal(today, feed.meals, daysOff),
    dayOff,
    closed: ['토', '일'].includes(weekday(today)) || dayOff !== null,
    dday: ddays(today, feed.schedule),
  };
}

// 학년이 정해진 것에는 학년 배지(글자)를 붙인다. 반을 골랐으면 그 학년 것만 보이므로 CSS가 배지를 감춘다.
function li(text: string, grades: number[], href?: string): string {
  const body = href ? `<a href="${escape(href)}">${escape(text)}</a>` : escape(text);
  const badge = grades.length < 3 ? ` ${badgeHTML(grades, 'board-badge')}` : '';
  return `<li data-grades="${grades.join(' ')}">${body}${badge}</li>`;
}

// 빈 칸은 아예 그리지 않는다. 학년을 고르면 그 학년 것이 없는 칸은 CSS가 숨긴다(board-group--opt).
function items(list: string[], kind = ''): string {
  return `<ul class="board-items${kind ? ` board-items--${kind}` : ''}">${list.join('')}</ul>`;
}

// 몇 교시까지인지(「· 6교시까지」)는 브라우저가 우리 반 시간표를 받아 data-board-until에 채운다.
const until = '<span class="board-until" data-board-until></span>';

export function boardHTML(board: Board, base: string): string {
  const noticeHref = (slug: string) => `${base}notices/${slug}/`;
  const day = formatDate(board.today).replace(/ \(.\)$/, '');
  // 날짜(손글씨)·요일. 등교일이면 그 끝에 몇 교시까지, 쉬는 날이면 아래 「다음 등교」 줄에.
  const date = `<p class="board-date" id="board-date"><span class="board-day">${day}</span> <span class="board-weekday">${weekday(board.today)}요일</span>${board.closed ? '' : until}</p>`;
  const dday = board.dday.length
    ? `<ul class="board-dday">${board.dday
        .map((d) => {
          const badge = d.grades.length < 3 ? ` ${badgeHTML(d.grades, 'board-badge')}` : '';
          return `<li data-grades="${d.grades.join(' ')}"><span class="board-dday-name">${escape(d.title)}</span>${badge} <b>D-${d.days}</b></li>`;
        })
        .join('')}</ul>`
    : '';
  const head = `<div class="board-top">${date}${dday}</div>`;
  const dayOff = board.dayOff ? `<p class="board-dayoff">오늘은 ${escape(board.dayOff)}입니다</p>` : '';
  const next = board.closed ? `<p class="board-next">다음 등교 <b>${escape(formatDate(board.next))}</b>${until}</p>` : '';
  // 「오늘 바뀐 수업」은 브라우저가 우리 반 시간표를 받아 채운다(changesStateHTML).
  const changes = '<div data-board-changes></div>';
  // 준비물은 가정통신문 한 장에 한 줄로 모은다(「도시락, 물병」 + 학년 배지 하나, 누르면 그 가정통신문).
  const bringItems = (list: Board['bringToday']) =>
    [...new Set(list.map((b) => b.slug))].map((slug) => {
      const mine = list.filter((b) => b.slug === slug);
      return li(mine.map((b) => b.item).join(', '), mine[0].grades, noticeHref(slug));
    });
  // 챙길 것: 오늘 것 + 다음 등교일 준비물. 고른 학년 기준으로 하나도 없으면 「챙길 것 없어요」만 보인다(CSS).
  const today = board.bringToday.length ? `<div class="board-group--opt">${items(bringItems(board.bringToday))}</div>` : '';
  const nextBring = board.bringNext.length
    ? `<div class="board-group--opt"><p class="board-when">${escape(formatDate(board.next))} 준비물</p>${items(bringItems(board.bringNext))}</div>`
    : '';
  const bring = `<section class="board-group board-bring"><h2 class="board-sub board-sub--bring">챙길 것</h2>${today}${nextBring}<p class="board-none board-bring-none">챙길 것 없어요</p></section>`;
  const events = board.events.length
    ? `<section class="board-group board-group--opt"><h2 class="board-sub">오늘 일정</h2>${items(board.events.map((e) => li(e.title, e.grades)))}</section>`
    : '';
  return head + dayOff + next + changes + bring + events;
}

export type ChangesState =
  | { kind: 'lines'; lines: (ChangeItem | string)[] }
  | { kind: 'none' }
  | { kind: 'nofeed' }
  | { kind: 'error' }
  | { kind: 'loading' };

function changeLi(line: ChangeItem | string): string {
  if (typeof line === 'string') return `<li>${escape(line)}</li>`;
  return `<li>${escape(line.text)}${changeWhyHTML(line)}</li>`;
}

/** 칠판 「오늘 바뀐 수업」(쉬는 날이면 「다음 등교일 바뀐 수업」): 줄, 또는 상태 문구(없어요 · 아직 없어요 · 못 불러옴 + 다시 불러오기). */
export function changesStateHTML(state: ChangesState, next = false): string {
  const head = `<h2 class="board-sub board-sub--changes">${next ? '다음 등교일' : '오늘'} 바뀐 수업</h2>`;
  const none = (text: string) => `<p class="board-none">${text}</p>`;
  switch (state.kind) {
    case 'lines':
      return head + items(state.lines.map(changeLi), 'changes');
    case 'none':
      return head + none('바뀐 수업 없어요');
    case 'nofeed':
      return head + none(next ? '그날 시간표가 아직 없어요' : '오늘 시간표가 아직 없어요');
    case 'loading':
      return head + none('불러오는 중…');
    case 'error':
      return head + none('바뀐 수업을 불러오지 못했어요') + '<button type="button" data-retry-changes>다시 불러오기</button>';
  }
}

/** 받은 시간표로 고른 반의 그날 상태를 정한다. 피드가 그날을 쉬는 날로 적었으면 null(소제목을 쓰지 않는다). */
export function changesFor(feed: TimetableFeed | null, classId: string, ymd: string, next = false): ChangesState | null {
  if (!feed) return { kind: 'error' };
  const day = feed.classes.find((c) => c.id === classId)?.days.find((d) => d.ymd === ymd);
  // 반이나 그날이 피드에 없으면 「바뀐 수업 없음」이라고 단정하지 않는다.
  if (!day) return { kind: 'nofeed' };
  if (day.off) return null;
  const lines = changeItems(feed, classId, ymd, next ? '그날은' : '오늘은');
  return lines.length ? { kind: 'lines', lines } : { kind: 'none' };
}
