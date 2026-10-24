import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTimetable, weekTableHTML, changesBoxHTML, changesTarget, changeItems, lastPeriod, nameSchoolEvents, weekGroups, weekRange } from '../src/lib/timetable.ts';

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

test('changeItems carries the original subject or the calendar note', () => {
  assert.deepEqual(changeItems(feed, 'c15', '2026-10-22'), [
    { text: '3교시 과학', from: '체육', note: null },
    { text: '5교시 창체', from: null, note: '동아리활동' },
  ]);
});

test('weekGroups names this week and next week', () => {
  const days = ['2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27'];
  assert.deepEqual(weekGroups(days, '2026-10-22').map((g) => g.label), ['이번 주', '다음 주']);
});

test('changeItems: 칸 데이터로 「N교시 과목」 + 원래 과목/학사일정 이름, N교시까지는 한 줄', () => {
  const cut = (p) => cell(p, '', { changed: { from: '국어', note: null } });
  const f = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [{ ymd: 'd', off: null, until: 4, cells: [
    cell(5, '', { changed: { from: '국어', note: null } }), cell(3, '과학', { changed: { from: '체육', note: '행사' } }), cell(1, '창체', { special: true, changed: { from: null, note: '동아리활동' } }), cut(6), cell(2, '수학'),
  ] }] }] };
  assert.deepEqual(changeItems(f, 'c', 'd'), [
    { text: '1교시 창체', from: null, note: '동아리활동' },
    { text: '3교시 과학', from: '체육', note: null },
    '오늘은 4교시까지',
  ]);
  const cleared = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [{ ymd: 'd', off: null, until: null, cells: [cell(2, '', { changed: { from: '수학', note: null } })] }] }] };
  assert.deepEqual(changeItems(cleared, 'c', 'd'), [{ text: '2교시 수업 없음', from: '수학', note: null }]);
  assert.deepEqual(changeItems(feed, 'nope', '2026-10-22'), []);
});

test('changeItems collapses periods cut by until into one line', () => {
  const cut = (p) => cell(p, '', { changed: { from: '국어', note: null } });
  const f = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [{ ymd: 'd', off: null, until: 4, cells: [cell(3, '과학', { changed: { from: '체육', note: null } }), cut(5), cut(6)] }] }] };
  assert.deepEqual(changeItems(f, 'c', 'd'), [{ text: '3교시 과학', from: '체육', note: null }, '오늘은 4교시까지']);
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
    { ymd: '2026-10-23', off: null, until: null, cells: [cell(1, '영어', { changed: { from: '체육', note: null } }), cell(2, '도덕'), cell(3, '창체', { special: true, changed: { from: null, note: '동아리활동' } })] },
  ],
};

test('weekTableHTML: 5 columns, rows = max periods, today flagged', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.equal((html.match(/<th scope="col"/g) ?? []).length, 5);
  assert.equal((html.match(/<th scope="row"/g) ?? []).length, 5);
  assert.equal((html.match(/<th scope="col" class="tt-today"/g) ?? []).length, 1);
});

test('바뀐 칸은 원래 과목을 줄 그어 칸 안에, 단추·reveal 없음', () => {
  const html = weekTableHTML(gridCls, ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'], '2026-10-23');
  assert.match(html, /<td class="[^"]*tt-changed[^"]*" aria-label="금요일 1교시 영어, 원래 체육, 바뀜"><b>영어<\/b><s>체육<\/s><\/td>/);
  assert.ok(!html.includes('data-reveal') && !html.includes('<button'));
  assert.match(html, /<small class="tt-special"><span class="sr-only">, <\/span>창체<\/small>/);
});

test('weekTableHTML: 오늘 열은 머리 「오늘」 + 칸마다 tt-today, 다른 날 머리는 날짜', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-23');
  assert.match(html, /<th scope="col" class="tt-today"><span>금<\/span><small><span class="sr-only">23일 <\/span>오늘<\/small><\/th>/);
  assert.match(html, /<th scope="col"><span>월<\/span><small>19<span class="sr-only">일<\/span><\/small><\/th>/);
  // 오늘 열 칸 5개(1~5교시) 모두 tt-today
  const body = html.slice(html.indexOf('<tbody>'));
  assert.equal((body.match(/<td class="tt-today[^"]*"/g) ?? []).length, 5);
});

test('weekTableHTML: 원래 과목 없이 사유만 있으면 사유를 작은 글자로, 줄긋기 없음', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-23');
  assert.match(html, /aria-label="금요일 3교시 창체, 동아리활동, 바뀜"><b>창체<\/b><small class="tt-note">동아리활동<\/small><\/td>/);
});

test('weekTableHTML: changed cell text escaped in the cell and its label', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.match(html, /aria-label="목요일 1교시 &lt;b&gt;x&lt;\/b&gt;, 원래 &lt;i&gt;y&lt;\/i&gt;, 바뀜"><b>&lt;b&gt;x&lt;\/b&gt;<\/b><s>&lt;i&gt;y&lt;\/i&gt;<\/s><\/td>/);
  assert.doesNotMatch(html, /<b>x|<i>y/);
});

