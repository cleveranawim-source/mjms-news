import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEDULE_FIXES } from '../src/lib/schedule-fix.ts';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// 실제 빌드를 fixture 피드로 한 번 돌려 dist/ HTML을 확인한다. 네트워크는 쓰지 않는다.
const root = resolve(import.meta.dirname, '..');
const fixture = resolve(root, 'test/fixtures/feed.json');
const feed = JSON.parse(readFileSync(fixture, 'utf8'));
// 공유 fixture는 건드리지 않고, 태그를 끊으려는 제목이 든 알림을 더한 사본으로 빌드한다.
const evil = { ...feed.letters[2], id: 'L-evil', subject: '끊기 시험 </script><b>x', number: '제2026-80호', postedOn: '2026-09-01', publishedOn: '2026-09-01', bring: ['끊기 </script><b>물건'], due: '2026-10-23' };
const tmp = resolve(mkdtempSync(resolve(tmpdir(), 'feed-')), 'feed.json');
// 11·12월은 학교 학사일정표로 바꿔 끼우므로(src/lib/schedule-fix.ts) 쉬는 날 배지 확인용 재량휴업일은 10월에 둔다.
const dayOff = { title: '재량휴업일', start: '2026-10-30', end: '2026-10-30', grades: [], kind: 'dayoff' };
const built = { ...feed, letters: [...feed.letters, evil], schedule: [...feed.schedule, dayOff] };
writeFileSync(tmp, JSON.stringify(built));
execFileSync('npx', ['astro', 'build'], {
  cwd: root,
  env: { ...process.env, NEWS_FEED_FILE: tmp, NEWS_TODAY: '2026-10-22' },
  stdio: 'pipe',
});
const read = (p) => readFileSync(resolve(root, 'dist', p), 'utf8');

// 학사일정(schedule)이 없는 피드 사본도 따로 빌드한다(나이스를 못 읽은 날).
const noScheduleDir = mkdtempSync(resolve(tmpdir(), 'feed-nosched-'));
const noScheduleFeed = resolve(noScheduleDir, 'feed.json');
const { schedule: _dropped, ...withoutSchedule } = feed;
writeFileSync(noScheduleFeed, JSON.stringify(withoutSchedule));
const noScheduleOut = resolve(noScheduleDir, 'dist');
execFileSync('npx', ['astro', 'build', '--outDir', noScheduleOut], {
  cwd: root,
  env: { ...process.env, NEWS_FEED_FILE: noScheduleFeed, NEWS_TODAY: '2026-10-22' },
  stdio: 'pipe',
});
const readNoSchedule = (p) => readFileSync(resolve(noScheduleOut, p), 'utf8');

test('가정통신문 한 건: AI 요약 안내는 정보 표 바로 아래, 연 글은 이 기기에 「읽음」으로', () => {
  const l = feed.letters[0];
  const html = read(`notices/${l.id}/index.html`);
  assert.match(html, /<\/dl>\s*<p class="facts-note">요약은 AI가 만들고 선생님이 확인했어요\. 원문과 다르면 원문이 맞아요\./);
  assert.match(html, /mjms-read/);
});

test('가정통신문 목록·첫 화면: 카드와 줄에 글 id를 달아 이 기기에서 읽은 글을 가린다', () => {
  const l = feed.letters[0];
  assert.match(read('notices/index.html'), new RegExp(`<li[^>]*data-id="${l.id}"`));
  assert.match(read('notices/index.html'), /mjms-read/);
  assert.match(read('index.html'), /data-letter-id=/);
});

test('가정통신문 한 건: 원문 링크·요약·첨부, 준비물은 정보 표에', () => {
  const l = feed.letters[0];
  const html = read(`notices/${l.id}/index.html`);
  assert.match(html, /학교 홈페이지 원문 보기/);
  assert.ok(html.includes(l.sourceUrl));
  assert.match(html, /함께 온 파일/);
  assert.match(html, /<dt>준비물<\/dt><dd>도시락, 물병, 체험학습 동의서<\/dd>/);
  assert.match(html, /<dt>준비물 챙길 날<\/dt><dd>10월 23일 \(금\)<\/dd>/);
  const link = html.match(/<a [^>]*href="[^"]*myongji\.sen\.ms\.kr[^"]*"[^>]*>/)[0];
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="[^"]*noopener/);
});

