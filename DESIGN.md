---
name: 명지중학교 알림장
description: 교실 명패와 교내 안내판으로 '오늘 우리 반'을 알리는 공개 알림장
colors:
  navy: "#033e7b"
  navy-2: "#0a4f97"
  sky: "#037dc4"
  sky-ink: "#036fae"
  red: "#c62828"
  board: "#26443a"
  chalk: "#eef1ea"
  chalk-dim: "#b9c6bd"
  chalk-yellow: "#f1d65a"
  chalk-orange: "#f7b26b"
  g1: "#f5dc6b"
  g1-ink: "#3a3000"
  g2: "#f5a9c2"
  g2-ink: "#4a1022"
  g3: "#8fd3f2"
  g3-ink: "#0b3550"
  g-all: "#e8eef6"
  g-all-ink: "#033e7b"
  wall: "#f3f6fa"
  paper: "#ffffff"
  ink: "#1b1f24"
  ink-soft: "#33404d"
  muted: "#5b6b78"
  rule: "#d5e0ea"
  faint: "#c3ccd6"
  select: "#cddcee"
typography:
  chalk-date:
    fontFamily: "Gaegu, Pretendard Variable, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1
  plate-title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 800
    lineHeight: 1.4
  meta:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  badge: "4px"
  control: "10px"
  panel: "12px"
  sheet: "18px"
  pill: "999px"
spacing:
  stack: "10px"
  gutter: "14px"
  panel-x: "14px"
  panel-y: "12px"
  tab-h: "56px"
  wide: "40rem"
components:
  plate:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "12px 14px"
  plate-button:
    backgroundColor: "rgb(255 255 255 / 0.16)"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  plate-button-empty:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    height: "36px"
  board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.panel}"
    padding: "14px 16px"
  sign:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "12px 14px"
  doc-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "12px 14px"
  badge-g1:
    backgroundColor: "{colors.g1}"
    textColor: "{colors.g1-ink}"
    rounded: "{rounded.badge}"
    height: "20px"
    padding: "0 6px"
  badge-g2:
    backgroundColor: "{colors.g2}"
    textColor: "{colors.g2-ink}"
    rounded: "{rounded.badge}"
    height: "20px"
  badge-g3:
    backgroundColor: "{colors.g3}"
    textColor: "{colors.g3-ink}"
    rounded: "{rounded.badge}"
    height: "20px"
  badge-all:
    backgroundColor: "{colors.g-all}"
    textColor: "{colors.g-all-ink}"
    rounded: "{rounded.badge}"
    height: "20px"
  badge-new:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.badge}"
    height: "20px"
  badge-off:
    textColor: "{colors.red}"
    typography: "{typography.label}"
  pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  pill-pressed:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "36px"
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    height: "52px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "10px 16px 18px"
  sheet-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
  sheet-cell-pressed:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "48px"
  tabbar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    height: "56px"
  tabbar-current:
    textColor: "{colors.navy}"
  calendar-day:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
  calendar-day-selected:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "44px"
---

# Design System: 명지중학교 알림장

## Overview

**Creative North Star: "교실 명패와 복도 안내판"**

모든 화면은 교실 문 위 남색 학급 명패로 시작한다. 명패가 그 화면의 제목(h1)이고, 그 아래 정보는 복도 벽(연한 바탕)에 붙은 흰 안내판처럼 굵은 남색 제목과 짧은 줄로 알린다. 학교다운 느낌은 교표 남색, 명패, 안내판의 왼쪽 띠에서 오고, 장식에서 오지 않는다.

교실 칠판은 첫 화면 '오늘' 칸 하나에만 남는다. 칠판은 평평한 짙은 초록 판일 뿐이고, 손글씨 글꼴은 그 칸의 날짜 한 곳에만 쓴다. 나머지 정보는 모두 Pretendard로 읽힌다. 화면은 휴대폰 한 손 보기를 기준으로 한 단(최대 40rem)이고, 넓은 화면에서도 그 한 단이 가운데에 선다.

**Key Characteristics:**
- 명패(남색 판) → 칠판 오늘 칸(첫 화면만) → 흰 안내판들 → 아래 고정 탭 다섯 개.
- 평면: 그림자·질감·광택 없음. 깊이는 판 색 차이와 1px 괘선으로만.
- 학년 색은 작은 배지에만, 늘 글자와 함께.
- 글자 크기는 정해진 사다리 7단(12·13·15·17·20·22·30px)만.