test('weekTableHTML: 창체 글자는 과목이 창체일 때 겹쳐 쓰지 않는다', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.equal((html.match(/class="tt-special"/g) ?? []).length, 1);
  assert.match(html, /동아리<small class="tt-special"><span class="sr-only">, <\/span>창체<\/small>/);
});

test('weekTableHTML: day off shows its name once; until dims later cells and labels header', () => {
  const html = weekTableHTML(gridCls, wk, '2026-10-22');
  assert.equal((html.match(/개교기념일/g) ?? []).length, 1);
  assert.match(html, /<td rowspan="5" class="tt-off-col"><span>개교기념일<\/span><\/td>/);
  assert.match(html, /2교시까지/);
  assert.ok((html.match(/tt-cut/g) ?? []).length >= 3);
});

test('weekTableHTML: escapes off text and class name; 수업 없음 for a cleared changed cell; caption names the week', () => {
  const c = { id: 'c', name: '<s>1</s>', grade: 1, days: [
    { ymd: '2026-10-19', off: '<u>휴</u>', until: null, cells: [] },
    { ymd: '2026-10-20', off: null, until: null, cells: [cell(1, '', { changed: { from: '수학', note: null } })] },
  ] };
  const html = weekTableHTML(c, wk, '2026-10-22');
  assert.doesNotMatch(html, /<s>1|<u>/);
  assert.match(html, /&lt;u&gt;휴/);
  assert.match(html, /aria-label="화요일 1교시 수업 없음, 원래 수학, 바뀜"><b>수업 없음<\/b><s>수학<\/s>/);
  assert.match(html, /<caption class="sr-only">&lt;s&gt;1&lt;\/s&gt; 시간표 10\/19~23<\/caption>/);
});

test('weekRange: 월~금 날짜, 달이 바뀌면 달도 쓴다', () => {
  assert.equal(weekRange('2026-10-19'), '10/19~23');
  assert.equal(weekRange('2026-09-28'), '9/28~10/2');
});

test('changesBoxHTML: 안내판, 줄 = 교시 · 굵은 과목 + 줄 그은 원래 과목, escape', () => {
  const box = changesBoxHTML(gridCls, '2026-10-23', '오늘 바뀐 수업', '바뀐 수업 없어요');
  assert.match(box, /^<section class="sign tt-changes" aria-labelledby="tt-changes-title"><div class="sign-head"><h2 id="tt-changes-title">오늘 바뀐 수업<\/h2><\/div>/);
  assert.match(box, /<li><span>1교시<\/span><span><b>영어<\/b> <s><span class="sr-only">원래 <\/span>체육<\/s><\/span><\/li>/);
  assert.match(box, /<li><span>3교시<\/span><span><b>창체<\/b> <small>동아리활동<\/small><\/span><\/li>/);
  assert.match(changesBoxHTML(gridCls, '2026-10-22', '오늘 바뀐 수업'), /<b>&lt;b&gt;x&lt;\/b&gt;<\/b> <s><span class="sr-only">원래 <\/span>&lt;i&gt;y&lt;\/i&gt;<\/s>/);
  assert.match(changesBoxHTML(gridCls, '2026-10-19', '오늘 바뀐 수업', '바뀐 수업 없어요'), /<p class="sign-note">바뀐 수업 없어요<\/p>/);
});

