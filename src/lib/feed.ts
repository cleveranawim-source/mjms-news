// AI 교무실이 내주는 피드를 빌드할 때 한 번 받는다. 꼴은 서버(lib/news/feed.ts)와 같다.
import { readFile } from 'node:fs/promises';

export type FeedLetter = {
  id: string; number: string | null; subject: string; grades: number[]; classes: string | null;
  eventDate: string | null; eventEnd: string | null; bring: string[]; due: string | null; summary: string;
  attachments: string[]; sourceUrl: string; postedOn: string; publishedOn: string;
};
export type FeedEvent = { title: string; start: string; end: string; grades: number[] };
export type FeedDayOff = { title: string; start: string; end: string };
export type FeedMeal = { ymd: string; dishes: { name: string; allergens: number[] }[] };
export type Feed = {
  version: 1; generatedAt: string;
  letters: FeedLetter[]; events: FeedEvent[]; daysOff: FeedDayOff[]; meals: FeedMeal[];
};

const DEFAULT_URL = 'https://mjms-office.vercel.app/api/news/feed';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

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
    isStr(x.id) && isStrOrNull(x.number) && isStr(x.subject) && isGrades(x.grades) && isStrOrNull(x.classes) &&
    isYmdOrNull(x.eventDate) && isYmdOrNull(x.eventEnd) && isStrList(x.bring) && isYmdOrNull(x.due) &&
    isStr(x.summary) && isStrList(x.attachments) && isStr(x.sourceUrl) && isYmd(x.postedOn) && isYmd(x.publishedOn);
  return ok ? (x as unknown as FeedLetter) : null;
}

function toEvent(x: unknown): FeedEvent | null {
  if (!isObj(x)) return null;
  return isStr(x.title) && isYmd(x.start) && isYmd(x.end) && isGrades(x.grades) ? (x as unknown as FeedEvent) : null;
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

function pick<T>(list: unknown[], convert: (x: unknown) => T | null): T[] {
  return list.flatMap((x) => {
    const item = convert(x);
    return item ? [item] : [];
  });
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
  return {
    version: 1,
    generatedAt: isStr(raw.generatedAt) ? raw.generatedAt : '',
    letters: pick(letters, toLetter),
    events: pick(events, toEvent),
    daysOff: pick(daysOff, toDayOff),
    meals: pick(meals, toMeal),
  };
}

export async function loadFeed(source: { url?: string; file?: string; fetcher?: typeof fetch } = {}): Promise<Feed> {
  if (source.file) return parseFeed(JSON.parse(await readFile(source.file, 'utf8')));
  const url = source.url ?? process.env.NEWS_FEED_URL ?? DEFAULT_URL;
  const res = await (source.fetcher ?? fetch)(url);
  if (res.status !== 200) throw new Error(`feed: ${url} answered ${res.status}`);
  return parseFeed(await res.json());
}

// 빌드 한 번에 한 번만 받는다.
let cached: Promise<Feed> | null = null;
export function getFeed(): Promise<Feed> {
  cached ??= loadFeed(process.env.NEWS_FEED_FILE ? { file: process.env.NEWS_FEED_FILE } : {});
  return cached;
}
