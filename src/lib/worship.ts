// 나이스 학사일정에는 수요일 예배가 「학생예배」「성탄절예배」로 들어 있다. 학교는 공식 알림에 「예배」라는 말을 쓰지 않으므로,
// 학생·학부모에게 나눠 준 학사일정표에 적힌 그날 제목으로 바꿔 보여 주고, 제목이 없는 날의 예배 일정은 싣지 않는다.
// 학년도마다 이 표를 새로 옮겨 적는다.
import { addDays } from './dates.ts';
import type { FeedScheduleItem } from './feed.ts';

const WORSHIP = /예배/;

/** 2026학년도: 「2026 학사일정(학생·학부모용).xlsx」의 예배 제목(날짜 → 제목). */
export const WORSHIP_TITLES: Record<string, string> = {
  '2026-03-18': '새로운 변화',
  '2026-04-08': '새로운 생명',
  '2026-05-27': '존재의 이유',
  '2026-05-28': '하나되는 공동체',
  '2026-06-17': '나라를 사랑하는 마음',
  '2026-07-15': '반성하는 삶',
  '2026-08-26': '나로부터 시작되는 변화',
  '2026-09-23': '생명의 소중함을 아는 삶',
  '2026-10-21': '회복 탄력성',
  '2026-11-18': '감사하는 삶',
  '2026-12-23': '사랑하는 삶',
};

/** 「예배」가 든 항목을 그날 제목으로. 여러 날에 걸쳤으면 하루씩 나누고, 제목이 없는 날은 뺀다. */
export function withWorshipTitles(schedule: FeedScheduleItem[] | null, titles: Record<string, string> = WORSHIP_TITLES): FeedScheduleItem[] | null {
  if (!schedule) return schedule;
  return schedule.flatMap((item) => {
    if (!WORSHIP.test(item.title)) return [item];
    const days: string[] = [];
    for (let d = item.start; d <= item.end; d = addDays(d, 1)) days.push(d);
    return days.filter((d) => titles[d]).map((d) => ({ ...item, title: titles[d], start: d, end: d }));
  });
}
