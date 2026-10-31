// 운영 주소는 https://mjms-news.vercel.app (AI 교무실 CORS 출처와 같아야 한다).
// 학교 정보. 빈 값('')으로 두면 화면에 나오지 않는다.
export const site = {
  school: '명지중학교',
  title: '명지중학교 알림장',
  description: '명지중학교 학부모와 학생을 위한 공개 알림장입니다. 로그인 없이 공지, 준비물, 학사일정을 확인할 수 있습니다.',
  homepage: 'https://myongji.sen.ms.kr', // 학교 공식 홈페이지 주소
  phone: '02-302-7072', // 학교 대표전화
  // AI 교무실 분실물함이 보관 중인 물건을 내주는 주소. 빈 값이면 분실물함 칸과 메뉴가 사라진다.
  lostFoundApi: 'https://mjms-office.vercel.app/api/news/lost',
  // AI 교무실이 내주는 학급 시간표(바뀐 수업·창체 포함) 주소. 빈 값이면 시간표 메뉴·화면·칠판 칸이 사라진다.
  timetableApi: 'https://mjms-office.vercel.app/api/news/timetable',
};
