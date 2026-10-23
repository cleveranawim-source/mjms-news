import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTimetable, todayChanges, weekTableHTML, changesBoxHTML, changesTarget, changeLine, weekGroups } from '../src/lib/timetable.ts';

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

test('weekGroups names this week and next week', () => {
  const days = ['2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27'];
  assert.deepEqual(weekGroups(days, '2026-10-22').map((g) => g.label), ['이번 주', '다음 주']);
});

import { changeLines } from '../src/lib/timetable.ts';

test('changeLines writes 수업 없음 for a cleared cell', () => {
  const f = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [{ ymd: 'd', off: null, until: null, cells: [cell(2, '', { changed: { from: '수학', note: null } })] }] }] };
  assert.deepEqual(changeLines(f, 'c', 'd'), ['2교시 수업 없음 (원래 수학)']);
});

test('changeLines collapses periods cut by until into one line', () => {
  const cut = (p) => cell(p, '', { changed: { from: '국어', note: null } });
  const f = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [{ ymd: 'd', off: null, until: 4, cells: [cell(3, '과학', { changed: { from: '체육', note: null } }), cut(5), cut(6)] }] }] };
  assert.deepEqual(changeLines(f, 'c', 'd'), ['3교시 과학 (원래 체육)', '오늘은 4교시까지']);
});

test('loadTimetable drops malformed days and cells', async () => {
  const bad = { ...feed, days: ['2026-10-22', '<b>x'], classes: [{ id: 'c', name: '1-1', grade: 1, days: [
    { ymd: '2026-10-22', off: null, until: '<b>1</b>', cells: [] },
    { ymd: '<b>', off: null, until: null, cells: [] },
    { ymd: '2026-10-23', off: null, until: 99, cells: [] },
    { ymd: '2026-10-26', off: null, until: 5, cells: [cell(1, 'a', { changed: { from: 3, note: null } }), cell(2, 'b')] },
  ] }] };
  const out = await loadTimetable('u', async () => new Response(JSON.stringify(bad)));
  assert.deepEqual(out.days, ['2026-10-22']);
  assert.deepEqual(out.classes[0].days.map((d) => d.ymd), ['2026-10-26']);
  assert.deepEqual(out.classes[0].days[0].cells.map((c) => c.period), [2]);
});

const wk = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'];
const gridCls = {
  id: 'c', name: '1-5', grade: 1,
  days: [
    { ymd: '2026-10-19', off: null, until: null, cells: [cell(1, '국어'), cell(2, '창체', { special: true }), cell(3, '동아리', { special: true }), cell(4, '수학')] },
    { ymd: '2026-10-20', off: null, until: 2, cells: [cell(1, '영어'), cell(2, '과학'), cell(3, '', { changed: { from: '체육', note: null } })] },
    { ymd: '2026-10-21', off: '개교기념일', until: null, cells: [] },
    { ymd: '2026-10-22', off: null, until: null, cells: [cell(1, '<b>x</b>', { changed: { from: '<i>y</i>', note: '행사' } }), cell(5, '미술')] },
  ],
};

test('weekTableHTML: 5 columns, rows = max periods, today flagged', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.equal((html.match(/<th scope="col"/g) ?? []).length, 5);
  assert.equal((html.match(/<th scope="row"/g) ?? []).length, 5);
  assert.equal((html.match(/<th scope="col" class="tt-today"/g) ?? []).length, 1);
});

test('weekTableHTML: changed cell is yellow and reveals the original; text escaped', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.match(html, /tt-changed/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /data-reveal="[^"]*원래 &lt;i&gt;y&lt;\/i&gt;/);
  assert.doesNotMatch(html, /<b>x|<i>y/);
});

test('weekTableHTML: 창체 mark not duplicated when the subject is 창체', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.equal((html.match(/tt-mark/g) ?? []).length, 1);
});

test('weekTableHTML: day off shows its name once; until dims later cells and labels header', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.equal((html.match(/개교기념일/g) ?? []).length, 1);
  assert.match(html, /2교시까지/);
  assert.ok((html.match(/tt-cut/g) ?? []).length >= 3);
});

test('changesBoxHTML: lines, empty text, escaping', () => {
  const box = changesBoxHTML(gridCls, '2026-10-22', '오늘 바뀐 수업 (10월 22일 목)');
  assert.match(box, /1교시 &lt;b&gt;x&lt;\/b&gt; \(원래 &lt;i&gt;/);
  assert.match(changesBoxHTML(gridCls, '2026-10-19', '오늘 바뀐 수업 (10월 19일 월)', '오늘은 바뀐 수업이 없어요'), /오늘은 바뀐 수업이 없어요/);
});

test('changesTarget: today on a school day, next school day on weekend or day off', () => {
  assert.deepEqual(changesTarget(gridCls, '2026-10-22'), { ymd: '2026-10-22', label: '오늘 바뀐 수업 (10월 22일 목)', empty: '오늘은 바뀐 수업이 없어요' });
  assert.equal(changesTarget(gridCls, '2026-10-24').label, '다음 등교일 바뀐 수업 (10월 26일 월)');
  assert.equal(changesTarget(gridCls, '2026-10-21').ymd, '2026-10-22');
});

test('changesBoxHTML: next-school-day empty text, date outside the feed', () => {
  const t = changesTarget(gridCls, '2026-10-24');
  assert.equal(t.ymd, '2026-10-26');
  assert.match(changesBoxHTML(gridCls, '2026-10-19', t.label, t.empty), /다음 등교일은 바뀐 수업이 없어요/);
  assert.match(changesBoxHTML(gridCls, t.ymd, t.label, t.empty), /그날 시간표가 아직 없어요/);
});

test('weekTableHTML: escapes off text and class name; 수업 없음 for a cleared changed cell; aria-controls', () => {
  const c = { id: 'c', name: '<s>1</s>', grade: 1, days: [
    { ymd: '2026-10-19', off: '<u>휴</u>', until: null, cells: [] },
    { ymd: '2026-10-20', off: null, until: null, cells: [cell(1, '', { changed: { from: '수학', note: null } })] },
  ] };
  const html = weekTableHTML(c, wk, '2026-10-22');
  assert.doesNotMatch(html, /<s>|<u>/);
  assert.match(html, /&lt;u&gt;휴/);
  assert.match(html, /<span>수업 없음<\/span>/);
  assert.match(html, /aria-controls="tt-reveal"/);
});
