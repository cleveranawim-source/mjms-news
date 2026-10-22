# 알림장 자료 들여오기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈페이지 가정통신문을 AI 교무실이 읽어 확인 카드로 올리고, 공개 체크한 학사일정·쉬는 날·급식과 함께 베르셀로 옮긴 알림장(mjms-news.vercel.app)에 빌드 때 실어 보낸다.

**Architecture:** AI 교무실(`mjms-office`, Next.js 16 + Supabase)이 크론으로 홈페이지 게시판을 읽고 HWP 글자를 뽑아 AI 초안을 `news_letters` 표에 둔다. 담당자가 새 화면 `/news`에서 카드를 확인해 올리고 학사일정 공개를 고르면, AI 교무실이 공개 주소 `/api/news/feed`(JSON 하나)를 내주고 알림장 베르셀 배포 훅을 부른다. 알림장(`mjms-news`, Astro 정적)은 빌드할 때 그 JSON을 받아 페이지를 만든다. 분실물만 지금처럼 브라우저가 바로 읽는다.

**Tech Stack:** Next.js 16.4, Supabase(Postgres·RLS), vitest 4, Anthropic(`lib/ai/complete.ts`), SheetJS CFB(`lib/library/extract/hwp.ts`), Astro 7, node:test, Vercel.

**Spec:** `mjms-news/docs/superpowers/specs/2026-10-22-homepage-letters-design.md`

**저장소 두 곳:**
- Part A = `/Users/yeopro14/Claude/mjms-office` (경로는 이 저장소 기준). `main`에서 `feat/news-feed` 브랜치를 따서 일하고 PR로 합친다.
- Part B = `/Users/yeopro14/orca/projects/mjms-news` (경로는 이 저장소 기준). `main`에 바로 커밋해 온 저장소다.

## Global Constraints

- 화면 글은 한국어, 휴대폰 우선. AI 도우미 이름은 「AI 해죠」.
- AI 교무실 CLAUDE.md 규칙을 따른다. 서버 액션·API는 `getSessionProfile()`·`requireProfile()`·`requireAdmin()`으로 시작한다. 시크릿 키 클라이언트는 서버에서만 쓴다. 새 표에는 `members_only` 제한 정책을 건다. 비밀값 비교는 `secretEquals`. 개인 알림은 `notifyUsers`로 보낸다. 쉬는 날 판정은 `lib/calendar/day-off.ts`, 서울 날짜는 `lib/calendar/format.ts`·`lib/date`의 `todayInSeoul()`.
- 새 패키지를 들이지 않는다(두 저장소 모두).
- 홈페이지 고정값:
  - 주소 `https://myongji.sen.ms.kr`
  - 가정통신문 메뉴 `/66745/subMenu.do`
  - `bbsId=BBSMSTR_000000007701`, `bbsTyCode=dliv`
  - 목록 `POST /dggb/module/board/selectBoardListAjax.do`
  - 글 `POST /dggb/module/board/selectBoardDetailAjax.do`
  - 첨부 `GET /dggb/board/boardFile/downFile.do?atchFileId=…&fileSn=…`
- 알림장 새 주소 `https://mjms-news.vercel.app`. 피드 주소 `https://mjms-office.vercel.app/api/news/feed`.
- 크론(서울): 평일 8:00·12:00·17:00 가정통신문 읽기, 매일 5:00 알림장 다시 빌드.
- 알림장에 실리지 않는 것: 선생님 실명, 학생 이름, 연락처, 동의서 양식, 공개 체크하지 않은 일정, 올리지 않은 초안.
- 첨부 원본과 뽑은 글자는 DB에 남기지 않는다. 남기는 것은 초안 칸뿐이다.
- 알림장 담당은 settings `news_editors`(선생님 이름 `string[]`)로 둔다. 비면 관리자. 권한 = 담당 목록 + 관리자.

## Review Focus

1. **홈페이지가 오류 화면이나 바뀐 HTML을 줄 때:** 크론은 초안을 하나도 만들지 않고 0건으로 끝나야 하며 500을 내지 않는다. 테스트는 Task A4 `ingest skips when list page has no rows`.
2. **hwp가 아니거나 글자가 안 나오는 글:** 초안은 `read_ok=false`로 제목·링크만 담는다. AI를 부르지 않는다. 테스트는 Task A4 `ingest makes an empty draft when hwp text is missing`.
3. **AI가 깨진 JSON이나 엉뚱한 값을 줄 때**(학년 4, 날짜 아닌 문자열, 1년 넘게 떨어진 날짜): 파서는 그 칸만 버리고 던지지 않는다. 테스트는 Task A2 `parseLetterDraft drops invalid fields`.
4. **피드 새기:** 초안·올리지 않기(skipped) 글, 공개 체크하지 않은 일정이 `/api/news/feed`에 나오면 안 된다. 테스트는 Task A7 `buildFeed only includes published letters and public events`.
5. **빌드 때 피드를 못 받을 때:** 알림장 빌드는 실패해야 한다. 빈 알림장으로 덮어쓰면 안 된다. 테스트는 Task B1 `loadFeed throws on non-200 and on bad shape`.

---

## Part A — AI 교무실 (`mjms-office`)

### Task A1: 홈페이지 게시판 HTML 읽기 · 학년 읽기 · 개인정보 규칙 (순수 함수)

**Files:**
- Create: `lib/news/homepage-parse.ts`, `lib/news/grades.ts`, `lib/news/privacy.ts`
- Create: `tests/fixtures/news/letters-list.html`, `tests/fixtures/news/letter-detail.html`
- Test: `tests/unit/news-homepage-parse.test.ts`, `tests/unit/news-grades.test.ts`, `tests/unit/news-privacy.test.ts`

