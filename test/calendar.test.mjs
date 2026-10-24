import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthCells, itemsOn, monthItems, monthsOf, initialDay, dayLabel, rangeLabel, dayTitle, monthTitle,
  gridHTML, dayRowsHTML, monthRowsHTML, swipeStep,
} from '../src/lib/calendar.ts';

const items = [
  { title: '중간고사', start: '2026-10-07', end: '2026-10-08', grades: [1, 2], kind: 'event' },
  { title: '한글날', start: '2026-10-09', end: '2026-10-09', grades: [], kind: 'holiday' },
  { title: '기말고사', start: '2026-10-26', end: '2026-10-28', grades: [3], kind: 'event' },
];

test('2026년 10월은 9월 27일(일)부터 7칸씩 5주', () => {
  const c = monthCells('2026-10');
  assert.equal(c.length, 35);
  assert.deepEqual(c[0], { ymd: '2026-09-27', inMonth: false });
  assert.deepEqual(c[4], { ymd: '2026-10-01', inMonth: true });
});

test('달 칸: 6주가 되는 달은 42칸, 4주에 꼭 맞는 달도 5주(35칸)로', () => {
  const aug = monthCells('2026-08'); // 8월 1일이 토요일
  assert.equal(aug.length, 42);
  assert.deepEqual(aug.at(-1), { ymd: '2026-09-05', inMonth: false });
  const feb = monthCells('2026-02'); // 2월 1일이 일요일, 28일
  assert.equal(feb.length, 35);
  assert.deepEqual(feb[0], { ymd: '2026-02-01', inMonth: true });
  assert.deepEqual(feb[28], { ymd: '2026-03-01', inMonth: false });
});

test('학년 필터: 3학년이면 1·2학년 중간고사는 안 보인다', () => {
  assert.deepEqual(itemsOn('2026-10-08', items, 3), []);
  assert.equal(itemsOn('2026-10-08', items, null).length, 1);
  assert.deepEqual(monthItems('2026-10', items, 3).map((i) => i.title), ['한글날', '기말고사']);
});

test('여러 달에 걸친 일정은 걸친 달마다 한 번', () => {
  const long = [{ title: '겨울방학', start: '2026-12-31', end: '2027-02-28', grades: [], kind: 'dayoff' }];
  assert.equal(monthItems('2027-01', long, 2).length, 1);
  assert.equal(monthItems('2026-11', long, 2).length, 0);
  assert.equal(itemsOn('2027-01-15', long, 1).length, 1);
});

test('학년도 12달: 3월부터 다음 해 2월, 1·2월은 전 해 3월의 학년도', () => {
  const oct = monthsOf(items, '2026-10-23');
  assert.equal(oct.length, 12);
  assert.equal(oct[0], '2026-03');
  assert.equal(oct.at(-1), '2027-02');
  assert.deepEqual(monthsOf([], '2027-02-10').slice(0, 2), ['2026-03', '2026-04']);
  assert.equal(monthsOf([], '2027-03-02')[0], '2027-03');
});

test('다음 학년도 3·4월은 일정이 있는 마지막 달까지만 더한다', () => {
  const ev = (start, end = start) => ({ title: 'x', start, end, grades: [], kind: 'event' });
  assert.equal(monthsOf([ev('2027-03-02')], '2026-10-23').at(-1), '2027-03');
  assert.deepEqual(monthsOf([ev('2027-04-20')], '2026-10-23').slice(-3), ['2027-02', '2027-03', '2027-04']);
  // 2월에서 3월로 이어진 일정도 3월까지
  assert.equal(monthsOf([ev('2027-02-26', '2027-03-03')], '2026-10-23').at(-1), '2027-03');
  // 4월 뒤는 열지 않는다
  assert.equal(monthsOf([ev('2027-05-01')], '2026-10-23').length, 12);
  assert.equal(monthsOf([ev('2027-04-30', '2027-05-02')], '2026-10-23').length, 14);
  // 지난 학년도 일정은 상관없다
  assert.equal(monthsOf([ev('2026-03-02')], '2027-01-10').length, 12);
});

test('학년만 쉬는 날은 전체 보기에서 빨간 날이 아니고, 그 학년 보기에서만 빨갛다', () => {
  const g3 = [{ title: '재량휴업일', start: '2026-11-20', end: '2026-11-20', grades: [3], kind: 'dayoff' }];
  const cell = (grade) => gridHTML('2026-11', '2026-10-23', '2026-11-01', g3, grade).match(/<button[^>]*data-ymd="2026-11-20"[^>]*>/)[0];
  assert.doesNotMatch(cell(null), /is-off/);
  assert.match(cell(3), /is-off/);
  assert.doesNotMatch(cell(1), /is-off/);
});

test('처음 고른 날: 오늘 일정이 있으면 오늘, 없으면 그 달 오늘 뒤 첫 일정 날, 그것도 없으면 오늘', () => {
  assert.equal(initialDay('2026-10', '2026-10-23', items), '2026-10-26');
  assert.equal(initialDay('2026-10', '2026-10-27', items), '2026-10-27');
  assert.equal(initialDay('2026-10', '2026-10-29', items), '2026-10-29');
  assert.equal(initialDay('2026-10', '2026-10-08', items), '2026-10-08');
  assert.equal(initialDay('2026-11', '2026-10-23', items), '2026-11-01');
  assert.equal(dayLabel('2026-10-07', 1), '10월 7일, 일정 1개');
});

