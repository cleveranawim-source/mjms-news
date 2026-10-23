# 교실 명패 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 알림장 전 화면을 '교실 명패' 방향으로 다시 만들고(첫 화면 반 고르기, 문서형 가정통신문, 달력 일정, 정리된 주간 시간표), 학사일정 출처를 나이스 공개 학사일정으로 바꾼다.

**Architecture:** AI 교무실(Next.js)이 나이스 SchoolSchedule을 받아 피드에 `schedule`을 더한다(6시간 캐시). 알림장(Astro 정적)은 빌드 때 피드를 읽고, 시간표·분실물·반 목록은 지금처럼 브라우저에서 받는다. 화면은 명패(남색 머리판) + 안내판(흰 판) + 첫 화면 칠판 한 칸으로 통일한다.

**Tech Stack:** Astro 7 + node:test(알림장), Next.js 16 + vitest(AI 교무실), Pretendard·Gaegu(npm 글꼴, 직접 담기), Playwright(스크린숏 확인).

**Spec:** `docs/superpowers/specs/2026-10-23-classroom-plate-redesign-design.md` (방향 계약: `.impeccable/surfaces/src-pages-index-astro.md`, 승인 시안: `.superpowers/brainstorm/19894-1792719957/content/screens.html`)

## Global Constraints

- 개인정보 금지: 학생·교사 이름, 연락처가 화면·피드·테스트 fixture 어디에도 없어야 한다. 나이스 학사일정은 공개 정보다.
- 손글씨(Gaegu 700)는 첫 화면 칠판의 날짜 한 곳에만. 그 밖의 모든 글자는 Pretendard.
- 색: 바탕 `#f3f6fa`, 남색 `#033e7b`(밝은 테두리 `#0a4f97`), 하늘 `#037dc4`, 글자 `#1b1f24`, 흐린 글자 `#5b6b78`, 괘선 `#d5e0ea`, 칠판 `#26443a`, 분필 `#eef1ea`/흐림 `#b9c6bd`, 칠판 소제목 노랑 `#f1d65a`·주황 `#f7b26b`, 쉬는 날 빨강 `#c62828`, 학년 배지 1 `#f5dc6b`/`#3a3000`, 2 `#f5a9c2`/`#4a1022`, 3 `#8fd3f2`/`#0b3550`, 전 학년·여러 학년 `#e8eef6`/`#033e7b`.
- 글자 사다리: 12 · 13 · 15 · 17 · 20 · 22 · 30(px). 본문 16~17px.
- 누르는 곳 44×44px 이상. 장식 그림자·발광·질감·자석·분필 받침·흐르는 사진 띠 금지.
- 상태 문구(그대로 쓴다): 「바뀐 수업 없어요」, 「오늘 시간표가 아직 없어요」/「그날 시간표가 아직 없어요」, 「바뀐 수업을 불러오지 못했어요」·「시간표를 불러오지 못했어요」 + 버튼 「다시 불러오기」, 「학사일정을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.」, 「이날은 학사일정이 없어요」, 「챙길 것 없어요」, 「2주 안에 새 가정통신문이 없어요」.
- 반 저장 키 `localStorage['mjms-class']`(예 `class-1_5`) 그대로. `mjms-grade`는 읽으면 지운다.
- 아래 탭 라벨: 오늘 · 가정통신문 · 일정 · 분실물 · 시간표.
- 피드 `version`은 1 그대로, `schedule`은 있어도 없어도 되는 칸.
- 알림장 테스트: `npm test`(= `node --test test/*.test.mjs`), 형 검사 `npx astro check < /dev/null`. AI 교무실: `npx vitest run <파일>`, 형 검사 `npx next typegen && npx tsc --noEmit`.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 나이스가 이어진 날을 하루씩 주는데 주말·공휴일을 끼고 이어지는 시험·방학 → 한 기간으로 묶여야 한다(O1 테스트).
2. 반을 고르지 않은 첫 방문 → 모든 화면이 깨지지 않고 「우리 반을 골라 주세요」로 안내(N3·N6 테스트).
3. 시간표 API가 실패하거나 느림 → '없음'으로 보이지 않고 「…불러오지 못했어요」 + 다시 불러오기(N3·N6 테스트).
4. 학년 필터 → 반을 고른 학년 + 전 학년만, 「모든 학년」으로 넓힐 수 있음(N4·N5 테스트).
5. 피드에 `schedule`이 없는 빌드 → 일정 화면과 첫 화면 판이 안내 문구를 보이고 빌드는 성공(N2 테스트).

---

## Part O — AI 교무실 (`/Users/yeopro14/Claude/mjms-office-news`, 새 가지 `feat/neis-schedule` ← `origin/main`)

### Task O1: 나이스 학사일정 → 일정 항목

**Files:**
- Create: `lib/news/neis-schedule.ts`
- Create: `tests/fixtures/news/neis-schedule.json`
- Test: `tests/unit/news-neis-schedule.test.ts`

