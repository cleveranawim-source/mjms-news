import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withWorshipTitles, WORSHIP_TITLES } from '../src/lib/worship.ts';

const ev = (title, start, end = start, o = {}) => ({ title, start, end, grades: [], kind: 'event', ...o });

test('나이스 「학생예배」는 그날 예배 제목으로 바꾼다', () => {
  assert.deepEqual(withWorshipTitles([ev('학생예배', '2026-11-18')], { '2026-11-18': '감사하는 삶' }), [ev('감사하는 삶', '2026-11-18')]);
});

test('제목이 없는 날, 다른 이름(성탄절예배·동아리)은 그대로', () => {
  const titles = { '2026-12-23': '사랑하는 삶', '2026-04-08': '새로운 생명' };
  const list = [ev('학생예배', '2026-04-01'), ev('성탄절예배', '2026-12-23'), ev('동아리', '2026-12-23')];
  assert.deepEqual(withWorshipTitles(list, titles), list);
});

test('이틀에 걸친 학생예배는 날마다 제목이 다르면 하루씩 나눈다(제목 없는 날은 「학생예배」)', () => {
  const titles = { '2026-05-27': '존재의 이유', '2026-05-28': '하나되는 공동체' };
  assert.deepEqual(withWorshipTitles([ev('학생예배', '2026-05-27', '2026-05-28')], titles), [ev('존재의 이유', '2026-05-27'), ev('하나되는 공동체', '2026-05-28')]);
  assert.deepEqual(withWorshipTitles([ev('학생예배', '2026-05-27', '2026-05-29')], titles).map((e) => e.title), ['존재의 이유', '하나되는 공동체', '학생예배']);
});

test('학사일정이 없으면(null) 그대로 null', () => {
  assert.equal(withWorshipTitles(null, {}), null);
});

test('2026학년도 제목표: 학생·학부모용 학사일정의 수요일 예배 제목', () => {
  assert.equal(WORSHIP_TITLES['2026-10-21'], '회복 탄력성');
  assert.equal(WORSHIP_TITLES['2026-11-18'], '감사하는 삶');
  for (const d of Object.keys(WORSHIP_TITLES)) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
});
