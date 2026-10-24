// 나이스 학사일정에는 수요일 예배가 「학생예배」로만 들어 있다. 학교가 학생·학부모에게 나눠 준 학사일정표에는
// 그날 예배 제목이 적혀 있으므로, 그 제목으로 바꿔 보여 준다. 학년도마다 이 표를 새로 옮겨 적는다.
import { addDays } from './dates.ts';
import type { FeedScheduleItem } from './feed.ts';

const NAME = '학생예배';

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

/** 「학생예배」 항목의 이름을 그날 제목으로. 여러 날에 걸쳤는데 제목이 있으면 하루씩 나눈다(제목 없는 날은 그대로 「학생예배」). */
export function withWorshipTitles(schedule: FeedScheduleItem[] | null, titles: Record<string, string> = WORSHIP_TITLES): FeedScheduleItem[] | null {
  if (!schedule) return schedule;
  return schedule.flatMap((item) => {
    if (item.title.trim() !== NAME) return [item];
    const days: string[] = [];
    for (let d = item.start; d <= item.end; d = addDays(d, 1)) days.push(d);
    if (!days.some((d) => titles[d])) return [item];
    if (days.length === 1) return [{ ...item, title: titles[days[0]] }];
    return days.map((d) => ({ ...item, title: titles[d] ?? NAME, start: d, end: d }));
  });
}