test('changesBoxHTML: 「N교시까지」로 잘린 칸은 한 줄로, 다음 등교일이면 날짜를 제목 옆에', () => {
  const cut = (p) => cell(p, '', { changed: { from: '국어', note: null } });
  const c = { id: 'c', name: '1-1', grade: 1, days: [{ ymd: '2026-10-26', off: null, until: 4, cells: [cell(3, '과학', { changed: { from: '체육', note: null } }), cut(5), cut(6)] }] };
  const box = changesBoxHTML(c, '2026-10-26', '다음 등교일 바뀐 수업', '바뀐 수업 없어요', '10월 26일 월');
  assert.match(box, /<h2 id="tt-changes-title">다음 등교일 바뀐 수업<\/h2><span class="sign-date">10월 26일 월<\/span>/);
  assert.equal((box.match(/<li>/g) ?? []).length, 2);
  assert.match(box, /<li><span>5교시부터<\/span><span>수업 없음<\/span><\/li>/);
});

test('changesTarget: today on a school day, next school day on weekend or day off', () => {
  assert.deepEqual(changesTarget(gridCls, '2026-10-22'), { ymd: '2026-10-22', label: '오늘 바뀐 수업', empty: '바뀐 수업 없어요', date: '' });
  assert.deepEqual(changesTarget(gridCls, '2026-10-24'), { ymd: '2026-10-26', label: '다음 등교일 바뀐 수업', empty: '바뀐 수업 없어요', date: '10월 26일 월' });
  assert.equal(changesTarget(gridCls, '2026-10-21').ymd, '2026-10-22');
});

test('changesBoxHTML: date outside the feed is not called empty', () => {
  const t = changesTarget(gridCls, '2026-10-24');
  assert.match(changesBoxHTML(gridCls, t.ymd, t.label, t.empty, t.date), /<p class="sign-note">그날 시간표가 아직 없어요<\/p>/);
});

test('changeItems와 changesBoxHTML은 같은 줄 규칙을 쓴다', () => {
  const f = { ...feed, classes: [gridCls] };
  assert.deepEqual(changeItems(f, 'c', '2026-10-23'), [{ text: '1교시 영어', from: '체육', note: null }, { text: '3교시 창체', from: null, note: '동아리활동' }]);
  const box = changesBoxHTML(gridCls, '2026-10-23', '오늘 바뀐 수업');
  assert.ok(box.indexOf('1교시') < box.indexOf('3교시'));
  assert.match(box, /<b>영어<\/b> <s><span class="sr-only">원래 <\/span>체육<\/s>/);
  assert.match(box, /<b>창체<\/b> <small>동아리활동<\/small>/);
});

test('changeItems: 다음 등교일 줄은 「그날은 N교시까지」', () => {
  const f = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [{ ymd: 'd', off: null, until: 4, cells: [cell(5, '', { changed: { from: '국어', note: null } })] }] }] };
  assert.deepEqual(changeItems(f, 'c', 'd', '그날은'), ['그날은 4교시까지']);
});

test('lastPeriod: 그날 마지막 교시(N교시까지가 있으면 그것), 쉬는 날·없는 날은 null', () => {
  const f = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [
    { ymd: 'a', off: null, until: null, cells: [cell(1, '국어'), cell(6, '수학'), cell(7, '')] },
    { ymd: 'b', off: null, until: 4, cells: [cell(1, '국어'), cell(6, '수학')] },
    { ymd: 'c', off: '재량휴업일', until: null, cells: [] },
    { ymd: 'e', off: null, until: null, cells: [] },
  ] }] };
  assert.equal(lastPeriod(f, 'c', 'a'), 6);
  assert.equal(lastPeriod(f, 'c', 'b'), 4);
  assert.equal(lastPeriod(f, 'c', 'c'), null);
  assert.equal(lastPeriod(f, 'c', 'e'), null);
  assert.equal(lastPeriod(f, 'c', 'z'), null);
  assert.equal(lastPeriod(null, 'c', 'a'), null);
});

test('weekGroups: 셋째 주부터 「다다음 주」, 「3주 뒤」(날짜는 단추 아래 줄에 따로)', () => {
  const days = ['2026-10-22', '2026-10-26', '2026-11-02', '2026-11-09'];
  assert.deepEqual(weekGroups(days, '2026-10-22').map((g) => g.label), ['이번 주', '다음 주', '다다음 주', '3주 뒤']);
});

