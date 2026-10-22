import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTimetable, todayChanges, timetableDayHTML, changeLine, weekGroups, initialDay, classButtonsHTML } from '../src/lib/timetable.ts';

const cell = (period, subject, extra = {}) => ({ period, subject, special: false, changed: null, ...extra });
const feed = {
  version: 1,
  generatedAt: '2026-10-22T00:00:00Z',
  days: ['2026-10-22', '2026-10-23'],
  classes: [
    {
      id: 'c15', name: '1-5', grade: 1,
      days: [
        { ymd: '2026-10-22', off: null, until: null, cells: [cell(1, '국어'), cell(3, '과학', { changed: { from: '체육', note: null } }), cell(5, '창체', { special: true, changed: { from: null, note: '동아리활동' } })] },
        { ymd: '2026-10-23', off: '재량휴업일', until: null, cells: [] },
      ],
    },
    { id: 'c21', name: '2-1', grade: 2, days: [] },
  ],
};

test('loadTimetable returns the feed on 200', async () => {
  assert.deepEqual(await loadTimetable('u', async () => new Response(JSON.stringify(feed))), feed);
});

test('loadTimetable returns null on 500, wrong version, or network failure', async () => {
  assert.equal(await loadTimetable('u', async () => new Response('{}', { status: 500 })), null);
  assert.equal(await loadTimetable('u', async () => new Response('{"version":2,"days":[],"classes":[]}')), null);
  assert.equal(await loadTimetable('u', async () => new Response(JSON.stringify({ ...feed, classes: [{ id: 1 }] }))), null);
  assert.equal(await loadTimetable('u', async () => { throw new Error('offline'); }), null);
});

test('todayChanges gives only the changed cells', () => {
  assert.deepEqual(todayChanges(feed, 'c15', '2026-10-22').map((c) => c.period), [3, 5]);
  assert.deepEqual(todayChanges(feed, 'c15', '2026-10-23'), []);
  assert.deepEqual(todayChanges(feed, 'nope', '2026-10-22'), []);
});

test('changeLine writes the original subject or the calendar note', () => {
  assert.equal(changeLine(feed.classes[0].days[0].cells[1]), '3교시 과학 (원래 체육)');
  assert.equal(changeLine(feed.classes[0].days[0].cells[2]), '5교시 창체 (동아리활동)');
});

test('timetableDayHTML marks changes, 창체 and the last period', () => {
  const day = { ymd: 'x', off: null, until: 5, cells: [cell(3, '과학', { changed: { from: '체육', note: null } }), cell(4, '창체', { special: true }), cell(6, '')] };
  const html = timetableDayHTML(day);
  assert.match(html, /바뀜 \(원래 체육\)/);
  assert.match(html, /창체<\/span>/);
  assert.match(html, /오늘은 5교시까지/);
  assert.doesNotMatch(html, /6교시/);
});

test('timetableDayHTML escapes feed text', () => {
  const html = timetableDayHTML({ ymd: 'x', off: null, until: null, cells: [cell(1, '<b>x</b>', { changed: { from: '<i>y</i>', note: '<u>z</u>' } })] });
  assert.doesNotMatch(html, /<b>x|<i>y|<u>z/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
});

test('timetableDayHTML shows only the name on a day off', () => {
  const html = timetableDayHTML(feed.classes[0].days[1]);
  assert.match(html, /재량휴업일/);
  assert.equal((html.match(/<li/g) ?? []).length, 1);
});

test('weekGroups names this week and next week; initialDay skips to the next day on a weekend', () => {
  const days = ['2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27'];
  assert.deepEqual(weekGroups(days, '2026-10-22').map((g) => g.label), ['이번 주', '다음 주']);
  assert.equal(initialDay(days, '2026-10-22'), '2026-10-22');
  assert.equal(initialDay(days, '2026-10-24'), '2026-10-26');
  assert.equal(initialDay(days, '2026-12-01'), '2026-10-22');
});

test('classButtonsHTML lists only the chosen grade', () => {
  const html = classButtonsHTML(feed.classes, 1, 'c15');
  assert.match(html, /1-5/);
  assert.doesNotMatch(html, /2-1/);
  assert.match(html, /aria-pressed="true"/);
});
