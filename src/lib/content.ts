import { getCollection } from 'astro:content';
import type { BoardEvent, BoardNotice } from './board.ts';

export async function getNotices() {
  const notices = await getCollection('notices');
  return notices.sort((a, b) => b.data.date.localeCompare(a.data.date) || a.data.title.localeCompare(b.data.title));
}

export async function getEvents() {
  const events = await getCollection('schedule');
  return events.map((e) => e.data).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getBoardData(): Promise<{ notices: BoardNotice[]; events: BoardEvent[] }> {
  const notices = (await getNotices()).map(({ id, data }) => ({
    slug: id,
    title: data.title,
    date: data.date,
    grades: data.grades,
    bring: data.bring,
    due: data.due,
  }));
  const events = (await getEvents()).map(({ title, date, end, grades }) => ({ title, date, end, grades }));
  return { notices, events };
}

export function groupByMonth<T>(items: T[], dateOf: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateOf(item).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups];
}
