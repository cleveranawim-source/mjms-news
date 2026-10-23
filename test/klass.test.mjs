import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeOf, classLabel, knownClass, sheetClassesHTML } from '../src/lib/klass.ts';

test('반 id에서 학년을 얻는다', () => {
  assert.equal(gradeOf('class-1_5'), 1);
  assert.equal(gradeOf('class-3_10'), 3);
  assert.equal(gradeOf('nope'), null);
  assert.equal(gradeOf(''), null);
  assert.equal(gradeOf('class-4_1'), null);
  assert.equal(gradeOf('class-0_1'), null);
});
test('반 id를 「1학년 5반」으로 읽는다', () => {
  assert.equal(classLabel('class-1_5'), '1학년 5반');
  assert.equal(classLabel('class-3_10'), '3학년 10반');
  assert.equal(classLabel('nope'), null);
});
test('반 버튼은 그 학년만, 고른 반은 눌림', () => {
  const html = sheetClassesHTML([{ id: 'class-1_5', name: '1-5', grade: 1 }, { id: 'class-2_1', name: '2-1', grade: 2 }], 1, 'class-1_5');
  assert.match(html, /data-pick-class="class-1_5"[^>]*aria-pressed="true"[^>]*>5반</);
  assert.ok(!html.includes('class-2_1'));
});
test('반 버튼은 번호순, 이름 글자는 escape', () => {
  const html = sheetClassesHTML(
    [
      { id: 'class-1_10', name: '1-10', grade: 1 },
      { id: 'class-1_2', name: '1-2', grade: 1 },
      { id: 'x"y', name: '<b>', grade: 1 },
    ],
    1,
    '',
  );
  assert.ok(html.indexOf('>2반<') < html.indexOf('>10반<'));
  assert.ok(!html.includes('aria-pressed="true"'));
  assert.ok(!html.includes('<b>') && html.includes('&lt;b&gt;'));
  assert.ok(html.includes('data-pick-class="x&quot;y"'));
});
test('피드에 없는 반은 고른 것이 없는 것으로', () => {
  const classes = [{ id: 'class-1_5' }, { id: 'class-2_1' }];
  assert.equal(knownClass(classes, 'class-1_5'), 'class-1_5');
  assert.equal(knownClass(classes, 'class-3_9'), '');
  assert.equal(knownClass(classes, ''), '');
});