**Interfaces:**
- Produces:
  - `export type FeedScheduleItem = { title: string; start: string; end: string; grades: number[]; kind: "holiday" | "dayoff" | "event" }` (날짜 YYYY-MM-DD, end 포함, grades `[]` = 전 학년)
  - `export type NeisScheduleRow = { AA_YMD: string; EVENT_NM: string; SBTR_DD_SC_NM: string; ONE_GRADE_EVENT_YN: string; TW_GRADE_EVENT_YN: string; THREE_GRADE_EVENT_YN: string }`
  - `export function schoolYearRange(today: string): { from: string; to: string }` — 3월 1일 ~ 다음 해 2월 말일(1~2월이면 전 해 3월부터)
  - `export function toScheduleItems(rows: NeisScheduleRow[]): FeedScheduleItem[]`
  - `export async function fetchScheduleRows(from: string, to: string): Promise<NeisScheduleRow[]>` — `https://open.neis.go.kr/hub/SchoolSchedule`, `Type=json`, `ATPT_OFCDC_SC_CODE=B10`, `SD_SCHUL_CODE=7031186`, `AA_FROM_YMD`/`AA_TO_YMD`(YYYYMMDD), `pSize=1000`, `pIndex` 1부터 `list_total_count`를 다 받을 때까지(최대 5쪽), `KEY=process.env.NEIS_KEY`(있을 때), 쪽마다 `AbortSignal.timeout(5000)`. `res.ok`가 아니면 throw. INFO-200(자료 없음)은 빈 배열. `lib/meals/neis.ts`의 모양을 따른다.

- [ ] **Step 1: fixture 쓰기** — `tests/fixtures/news/neis-schedule.json`에 나이스 응답 모양(`{"SchoolSchedule":[{"head":[{"list_total_count":N},{"RESULT":{"CODE":"INFO-000"}}]},{"row":[...]}]}`)으로 행을 만든다. 행 칸은 실제 응답과 같은 이름(`AY`, `AA_YMD`, `EVENT_NM`, `EVENT_CNTNT`, `ONE/TW/THREE_GRADE_EVENT_YN`, `FR/FIV/SIX_GRADE_EVENT_YN`="*", `SBTR_DD_SC_NM`, `SCHUL_NM`="명지중학교"). 들어갈 행:
  - 20260924·25·26 「추석연휴」 공휴일 YYY (목~토), 20260928 「추석연휴」 공휴일 YYY (월, 사이에 27일 일요일)
  - 20261003 「개천절」 공휴일 YYY, 20261005 「대체공휴일」 공휴일 YYY
  - 20261007·08 「중간고사」 해당없음 YYN
  - 20261009 「한글날」 공휴일 YYY
  - 20261021 「학생예배」 해당없음 YYY
  - 20261026·27·28 「기말고사」 해당없음 NNY
  - 20261120 「재량휴업일」 휴업일 YYY
  - 20261003 「토요휴업일」 휴업일 YYY, 20261010 「토요휴업일」 휴업일 YYY
  - 20261014 「영어듣기평가」 해당없음 NNN (셋 다 N → 전 학년)

- [ ] **Step 2: 실패하는 테스트**

