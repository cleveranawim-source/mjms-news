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

// '없어요'(list-empty)를 목록보다 앞에 두어야 비었을 때 제목 옆에 붙는다.
// inline: 준비물처럼 짧은 낱말은 한 줄에 이어 적는다.
function group(title: string, items: string[], empty: string, inline = false): string {
  return `<section class="board-group filter-group${inline ? ' board-group--inline' : ''}"><h2>${title}</h2><p class="list-empty">${empty}</p><ul>${items.join('')}</ul></section>`;
}

export function boardHTML(board: Board, base: string): string {
  const noticeHref = (slug: string) => `${base}notices/${slug}/`;
  // 학부모가 아침에 가장 먼저 찾는 '챙길 것'부터 적는다.
  return [
    group('오늘 챙길 것', board.bringToday.map((b) => li(b.item, b.grades, noticeHref(b.slug))), '없어요', true),
    group(`${formatDate(board.next)} 준비물`, board.bringNext.map((b) => li(b.item, b.grades, noticeHref(b.slug))), '없어요', true),
    group('오늘 일정', board.events.map((e) => li(e.title, e.grades)), '없어요'),
    group('새로 올라온 알림', board.newNotices.map((n) => li(n.title, n.grades, noticeHref(n.slug))), '없어요'),
  ].join('');
}
