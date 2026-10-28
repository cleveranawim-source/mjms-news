import { getFeed, type FeedLetter, type FeedScheduleItem } from './feed.ts';

// 피드를 화면에서 쓰기 좋게 고른다. 학년이 비어 있으면 모든 학년 대상이다.
const ALL = [1, 2, 3];
export const gradesOrAll = (grades: number[]) => (grades.length > 0 ? grades : ALL);

// 원문 링크 글자. 학교 홈페이지 글이면 그대로, 이알리미에서 온 글(편지 PDF로 바로 간다)이나 해석 못 하는 주소면 「원문 보기(PDF)」.
export function sourceLabel(url: string): string {
  try {
    if (new URL(url).hostname === 'myongji.sen.ms.kr') return '학교 홈페이지 원문 보기';
  } catch {
    // 주소를 못 읽으면 아래 기본 글자
  }
  return '원문 보기(PDF)';
}

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
