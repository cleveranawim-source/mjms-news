// 첫 화면 칠판에 적을 내용을 고르고 HTML로 만든다.
// 빌드할 때와 브라우저에서 같은 함수를 써서, 사이트를 다시 빌드하지 않아도 '오늘'이 맞게 보이게 한다.
import { formatDate, mergeDaysOff, nextSchoolDay } from './dates.ts';
import type { Feed } from './feed.ts';
import { escapeHTML as escape } from './html.ts';
import { mealHTML, pickMeal, type MealView } from './meal.ts';

export type BoardEvent = { title: string; start: string; end: string; grades: number[] };

type Item = { item: string; grades: number[]; slug: string };

export type Board = {
  today: string;
  next: string;
  events: BoardEvent[];
  bringToday: Item[];
  bringNext: Item[];
  meal: MealView | null; // 오늘 급식, 없으면 다음 등교일 급식
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

  return {
    today,
    next,
    events: [...events.filter((e) => e.start <= today && today <= e.end), ...letterEvents],
    bringToday: bringOn(today),
    bringNext: bringOn(next),
    meal: pickMeal(today, feed.meals, daysOff),
    dayOff: daysOff.find((d) => d.start <= today && today <= d.end)?.title ?? null,
  };
}

function li(text: string, grades: number[], href?: string): string {
  const body = href ? `<a href="${escape(href)}">${escape(text)}</a>` : escape(text);
  return `<li data-grades="${grades.join(' ')}">${body}</li>`;
}

// 빈 칸은 아예 그리지 않는다. 학년을 고르면 그 학년 것이 없는 칸은 CSS가 숨긴다.
// kind: 제목 분필 색(CSS). inline: 준비물처럼 짧은 낱말은 한 줄에 이어 적는다.
function group(title: string, items: string[], kind: string, inline = false): string {
  if (items.length === 0) return '';
  return `<section class="board-group board-group--opt board-group--${kind}${inline ? ' board-group--inline' : ''}"><h2>${title}</h2><ul>${items.join('')}</ul></section>`;
}

export function boardHTML(board: Board, base: string): string {
  const noticeHref = (slug: string) => `${base}notices/${slug}/`;
  const dayOff = board.dayOff ? `<p class="board-dayoff">오늘은 ${escape(board.dayOff)}입니다</p>` : '';
  // 챙길 것이 하나도 없으면(고른 학년 기준) '챙길 것 없어요' 한 줄만 보인다.
  const bring =
    '<div class="board-bring"><p class="board-bring-none"><b>챙길 것</b> <span>없어요</span></p>' +
    group('오늘 챙길 것', board.bringToday.map((b) => li(b.item, b.grades, noticeHref(b.slug))), 'bring', true) +
    group(`${formatDate(board.next)} 준비물`, board.bringNext.map((b) => li(b.item, b.grades, noticeHref(b.slug))), 'bring', true) +
    '</div>';
  const meal = board.meal ? `<section class="board-group board-meal">${mealHTML(board.meal)}</section>` : '';
  // 새 알림은 칠판 쪽지와 '최근 알림' 목록에 있으므로 칠판 줄로는 쓰지 않는다.
  return dayOff + bring + meal + group('오늘 일정', board.events.map((e) => li(e.title, e.grades)), 'events');
}
