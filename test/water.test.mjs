// AI 교무실 tests/unit/lost-found-water.test.ts를 node:test로 옮겼다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gravityVector, shakeDetector, slots, step } from '../src/lib/water.ts';

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

const at = (m, id) => m.get(id).map(Math.round);

test('흔들어 정리: 무리마다 새 줄에서 시작하고, 넘치면 이어 붙인다', () => {
  const placed = slots([['a', 'b', 'c', 'd', 'e'], ['f']], world); // 한 줄 4칸
  assert.deepEqual(at(placed, 'a'), [0, 0]);
  assert.deepEqual(at(placed, 'd'), [300, 0]);
  assert.deepEqual(at(placed, 'e'), [0, 110]);
  assert.deepEqual(at(placed, 'f'), [0, 220]);
  const many = slots(Array.from({ length: 7 }, (_, i) => [`g${i}`]), world); // 무리마다 한 줄이면 7줄 — 안 들어감
  assert.deepEqual(at(many, 'g4'), [0, 110]);
});

test('흔들어 정리: 너무 많으면 줄 사이를 좁혀 함 안에 둔다', () => {
  const placed = slots([Array.from({ length: 40 }, (_, i) => `i${i}`)], world);
  for (const [, y] of placed.values()) assert.ok(y <= 500);
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
