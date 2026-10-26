// AI 교무실(mjms-office) lib/lost-found/water.ts를 그대로 옮겨 왔다. 고칠 때는 두 곳을 함께 고친다.
// 분실물 함 — 물 위에 뜬 사진의 움직임(2026-10-17 이승열 P가 보낸 영상의 느낌). 화면 없이 셈만 해서 단위 테스트가 지킨다.
// 진짜 중력 방향을 따른다: 폰을 세워 들면 화면 아래가 낮아 사진이 아래로 가라앉아 쌓이고, 눕히면 위로, 옆으로 기울이면 옆으로 흐른다.

/** tx·ty: 흔들어 정리했을 때 돌아갈 자리(없으면 자유롭게 떠다님). */
export type Body = { id: string; x: number; y: number; vx: number; vy: number; a: number; phase: number; held?: boolean; tx?: number; ty?: number };
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
  spring: 40, // 정리했을 때 제자리로 당기는 힘(1/s²)
  hold: 9, // 정리했을 때 제자리에서 출렁임이 잦아드는 빠르기(1/s)
  lean: 0.12, // 정리했을 때 기울임이 미치는 몫 — 무리째 살짝만 쏠린다
  shake: 14, // 흔듦으로 볼 가속(m/s², 중력 뺀 것)
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
    const lean = b.tx === undefined ? 1 : WATER.lean;
    let ax = gx * WATER.gravity * lean + current * Math.sin(t * 0.3 + b.phase);
    let ay = gy * WATER.gravity * lean + current * Math.cos(t * 0.23 + b.phase * 1.7);
    if (b.tx !== undefined && b.ty !== undefined) {
      ax += (b.tx - b.x) * WATER.spring - b.vx * WATER.hold;
      ay += (b.ty - b.y) * WATER.spring - b.vy * WATER.hold;
    }
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
      if (p.tx !== undefined && q.tx !== undefined) continue; // 정리된 자리끼리는 밀지 않는다 — 많아서 칸이 겹쳐도 떨지 않게
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
    // 정리한 자리는 함 안에서 셈했고, 사진이 줄어 있어 벽을 따로 보지 않는다.
    if (b.tx === undefined) {
      if (b.x < 0) { b.x = 0; if (b.vx < 0) b.vx = wall(b.vx); }
      if (b.x > maxX) { b.x = maxX; if (b.vx > 0) b.vx = wall(b.vx); }
      if (b.y < 0) { b.y = 0; if (b.vy < 0) b.vy = wall(b.vy); }
      if (b.y > maxY) { b.y = maxY; if (b.vy > 0) b.vy = wall(b.vy); }
    }
    if (!b.held && !current && Math.hypot(b.vx, b.vy) < WATER.rest) b.vx = b.vy = 0;
    // 흐르는 쪽으로 살짝 기울고, 물살이 있을 때만 천천히 흔들린다. 거의 다 왔으면 딱 맞춰 멈춘다.
    const target = clamp(b.vx * 0.04, -18, 18) + 5 * stir * Math.sin(t * 0.5 + b.phase);
    const next = b.a + (target - b.a) * (1 - Math.exp(-3 * dt));
    b.a = Math.abs(target - next) < 0.05 ? target : next;
  }
}

export type Group = { label: string; ids: string[] };
const WEEKS = ["이번 주", "지난주", "2주 전", "3주 전"];

/**
 * 흔들어 정리할 무리(mode 1 날짜순, 2 종류별, 0 없음). 날짜순은 날짜마다가 아니라 주로 묶는다 — 날짜마다면 무리가 너무 많아 어수선하다(2026-10-26 이승열 P).
 * 무리 안은 최근 것이 앞. today는 서울 오늘(YYYY-MM-DD), categories는 종류 차례(모르는 종류는 맨 뒤).
 */
export function groupItems(mode: number, items: { id: string; category: string; foundOn: string }[], today: string, categories: readonly string[]): Group[] {
  if (!mode) return [];
  const day = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`) / 864e5;
  const monday = day(today) - (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const week = (ymd: string) => WEEKS[Math.max(0, Math.ceil((monday - day(ymd)) / 7))] ?? "그 전";
  const rank = (c: string) => categories.includes(c) ? categories.indexOf(c) : categories.length;
  const sorted = [...items].sort((a, b) => (mode === 2 ? rank(a.category) - rank(b.category) : 0) || b.foundOn.localeCompare(a.foundOn));
  const groups = new Map<string, string[]>();
  for (const item of sorted) {
    const key = mode === 1 ? week(item.foundOn) : item.category;
    groups.set(key, [...(groups.get(key) ?? []), item.id]);
  }
  return [...groups].map(([label, ids]) => ({ label, ids }));
}

export const ARRANGE = { head: 28, gap: 8, minScale: 0.35 }; // 무리 이름 줄 높이·사진 사이(px)·가장 작게 줄일 몫
export type Arrangement = { k: number; heads: { label: string; count: number; y: number }[]; spots: Map<string, [number, number]> };

/**
 * 흔들어 정리한 모양: 무리마다 이름 줄 하나, 그 아래 사진을 왼쪽부터 줄 세운다. 다 들어가도록 사진을 k(≤1)만큼 줄인다.
 * spots는 몸의 자리(줄이기 전 사진 왼쪽 위 — 사진은 가운데를 기준으로 줄어든다).
 */
export function arrange(groups: Group[], world: World): Arrangement {
  const { head, gap, minScale } = ARRANGE;
  const base = world.size || 1;
  const fit = (k: number) => {
    const s = base * k;
    const cols = Math.max(1, Math.floor((world.w + gap) / (s + gap)));
    const height = groups.reduce((h, g) => h + head + Math.ceil(g.ids.length / cols) * (s + gap), 0);
    return { s, cols, ok: height <= world.h + gap };
  };
  // shortcut: 가장 작게 줄여도 넘치면 아래가 잘린다 — 물건이 수십 개를 넘으면 그때 줄 나눔을 다시 본다.
  let k = 1;
  while (k > minScale && !fit(k).ok) k = Math.max(minScale, k - 0.05);
  const { s, cols } = fit(k);
  const off = (base - s) / 2;
  const heads: Arrangement["heads"] = [];
  const spots = new Map<string, [number, number]>();
  let y = 0;
  for (const g of groups) {
    heads.push({ label: g.label, count: g.ids.length, y });
    y += head;
    g.ids.forEach((id, i) => spots.set(id, [(i % cols) * (s + gap) - off, y + Math.floor(i / cols) * (s + gap) - off]));
    y += Math.ceil(g.ids.length / cols) * (s + gap);
  }
  return { k, heads, spots };
}

/** devicemotion 세기(m/s²)를 받아 흔들었는지 — 0.5초 안에 세게 두 번(사이에 잠깐 약해짐, 내려놓는 한 번은 아님), 알린 뒤 1.2초는 쉰다. */
export function shakeDetector() {
  let peak = -Infinity, dipped = false, quiet = -Infinity;
  return (now: number, force: number) => {
    if (now < quiet) return false;
    if (force < WATER.shake) { dipped = true; return false; }
    if (now - peak > 500) { peak = now; dipped = false; return false; }
    if (!dipped) return false; // 같은 한 번이 이어지는 중
    peak = -Infinity;
    quiet = now + 1200;
    return true;
  };
}
