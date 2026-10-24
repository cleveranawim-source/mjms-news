import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRead, addRead, READ_MAX } from '../src/lib/read.ts';

test('parseRead: 저장된 JSON 배열의 글자만, 깨졌으면 빈 집합', () => {
  assert.deepEqual([...parseRead('["a","b",3]')], ['a', 'b']);
  assert.deepEqual([...parseRead('{x')], []);
  assert.deepEqual([...parseRead(null)], []);
  assert.deepEqual([...parseRead('"a"')], []);
});

test('addRead: 맨 뒤에 더하고 겹치면 옮기며, 최근 READ_MAX개만 남긴다', () => {
  assert.equal(addRead('["a","b"]', 'a'), '["b","a"]');
  assert.equal(addRead(null, 'x'), '["x"]');
  const many = JSON.stringify(Array.from({ length: READ_MAX }, (_, i) => `id${i}`));
  const out = JSON.parse(addRead(many, 'new'));
  assert.equal(out.length, READ_MAX);
  assert.equal(out[0], 'id1');
  assert.equal(out.at(-1), 'new');
});