**Interfaces:**
- Produces:
  - `type ListRow = { nttId: string; title: string; postedOn: string /* YYYY-MM-DD */ }`
  - `parseLetterList(html: string): ListRow[]`
  - `type Attachment = { name: string; atchFileId: string; fileSn: string }`
  - `parseLetterDetail(html: string): { title: string; attachments: Attachment[] }`
  - `parseBoardForm(html: string): Record<string, string>`: 메뉴 화면 `#boardFrm`의 hidden input들.
  - `letterNumber(title: string): string | null`: 「제26-180호」.
  - `letterSubject(title: string): string`: 대괄호 안. 없으면 제목 그대로. HTML 엔티티(`&apos;` 등)를 푼다.
  - `gradesFromTitle(title: string): number[]`: 「(3학년)」→[3], 「(2,3학년)」·「(2·3학년)」→[2,3]. 없으면 [1,2,3].
  - `privacyIssues(text: string): { kind: string; match: string }[]`: 규칙은 mjms-news `scripts/check-privacy.mjs`와 같다(주민등록번호·휴대폰 번호·학년·반·번호·학번·이메일). 이메일 허용 도메인은 `sen.go.kr`, `sen.ms.kr`.

- [ ] **Step 1: 실제 화면을 시험 자료로 저장**

Run (저장소 루트):
```bash
mkdir -p tests/fixtures/news && node -e '
const base="https://myongji.sen.ms.kr";
(async()=>{const r=await fetch(base+"/66745/subMenu.do");const ck=(r.headers.getSetCookie?.()||[]).map(c=>c.split(";")[0]).join("; ");
const form=new URLSearchParams({bbsId:"BBSMSTR_000000007701",bbsTyCode:"dliv",customRecordCountPerPage:"10",pageIndex:"1",searchCondition:"",searchKeyword:"",checkNttId:"",mvmnReturnUrl:""});
const l=await (await fetch(base+"/dggb/module/board/selectBoardListAjax.do",{method:"POST",headers:{cookie:ck,"content-type":"application/x-www-form-urlencoded"},body:form})).text();
require("fs").writeFileSync("tests/fixtures/news/letters-list.html",l);
const id=l.match(/fnView\(\x27[^\x27]+\x27, \x27(\d+)\x27\)/)[1];form.set("nttId",id);
const d=await (await fetch(base+"/dggb/module/board/selectBoardDetailAjax.do",{method:"POST",headers:{cookie:ck,"content-type":"application/x-www-form-urlencoded"},body:form})).text();
require("fs").writeFileSync("tests/fixtures/news/letter-detail.html",d);console.log(id)})()'
```
Expected: 글 번호 하나가 찍히고 두 파일이 생긴다.

- [ ] **Step 2: 실패하는 테스트 쓰기**

`tests/unit/news-homepage-parse.test.ts`:
- `parseLetterList`: 시험 자료에서 행이 10개 이하, 1개 이상 나온다. 모든 `nttId`는 `/^\d+$/`, `postedOn`은 `isYmd`. 제목 행(「번호 제목…」)은 빠진다.
- `parseLetterList("<html>오류</html>")` → `[]`.
- `parseLetterDetail`: 시험 자료에서 `attachments[0].name`이 `.hwp`로 끝나고, `atchFileId`는 `/^FILE_\d+$/`이다.
- `letterNumber("제26-180호 명지 가정통신[1학년 5반 …]")` → `"제26-180호"`.
- `letterSubject("제26-180호 명지 가정통신[1학년 5반 학급 집단상담 및 공동체 활동 안내]")` → `"1학년 5반 학급 집단상담 및 공동체 활동 안내"`.
- `letterSubject("… [&apos;2026 공연봄날&apos; 관람]")` → `"'2026 공연봄날' 관람"`.

`tests/unit/news-grades.test.ts`:
- 「(3학년) 기말고사」→[3], 「(2,3학년) 진로탐색」→[2,3], 「(2·3학년)」→[2,3], 「체육대회」→[1,2,3].
- 「1학년 5반 학급 집단상담」→[1]. 제목 앞머리 「N학년」도 읽는다.

`tests/unit/news-privacy.test.ts`: mjms-news `test/privacy.test.mjs`의 7개 경우를 vitest로 옮긴다. 거기에 `cleanedu@sen.go.kr`은 걸리지 않는다는 경우를 더한다.

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run tests/unit/news-homepage-parse.test.ts tests/unit/news-grades.test.ts tests/unit/news-privacy.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 4: 세 파일 구현**

- 순수 파일이다. `server-only`를 붙이지 않는다.
- 목록 행: `<tr>` 안의 `fnView('…', '(\d+)')`, 둘째 `<td>`의 제목, `YYYY-MM-DD` 칸.
- 첨부: 글 HTML의 `serverFileObj["name"] = "…"; … ["atchFileId"] = "…"; ["fileSn"] = "…"` 블록.

- [ ] **Step 5: 테스트 통과 확인**

