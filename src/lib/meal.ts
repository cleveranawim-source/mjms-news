// 첫 화면 「오늘 급식」 안내판. 빌드할 때와 브라우저에서 같은 함수로 그려, 날짜가 바뀌어도 맞게 보이게 한다.
import { formatDate, nextSchoolDay } from './dates.ts';
import type { FeedLetter, FeedMeal } from './feed.ts';
import { gradeLabel } from './grades.ts';
import { escapeHTML as escape } from './html.ts';

type Range = { start: string; end: string };

// 학교 급식 알레르기 표시 기준 번호 1~19
export const ALLERGENS: Record<number, string> = {
  1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀', 7: '고등어', 8: '게', 9: '새우', 10: '돼지고기',
  11: '복숭아', 12: '토마토', 13: '아황산류', 14: '호두', 15: '닭고기', 16: '쇠고기', 17: '오징어', 18: '조개류', 19: '잣',
};

export type MealView = { title: string; ymd: string; dishes: FeedMeal['dishes'] };

// 오늘 식단이 있으면 오늘 것, 없으면(주말·쉬는 날) 다음 등교일 것. 그것도 없으면 null.
export function pickMeal(today: string, meals: FeedMeal[], daysOff: Range[]): MealView | null {
  const todays = meals.find((m) => m.ymd === today);
  if (todays && todays.dishes.length > 0) return { title: '오늘 급식', ymd: today, dishes: todays.dishes };
  const next = meals.find((m) => m.ymd === nextSchoolDay(today, daysOff));
  if (next && next.dishes.length > 0) return { title: '다음 등교일 급식', ymd: next.ymd, dishes: next.dishes };
  return null;
}

// 가정통신문 요약에 「급식이 없」다고 적힌 행사(시험 기간 등): 그 기간·대상 학년에는 급식 판에 안내 줄을 단다.
// 나이스 식단은 학년을 나누지 않아 시험 보는 학년도 메뉴가 그대로 나오기 때문이다.
const NO_LUNCH = /급식(?:이|은|을)?\s*(?:없|하지 않|실시하지 않|미실시)/;
export type NoLunch = { id: string; grades: number[]; start: string; end: string };

export function noLunchRanges(letters: Pick<FeedLetter, 'id' | 'grades' | 'eventDate' | 'eventEnd' | 'summary'>[]): NoLunch[] {
  return letters
    .filter((l) => l.eventDate && NO_LUNCH.test(l.summary))
    .map((l) => ({ id: l.id, grades: l.grades.length ? l.grades : [1, 2, 3], start: l.eventDate!, end: l.eventEnd && l.eventEnd > l.eventDate! ? l.eventEnd : l.eventDate! }));
}

export function mealHTML(view: MealView | null, noLunch: NoLunch[] = [], base = '/'): string {
  if (!view) return '';
  const dishes = view.dishes.map((d) => escape(d.name)).join(' · ');
  const rows = view.dishes
    .filter((d) => d.allergens.length > 0)
    .map(
      (d) =>
        `<li><span>${escape(d.name)}</span> ${d.allergens
          .map((n) => `${n}${ALLERGENS[n] ? ` ${ALLERGENS[n]}` : ''}`)
          .map(escape)
          .join(', ')}</li>`,
    )
    .join('');
  const allergy = rows
    ? `<details><summary>알레르기</summary><ul class="meal-allergy">${rows}</ul></details>`
    : '';
  const date = view.title === '오늘 급식' ? '' : ` <small>${escape(formatDate(view.ymd))}</small>`;
  // 반을 골랐으면 다른 학년 줄은 CSS가 감춘다(data-grades).
  const none = noLunch
    .filter((r) => r.start <= view.ymd && view.ymd <= r.end)
    .map((r) => {
      const who = r.grades.length >= 3 ? '이날은' : `${gradeLabel(r.grades)}은 이날`;
      return `<p class="meal-none" data-grades="${r.grades.join(' ')}">${who} 점심 급식이 없어요 <a href="${escape(`${base}notices/${r.id}/`)}">가정통신문</a></p>`;
    })
    .join('');
  return `<h2 id="meal-title">${view.title}${date}</h2>${none}<p class="meal-dishes">${dishes}</p>${allergy}`;
}
