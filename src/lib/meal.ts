// 첫 화면 「오늘 급식」 안내판. 빌드할 때와 브라우저에서 같은 함수로 그려, 날짜가 바뀌어도 맞게 보이게 한다.
import { formatDate, nextSchoolDay } from './dates.ts';
import type { FeedMeal } from './feed.ts';
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

export function mealHTML(view: MealView | null): string {
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
  return `<h2 id="meal-title">${view.title}${date}</h2><p class="meal-dishes">${dishes}</p>${allergy}`;
}
