import { mergeDaysOff } from './dates.ts';
import { getFeed, type FeedLetter } from './feed.ts';

// 피드를 화면에서 쓰기 좋게 고른다. 학년이 비어 있으면 모든 학년 대상이다.
const ALL = [1, 2, 3];
export const gradesOrAll = (grades: number[]) => (grades.length > 0 ? grades : ALL);

export async function getLetters(): Promise<FeedLetter[]> {
  const { letters } = await getFeed();
  return [...letters].sort((a, b) => b.postedOn.localeCompare(a.postedOn) || a.subject.localeCompare(b.subject));
}

export type ScheduleEntry = { title: string; start: string; end: string; grades: number[]; dayOff: boolean };

// 공개 일정과 쉬는 날을 날짜순으로 섞는다.
export async function getScheduleEntries(): Promise<ScheduleEntry[]> {
  const { events, daysOff } = await getFeed();
  return [
    ...events.map((e) => ({ ...e, grades: gradesOrAll(e.grades), dayOff: false })),
    ...mergeDaysOff(daysOff).map((d) => ({ ...d, grades: ALL, dayOff: true })),
  ].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export function groupByMonth<T>(items: T[], dateOf: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateOf(item).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups];
}
