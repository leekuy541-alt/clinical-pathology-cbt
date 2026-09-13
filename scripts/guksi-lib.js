/** Shared helpers for 국시-level bank generation */
function build(id, stem, correct, wrongs, explainCorrect, wrongExplains, rot) {
  const choices = wrongs.slice(0, 4);
  const answerIndex = ((rot % 5) + 5) % 5;
  choices.splice(answerIndex, 0, correct);
  const ew = [];
  let wi = 0;
  for (let i = 0; i < 5; i++) {
    if (i === answerIndex) ew.push('');
    else ew.push(wrongExplains[wi++] || '국시에서 요구하는 정답이 아니다.');
  }
  return { id, stem, choices, answerIndex, explainCorrect, explainWrong: ew };
}

function fromRows(prefix, rows) {
  return rows.map((r, i) => {
    const [stem, correct, w1, w2, w3, w4, ec, e1, e2, e3, e4] = r;
    return build(
      prefix + String(i + 1).padStart(2, '0'),
      stem,
      correct,
      [w1, w2, w3, w4],
      ec,
      [e1 || `${w1}은(는) 옳지 않다.`, e2 || `${w2}은(는) 옳지 않다.`, e3 || `${w3}은(는) 옳지 않다.`, e4 || `${w4}은(는) 옳지 않다.`],
      i
    );
  });
}

function writeBank(filename, arr) {
  const fs = require('fs');
  const path = require('path');
  const out = path.join(__dirname, '..', 'data', filename);
  fs.writeFileSync(out, JSON.stringify(arr, null, 2) + '\n');
  console.log('wrote', filename, arr.length);
}

module.exports = { build, fromRows, writeBank };
