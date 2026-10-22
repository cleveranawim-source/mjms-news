import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFeed, boardHTML } from '../src/lib/board.ts';

const letter = (o) => ({
  id: 'x', number: null, subject: '제목', grades: [1, 2, 3], classes: null, eventDate: null, eventEnd: null,
  bring: [], due: null, summary: '', attachments: [], sourceUrl: 'https://example.com', postedOn: '2026-10-01',
  publishedOn: '2026-10-01', ...o,
});
const letters = [
  letter({ id: 'a', subject: '체육대회 안내', publishedOn: '2026-10-22', bring: ['체육복', '물병'], due: '2026-10-23' }),
  letter({ id: 'b', subject: '과학 실험', grades: [2], bring: ['실험 노트'], due: '2026-10-22' }),
  letter({ id: 'c', subject: '지난 공지' }),
];
const events = [
  { title: '2학기 중간고사', start: '2026-10-20', end: '2026-10-22', grades: [1, 2, 3] },
  { title: '현장체험학습', start: '2026-10-30', end: '2026-10-30', grades: [1] },
];
const feed = (o = {}) => ({ version: 1, generatedAt: '', letters, events, daysOff: [], meals: [], ...o });

test('board collects today events, today and next-day items, and new notices', () => {
  const board = boardFromFeed('2026-10-22', feed());
  assert.equal(board.today, '2026-10-22');
  assert.equal(board.next, '2026-10-23');
  assert.deepEqual(board.events.map((e) => e.title), ['2학기 중간고사']);
  assert.deepEqual(board.bringToday.map((b) => b.item), ['실험 노트']);
  assert.deepEqual(board.bringNext.map((b) => b.item), ['체육복', '물병']);
  assert.deepEqual(board.newNotices.map((n) => n.slug), ['a']);
});

test('board on Friday looks ahead to Monday', () => {
  const board = boardFromFeed('2026-10-23', feed());
  assert.equal(board.next, '2026-10-26');
  assert.deepEqual(board.bringToday.map((b) => b.item), ['체육복', '물병']);
});

test('Friday before a Monday holiday shows Tuesday supplies as next', () => {
  const l = [letter({ id: 't', bring: ['리코더'], due: '2026-10-27' })];
  const board = boardFromFeed('2026-10-23', feed({ letters: l, daysOff: [{ title: '대체공휴일', start: '2026-10-26', end: '2026-10-26' }] }));
  assert.equal(board.next, '2026-10-27');
  assert.deepEqual(board.bringNext.map((b) => b.item), ['리코더']);
});

test('a letter whose event date is today shows its subject under today events', () => {
  const l = [letter({ subject: '현장체험학습 안내', eventDate: '2026-10-30' }), letter({ subject: '시험', eventDate: '2026-10-29', eventEnd: '2026-10-31' })];
  const board = boardFromFeed('2026-10-30', feed({ letters: l, events: [] }));
  assert.deepEqual(board.events.map((e) => e.title), ['현장체험학습 안내', '시험']);
});

test('day off shows in the HTML and on the board', () => {
  const board = boardFromFeed('2026-10-22', feed({ daysOff: [{ title: '재량휴업일', start: '2026-10-22', end: '2026-10-22' }] }));
  assert.equal(board.dayOff, '재량휴업일');
  assert.ok(boardHTML(board, '/').includes('오늘은 재량휴업일입니다'));
  assert.equal(boardFromFeed('2026-10-22', feed()).dayOff, null);
  assert.ok(!boardHTML(boardFromFeed('2026-10-22', feed()), '/').includes('오늘은'));
});

test("today's meal is picked from the feed but not drawn on the board", () => {
  const meals = [{ ymd: '2026-10-22', dishes: [{ name: '쌀밥', allergens: [] }, { name: '김치', allergens: [9] }] }];
  const board = boardFromFeed('2026-10-22', feed({ meals }));
  assert.deepEqual(board.meal, { ymd: '2026-10-22', dishes: ['쌀밥', '김치'] });
  assert.ok(!boardHTML(board, '/').includes('쌀밥'));
  assert.equal(boardFromFeed('2026-10-23', feed({ meals })).meal, null);
});

test('boardHTML escapes teacher-written text', () => {
  const board = boardFromFeed('2026-10-22', feed({ letters: [letter({ subject: '<b>주의</b>', publishedOn: '2026-10-22' })] }));
  const html = boardHTML(board, '/');
  assert.ok(html.includes('&lt;b&gt;주의&lt;/b&gt;'));
  assert.ok(!html.includes('<b>주의'));
});

test('boardHTML tags every item with its grades for filtering', () => {
  const html = boardHTML(boardFromFeed('2026-10-22', feed()), '/');
  assert.ok(html.includes('data-grades="2"'));
  assert.ok(html.includes('data-grades="1 2 3"'));
});

test('boardFromFeed treats empty grades as all grades', async () => {
  const { boardFromFeed } = await import('../src/lib/board.ts');
  const letter = {
    id: 'a', number: null, subject: '안내', grades: [], classes: null, eventDate: '2026-10-22', eventEnd: null,
    bring: ['돗자리'], due: '2026-10-22', summary: '', attachments: [], sourceUrl: 'https://example.com/a',
    postedOn: '2026-10-20', publishedOn: '2026-10-22',
  };
  const b = boardFromFeed('2026-10-22', {
    letters: [letter], daysOff: [], meals: [],
    events: [{ title: '행사', start: '2026-10-22', end: '2026-10-22', grades: [] }],
  });
  assert.deepEqual(b.bringToday[0].grades, [1, 2, 3]);
  assert.deepEqual(b.newNotices[0].grades, [1, 2, 3]);
  assert.ok(b.events.every((e) => e.grades.length === 3));
});

test('칠판: 같은 날 쉬는 날이 두 번 실려도 깔끔한 이름 하나만 쓴다', () => {
  const board = boardFromFeed('2026-10-03', feed({ daysOff: [
    { title: '쉬는 날 개천절', start: '2026-10-03', end: '2026-10-03' },
    { title: '개천절', start: '2026-10-03', end: '2026-10-03' },
  ] }));
  assert.equal(board.dayOff, '개천절');
});
