import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickMeal, mealHTML } from '../src/lib/meal.ts';

const d = (name, allergens = []) => ({ name, allergens });
const meals = [
  { ymd: '2026-10-19', dishes: [d('잡곡밥'), d('미역국', [5])] },
  { ymd: '2026-10-20', dishes: [d('현미밥')] },
];

test('일요일에는 다음 등교일 식단을 고른다', () => {
  const m = pickMeal('2026-10-18', meals, []);
  assert.equal(m.title, '다음 등교일 급식');
  assert.equal(m.ymd, '2026-10-19');
});

test('오늘 식단이 있으면 오늘 급식', () => {
  assert.equal(pickMeal('2026-10-19', meals, []).title, '오늘 급식');
});

test('쉬는 날은 건너뛰고 다음 등교일 식단', () => {
  const m = pickMeal('2026-10-18', meals, [{ start: '2026-10-19', end: '2026-10-19' }]);
  assert.equal(m.ymd, '2026-10-20');
});

test('오늘도 다음 등교일도 식단이 없으면 null', () => {
  assert.equal(pickMeal('2026-10-23', meals, []), null);
});

test('오늘 항목의 요리가 비었으면 다음 등교일로 넘어간다', () => {
  const m = pickMeal('2026-10-19', [{ ymd: '2026-10-19', dishes: [] }, meals[1]], []);
  assert.equal(m.title, '다음 등교일 급식');
  assert.equal(m.ymd, '2026-10-20');
});

test('mealHTML: 이스케이프, 「 · 」로 잇기, 날짜, 알레르기 이름', () => {
  const today = mealHTML({ title: '오늘 급식', ymd: '2026-10-19', dishes: [d('<b>밥'), d('우유국', [2])] });
  assert.ok(today.includes('&lt;b&gt;밥 · 우유국'));
  assert.match(today, /<h2 id="meal-title">오늘 급식<\/h2>/);
  assert.match(today, /<summary>알레르기<\/summary>/);
  assert.ok(!today.includes('<b>'));
  assert.ok(!today.includes('<small>'));
  assert.match(today, /<details>.*2 우유/s);
  const next = mealHTML({ title: '다음 등교일 급식', ymd: '2026-10-19', dishes: [d('밥')] });
  assert.match(next, /<small>10월 19일 \(월\)<\/small>/);
  assert.ok(!next.includes('<details>'));
  assert.equal(mealHTML(null), '');
});

test('급식 없는 날: 가정통신문 요약에 「급식이 없」으면 행사 기간·대상 학년에 안내 줄', async () => {
  const { noLunchRanges } = await import('../src/lib/meal.ts');
  const L = (o) => ({ id: 'x', grades: [3], eventDate: '2026-10-26', eventEnd: '2026-10-28', summary: '', ...o });
  const ranges = noLunchRanges([
    L({ id: 'e', summary: '시험 기간에는 점심 급식이 없으며, 전자기기는 가져갈 수 없습니다.' }),
    L({ id: 'f', summary: '급식은 평소대로 있습니다.' }),
    L({ id: 'g', summary: '급식이 없습니다.', eventDate: null }),
    L({ id: 'h', summary: '이날은 급식을 실시하지 않습니다.', grades: [], eventDate: '2026-11-02', eventEnd: null }),
  ]);
  assert.deepEqual(ranges, [
    { id: 'e', grades: [3], start: '2026-10-26', end: '2026-10-28' },
    { id: 'h', grades: [1, 2, 3], start: '2026-11-02', end: '2026-11-02' },
  ]);
  const html = mealHTML({ title: '오늘 급식', ymd: '2026-10-27', dishes: [d('잡곡밥')] }, ranges, '/');
  assert.match(html, /<p class="meal-none" data-grades="3">3학년은 이날 점심 급식이 없어요 <a href="\/notices\/e\/">가정통신문<\/a><\/p>/);
  assert.ok(!mealHTML({ title: '오늘 급식', ymd: '2026-10-29', dishes: [d('잡곡밥')] }, ranges, '/').includes('meal-none'));
  assert.match(mealHTML({ title: '다음 등교일 급식', ymd: '2026-11-02', dishes: [d('밥')] }, ranges, '/'), /<p class="meal-none" data-grades="1 2 3">이날은 점심 급식이 없어요 /);
});
