# 명지중학교 알림장

학부모와 학생이 로그인 없이 학교의 공개 알림, 준비물, 학사일정을 확인하는 정적 웹사이트입니다.

- 로그인, 회원가입, 댓글, 방문 통계, 외부 글꼴 요청이 없습니다. 방문자에게서 받는 정보가 없습니다.
- 알림, 학사일정, 쉬는 날, 급식은 학교 홈페이지 가정통신문과 공개 일정을 AI 교무실이 확인해 내주는 피드(`/api/news/feed`)에서 빌드할 때 받아 옵니다. 개인정보 걸러 내기는 AI 교무실 쪽에서 합니다. 피드를 못 받으면 빌드가 실패합니다.
- 분실물함은 AI 교무실(mjms-office)의 `/api/news/lost`에서 보관 중인 물건을 받아 첫 화면 분실물 안내판과 `/lost/` 페이지에 띄웁니다. 주소는 `src/site.config.ts`의 `lostFoundApi`, 빈 값이면 분실물함이 사라집니다. AI 교무실 쪽은 `lib/preview.ts` `LOST_FOUND_ON_NEWS`로 끕니다. 물 위에 뜬 움직임(`src/lib/water.ts`)은 AI 교무실 것을 그대로 옮겼습니다.
- 급식은 같은 피드에서 받아 첫 화면 급식 안내판에 보여 줍니다. 학급 시간표(`/timetable/`)는 브라우저가 AI 교무실의 `/api/news/timetable`에서 전교 시간표를 받아 고른 반만 걸러 보여 주며, 오늘 바뀐 수업은 첫 화면 칠판에도 올라옵니다. 고른 반은 이 기기에만 저장됩니다. 주소는 `src/site.config.ts`의 `timetableApi`(빈 값이면 시간표가 사라짐)입니다.
- 첫 화면 칠판은 브라우저가 한국 시간 기준 '오늘'을 계산해 그날 일정과 준비물을 보여 줍니다. 주말·쉬는 날에는 다음 등교일의 바뀐 수업과 몇 교시까지인지를 보여 주고, 귀퉁이에 가까운 시험·방학·행사의 D-day를 적습니다.
- 가정통신문 「새 글」은 2주 안에 올라왔고 이 기기에서 아직 열지 않은 글입니다. 연 글 id는 이 기기 브라우저(`mjms-read`)에만 저장됩니다.
- 학사일정(`/schedule/` 달력, 첫 화면 다가오는 일정)은 나이스 공개 학사일정을 AI 교무실 피드의 `schedule` 칸으로 받아 씁니다. 그 칸이 없으면 일정 화면에 「학사일정을 불러오지 못했어요」가 뜨고 빌드는 그대로 됩니다.
- 글꼴은 Pretendard(본문 전부)와 Gaegu 700(첫 화면 칠판 날짜만) 두 가지이고, 둘 다 npm 패키지로 담아 이 사이트가 직접 보냅니다(외부 글꼴 요청 없음).

## 개발

```sh
npm install
npm run dev      # http://localhost:4321
npm test         # 날짜·칠판·피드·화면 테스트
npm run build    # 피드를 받아 dist/ 생성

# 네트워크 없이 예시 피드로 만들기
NEWS_FEED_FILE=test/fixtures/feed.json npm run build
```

환경 변수:

- `NEWS_FEED_URL`: 피드 주소(기본은 AI 교무실의 `/api/news/feed`).
- `NEWS_FEED_FILE`: 주소 대신 읽을 피드 파일.
- `NEWS_TODAY`: 빌드가 '오늘'로 삼을 날짜(`YYYY-MM-DD`). 테스트에서 날짜를 고정할 때 씁니다.

`src/site.config.ts`의 `lostFoundApi`(분실물함), `timetableApi`(학급 시간표) 주소는 코드에서 바꿉니다.

## 배포 (Vercel)

1. Vercel 프로젝트 `mjms-news`(주소 https://mjms-news.vercel.app)가 이 저장소의 `main`을 받아 올립니다. `main`에 올리면 곧바로 다시 배포됩니다.
2. 환경 변수 `SITE_URL=https://mjms-news.vercel.app`을 넣어 둡니다.
3. AI 교무실이 새 알림을 올리면 Vercel의 배포 훅(`NEWS_DEPLOY_HOOK_URL`)으로 사이트를 다시 만들고, 매일 아침 5시에도 다시 만듭니다.
4. 옛 GitHub Pages 주소(`cleveranawim-source.github.io/mjms-news`)는 `redirect/` 페이지가 새 주소로 넘겨 줍니다. `.github/workflows/deploy.yml`은 이 `redirect/`만 올립니다.

## 구성

| 위치 | 내용 |
|---|---|
| `src/lib/feed.ts` | AI 교무실 피드 받기 (`NEWS_FEED_FILE`로 파일 대신 지정 가능) |
| `src/lib/content.ts` | 피드에서 알림·학사일정 고르기 |
| `test/fixtures/feed.json` | 테스트용 예시 피드 |
| `src/site.config.ts` | 학교 이름, 대표전화, 홈페이지 주소 |
| `src/lib/board.ts` | 칠판에 올릴 내용 고르기 |
| `src/lib/lost.ts`, `src/pages/lost.astro` | 분실물함 |
| `src/lib/read.ts` | 이 기기에서 연 가정통신문(「새 글」·「안 읽은 글 N」) |
