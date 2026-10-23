// 첫 화면 안내판(다가오는 일정 · 새 가정통신문)에 올릴 줄을 고른다.
// 보기(전체·1·2·3학년)마다 앞에서 몇 개만 보이게, 줄마다 어느 보기에 들어가는지 data-show로 적어 둔다(CSS가 <html data-grade>로 고른다).
import { addDays } from './dates.ts';
import type { FeedLetter, FeedScheduleItem } from './feed.ts';
import { badgeHTML } from './grades.ts';

const VIEWS = ['all', '1', '2', '3'];

type Row<T> = { item: T; show: string };

function perView<T>(items: T[], gradesOf: (item: T) => number[], n: number): Row<T>[] {
  const fits = (item: T, v: string) => v === 'all' || gradesOf(item).length === 0 || gradesOf(item).includes(Number(v));
  const first = new Map(VIEWS.map((v) => [v, items.filter((i) => fits(i, v)).slice(0, n)]));
  return items
    .map((item) => ({ item, show: VIEWS.filter((v) => first.get(v)!.includes(item)).join(' ') }))
    .filter((r) => r.show);
}

/** 끝이 오늘 이후인 학사일정, 보기마다 가까운 2개. 피드에 학사일정이 없으면 null. schedule은 시작일 순이어야 한다. */
export function upcomingRows(schedule: FeedScheduleItem[] | null, today: string): Row<FeedScheduleItem>[] | null {
  if (!schedule) return null;
  return perView(schedule.filter((s) => s.end >= today), (s) => s.grades, 2);
}

/** 「새 글」: 빌드일 기준 2주(14일) 안에 게시된 가정통신문. */
export function isNewLetter(l: FeedLetter, today: string): boolean {
  return l.publishedOn >= addDays(today, -14) && l.publishedOn <= today;
}

/** 2주 안에 게시된 가정통신문, 최근 것부터, 보기마다 3개. */
export function newLetterRows(letters: FeedLetter[], today: string): Row<FeedLetter>[] {
  const recent = letters
    .filter((l) => isNewLetter(l, today))
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || b.postedOn.localeCompare(a.postedOn));
  return perView(recent, (l) => l.grades, 3);
}

/** 일정 줄 끝의 배지: 공휴일·쉬는 날은 빨간 글자, 행사는 학년 배지. */
export function scheduleBadgeHTML(item: FeedScheduleItem): string {
  if (item.kind === 'holiday') return '<span class="badge-off">공휴일</span>';
  if (item.kind === 'dayoff') return '<span class="badge-off">쉬는 날</span>';
  return badgeHTML(item.grades);
}