Run: 위와 같은 명령. Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/news tests/unit/news-*.test.ts tests/fixtures/news
git commit -m "알림장: 홈페이지 가정통신문 목록·글 읽기, 학년·개인정보 규칙"
```

### Task A2: AI 초안 만들기 · 결과 읽기 (순수 + AI 호출)

**Files:**
- Create: `lib/news/letter-draft.ts` (순수 — 지시문·파서), `lib/news/letter-ai.ts` (server-only — AI 호출)
- Test: `tests/unit/news-letter-draft.test.ts`

**Interfaces:**
- Consumes: `gradesFromTitle`, `privacyIssues` (A1)
- Produces:
  - `type LetterDraft = { grades: number[]; classes: string | null; eventDate: string | null; eventEnd: string | null; bring: string[]; due: string | null; summary: string }`
  - `LETTER_SYSTEM: string`: 지시문. 아래 내용을 담는다.
    - 「답은 JSON 하나만」
    - 선생님 실명·연락처·동의서 양식·자르는 선 아래는 빼기
    - 요약은 세 줄 이내 학부모 말투(「~합니다」)
    - 준비물은 짧은 낱말
    - 날짜는 YYYY-MM-DD
  - `buildLetterPrompt(x: { subject: string; postedOn: string; text: string }): string`: 본문은 8000자에서 자른다.
  - `parseLetterDraft(raw: string, ctx: { postedOn: string; subject: string }): LetterDraft`
    - 잘못된 칸은 버린다.
    - grades는 1~3만 받고, 비면 `gradesFromTitle(subject)`.
    - 날짜는 `isYmd`이고 postedOn −30일 ~ +365일 안이어야 한다.
    - bring은 낱말당 30자, 10개까지.
    - summary는 300자까지.
    - JSON이 아니면 빈 초안(grades만 제목에서 읽은 값).
  - `draftLetter(x: { subject: string; postedOn: string; text: string }): Promise<LetterDraft>` (`letter-ai.ts`)
    - `completeText(LETTER_SYSTEM, buildLetterPrompt(x), { fast: true, maxTokens: 1500 })` → `parseLetterDraft`.
    - `ANTHROPIC_API_KEY`가 없거나 실패하면 빈 초안. 내용은 로그에 남기지 않는다.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`tests/unit/news-letter-draft.test.ts`:
- **정상:** raw
  ```
  {"grades":[1],"classes":"1학년 5반","eventDate":"2026-10-19","bring":["체육복"],"due":"2026-10-19","summary":"10월 19일 1학년 5반 학급 활동이 있습니다."}
  ```
  ctx `{ postedOn: "2026-10-16", subject: "1학년 5반 학급 집단상담…" }`이면 그대로 나온다. `eventEnd`는 null이다.
- **`parseLetterDraft drops invalid fields`:**
  - grades `[4,"x",2]` → `[2]`
  - eventDate `"다음 주"` → null
  - due `"2028-01-01"`(1년 넘음) → null
  - bring에 31자 낱말이 있으면 그 낱말만 빠진다
- **깨진 JSON:** `"죄송합니다"` → `{ grades: gradesFromTitle(subject), classes: null, eventDate: null, eventEnd: null, bring: [], due: null, summary: "" }`.
- **앞뒤 말이 붙은 JSON:** `"여기 있습니다: {…} 끝"`도 읽는다.
- **본문 자르기:** `buildLetterPrompt`에 9000자 text를 주면 결과 안의 본문은 8000자다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/news-letter-draft.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`lib/nep/event-parse.ts`처럼 `indexOf("{")`~`lastIndexOf("}")`를 잘라 `JSON.parse`한다. `letter-ai.ts`는 `lib/nep/ai-events.ts`의 키 확인·오류 처리를 따른다.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/unit/news-letter-draft.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/news/letter-draft.ts lib/news/letter-ai.ts tests/unit/news-letter-draft.test.ts
git commit -m "알림장: 가정통신문 AI 초안 지시문과 결과 읽기"
```

### Task A3: 표 `news_letters` · 학사일정 `news_public` · 담당 목록

**Files:**
- Create: `supabase/migrations/20261022120000_news_letters.sql`
- Create: `lib/news/editors.ts` (server-only)
- Modify:
  - `lib/calendar/types.ts` (`Event`에 `news_public: boolean`)
  - `app/(main)/admin/settings/actions.ts` (`saveNewsEditors` — `saveNames` 패턴, 285행 근처)
  - `app/(main)/admin/settings/page.tsx` (담당 이름 칸 — 155~157행 이웃)
- Test: `tests/rls/news-letters.test.ts`, `tests/unit/news-editors.test.ts`; `tests/rls/member-only.test.ts`에 `news_letters` 추가

**Interfaces:**
- Produces (DB):
  - 표 `public.news_letters`
    - `id uuid pk default gen_random_uuid()`
    - `ntt_id text not null unique`
    - `number text`
    - `subject text not null`
    - `posted_on date not null`
    - `source_url text not null`
    - `attachments text[] not null default '{}'` (hwp가 아닌 첨부 이름)
    - `read_ok boolean not null`
    - `status text not null default 'draft' check (status in ('draft','published','skipped'))`
    - `grades smallint[] not null default '{1,2,3}'`
    - `classes text`
    - `event_date date`, `event_end date`, `due date`
    - `bring text[] not null default '{}'`
    - `summary text not null default '' check (char_length(summary) <= 300)`
    - `decided_by uuid references profiles(id) on delete set null`
    - `published_at timestamptz`
    - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - RLS: select는 `public.is_member()`. 쓰기 정책 없음(서버 액션이 시크릿 키로 쓴다). `members_only` 제한 정책.
  - `alter table public.events add column news_public boolean not null default false;`
- Produces (TS):
  - `newsEditorIds(): Promise<string[]>`: `news_editors` 이름 → 활동 중 프로필 id. 비면 role admin.
  - `canEditNews(p: Profile): Promise<boolean>`: 관리자이거나 `newsEditorIds()`에 있다.
  - `requireNewsEditor(): Promise<Profile>`: `requireProfile()` 뒤 `canEditNews`가 아니면 `redirect("/")`.

- [ ] **Step 1: 실패하는 테스트 쓰기**

- `tests/rls/news-letters.test.ts` (`describe.skipIf(!enabled)`, `loginAs("테스트교사")`):
  - 교사는 읽기만 된다.
  - insert·update는 막힌다.
  - `events.news_public`을 교사가 바꾸는 update는 막힌다.
- `tests/unit/news-editors.test.ts`: settings·supabase를 목으로 둔다.
  - 이름 목록이 비면 admin 쿼리를 쓴다.
  - 이름 `["이승열"]`이면 그 이름의 활동 중 프로필 id를 쓴다.
  - `canEditNews`는 admin이면 true다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/news-editors.test.ts`
Expected: FAIL

- [ ] **Step 3: 마이그레이션·`editors.ts`·설정 칸 구현**

- 마이그레이션은 이 저장소 관례대로 Supabase SQL 편집기로 적용하고, 적용했다고 파일 머리 주석에 적는다.
- 설정 화면 칸 이름은 「알림장 담당」, 도움말은 「비우면 관리자가 받습니다」.
- 구글 캘린더 동기화(`lib/calendar/sync.ts`)의 update payload에는 `news_public`이 없으므로 고치지 않는다. 이것을 단위 테스트 한 줄로 고정한다. `tests/unit/news-editors.test.ts`가 아니라 기존 동기화 테스트가 있으면 거기에, 없으면 `tests/unit/news-sync-keeps-public.test.ts`를 만든다. 내용: `syncGcal`의 update 행에 `news_public` 키가 없다.

- [ ] **Step 4: 통과 확인**

Run: `npm test && npm run test:rls`
Expected: PASS (RLS는 `.env.local`이 있을 때)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261022120000_news_letters.sql lib/news/editors.ts lib/calendar/types.ts app/\(main\)/admin/settings tests
git commit -m "알림장: news_letters 표, 학사일정 공개 칸, 알림장 담당 설정"
```

