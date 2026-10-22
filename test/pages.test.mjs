import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 실제 빌드를 fixture 피드로 한 번 돌려 dist/ HTML을 확인한다. 네트워크는 쓰지 않는다.
const root = resolve(import.meta.dirname, '..');
const fixture = resolve(root, 'test/fixtures/feed.json');
const feed = JSON.parse(readFileSync(fixture, 'utf8'));
execFileSync('npx', ['astro', 'build'], {
  cwd: root,
  env: { ...process.env, NEWS_FEED_FILE: fixture },
  stdio: 'pipe',
});
const read = (p) => readFileSync(resolve(root, 'dist', p), 'utf8');

test('알림 보기에 원문 링크와 요약이 있다', () => {
  const l = feed.letters[0];
  const html = read(`notices/${l.id}/index.html`);
  assert.match(html, /홈페이지에서 원문 보기/);
  assert.ok(html.includes(l.sourceUrl));
  assert.match(html, /함께 온 파일/);
  assert.match(html, /2026년 10월 23일.*준비물|10월 23일.*준비물/s);
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
