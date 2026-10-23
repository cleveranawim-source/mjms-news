// 우리 반: 고른 반 id(예 class-1_5)는 이 기기 localStorage['mjms-class']에만 둔다. 서버로 보내지 않는다.
// 학년은 따로 저장하지 않고 반 id에서 얻는다. (Base 머리 스크립트와 Plate도 같은 꼴을 읽는다.)
import { escapeHTML } from './html.ts';

const KEY = 'mjms-class';
const ID = /^class-(\d+)_(\d+)$/;

/** class-1_5 → 1. 꼴이 아니면 null. */
export function gradeOf(classId: string): number | null {
  const m = ID.exec(classId);
  return m ? Number(m[1]) : null;
}

/** class-1_5 → 「1학년 5반」. 꼴이 아니면 null. */
export function classLabel(classId: string): string | null {
  const m = ID.exec(classId);
  return m ? `${Number(m[1])}학년 ${Number(m[2])}반` : null;
}

export function readClass(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveClass(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

/** 그 반이 목록(시간표 피드)에 있으면 id, 없으면 ''. */
export function knownClass(classes: { id: string }[], id: string): string {
  return id && classes.some((c) => c.id === id) ? id : '';
}

// 「1-5」 → 5. 끝 숫자가 없으면 null(이름을 그대로 쓴다).
const classNo = (name: string) => {
  const m = /(\d+)\s*$/.exec(name);
  return m ? Number(m[1]) : null;
};

/** 반 고르기 창의 반 단추(5칸 격자). 그 학년 반만, 번호순, 이름은 「5반」처럼 반 번호만. */
export function sheetClassesHTML(classes: { id: string; name: string; grade: number }[], grade: number, selected: string): string {
  return classes
    .filter((c) => c.grade === grade)
    .map((c) => ({ c, no: classNo(c.name) }))
    .sort((a, b) => (a.no ?? Infinity) - (b.no ?? Infinity))
    .map(
      ({ c, no }) =>
        `<button type="button" class="sheet-cell" data-pick-class="${escapeHTML(c.id)}" aria-pressed="${c.id === selected}">${no === null ? escapeHTML(c.name) : `${no}반`}</button>`,
    )
    .join('');
}