### Task A4: 홈페이지 읽기 크론

**Files:**
- Create: `lib/news/homepage.ts` (server-only — 고정 주소만 부르는 클라이언트)
- Create: `lib/news/ingest.ts` (server-only)
- Create: `app/api/cron/news-letters/route.ts`
- Modify: `vercel.json`
- Test: `tests/unit/news-ingest.test.ts`

**Interfaces:**
- Consumes: A1 파서, A2 `draftLetter`, A3 표·`newsEditorIds`, `hwpText` (`lib/library/extract/hwp.ts`), `notifyUsers`
- Produces:
  - `homepageSession(): Promise<{ list(): Promise<ListRow[]>; detail(nttId: string): Promise<{ title: string; attachments: Attachment[] }>; download(a: Attachment): Promise<Buffer> }>`
    - 첫 호출에서 메뉴 화면을 받아 쿠키와 `parseBoardForm`을 쥔다.
    - 모든 요청은 `HOMEPAGE = "https://myongji.sen.ms.kr"` 고정 경로로만 간다. `redirect: "manual"`이고, 3xx를 받으면 오류로 본다.
    - 시간 제한은 15초. 첨부는 3MB까지.
    - 사람이 넣은 주소를 받지 않는다. 그래서 `link-fetch`를 쓰지 않는다. 이 까닭을 파일 머리 주석에 적는다.
  - `ingestLetters(opts?: { now?: Date; max?: number }): Promise<{ seen: number; created: number; failed: number }>`
    - 목록 첫 쪽에서 `postedOn`이 오늘(서울) −14일 이후이고 `news_letters.ntt_id`에 없는 글만, 한 번에 `max`(기본 8)개까지 처리한다.
    - 글마다 다음 순서로 처리한다.
      1. 상세를 읽는다.
      2. `.hwp` 첨부를 받아 `hwpText`로 글자를 뽑는다.
      3. 글자가 있으면 `draftLetter`, 없으면 빈 초안에 `read_ok=false`.
      4. 행을 insert한다(`ntt_id` 겹침은 건너뜀).
    - `source_url`은 `${HOMEPAGE}/66745/subMenu.do`.
    - 새로 만든 것이 있으면 다음 알림을 보낸다.
      ```ts
      notifyUsers(await newsEditorIds(), { title: "알림장 확인", body: `가정통신문 ${n}건이 확인을 기다립니다.`, url: "/news" }, await testOnlyProfileId(), "news-letters")
      ```
    - 목록을 못 읽거나 비면 `{0,0,0}`. 글 하나의 실패는 `failed`만 늘리고 다음 글로 간다.
  - 크론 라우트:
    ```ts
    export const maxDuration = 300;
    const handle = cronRoute("news-letters", () => ingestLetters());
    export const GET = handle;
    export const POST = handle;
    ```
  - `vercel.json` crons에 `/api/cron/news-letters` 세 줄을 더한다: `0 23 * * 0-4`, `0 3 * * 1-5`, `0 8 * * 1-5` (UTC = 서울 평일 8·12·17시).

- [ ] **Step 1: 실패하는 테스트 쓰기**

`tests/unit/news-ingest.test.ts`: `server-only`, `@/lib/news/homepage`, `@/lib/news/letter-ai`, `@/lib/supabase/admin`, `@/lib/push/notify`, `@/lib/news/editors`를 목으로 둔다.
- `ingest creates drafts for new recent posts`: 목록 3행(하나는 이미 있는 ntt_id, 하나는 20일 전) → created 1이고, insert 행에 `read_ok: true`와 초안 칸이 있고, notifyUsers가 한 번 불린다.
- `ingest skips when list page has no rows`: list가 `[]` → `{seen:0,created:0,failed:0}`, insert도 notify도 없다.
- `ingest makes an empty draft when hwp text is missing`: 첨부가 `.xlsx`뿐 → draftLetter를 부르지 않고 `read_ok: false`, `attachments: ["식단표.xlsx"]`.
- `one failing post does not stop the rest`: detail이 첫 글에서 던짐 → failed 1, created 1.
- `respects max`: 새 글 10개, max 8 → detail이 8번 불린다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/news-ingest.test.ts`
Expected: FAIL

- [ ] **Step 3: `homepage.ts`·`ingest.ts`·라우트·vercel.json 구현**

- [ ] **Step 4: 통과 확인 + 실제 홈페이지로 한 번**

Run: `npx vitest run tests/unit/news-ingest.test.ts`
Expected: PASS

그다음 `npm run dev`를 띄우고 다음을 확인한다.
- `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/news-letters`의 응답 JSON에서 `created`가 1 이상이다.
- DB `news_letters`에 초안이 생기고, `summary`에 선생님 실명이 없다.
- 확인한 뒤 시험 행을 지운다.

- [ ] **Step 5: Commit**

```bash
git add lib/news/homepage.ts lib/news/ingest.ts app/api/cron/news-letters vercel.json tests/unit/news-ingest.test.ts
git commit -m "알림장: 평일 하루 세 번 홈페이지 가정통신문 읽어 초안 만들기"
```

### Task A5: 「알림장」 화면 — 가정통신문 확인 카드

**Files:**
- Create:
  - `app/(main)/news/page.tsx`
  - `app/(main)/news/LetterCard.tsx` ("use client")
  - `app/(main)/news/actions.ts` ("use server")
  - `lib/news/letter-edit.ts` (순수)
- Modify: `lib/modules.ts` (메뉴 「알림장」 — 담당·관리자에게만 보이게, 기존 관리자 전용 메뉴 등록 방식 따라)
- Test: `tests/unit/news-letter-edit.test.ts`, `tests/unit/modules.test.ts`(메뉴 노출 규칙 한 줄)

**Interfaces:**
- Consumes: A1 `privacyIssues`, A3 `requireNewsEditor`·표, A7 `requestNewsBuild` (A7보다 먼저 지으면 빈 함수로 두고 A7에서 채운다)
- Produces:
  - `type LetterEdit = { grades: number[]; classes: string | null; eventDate: string | null; eventEnd: string | null; bring: string[]; due: string | null; summary: string }`
  - `checkLetterEdit(e: LetterEdit): string | null`: 맞으면 null, 아니면 선생님께 보일 말.
    - grades는 1~3, 1개 이상
    - 날짜는 `isYmd`
    - eventEnd ≥ eventDate
    - summary는 1~300자
    - bring은 30자 × 10개까지
    - summary·bring·classes에 `privacyIssues`가 있으면 「개인정보로 보이는 내용이 있습니다: …」
  - 서버 액션. 모두 `requireNewsEditor()`로 시작하고, 끝에 `revalidatePath("/news")`와 `requestNewsBuild()`를 부른다(올리기·고치기·내리기만, 올리지 않기는 빌드 없음).
    - `publishLetter(id: string, e: LetterEdit): Promise<{ ok: true } | { error: string }>`: status `draft`→`published`. `published_at`·`decided_by`를 채운다. `.eq("status","draft")`로 원자적으로 바꾸고, 두 번 눌러도 한 번이다.
    - `updateLetter(id: string, e: LetterEdit)`: published인 것만 고친다.
    - `skipLetter(id: string)`: draft → skipped.
    - `unpublishLetter(id: string)`: published → skipped.
  - 화면 `/news`
    - 위에서부터 「확인 기다리는 가정통신문 N」, 그다음 카드들(초안 칸을 고칠 수 있는 꼴), 「올린 가정통신문」(최근 30일, 고치기·내리기), 「학사일정 공개」(A6) 순서다.
    - `read_ok=false` 카드에는 「한글 파일을 읽지 못했습니다. 홈페이지에서 보고 채워 주세요.」와 원문 링크를 보인다.
    - 단추 글은 「알림장에 올리기」·「올리지 않기」·「고치기」·「알림장에서 내리기」. 결과 알림은 「알림장에 올렸습니다. 1~2분 뒤 알림장에 보입니다.」

- [ ] **Step 1: 실패하는 테스트 쓰기**

`tests/unit/news-letter-edit.test.ts`:
- 정상 값은 null이다.
- grades `[]` → 오류.
- eventEnd < eventDate → 오류.
- summary에 「담임 010-1234-5678」 → 「개인정보로 보이는 내용이 있습니다」로 시작하는 말.
- summary 301자 → 오류.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/news-letter-edit.test.ts`
Expected: FAIL

