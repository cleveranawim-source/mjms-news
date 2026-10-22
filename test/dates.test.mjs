import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildToday, seoulToday, addDays, nextSchoolDay, formatDate, toISODate } from '../src/lib/dates.ts';

test('seoulToday uses Korea time, not UTC', () => {
  // 2026-10-22 16:00 UTC is already 10-23 01:00 in Seoul
  assert.equal(seoulToday(new Date('2026-10-22T16:00:00Z')), '2026-10-23');
  assert.equal(seoulToday(new Date('2026-10-22T14:59:00Z')), '2026-10-22');
});

test('addDays crosses month boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
});

test('nextSchoolDay skips the weekend', () => {
  assert.equal(nextSchoolDay('2026-10-22'), '2026-10-23'); // 목 → 금
  assert.equal(nextSchoolDay('2026-10-23'), '2026-10-26'); // 금 → 월
  assert.equal(nextSchoolDay('2026-10-24'), '2026-10-26'); // 토 → 월
});

test('formatDate gives Korean month, day and weekday', () => {
  assert.equal(formatDate('2026-10-22'), '10월 22일 (목)');
});

test('toISODate accepts strings and Date objects from YAML', () => {
  assert.equal(toISODate('2026-10-22'), '2026-10-22');
  assert.equal(toISODate(new Date('2026-10-22T00:00:00Z')), '2026-10-22');
});

import { gradeLabel } from '../src/lib/grades.ts';

test('gradeLabel reads naturally', () => {
  assert.equal(gradeLabel([1, 2, 3]), '전 학년');
  assert.equal(gradeLabel([2]), '2학년');
  assert.equal(gradeLabel([3, 1]), '1, 3학년');
});

import { formatRange } from '../src/lib/dates.ts';

test('formatRange drops the repeated month', () => {
  assert.equal(formatRange('2026-10-20', '2026-10-22'), '10월 20일 (화) ~ 22일 (목)');
  assert.equal(formatRange('2026-10-30', '2026-11-02'), '10월 30일 (금) ~ 11월 2일 (월)');
  assert.equal(formatRange('2026-10-23'), '10월 23일 (금)');
});

import { isDayOff } from '../src/lib/dates.ts';

test('nextSchoolDay skips a day off', () => {
  assert.equal(nextSchoolDay('2026-11-18', [{ start: '2026-11-19', end: '2026-11-19' }]), '2026-11-20');
});

test('nextSchoolDay: Friday before a Monday holiday lands on Tuesday', () => {
  assert.equal(nextSchoolDay('2026-10-23', [{ start: '2026-10-26', end: '2026-10-26' }]), '2026-10-27');
});

test('nextSchoolDay jumps over a whole vacation', () => {
  const off = [
    { start: '2026-12-31', end: '2027-02-28' },
    { start: '2027-03-01', end: '2027-03-01' },
  ];
  assert.equal(nextSchoolDay('2026-12-30', off), '2027-03-02');
});

test('isDayOff checks inclusive ranges', () => {
  const off = [{ start: '2026-11-19', end: '2026-11-20' }];
  assert.equal(isDayOff('2026-11-19', off), true);
  assert.equal(isDayOff('2026-11-20', off), true);
  assert.equal(isDayOff('2026-11-21', off), false);
});

test('buildToday: NEWS_TODAY overrides, invalid falls back to Seoul today', () => {
  const prev = process.env.NEWS_TODAY;
  try {
    process.env.NEWS_TODAY = '2026-10-22';
    assert.equal(buildToday(), '2026-10-22');
    process.env.NEWS_TODAY = 'tomorrow';
    assert.equal(buildToday(), seoulToday());
    delete process.env.NEWS_TODAY;
    assert.equal(buildToday(), seoulToday());
  } finally {
    if (prev === undefined) delete process.env.NEWS_TODAY; else process.env.NEWS_TODAY = prev;
  }
});
