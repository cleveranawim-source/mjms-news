import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFeed, boardHTML, changesStateHTML, changesFor } from '../src/lib/board.ts';

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

test('빈 칸은 그리지 않는다; 챙길 것이 없으면 「챙길 것 없어요」', () => {
  const quiet = boardHTML(boardFromFeed('2026-10-22', feed({ letters: [], schedule: [] })), '/');
  assert.ok(!quiet.includes('오늘 일정'));
  assert.ok(!quiet.includes('준비물'));
  assert.match(quiet, /챙길 것 없어요/);
  const busy = boardHTML(boardFromFeed('2026-10-22', feed()), '/');
  assert.match(busy, /챙길 것/);
  assert.match(busy, /10월 23일 \(금\) 준비물/);
  assert.ok(busy.includes('오늘 일정'));
  // 학년을 고르면 그 학년 것이 없는 칸이 숨도록, 「챙길 것 없어요」 줄은 늘 함께 그려 둔다(CSS가 고른다).
  assert.match(busy, /챙길 것 없어요/);
});

test('칠판에 급식·새 알림은 없다', () => {
  const html = boardHTML(boardFromFeed('2026-10-22', feed({ meals: [{ ymd: '2026-10-22', dishes: [{ name: '쌀밥', allergens: [] }] }] })), '/');
  assert.ok(!html.includes('쌀밥'));
  assert.ok(!html.includes('새로 올라온 알림'));
});

test('칠판에는 바뀐 수업 자리(브라우저가 채움)가 있고, 분필 글씨 꾸밈은 없다', () => {
  const html = boardHTML(boardFromFeed('2026-10-22', feed()), '/');
  assert.match(html, /<div data-board-changes><\/div>/);
  assert.ok(!html.includes('board-pick'));
});

test('바뀐 수업 상태 문구', () => {
  assert.match(changesStateHTML({ kind: 'lines', lines: ['1교시 영어 (원래 체육)'] }), /1교시 영어/);
  assert.match(changesStateHTML({ kind: 'none' }), /바뀐 수업 없어요/);
  assert.match(changesStateHTML({ kind: 'nofeed' }), /오늘 시간표가 아직 없어요/);
  assert.match(changesStateHTML({ kind: 'error' }), /불러오지 못했어요[\s\S]*data-retry-changes/);
  for (const kind of ['none', 'nofeed', 'error']) assert.match(changesStateHTML({ kind }), /오늘 바뀐 수업/);
  assert.match(changesStateHTML({ kind: 'error' }), /<button type="button" data-retry-changes>다시 불러오기<\/button>/);
});

test('바뀐 수업 줄: 「1교시 영어」 + 원래 과목 줄긋기, 학사일정 이름은 흐리게, 글자는 escape', () => {
  const html = changesStateHTML({ kind: 'lines', lines: [
    { text: '1교시 영어', from: '체육', note: null },
    { text: '5교시 <b>창체</b>', from: null, note: '동아리활동' },
    '오늘은 4교시까지',
  ] });
  assert.match(html, /<li>1교시 영어 ?<s><span class="sr-only">원래 <\/span>체육<\/s><\/li>/);
  assert.ok(html.includes('5교시 &lt;b&gt;창체&lt;/b&gt;'));
  assert.match(html, /동아리활동/);
  assert.ok(!html.includes('<s>동아리활동'));
  assert.match(html, /<li>오늘은 4교시까지<\/li>/);
});

test('나이스 쉬는 날(dayoff)이 다음 날이면 다음 등교일과 그날 준비물이 밀린다', () => {
  const l = [letter({ id: 'm', bring: ['리코더'], due: '2026-10-26' }), letter({ id: 'n', bring: ['물감'], due: '2026-10-23' })];
  const board = boardFromFeed('2026-10-22', feed({ letters: l, schedule: [{ title: '재량휴업일', start: '2026-10-23', end: '2026-10-23', grades: [], kind: 'dayoff' }] }));
  assert.equal(board.next, '2026-10-26');
  assert.deepEqual(board.bringNext.map((b) => b.item), ['리코더']);
  assert.match(boardHTML(board, '/'), /10월 26일 \(월\) 준비물/);
});

test('학년만 쉬는 날은 쉬는 날 줄이 아니라 그 학년 오늘 일정, 등교일도 밀지 않는다', () => {
  const board = boardFromFeed('2026-10-22', feed({ schedule: [
    { title: '3학년 재량휴업일', start: '2026-10-22', end: '2026-10-23', grades: [3], kind: 'dayoff' },
  ] }));
  assert.equal(board.dayOff, null);
  assert.equal(board.next, '2026-10-23');
  assert.deepEqual(board.events, [{ title: '3학년 재량휴업일', start: '2026-10-22', end: '2026-10-23', grades: [3] }]);
});

test('칠판 오늘 일정에는 쉬는 날·공휴일을 다시 쓰지 않는다(쉬는 날 줄이 있다)', () => {
  const board = boardFromFeed('2026-10-09', feed({ schedule: [{ title: '한글날', start: '2026-10-09', end: '2026-10-09', grades: [], kind: 'holiday' }] }));
  assert.equal(board.dayOff, '한글날');
  assert.deepEqual(board.events, []);
});

test('학년이 정해진 준비물에는 학년 배지(글자)가 붙는다(전 학년 것은 없음)', () => {
  const html = boardHTML(boardFromFeed('2026-10-22', feed()), '/');
  assert.match(html, /실험 노트[\s\S]*?<span class="badge badge--g2[^"]*">2학년<\/span>/);
  const li = html.match(/<li[^>]*>(?:(?!<\/li>)[\s\S])*체육복[\s\S]*?<\/li>/)[0];
  assert.ok(!li.includes('badge'));
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

test('changesFor: 못 받음 → error, 그날·반이 피드에 없음 → nofeed, 바뀐 것 없음 → none, 쉬는 날 → null', () => {
  const cell = (period, subject, changed = null) => ({ period, subject, special: false, changed });
  const tt = { version: 1, generatedAt: '', days: [], classes: [{ id: 'class-1_5', name: '1-5', grade: 1, days: [
    { ymd: '2026-10-22', off: null, until: null, cells: [cell(1, '영어', { from: '체육', note: null }), cell(2, '수학')] },
    { ymd: '2026-10-23', off: null, until: null, cells: [cell(1, '국어')] },
    { ymd: '2026-10-26', off: '재량휴업일', until: null, cells: [] },
  ] }] };
  assert.deepEqual(changesFor(null, 'class-1_5', '2026-10-22'), { kind: 'error' });
  assert.deepEqual(changesFor(tt, 'class-1_5', '2026-10-22'), { kind: 'lines', lines: [{ text: '1교시 영어', from: '체육', note: null }] });
  assert.deepEqual(changesFor(tt, 'class-1_5', '2026-10-23'), { kind: 'none' });
  assert.deepEqual(changesFor(tt, 'class-1_5', '2026-10-27'), { kind: 'nofeed' });
  assert.deepEqual(changesFor(tt, 'class-9_9', '2026-10-22'), { kind: 'nofeed' });
  assert.equal(changesFor(tt, 'class-1_5', '2026-10-26'), null);
});
