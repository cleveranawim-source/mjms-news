export const ALL_GRADES = [1, 2, 3];

export function gradeLabel(grades: number[]): string {
  if (ALL_GRADES.every((g) => grades.includes(g))) return '전 학년';
  return `${[...grades].sort().join(', ')}학년`;
}
