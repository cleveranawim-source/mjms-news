import { test } from 'node:test';
import assert from 'node:assert/strict';
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
writeFileSync(tmp, JSON.stringify({ ...feed, letters: [...feed.letters, evil] }));
execFileSync('npx', ['astro', 'build'], {
  cwd: root,
  env: { ...process.env, NEWS_FEED_FILE: tmp, NEWS_TODAY: '2026-10-22' },
  stdio: 'pipe',
});
const read = (p) => readFileSync(resolve(root, 'dist', p), 'utf8');

test('알림 보기에 원문 링크와 요약이 있다', () => {
  const l = feed.letters[0];
  const html = read(`notices/${l.id}/index.html`);
  assert.match(html, /홈페이지에서 원문 보기/);
  assert.ok(html.includes(l.sourceUrl));
  assert.match(html, /함께 온 파일/);
  assert.match(html, /<h2>10월 23일 \(금\) 준비물<\/h2>/);
  const link = html.match(/<a href="[^"]*example-school[^"]*"[^>]*>/)[0];
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="[^"]*noopener/);
});

test('학급이 있는 알림은 목록에 학급을 보인다', () => {
  assert.match(read('notices/index.html'), /2학년 1~4반/);
});

test('학사일정에 쉬는 날이 섞여 있다', () => {
  const html = read('schedule/index.html');
  assert.ok(html.includes(feed.daysOff[0].title));
  assert.match(html, /쉬는 날/);
  assert.ok(html.includes('개교기념 체육대회'));
});

test('첫 화면에 예전 예시 알림이 없다', () => {
  assert.doesNotMatch(read('index.html'), /학년별 체육대회/);
});

test('이용 안내에 원문 확인 안내가 있다', () => {
  assert.match(read('about/index.html'), /정확한 내용은 원문을 봐 주세요/);
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
  assert.match(board, /오늘 일정[\s\S]*학생예배/);
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
  assert.match(sign, /10월 26일 \(월\) ~ 28일 \(수\)[\s\S]*기말고사[\s\S]*badge badge--g3">3학년/);
  assert.match(sign, /재량휴업일[\s\S]*class="badge-off">쉬는 날/);
  assert.ok(!sign.includes('개교기념 체육대회')); // 옛 events는 첫 화면에 쓰지 않는다
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
    assert.match(html, /class="tabbar"[\s\S]*오늘[\s\S]*가정통신문[\s\S]*일정[\s\S]*분실물[\s\S]*시간표/, f);
    assert.match(html, /class="plate/, f);
    assert.ok(!/ibm-plex|IBM Plex/i.test(html), f);
    assert.match(html, /data-class-sheet/, f);
  }
});

test('명패: 화면 이름이 h1, 첫 화면·시간표는 반 명패와 반 고르기 단추', () => {
  assert.match(read('notices/index.html'), /<h1 class="plate-title"[^>]*>가정통신문<\/h1>/);
  assert.match(read('lost/index.html'), /<h1 class="plate-title"[^>]*>분실물함<\/h1>/);
  for (const f of ['index.html', 'timetable/index.html']) {
    const html = read(f);
    assert.match(html, /data-plate-class/, f);
    assert.match(html, /우리 반을 골라 주세요/, f);
    assert.match(html, /<button[^>]*data-open-class-sheet/, f);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, f);
  }
  assert.match(read('timetable/index.html'), /data-plate-suffix=" 시간표"/);
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
