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

test('mealHTML: 이스케이프, 쉼표, 날짜, 알레르기 이름', () => {
  const today = mealHTML({ title: '오늘 급식', ymd: '2026-10-19', dishes: [d('<b>밥'), d('우유국', [2])] });
  assert.ok(today.includes('&lt;b&gt;밥, 우유국'));
  assert.ok(!today.includes('<b>'));
  assert.ok(!today.includes('<small>'));
  assert.match(today, /<details>.*2 우유/s);
  const next = mealHTML({ title: '다음 등교일 급식', ymd: '2026-10-19', dishes: [d('밥')] });
  assert.match(next, /<small>10월 19일 \(월\)<\/small>/);
  assert.ok(!next.includes('<details>'));
  assert.equal(mealHTML(null), '');
});