## Colors

교표 남색 한 가지가 목소리를 내고, 나머지는 복도 벽·흰 판·잉크의 조용한 무채색이며, 칠판 초록은 첫 화면 한 칸에만 있다.

### Primary
- **교표 남색** (navy): 명패 판, 안내판 왼쪽 띠, 안내판 제목, 고른 상태(알약·반 칸·달력 날짜·이번 주 단추), 시간표의 바뀐 과목, 오늘 탭. 교표 색 그대로다.
- **명패 안 테두리 남색** (navy-2): 명패 안쪽 3px 테두리에만.
- **교표 하늘색** (sky): 초점 테두리(3px)에만.
- **하늘색 글자** (sky-ink): 토요일 글자, 시간표의 창체 표시. 흰 바탕 5.4:1.

### Secondary
- **쉬는 날 빨강** (red): 「쉬는 날」「공휴일」 글자, 일요일·쉬는 날 날짜와 점, 「새 글」 배지 바탕. 경고나 오류 색으로 쓰지 않는다.

### Tertiary
- **칠판 초록** (board) 위에 **분필** (chalk), **흐린 분필** (chalk-dim, 요일·원래 과목·보조 글), **분필 노랑** (chalk-yellow, 「오늘 바뀐 수업」 소제목·귀퉁이 D-day 숫자·칠판 안 초점), **분필 주황** (chalk-orange, 「챙길 것」 소제목). 이 다섯 색은 칠판 밖으로 나가지 않는다.
- **학년 배지**: 1학년 노랑(g1/g1-ink), 2학년 분홍(g2/g2-ink), 3학년 하늘(g3/g3-ink), 전 학년 연남색(g-all/g-all-ink). 바탕과 글자는 늘 짝으로 쓴다.

### Neutral
- **복도 벽** (wall): 페이지 바탕, 꺼진 반 칸 바탕.
- **흰 판** (paper): 안내판, 문서 카드, 달력·시간표 판, 탭 띠, 반 고르기 창.
- **잉크** (ink): 본문 글자. **옅은 잉크** (ink-soft): 안내판 안 문단(급식 메뉴, 안내 문장).
- **흐린 글자** (muted): 날짜, 게시일, 작은 링크, 탭 라벨.
- **괘선** (rule): 모든 1px 선. **흐림** (faint): 읽지 않는 표시(다른 달 날짜, 꺼진 단추)에만. **고른 글자 바탕** (select).

**The One Navy Rule.** 강조는 교표 남색 하나로 한다. 고름·바뀜·오늘·제목이 모두 남색이고, 새 강조색을 들이지 않는다.

**The Chalk Stays On The Board Rule.** 칠판 초록과 분필 색은 첫 화면 오늘 칸 밖에 쓰지 않는다.

**The Badge-Only Grade Rule.** 학년 색은 높이 20px 배지 안에만 있고, 배지에는 늘 「1학년」 같은 글자가 있다. 판·띠·제목을 학년 색으로 칠하지 않는다.

## Typography

**Display Font:** Pretendard Variable (with -apple-system, system-ui)
**Body Font:** Pretendard Variable
**Hand Font:** Gaegu 700, 칠판 날짜 한 곳에만

**Character:** 굵은 고딕 하나로 명패와 안내판을 쓰고, 손글씨는 칠판 날짜에 분필 한 획만큼만 얹는다. 두 글꼴 모두 사이트가 직접 담아 보낸다.

### Hierarchy
사다리는 12 · 13 · 15 · 17 · 20 · 22 · 30px(--fs-12 … --fs-30) 일곱 단뿐이다.
- **칠판 날짜** (Gaegu 700, 30px, 1): 「10월 22일」. 요일은 Pretendard 17px 흐린 분필.
- **명패 제목** (800, 22px, 1.25): 「1학년 5반」. 반을 안 골랐을 때·페이지 명패·좁은 명패는 20px.
- **Headline** (700, 20px): 달 이름, 반 고르기 창 제목.
- **Body** (400, 17px, 1.6): 본문 기준. 칠판 항목·문서 카드 제목은 17px 600~700.
- **Title** (800, 15px, 1.4, 남색): 안내판 제목. 안내판 줄·알약·단추도 15px.
- **Meta** (500, 13px): 날짜, 게시일·호수, 작은 링크, 칠판 소제목(700).
- **Label** (700, 12px): 배지, 탭 라벨, 달력 요일, 첫 화면 명패의 「명지중학교」.