- [ ] **Step 3: `letter-edit.ts`·액션·화면·메뉴 구현**

카드의 두 번 누름 막기는 `LostCard`처럼 `busy` 상태와 비활성 단추로 한다.

- [ ] **Step 4: 통과 확인**

Run: `npm test && npx tsc --noEmit && npx eslint app/\(main\)/news lib/news`
Expected: PASS. 그다음 dev 서버에서 A4로 만든 초안을 올리고 내려 본다.

- [ ] **Step 5: Commit**

```bash
git add app/\(main\)/news lib/news/letter-edit.ts lib/modules.ts tests/unit
git commit -m "알림장: 가정통신문 확인 카드 화면(올리기·고치기·내리기)"
```

### Task A6: 학사일정 「알림장 공개」 고르기

**Files:**
- Create: `app/(main)/news/EventPicker.tsx` ("use client")
- Modify: `app/(main)/news/actions.ts` (`setEventsPublic`), `app/(main)/news/page.tsx` (「학사일정 공개」 칸)
- Test: `tests/unit/news-events-public.test.ts`

**Interfaces:**
- Consumes: A3 `requireNewsEditor`·`events.news_public`, `isDayOffEvent`, A7 `requestNewsBuild`
- Produces:
  - `setEventsPublic(ids: string[], on: boolean): Promise<{ ok: true; changed: number } | { error: string }>`
    - `requireNewsEditor()`로 시작한다. ids는 uuid만, 200개까지 받는다.
    - 시크릿 키로 `news_public`만 update한다.
    - 바뀐 것이 있으면 `requestNewsBuild()`를 **한 번** 부른다.
  - 화면
    - 오늘 −7일 ~ +180일 일정을 날짜순으로 보인다. 쉬는 날(`isDayOffEvent`)은 「쉬는 날 · 저절로 나감」으로 표시하고 체크 칸을 두지 않는다.
    - 줄마다 체크 칸을 둔다.
    - 위에 「고른 N개 공개」·「고른 N개 숨기기」 단추를 둔다.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`tests/unit/news-events-public.test.ts`: 세션·admin 클라이언트·빌드 훅을 목으로 둔다.
