import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upcomingRows, newLetterRows, isNewLetter, visibleShows, recentLetterMeta, unreadLetterCount } from '../src/lib/home.ts';
import { gradeBadge, badgeHTML, gradeLabel, scheduleBadgeHTML } from '../src/lib/grades.ts';

const ev = (title, start, end = start, grades = [], kind = 'event') => ({ title, start, end, grades, kind });
const letter = (o) => ({
  id: 'x', number: null, subject: '제목', grades: [], classes: null, eventDate: null, eventEnd: null,
  bring: [], due: null, summary: '', attachments: [], sourceUrl: 'https://example.com', postedOn: '2026-10-01',
  publishedOn: '2026-10-01', ...o,
});
const shows = (rows) => Object.fromEntries(rows.map((r) => [r.item.title ?? r.item.subject, r.show]));
const spares = (rows) => Object.fromEntries(rows.filter((r) => r.spare).map((r) => [r.item.title ?? r.item.subject, r.spare]));

test('학년 배지: 글자 + 색', () => {
  assert.deepEqual(gradeBadge([1]), { text: '1학년', tone: 'g1' });
  assert.deepEqual(gradeBadge([3]), { text: '3학년', tone: 'g3' });
  assert.deepEqual(gradeBadge([2, 1]), { text: '1·2학년', tone: 'all' });
  assert.deepEqual(gradeBadge([]), { text: '전 학년', tone: 'all' });
  assert.deepEqual(gradeBadge([1, 2, 3]), { text: '전 학년', tone: 'all' });
  assert.equal(badgeHTML([2]), '<span class="badge badge--g2">2학년</span>');
  assert.equal(gradeLabel([1, 2]), '1·2학년');
});

test('일정 배지: 공휴일·쉬는 날은 빨간 글자, 행사는 학년 배지', () => {
  assert.equal(scheduleBadgeHTML(ev('개천절', '2026-10-03', '2026-10-03', [], 'holiday')), '<span class="badge-off">공휴일</span>');
  assert.equal(scheduleBadgeHTML(ev('재량휴업일', '2026-11-20', '2026-11-20', [], 'dayoff')), '<span class="badge-off">쉬는 날</span>');
  assert.equal(scheduleBadgeHTML(ev('기말고사', '2026-10-26', '2026-10-28', [3])), '<span class="badge badge--g3">3학년</span>');
  // 학년만 쉬는 날은 학년 배지 + 빨간 글자
  assert.equal(scheduleBadgeHTML(ev('재량휴업일', '2026-11-20', '2026-11-20', [3], 'dayoff')), '<span class="badge badge--g3">3학년</span> <span class="badge-off">쉬는 날</span>');
  assert.equal(scheduleBadgeHTML(ev('공휴일', '2026-11-20', '2026-11-20', [1, 2], 'holiday')), '<span class="badge badge--all">1·2학년</span> <span class="badge-off">공휴일</span>');
});

test('다가오는 일정: 오늘 뒤에 시작하는 것만(오늘에 걸친 것은 칠판에), 보기마다 2개 + 예비 2개', () => {
  const schedule = [
    ev('지난 일', '2026-10-01', '2026-10-21'),
    ev('예배', '2026-10-22'),
    ev('오늘까지 걸친 행사', '2026-10-20', '2026-10-23'),
    ev('3학년 시험', '2026-10-26', '2026-10-28', [3]),
    ev('1학년 체험', '2026-10-30', '2026-10-30', [1]),
    ev('재량휴업일', '2026-11-20', '2026-11-20', [], 'dayoff'),
    ev('학생예배', '2026-11-25'),
    ev('졸업식', '2027-01-08'),
  ];
  const rows = upcomingRows(schedule, '2026-10-22');
  assert.deepEqual(shows(rows), { '3학년 시험': 'all 3', '1학년 체험': 'all 1', 재량휴업일: '1 2 3', 학생예배: '2', 졸업식: '' });
  assert.deepEqual(spares(rows), { 재량휴업일: 'all', 학생예배: 'all 1 3', 졸업식: '1 2 3' });
  assert.ok(!rows.some((r) => ['지난 일', '예배', '오늘까지 걸친 행사'].includes(r.item.title)));
  assert.equal(upcomingRows(null, '2026-10-22'), null);
  assert.deepEqual(upcomingRows([], '2026-10-22'), []);
});

test('visibleShows: 브라우저가 줄을 뺀 뒤에도 보기마다 앞에서 n개', () => {
  const rows = upcomingRows([
    ev('가', '2026-10-23'), ev('나', '2026-10-26'), ev('다', '2026-10-27', '2026-10-27', [2]), ev('라', '2026-10-28'),
  ], '2026-10-22');
  // 날이 바뀌어 「가」가 빠지면 예비였던 줄이 올라온다.
  assert.deepEqual(visibleShows(rows.slice(1), 2), ['all 1 2 3', 'all 2', '1 3']);
  assert.deepEqual(visibleShows(rows, 2), rows.map((r) => r.show));
  assert.deepEqual(visibleShows([], 2), []);
});