**The One Hand Rule.** 손글씨(Gaegu)는 칠판 날짜에만. 정보를 담은 글자는 모두 Pretendard다.

**The Ladder Rule.** 새 크기를 만들지 않고 사다리의 단을 고른다.

## Layout

한 단 레이아웃: 폭은 `min(100% − 2×14px, 40rem)`, 넓은 화면에서도 가운데 한 단. 판과 판 사이는 10px, 명패 아래는 12px. 판 안쪽 여백은 12px/14px(칠판 14px/16px). 아래 탭(56px + 안전 영역)이 바닥글을 가리지 않게 본문 아래를 비운다.

- 48rem 이상: 탭 띠가 40rem 폭으로 가운데 서고 위 모서리가 둥글어진다. 그 밖에는 바뀌지 않는다.
- 판 단위 컨테이너 쿼리로 접는다: 일정 줄은 판이 19.5rem 아래면 날짜가 윗줄로, 가정통신문 정보 표는 16rem 아래면 항목이 위로, 탭 칸이 라벨보다 좁으면 아이콘을 빼고 라벨을 두 줄까지.
- 시간표 주간표는 320px·글자 200%에서 판 안에서만 가로로 밀리고, 교시 열은 왼쪽에 붙어 있다. 페이지 전체가 가로로 넘치지 않는다.
- `word-break: keep-all`: 낱말 가운데서 끊지 않는다.

## Elevation & Depth

평면 체계다. 그림자는 쓰지 않고, 깊이는 복도 벽 → 흰 판 → 남색 명패·초록 칠판의 판 색 차이와 1px 괘선으로 만든다. 명패의 3px 밝은 남색 안 테두리, 달력 '오늘'의 2px 남색 안 테두리는 테두리일 뿐 그림자가 아니다. 반 고르기 창 뒤는 반투명 어두운 바탕(rgb(10 20 35 / 0.45))으로 가린다.

예외 하나: 분실물함 화면의 '물 위에 뜬 사진'(흰 4px 테두리, 18px 모서리, 그림자 0 6px 16px)은 이번 체계 이전부터 있던 분실물함 고유의 놀이 표현이다. 그 화면 안에서만 유지하고 다른 판으로 옮기지 않는다.

**The Flat Board Rule.** 칠판을 포함한 모든 판은 평평하다: 질감, 분필 가루, 그림자, 광택 없음.

**The One Line Rule.** 선은 1px 괘선(rule) 하나다. 굵은 선은 안내판 왼쪽 6px 남색 띠뿐이다.

## Shapes

모서리는 판 12px, 단추·칸 10px, 알약 끝까지 둥글게(999px), 배지 4px, 아래에서 올라오는 창 위 18px. 아이콘은 선 1.8~2.4px의 둥근 끝 SVG 선 그림이고, 펼침 표시는 선 두 개로 그린 꺾쇠다. 보이는 알약은 36px이어도 누르는 곳은 44px로 넓힌다.

## Components

### 명패 (Plate)
모든 화면 맨 위, 화면의 h1을 담는 남색 판.
- **brand 명패**(첫 화면): 교표(원래 색 그대로 흰 바탕 위에, 30px + 안쪽 4px, 모서리 10px) + 제목 「명지중학교(12px) / 알림장(22px, 800)」 + 오른쪽 흰 단추에 우리 반(「1학년 5반 ⌄」, 15px 800, 44px). 반이 없으면 단추가 「우리 반 고르기」. 단추를 누르면 반 고르기 창.
- **class 명패**(시간표): 「1학년 5반 시간표」(20px) + 오른쪽 「반 바꾸기」 알약, 교표 없음(compact). 반이 없으면 제목이 「우리 반을 골라 주세요」이고 알약은 감춘다(본문의 큰 「반 고르기」 단추 하나만 둔다).
- **page 명패**: 교표 없이 페이지 이름(20px)만, 위아래 10px. 아래 내용과 같은 말을 되풀이하는 보조 줄을 두지 않는다.
- **compact**: 교표 없이 한 단 낮게(제목이 긴 class 명패).
- 알약은 자바스크립트가 켜기 전까지 숨긴다. 명패 안 초점 테두리는 흰색.
- **정한 것(2026-10-23):** 제목 위 보조 줄은 없앴다. 첫 화면만 제목 「알림장」을 위에 크게 두고 「명지중학교」를 그 위 작은 이름으로 붙였다(학교 이름이 제목의 일부라 머리글이 아니다). 다른 명패는 제목만.

