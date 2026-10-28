import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// getSchedule은 빌드 피드(getFeed)를 읽는다. 이 테스트 파일만의 프로세스에서 NEWS_FEED_FILE로 피드를 고정한다.
const fixture = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/feed.json'), 'utf8'));
const tmp = resolve(mkdtempSync(resolve(tmpdir(), 'feed-')), 'feed.json');
const ev = (title, start, end = start) => ({ title, start, end, grades: [], kind: 'event' });
writeFileSync(tmp, JSON.stringify({ ...fixture, schedule: [ev('나중', '2026-11-02'), ev('나', '2026-10-05'), ev('가', '2026-10-05'), ev('먼저', '2026-10-01')] }));
process.env.NEWS_FEED_FILE = tmp;
const { getSchedule, sortSchedule } = await import('../src/lib/content.ts');

test('getSchedule: 피드 학사일정을 시작일 순(같은 날은 이름 순)으로', async () => {
  assert.deepEqual((await getSchedule()).map((s) => s.title), ['먼저', '가', '나', '나중']);
});

test('sortSchedule: 피드에 학사일정이 없으면 null', () => {
  assert.equal(sortSchedule(null), null);
  assert.deepEqual(sortSchedule([]), []);
});

test('sourceLabel: 학교 홈페이지 글은 「학교 홈페이지 원문 보기」, 그 밖(이알리미 PDF·해석 못 하는 주소)은 「원문 보기(PDF)」', async () => {
  const { sourceLabel } = await import('../src/lib/content.ts');
  assert.equal(sourceLabel('https://myongji.sen.ms.kr/dggb/module/board/selectBoardDetail.do?id=1'), '학교 홈페이지 원문 보기');
  assert.equal(sourceLabel('https://www.ealimi.com/files/letter.pdf'), '원문 보기(PDF)');
  assert.equal(sourceLabel('https://myongji.sen.ms.kr.evil.com/a'), '원문 보기(PDF)');
  assert.equal(sourceLabel('not a url'), '원문 보기(PDF)');
});