```ts
import { describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/news/neis-schedule.json";
import { schoolYearRange, toScheduleItems, fetchScheduleRows } from "@/lib/news/neis-schedule";

const rows = fixture.SchoolSchedule[1].row;

describe("나이스 학사일정", () => {
  it("학년도는 3월 1일부터 다음 해 2월 말일까지", () => {
    expect(schoolYearRange("2026-10-23")).toEqual({ from: "2026-03-01", to: "2027-02-28" });
    expect(schoolYearRange("2027-01-10")).toEqual({ from: "2026-03-01", to: "2027-02-28" });
    expect(schoolYearRange("2028-02-01")).toEqual({ from: "2027-03-01", to: "2028-02-29" });
  });
  it("이어진 날은 한 기간, 주말·공휴일을 사이에 둬도 이어진다", () => {
    const items = toScheduleItems(rows);
    expect(items.find((i) => i.title === "추석연휴")).toEqual({ title: "추석연휴", start: "2026-09-24", end: "2026-09-28", grades: [], kind: "holiday" });
    expect(items.find((i) => i.title === "기말고사")).toEqual({ title: "기말고사", start: "2026-10-26", end: "2026-10-28", grades: [3], kind: "event" });
    expect(items.find((i) => i.title === "중간고사")).toMatchObject({ start: "2026-10-07", end: "2026-10-08", grades: [1, 2] });
  });
  it("토요휴업일은 빼고, 셋 다 Y나 셋 다 N은 전 학년", () => {
    const items = toScheduleItems(rows);
    expect(items.some((i) => i.title === "토요휴업일")).toBe(false);
    expect(items.find((i) => i.title === "영어듣기평가")!.grades).toEqual([]);
    expect(items.find((i) => i.title === "재량휴업일")!.kind).toBe("dayoff");
  });
  it("날짜순으로 정렬된다", () => {
    const starts = toScheduleItems(rows).map((i) => i.start);
    expect(starts).toEqual([...starts].sort());
  });
  it("여러 쪽을 이어 받고, 자료 없음은 빈 배열", async () => {
    const page = (n: number, total: number, list: unknown[]) => new Response(JSON.stringify({ SchoolSchedule: [{ head: [{ list_total_count: total }, { RESULT: { CODE: "INFO-000" } }] }, { row: list }] }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page(1, 1001, Array(1000).fill(rows[0])))
      .mockResolvedValueOnce(page(2, 1001, [rows[1]]));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchScheduleRows("2026-03-01", "2027-02-28")).length).toBe(1001);
    expect(fetchMock.mock.calls[1][0]).toContain("pIndex=2");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ RESULT: { CODE: "INFO-200" } }))));
    expect(await fetchScheduleRows("2026-03-01", "2027-02-28")).toEqual([]);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 3: 실패 확인** — `npx vitest run tests/unit/news-neis-schedule.test.ts` → 모듈 없음으로 FAIL.
- [ ] **Step 4: 구현** — 묶기 규칙(스펙 「묶기」): 이름(trim)·학년 열쇠별로 날짜를 모으고, 앞 날짜와 사이에 낀 날이 모두 토·일이거나 같은 응답 안에서 kind가 holiday/dayoff인 날이면 이어 붙인다. kind 우선순위 holiday > dayoff > event. 이름이 정확히 「토요휴업일」인 행은 버린다. grades: Y인 학년, 셋 다 Y거나 셋 다 N이면 `[]`. 결과는 start, title 순 정렬.
- [ ] **Step 5: 통과 확인** — 같은 명령 PASS.
- [ ] **Step 6: Commit** — `git add lib/news/neis-schedule.ts tests/unit/news-neis-schedule.test.ts tests/fixtures/news/neis-schedule.json && git commit -m "News feed: NEIS school schedule to schedule items"`

### Task O2: 피드에 `schedule` 싣기

**Files:**
- Modify: `lib/news/feed.ts` (`Feed` 타입, `buildFeed` 입력/출력)
- Modify: `lib/news/feed-read.ts` (`readFeed`)
- Test: `tests/unit/news-feed.test.ts`, `tests/unit/news-feed-route.test.ts`

**Interfaces:**
- Consumes: O1의 `FeedScheduleItem`, `schoolYearRange`, `fetchScheduleRows`, `toScheduleItems`
- Produces: `Feed`에 `schedule?: FeedScheduleItem[]`. `buildFeed(x: { …; schedule?: FeedScheduleItem[] | null })` — 배열이면 그대로 `schedule`로, null/undefined면 칸을 빼고 낸다.

- [ ] **Step 1: 실패하는 테스트** (news-feed.test.ts에 추가)

```ts
it("나이스 학사일정이 있으면 schedule로 싣고, 없으면 칸을 뺀다", () => {
  const schedule = [{ title: "기말고사", start: "2026-10-26", end: "2026-10-28", grades: [3], kind: "event" as const }];
  expect(buildFeed({ today: "2026-10-23", letters: [], events: [], meals: [], schedule }).schedule).toEqual(schedule);
  expect("schedule" in buildFeed({ today: "2026-10-23", letters: [], events: [], meals: [], schedule: null })).toBe(false);
});
```

- [ ] **Step 2: FAIL 확인** — `npx vitest run tests/unit/news-feed.test.ts`
- [ ] **Step 3: 구현** — `buildFeed`에 위 동작. `feed-read.ts`에 `const scheduleForYear = unstable_cache(async (from: string, to: string) => toScheduleItems(await fetchScheduleRows(from, to)), ["news-neis-schedule"], { revalidate: 21600 })`를 두고 `readFeed`에서 `schoolYearRange(today)`로 부른다. 실패하면 `console.error("news-feed: schedule failed")`(짧은 코드만) 후 `null`. 파일 머리 주석에 '나이스 공개 학사일정'을 더한다.
- [ ] **Step 4: PASS 확인** — 두 테스트 파일 PASS, `npx next typegen && npx tsc --noEmit` 오류 없음.
- [ ] **Step 5: Commit** — `git commit -m "News feed: carry NEIS school schedule (6h cache, omitted on failure)"`

### Task O3: /news 화면의 공개 체크 → 안내, 정리

**Files:**
- Modify: `app/(main)/news/page.tsx` (학사일정 공개 칸)
- Delete: `app/(main)/news/EventPicker.tsx`
- Modify: `app/(main)/news/actions.ts` (`setEventsPublic` 삭제)
- Delete: `tests/unit/news-events-public.test.ts`
- Modify: `supabase/migrations/20261022120000_news_letters.sql` 머리 주석의 적용일 「2026-10-23」 → 「2026-10-22」(내용·SQL은 건드리지 않는다)

**Interfaces:** 없음(화면만).

- [ ] **Step 1:** page.tsx의 「학사일정 공개」 섹션을 `<p className="text-sm text-muted">알림장의 학사일정은 이제 나이스 공개 학사일정을 그대로 씁니다. 학교가 나이스에 입력한 일정이 매일 새벽 반영됩니다.</p>`로 바꾸고 이벤트 조회·EventPicker import를 지운다.
- [ ] **Step 2:** `setEventsPublic`과 그 테스트, EventPicker를 지운다. `grep -rn "setEventsPublic\|EventPicker" app lib tests`가 아무것도 내지 않아야 한다.
- [ ] **Step 3:** `npx vitest run tests/unit` 중 news-* 전부 PASS, `npx next typegen && npx tsc --noEmit` 통과, `npx eslint "app/(main)/news"` 통과.
- [ ] **Step 4: Commit** — `git commit -m "News page: schedule now comes from NEIS; drop the public-event picker"`

---

## Part N — 알림장 (새 작업 트리 `/Users/yeopro14/orca/projects/mjms-news-plate`, 가지 `feat/plate` ← `main`)

### Task N1: 바탕 — 글꼴, 색, 명패, 아래 탭, 반 저장

**Files:**
- Modify: `package.json`, `package-lock.json` (+`pretendard`, `@fontsource/gaegu` 700만 import, −`@fontsource/ibm-plex-sans-kr`)
- Modify: `src/styles/global.css` (토큰·바탕·아래 탭·머리 정리, 옛 `.site-header`/`.grade-chip`/`.tray`/`.chalk*` 규칙 삭제)
- Modify: `src/layouts/Base.astro` (머리글 → 슬롯, 아래 탭 라벨, 반에서 학년 얻기, theme-color `#033e7b`)
- Create: `src/components/Plate.astro`
- Create: `src/components/ClassSheet.astro`
- Create: `src/lib/klass.ts`
- Delete: `src/components/GradePicker.astro`, `src/components/ClassPicker.astro`
- Test: `test/klass.test.mjs`, `test/pages.test.mjs`