- uuid가 아닌 id가 섞이면 오류이고 update하지 않는다.
- 201개 → 오류.
- 정상 3개 → update가 `{ news_public: true }`로 한 번 불리고 `requestNewsBuild`도 한 번 불린다.
- 담당이 아니면 redirect.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/news-events-public.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(main\)/news tests/unit/news-events-public.test.ts
git commit -m "알림장: 학사일정 공개 고르기"
```

### Task A7: 공개 피드 `/api/news/feed` · 빌드 훅 · 매일 다시 빌드

**Files:**
- Create:
  - `lib/news/feed.ts` (순수 `buildFeed`와 피드 타입)
  - `lib/news/feed-read.ts` (server-only — DB·급식 읽기)
  - `lib/news/build-hook.ts` (server-only)
  - `app/api/news/feed/route.ts`
  - `app/api/cron/news-build/route.ts`
- Modify: `vercel.json` (`/api/cron/news-build` `0 20 * * *`), `lib/preview.ts` (`NEWS_FEED_ON = true`)
- Test: `tests/unit/news-feed.test.ts`, `tests/unit/news-feed-route.test.ts`

**Interfaces:**
- Consumes: A3 표, `isDayOffEvent`, `gradesFromTitle`, `mealsForWeek`·`mondayOf` (`lib/meals`), `seoulYmd`·`addDaysYmd`
- Produces (피드 꼴 — Part B가 그대로 받는다):
  ```ts
  type FeedLetter = { id: string; number: string | null; subject: string; grades: number[]; classes: string | null;
    eventDate: string | null; eventEnd: string | null; bring: string[]; due: string | null; summary: string;
    attachments: string[]; sourceUrl: string; postedOn: string; publishedOn: string };
  type FeedEvent = { title: string; start: string; end: string; grades: number[] };   // 날짜는 모두 YYYY-MM-DD(서울), end는 끝나는 날 포함
  type FeedDayOff = { title: string; start: string; end: string };
  type FeedMeal = { ymd: string; dishes: { name: string; allergens: number[] }[] };
  type Feed = { version: 1; generatedAt: string; letters: FeedLetter[]; events: FeedEvent[]; daysOff: FeedDayOff[]; meals: FeedMeal[] };
  ```
  - `buildFeed(x: { today: string; letters: LetterRow[]; events: EventRow[]; meals: MealOfDay[] }): Feed` (순수)
    - letters: status `published`이고 `published_at`이 120일 안인 것만, `publishedOn` 내림차순.
    - events: `news_public && !isDayOffEvent`이고 오늘 −30일 ~ +365일 안인 것. grades는 `gradesFromTitle(title)`.
    - daysOff: `isDayOffEvent`인 것은 `news_public`과 상관없이 같은 기간. 제목·날짜만 담는다.
    - meals: 받은 그대로 ymd·요리 이름·알레르기 번호만.
    - 종일 일정 end는 `ends_at`에서 하루 뺀 날, 시각 일정은 `seoulYmd(ends_at)`.
  - `readFeed(): Promise<Feed>`: 이번 주와 다음 주 급식(`mealsForWeek` 두 번, 실패하면 `[]`).
  - 라우트 `GET /api/news/feed`
    - `NEWS_FEED_ON`이 false면 404.
    - 성공하면 200과 `Cache-Control: public, max-age=60, s-maxage=60`. 실패하면 500과 `no-store`.
    - CORS 헤더는 없다(빌드 서버가 읽는다).
    - proxy matcher의 `api/news`로 이미 로그인 밖이다.
  - `requestNewsBuild(): Promise<void>`: `process.env.NEWS_DEPLOY_HOOK_URL`이 없으면 아무것도 안 한다. 있으면 `POST` 한 번(8초 제한). 실패는 로그만 남기고 던지지 않는다.
  - 크론 `news-build`: `cronRoute("news-build", async () => { await requestNewsBuild(); return { ok: true }; })`, `0 20 * * *`(서울 5시).

- [ ] **Step 1: 실패하는 테스트 쓰기**

`tests/unit/news-feed.test.ts`:
- **`buildFeed only includes published letters and public events`:** letters는 draft·skipped·published(10일 전)·published(200일 전) 각 1개, events는 공개·비공개·공개인데 범위 밖 각 1개 → letters 1개, events 1개.
- **`days off go out without the public check`:**
  - 「재량휴업일」(종일, news_public false) → daysOff에 들어가고 events에는 없다.
  - 「겨울방학」 12-31 ~ 다음 해 3-01 종일 → `{ start: "2026-12-31", end: "2027-02-28" }`처럼 끝나는 날을 포함한다.
- **`event grades come from title`:** 「(3학년) 기말고사」 → grades [3].
- **`feed carries no teacher names`:** LetterRow에 `decided_by`가 있어도 결과 JSON 문자열에 그 uuid가 없다.

`tests/unit/news-feed-route.test.ts`: `readFeed`를 목으로 둔다.
- 200과 캐시 헤더.
- 던지면 500과 no-store.
- `NEWS_FEED_ON=false`(doMock) → 404, readFeed를 부르지 않는다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/unit/news-feed.test.ts tests/unit/news-feed-route.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현** (A5·A6에서 빈 함수로 둔 `requestNewsBuild`를 여기서 채운다)

- [ ] **Step 4: 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. dev 서버에서 `curl localhost:3000/api/news/feed | head -c 400`에 `"version":1`이 보이는지 확인한다.

- [ ] **Step 5: 문서와 Commit**

- `docs/features.md` 끝에 `## 알림장(공개, mjms-news)` 절을 더한다. 2026-10-22 이승열 P 결정을 담는다: 홈페이지 가정통신문만, 확인 카드, 담당 목록, 공개 체크, 쉬는 날 자동, 급식, 빌드 때 받기, 배포 훅, 크론 시간.
- `CLAUDE.md` 규칙에 한 줄을 더한다: 「알림장 피드(`/api/news/feed`)에는 올린 가정통신문·공개 체크한 학사일정·쉬는 날 이름·급식만. 초안·선생님 이름·특징 칸을 싣지 않는다(`lib/news/feed.ts` `buildFeed`). 홈페이지는 `lib/news/homepage.ts` 고정 주소로만 읽는다.」

```bash
git add lib/news app/api/news/feed app/api/cron/news-build vercel.json lib/preview.ts tests/unit docs/features.md CLAUDE.md
git commit -m "알림장: 공개 피드, 배포 훅, 매일 아침 다시 빌드"
```

- [ ] **Step 6: PR**

`gh pr create`로 PR을 만든다. 본문에는 마이그레이션 SQL을 적용해야 한다는 것과 환경변수 `NEWS_DEPLOY_HOOK_URL`(Task B5에서 받음)을 적는다. 합치기는 이승열 P가 한다.

---

## Part B — 알림장 (`mjms-news`)

### Task B1: 피드 받기

**Files:**
- Create: `src/lib/feed.ts`, `test/fixtures/feed.json`
- Test: `test/feed.test.mjs`

