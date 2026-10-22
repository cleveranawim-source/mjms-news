// 알림 원고에 개인정보가 들어가지 않았는지 검사한다. `npm run build` 전에 자동으로 실행된다.
// 학교 공식 이메일처럼 공개해도 되는 주소가 있다면 아래 ALLOWED_EMAIL_DOMAINS에 도메인을 추가한다.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_EMAIL_DOMAINS = [];

const RULES = [
  { kind: '주민등록번호', pattern: /(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[-\s]?[1-8]\d{6}(?!\d)/g },
  { kind: '휴대폰 번호', pattern: /(?<!\d)01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g },
  { kind: '학년·반·번호', pattern: /\d\s*학년\s*\d+\s*반\s*\d+\s*번/g },
  { kind: '학번', pattern: /학번\s*:?\s*\d{4,6}/g },
  { kind: '이메일 주소', pattern: /[\w.+-]+@([\w-]+\.)+[\w-]+/g, allowed: (match, opts) => opts.allowedEmailDomains.some((d) => match.toLowerCase().endsWith(`@${d}`) || match.toLowerCase().endsWith(`.${d}`)) },
];

export function findPrivacyIssues(text, opts = {}) {
  const options = { allowedEmailDomains: ALLOWED_EMAIL_DOMAINS, ...opts };
  const issues = [];
  text.split('\n').forEach((line, i) => {
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.pattern)) {
        if (rule.allowed?.(match[0], options)) continue;
        issues.push({ kind: rule.kind, line: i + 1, match: match[0] });
      }
    }
  });
  return issues;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const files = ['src/content', 'src/data'].flatMap((dir) => walk(join(root, dir))).filter((f) => /\.(md|mdx|ya?ml|json)$/.test(f));
  const found = files.flatMap((file) =>
    findPrivacyIssues(readFileSync(file, 'utf-8')).map((issue) => ({ ...issue, file: relative(root, file) })),
  );

  if (found.length === 0) {
    console.log(`개인정보 검사 통과: 파일 ${files.length}개`);
    return;
  }
  console.error('알림에 개인정보로 보이는 내용이 있어 사이트를 만들지 않았습니다. 지우거나 고친 뒤 다시 올려 주세요.\n');
  for (const f of found) console.error(`  ${f.file}:${f.line}  [${f.kind}] ${f.match}`);
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
