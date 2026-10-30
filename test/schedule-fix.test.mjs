import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withScheduleFixes, SCHEDULE_FIXES } from '../src/lib/schedule-fix.ts';

const ev = (title, start, end = start, o = {}) => ({ title, start, end, grades: [], kind: 'event', ...o });

test('고친 달의 나이스 일정은 모두 빼고 표의 일정으로 바꿔 끼운다, 다른 달은 그대로', () => {
  const fixes = { months: ['2026-11'], items: [ev('방송제(5~6교시)', '2026-11-11'), ev('동아리활동(5~6교시)', '2026-11-12')] };
  const feed = [ev('동아리', '2026-11-11'), ev('백마festival', '2026-11-12'), ev('회복 탄력성', '2026-10-21'), ev('기말고사', '2026-12-07', '2026-12-09', { grades: [1, 2] })];
  assert.deepEqual(withScheduleFixes(feed, fixes), [
    ev('회복 탄력성', '2026-10-21'),
    ev('기말고사', '2026-12-07', '2026-12-09', { grades: [1, 2] }),
    ev('방송제(5~6교시)', '2026-11-11'),
    ev('동아리활동(5~6교시)', '2026-11-12'),
  ]);
});

test('학사일정이 없으면(null) 그대로 null', () => {
  assert.equal(withScheduleFixes(null, { months: ['2026-11'], items: [ev('x', '2026-11-01')] }), null);
});

test('2026년 11·12월 표: 학생·학부모용 학사일정 그대로, 날짜·종류·학년이 올바르다', () => {
  assert.deepEqual(SCHEDULE_FIXES.months, ['2026-11', '2026-12']);
  for (const i of SCHEDULE_FIXES.items) {
    assert.match(i.start, /^2026-1[12]-\d{2}$/, i.title);
    assert.ok(i.start <= i.end, i.title);
    assert.ok(['holiday', 'dayoff', 'event'].includes(i.kind), i.title);
    assert.ok(i.grades.every((g) => [1, 2, 3].includes(g)), i.title);
    assert.ok(!i.title.includes('예배'), i.title);
  }
  const on = (ymd) => SCHEDULE_FIXES.items.filter((i) => i.start <= ymd && ymd <= i.end).map((i) => [i.title, i.grades, i.kind]);
  // 나이스와 달랐던 날: 방송제 11일(수), 동아리 12일(목), 백마페스티벌 13일(금)
  assert.deepEqual(on('2026-11-11'), [['전시마당', [], 'event'], ['방송제(5~6교시)', [], 'event']]);
  assert.deepEqual(on('2026-11-12'), [['전시마당', [], 'event'], ['동아리활동(5~6교시)', [], 'event']]);
  assert.deepEqual(on('2026-11-13'), [['전시마당', [], 'event'], ['백마페스티벌(1~7교시)', [], 'event']]);
  assert.deepEqual(on('2026-11-18'), [['전시마당', [], 'event'], ['감사하는 삶', [], 'event'], ['학생회장단선거', [], 'event']]);
  assert.deepEqual(on('2026-11-19'), [['대학수학능력시험', [], 'dayoff']]);
  assert.deepEqual(on('2026-12-08'), [['기말고사', [1, 2], 'event']]);
  assert.deepEqual(on('2026-12-23'), [['사랑하는 삶', [], 'event'], ['크리스마스 페스티벌(2~4교시)', [], 'event']]);
  assert.deepEqual(on('2026-12-25'), [['성탄절', [], 'holiday']]);
  assert.deepEqual(on('2026-12-31'), [['종업식(1교시)', [1, 2], 'event'], ['안전교육(2교시)', [1, 2], 'event'], ['학교폭력예방교육(3교시)', [1, 2], 'event'], ['졸업식(1~4교시)', [3], 'event']]);
  assert.equal(SCHEDULE_FIXES.items.length, 26);
});