**Interfaces:**
- Consumes: A7 피드 꼴 (`Feed` 등 타입을 `src/lib/feed.ts`에 같은 이름으로 옮겨 적는다)
- Produces:
  - `loadFeed(source?: { url?: string; file?: string; fetcher?: typeof fetch }): Promise<Feed>`
    - `file`이 있으면 그 JSON을 읽는다. 없으면 `url`(기본 `process.env.NEWS_FEED_URL ?? "https://mjms-office.vercel.app/api/news/feed"`)을 받는다.
    - 200이 아니거나 `version !== 1`이거나 배열 칸이 아니면 **던진다**.
    - 칸마다 꼴을 확인하고, 이상한 항목은 뺀다(날짜 `YYYY-MM-DD`, grades 1~3).
  - `getFeed(): Promise<Feed>`: 빌드 한 번에 한 번만 받는다(모듈 캐시). 환경변수 `NEWS_FEED_FILE`이 있으면 파일을 읽는다(개발·시험용).
  - `test/fixtures/feed.json`: 화면 시험용. 가정통신문 3개(그중 하나는 bring·due 있음), 공개 일정 3개, 쉬는 날 2개(하나는 여러 날), 급식 5일.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`test/feed.test.mjs`:
- `loadFeed reads the fixture`: letters 3개.
- **`loadFeed throws on non-200 and on bad shape`:** fetcher가 500 → reject. `{ version: 2 }` → reject. `{ version: 1, letters: "x" }` → reject.
- `loadFeed drops malformed items`: letters에 `grades: [5]`인 항목은 빠지고 나머지는 남는다.

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL (feed.test.mjs)

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/feed.ts test/feed.test.mjs test/fixtures/feed.json
git commit -m "Load the AI 교무실 feed at build time"
```

### Task B2: 칠판 셈을 피드에 맞추기 (쉬는 날 · 가정통신문 날짜 · 급식)

**Files:**
- Modify: `src/lib/dates.ts`, `src/lib/board.ts`
- Test: `test/dates.test.mjs`, `test/board.test.mjs`

**Interfaces:**
- Consumes: B1 `Feed`
- Produces:
  - `nextSchoolDay(iso: string, daysOff?: { start: string; end: string }[]): string`: 주말과 daysOff 안의 날을 건너뛴다.
  - `isDayOff(iso: string, daysOff: { start: string; end: string }[]): boolean`
  - `boardFromFeed(today: string, feed: Feed): Board`. 지금의 `buildBoard`를 대신한다.
    - `Board`에 `meal: { ymd: string; dishes: string[] } | null`(오늘 급식)과 `dayOff: string | null`(오늘이 쉬는 날이면 그 이름)을 더한다.
    - 오늘 일정 = 공개 일정 중 오늘이 걸친 것 + 가정통신문의 eventDate~eventEnd에 오늘이 걸친 것(제목은 `subject`).
    - 챙길 것 = `due`가 오늘인 가정통신문의 bring.
    - 다음 등교일 준비물 = `due`가 `nextSchoolDay(today, daysOff)`인 것.
    - 새 알림 = `publishedOn`이 오늘인 것.
  - `boardHTML(board: Board, base: string): string`
    - 오늘이 쉬는 날이면 첫 칸 위에 「오늘은 {이름}입니다」 한 줄.
    - 급식은 칠판에 넣지 않는다(B4).

- [ ] **Step 1: 실패하는 테스트 쓰기**

- `test/dates.test.mjs`:
  - `nextSchoolDay("2026-11-18", [{ start: "2026-11-19", end: "2026-11-19" }])` → `"2026-11-20"`.
  - 금요일 + 다음 월요일 휴일 → 화요일.
  - 방학 범위 `2026-12-31`~`2027-02-28`에서 `nextSchoolDay("2026-12-30", …)` → `"2027-03-02"`(3/1 월요일 삼일절도 daysOff에 넣은 경우).
- `test/board.test.mjs`: 기존 `buildBoard` 테스트를 `boardFromFeed`로 옮긴다. 더할 경우는 다음과 같다.
  - 월요일 공휴일 전 금요일에 화요일 due 준비물이 「다음 등교일」에 나온다.
  - 가정통신문 eventDate가 오늘이면 「오늘 일정」에 subject가 나온다.
  - 오늘이 쉬는 날이면 HTML에 「오늘은 재량휴업일입니다」.

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 구현**

`Chalkboard.astro`의 브라우저 다시 그리기도 같은 `boardFromFeed`를 쓴다. 칠판 JSON에는 `feed`에서 letters·events·daysOff만 싣는다.

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib test
git commit -m "Board reads the feed: days off, letter dates, next school day"
```

### Task B3: 화면을 피드로 바꾸고 Markdown 입력 걷어내기

**Files:**
- Modify:
  - `src/pages/index.astro`, `src/pages/notices/index.astro`, `src/pages/notices/[slug].astro` → `src/pages/notices/[id].astro`로 이름 바꿈
  - `src/pages/schedule.astro`, `src/components/NoticeRow.astro`, `src/components/EventRow.astro`, `src/components/Chalkboard.astro`
  - `src/lib/content.ts`(피드 기반으로 바꾸거나 지움), `src/pages/about.astro`, `README.md`, `package.json`(`build`에서 개인정보 검사를 뺌)
- Delete:
  - `src/content.config.ts`, `src/content/`, `src/data/schedule.yaml`
  - `scripts/check-privacy.mjs`, `test/privacy.test.mjs` (규칙은 A1 `lib/news/privacy.ts`로 옮겨 갔다)
  - `docs/알림-올리는-법.md`
- Test: `test/pages.test.mjs`(빌드 결과 HTML 확인)

**Interfaces:**
- Consumes: B1 `getFeed`, B2 `boardFromFeed`·`isDayOff`
- Produces (화면):
  - **알림 목록:** 월별, 줄마다 호수·subject·대상(학년 점 + `classes`가 있으면 「1학년 5반」)·「준비물 있음」.
  - **알림 보기 `/notices/<id>/`:**
    - subject, 올린 날
    - 대상, 관련 날짜(있으면)
    - 준비물 칠판 상자(있으면 「{due} 준비물」)
    - 요약(문단), 「함께 온 파일: 식단표.xlsx」(있으면)
    - 「홈페이지에서 원문 보기 ({number})」 → `sourceUrl`, 새 창
  - **학사일정:** 공개 일정과 쉬는 날을 섞어 날짜순으로, 쉬는 날 줄에는 「쉬는 날」 표시.
  - **이용 안내:** 「알림은 학교 홈페이지 가정통신문을 학교가 확인해 옮긴 요약입니다. 정확한 내용은 원문을 봐 주세요.」 문단을 더한다.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`test/pages.test.mjs`: `NEWS_FEED_FILE=test/fixtures/feed.json npm run build`를 `execFileSync`로 돌린 뒤 `dist/`를 읽는다.
