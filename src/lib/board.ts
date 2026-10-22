// 첫 화면 칠판에 적을 내용을 고르고 HTML로 만든다.
// 빌드할 때와 브라우저에서 같은 함수를 써서, 사이트를 다시 빌드하지 않아도 '오늘'이 맞게 보이게 한다.
import { formatDate, mergeDaysOff, nextSchoolDay } from './dates.ts';
import type { Feed } from './feed.ts';
import { escapeHTML as escape } from './html.ts';

export type BoardNotice = { slug: string; title: string; grades: number[] };
export type BoardEvent = { title: string; start: string; end: string; grades: number[] };

type Item = { item: string; grades: number[]; slug: string };

export type Board = {
  today: string;
  next: string;
  events: BoardEvent[];
  bringToday: Item[];
  bringNext: Item[];
  newNotices: BoardNotice[];
  meal: { ymd: string; dishes: string[] } | null; // 칠판에는 그리지 않는다(급식 칸은 따로)
  dayOff: string | null; // 오늘이 쉬는 날이면 그 이름
};

export function boardFromFeed(today: string, feed: Pick<Feed, 'letters' | 'events' | 'daysOff' | 'meals'>): Board {
  const all = [1, 2, 3];
  // 학년이 비어 있으면 전 학년 대상이다(목록·일정 화면과 같은 규칙).
  const daysOff = mergeDaysOff(feed.daysOff);
  const letters = feed.letters.map((l) => ({ ...l, grades: l.grades.length ? l.grades : all }));
  const events = feed.events.map((e) => ({ ...e, grades: e.grades.length ? e.grades : all }));
  const next = nextSchoolDay(today, daysOff);
  const bringOn = (day: string) =>
    letters
      .filter((l) => l.due === day)
      .flatMap((l) => l.bring.map((item) => ({ item, grades: l.grades, slug: l.id })));
  // 가정통신문의 행사 날짜도 오늘 일정이다. 끝 날짜가 없으면 하루짜리.
  const letterEvents = letters
    .filter((l) => l.eventDate && l.eventDate <= today && today <= (l.eventEnd ?? l.eventDate))
    .map((l) => ({ title: l.subject, start: l.eventDate!, end: l.eventEnd ?? l.eventDate!, grades: l.grades }));
  const meal = feed.meals.find((m) => m.ymd === today);

  return {
    today,
    next,
    events: [...events.filter((e) => e.start <= today && today <= e.end), ...letterEvents],
    bringToday: bringOn(today),
    bringNext: bringOn(next),
    newNotices: letters.filter((l) => l.publishedOn === today).map((l) => ({ slug: l.id, title: l.subject, grades: l.grades })),
    meal: meal ? { ymd: meal.ymd, dishes: meal.dishes.map((d) => d.name) } : null,
    dayOff: daysOff.find((d) => d.start <= today && today <= d.end)?.title ?? null,
  };
}

function li(text: string, grades: number[], href?: string): string {
  const body = href ? `<a href="${escape(href)}">${escape(text)}</a>` : escape(text);
  return `<li data-grades="${grades.join(' ')}">${body}</li>`;
}

// '없어요'(list-empty)를 목록보다 앞에 두어야 비었을 때 제목 옆에 붙는다.
// inline: 준비물처럼 짧은 낱말은 한 줄에 이어 적는다.
function group(title: string, items: string[], empty: string, inline = false): string {
  return `<section class="board-group filter-group${inline ? ' board-group--inline' : ''}"><h2>${title}</h2><p class="list-empty">${empty}</p><ul>${items.join('')}</ul></section>`;
}

export function boardHTML(board: Board, base: string): string {
  const noticeHref = (slug: string) => `${base}notices/${slug}/`;
  // 학부모가 아침에 가장 먼저 찾는 '챙길 것'부터 적는다.
  const dayOff = board.dayOff ? `<p class="board-dayoff">오늘은 ${escape(board.dayOff)}입니다</p>` : '';
  return dayOff + [
    group('오늘 챙길 것', board.bringToday.map((b) => li(b.item, b.grades, noticeHref(b.slug))), '없어요', true),
    group(`${formatDate(board.next)} 준비물`, board.bringNext.map((b) => li(b.item, b.grades, noticeHref(b.slug))), '없어요', true),
    group('오늘 일정', board.events.map((e) => li(e.title, e.grades)), '없어요'),
    group('새로 올라온 알림', board.newNotices.map((n) => li(n.title, n.grades, noticeHref(n.slug))), '없어요'),
  ].join('');
}