test('다른 달로 가면 그 달 첫 일정 날(앞 달에서 이어진 일정이면 1일)', () => {
  assert.equal(initialDay('2026-10', '2026-11-05', items), '2026-10-07');
  const cross = [{ title: '수학여행', start: '2026-09-30', end: '2026-10-02', grades: [2], kind: 'event' }];
  assert.equal(initialDay('2026-10', '2026-11-05', cross), '2026-10-01');
  assert.equal(dayLabel('2026-10-10', 0), '10월 10일, 일정 없음');
});

test('날짜 이름: 하루는 「3일 토」, 같은 달 기간은 「7~8일」, 달을 넘으면 요일 없이', () => {
  assert.equal(rangeLabel({ start: '2026-10-03', end: '2026-10-03' }), '3일 토');
  assert.equal(rangeLabel({ start: '2026-10-07', end: '2026-10-08' }), '7~8일');
  assert.equal(rangeLabel({ start: '2026-09-30', end: '2026-10-02' }), '9월 30일~10월 2일');
  assert.equal(dayTitle('2026-10-23'), '10월 23일 금요일');
  assert.equal(monthTitle('2026-10'), '10월 일정 전체');
  // 오늘이 든 달은 남은 일정만 싣는다
  assert.equal(monthTitle('2026-10', '2026-10-24'), '10월 남은 일정');
  assert.equal(monthTitle('2026-09', '2026-10-24'), '9월 일정 전체');
});

test('달력 칸: 날짜 단추, 읽기 이름, 고른 날, 오늘, 점, 앞뒤 달은 단추가 아님', () => {
  const html = gridHTML('2026-10', '2026-10-23', '2026-10-09', items, null);
  assert.equal((html.match(/<button/g) ?? []).length, 31);
  assert.match(html, /<button[^>]*data-ymd="2026-10-07"[^>]*aria-label="10월 7일, 일정 1개"/);
  assert.match(html, /data-ymd="2026-10-09"[^>]*aria-pressed="true"/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /class="cal-day is-today"[^>]*data-ymd="2026-10-23"/);
  // 공휴일은 빨간 글자·빨간 점, 점은 장식
  assert.match(html, /class="cal-day is-off"[^>]*data-ymd="2026-10-09"[^>]*>9<i class="cal-dot" aria-hidden="true"><\/i>/);
  // 앞뒤 달 칸은 비워 둔다(흐린 숫자는 읽히지도 않고 대비도 낮다)
  assert.match(html, /<span class="cal-out" aria-hidden="true"><\/span>/);
  assert.ok(!html.includes('>27</span>'));
  assert.match(html, /class="cal-day is-sun"[^>]*data-ymd="2026-10-04"/);
  assert.match(html, /class="cal-day is-sat"[^>]*data-ymd="2026-10-10"/);
});

test('달력 칸: 3학년이면 1·2학년 중간고사 날에 점이 없다', () => {
  const html = gridHTML('2026-10', '2026-10-23', '2026-10-23', items, 3);
  assert.match(html, /data-ymd="2026-10-07" aria-label="10월 7일, 일정 없음" aria-pressed="false">7<\/button>/);
  assert.match(html, /data-ymd="2026-10-27"[^>]*>27<i class="cal-dot"/);
});

test('고른 날 목록과 달 목록: 이름 · 배지, 없으면 안내 문구, 글자는 이스케이프', () => {
  assert.match(dayRowsHTML('2026-10-08', items, null), /<span class="sign-title">중간고사<\/span><span class="badge badge--all">1·2학년<\/span>/);
  assert.equal(dayRowsHTML('2026-10-23', items, null), '<p class="sign-note">이날은 학사일정이 없어요</p>');
  const month = monthRowsHTML('2026-10', items, null);
  assert.match(month, /<span class="sign-date">7~8일<\/span><span class="sign-title">중간고사<\/span>/);
  assert.match(month, /<span class="sign-date">9일 금<\/span><span class="sign-title">한글날<\/span><span class="badge-off">공휴일<\/span>/);
  assert.match(monthRowsHTML('2026-11', items, null), /이달에는 학사일정이 없어요/);
  // 오늘이 든 달은 끝난 일정을 빼고(걸쳐 있는 것은 남긴다), 다 끝났으면 「이달에 남은 학사일정이 없어요」. 다른 달은 그대로.
  const left = monthRowsHTML('2026-10', items, null, '2026-10-27');
  assert.ok(!left.includes('중간고사') && !left.includes('한글날'));
  assert.match(left, /<li><span class="sign-date">26~28일<\/span><span class="sign-title">기말고사/);
  assert.equal(monthRowsHTML('2026-10', items, null, '2026-10-29'), '<p class="sign-note">이달에 남은 학사일정이 없어요</p>');
  assert.equal(monthRowsHTML('2026-10', items, null, '2026-11-05'), month);
  const cross = [{ title: '<b>여행', start: '2026-09-30', end: '2026-10-02', grades: [2], kind: 'event' }];
  assert.match(monthRowsHTML('2026-10', cross, 2), /9월&nbsp;30일~<wbr>10월&nbsp;2일<\/span><span class="sign-title">&lt;b&gt;여행/);
});

test('swipeStep: 가로로 50px 넘게, 세로보다 확실히, 0.8초 안에 밀면 달을 넘긴다', () => {
  assert.equal(swipeStep(-80, 5, 200), 1); // 왼쪽으로 밀면 다음 달
  assert.equal(swipeStep(80, -5, 200), -1); // 오른쪽으로 밀면 이전 달
  assert.equal(swipeStep(-40, 0, 200), 0); // 너무 짧음
  assert.equal(swipeStep(-80, 70, 200), 0); // 비스듬함(세로 스크롤)
  assert.equal(swipeStep(-80, 5, 1200), 0); // 너무 느림(끌다가 멈춤)
});
