#!/usr/bin/env node
/**
 * Assemble data/*.json into questions.js (SUBJECTS + QUESTIONS globals).
 */
const fs = require('fs');
const path = require('path');

const existing = JSON.parse(fs.readFileSync('data/histopathology-existing.json', 'utf8'));
const hpExtra = [
  ...JSON.parse(fs.readFileSync('data/hp-part1.json', 'utf8')),
  ...JSON.parse(fs.readFileSync('data/hp-part2.json', 'utf8')),
];
function loadParts(prefix) {
  return [
    ...JSON.parse(fs.readFileSync(`data/${prefix}-part1.json`, 'utf8')),
    ...JSON.parse(fs.readFileSync(`data/${prefix}-part2.json`, 'utf8')),
  ];
}

const QUESTIONS = {
  histopathology: [...existing, ...hpExtra],
  'clinical-chemistry': loadParts('cc'),
  hematology: loadParts('he'),
  microbiology: loadParts('mb'),
  'immuno-transfusion': loadParts('it'),
  physiology: loadParts('ph'),
};

const SUBJECTS = [
  { id: 'histopathology', name: '조직병리학', status: 'ready', description: '고정·처리·박절·염색·색소·인공산물·IHC' },
  { id: 'clinical-chemistry', name: '임상화학', status: 'ready', description: '전해질·효소·대사·내분비·정도관리' },
  { id: 'hematology', name: '혈액학', status: 'ready', description: '혈구·응고·도말·혈액종양' },
  { id: 'microbiology', name: '임상미생물학', status: 'ready', description: '염색·배양·동정·감수성·감염관리' },
  { id: 'immuno-transfusion', name: '면역혈청학·수혈의학', status: 'ready', description: '혈액형·항체·교차·수혈반응·혈청학' },
  { id: 'physiology', name: '임상생리학', status: 'ready', description: '심전도·폐기능·뇌파·근전도·초음파생리' },
];

const errors = [];
for (const [key, arr] of Object.entries(QUESTIONS)) {
  if (arr.length !== 100) errors.push(`${key} length=${arr.length}`);
  const ids = new Set();
  for (const q of arr) {
    if (ids.has(q.id)) errors.push(`dup ${q.id}`);
    ids.add(q.id);
    if (!Array.isArray(q.choices) || q.choices.length !== 5) errors.push(`${q.id} choices`);
    if (q.answerIndex < 0 || q.answerIndex > 4) errors.push(`${q.id} answerIndex`);
    if (!Array.isArray(q.explainWrong) || q.explainWrong.length !== 5) errors.push(`${q.id} ew`);
    else if (q.explainWrong[q.answerIndex] !== '') errors.push(`${q.id} ew answer not empty`);
  }
}
if (errors.length) {
  console.error(errors);
  process.exit(1);
}

function esc(s) {
  return JSON.stringify(s);
}

let out = `/**
 * 임상병리사 CBT — 문제 은행 (scripts/assemble-questions.js 생성)
 * SUBJECTS + QUESTIONS 전역 (classic script)
 * answerIndex: 0–4, explainWrong[answerIndex]는 ""
 */
var SUBJECTS = ${JSON.stringify(SUBJECTS, null, 2)};

var QUESTIONS = {\n`;

for (const [key, arr] of Object.entries(QUESTIONS)) {
  out += `  ${JSON.stringify(key)}: [\n`;
  for (const q of arr) {
    out += '    {\n';
    out += `      id: ${esc(q.id)},\n`;
    out += `      stem: ${esc(q.stem)},\n`;
    out += `      choices: ${esc(q.choices)},\n`;
    out += `      answerIndex: ${q.answerIndex},\n`;
    out += `      explainCorrect: ${esc(q.explainCorrect)},\n`;
    out += `      explainWrong: ${esc(q.explainWrong)},\n`;
    out += '    },\n';
  }
  out += '  ],\n';
}
out += '};\n';

fs.writeFileSync(path.join(__dirname, '..', 'questions.js'), out);
console.log('OK: wrote questions.js — 100×6 subjects');
