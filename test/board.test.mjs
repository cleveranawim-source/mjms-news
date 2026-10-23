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
const schedule = [
  { title: '2학기 중간고사', start: '2026-10-20', end: '2026-10-22', grades: [1, 2, 3], kind: 'event' },
  { title: '현장체험학습', start: '2026-10-30', end: '2026-10-30', grades: [1], kind: 'event' },
];
const feed = (o = {}) => ({ version: 1, generatedAt: '', letters, events: [], schedule, daysOff: [], meals: [], ...o });

test('board collects today events and today and next-day items', () => {
  const board = boardFromFeed('2026-10-22', feed());
  assert.equal(board.today, '2026-10-22');
  assert.equal(board.next, '2026-10-23');
  assert.deepEqual(board.events.map((e) => e.title), ['2학기 중간고사']);
  assert.deepEqual(board.bringToday.map((b) => b.item), ['실험 노트']);
  assert.deepEqual(board.bringNext.map((b) => b.item), ['체육복', '물병']);
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

test('day off shows in the HTML and on the board', () => {
  const board = boardFromFeed('2026-10-22', feed({ daysOff: [{ title: '재량휴업일', start: '2026-10-22', end: '2026-10-22' }] }));
  assert.equal(board.dayOff, '재량휴업일');
  assert.ok(boardHTML(board, '/').includes('오늘은 재량휴업일입니다'));
  assert.equal(boardFromFeed('2026-10-22', feed()).dayOff, null);
  assert.ok(!boardHTML(boardFromFeed('2026-10-22', feed()), '/').includes('오늘은'));
});

test('the meal goes on the board; on a day without one, the next school day\'s', () => {
  const meals = [
    { ymd: '2026-10-22', dishes: [{ name: '쌀밥', allergens: [] }, { name: '김치', allergens: [9] }] },
    { ymd: '2026-10-26', dishes: [{ name: '카레', allergens: [] }] },
  ];
  const board = boardFromFeed('2026-10-22', feed({ meals }));
  assert.equal(board.meal.title, '오늘 급식');
  const html = boardHTML(board, '/');
  assert.ok(html.includes('쌀밥, 김치'));
  assert.ok(html.includes('알레르기 정보'));
  // 토요일에는 다음 등교일(월) 급식
  const sat = boardFromFeed('2026-10-24', feed({ meals }));
  assert.equal(sat.meal.title, '다음 등교일 급식');
  assert.ok(boardHTML(sat, '/').includes('카레'));
  assert.equal(boardFromFeed('2026-10-23', feed({ meals: [] })).meal, null);
});

test('empty groups are not drawn; nothing to bring collapses to one line', () => {
  const quiet = boardHTML(boardFromFeed('2026-10-22', feed({ letters: [], schedule: [] })), '/');
  assert.ok(!quiet.includes('오늘 일정'));
  assert.ok(!quiet.includes('새로 올라온 알림'));
  assert.ok(!quiet.includes('오늘 챙길 것'));
  assert.ok(!quiet.includes('준비물'));
  assert.ok(quiet.includes('class="board-bring-none"'));
  const busy = boardHTML(boardFromFeed('2026-10-22', feed()), '/');
  assert.ok(busy.includes('오늘 챙길 것'));
  assert.ok(busy.includes('오늘 일정'));
  // 새 알림은 칠판 쪽지와 '최근 알림' 목록에 있으므로 칠판 줄로는 쓰지 않는다.
  assert.ok(!busy.includes('새로 올라온 알림'));
  // 학년을 고르면 그 학년 것이 없는 칸이 숨도록, '챙길 것 없어요' 줄은 늘 함께 그려 둔다(CSS가 고른다).
  assert.ok(busy.includes('class="board-bring-none"'));
});

test('boardHTML escapes teacher-written text', () => {
  const board = boardFromFeed('2026-10-22', feed({ schedule: [{ title: '<b>주의</b>', start: '2026-10-22', end: '2026-10-22', grades: [], kind: 'event' }] }));
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
    schedule: [{ title: '행사', start: '2026-10-22', end: '2026-10-22', grades: [], kind: 'event' }],
  });
  assert.deepEqual(b.bringToday[0].grades, [1, 2, 3]);
  assert.ok(b.events.every((e) => e.grades.length === 3));
});

test('칠판: 같은 날 쉬는 날이 두 번 실려도 깔끔한 이름 하나만 쓴다', () => {
  const board = boardFromFeed('2026-10-03', feed({ daysOff: [
    { title: '쉬는 날 개천절', start: '2026-10-03', end: '2026-10-03' },
    { title: '개천절', start: '2026-10-03', end: '2026-10-03' },
  ] }));
  assert.equal(board.dayOff, '개천절');
});

test('칠판 오늘 일정은 나이스 학사일정에서만', () => {
  const b = boardFromFeed('2026-10-22', feed({ schedule: [{ title: '학생예배', start: '2026-10-22', end: '2026-10-22', grades: [], kind: 'event' }], letters: [letter({ eventDate: '2026-10-22', subject: '체험학습' })] }));
  assert.deepEqual(b.events.map((e) => e.title), ['학생예배']);
  assert.deepEqual(boardFromFeed('2026-10-22', feed({ schedule: null })).events, []);
});