**Interfaces:**
- Produces:
  - `src/lib/klass.ts`: `export function gradeOf(classId: string): number | null` (`class-1_5` → 1, 형식이 아니면 null) · `export function readClass(): string` / `export function saveClass(id: string): void` (localStorage, try/catch) · `export function sheetClassesHTML(classes: { id: string; name: string; grade: number }[], grade: number, selected: string): string` (반 버튼, 5칸 격자용 `<button type="button" data-pick-class=…>` + `aria-pressed`, 이름은 「5반」처럼 반 번호만 — `name`이 「1-5」면 「5반」으로)
  - `Plate.astro` props: `{ kind: 'class' | 'page'; title?: string; sub?: string; switchLabel?: boolean }`. `kind='class'`이면 브라우저 스크립트가 저장된 반으로 제목을 채운다(`data-plate-class`): 반이 있으면 sub 「명지중학교 알림장 · 우리 반」 + 제목 「1학년 5반」(+`title` 접미사, 예: 「 시간표」) + 버튼 「반 바꾸기」, 없으면 제목 「우리 반을 골라 주세요」 + 흰 버튼 「반 고르기」. 버튼은 `data-open-class-sheet`.
  - `ClassSheet.astro`: `<dialog data-class-sheet>`; 시간표 API(`site.timetableApi`)에서 반 목록을 받아 학년 3칸 + 반 격자 + 「N학년 M반으로 보기」 + 「닫기」. 확정하면 `saveClass`, `<html data-grade>`를 그 학년으로, `document`에 `new CustomEvent('mjms:class', { detail: id })`를 보낸다. 실패 시 「반 목록을 불러오지 못했어요」 + 「다시 불러오기」. Base에 한 번만 넣는다(모든 화면에서 열 수 있게).
  - Base 머리 인라인 스크립트: `mjms-grade`를 지우고, `mjms-class`에서 학년을 얻어 `data-grade`에 넣는다.

- [ ] **Step 1: 실패하는 테스트**

```js
// test/klass.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeOf, sheetClassesHTML } from '../src/lib/klass.ts';

test('반 id에서 학년을 얻는다', () => {
  assert.equal(gradeOf('class-1_5'), 1);
  assert.equal(gradeOf('class-3_10'), 3);
  assert.equal(gradeOf('nope'), null);
});
test('반 버튼은 그 학년만, 고른 반은 눌림', () => {
  const html = sheetClassesHTML([{ id: 'class-1_5', name: '1-5', grade: 1 }, { id: 'class-2_1', name: '2-1', grade: 2 }], 1, 'class-1_5');
  assert.match(html, /data-pick-class="class-1_5"[^>]*aria-pressed="true"[^>]*>5반</);
  assert.ok(!html.includes('class-2_1'));
});
```

pages.test.mjs에 추가:

```js
test('모든 화면: 아래 탭 라벨, 명패, IBM Plex 없음', () => {
  for (const f of ['index.html', 'notices/index.html', 'schedule/index.html', 'timetable/index.html', 'lost/index.html', 'about/index.html']) {
    const html = read(f);
    assert.match(html, /class="tabbar"[\s\S]*오늘[\s\S]*가정통신문[\s\S]*일정[\s\S]*분실물[\s\S]*시간표/, f);
    assert.match(html, /class="plate/, f);
    assert.ok(!/ibm-plex|IBM Plex/i.test(html), f);
    assert.match(html, /data-class-sheet/, f);
  }
});
```

- [ ] **Step 2: FAIL 확인** — `npm test`
- [ ] **Step 3: 구현** — 스펙 「화면 세계」대로. 아래 탭: 불투명 흰 바탕, 높이 56px + `env(safe-area-inset-bottom)`, 아이콘 22px, 라벨 12px, 현재 탭 남색 700. `main`의 아래 여백은 탭 높이만큼. 데스크톱은 `main` 최대 40rem 가운데. 기존 화면들은 이 단계에서 `<Plate kind="page" title=… />`만 머리에 넣어 빌드가 깨지지 않게 한다(각 화면 본문 개편은 N3~N7).
- [ ] **Step 4: PASS 확인** — `npm test`, `npx astro check < /dev/null` 오류 0.
- [ ] **Step 5: Commit** — `git commit -m "Plate shell: Pretendard, plate header, class sheet, opaque tab bar"`