test('학급이 있는 알림은 목록에 학급을 보인다', () => {
  assert.match(read('notices/index.html'), /2학년 1~4반/);
});

test('가정통신문 목록: 문서 카드 = 배지 → 제목 → 게시일·호수', () => {
  const html = read('notices/index.html');
  const card = html.match(/<article class="doc"[\s\S]*?<\/article>/)[0];
  assert.ok(card.indexOf('class="badge') < card.indexOf('<h2') && card.indexOf('<h2') < card.indexOf('게시'));
  assert.match(card, /제2026-87호/);
  assert.match(html, /data-letter-filter/);
});

test('가정통신문 목록: 카드 전체가 링크, 새 글·준비물 표시, 게시일 최신순', () => {
  const html = read('notices/index.html');
  const cards = [...html.matchAll(/<li data-grades="([^"]*)" data-id="[^"]*">\s*<article class="doc"[\s\S]*?<\/article>/g)];
  assert.equal(cards.length, feed.letters.length + 1);
  const by = (id) => cards.find((c) => c[0].includes(`/notices/${id}/`))[0];
  const first = by('L-2026-1022-3');
  assert.match(first, /<article class="doc"[^>]*>\s*<a class="doc-link" href="\/notices\/L-2026-1022-3\/">[\s\S]*<\/a>\s*<\/article>/);
  assert.match(first, /badge badge--g1">1학년[\s\S]*>새 글<[\s\S]*>준비물</);
  assert.match(first, /<h2 class="doc-title">2026학년도 2학기 현장체험학습 안내<\/h2>/);
  assert.match(first, /10월 22일 게시 · 제2026-87호/);
  // 2주 안(빌드일 10월 22일 기준)이 아니면 「새 글」이 없다. 준비물이 없으면 「준비물」도 없다.
  assert.ok(!by('L-evil').includes('새 글'));
  assert.ok(!by('L-2026-1020-2').includes('>준비물<'));
  assert.match(by('L-2026-1020-2'), /badge badge--all">전 학년/);
  // 호수가 없으면 게시일만.
  assert.match(by('L-2026-1015-1'), /10월 15일 게시<\/p>/);
  // 게시일 최신순
  const order = cards.map((c) => c[0].match(/\/notices\/([^/]+)\//)[1]);
  assert.deepEqual(order, ['L-2026-1022-3', 'L-2026-1020-2', 'L-2026-1015-1', 'L-evil']);
  assert.equal(cards[0][1], '1');
  assert.ok(!html.includes('class="row'));
});

test('가정통신문 목록: 학년 알약(자바스크립트 전엔 감춤), 숨긴 글 안내, 보조 줄 없는 명패', () => {
  const html = read('notices/index.html');
  const filter = html.match(/<div[^>]*data-letter-filter[\s\S]*?<\/div>/)[0];
  assert.match(filter, /^<div[^>]*\shidden/);
  assert.match(filter, /role="group"/);
  for (const v of ['mine', 'all', '1', '2', '3']) assert.match(filter, new RegExp(`<button type="button"[^>]*data-view="${v}"[^>]*aria-pressed="(true|false)"`), v);
  assert.match(filter, /학년 \+ 전 학년/);
  assert.match(filter, />모든 학년</);
  // 숨긴 글 안내는 늘 있는 상태 칸(비면 자리만 없앤다)이라 바뀌면 읽어 준다.
  assert.match(html, /<p class="docs-note" data-letters-note role="status"><\/p>/);
  assert.match(html, /볼 수 있어요/); // 문구는 브라우저가 센다(스크립트 안)
  const plate = html.match(/<header[^>]*class="plate[\s\S]*?<\/header>/)[0];
  // page 명패는 제목만 — 아래 알약과 같은 말을 되풀이하지 않는다.
  assert.ok(!plate.includes('plate-sub'));
  assert.ok(!plate.includes('data-open-class-sheet'));
  // 알약 줄의 display:flex가 hidden을 덮지 않는다(자바스크립트가 없으면 감춘 채).
  const css = readdirSync(resolve(root, 'dist/_astro')).filter((f) => f.endsWith('.css')).map((f) => read(`_astro/${f}`)).join('\n');
  assert.match(css, /\.pills\[hidden\]\{display:none\}/);
});

test('가정통신문 한 건: 문서 머리, 정보 표, 원문 버튼', () => {
  const html = read('notices/L-2026-1022-3/index.html');
  assert.match(html, /class="letter-head"[\s\S]*명지중학교/);
  assert.match(html, /class="letter-head"[\s\S]*class="letter-no">제2026-87호</);
  assert.match(html, /<dl class="facts">[\s\S]*대상/);
  assert.match(html, /<dt>대상<\/dt><dd><span class="badge badge--g1">1학년<\/span><\/dd>/);
  assert.match(html, /<dt>일정<\/dt><dd>10월 30일 \(금\)<\/dd>/);
  assert.match(html, /<dt>게시일<\/dt><dd>10월 22일 \(목\)<\/dd>/);
  assert.match(html, /학교 홈페이지 원문 보기/);
  assert.match(html, /<a class="back-link" href="\/notices\/"[\s\S]*?가정통신문<\/a>/);
  assert.match(html, /<button[^>]*class="letter-print"[^>]*>/);
  assert.ok(!html.includes('관련 날짜'));
});

test('가정통신문 한 건: 기간 일정, 준비물 없으면 그 줄도 없다, 학급 대상', () => {
  const exam = read('notices/L-2026-1020-2/index.html');
  assert.match(exam, /<dt>일정<\/dt><dd>11월 18일 \(수\) ~ 20일 \(금\)<\/dd>/);
  assert.ok(!exam.includes('<dt>준비물') && !exam.includes('준비물 챙길 날'));
  const flu = read('notices/L-2026-1015-1/index.html');
  assert.ok(!flu.includes('<dt>일정'));
  assert.match(flu, /<dt>대상<\/dt><dd>[\s\S]*2학년 1~4반/);
  assert.ok(!flu.includes('class="letter-no"'));
});

test('학사일정: 달력 판, 출처 줄, 자바스크립트 없을 때 목록', () => {
  const html = read('schedule/index.html');
  assert.match(html, /data-calendar/);
  assert.match(html, /나이스 교육정보 개방 포털/);
  assert.match(html, /<noscript>[\s\S]*기말고사/);
});

test('학사일정: 나이스 일정만, 빌드한 달을 먼저 그려 둔다, JSON은 그대로 읽힌다', () => {
  const html = read('schedule/index.html');
  assert.match(html, /<h1 class="plate-title"[^>]*>학사일정<\/h1>/);
  // 출처는 명패가 아니라 맨 아래 한 줄에만
  assert.ok(!html.match(/<header[^>]*class="plate[\s\S]*?<\/header>/)[0].includes('plate-sub'));
  assert.match(html, /나이스 교육정보 개방 포털/);
  // 옛 공개 행사·피드 쉬는 날은 섞지 않는다
  assert.ok(!html.includes('개교기념 체육대회'));
  assert.ok(!html.includes('겨울방학') && !html.includes('(3학년) 기말고사'));
  // 빌드한 날(10월 22일): 10월 달력, 고른 날 = 오늘, 학급자치회의 점
  assert.match(html, /<h2[^>]*data-cal-month[^>]*>2026년 10월<\/h2>/);
  assert.match(html, /class="cal-day is-today"[^>]*data-ymd="2026-10-22"[^>]*aria-label="10월 22일, 일정 1개" aria-pressed="true"/);
  assert.match(html, /10월 22일 목요일/);
  // 빌드한 달은 남은 일정만(오늘 걸친 학급자치회의는 남는다)
  assert.match(html, /10월 남은 일정/);
  assert.match(html, /data-cal-list-rows[\s\S]*학급자치회의[\s\S]*기말고사/);
  const json = html.match(/<script type="application\/json" data-cal-json>(.*?)<\/script>/s)[1];
  // 10월 일정은 피드 그대로, 11·12월은 학교 학사일정표(schedule-fix)로 — 시작일·이름 순
  const expected = [...built.schedule.filter((s) => s.start < '2026-11'), ...SCHEDULE_FIXES.items].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  assert.deepEqual(JSON.parse(json).map((s) => s.title), expected.map((s) => s.title));
});

test('첫 화면에 예전 예시 알림이 없다', () => {
  assert.doesNotMatch(read('index.html'), /학년별 체육대회/);
});

test('이용 안내에 원문 확인 안내가 있다', () => {
  assert.match(read('about/index.html'), /정확한 내용은 원문을 봐 주세요/);
  // 이용 안내 화면 바닥글은 자기 자신으로 가는 링크를 두지 않는다
  assert.ok(!read('about/index.html').includes('class="footer-link"'));
  assert.match(read('index.html'), /class="footer-link"/);
  // 개인정보 자세한 설명은 펼쳐 보기
  assert.match(read('about/index.html'), /<details[\s\S]*<summary>[^<]*자세히/);
});

test('피드 글자가 칠판 JSON을 끊지 못하고, JSON은 그대로 읽힌다', () => {
  const html = read('index.html');
  assert.ok(!html.includes('</script><b>'));
  const json = html.match(/<script type="application\/json" data-board-json>(.*?)<\/script>/s)[1];
  const data = JSON.parse(json);
  assert.ok(data.letters.some((l) => l.bring.includes(evil.bring[0])));
  // 칠판이 쓰는 칸만 싣는다(요약·첨부는 싣지 않는다).
  assert.ok(data.letters.every((l) => !('summary' in l) && !('attachments' in l)));
});

test('첫 화면 순서: 명패 → 칠판 → 급식 → 일정 → 가정통신문 → 분실물, 손글씨는 날짜만', () => {
  const html = read('index.html');
  const at = (s) => html.indexOf(s);
  assert.ok(at('class="plate') < at('class="board') && at('class="board') < at('id="meal-title"'));
  assert.ok(at('id="meal-title"') < at('id="upcoming"') && at('id="upcoming"') < at('id="new-letters"') && at('id="new-letters"') < at('data-lost-sign'));
  assert.ok(!html.includes('class="notes"') && !html.includes('lost-strip') && !html.includes('class="tray'));
  assert.match(html, /<details>[\s\S]*알레르기/);
  // 처음 그리기(분필로 쓰기) 장면은 없다.
  assert.ok(!html.includes('data-draw') && !html.includes('mjms-drawn'));
});

test('손글씨(Gaegu)를 쓰는 선택자는 칠판 날짜 하나뿐', () => {
  const css = readdirSync(resolve(root, 'dist/_astro')).filter((f) => f.endsWith('.css')).map((f) => read(`_astro/${f}`)).join('\n');
  const html = read('index.html');
  const all = css + [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const selectors = [...all.matchAll(/(?:^|})\s*([^{}@]+)\{[^{}]*font-family:[^;}]*Gaegu/gi)].map((m) => m[1].trim());
  assert.deepEqual(selectors, ['.board-day']);
});

test('칠판: 날짜·요일, 바뀐 수업 자리, 챙길 것; 급식은 칠판 밖 안내판', () => {
  const html = read('index.html');
  const board = html.match(/<section class="board"[\s\S]*?<\/section>\s*(?=(?:<script[^>]*><\/script>\s*)*<section class="sign)/)[0];
  assert.match(board, /class="board-day"[^>]*>10월 22일</);
  assert.match(board, /목요일/);
  assert.match(board, /<div data-board-changes><\/div>/);
  assert.match(board, /10월 23일 \(금\) 준비물/);
  assert.match(board, /오늘 일정[\s\S]*학급자치회의/);
  // 칠판 글자(브라우저용 JSON 빼고)에는 급식도, 시간표로 가는 줄도 없다.
  const shown = board.replace(/<script[\s\S]*?<\/script>/g, '');
  assert.ok(!shown.includes('흑미밥') && !shown.includes('timetable/') && !shown.includes('board-pick'));
  const meal = html.match(/<section class="sign[^"]*"[^>]*data-meal-sign[\s\S]*?<\/section>/)[0];
  assert.match(meal, /<h2 id="meal-title">오늘 급식<\/h2>/);
  assert.ok(meal.includes('흑미밥 · 순두부찌개 · 떡갈비 · 시금치나물'));
  assert.match(meal, /<details>[\s\S]*1 난류/);
});

test('다가오는 일정 안내판: 보기마다 두 개, 날짜 · 이름 · 배지', () => {
  const html = read('index.html');
  const sign = html.match(/<section class="sign[^"]*"[^>]*aria-labelledby="upcoming"[\s\S]*?<\/section>/)[0];
  assert.match(sign, /<h2 id="upcoming"[^>]*>다가오는 일정<\/h2>[\s\S]*href="\/schedule\/"[^>]*>달력</);
  for (const v of ['all', '1', '2', '3']) assert.ok((sign.match(new RegExp(`data-show="[^"]*\\b${v}\\b`, 'g')) ?? []).length <= 2, v);
  assert.match(sign, /data-start="2026-10-26">\s*<span class="sign-date">10월 26~28일<\/span>[\s\S]*기말고사[\s\S]*badge badge--g3">3학년/);
  assert.match(sign, /재량휴업일[\s\S]*class="badge-off">쉬는 날/);
  assert.ok(!sign.includes('개교기념 체육대회')); // 옛 events는 첫 화면에 쓰지 않는다
  assert.ok(!sign.includes('학급자치회의')); // 오늘(10/22) 일정은 칠판 「오늘 일정」에만
});

test('새 가정통신문 안내판: 2주 안 것만, 제목 + 대상 배지, 전체 링크', () => {
  const html = read('index.html');
  const sign = html.match(/<section class="sign[^"]*"[^>]*aria-labelledby="new-letters"[\s\S]*?<\/section>/)[0];
  assert.match(sign, /href="\/notices\/"[^>]*>전체</);
  assert.match(sign, /href="\/notices\/L-2026-1022-3\/"[\s\S]*현장체험학습 안내[\s\S]*badge badge--g1">1학년/);
  assert.ok(!sign.includes('L-evil'));
  assert.match(sign, /2주 안에 새 가정통신문이 없어요/);
});

test('분실물 안내판: 처음엔 감춰 두고 분실물함으로 간다', () => {
  const html = read('index.html');
  const sign = html.match(/<section class="sign[^"]*"[^>]*data-lost-sign[\s\S]*?<\/section>/)[0];
  assert.match(sign, /\shidden/);
  assert.match(sign, /href="\/lost\/"/);
  assert.match(sign, /주인을 기다리는 물건이 있어요/);
});

test('모든 화면: 아래 탭 라벨, 명패, IBM Plex 없음', () => {
  for (const f of ['index.html', 'notices/index.html', 'schedule/index.html', 'timetable/index.html', 'lost/index.html', 'about/index.html']) {
    const html = read(f);
    assert.match(html, /class="tabbar"[\s\S]*오늘[\s\S]*가정<wbr>통신문[\s\S]*일정[\s\S]*분실물[\s\S]*시간표/, f);
    assert.match(html, /class="plate/, f);
    assert.ok(!/ibm-plex|IBM Plex/i.test(html), f);
    assert.match(html, /data-class-sheet/, f);
  }
});

test('명패: 화면 이름이 h1, 첫 화면은 「알림장」 제목 + 반 단추, 시간표는 반 명패', () => {
  assert.match(read('notices/index.html'), /<h1 class="plate-title"[^>]*>가정통신문<\/h1>/);
  assert.match(read('lost/index.html'), /<h1 class="plate-title"[^>]*>분실물함<\/h1>/);
  for (const f of ['index.html', 'timetable/index.html']) assert.equal((read(f).match(/<h1[\s>]/g) ?? []).length, 1, f);
  // 첫 화면: 「명지중학교 알림장」이 제목(h1), 우리 반은 흰 단추 안(자바스크립트가 켜고 채운다).
  const home = read('index.html').match(/<header[^>]*class="plate[\s\S]*?<\/header>/)[0];
  assert.match(home, /<h1 class="plate-title plate-brand"[^>]*><small>명지중학교<\/small>\s*알림장<\/h1>/);
  assert.match(home, /<button[^>]*class="plate-chip[^"]*"[^>]*data-open-class-sheet[^>]*hidden/);
  assert.match(home, /우리 반 고르기/);
  assert.ok(!home.includes('plate-sub') && !home.includes('data-plate-picked-sub'));
  // 시간표: 「1학년 5반 시간표」 반 명패 + 「반 바꾸기」, 보조 줄 없음.
  const tt = read('timetable/index.html').match(/<header[^>]*class="plate[\s\S]*?<\/header>/)[0];
  assert.match(tt, /data-plate-class/);
  assert.match(tt, /data-plate-suffix=" 시간표"/);
  assert.match(tt, /우리 반을 골라 주세요/);
  assert.match(tt, /<button[^>]*class="plate-btn"[^>]*data-open-class-sheet[^>]*hidden/);
  assert.ok(!tt.includes('plate-sub'));
  for (const f of ['lost/index.html', 'about/index.html']) assert.ok(!read(f).match(/<header[^>]*class="plate[\s\S]*?<\/header>/)[0].includes('plate-sub'), f);
  // 옛 머리글·분필받침·반 줄은 없다.
  for (const f of ['index.html', 'notices/index.html', 'schedule/index.html', 'timetable/index.html']) {
    const html = read(f);
    assert.ok(!html.includes('site-header') && !html.includes('grade-chip') && !html.includes('class="tray') && !html.includes('data-class-picker'), f);
  }
});

test('반 고르기 창: dialog, 학년 세 칸, 확인 단추, 저장 안내, 실패 문구', () => {
  const html = read('index.html');
  const sheet = html.match(/<dialog[^>]*data-class-sheet[\s\S]*?<\/dialog>/)[0];
  assert.equal((sheet.match(/data-pick-grade="[123]"/g) ?? []).length, 3);
  assert.match(sheet, /data-sheet-ok[^>]*disabled/);
  // 반 목록이 오기 전(불러오는 중·실패)에는 확인 단추가 보이지 않는다.
  assert.match(sheet, /data-sheet-ok[^>]*hidden/);
  assert.match(sheet, /이 휴대폰에만 저장돼요\. 이름이나 번호는 묻지 않아요\./);
  assert.match(sheet, /반 목록을 불러오지 못했어요/);
  assert.match(sheet, /다시 불러오기/);
  assert.ok(!/<dialog[^>]*\sopen/.test(sheet));
  assert.equal((html.match(/data-class-sheet/g) ?? []).length, 1);
  assert.match(html, /<meta name="theme-color" content="#033e7b"/);
});

test('시간표 화면: 범례 한 줄, 실패 문구 + 다시 불러오기, 옛 reveal 줄·안내 줄 없음', () => {
  const html = read('timetable/index.html');
  assert.match(html, /<p class="tt-legend"><b>굵은 남색<\/b> = 바뀐 수업\(줄 그은 과목이 원래 수업\)<\/p>/);
  assert.match(html, /시간표를 불러오지 못했어요[\s\S]*<button[^>]*data-tt-retry[^>]*>다시 불러오기<\/button>/);
  assert.match(html, /<button[^>]*data-open-class-sheet[^>]*>반 고르기<\/button>/);
  assert.ok(!html.includes('tt-reveal') && !html.includes('data-reveal') && !html.includes('strip-note'));
});

test('학사일정을 못 받은 날: 첫 화면 일정 안내판과 학사일정 화면이 「불러오지 못했어요」', () => {
  const msg = '학사일정을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.';
  const home = readNoSchedule('index.html');
  const sign = home.match(/<section class="sign[^"]*"[^>]*aria-labelledby="upcoming"[\s\S]*?<\/section>/)[0];
  assert.ok(sign.includes(msg));
  assert.ok(!sign.includes('data-show'));
  const cal = readNoSchedule('schedule/index.html');
  assert.ok(cal.includes(msg));
  assert.ok(!cal.includes('data-calendar'));
  assert.ok(!cal.includes('data-cal-grid'));
});

test('시간표 화면: 「학교 행사」 칸 이름을 붙일 학사일정(빌드한 날부터의 행사)을 JSON으로 싣는다', () => {
  const html = read('timetable/index.html');
  const json = html.match(/<script type="application\/json" data-tt-events>(.*?)<\/script>/s)[1];
  const events = JSON.parse(json);
  assert.ok(events.length > 0);
  assert.ok(events.every((e) => e.kind === 'event' && e.end >= '2026-10-22'));
});

test('가정통신문 한 건: 이알리미 PDF 글은 아래 원문 링크가 「원문 보기(PDF)」', () => {
  const html = read('notices/L-2026-1020-2/index.html');
  assert.match(html, /class="letter-src"[^>]*>\s*원문 보기\(PDF\)\s*</);
  assert.doesNotMatch(html, /학교 홈페이지 원문 보기/);
});