- `dist/notices/<fixture 첫 id>/index.html`에 「홈페이지에서 원문 보기」와 `sourceUrl`이 있다.
- `dist/schedule/index.html`에 fixture 쉬는 날 이름과 「쉬는 날」이 있다.
- `dist/index.html`에 `src/content` 시절의 예시 제목(「학년별 체육대회」)이 없다.

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 구현과 걷어내기**

- [ ] **Step 4: 통과 확인**

Run: `npm test && npx astro check < /dev/null`
Expected: 모두 PASS, `0 errors`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Pages read the feed; remove Markdown notices and the teacher guide"
```

### Task B4: 오늘 급식

**Files:**
- Create: `src/components/MealCard.astro`
- Modify: `src/pages/index.astro` (분실물 띠 다음 칸), `src/styles/global.css`
- Test: `test/pages.test.mjs`에 한 경우 더함

**Interfaces:**
- Consumes: B2 `Board.meal`, B1 `Feed.meals`
- Produces:
  - 첫 화면 「오늘 급식」 칸: 요리 이름을 「·」 없이 쉼표로 한 줄에, 알레르기 번호는 숨겼다가 「알레르기 정보」를 누르면 펼친다(`<details>`).
  - 급식이 없는 날(주말·쉬는 날)은 「다음 등교일 급식」으로 `nextSchoolDay`의 식단을 보인다. 그것도 없으면 칸을 그리지 않는다.
  - 브라우저에서 날짜가 바뀌면(칠판처럼) 같은 셈으로 다시 그린다.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`test/pages.test.mjs`: fixture 빌드의 `dist/index.html`에 「급식」 칸과 fixture 첫 요리 이름이 있다.

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인 + 휴대폰 화면 확인**

Run: `npm test`
Expected: PASS. 그다음 Playwright로 iPhone 13 크기 첫 화면을 찍어, 분필받침이 첫 화면에서 밀려나지 않았는지 본다.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "Today's lunch on the home page"
```

### Task B5: 베르셀로 옮기기 · 옛 주소 넘기기 · 분실물 출처 바꾸기

**Files:**
- Create: `redirect/index.html`, `redirect/404.html` (옛 GitHub Pages용)
- Modify:
  - `.github/workflows/deploy.yml`: 빌드 대신 `redirect/`만 올린다. schedule을 지운다.
  - `astro.config.mjs`: `site` 기본값 `https://mjms-news.vercel.app`
  - `src/site.config.ts`: 주석만
  - `README.md`: 배포 절
- Modify (mjms-office, 새 브랜치 `feat/news-origin`): `app/api/news/lost/route.ts` `NEWS_ORIGIN = "https://mjms-news.vercel.app"`, `tests/unit/news-lost-route.test.ts` 기대값, `docs/features.md` 주소
- Test: 위 테스트, 실제 주소 확인

**Interfaces:**
- Consumes: A7 피드·`NEWS_DEPLOY_HOOK_URL`
- Produces: 운영 주소 `https://mjms-news.vercel.app`

- [ ] **Step 1: (이승열 P) 베르셀 프로젝트 만들기**

사람이 하는 단계다. 아래를 안내하고 끝날 때까지 기다린다.
1. vercel.com → Add New → Project → GitHub `cleveranawim-source/mjms-news`를 Import한다.
2. Project Name을 `mjms-news`로 하고, Framework는 Astro(자동)로 둔다.
3. Environment Variables에 `SITE_URL=https://mjms-news.vercel.app`를 넣고 Deploy한다.
4. Settings → Git → Deploy Hooks에서 이름 `ai-office`, 브랜치 `main`으로 훅을 만들고, 나온 주소를 복사한다.
5. mjms-office 베르셀 프로젝트 → Settings → Environment Variables에 `NEWS_DEPLOY_HOOK_URL=<복사한 주소>`를 넣고(Production) 다시 배포한다.

Expected: `curl -s -o /dev/null -w "%{http_code}" https://mjms-news.vercel.app/` → `200`

- [ ] **Step 2: 옛 주소 넘기기 페이지와 워크플로**

`redirect/index.html`과 `redirect/404.html`이 할 일:
- `<meta http-equiv="refresh" content="0; url=https://mjms-news.vercel.app/">`와 `<link rel="canonical">`
- 한 줄 안내 「알림장 주소가 바뀌었습니다: mjms-news.vercel.app」
- 404에서는 지금 경로를 새 주소 뒤에 붙여 넘기는 짧은 스크립트(`/mjms-news/` 앞머리를 떼고)

- [ ] **Step 3: 분실물 출처 바꾸기 (mjms-office)**

Run (mjms-office):
```bash
npx vitest run tests/unit/news-lost-route.test.ts
```
기대값을 새 주소로 바꾼 뒤 FAIL을 확인하고, `NEWS_ORIGIN`을 바꾼 다음 PASS를 확인한다. 그다음 PR을 만든다. 합치기는 이승열 P가 한다.

- [ ] **Step 4: 실제 확인 (합친 뒤)**

Playwright(iPhone 13)로 `https://mjms-news.vercel.app/`를 열어 다음을 확인한다.
- 분실물 띠가 보인다(새 출처 CORS).
- 알림 목록이 피드와 같은 수다.
- `https://cleveranawim-source.github.io/mjms-news/notices/`를 열면 새 주소로 넘어간다.
- AI 교무실 `/news`에서 초안 하나를 올린 뒤 2분 안에 알림장에 보인다(배포 훅).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Move to Vercel (mjms-news.vercel.app); old Pages address redirects"
git push origin main
```

---

## 실행 순서

A1 → A2 → A3 → A4 → A5 → A6 → A7(PR 합침, 마이그레이션 적용) → B1 → B2 → B3 → B4 → B5.

B1~B4는 A7의 피드 꼴만 있으면 fixture로 먼저 지을 수 있다. 실제 피드로 빌드하는 것은 A7이 운영에 올라간 뒤다.