### Task N2: 피드의 `schedule` 읽기와 쉬는 날 합치기

**Files:**
- Modify: `src/lib/feed.ts` (`FeedScheduleItem`, `Feed.schedule: FeedScheduleItem[] | null`, 검사)
- Modify: `src/lib/content.ts` (`getSchedule`, `getScheduleEntries` 대체)
- Modify: `src/lib/dates.ts` (`offRanges`)
- Modify: `src/lib/board.ts`, `src/lib/meal.ts` 호출부(쉬는 날 = `offRanges(feed)`)
- Modify: `test/fixtures/feed.json` (`schedule` 몇 개 추가: 10/22 「학생예배」 전 학년, 10/26~28 「기말고사」 [3], 11/20 「재량휴업일」 dayoff)
- Test: `test/feed.test.mjs`, `test/dates.test.mjs`, `test/board.test.mjs`

**Interfaces:**
- Produces:
  - `export type FeedScheduleItem = { title: string; start: string; end: string; grades: number[]; kind: 'holiday' | 'dayoff' | 'event' }`
  - `loadFeed`: `schedule`이 배열이면 항목마다 검사(제목 1~100자, `YMD`, start ≤ end, grades ⊂ {1,2,3}, kind 셋 중 하나) 통과한 것만 새 객체로, 배열이 아니면 `null`.
  - `export function offRanges(feed: Pick<Feed, 'daysOff' | 'schedule'>): { title: string; start: string; end: string }[]` (dates.ts) — `mergeDaysOff([...daysOff, ...schedule의 holiday·dayoff])`
  - `export async function getSchedule(): Promise<FeedScheduleItem[] | null>` (content.ts, start 순)
  - `boardFromFeed`의 `events`는 이제 `schedule`에서 오늘에 걸친 항목(없으면 `[]`). 가정통신문 행사 날짜는 칠판 일정에 섞지 않는다.

- [ ] **Step 1: 실패하는 테스트**

```js
// feed.test.mjs
test('schedule: 검사 통과한 항목만, 없으면 null', async () => {
  const good = { title: '기말고사', start: '2026-10-26', end: '2026-10-28', grades: [3], kind: 'event' };
  const bad = [{ ...good, kind: 'party' }, { ...good, start: '2026-10-29' }, { ...good, grades: [4] }, { ...good, title: '' }];
  const feed = await loadFeed({ fetcher: async () => new Response(JSON.stringify({ ...base, schedule: [good, ...bad] })), url: 'x' });
  assert.deepEqual(feed.schedule, [good]);
  const none = await loadFeed({ fetcher: async () => new Response(JSON.stringify(base)), url: 'x' });
  assert.equal(none.schedule, null);
});
// dates.test.mjs
test('나이스 쉬는 날도 등교일 계산에 들어간다', () => {
  const off = offRanges({ daysOff: [], schedule: [{ title: '재량휴업일', start: '2026-11-20', end: '2026-11-20', grades: [], kind: 'dayoff' }, { title: '학생예배', start: '2026-11-19', end: '2026-11-19', grades: [], kind: 'event' }] });
  assert.equal(nextSchoolDay('2026-11-19', off), '2026-11-23');
});
// board.test.mjs
test('칠판 오늘 일정은 나이스 학사일정에서만', () => {
  const b = boardFromFeed('2026-10-22', feed({ schedule: [{ title: '학생예배', start: '2026-10-22', end: '2026-10-22', grades: [], kind: 'event' }], letters: [letter({ eventDate: '2026-10-22', subject: '체험학습' })] }));
  assert.deepEqual(b.events.map((e) => e.title), ['학생예배']);
});
```
(`base`는 feed.test.mjs의 기존 정상 피드 객체 이름에 맞춘다.)

- [ ] **Step 2: FAIL 확인** — `npm test`
- [ ] **Step 3: 구현** — 위 Interfaces대로. `events`(공개 체크)는 피드 검사에서 계속 받아도 되지만 어느 화면도 쓰지 않는다.
- [ ] **Step 4: PASS 확인** — `npm test`, `npx astro check < /dev/null`.
- [ ] **Step 5: Commit** — `git commit -m "Feed: read NEIS schedule; school days also skip NEIS holidays"`