### 칠판 오늘 칸 (Chalkboard)
첫 화면 명패 바로 아래에만 있는 평평한 초록 판.
- 머리 줄: 손글씨 날짜 + 요일(등교일이면 끝에 「· 6교시까지」), 오른쪽 귀퉁이에 D-day(「기말고사 D-2」, 이름은 흐린 분필 15px, 숫자는 분필 노랑 17px 800). 교실 칠판 귀퉁이에 적어 두는 그 D-day다. 시험·방학과 학생들이 기다리는 행사만, 60일 안, 학년마다 가장 가까운 하나. 기간 중에는 넘어가지 않고 「기말고사 1일째」·「마지막 날」(하루짜리는 「D-day」)로 남는다.
- 쉬는 날이면 「오늘은 ○○입니다」 줄. 주말·쉬는 날에는 「다음 등교 10월 26일 (월) · 6교시까지」 줄을 두고, 바뀐 수업도 「다음 등교일 바뀐 수업」으로 그날 것을 보인다(급식 안내판과 같은 기준).
- 그 아래 소제목별 묶음: 「오늘 바뀐 수업」(노랑), 「챙길 것」(주황), 「오늘 일정」(분필).
- 챙길 것: 행사 일정이 있는 가정통신문은 행사 기간 매일과 그 전날(다음 등교일 준비물), 행사 전의 「챙길 날」(동의서 마감 등)에도. AI가 뽑은 「챙길 날」이 행사 뒤면(이의신청 마감 등) 버린다. 며칠 이어지는 준비물은 오늘 줄에 있으면 다음 등교일 줄에 되풀이하지 않는다.
- 오늘 일정 줄이 바뀐 수업과 같은 행사면(「1~6교시 기말고사」와 「기말고사」) 한 번만 보인다.
- 바뀐 수업 줄: 「3교시 과학」 굵게 + 원래 과목을 줄 그어(15px, 1.5px 줄) 흐린 분필로. 이어진 교시가 같은 과목으로 바뀌었으면 한 줄 「1~6교시 학교 행사」.
- 챙길 것 줄은 그 가정통신문으로 가는 밑줄 링크, 누르는 곳은 44px.
- 빈 묶음은 그리지 않는다. 반을 골랐으면 그 학년 것만, 학년 배지는 감춘다.

### 안내판 (Sign)
흰 판 + 왼쪽 6px 남색 띠 + 12px 모서리. 머리 줄: 굵은 남색 제목(15px 800) + 오른쪽 작은 흐린 링크(13px, 누르는 곳 44px). 줄과 안내 문장은 본문 17px. 줄 사이는 1px 괘선, 첫 줄 위에는 긋지 않는다.
- 새 가정통신문 안내판: 이 기기에서 아직 안 연 글은 제목을 굵게, 판 제목 옆에 빨간 「안 읽은 글 N」. 다 읽으면 없어진다.
- 일정 줄: 날짜(6.5rem, 13px 흐림) · 이름 · 배지.
- 급식 안내판: 메뉴 한 문단, 오른쪽 위 「알레르기」 꺾쇠로 번호 목록을 펼친다. 가정통신문 요약에 급식이 없다고 적힌 행사 기간에는 메뉴 위에 남색 굵은 줄 「3학년은 이날 점심 급식이 없어요 · 가정통신문」(그 학년에만).
- 분실물 안내판: 판 전체가 링크.

### 문서 카드 (DocCard)
가정통신문 한 건. 흰 판 + 1px 괘선 + 12px 모서리(띠 없음), 카드 전체가 링크. 순서는 배지 줄(대상 학년 · 반 · 「새 글」 · 「준비물」) → 제목(17px 700) → 「10월 22일 게시 · 호수」(13px 흐림). 목록 위 학년 알약으로 거른다. 「새 글」은 2주 안에 올라왔고 이 기기에서 아직 열지 않은 글이다(연 글 id는 localStorage['mjms-read']에만).

### 가정통신문 한 건 (Letter)
명패 대신 종이 가정통신문의 머리(교표 · 「가정통신문 / 명지중학교」 · 오른쪽 남색 호수, 아래 2px 남색 줄)로 시작한다. 이 화면만의 예외로, 원문 서식을 닮게 하려는 것이다. 위에 「‹ 가정통신문」 뒤로 링크. 제목(22px) → 정보 표(대상 · 일정 · 준비물 · 준비물 챙길 날 · 게시일) → 표 바로 아래 13px 흐린 줄 「요약은 AI가 만들고 선생님이 확인했어요. 원문과 다르면 원문이 맞아요. 원문 보기」 → 요약 문단 → 「학교 홈페이지 원문 보기」 단추.

