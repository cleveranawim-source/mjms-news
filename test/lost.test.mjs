import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLost, stripItemHTML, foundOnLabel } from '../src/lib/lost.ts';

const item = { id: 'a', category: '학용품', photo: 'https://x.supabase.co/a.jpg?token=1&t=2', foundAt: '2층 복도', storedAt: '1학년 교무실', foundOn: '2026-10-21' };

test('loadLost returns items from the AI 교무실 feed', async () => {
  const fetcher = async () => new Response(JSON.stringify({ items: [item] }));
  assert.deepEqual(await loadLost('https://office/api/news/lost', fetcher), [item]);
});

test('loadLost returns null when the feed fails or looks wrong', async () => {
  assert.equal(await loadLost('u', async () => new Response('{}', { status: 500 })), null);
  assert.equal(await loadLost('u', async () => { throw new Error('offline'); }), null);
  assert.equal(await loadLost('u', async () => new Response('{"items":"x"}')), null);
});

test('loadLost drops items whose photo is not an https address', async () => {
  const bad = { ...item, id: 'b', photo: 'javascript:alert(1)' };
  const fetcher = async () => new Response(JSON.stringify({ items: [item, bad] }));
  assert.deepEqual((await loadLost('u', fetcher)).map((i) => i.id), ['a']);
});

test('stripItemHTML escapes text and keeps the photo address intact', () => {
  const html = stripItemHTML({ ...item, storedAt: '<b>교무실</b>' });
  assert.ok(html.includes('&lt;b&gt;교무실&lt;/b&gt;'));
  assert.ok(html.includes('src="https://x.supabase.co/a.jpg?token=1&amp;t=2"'));
  assert.ok(html.includes('alt="학용품"'));
});

test('foundOnLabel shows month and day', () => {
  assert.equal(foundOnLabel('2026-10-21'), '10월 21일 (수)');
});