### Task N3: 첫 화면

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/Chalkboard.astro` (칠판 = 오늘 칸만)
- Modify: `src/lib/board.ts` (`boardHTML` 새 마크업)
- Create: `src/components/Sign.astro` (안내판: props `{ title: string; link?: { href: string; label: string }; id?: string }` + slot)
- Delete: `src/components/LostStrip.astro`, `src/components/NoticeRow.astro`(N4에서 안 쓰면), `src/components/EventRow.astro`(N5에서 안 쓰면)
- Test: `test/board.test.mjs`, `test/pages.test.mjs`

**Interfaces:**
- Consumes: N1 `Plate`, `readClass`, `gradeOf`, `mjms:class` 이벤트; N2 `getSchedule`, `offRanges`; 기존 `loadTimetable`, `changeLines`, `pickMeal`, `mealHTML`, `loadLost`
- Produces:
  - `boardHTML(board, base)`: 쉬는 날 줄, `<div data-board-changes>`(브라우저가 채움), 「챙길 것」(오늘 + 다음 등교일 준비물, 둘 다 없으면 「챙길 것 없어요」 — 지금 CSS 학년 규칙 유지), 「오늘 일정」(있을 때). 「오늘 급식」은 칠판에서 빠져 안내판으로 간다.
  - `export function changesStateHTML(state: { kind: 'lines'; lines: string[] } | { kind: 'none' } | { kind: 'nofeed' } | { kind: 'error' }): string` (board.ts) — 소제목 「오늘 바뀐 수업」 + 줄(「1교시 영어」 + `<s>체육</s>`), 「바뀐 수업 없어요」, 「오늘 시간표가 아직 없어요」, 「바뀐 수업을 불러오지 못했어요」 + `<button type="button" data-retry-changes>다시 불러오기</button>`.
  - 다가오는 일정: `getSchedule()`에서 끝이 오늘 이후인 것, 보기(all·1·2·3)마다 가까운 2개(지금의 `data-show` 방식 유지), 행 = 날짜(`formatRange`) · 이름 · 배지(학년 배지 또는 「쉬는 날」/「공휴일」). `schedule`이 null이면 판에 「학사일정을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.」.
  - 새 가정통신문: 게시 2주 안, 최대 3개(보기마다 3개 — `data-show` 같은 방식), 행 = 제목 + 대상 배지. 없으면 「2주 안에 새 가정통신문이 없어요」.
  - 분실물 판: `loadLost`가 1개 이상이면 「분실물 N개」 판을 보이고, 실패·0개면 감춘다.

- [ ] **Step 1: 실패하는 테스트**

```js
// board.test.mjs
test('바뀐 수업 상태 문구', () => {
  assert.match(changesStateHTML({ kind: 'lines', lines: ['1교시 영어 (원래 체육)'] }), /1교시 영어/);
  assert.match(changesStateHTML({ kind: 'none' }), /바뀐 수업 없어요/);
  assert.match(changesStateHTML({ kind: 'nofeed' }), /오늘 시간표가 아직 없어요/);
  assert.match(changesStateHTML({ kind: 'error' }), /불러오지 못했어요[\s\S]*data-retry-changes/);
});
test('칠판에 급식·새 알림은 없다', () => {
  const html = boardHTML(boardFromFeed('2026-10-22', feed({ meals: [{ ymd: '2026-10-22', dishes: [{ name: '쌀밥', allergens: [] }] }] })), '/');
  assert.ok(!html.includes('쌀밥'));
  assert.ok(!html.includes('새로 올라온 알림'));
});
// pages.test.mjs — 기존 첫 화면 테스트(칠판 급식, 다가오는 일정 2개)를 이것으로 바꾼다
test('첫 화면 순서: 명패 → 칠판 → 급식 → 일정 → 가정통신문 → 분실물, 손글씨는 날짜만', () => {
  const html = read('index.html');
  const at = (s) => html.indexOf(s);
  assert.ok(at('class="plate') < at('class="board') && at('class="board') < at('id="meal-title"'));
  assert.ok(at('id="meal-title"') < at('id="upcoming"') && at('id="upcoming"') < at('id="new-letters"') && at('id="new-letters"') < at('data-lost-sign'));
  assert.ok(!html.includes('class="notes"') && !html.includes('lost-strip') && !html.includes('class="tray'));
  assert.match(html, /<details>[\s\S]*알레르기/);
});
```

- [ ] **Step 2: FAIL 확인** — `npm test`
- [ ] **Step 3: 구현** — 시안 ①대로. 칠판: 평면 `#26443a`, 모서리 12px, 안쪽 14px 16px, 날짜만 `.board-day`에 Gaegu 30px(그 밖에 Gaegu를 쓰는 선택자가 없어야 한다), 소제목 13px(바뀐 수업 노랑, 챙길 것 주황), 항목 17px/600, `<s>` 14px 흐림. 브라우저 스크립트: 반이 있고 오늘이 등교일이면 시간표 API → `changesStateHTML`; 실패면 error 상태, `data-retry-changes` 클릭 시 다시 요청; `mjms:class` 이벤트에 다시 그린다. 처음 그리기 애니메이션(분필로 쓰기)은 없앤다.
- [ ] **Step 4: PASS 확인** — `npm test`, `npx astro check < /dev/null`.
- [ ] **Step 5: Commit** — `git commit -m "Home: plate, chalk today box, meal/schedule/letters/lost signs"`

### Task N4: 가정통신문 목록과 한 건

**Files:**
- Modify: `src/pages/notices/index.astro`, `src/pages/notices/[id].astro`
- Create: `src/components/DocCard.astro` (props `{ letter: FeedLetter; isNew: boolean }`)
- Create: `src/components/GradeBadge.astro` (props `{ grades: number[] }` → 「1학년」/「1·2학년」/「전 학년」, 색은 Global Constraints)
- Delete: `src/components/NoticeRow.astro`, `src/components/GradeDots.astro` (쓰는 곳이 없으면)
- Test: `test/pages.test.mjs`

**Interfaces:**
- Consumes: N1 `Plate`, `gradeOf`/`readClass`, `mjms:class`; `getLetters`
- Produces: 목록 필터는 `<html data-grade>`와 `<div data-letter-filter>`의 알약으로 고른다. 반이 있으면 알약 「N학년 + 전 학년」(기본)·「모든 학년」, 없으면 「모든 학년」(기본)·「1학년」·「2학년」·「3학년」. 숨겨진 학년 글 수 문구는 브라우저가 센다.

