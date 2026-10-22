# 명지중학교 알림장

학부모와 학생이 로그인 없이 학교의 공개 알림, 준비물, 학사일정을 확인하는 정적 웹사이트입니다.

- 로그인, 회원가입, 댓글, 방문 통계, 외부 글꼴 요청이 없습니다. 방문자에게서 받는 정보가 없습니다.
- 알림, 학사일정, 쉬는 날, 급식은 학교 홈페이지 가정통신문과 공개 일정을 AI 교무실이 확인해 내주는 피드(`/api/news/feed`)에서 빌드할 때 받아 옵니다. 개인정보 걸러 내기는 AI 교무실 쪽에서 합니다. 피드를 못 받으면 빌드가 실패합니다.
- 분실물함은 AI 교무실(mjms-office)의 `/api/news/lost`에서 보관 중인 물건을 받아 첫 화면 띠와 `/lost/` 페이지에 띄웁니다. 주소는 `src/site.config.ts`의 `lostFoundApi`, 빈 값이면 분실물함이 사라집니다. AI 교무실 쪽은 `lib/preview.ts` `LOST_FOUND_ON_NEWS`로 끕니다. 물 위에 뜬 움직임(`src/lib/water.ts`)은 AI 교무실 것을 그대로 옮겼습니다.
- 첫 화면 칠판은 브라우저가 한국 시간 기준 '오늘'을 계산해 그날 일정과 준비물을 보여 줍니다.

## 개발

```sh
npm install
npm run dev      # http://localhost:4321
npm test         # 날짜·칠판·피드·화면 테스트
npm run build    # 피드를 받아 dist/ 생성

# 네트워크 없이 예시 피드로 만들기
NEWS_FEED_FILE=test/fixtures/feed.json npm run build
```

## 배포 (GitHub Pages)

1. GitHub에 저장소를 만들고 이 코드를 `main`에 올립니다.
2. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꿉니다.
3. `main`에 올릴 때마다, 그리고 매일 아침 5시에 `.github/workflows/deploy.yml`이 사이트를 다시 만듭니다.

## 구성

| 위치 | 내용 |
|---|---|
| `src/lib/feed.ts` | AI 교무실 피드 받기 (`NEWS_FEED_FILE`로 파일 대신 지정 가능) |
| `src/lib/content.ts` | 피드에서 알림·학사일정 고르기 |
| `test/fixtures/feed.json` | 테스트용 예시 피드 |
| `src/site.config.ts` | 학교 이름, 대표전화, 홈페이지 주소 |
| `src/lib/board.ts` | 칠판에 올릴 내용 고르기 |
| `src/lib/lost.ts`, `src/pages/lost.astro` | 분실물함 |
