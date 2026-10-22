import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse } from 'yaml';
import { toISODate } from './lib/dates.ts';

const isoDate = z.preprocess(
  (v) => (v instanceof Date || typeof v === 'string' ? toISODate(v) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 2026-10-22 형식으로 적어 주세요.'),
);
const grades = z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])).min(1).default([1, 2, 3]);

const notices = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notices' }),
  schema: z.object({
    title: z.string(),
    date: isoDate,
    grades,
    category: z.enum(['공지', '가정통신문', '행사', '준비물']).default('공지'),
    important: z.boolean().default(false),
    bring: z.array(z.string()).default([]),
    due: isoDate.optional(),
    files: z.array(z.object({ name: z.string(), path: z.string() })).default([]),
  }),
});

// 일정 파일에는 id를 따로 적지 않아도 되도록 순서대로 붙여 준다.
const schedule = defineCollection({
  loader: file('src/data/schedule.yaml', {
    parser: (text) => (parse(text) ?? []).map((item: object, i: number) => ({ id: String(i), ...item })),
  }),
  schema: z.object({
    title: z.string(),
    date: isoDate,
    end: isoDate.optional(),
    grades,
    holiday: z.boolean().default(false),
  }),
});

export const collections = { notices, schedule };