- [ ] **Step 1: 실패하는 테스트**

```js
test('가정통신문 목록: 문서 카드 = 배지 → 제목 → 게시일·호수', () => {
  const html = read('notices/index.html');
  const card = html.match(/<article class="doc"[\s\S]*?<\/article>/)[0];
  assert.ok(card.indexOf('class="badge') < card.indexOf('<h2') && card.indexOf('<h2') < card.indexOf('게시'));
  assert.match(card, /제2026-\d+호|제\d+-\d+호/);
  assert.match(html, /data-letter-filter/);
});
test('가정통신문 한 건: 문서 머리, 정보 표, 원문 버튼', () => {
  const html = read('notices/L-2026-1022-3/index.html');
  assert.match(html, /class="letter-head"[\s\S]*명지중학교/);
  assert.match(html, /<dl class="facts">[\s\S]*대상/);
  assert.match(html, /학교 홈페이지 원문 보기/);
});
```
(fixture의 실제 id·호수에 맞춘다.)

- [ ] **Step 2: FAIL 확인** — `npm test`
- [ ] **Step 3: 구현** — 시안 ③④, 스펙 ③④대로. 카드 전체가 링크(`<a>`가 article 안을 감싼다), 「새 글」은 2주 안, 「준비물」은 bring이 있을 때. 상세의 일정 칸 라벨은 「일정」, 준비물 챙길 날은 `due`가 있을 때 「준비물 챙길 날」.
- [ ] **Step 4: PASS 확인** — `npm test`, `npx astro check < /dev/null`.
- [ ] **Step 5: Commit** — `git commit -m "Letters: document cards, letter-format detail, grade filter pills"`

### Task N5: 학사일정 달력

**Files:**
- Create: `src/lib/calendar.ts`
- Modify: `src/pages/schedule.astro`
- Test: `test/calendar.test.mjs`, `test/pages.test.mjs`

**Interfaces:**
- Consumes: N2 `getSchedule`, `FeedScheduleItem`; N1 `Plate`, `data-grade`
- Produces (calendar.ts, 모두 순수 함수):
  - `export function monthCells(ym: string): { ymd: string; inMonth: boolean }[]` — 그 달을 일요일 시작 7칸 주들로(앞뒤 달 칸 포함, 길이 35 또는 42)
  - `export function itemsOn(ymd: string, items: FeedScheduleItem[], grade: number | null): FeedScheduleItem[]` — 학년이 있으면 그 학년 + 전 학년만
  - `export function monthItems(ym: string, items: FeedScheduleItem[], grade: number | null): FeedScheduleItem[]` — 그 달에 걸친 것
  - `export function monthsOf(items: FeedScheduleItem[], today: string): string[]` — 오늘이 든 학년도의 12달(`YYYY-MM`)
  - `export function initialDay(ym: string, today: string, items: FeedScheduleItem[]): string` — 오늘이 그 달이면 오늘, 아니면 그 달 첫 일정 날, 없으면 1일
  - `export function dayLabel(ymd: string, count: number): string` — 「10월 7일, 일정 1개」

- [ ] **Step 1: 실패하는 테스트**

```js
import { monthCells, itemsOn, monthItems, initialDay, dayLabel } from '../src/lib/calendar.ts';
const items = [
  { title: '중간고사', start: '2026-10-07', end: '2026-10-08', grades: [1, 2], kind: 'event' },
  { title: '한글날', start: '2026-10-09', end: '2026-10-09', grades: [], kind: 'holiday' },
  { title: '기말고사', start: '2026-10-26', end: '2026-10-28', grades: [3], kind: 'event' },
];
test('2026년 10월은 9월 27일(일)부터 7칸씩 5주', () => {
  const c = monthCells('2026-10');
  assert.equal(c.length, 35);
  assert.deepEqual(c[0], { ymd: '2026-09-27', inMonth: false });
  assert.deepEqual(c[4], { ymd: '2026-10-01', inMonth: true });
});
test('학년 필터: 3학년이면 1·2학년 중간고사는 안 보인다', () => {
  assert.deepEqual(itemsOn('2026-10-08', items, 3), []);
  assert.equal(itemsOn('2026-10-08', items, null).length, 1);
  assert.deepEqual(monthItems('2026-10', items, 3).map((i) => i.title), ['한글날', '기말고사']);
});
test('처음 고른 날, 읽기 이름', () => {
  assert.equal(initialDay('2026-10', '2026-10-23', items), '2026-10-23');
  assert.equal(initialDay('2026-11', '2026-10-23', items), '2026-11-01');
  assert.equal(dayLabel('2026-10-07', 1), '10월 7일, 일정 1개');
});
```

pages.test.mjs:

```js
test('학사일정: 달력 판, 출처 줄, 자바스크립트 없을 때 목록', () => {
  const html = read('schedule/index.html');
  assert.match(html, /data-calendar/);
  assert.match(html, /나이스 교육정보 개방 포털/);
  assert.match(html, /<noscript>[\s\S]*기말고사/);
});
```

