// 첫 화면 칠판에 적을 내용을 고르고 HTML로 만든다.
// 빌드할 때와 브라우저에서 같은 함수를 써서, 사이트를 다시 빌드하지 않아도 '오늘'이 맞게 보이게 한다.
import { formatDate, nextSchoolDay } from './dates.ts';
import { escapeHTML as escape } from './html.ts';

export type BoardNotice = {
  slug: string;
  title: string;
  date: string;
  grades: number[];
  bring: string[];
  due?: string;
};

export type BoardEvent = {
  title: string;
  date: string;
  end?: string;
  grades: number[];
};

type Item = { item: string; grades: number[]; slug: string };

export type Board = {
  today: string;
  next: string;
  events: BoardEvent[];
  bringToday: Item[];
  bringNext: Item[];
  newNotices: BoardNotice[];
};

export function buildBoard(today: string, notices: BoardNotice[], events: BoardEvent[]): Board {
  const next = nextSchoolDay(today);
  const bringOn = (day: string) =>
    notices
      .filter((n) => n.due === day)
      .flatMap((n) => n.bring.map((item) => ({ item, grades: n.grades, slug: n.slug })));

  return {
    today,
    next,
    events: events.filter((e) => e.date <= today && today <= (e.end ?? e.date)),
    bringToday: bringOn(today),
    bringNext: bringOn(next),
    newNotices: notices.filter((n) => n.date === today),
  };
}

function li(text: string, grades: number[], href?: string): string {
  const body = href ? `<a href="${href}">${escape(text)}</a>` : escape(text);
  return `<li data-grades="${grades.join(' ')}">${body}</li>`;
}

function group(title: string, items: string[], empty: string): string {
  return `<section class="board-group filter-group"><h2>${title}</h2><ul>${items.join('')}</ul><p class="list-empty">${empty}</p></section>`;
}

export function boardHTML(board: Board, base: string): string {
  const noticeHref = (slug: string) => `${base}notices/${slug}/`;
  return [
    group('오늘 일정', board.events.map((e) => li(e.title, e.grades)), '특별한 일정이 없습니다.'),
    group('오늘 챙길 것', board.bringToday.map((b) => li(b.item, b.grades, noticeHref(b.slug))), '오늘 챙길 준비물이 없습니다.'),
    group(
      `${formatDate(board.next)} 준비물`,
      board.bringNext.map((b) => li(b.item, b.grades, noticeHref(b.slug))),
      '다음 등교일 준비물이 없습니다.',
    ),
    group('새로 올라온 알림', board.newNotices.map((n) => li(n.title, n.grades, noticeHref(n.slug))), '오늘 올라온 알림이 없습니다.'),
  ].join('');
}
