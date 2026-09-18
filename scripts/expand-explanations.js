#!/usr/bin/env node
/**
 * Expand short explainCorrect / explainWrong into 국시-style writeups.
 * Mutates data/*.json in place. Does not change stems/choices/answerIndex.
 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'data');

function ensurePeriod(s) {
  s = String(s || '').trim();
  if (!s) return s;
  if (/[.?!。]$/.test(s)) return s;
  if (/(다|요|임|음|함|됨|큼)$/.test(s)) return s + '.';
  return s + '이다.';
}

/** Turn terse bank tips into readable misconception sentences. */
function rewriteTip(e) {
  let s = String(e || '').trim();
  if (!s) return s;
  s = s
    .replace(/혼동한\s*이웃\s*기한이다\.?/g, '혼동하기 쉬운 다른 법정 보존기간이다')
    .replace(/혼동한\s*이웃이다\.?/g, '혼동하기 쉬운 인접 개념이다')
    .replace(/의\s*이웃\s*지표이다\.?/g, '에 해당하는 다른 지표이다')
    .replace(/의\s*이웃이다\.?/g, '에 해당하는 인접 개념이다')
    .replace(/\s*이웃\s*기한이다\.?/g, '와 혼동하기 쉬운 다른 보존·기한이다')
    .replace(/\s*이웃\s*개념이다\.?/g, '와 인접한 다른 개념이다')
    .replace(/\s*지수\s*이웃이다\.?/g, '와 다른 혈구 지수 개념이다')
    // "특수 이웃이다" → "특수 관련 인접 오개념이다"
    .replace(/\s*이웃이다\.?/g, ' 관련 인접 오개념이다')
    .replace(/이다이다\.?/g, '이다')
    .replace(/\s{2,}/g, ' ');
  return ensurePeriod(s);
}

function shortLabel(choice) {
  const c = String(choice || '').trim();
  if (c.length <= 22) return c;
  return c.slice(0, 20) + '…';
}

function expandCorrect(q) {
  const correct = q.choices[q.answerIndex];
  const raw = String(q.explainCorrect || '').trim();
  const core = ensurePeriod(raw);

  // Concept + key fact
  const s1 =
    core +
    (raw.length < 22
      ? ' 이 개념을 선택지에 옮기면 「' + correct + '」이(가) 정답이다.'
      : ' 따라서 정답은 「' + correct + '」이다.');

  // Neighbor contrast from existing wrong tips
  const tips = [];
  for (let i = 0; i < 5; i++) {
    if (i === q.answerIndex) continue;
    tips.push(rewriteTip(q.explainWrong[i]));
  }
  const s2 =
    tips[0] +
    ' ' +
    tips[1] +
    ' 이웃 선택지와 정의·적용 범위를 가르면 「' +
    shortLabel(correct) +
    '」만 남는다.';

  return (s1 + ' ' + s2).replace(/\s+/g, ' ').trim();
}

function expandWrong(choice, existing, correct) {
  if (existing === '' || existing == null) return '';
  const tip = rewriteTip(existing);
  const s2 =
    '정답 「' +
    shortLabel(correct) +
    '」과(와) 인접해 보이지만 이 문항의 정의·상황에 맞지 않으므로 배제한다.';
  return (tip + ' ' + s2).replace(/\s+/g, ' ').trim();
}

function expandQuestion(q) {
  const correct = q.choices[q.answerIndex];
  return Object.assign({}, q, {
    explainCorrect: expandCorrect(q),
    explainWrong: q.explainWrong.map((e, i) =>
      i === q.answerIndex ? '' : expandWrong(q.choices[i], e, correct)
    ),
  });
}

function main() {
  const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).sort();
  let total = 0;
  let ge40 = 0;
  let ge80 = 0;
  const lens = [];
  for (const f of files) {
    const p = path.join(DATA, f);
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(arr) || !arr.length) {
      console.log('skip empty', f);
      continue;
    }
    const out = arr.map(expandQuestion);
    fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
    for (const q of out) {
      total++;
      const n = (q.explainCorrect || '').length;
      lens.push(n);
      if (n >= 40) ge40++;
      if (n >= 80) ge80++;
      // validate ew
      if (q.explainWrong[q.answerIndex] !== '') throw new Error(q.id + ' ew@answer');
      if (q.explainWrong.length !== 5) throw new Error(q.id + ' ew len');
      for (let i = 0; i < 5; i++) {
        if (i === q.answerIndex) continue;
        if (!q.explainWrong[i] || q.explainWrong[i].length < 20) {
          console.warn('short ew', q.id, i, q.explainWrong[i]);
        }
      }
    }
    console.log('expanded', f, out.length);
  }
  lens.sort((a, b) => a - b);
  console.log(
    'DONE total=%d ge40=%d ge80=%d min=%d median=%d',
    total,
    ge40,
    ge80,
    lens[0],
    lens[Math.floor(lens.length / 2)]
  );

  for (const f of ['public-health.json', 'hp-part1.json', 'mb-part1.json']) {
    const q = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))[0];
    console.log('\n====', q.id);
    console.log(q.explainCorrect);
    console.log('EW:', q.explainWrong.find(Boolean));
  }
}

main();