- [ ] **Step 2: FAIL 확인** — `npm test`
- [ ] **Step 3: 구현** — 시안 ⑤, 스펙 ⑤대로. 일정은 `<script type="application/json">`(`<` 이스케이프)로 심고 브라우저가 달을 그린다. 날짜 칸은 `<button>`(44px, `aria-label=dayLabel`, `aria-pressed`=고른 날), 점은 장식(`aria-hidden`). 「‹」「›」는 `monthsOf` 범위 밖이면 `disabled`. 반을 골랐으면 「모든 학년 보기」 토글(`aria-pressed`). `schedule`이 null이면 달력 대신 안내 문구.
- [ ] **Step 4: PASS 확인** — `npm test`, `npx astro check < /dev/null`.
- [ ] **Step 5: Commit** — `git commit -m "Schedule: month calendar from NEIS with day and month lists"`

### Task N6: 시간표

**Files:**
- Modify: `src/pages/timetable.astro`
- Modify: `src/lib/timetable.ts` (`weekTableHTML`, `changesBoxHTML` → 안내판 마크업, `classButtonsHTML` 삭제)
- Test: `test/timetable.test.mjs`

**Interfaces:**
- Consumes: N1 `Plate kind="class" title=" 시간표"`, `ClassSheet`(같은 창), `readClass`, `mjms:class`
- Produces:
  - `weekTableHTML(cls, weekDays, today)`: 바뀐 칸 `<td class="tt-changed" aria-label="금요일 1교시 영어, 원래 체육, 바뀜"><b>영어</b><s>체육</s></td>`(원래 과목이 없으면 `<s>` 대신 사유 note를 작은 글자로), 창체 `<small class="tt-special">창체</small>`, 오늘 열 머리 `th.tt-today`, 칸 `td.tt-today`. 단추·`data-reveal` 없음.
  - `changesBoxHTML(cls, ymd, label, empty)`: 안내판 마크업, 줄 = `<span>1교시</span><span><b>영어</b> <s>체육</s></span>`.

- [ ] **Step 1: 실패하는 테스트** (timetable.test.mjs의 reveal 관련 테스트를 이것으로 바꾼다)

```js
test('바뀐 칸은 원래 과목을 줄 그어 칸 안에, 단추·reveal 없음', () => {
  const html = weekTableHTML(cls15, ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'], '2026-10-23');
  assert.match(html, /<td class="[^"]*tt-changed[^"]*" aria-label="금요일 1교시 영어, 원래 체육, 바뀜"><b>영어<\/b><s>체육<\/s><\/td>/);
  assert.ok(!html.includes('data-reveal') && !html.includes('<button'));
  assert.match(html, /<small class="tt-special">창체<\/small>/);
});
```
(`cls15`는 파일의 기존 fixture 반 이름에 맞춘다.)

- [ ] **Step 2: FAIL 확인** — `npm test`
- [ ] **Step 3: 구현** — 시안 ⑥, 스펙 ⑥대로. 화면: 명패(반 + 「반 바꾸기」) → 이번 주/다음 주 분할 버튼 → 「오늘 바뀐 수업」 안내판 → 주간표 판(판 안 가로 스크롤, 교시 열 `position: sticky`) → 범례 줄. 반이 없으면 명패 안내만 + 「반 고르기」. 시간표 요청 실패 시 「시간표를 불러오지 못했어요」 + 「다시 불러오기」. `mjms:class`에 다시 그린다.
- [ ] **Step 4: PASS 확인** — `npm test`, `npx astro check < /dev/null`.
- [ ] **Step 5: Commit** — `git commit -m "Timetable: plate, inline changed subjects, one marking rule"`

### Task N7: 나머지 화면, 확인, 마무리

**Files:**
- Modify: `src/pages/lost.astro`, `src/pages/about.astro`, `src/pages/404.astro` (명패 머리, 분실물 사진 상자는 그대로)
- Modify: `README.md` (글꼴·일정 출처 한 줄씩)
- Create: `PRODUCT.md`는 이미 있음 → 커밋에 포함
- Create (finish 후): `DESIGN.md`

- [ ] **Step 1:** 세 화면 머리를 `<Plate kind="page" title="분실물함" sub="학교에서 보관 중인 물건" />` 등으로 바꾸고 옛 `.page-title` 머리 줄을 지운다.
- [ ] **Step 2: 전체 확인** — `npm test` 전부 PASS, `npx astro check < /dev/null` 0, `npm run build`(라이브 피드) 성공.
- [ ] **Step 3: 휴대폰 스크린숏** — 아이폰 13(390×664)으로 6개 화면(반 고름/안 고름 각각 첫 화면)을 찍어 시안 `screens.html`과 나란히 비교한다. 첫 화면에서 바뀐 수업·챙길 것·급식이 스크롤 없이 보이는지, 가로 넘침이 없는지, 누르는 곳이 44px 이상인지 잰다.
- [ ] **Step 4: 디자인 감지기** — `impeccable detect --json src/pages src/components src/layouts`, 새 경고는 고친다.
- [ ] **Step 5: Commit** — `git commit -m "Lost, about, 404 under the plate; README"`
- [ ] **Step 6: 마무리 검토** — impeccable 마무리 검토(`impeccable-finish-reviewer`)에 방향 계약·시안·스크린숏을 주고 판정을 받는다. 고칠 것을 고친 뒤 `impeccable-documenter`로 `DESIGN.md`를 쓴다. 커밋 `git commit -m "DESIGN.md from the built plate world"`.
