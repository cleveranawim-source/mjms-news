import { getFeed, type FeedLetter, type FeedScheduleItem } from './feed.ts';

// 피드를 화면에서 쓰기 좋게 고른다. 학년이 비어 있으면 모든 학년 대상이다.
const ALL = [1, 2, 3];
export const gradesOrAll = (grades: number[]) => (grades.length > 0 ? grades : ALL);

export async function getLetters(): Promise<FeedLetter[]> {
  const { letters } = await getFeed();
  return [...letters].sort((a, b) => b.postedOn.localeCompare(a.postedOn) || a.subject.localeCompare(b.subject));
}

// 학사일정을 시작일 순(같은 날은 이름 순)으로. 피드에 없으면 null.
export function sortSchedule(schedule: FeedScheduleItem[] | null): FeedScheduleItem[] | null {
  return schedule && [...schedule].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

// 나이스 학사일정(start 순). 피드에 없으면 null.
export async function getSchedule(): Promise<FeedScheduleItem[] | null> {
  return sortSchedule((await getFeed()).schedule);
}
