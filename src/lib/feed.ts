// AI 교무실이 내주는 피드를 빌드할 때 한 번 받는다. 꼴은 서버(lib/news/feed.ts)와 같다.
import { readFile } from 'node:fs/promises';

export type FeedLetter = {
  id: string; number: string | null; subject: string; grades: number[]; classes: string | null;
  eventDate: string | null; eventEnd: string | null; bring: string[]; due: string | null; summary: string;
  attachments: string[]; sourceUrl: string; postedOn: string; publishedOn: string;
};
export type FeedEvent = { title: string; start: string; end: string; grades: number[] };
export type FeedScheduleItem = { title: string; start: string; end: string; grades: number[]; kind: 'holiday' | 'dayoff' | 'event' };
export type FeedDayOff = { title: string; start: string; end: string };
export type FeedMeal = { ymd: string; dishes: { name: string; allergens: number[] }[] };
export type Feed = {
  version: 1; generatedAt: string;
  letters: FeedLetter[]; events: FeedEvent[]; daysOff: FeedDayOff[]; meals: FeedMeal[];
  schedule: FeedScheduleItem[] | null; // 나이스 학사일정. 피드에 없으면 null
};

const DEFAULT_URL = 'https://mjms-office.vercel.app/api/news/feed';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const ID = /^[A-Za-z0-9_-]{1,64}$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isYmd = (v: unknown): v is string => isStr(v) && YMD.test(v);
const isYmdOrNull = (v: unknown): v is string | null => v === null || isYmd(v);
const isStrOrNull = (v: unknown): v is string | null => v === null || isStr(v);
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const isGrades = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((g) => Number.isInteger(g) && g >= 1 && g <= 3);

function toLetter(x: unknown): FeedLetter | null {
  if (!isObj(x)) return null;
  const ok =
    isStr(x.id) && ID.test(x.id) && isStrOrNull(x.number) && isStr(x.subject) && isGrades(x.grades) && isStrOrNull(x.classes) &&
    isYmdOrNull(x.eventDate) && isYmdOrNull(x.eventEnd) && isStrList(x.bring) && isYmdOrNull(x.due) &&
    isStr(x.summary) && isStrList(x.attachments) && isStr(x.sourceUrl) && isYmd(x.postedOn) && isYmd(x.publishedOn);
  if (!ok) return null;
  // 알려진 필드만 옮긴다: 편지 목록 전체가 페이지 JSON에 실리므로 모르는 필드는 새어 나가면 안 된다.
  return {
    id: x.id as string, number: x.number as string | null, subject: x.subject as string, grades: [...(x.grades as number[])],
    classes: x.classes as string | null, eventDate: x.eventDate as string | null, eventEnd: x.eventEnd as string | null,
    bring: [...(x.bring as string[])], due: x.due as string | null, summary: x.summary as string,
    attachments: [...(x.attachments as string[])], sourceUrl: x.sourceUrl as string,
    postedOn: x.postedOn as string, publishedOn: x.publishedOn as string,
  };
}

function toEvent(x: unknown): FeedEvent | null {
  if (!isObj(x)) return null;
  return isStr(x.title) && isYmd(x.start) && isYmd(x.end) && isGrades(x.grades)
    ? { title: x.title, start: x.start, end: x.end, grades: [...x.grades] }
    : null;
}

const KINDS = ['holiday', 'dayoff', 'event'];
// 나이스가 행사 앞에 붙이는 분류 머리말(「(적응)학교폭력예방교육」, 「(자치)학급임원선거」)은 학부모에게 뜻이 없어 뗀다.
const PREFIX = /^\([가-힣]{1,4}\)\s*/;
const cleanTitle = (t: string) => t.replace(PREFIX, '') || t;

function toScheduleItem(x: unknown): FeedScheduleItem | null {
  if (!isObj(x)) return null;
  const ok =
    isStr(x.title) && x.title.length >= 1 && x.title.length <= 100 && isYmd(x.start) && isYmd(x.end) && x.start <= x.end &&
    isGrades(x.grades) && isStr(x.kind) && KINDS.includes(x.kind);
  return ok
    ? { title: cleanTitle(x.title as string), start: x.start as string, end: x.end as string, grades: [...(x.grades as number[])], kind: x.kind as FeedScheduleItem['kind'] }
    : null;
}

