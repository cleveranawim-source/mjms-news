import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBoard, boardHTML } from '../src/lib/board.ts';

const notices = [
  { slug: 'a', title: '체육대회 안내', date: '2026-10-22', grades: [1, 2, 3], bring: ['체육복', '물병'], due: '2026-10-23' },
  { slug: 'b', title: '과학 실험', date: '2026-10-20', grades: [2], bring: ['실험 노트'], due: '2026-10-22' },
  { slug: 'c', title: '지난 공지', date: '2026-10-01', grades: [1, 2, 3], bring: [] },
];
const events = [
  { title: '2학기 중간고사', date: '2026-10-20', end: '2026-10-22', grades: [1, 2, 3] },
  { title: '현장체험학습', date: '2026-10-30', grades: [1] },
];

test('board collects today events, today and next-day items, and new notices', () => {
  const board = buildBoard('2026-10-22', notices, events);
  assert.equal(board.today, '2026-10-22');
  assert.equal(board.next, '2026-10-23');
  assert.deepEqual(board.events.map((e) => e.title), ['2학기 중간고사']);
  assert.deepEqual(board.bringToday.map((b) => b.item), ['실험 노트']);
  assert.deepEqual(board.bringNext.map((b) => b.item), ['체육복', '물병']);
  assert.deepEqual(board.newNotices.map((n) => n.slug), ['a']);
});

test('board on Friday looks ahead to Monday', () => {
  const board = buildBoard('2026-10-23', notices, events);
  assert.equal(board.next, '2026-10-26');
  assert.deepEqual(board.bringToday.map((b) => b.item), ['체육복', '물병']);
});

test('boardHTML escapes teacher-written text', () => {
  const board = buildBoard('2026-10-22', [{ slug: 'x', title: '<b>주의</b>', date: '2026-10-22', grades: [1], bring: [] }], []);
  const html = boardHTML(board, '/');
  assert.ok(html.includes('&lt;b&gt;주의&lt;/b&gt;'));
  assert.ok(!html.includes('<b>주의'));
});

test('boardHTML tags every item with its grades for filtering', () => {
  const html = boardHTML(buildBoard('2026-10-22', notices, events), '/');
  assert.ok(html.includes('data-grades="2"'));
  assert.ok(html.includes('data-grades="1 2 3"'));
});
