# 명지중학교 알림장

학부모와 학생이 로그인 없이 학교의 공개 알림, 준비물, 학사일정을 확인하는 정적 웹사이트입니다.

- 로그인, 회원가입, 댓글, 방문 통계, 외부 글꼴 요청이 없습니다. 방문자에게서 받는 정보가 없습니다.
- 알림은 Markdown 파일로 씁니다. 개인정보로 보이는 내용(휴대폰 번호, 주민등록번호, 학번, 학년·반·번호, 개인 이메일)이 있으면 빌드가 멈춥니다.
- 분실물함은 AI 교무실(mjms-office)의 `/api/news/lost`에서 보관 중인 물건을 받아 첫 화면 띠와 `/lost/` 페이지에 띄웁니다. 주소는 `src/site.config.ts`의 `lostFoundApi`, 빈 값이면 분실물함이 사라집니다. AI 교무실 쪽은 `lib/preview.ts` `LOST_FOUND_ON_NEWS`로 끕니다. 물 위에 뜬 움직임(`src/lib/water.ts`)은 AI 교무실 것을 그대로 옮겼습니다.
- 첫 화면 칠판은 브라우저가 한국 시간 기준 '오늘'을 계산해 그날 일정과 준비물을 보여 줍니다.

선생님이 알림을 올리는 방법은 [docs/알림-올리는-법.md](docs/알림-올리는-법.md)에 있습니다.

## 개발

```sh
npm install
npm run dev      # http://localhost:4321
npm test         # 날짜·칠판·개인정보 검사 테스트
npm run build    # 개인정보 검사 후 dist/ 생성
```

## 배포 (GitHub Pages)

1. GitHub에 저장소를 만들고 이 코드를 `main`에 올립니다.
2. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꿉니다.
3. `main`에 올릴 때마다, 그리고 매일 아침 5시에 `.github/workflows/deploy.yml`이 사이트를 다시 만듭니다.

## 구성

| 위치 | 내용 |
|---|---|
| `src/content/notices/` | 알림 (Markdown) |
| `src/data/schedule.yaml` | 학사일정 |
| `src/site.config.ts` | 학교 이름, 대표전화, 홈페이지 주소 |
| `scripts/check-privacy.mjs` | 개인정보 검사 |
| `src/lib/board.ts` | 칠판에 올릴 내용 고르기 |
| `src/lib/lost.ts`, `src/pages/lost.astro` | 분실물함 |

`src/content/notices/`와 `src/data/schedule.yaml`에 들어 있는 알림과 일정은 화면을 보여 주기 위한 예시입니다. 실제 운영 전에 지우고 학교 내용으로 바꿔 주세요.
