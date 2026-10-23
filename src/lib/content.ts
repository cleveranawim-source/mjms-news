import { offRanges } from './dates.ts';
import { getFeed, type FeedLetter, type FeedScheduleItem } from './feed.ts';

// 피드를 화면에서 쓰기 좋게 고른다. 학년이 비어 있으면 모든 학년 대상이다.
const ALL = [1, 2, 3];
export const gradesOrAll = (grades: number[]) => (grades.length > 0 ? grades : ALL);

export async function getLetters(): Promise<FeedLetter[]> {
  const { letters } = await getFeed();
  return [...letters].sort((a, b) => b.postedOn.localeCompare(a.postedOn) || a.subject.localeCompare(b.subject));
}

// 나이스 학사일정(start 순). 피드에 없으면 null.
export async function getSchedule(): Promise<FeedScheduleItem[] | null> {
  const { schedule } = await getFeed();
  return schedule && [...schedule].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export type ScheduleEntry = { title: string; start: string; end: string; grades: number[]; dayOff: boolean };

// N3/N5에서 화면을 새로 만들 때까지 옛 화면이 쓰는 어댑터: 학사일정 + 피드의 쉬는 날.
export async function getScheduleEntries(): Promise<ScheduleEntry[]> {
  const feed = await getFeed();
  const items = (feed.schedule ?? []).map((s) => ({ title: s.title, start: s.start, end: s.end, grades: gradesOrAll(s.grades), dayOff: s.kind !== 'event' }));
  const seen = new Set(items.filter((i) => i.dayOff).map((i) => `${i.start}~${i.end}`));
  const extra = offRanges({ daysOff: feed.daysOff }).filter((d) => !seen.has(`${d.start}~${d.end}`)).map((d) => ({ ...d, grades: ALL, dayOff: true }));
  const old = feed.events.map((e) => ({ ...e, grades: gradesOrAll(e.grades), dayOff: false })); // 옛 화면 호환
  return [...old, ...items, ...extra].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export function groupByMonth<T>(items: T[], dateOf: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateOf(item).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups];
}
