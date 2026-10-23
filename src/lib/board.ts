// 첫 화면 칠판에 적을 내용을 고르고 HTML로 만든다.
// 빌드할 때와 브라우저에서 같은 함수를 써서, 사이트를 다시 빌드하지 않아도 '오늘'이 맞게 보이게 한다.
import { formatDate, nextSchoolDay, offRanges } from './dates.ts';
import type { Feed } from './feed.ts';
import { badgeHTML } from './grades.ts';
import { escapeHTML as escape } from './html.ts';
import { pickMeal, type MealView } from './meal.ts';
import { changeItems, type ChangeItem, type TimetableFeed } from './timetable.ts';

export type BoardEvent = { title: string; start: string; end: string; grades: number[] };

type Item = { item: string; grades: number[]; slug: string };

export type Board = {
  today: string;
  next: string;
  events: BoardEvent[];
  bringToday: Item[];
  bringNext: Item[];
  meal: MealView | null; // 오늘 급식, 없으면 다음 등교일 급식(칠판 밖 급식 안내판이 쓴다)
  dayOff: string | null; // 오늘이 쉬는 날이면 그 이름
};

export function boardFromFeed(today: string, feed: Pick<Feed, 'letters' | 'daysOff' | 'meals'> & { schedule?: Feed['schedule'] }): Board {
  const all = [1, 2, 3];
  // 학년이 비어 있으면 전 학년 대상이다(목록·일정 화면과 같은 규칙).
  const daysOff = offRanges(feed);
  const letters = feed.letters.map((l) => ({ ...l, grades: l.grades.length ? l.grades : all }));
  // 쉬는 날·공휴일은 「오늘은 ○○입니다」 줄로 쓰므로 오늘 일정에는 행사만.
  const events = (feed.schedule ?? []).filter((e) => e.kind === 'event').map((e) => ({ title: e.title, start: e.start, end: e.end, grades: e.grades.length ? e.grades : all }));
  const next = nextSchoolDay(today, daysOff);
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
    dayOff: daysOff.find((d) => d.start <= today && today <= d.end)?.title ?? null,
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

export function boardHTML(board: Board, base: string): string {
  const noticeHref = (slug: string) => `${base}notices/${slug}/`;
  const dayOff = board.dayOff ? `<p class="board-dayoff">오늘은 ${escape(board.dayOff)}입니다</p>` : '';
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
  const next = board.bringNext.length
    ? `<div class="board-group--opt"><p class="board-when">${escape(formatDate(board.next))} 준비물</p>${items(bringItems(board.bringNext))}</div>`
    : '';
  const bring = `<section class="board-group board-bring"><h2 class="board-sub board-sub--bring">챙길 것</h2>${today}${next}<p class="board-none board-bring-none">챙길 것 없어요</p></section>`;
  const events = board.events.length
    ? `<section class="board-group board-group--opt"><h2 class="board-sub">오늘 일정</h2>${items(board.events.map((e) => li(e.title, e.grades)))}</section>`
    : '';
  return dayOff + changes + bring + events;
}

export type ChangesState =
  | { kind: 'lines'; lines: (ChangeItem | string)[] }
  | { kind: 'none' }
  | { kind: 'nofeed' }
  | { kind: 'error' }
  | { kind: 'loading' };

function changeLi(line: ChangeItem | string): string {
  if (typeof line === 'string') return `<li>${escape(line)}</li>`;
  // 줄긋기는 화면 읽기에서 들리지 않으므로 「원래」를 숨은 글자로 함께 둔다.
  const from = line.from ? ` <s><span class="sr-only">원래 </span>${escape(line.from)}</s>` : '';
  const note = line.note ? ` <small>${escape(line.note)}</small>` : '';
  return `<li>${escape(line.text)}${from}${note}</li>`;
}

/** 칠판 「오늘 바뀐 수업」: 줄, 또는 상태 문구(없어요 · 아직 없어요 · 못 불러옴 + 다시 불러오기). */
export function changesStateHTML(state: ChangesState): string {
  const head = '<h2 class="board-sub board-sub--changes">오늘 바뀐 수업</h2>';
  const none = (text: string) => `<p class="board-none">${text}</p>`;
  switch (state.kind) {
    case 'lines':
      return head + items(state.lines.map(changeLi), 'changes');
    case 'none':
      return head + none('바뀐 수업 없어요');
    case 'nofeed':
      return head + none('오늘 시간표가 아직 없어요');
    case 'loading':
      return head + none('불러오는 중…');
    case 'error':
      return head + none('바뀐 수업을 불러오지 못했어요') + '<button type="button" data-retry-changes>다시 불러오기</button>';
  }
}

/** 받은 시간표로 고른 반의 그날 상태를 정한다. 피드가 그날을 쉬는 날로 적었으면 null(소제목을 쓰지 않는다). */
export function changesFor(feed: TimetableFeed | null, classId: string, ymd: string): ChangesState | null {
  if (!feed) return { kind: 'error' };
  const day = feed.classes.find((c) => c.id === classId)?.days.find((d) => d.ymd === ymd);
  // 반이나 그날이 피드에 없으면 「바뀐 수업 없음」이라고 단정하지 않는다.
  if (!day) return { kind: 'nofeed' };
  if (day.off) return null;
  const lines = changeItems(feed, classId, ymd);
  return lines.length ? { kind: 'lines', lines } : { kind: 'none' };
}
