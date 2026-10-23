import type { FeedScheduleItem } from './feed.ts';
import { escapeHTML } from './html.ts';

export const ALL_GRADES = [1, 2, 3];

// 「1학년」, 「1·2학년」, 「전 학년」. 학년이 비어 있으면 전 학년.
export function gradeLabel(grades: number[]): string {
  if (grades.length === 0 || ALL_GRADES.every((g) => grades.includes(g))) return '전 학년';
  return `${[...grades].sort().join('·')}학년`;
}

// 학년 배지: 한 학년이면 그 학년 색, 여러 학년·전 학년은 연한 남색. 색만이 아니라 늘 글자를 쓴다.
export function gradeBadge(grades: number[]): { text: string; tone: 'g1' | 'g2' | 'g3' | 'all' } {
  const text = gradeLabel(grades);
  return { text, tone: grades.length === 1 && ALL_GRADES.includes(grades[0]) ? (`g${grades[0]}` as 'g1' | 'g2' | 'g3') : 'all' };
}

export function badgeHTML(grades: number[], extra = ''): string {
  const { text, tone } = gradeBadge(grades);
  return `<span class="badge badge--${tone}${extra ? ` ${extra}` : ''}">${escapeHTML(text)}</span>`;
}

/** 일정 줄 끝의 배지: 공휴일·쉬는 날은 빨간 글자(학년만 쉬면 학년 배지를 앞에), 행사는 학년 배지. */
export function scheduleBadgeHTML(item: FeedScheduleItem): string {
  const off = item.kind === 'holiday' ? '공휴일' : item.kind === 'dayoff' ? '쉬는 날' : null;
  if (!off) return badgeHTML(item.grades);
  const red = `<span class="badge-off">${off}</span>`;
  return item.grades.length ? `${badgeHTML(item.grades)} ${red}` : red;
}
