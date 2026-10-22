import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPrivacyIssues } from '../scripts/check-privacy.mjs';

const kinds = (text) => findPrivacyIssues(text).map((i) => i.kind);

test('flags personal mobile numbers in common formats', () => {
  assert.deepEqual(kinds('담임 연락처 010-1234-5678'), ['휴대폰 번호']);
  assert.deepEqual(kinds('01012345678로 문자'), ['휴대폰 번호']);
  assert.deepEqual(kinds('010 1234 5678'), ['휴대폰 번호']);
});

test('does not flag school landline numbers', () => {
  assert.deepEqual(kinds('행정실 02-300-1234'), []);
});

test('flags resident registration numbers', () => {
  assert.deepEqual(kinds('130512-3123456'), ['주민등록번호']);
});

test('flags student class numbers and student IDs', () => {
  assert.deepEqual(kinds('2학년 3반 15번 학생'), ['학년·반·번호']);
  assert.deepEqual(kinds('학번 20315'), ['학번']);
});

test('allows class-level references without a seat number', () => {
  assert.deepEqual(kinds('2학년 3반은 3교시에 강당으로'), []);
});

test('flags email addresses outside the allowed domains', () => {
  assert.deepEqual(kinds('hong@gmail.com으로 제출'), ['이메일 주소']);
  assert.deepEqual(findPrivacyIssues('office@school.kr', { allowedEmailDomains: ['school.kr'] }), []);
});

test('reports line numbers', () => {
  const [issue] = findPrivacyIssues('첫 줄\n둘째 줄 010-1111-2222');
  assert.equal(issue.line, 2);
});
