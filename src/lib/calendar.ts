// 학사일정 달력. 빌드(첫 그림)와 브라우저(달 넘기기·날 고르기)가 같은 함수로 그린다. 모두 순수 함수.
// 학년 grade가 있으면 그 학년 + 전 학년(grades가 빈) 일정만, null이면 모두.
import { addDays, weekday } from './dates.ts';
import type { FeedScheduleItem } from './feed.ts';
import { escapeHTML } from './html.ts';
import { scheduleBadgeHTML } from './home.ts';

type Item = FeedScheduleItem;

const md = (ymd: string) => ({ m: Number(ymd.slice(5, 7)), d: Number(ymd.slice(8, 10)) });
const fits = (i: Item, grade: number | null) => grade === null || i.grades.length === 0 || i.grades.includes(grade);

function daysIn(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 그 달을 일요일부터 7칸씩. 앞뒤 달 칸을 채워 5주(35칸) 또는 6주(42칸). */
export function monthCells(ym: string): { ymd: string; inMonth: boolean }[] {
  const first = `${ym}-01`;
  const lead = new Date(`${first}T00:00:00Z`).getUTCDay();
  const total = Math.max(35, Math.ceil((lead + daysIn(ym)) / 7) * 7);
  const start = addDays(first, -lead);
  return Array.from({ length: total }, (_, k) => {
    const ymd = addDays(start, k);
    return { ymd, inMonth: ymd.startsWith(ym) };
  });
}

/** 그날에 걸친 일정(여러 날 일정은 걸친 모든 날). */
export function itemsOn(ymd: string, items: Item[], grade: number | null): Item[] {
  return items.filter((i) => i.start <= ymd && ymd <= i.end && fits(i, grade));
}

/** 그 달에 걸친 일정. 여러 달에 걸치면 달마다 한 번. */
export function monthItems(ym: string, items: Item[], grade: number | null): Item[] {
  return items.filter((i) => i.start.slice(0, 7) <= ym && ym <= i.end.slice(0, 7) && fits(i, grade));
}

/** 오늘이 든 학년도의 12달(3월 ~ 다음 해 2월). 1·2월은 전 해 3월의 학년도. 피드는 이 범위를 보낸다. */
export function monthsOf(_items: Item[], today: string): string[] {
  const y = Number(today.slice(0, 4));
  const from = Number(today.slice(5, 7)) >= 3 ? y : y - 1;
  return Array.from({ length: 12 }, (_, k) => {
    const m = ((k + 2) % 12) + 1;
    return `${m >= 3 ? from : from + 1}-${String(m).padStart(2, '0')}`;
  });
}

/** 처음 고른 날: 오늘이 그 달이면 오늘, 아니면 그 달 첫 일정 날(앞 달에서 이어지면 1일), 없으면 1일. items는 이미 거른 것을 준다. */
export function initialDay(ym: string, today: string, items: Item[]): string {
  if (today.startsWith(ym)) return today;
  const first = monthItems(ym, items, null)[0];
  const day1 = `${ym}-01`;
  return first && first.start > day1 ? first.start : day1;
}

/** 날짜 단추 읽기 이름: 「10월 7일, 일정 1개」. */
export function dayLabel(ymd: string, count: number): string {
  const { m, d } = md(ymd);
  return `${m}월 ${d}일, ${count > 0 ? `일정 ${count}개` : '일정 없음'}`;
}

/** 달 목록의 날짜: 「3일 토」, 「7~8일」, 달을 넘으면 「9월 30일~10월 2일」(요일 없이). */
export function rangeLabel({ start, end }: { start: string; end: string }): string {
  const a = md(start);
  const b = md(end);
  if (start === end) return `${a.d}일 ${weekday(start)}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${a.d}~${b.d}일`;
  return `${a.m}월 ${a.d}일~${b.m}월 ${b.d}일`;
}

/** 고른 날 안내판 제목: 「10월 23일 금요일」. */
export function dayTitle(ymd: string): string {
  const { m, d } = md(ymd);
  return `${m}월 ${d}일 ${weekday(ymd)}요일`;
}

/** 달 목록 안내판 제목: 「10월 일정 전체」. */
export function monthTitle(ym: string): string {
  return `${Number(ym.slice(5, 7))}월 일정 전체`;
}

/** 달력 칸. 그 달 날짜는 단추(읽기 이름·고른 날 aria-pressed), 앞뒤 달은 흐린 글자(읽지 않음). 점은 장식. */
export function gridHTML(ym: string, today: string, selected: string, items: Item[], grade: number | null): string {
  return monthCells(ym)
    .map(({ ymd, inMonth }) => {
      const d = Number(ymd.slice(8, 10));
      if (!inMonth) return `<span class="cal-out" aria-hidden="true">${d}</span>`;
      const on = itemsOn(ymd, items, grade);
      const off = on.some((i) => i.kind !== 'event');
      const dow = weekday(ymd);
      const cls = ['cal-day', dow === '일' && 'is-sun', dow === '토' && 'is-sat', off && 'is-off', ymd === today && 'is-today'].filter(Boolean).join(' ');
      const dot = on.length > 0 ? '<i class="cal-dot" aria-hidden="true"></i>' : '';
      return `<button type="button" class="${cls}" data-ymd="${ymd}" aria-label="${dayLabel(ymd, on.length)}" aria-pressed="${ymd === selected}">${d}${dot}</button>`;
    })
    .join('');
}

const row = (i: Item) => `<span class="sign-title">${escapeHTML(i.title)}</span>${scheduleBadgeHTML(i)}`;

/** 고른 날 안내판 내용: 이름 · 배지 줄, 없으면 「이날은 학사일정이 없어요」. */
export function dayRowsHTML(ymd: string, items: Item[], grade: number | null): string {
  const on = itemsOn(ymd, items, grade);
  if (on.length === 0) return '<p class="sign-note">이날은 학사일정이 없어요</p>';
  return `<ul class="sign-rows sign-rows--day">${on.map((i) => `<li>${row(i)}</li>`).join('')}</ul>`;
}

/** 달 목록 안내판 내용: 날짜 · 이름 · 배지. 긴 날짜는 「~」 뒤에서 줄을 바꿀 수 있게. */
export function monthRowsHTML(ym: string, items: Item[], grade: number | null): string {
  const list = monthItems(ym, items, grade);
  if (list.length === 0) return '<p class="sign-note">이달에는 학사일정이 없어요</p>';
  const date = (i: Item) => {
    const text = escapeHTML(rangeLabel(i));
    return i.start.slice(0, 7) === i.end.slice(0, 7) ? text : text.replace(/ /g, '&nbsp;').replace('~', '~<wbr>');
  };
  return `<ul class="sign-rows sign-rows--cal">${list.map((i) => `<li><span class="sign-date">${date(i)}</span>${row(i)}</li>`).join('')}</ul>`;
}