### 배지 (Badge)
높이 1.25rem 이상(글자를 키우면 같이 커진다), 4px 모서리, 12px 700. 학년 배지 「1학년」「1·2학년」「전 학년」, 「새 글」(빨강 바탕 흰 글자), 「준비물」(연한 주황 바탕 갈색 글자). **쉬는 날 표시** 「쉬는 날」「공휴일」은 바탕 없는 빨강 12px 굵은 글자다.

### 반 고르기 창 (ClassSheet)
아래에서 올라오는 흰 창(위 모서리 18px, 손잡이 막대). 학년 3칸 → 반 5열 칸(48px, 10px 모서리, 고르면 남색) → 52px 남색 확인 단추 「1학년 5반으로 보기」(고르기 전에는 꺼진 연남색 「반을 골라 주세요」). 아래 한 줄 「이 휴대폰에만 저장돼요. 이름이나 번호는 묻지 않아요.」 처음 방문에 저절로 열지 않고, 닫기·Esc·바깥 누르기는 원래 반을 둔다. 닫히면 연 단추로 초점을 돌려준다.

### 아래 탭 (Tab bar)
흰 띠, 위 1px 괘선, 높이 56px + 안전 영역. 오늘(집) · 가정통신문 · 일정 · 분실물 · 시간표(아이콘 22px + 12px 라벨). 지금 화면은 남색 굵은 글자와 굵은 아이콘 선. 칸이 좁아지면(글자 200%) 아이콘을 빼고 라벨만, 「가정 / 통신문」처럼 낱말 사이에서만 줄을 바꾼다. 넓은 화면에서는 바닥글 아래를 3.5rem 비워 탭 카드가 붙지 않게 한다.

### 달력 (Calendar)
달 막대(‹ 달 이름 › 「오늘」, 44px 테두리 단추) → 흰 달력 판(7열, 날짜 칸 44px). 달력 판을 가로로 밀어도 달이 넘어간다(왼쪽 = 다음 달, 50px 이상·세로보다 확실히 가로·0.8초 안). 움직임 효과 없이 단추와 똑같이 바로 바뀐다. 일요일·쉬는 날 빨강, 토요일 하늘색 글자, 오늘은 2px 남색 안 테두리, 고른 날은 남색 칸에 흰 글자. 앞뒤 달 칸은 비운다. 일정이 있는 날은 숫자 아래 5px 점(쉬는 날은 빨강). 처음 고른 날은 오늘, 오늘 일정이 없으면 그 달 오늘 뒤 첫 일정 날. 달력 판 아래 오른쪽에 범례 「● 일정 있는 날 · ● 쉬는 날」(12px). 아래에 고른 날 안내판, 그 달 일정 안내판(오늘이 든 달은 「10월 남은 일정」으로 끝난 일정을 빼고, 다른 달은 「9월 일정 전체」), 「나이스 공개 학사일정」 출처 줄. 나이스 분류 머리말 「(적응)」「(자치)」는 떼고 쓴다.

### 시간표 주간표 (Timetable grid)
흰 판 안의 표: 교시 열(좁게, 붙어 있음) + 월~금 다섯 열(3.75rem), 과목 15px. 오늘 열은 머리칸 남색, 칸 바탕 연한 남색. 쉬는 날 열과 「N교시까지」 뒤 칸은 회색 바탕. 위에 주 단추(「이번 주」·「다음 주」·「다다음 주」·「3주 뒤」 이름 위, 「10/26~30」 날짜 범위 아래 12px). 원래 과목은 12px 진한 회색(ink-soft)에 1.5px 줄: 11px 회색 줄은 한글 가로획에 묻혀 보이지 않았다. 선생님이 교체를 과목 「학교 행사」로만 적은 칸은 그날 그 학년 학사일정 이름으로 바꿔 쓴다(「기말고사」). 그 학년 행사가 하나면 그것, 없으면 전 학년 행사가 하나일 때만, 여럿이면 「학교 행사」 그대로.