test('새 가정통신문: 2주 안, 최근 것부터, 보기마다 3개', () => {
  const letters = [
    letter({ id: 'old', subject: '오래된 글', publishedOn: '2026-10-07' }),
    letter({ id: 'a', subject: '가', publishedOn: '2026-10-08' }),
    letter({ id: 'b', subject: '나', publishedOn: '2026-10-20', grades: [2] }),
    letter({ id: 'c', subject: '다', publishedOn: '2026-10-21' }),
    letter({ id: 'd', subject: '라', publishedOn: '2026-10-22', grades: [1] }),
    letter({ id: 'future', subject: '내일 글', publishedOn: '2026-10-23' }),
  ];
  const rows = newLetterRows(letters, '2026-10-22');
  assert.deepEqual(rows.map((r) => r.item.id), ['d', 'c', 'b', 'a']);
  assert.deepEqual(shows(rows), { 라: 'all 1', 다: 'all 1 2 3', 나: 'all 2', 가: '1 2 3' });
});

test('isNewLetter: 빌드일 기준 14일 안에 게시된 글만 새 글', () => {
  assert.equal(isNewLetter(letter({ publishedOn: '2026-10-22' }), '2026-10-22'), true);
  assert.equal(isNewLetter(letter({ publishedOn: '2026-10-08' }), '2026-10-22'), true);
  assert.equal(isNewLetter(letter({ publishedOn: '2026-10-07' }), '2026-10-22'), false);
  assert.equal(isNewLetter(letter({ publishedOn: '2026-10-23' }), '2026-10-22'), false);
});

// 홈 「안 읽은 글 N」: 화면에 실린 미리보기 줄이 아니라 최근 2주 글 전체 메타데이터 × 현재 학년 × 이 기기의 읽음으로 센다.
const TODAY = '2026-10-22';
const metaLetters = [
  letter({ id: 'today-1', publishedOn: '2026-10-22', grades: [1] }),
  letter({ id: 'all-a', publishedOn: '2026-10-21', grades: [] }),
  letter({ id: 'all-b', publishedOn: '2026-10-20', grades: [1, 2, 3] }),
  letter({ id: 'g23', publishedOn: '2026-10-19', grades: [2, 3] }),
  letter({ id: 'g2-a', publishedOn: '2026-10-18', grades: [2], classes: '2학년 1~4반' }),
  letter({ id: 'g2-b', publishedOn: '2026-10-17', grades: [2], classes: '2학년 5반' }),
  letter({ id: 'g2-c', publishedOn: '2026-10-16', grades: [2] }),
  letter({ id: 'g2-d', publishedOn: '2026-10-15', grades: [2] }),
  letter({ id: 'g2-e', publishedOn: '2026-10-14', grades: [2] }),
  letter({ id: 'g2-f', publishedOn: '2026-10-13', grades: [2] }),
  letter({ id: 'g2-g', publishedOn: '2026-10-12', grades: [2] }),
  letter({ id: 'edge-14', publishedOn: '2026-10-08', grades: [3] }), // 정확히 14일 전: 들어간다
  letter({ id: 'old-15', publishedOn: '2026-10-07', grades: [] }), // 15일 전: 빠진다
  letter({ id: 'future', publishedOn: '2026-10-23', grades: [] }), // 미래: 빠진다
];

test('recentLetterMeta: 최근 2주 글 전체를 id·게시일·학년만으로, 미리보기 수(3+예비 2)와 상관없이', () => {
  const meta = recentLetterMeta(metaLetters, TODAY);
  assert.deepEqual(meta.map((m) => m.id), ['today-1', 'all-a', 'all-b', 'g23', 'g2-a', 'g2-b', 'g2-c', 'g2-d', 'g2-e', 'g2-f', 'g2-g', 'edge-14']);
  for (const m of meta) assert.deepEqual(Object.keys(m).sort(), ['grades', 'id', 'publishedOn']);
  // 같은 피드로 만든 미리보기 줄은 2학년 보기에 5개(3+예비 2)뿐이지만 메타데이터에는 2학년 글이 다 있다.
  const rows = newLetterRows(metaLetters, TODAY).filter((r) => `${r.show} ${r.spare}`.split(' ').includes('2'));
  assert.equal(rows.length, 5);
  assert.equal(meta.filter((m) => m.grades.length === 0 || m.grades.includes(2)).length, 10);
});

test('unreadLetterCount: 학년(없으면 전부) × 2주 × 읽음, id로 한 번씩', () => {
  const meta = recentLetterMeta(metaLetters, TODAY);
  const none = new Set();
  assert.equal(unreadLetterCount(meta, TODAY, null, none), 12);
  assert.equal(unreadLetterCount(meta, TODAY, 1, none), 3); // today-1 · all-a · all-b
  assert.equal(unreadLetterCount(meta, TODAY, 2, none), 10);
  assert.equal(unreadLetterCount(meta, TODAY, 3, none), 4); // all-a · all-b · g23 · edge-14
  // 읽은 글: 미리보기 안(all-a)과 바깥(g2-g) 모두 빠진다. 다른 학년 글을 읽은 것은 내 숫자에 영향이 없다.
  assert.equal(unreadLetterCount(meta, TODAY, 2, new Set(['all-a', 'g2-g', 'today-1'])), 8);
  assert.equal(unreadLetterCount(meta, TODAY, 1, new Set(['today-1', 'all-a', 'all-b'])), 0);
  assert.equal(unreadLetterCount(meta, TODAY, 1, new Set(['g2-a'])), 3);
  // 날이 지나면 같은 메타데이터로도 오래된 글이 빠진다(자정 뒤 복귀).
  assert.equal(unreadLetterCount(meta, '2026-10-23', 3, none), 3);
  // 같은 id가 두 번 실려도 한 번만 센다.
  assert.equal(unreadLetterCount([...meta, meta[0]], TODAY, 1, none), 3);
  assert.equal(unreadLetterCount([], TODAY, null, none), 0);
});
