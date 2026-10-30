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
  // 학년 배지는 줄 앞에(긴 줄이 넘쳐도 배지만 따로 떨어지지 않게)
  assert.match(html, /<li data-grades="2"><span class="badge badge--g2[^"]*">2학년<\/span> [^<]*<a [^>]*>[^<]*실험 노트/);
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

test('주말·쉬는 날 칠판은 다음 등교일을 알린다(날짜 줄 아래 「다음 등교」, 등교일에는 없음)', () => {
  const sat = boardFromFeed('2026-10-24', feed());
  assert.equal(sat.closed, true);
  assert.equal(sat.next, '2026-10-26');
  const html = boardHTML(sat, '/');
  assert.match(html, /id="board-date"[\s\S]*10월 24일[\s\S]*토요일/);
  assert.match(html, /class="board-next">다음 등교 <b>10월 26일 \(월\)<\/b><span class="board-until" data-board-until><\/span><\/p>/);
  const off = boardFromFeed('2026-10-22', feed({ daysOff: [{ title: '재량휴업일', start: '2026-10-22', end: '2026-10-22' }] }));
  assert.equal(off.closed, true);
  assert.match(boardHTML(off, '/'), /오늘은 재량휴업일입니다[\s\S]*다음 등교 <b>10월 23일 \(금\)/);
  const open = boardFromFeed('2026-10-22', feed());
  assert.equal(open.closed, false);
  const openHtml = boardHTML(open, '/');
  assert.ok(!openHtml.includes('다음 등교'));
  // 등교일에는 몇 교시까지인지를 날짜 줄 끝에 브라우저가 채운다
  assert.match(openHtml, /class="board-date" id="board-date">[\s\S]*<span class="board-until" data-board-until><\/span><\/p>/);
});

test('다음 등교일 바뀐 수업: 제목과 「그날 시간표가 아직 없어요」', () => {
  for (const kind of ['none', 'nofeed', 'error', 'loading']) assert.match(changesStateHTML({ kind }, true), /다음 등교일 바뀐 수업/);
  assert.match(changesStateHTML({ kind: 'nofeed' }, true), /그날 시간표가 아직 없어요/);
  assert.ok(!changesStateHTML({ kind: 'nofeed' }, true).includes('오늘'));
});

test('D-day: 60일 안의 시험·방학·행사 이름만, 오늘 것이 먼저, 가까운 순, 학년 배지', () => {
  const s = [
    { title: '기말고사', start: '2026-10-26', end: '2026-10-28', grades: [3], kind: 'event' },
    { title: '학급자치회의', start: '2026-10-26', end: '2026-10-26', grades: [], kind: 'event' },
    { title: '북적북적나들이', start: '2026-10-30', end: '2026-10-30', grades: [], kind: 'event' },
    { title: '대학수학능력시험', start: '2026-11-19', end: '2026-11-19', grades: [], kind: 'dayoff' },
    { title: '기말고사', start: '2026-12-07', end: '2026-12-09', grades: [1, 2], kind: 'event' },
    { title: '겨울방학', start: '2027-01-01', end: '2027-02-28', grades: [], kind: 'dayoff' },
    { title: '체육대회', start: '2026-10-24', end: '2026-10-24', grades: [], kind: 'event' },
  ];
  const b = boardFromFeed('2026-10-24', feed({ schedule: s }));
  // 오늘 열리는 체육대회는 「D-day」로 맨 앞에
  assert.deepEqual(b.dday.map((d) => [d.title, d.days, d.grades]), [
    ['체육대회', 0, [1, 2, 3]],
    ['기말고사', 2, [3]],
    ['북적북적나들이', 6, [1, 2, 3]],
    ['기말고사', 44, [1, 2]],
  ]);
  const html = boardHTML(b, '/');
  assert.match(html, /<ul class="board-dday">[\s\S]*<li data-grades="3"><span class="board-dday-name">기말고사<\/span> <span class="badge badge--g3 board-badge">3학년<\/span> <b>D-2<\/b><\/li>/);
  assert.match(html, /<li data-grades="1 2 3"><span class="board-dday-name">북적북적나들이<\/span> <b>D-6<\/b><\/li>/);
  // 방학은 방학 이름으로, 60일 넘게 남았으면 쓰지 않는다
  assert.equal(boardFromFeed('2026-12-20', feed({ schedule: s })).dday[0].title, '겨울방학');
  assert.ok(!boardHTML(boardFromFeed('2026-10-22', feed({ schedule: [] })), '/').includes('board-dday'));
});

