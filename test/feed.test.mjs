import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFeed } from '../src/lib/feed.ts';

const FIXTURE = new URL('./fixtures/feed.json', import.meta.url).pathname;
const respond = (body, status = 200) => async () =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
const base = { version: 1, generatedAt: '2026-10-22T00:00:00.000Z', letters: [], events: [], daysOff: [], meals: [] };

test('loadFeed reads the fixture', async () => {
  const feed = await loadFeed({ file: FIXTURE });
  assert.equal(feed.version, 1);
  assert.equal(feed.letters.length, 3);
  assert.equal(feed.events.length, 3);
  assert.equal(feed.daysOff.length, 2);
  assert.equal(feed.meals.length, 5);
  assert.ok(feed.letters.some((l) => l.bring.length > 0 && l.due));
});

test('loadFeed throws on non-200 and on bad shape', async () => {
  await assert.rejects(loadFeed({ url: 'http://x', fetcher: respond({}, 500) }));
  await assert.rejects(loadFeed({ url: 'http://x', fetcher: respond({ version: 2 }) }));
  await assert.rejects(loadFeed({ url: 'http://x', fetcher: respond({ version: 1, letters: 'x' }) }));
  await assert.rejects(loadFeed({ url: 'http://x', fetcher: respond('not json') }));
});

test('loadFeed drops malformed items', async () => {
  const good = {
    id: 'a', number: null, subject: '좋은 안내', grades: [1, 2], classes: null, eventDate: null, eventEnd: null,
    bring: [], due: null, summary: '', attachments: [], sourceUrl: 'https://example.com/a', postedOn: '2026-10-20', publishedOn: '2026-10-21',
  };
  const feed = await loadFeed({
    url: 'http://x',
    fetcher: respond({
      ...base,
      letters: [good, { ...good, id: 'b', grades: [5] }, { ...good, id: 'c', postedOn: '10/20' }],
      events: [{ title: 'ok', start: '2026-11-01', end: '2026-11-01', grades: [3] }, { title: 'bad', start: 'x', end: '2026-11-01', grades: [] }],
      daysOff: [{ title: 'bad', start: '2026-11-01' }],
      meals: [{ ymd: '2026-10-22', dishes: [{ name: '밥', allergens: [1] }, { name: 3 }] }, { ymd: 'nope', dishes: [] }],
    }),
  });
  assert.deepEqual(feed.letters.map((l) => l.id), ['a']);
  assert.equal(feed.events.length, 1);
  assert.equal(feed.daysOff.length, 0);
  assert.equal(feed.meals.length, 1);
  assert.equal(feed.meals[0].dishes.length, 1);
});
