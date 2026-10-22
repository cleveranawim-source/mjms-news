// AI 교무실(mjms-office) lib/lost-found/water.ts를 그대로 옮겨 왔다. 고칠 때는 두 곳을 함께 고친다.
// 분실물 함 — 물 위에 뜬 사진의 움직임(2026-10-17 이승열 P가 보낸 영상의 느낌). 화면 없이 셈만 해서 단위 테스트가 지킨다.
// 진짜 중력 방향을 따른다: 폰을 세워 들면 화면 아래가 낮아 사진이 아래로 가라앉아 쌓이고, 눕히면 위로, 옆으로 기울이면 옆으로 흐른다.

export type Body = { id: string; x: number; y: number; vx: number; vy: number; a: number; phase: number; held?: boolean };
/** w·h: 사진 왼쪽 위가 다닐 수 있는 넓이(사진 크기 포함), size: 사진 한 변. */
export type World = { w: number; h: number; size: number };

// 물 느낌을 정하는 값 — 실기기에서 손으로 맞춘다.
export const WATER = {
  gravity: 2200, // 화면이 똑바로 섰을 때(중력이 화면을 따라 다 걸릴 때) 가속(px/s²)
  deadZone: 0.06, // 화면을 따라 걸리는 중력이 이보다 작으면(약 3.5°) 평평한 것으로
  drag: 1.6, // 물의 끌림: 1초에 속도가 e^-1.6 ≈ 20%로
  bounce: 0.45, // 벽·서로 부딪힌 뒤 남는 속도
  current: 24, // 가만히 둘 때 잔잔한 물살(px/s²) — stir만큼만
  rest: 3, // 물살이 잦아든 뒤 이보다 느리면(px/s) 멈춘 것으로
  settle: 60, // 이보다 느리게 닿으면(px/s) 튕기지 않고 붙는다 — 쌓인 사진이 떨지 않게
  maxFling: 2500, // 손으로 밀 때 최고 속도(px/s)
};

const clamp = (v: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));
/** 벽에 닿은 속도: 세게 닿으면 튕기고, 살살 닿으면 붙는다. */
const wall = (v: number) => Math.abs(v) > WATER.settle ? -v * WATER.bounce : 0;
const rad = Math.PI / 180;

/**
 * 기기 방향(deviceorientation의 beta·gamma, 도)에서 화면을 따라 걸리는 중력을 화면 좌표(오른쪽·아래가 +)로, -1~1.
 * 아주 작은 기울기는 0(평평한 책상 위에서 혼자 흐르지 않게). 화면을 돌려 쥐면 축을 바꾼다.
 */
export function gravityVector(beta: number, gamma: number, angle: number): [number, number] {
  const cut = (g: number) => Math.sign(g) * Math.max(0, Math.abs(g) - WATER.deadZone) / (1 - WATER.deadZone) || 0; // -0도 0으로
  const x = cut(Math.sin(gamma * rad) * Math.cos(beta * rad));
  const y = cut(Math.sin(beta * rad));
  if (angle === 90) return [y, -x];
  if (angle === 270) return [-y, x];
  if (angle === 180) return [-x, -y];
  return [x, y];
}

/**
 * 한 걸음(dt초, 0이면 겹침·벽만 바로잡는다). gx·gy는 gravityVector, t는 초(물살 흔들림용),
 * stir는 잔잔한 물살의 세기 0~1(가만히 두면 잦아들게 화면이 줄인다 — 저절로 계속 움직이지 않게).
 */
export function step(bodies: Body[], world: World, gx: number, gy: number, t: number, dt: number, stir = 1): void {
  const { size } = world;
  const maxX = Math.max(0, world.w - size);
  const maxY = Math.max(0, world.h - size);
  const keep = Math.exp(-WATER.drag * dt);
  const current = WATER.current * stir;
  for (const b of bodies) {
    if (b.held) continue;
    const ax = gx * WATER.gravity + current * Math.sin(t * 0.3 + b.phase);
    const ay = gy * WATER.gravity + current * Math.cos(t * 0.23 + b.phase * 1.7);
    b.vx = (b.vx + ax * dt) * keep;
    b.vy = (b.vy + ay * dt) * keep;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  // 서로 부딪힘 — 사진을 원으로 본다. 손에 잡힌 사진은 밀리지 않는다.
  // ponytail: 모든 쌍을 본다(O(n²)) — 물건이 수백 개가 되면 칸 나누기로 바꾼다.
  const minDist = size * 0.92;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const p = bodies[i], q = bodies[j];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      const overlap = minDist - d;
      if (overlap <= 0) continue;
      const [nx, ny] = d > 0.01 ? [dx / d, dy / d] : [1, 0];
      const pm = p.held ? 0 : 1, qm = q.held ? 0 : 1;
      if (!pm && !qm) continue;
      const share = 1 / (pm + qm);
      p.x -= nx * overlap * pm * share;
      p.y -= ny * overlap * pm * share;
      q.x += nx * overlap * qm * share;
      q.y += ny * overlap * qm * share;
      const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
      if (vn < 0) {
        const k = -(1 + (-vn > WATER.settle ? WATER.bounce : 0)) * vn * share;
        p.vx -= k * nx * pm;
        p.vy -= k * ny * pm;
        q.vx += k * nx * qm;
        q.vy += k * ny * qm;
      }
    }
  }
  for (const b of bodies) {
    if (b.x < 0) { b.x = 0; if (b.vx < 0) b.vx = wall(b.vx); }
    if (b.x > maxX) { b.x = maxX; if (b.vx > 0) b.vx = wall(b.vx); }
    if (b.y < 0) { b.y = 0; if (b.vy < 0) b.vy = wall(b.vy); }
    if (b.y > maxY) { b.y = maxY; if (b.vy > 0) b.vy = wall(b.vy); }
    if (!b.held && !current && Math.hypot(b.vx, b.vy) < WATER.rest) b.vx = b.vy = 0;
    // 흐르는 쪽으로 살짝 기울고, 물살이 있을 때만 천천히 흔들린다. 거의 다 왔으면 딱 맞춰 멈춘다.
    const target = clamp(b.vx * 0.04, -18, 18) + 5 * stir * Math.sin(t * 0.5 + b.phase);
    const next = b.a + (target - b.a) * (1 - Math.exp(-3 * dt));
    b.a = Math.abs(target - next) < 0.05 ? target : next;
  }
}
