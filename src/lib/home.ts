// 첫 화면 안내판(다가오는 일정 · 새 가정통신문)에 올릴 줄을 고른다.
// 보기(전체·1·2·3학년)마다 앞에서 몇 개만 보이게, 줄마다 어느 보기에 들어가는지 data-show로 적어 둔다(CSS가 <html data-grade>로 고른다).
import { addDays } from './dates.ts';
import type { FeedLetter, FeedScheduleItem } from './feed.ts';

const VIEWS = ['all', '1', '2', '3'];
// 보기마다 n개에 더해 예비 줄을 2개 더 보낸다. 브라우저가 지난 줄을 빼도 보기가 모자라지 않게(visibleShows).
const SPARE = 2;

/** show = 처음 보일 보기(자바스크립트 없이도 이것만), spare = 예비로 실린 보기. */
type Row<T> = { item: T; show: string; spare: string };

function perView<T>(items: T[], gradesOf: (item: T) => number[], n: number): Row<T>[] {
  const fits = (item: T, v: string) => v === 'all' || gradesOf(item).length === 0 || gradesOf(item).includes(Number(v));
  const firsts = new Map(VIEWS.map((v) => [v, items.filter((i) => fits(i, v)).slice(0, n + SPARE)]));
  const at = (item: T, v: string) => firsts.get(v)!.indexOf(item);
  return items
    .map((item) => ({
      item,
      show: VIEWS.filter((v) => at(item, v) >= 0 && at(item, v) < n).join(' '),
      spare: VIEWS.filter((v) => at(item, v) >= n).join(' '),
    }))
    .filter((r) => r.show || r.spare);
}

/** 브라우저가 줄을 뺀 뒤 남은 줄(순서대로)의 새 data-show: 보기마다 앞에서 n개. */
export function visibleShows(rows: { show: string; spare: string }[], n: number): string[] {
  const left = new Map(VIEWS.map((v) => [v, n]));
  return rows.map((r) => {
    const views = `${r.show} ${r.spare}`.split(' ');
    const out = VIEWS.filter((v) => views.includes(v) && left.get(v)! > 0);
    for (const v of out) left.set(v, left.get(v)! - 1);
    return out.join(' ');
  });
}

export const UPCOMING_N = 2;
export const LETTERS_N = 3;

/** 다가오는 일정 = 오늘 뒤에 시작하는 학사일정(오늘에 걸친 것은 칠판 「오늘 일정」에 있다), 보기마다 가까운 2개. 피드에 학사일정이 없으면 null. schedule은 시작일 순이어야 한다. */
export function upcomingRows(schedule: FeedScheduleItem[] | null, today: string): Row<FeedScheduleItem>[] | null {
  if (!schedule) return null;
  return perView(schedule.filter((s) => s.start > today), (s) => s.grades, UPCOMING_N);
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
  return perView(recent, (l) => l.grades, LETTERS_N);
}
