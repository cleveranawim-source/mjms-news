import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withWorshipTitles, WORSHIP_TITLES } from '../src/lib/worship.ts';

const ev = (title, start, end = start, o = {}) => ({ title, start, end, grades: [], kind: 'event', ...o });

test('나이스 「학생예배」는 그날 예배 제목으로 바꾼다', () => {
  assert.deepEqual(withWorshipTitles([ev('학생예배', '2026-11-18')], { '2026-11-18': '감사하는 삶' }), [ev('감사하는 삶', '2026-11-18')]);
});

test('「예배」가 든 이름은 모두 그날 제목으로(성탄절예배도), 다른 이름은 그대로', () => {
  const titles = { '2026-12-23': '사랑하는 삶' };
  const list = [ev('성탄절예배', '2026-12-23'), ev('동아리', '2026-12-23')];
  assert.deepEqual(withWorshipTitles(list, titles), [ev('사랑하는 삶', '2026-12-23'), ev('동아리', '2026-12-23')]);
});

test('제목표에 없는 날의 예배 일정은 싣지 않는다(「예배」라는 말을 공식 알림에 쓰지 않는다)', () => {
  const titles = { '2026-04-08': '새로운 생명' };
  assert.deepEqual(withWorshipTitles([ev('학생예배', '2026-04-01'), ev('동아리', '2026-04-01')], titles), [ev('동아리', '2026-04-01')]);
});

test('여러 날에 걸친 예배는 하루씩 나누고, 제목 없는 날은 뺀다', () => {
  const titles = { '2026-05-27': '존재의 이유', '2026-05-28': '하나되는 공동체' };
  assert.deepEqual(withWorshipTitles([ev('학생예배', '2026-05-27', '2026-05-28')], titles), [ev('존재의 이유', '2026-05-27'), ev('하나되는 공동체', '2026-05-28')]);
  assert.deepEqual(withWorshipTitles([ev('학생예배', '2026-05-27', '2026-05-29')], titles).map((e) => e.title), ['존재의 이유', '하나되는 공동체']);
});

test('학사일정이 없으면(null) 그대로 null', () => {
  assert.equal(withWorshipTitles(null, {}), null);
});

test('2026학년도 제목표: 학생·학부모용 학사일정의 수요일 예배 제목', () => {
  assert.equal(WORSHIP_TITLES['2026-10-21'], '회복 탄력성');
  assert.equal(WORSHIP_TITLES['2026-11-18'], '감사하는 삶');
  for (const t of Object.values(WORSHIP_TITLES)) assert.ok(!t.includes('예배'), t);
  for (const d of Object.keys(WORSHIP_TITLES)) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
});