function toDayOff(x: unknown): FeedDayOff | null {
  if (!isObj(x)) return null;
  return isStr(x.title) && isYmd(x.start) && isYmd(x.end) ? { title: x.title, start: x.start, end: x.end } : null;
}

function toMeal(x: unknown): FeedMeal | null {
  if (!isObj(x) || !isYmd(x.ymd) || !Array.isArray(x.dishes)) return null;
  const dishes = x.dishes.flatMap((d) =>
    isObj(d) && isStr(d.name) && Array.isArray(d.allergens) && d.allergens.every((n) => Number.isInteger(n))
      ? [{ name: d.name, allergens: d.allergens as number[] }]
      : [],
  );
  return { ymd: x.ymd, dishes };
}

function pick<T>(name: string, list: unknown[], convert: (x: unknown) => T | null): T[] {
  const out = list.flatMap((x) => {
    const item = convert(x);
    return item ? [item] : [];
  });
  if (out.length < list.length) console.warn(`feed: ${name} ${list.length - out.length}개를 뺐어요 (모양이 달라요)`);
  return out;
}

// 학사일정: 배열이 아니거나, 항목이 왔는데 하나도 못 읽었으면 null(편지와 같은 원칙 — 빈 달력보다 「불러오지 못했어요」).
function parseSchedule(list: unknown): FeedScheduleItem[] | null {
  if (!Array.isArray(list)) return null;
  const items = pick('schedule', list, toScheduleItem);
  return list.length > 0 && items.length === 0 ? null : items;
}

// 큰 틀이 틀리면 던진다: 빌드가 실패하면 직전에 올라간 사이트가 그대로 남기 때문이다.
// 항목 하나가 이상한 것은 그 항목만 뺀다.
function parseFeed(raw: unknown): Feed {
  if (!isObj(raw)) throw new Error('feed: not an object');
  if (raw.version !== 1) throw new Error(`feed: unsupported version ${String(raw.version)}`);
  const { letters, events, daysOff, meals } = raw;
  if (!Array.isArray(letters) || !Array.isArray(events) || !Array.isArray(daysOff) || !Array.isArray(meals)) {
    throw new Error('feed: letters/events/daysOff/meals must be arrays');
  }
  const picked = pick('letters', letters, toLetter);
  // 편지가 왔는데 하나도 못 읽었으면 피드 모양이 바뀐 것이다. 빈 알림장을 올리느니 빌드를 멈춘다.
  if (letters.length > 0 && picked.length === 0) throw new Error('feed: no letter passed validation');
  return {
    version: 1,
    generatedAt: isStr(raw.generatedAt) ? raw.generatedAt : '',
    letters: picked,
    events: pick('events', events, toEvent),
    daysOff: pick('daysOff', daysOff, toDayOff),
    meals: pick('meals', meals, toMeal),
    schedule: parseSchedule(raw.schedule),
  };
}

export async function loadFeed(source: { url?: string; file?: string; fetcher?: typeof fetch } = {}): Promise<Feed> {
  if (source.file) return parseFeed(JSON.parse(await readFile(source.file, 'utf8')));
  const url = source.url ?? process.env.NEWS_FEED_URL ?? DEFAULT_URL;
  const res = await (source.fetcher ?? fetch)(url, { signal: AbortSignal.timeout(30000) });
  if (res.status !== 200) throw new Error(`feed: ${url} answered ${res.status}`);
  return parseFeed(await res.json());
}

// 빌드 한 번에 한 번만 받는다.
let cached: Promise<Feed> | null = null;
export function getFeed(): Promise<Feed> {
  cached ??= loadFeed(process.env.NEWS_FEED_FILE ? { file: process.env.NEWS_FEED_FILE } : {});
  return cached;
}
