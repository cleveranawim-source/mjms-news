import { getCollection } from 'astro:content';

export async function getNotices() {
  const notices = await getCollection('notices');
  return notices.sort((a, b) => b.data.date.localeCompare(a.data.date) || a.data.title.localeCompare(b.data.title));
}

export async function getEvents() {
  const events = await getCollection('schedule');
  return events.map((e) => e.data).sort((a, b) => a.date.localeCompare(b.date));
}

export function groupByMonth<T>(items: T[], dateOf: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateOf(item).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups];
}