test('준비물 챙길 날: 행사 기간 매일 + 행사 전의 챙길 날, 행사 뒤로 잡힌 챙길 날은 버린다', async () => {
  const { bringsOn, bringLast, usableDue } = await import('../src/lib/board.ts');
  const exam = letter({ eventDate: '2026-10-26', eventEnd: '2026-10-28', due: '2026-11-04' });
  assert.deepEqual(['2026-10-25', '2026-10-26', '2026-10-28', '2026-11-04'].map((d) => bringsOn(exam, d)), [false, true, true, false]);
  assert.equal(bringLast(exam), '2026-10-28');
  assert.equal(usableDue(exam), null);
  // 체험학습(10/30)인데 동의서는 10/23까지: 두 날 모두
  const trip = letter({ eventDate: '2026-10-30', eventEnd: null, due: '2026-10-23' });
  assert.deepEqual(['2026-10-23', '2026-10-30', '2026-10-27'].map((d) => bringsOn(trip, d)), [true, true, false]);
  assert.equal(usableDue(trip), '2026-10-23');
  assert.equal(bringsOn(letter({ eventDate: null, due: '2026-10-23' }), '2026-10-23'), true);
  assert.equal(bringLast(letter({ eventDate: null, due: null })), null);
  // 기말고사(10/26~28, AI 챙길 날 11/4): 전날(금)은 다음 등교일 준비물로, 시험 날마다 오늘 준비물로
  const examLetters = [letter({ id: 'e', grades: [3], bring: ['컴퓨터용 사인펜'], eventDate: '2026-10-26', eventEnd: '2026-10-28', due: '2026-11-04' })];
  assert.deepEqual(boardFromFeed('2026-10-23', feed({ letters: examLetters })).bringNext.map((b) => b.item), ['컴퓨터용 사인펜']);
  assert.deepEqual(boardFromFeed('2026-10-27', feed({ letters: examLetters })).bringToday.map((b) => b.item), ['컴퓨터용 사인펜']);
  assert.deepEqual(boardFromFeed('2026-11-04', feed({ letters: examLetters })).bringToday, []);
});

test('시험·행사 기간의 D-day 귀퉁이: 「1일째」, 마지막 날은 「마지막 날」, 하루짜리는 「D-day」', () => {
  const s = [
    { title: '기말고사', start: '2026-10-26', end: '2026-10-28', grades: [3], kind: 'event' },
    { title: '북적북적나들이', start: '2026-10-30', end: '2026-10-30', grades: [], kind: 'event' },
  ];
  const label = (day) => boardFromFeed(day, feed({ schedule: s })).dday.map((d) => [d.title, d.label]);
  assert.deepEqual(label('2026-10-24'), [['기말고사', 'D-2'], ['북적북적나들이', 'D-6']]);
  assert.deepEqual(label('2026-10-26'), [['기말고사', '1일째'], ['북적북적나들이', 'D-4']]);
  assert.deepEqual(label('2026-10-28'), [['기말고사', '마지막 날'], ['북적북적나들이', 'D-2']]);
  assert.deepEqual(label('2026-10-30'), [['북적북적나들이', 'D-day']]);
  assert.match(boardHTML(boardFromFeed('2026-10-26', feed({ schedule: s })), '/'), /기말고사<\/span> <span class="badge badge--g3 board-badge">3학년<\/span> <b>1일째<\/b>/);
});

test('오늘 일정 줄에는 행사 이름을 data-event로 적어 둔다(바뀐 수업과 겹치면 브라우저가 감춘다)', () => {
  const html = boardHTML(boardFromFeed('2026-10-22', feed()), '/');
  assert.match(html, /<li data-grades="1 2 3" data-event="2학기 중간고사">2학기 중간고사<\/li>/);
});

test('여러 날 준비물: 오늘 줄에 이미 있는 가정통신문은 다음 등교일 줄에 되풀이하지 않는다', () => {
  const exam = [letter({ id: 'e', grades: [3], bring: ['사인펜'], eventDate: '2026-10-26', eventEnd: '2026-10-28', due: null })];
  const b = boardFromFeed('2026-10-26', feed({ letters: exam }));
  assert.deepEqual(b.bringToday.map((x) => x.item), ['사인펜']);
  assert.deepEqual(b.bringNext, []);
  assert.ok(!boardHTML(b, '/').includes('10월 27일 (화) 준비물'));
});

test('디데이: 한글 「페스티벌」(백마페스티벌·크리스마스 페스티벌)도 센다', () => {
  const s = [
    { title: '백마페스티벌(1~7교시)', start: '2026-11-13', end: '2026-11-13', grades: [], kind: 'event' },
    { title: '방송제(5~6교시)', start: '2026-11-11', end: '2026-11-11', grades: [], kind: 'event' },
  ];
  assert.deepEqual(boardFromFeed('2026-11-09', feed({ schedule: s })).dday.map((d) => [d.title, d.label]), [['백마페스티벌(1~7교시)', 'D-4']]);
});