**The One Change Mark Rule.** 바뀐 수업은 어디서나 한 가지로만 표시한다: 새 과목을 굵게(시간표에서는 남색 800), 원래 과목을 줄 그어 흐리게. 표 아래 범례 「굵은 남색 = 바뀐 수업(줄 그은 과목이 원래 수업)」을 둔다. 색 칸, 아이콘, 다른 강조를 덧붙이지 않는다.

### 상태와 고정 문구
'없음'과 '못 불러옴'은 다른 문장으로 쓴다. 빈 자리를 「변경 없음」으로 오해하게 두지 않는다.
- **없음:** 「바뀐 수업 없어요」, 「챙길 것 없어요」, 「이날은 학사일정이 없어요」, 「이달에는 학사일정이 없어요」, 「아직 올라온 가정통신문이 없어요」.
- **아직 없음(데이터가 오기 전):** 「오늘 시간표가 아직 없어요」, 「그날 시간표가 아직 없어요」, 「이번 학년도 학사일정이 아직 없어요」.
- **불러오는 중:** 「불러오는 중…」, 「시간표를 불러오는 중이에요.」, 「반 목록을 불러오는 중이에요.」
- **못 불러옴:** 「바뀐 수업을 불러오지 못했어요」 + 「다시 불러오기」 단추, 「반 목록을 불러오지 못했어요」 + 「다시 불러오기」, 「시간표를 불러오지 못했어요」, 「학사일정을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.」, 「분실물 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.」
- 다시 불러오기를 누르면 초점을 결과로 옮긴다.

### 움직임
지은 움직임은 반 고르기 한 가지 순간뿐이다: 창이 아래에서 올라오고 뒤가 서서히 어두워지며(240ms, cubic-bezier(0.16, 1, 0.3, 1)), 반을 바꾸면 명패의 반 이름이 옛 이름과 엇갈려 흐려지며 바뀐다(같은 240ms 곡선). 닫힐 때와 첫 그리기에는 움직이지 않는다. 움직임 줄이기를 켜면 모두 즉시 바뀌고, 부드러운 스크롤도 끈다.

## Do's and Don'ts

### Do:
- **Do** 모든 화면을 명패로 시작하고, 명패 제목을 그 화면의 h1로 둔다(가정통신문 한 건만 종이 가정통신문 머리로 시작하는 예외).
- **Do** 주말·쉬는 날에는 '오늘' 대신 다음 등교일 정보를 보인다. 학부모가 가장 많이 여는 때가 전날 밤과 주말이다.
- **Do** 재미는 정보로 준다: 칠판 귀퉁이 D-day, 「6교시까지」, 「안 읽은 글 N」. 장식으로 주지 않는다.
- **Do** 정보는 흰 안내판(왼쪽 6px 남색 띠, 12px 모서리)에 굵은 남색 제목과 짧은 줄로 쓴다.
- **Do** 누르는 곳은 44px 이상으로 둔다. 보이는 알약·배지가 작으면 누르는 영역만 넓힌다.
- **Do** 글자 대비 4.5:1 이상을 지킨다(하늘색 글자는 sky가 아니라 sky-ink).
- **Do** 색에는 늘 글자를 붙인다: 학년 배지에 「1학년」, 쉬는 날에 「쉬는 날」, 바뀐 수업에 줄 그은 원래 과목과 「바뀜」(읽기 프로그램용).
- **Do** 글자 200%와 320px 폭에서 잘리지 않게 판 단위로 접는다.
- **Do** '없음'과 '못 불러옴'을 위의 고정 문구로 구분한다.

### Don't:
- **Don't** 칠판을 첫 화면 오늘 칸 밖에 쓰거나, 손글씨 글꼴을 칠판 날짜 밖에 쓴다.
- **Don't** 칠판에 분필 질감, 분필 가루, 지우개 자국을 넣는다.
- **Don't** 자석, 압정, 테이프 같은 게시판 소품을 그린다.
- **Don't** 판이나 글자에 빛 번짐(glow)이나 그림자를 준다(분실물함 사진만 예외).
- **Don't** 흐르는 글자(전광판 marquee)를 쓴다.
- **Don't** 학년 색을 배지 밖(판, 띠, 제목)에 칠한다.
- **Don't** 바뀐 수업을 굵게 + 줄 긋기 외의 방법(색 칸, 아이콘)으로 표시한다.
- **Don't** 사다리 밖 글자 크기를 새로 만든다.
- **Don't** 판 제목 위에 작은 머리글(eyebrow)을 새로 만든다.
