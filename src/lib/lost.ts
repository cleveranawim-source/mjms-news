// 분실물함: AI 교무실(mjms-office)의 /api/news/lost가 주는 보관 중 물건.
// 사진·종류·발견 장소·날짜·찾으러 갈 곳만 온다(주인 확인용 특징 칸과 선생님 이름은 AI 교무실이 싣지 않는다).
import { formatDate } from './dates.ts';

export type LostItem = {
  id: string;
  category: string;
  photo: string;
  foundAt: string;
  storedAt: string;
  foundOn: string;
};

const isItem = (v: any): v is LostItem =>
  v && ['id', 'category', 'photo', 'foundAt', 'storedAt', 'foundOn'].every((k) => typeof v[k] === 'string') && v.photo.startsWith('https://');

/** 목록을 못 받으면 null — 화면은 분실물 칸을 감추거나 안내만 한다. */
export async function loadLost(api: string, fetcher: typeof fetch = fetch): Promise<LostItem[] | null> {
  try {
    const res = await fetcher(api, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const { items } = await res.json();
    return Array.isArray(items) ? items.filter(isItem) : null;
  } catch {
    return null;
  }
}

export const foundOnLabel = (ymd: string) => formatDate(ymd);

/** 상세 제목: 피드에 물건 이름이 없으므로 「2층 복도에서 찾은 물건」. 발견 장소가 비면 분류명. */
export const lostTitle = (i: Pick<LostItem, 'category' | 'foundAt'>) => (i.foundAt ? `${i.foundAt}에서 찾은 물건` : i.category);

/** 제목 아래 작은 줄: 「학용품 · 10월 21일 (수) 발견」. */
export const lostMeta = (i: Pick<LostItem, 'category' | 'foundOn'>) => `${i.category} · ${foundOnLabel(i.foundOn)} 발견`;
