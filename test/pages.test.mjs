import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// 실제 빌드를 fixture 피드로 한 번 돌려 dist/ HTML을 확인한다. 네트워크는 쓰지 않는다.
const root = resolve(import.meta.dirname, '..');
const fixture = resolve(root, 'test/fixtures/feed.json');
const feed = JSON.parse(readFileSync(fixture, 'utf8'));
// 공유 fixture는 건드리지 않고, 태그를 끊으려는 제목이 든 알림을 더한 사본으로 빌드한다.
const evil = { ...feed.letters[2], id: 'L-evil', subject: '끊기 시험 </script><b>x', number: '제2026-80호', postedOn: '2026-09-01', publishedOn: '2026-09-01' };
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
  assert.ok(data.letters.some((l) => l.subject === evil.subject));
});

test('칠판에 2주 안에 올라온 알림이 쪽지로 붙고 오래된 것은 빠진다', () => {
  const html = read('index.html');
  assert.match(html, /class="note" href="[^"]*notices\/L-2026-1022-3\//);
  assert.match(html, /magnet g1/);
  assert.match(html, /제2026-87호/);
  // 14일 창(10월 8일부터) 밖인 옛 알림은 쪽지에 없다. 목록 줄에는 있으므로 쪽지 상자만 본다.
  const notes = html.match(/<ul class="notes".*?<\/ul>/s)[0];
  assert.ok(!notes.includes('L-evil'));
  assert.ok(!notes.includes('제2026-80호'));
  assert.ok(html.includes('href="/notices/L-evil/"'));
});

test('첫 화면 칠판에 오늘 급식이 있고 알레르기 정보는 접혀 있다', () => {
  const html = read('index.html');
  const board = html.match(/<section class="board".*?data-board-json/s)[0];
  const meal = board.match(/<section class="board-group board-meal">.*?<\/section>/s)[0];
  assert.match(meal, /오늘 급식/);
  assert.ok(meal.includes('흑미밥, 순두부찌개, 떡갈비, 시금치나물'));
  assert.match(meal, /<details>/);
  assert.match(meal, /알레르기 정보/);
  assert.match(meal, /1 난류/);
  // 따로 있던 급식 칸은 없다. 칠판 다음은 다가오는 일정이다.
  assert.ok(!html.includes('data-meal'));
  assert.ok(html.indexOf('id="upcoming"') < html.indexOf('id="recent"'));
});
test('첫 화면 다가오는 일정은 두 개까지, 한 줄짜리로', () => {
  const html = read('index.html');
  const list = html.match(/id="upcoming".*?<ul class="lined lined--compact">(.*?)<\/ul>/s)[1];
  const all = list.match(/<li [^>]*data-show="[^"]*\ball\b/g) ?? [];
  assert.ok(all.length >= 1 && all.length <= 2);
  for (const g of ['1', '2', '3']) assert.ok((list.match(new RegExp(`<li [^>]*data-show="[^"]*\\b${g}\\b`, 'g')) ?? []).length <= 2);
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