test('changeItems: 이어진 교시가 같은 과목으로 바뀌면 칠판에는 한 줄(「1~3교시 학교 행사」)', () => {
  const ch = (p, subject, from, note = null) => cell(p, subject, { changed: { from, note } });
  const f = { ...feed, classes: [{ id: 'c', name: '1-1', grade: 1, days: [{ ymd: 'd', off: null, until: null, cells: [
    ch(1, '학교 행사', '역사'), ch(2, '학교 행사', '과학'), ch(3, '학교 행사', '음악'), ch(5, '영어', '체육'), ch(6, '영어', '체육'),
  ] }] }] };
  assert.deepEqual(changeItems(f, 'c', 'd'), [
    { text: '1~3교시 학교 행사', from: null, note: null },
    { text: '5~6교시 영어', from: '체육', note: null },
  ]);
});

test('nameSchoolEvents: 「학교 행사」로만 적힌 바뀐 칸은 그날 그 학년 학사일정 이름으로', () => {
  const ev = (title, start, end, grades, kind = 'event') => ({ title, start, end, grades, kind });
  const schedule = [
    ev('기말고사', '2026-10-26', '2026-10-28', [3]),
    ev('학급자치회의', '2026-10-26', '2026-10-26', []),
    ev('북적북적나들이', '2026-10-30', '2026-10-30', []),
    ev('학교폭력예방교육', '2026-11-02', '2026-11-02', []),
    ev('학급자치회의', '2026-11-02', '2026-11-02', []),
    ev('재량휴업일', '2026-11-20', '2026-11-20', [], 'dayoff'),
  ];
  const ch = (p, subject, from) => cell(p, subject, { changed: { from, note: null } });
  const tt = { ...feed, classes: [
    { id: 'c3', name: '3-2', grade: 3, days: [
      { ymd: '2026-10-26', off: null, until: null, cells: [ch(1, '학교 행사', '역사'), ch(2, '영어', '체육'), cell(3, '학교 행사')] },
      { ymd: '2026-10-30', off: null, until: null, cells: [ch(1, '학교 행사', '국어')] },
      { ymd: '2026-11-02', off: null, until: null, cells: [ch(1, '학교 행사', '국어')] },
    ] },
    { id: 'c1', name: '1-5', grade: 1, days: [
      { ymd: '2026-10-26', off: null, until: null, cells: [ch(1, '학교 행사', '수학')] },
    ] },
  ] };
  const out = nameSchoolEvents(tt, schedule);
  const at = (id, ymd) => out.classes.find((c) => c.id === id).days.find((d) => d.ymd === ymd).cells;
  // 3학년 10/26: 그 학년만의 행사(기말고사)가 하나 → 그 이름, 원래 과목은 그대로. 바뀌지 않은 칸·다른 과목은 그대로.
  assert.deepEqual(at('c3', '2026-10-26'), [ch(1, '기말고사', '역사'), ch(2, '영어', '체육'), cell(3, '학교 행사')]);
  // 학년 행사가 없고 전 학년 행사가 하나 → 그 이름
  assert.equal(at('c3', '2026-10-30')[0].subject, '북적북적나들이');
  // 전 학년 행사가 둘이면 알 수 없으니 그대로
  assert.equal(at('c3', '2026-11-02')[0].subject, '학교 행사');
  // 1학년 10/26: 학년 행사 없음, 전 학년 행사 하나(학급자치회의) → 그 이름
  assert.equal(at('c1', '2026-10-26')[0].subject, '학급자치회의');
  // 원본은 건드리지 않는다, 일정이 없거나 못 받았으면 그대로
  assert.equal(tt.classes[0].days[0].cells[0].subject, '학교 행사');
  assert.equal(nameSchoolEvents(tt, null), tt);
  assert.equal(nameSchoolEvents(null, schedule), null);
});

test('changesBoxHTML: 이어진 교시가 같은 과목이면 한 줄(「1~3교시」 · 기말고사)', () => {
  const ch = (p, subject, from) => cell(p, subject, { changed: { from, note: null } });
  const cls = { id: 'c', name: '3-2', grade: 3, days: [{ ymd: '2026-10-26', off: null, until: null, cells: [ch(1, '기말고사', '역사'), ch(2, '기말고사', '과학'), ch(3, '기말고사', '음악'), ch(5, '영어', '체육')] }] };
  const box = changesBoxHTML(cls, '2026-10-26', '오늘 바뀐 수업');
  assert.equal((box.match(/<li>/g) ?? []).length, 2);
  assert.match(box, /<li><span>1~3교시<\/span><span><b>기말고사<\/b><\/span><\/li>/);
  assert.match(box, /<li><span>5교시<\/span><span><b>영어<\/b> <s><span class="sr-only">원래 <\/span>체육<\/s><\/span><\/li>/);
});
