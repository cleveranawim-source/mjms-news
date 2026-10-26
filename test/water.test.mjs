// AI 교무실 tests/unit/lost-found-water.test.ts를 node:test로 옮겼다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrange, gravityVector, groupItems, shakeDetector, step } from '../src/lib/water.ts';

const world = { w: 400, h: 600, size: 100 };
const body = (id, x, y) => ({ id, x, y, vx: 0, vy: 0, a: 0, phase: 0 });
const run = (bodies, gx, gy, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 60) step(bodies, world, gx, gy, t, 1 / 60);
};
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

test('오른쪽으로 기울이면 오른쪽으로 흘러가 벽에서 멈춘다', () => {
  const b = body('a', 0, 250);
  run([b], 1, 0, 3);
  assert.ok(Math.abs(b.x - 300) < 0.5);
});

test('함 밖으로 나가지 않는다(벽에서 튕김)', () => {
  const b = { ...body('a', 150, 250), vx: -3000, vy: 3000 };
  run([b], 0, 0, 1);
  assert.ok(b.x >= 0);
  assert.ok(b.y <= 500);
});

test('서로 부딪히면 겹치지 않게 밀려난다', () => {
  const bodies = [body('a', 150, 250), body('b', 160, 255), body('c', 155, 260)];
  run(bodies, 0, 0, 1);
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) assert.ok(dist(bodies[i], bodies[j]) > 85);
});

test('손에 잡힌 사진은 밀리지 않고 다른 사진만 비켜난다', () => {
  const held = { ...body('a', 150, 250), held: true };
  const other = body('b', 170, 250);
  run([held, other], 0, 0, 0.5);
  assert.deepEqual([held.x, held.y], [150, 250]);
  assert.ok(other.x - held.x > 85);
});

test('진짜 중력 방향: 세워 들면 아래로, 눕히면 위로, 오른쪽을 낮추면 오른쪽으로', () => {
  const [x0, y0] = gravityVector(60, 0, 0);
  assert.equal(x0, 0);
  assert.ok(y0 > 0.8);
  assert.ok(gravityVector(-20, 0, 0)[1] < -0.2);
  assert.ok(gravityVector(0, 30, 0)[0] > 0.4);
  assert.deepEqual(gravityVector(90, 0, 0), [0, 1]);
});

test('책상 위처럼 거의 평평하면 흐르지 않는다', () => {
  assert.deepEqual(gravityVector(2, -2, 0), [0, 0]);
});

test('세워 들면 바닥에 쌓여 가만히 있는다(떨지 않음)', () => {
  const bodies = [body('a', 50, 0), body('b', 200, 100), body('c', 120, 300)];
  for (let t = 0; t < 4; t += 1 / 60) step(bodies, world, ...gravityVector(60, 0, 0), t, 1 / 60, 0);
  for (const b of bodies) assert.ok(b.y > 300);
  const before = bodies.map((b) => [b.x, b.y]);
  for (let i = 0; i < 30; i++) step(bodies, world, ...gravityVector(60, 0, 0), 10, 1 / 60, 0);
  bodies.forEach((b, i) => {
    assert.ok(Math.abs(b.x - before[i][0]) < 0.5);
    assert.ok(Math.abs(b.y - before[i][1]) < 0.5);
  });
});

test('물살이 잦아들면(stir 0) 멈춘다', () => {
  const b = { ...body('a', 150, 250), vx: 2, vy: -2 };
  step([b], world, 0, 0, 0, 1 / 60, 0);
  assert.deepEqual([b.vx, b.vy], [0, 0]);
});

const ids = (n, p) => Array.from({ length: n }, (_, i) => `${p}${i}`);

test('흔들어 정리: 무리마다 이름 줄 아래 새 줄에서 시작하고, 다 들어가게 사진을 줄인다', () => {
  const fits = arrange([{ label: '가', ids: ids(5, 'a') }, { label: '나', ids: ['b0'] }], world); // 400 너비면 한 줄 3장(100+8)
  assert.equal(fits.k, 1);
  assert.deepEqual(fits.heads.map((h) => [h.label, h.count, h.y]), [['가', 5, 0], ['나', 1, 28 + 2 * 108]]);
  assert.deepEqual(fits.spots.get('a0'), [0, 28]);
  assert.deepEqual(fits.spots.get('a3'), [0, 28 + 108]);
  assert.deepEqual(fits.spots.get('b0'), [0, 28 + 216 + 28]);
  const many = arrange([{ label: '가', ids: ids(20, 'c') }, { label: '나', ids: ids(9, 'd') }], world);
  assert.ok(many.k < 1);
  const last = Math.max(...[...many.spots.values()].map(([, y]) => y));
  assert.ok(last + (100 + 100 * many.k) / 2 <= 600); // 줄인 사진 아래 끝이 함 안
});

test('흔들어 정리: 날짜순은 주로 묶고 최근 것이 앞, 종류별은 정한 차례', () => {
  const items = [
    { id: 'old', category: '기타', foundOn: '2026-04-23' },
    { id: 'sun', category: '학용품', foundOn: '2026-10-25' },
    { id: 'mon', category: '기타', foundOn: '2026-10-26' },
    { id: 'lastMon', category: '학용품', foundOn: '2026-10-19' },
    { id: 'w2', category: '외계', foundOn: '2026-10-16' },
  ];
  assert.deepEqual(groupItems(1, items, '2026-10-27', ['학용품', '기타']), [
    { label: '이번 주', ids: ['mon'] }, { label: '지난주', ids: ['sun', 'lastMon'] }, { label: '2주 전', ids: ['w2'] }, { label: '그 전', ids: ['old'] },
  ]);
  assert.deepEqual(groupItems(2, items, '2026-10-27', ['학용품', '기타']).map((g) => [g.label, g.ids]), [
    ['학용품', ['sun', 'lastMon']], ['기타', ['mon', 'old']], ['외계', ['w2']],
  ]);
});

test('흔들어 정리: 제자리로 가서 멈추고, 기울여도 살짝만 쏠린다', () => {
  const b = { ...body('a', 0, 0), tx: 200, ty: 300 };
  for (let t = 0; t < 3; t += 1 / 60) step([b], world, 0, 1, t, 1 / 60, 0);
  assert.ok(Math.abs(b.x - 200) < 0.5);
  assert.ok(b.y - 300 > 0 && b.y - 300 < 10);
});

test('세게 두 번 흔들어야 알린다(내려놓는 한 번은 아님)', () => {
  const shaken = shakeDetector();
  assert.deepEqual([0, 16, 32].map((t) => shaken(t, 20)), [false, false, false]); // 한 번 쿵
  assert.equal(shaken(48, 2), false);
  assert.equal(shaken(200, 20), true);
  assert.equal(shaken(400, 2) || shaken(500, 20) || shaken(700, 20), false); // 알린 뒤 쉼
  const late = shakeDetector();
  late(0, 20); late(100, 2);
  assert.equal(late(800, 20), false); // 너무 늦은 두 번째는 새 첫 번
});
