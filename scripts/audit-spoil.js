#!/usr/bin/env node
/**
 * Audit answer-spoiling: SVG correct-choice text, absolute-word leaks, length outliers.
 * Usage: node scripts/audit-spoil.js
 */
const fs = require('fs');
const path = require('path');

const ABS = /항상|절대|모든|반드시|결코|전부|무조건/;
const ROOT = path.join(__dirname, '..');

function loadQuestions() {
  return {
    'medical-law': JSON.parse(fs.readFileSync(path.join(ROOT, 'data/medical-law.json'), 'utf8')),
    'public-health': JSON.parse(fs.readFileSync(path.join(ROOT, 'data/public-health.json'), 'utf8')),
    anatomy: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/anatomy.json'), 'utf8')),
    histopathology: [
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/histopathology-existing.json'), 'utf8')),
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hp-part1.json'), 'utf8')),
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hp-part2.json'), 'utf8')),
    ],
    physiology: [
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ph-part1.json'), 'utf8')),
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ph-part2.json'), 'utf8')),
    ],
    'clinical-chemistry': [
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cc-part1.json'), 'utf8')),
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cc-part2.json'), 'utf8')),
    ],
    hematology: [
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/he-part1.json'), 'utf8')),
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/he-part2.json'), 'utf8')),
    ],
    'immuno-transfusion': [
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/it-part1.json'), 'utf8')),
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/it-part2.json'), 'utf8')),
    ],
    microbiology: [
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mb-part1.json'), 'utf8')),
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mb-part2.json'), 'utf8')),
    ],
    practical: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/practical.json'), 'utf8')),
  };
}

function svgTexts(file) {
  const s = fs.readFileSync(file, 'utf8');
  const texts = [];
  const re = /<text\b[^>]*>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(s))) texts.push(m[1].replace(/&amp;/g, '&').trim());
  return texts;
}

function ulen(s) {
  return [...s].length;
}

function isLenSevere(choices, ai) {
  const L = choices.map(ulen);
  const cL = L[ai];
  const maxW = Math.max(...L.filter((_, i) => i !== ai));
  return cL >= maxW * 1.5 && cL - maxW >= 6;
}

/** Distinctive tokens from correct answer for SVG spoiling check. */
function correctTokens(correct) {
  const tokens = new Set();
  tokens.add(correct.trim());
  const noParen = correct.replace(/\([^)]*\)/g, ' ');
  for (const t of noParen.split(/[\s·\/,]+/).filter(Boolean)) {
    if ([...t].length >= 2) tokens.add(t);
  }
  const eng = correct.match(/[A-Za-z][A-Za-z0-9.\-]{1,}/g) || [];
  eng.forEach((e) => tokens.add(e));
  return [...tokens];
}

// Labels that are legitimate raw figure cues (reagents, axes, +/-), not diagnosis conclusions.
const ALLOW_IN_SVG = new Set([
  'Anti-A', 'Anti-B', 'Anti-D', '응집(+)', '응집(−)', '응집',
  'P', 'QRS', 'T', 'Alb', 'α1', 'α2', 'β', 'γ',
  'X̄', '+2s', '−2s', '+3s', 'F', 'A', 'A2/C', 'S',
  'GLU', 'PRO', 'BLD', 'LEU', 'NIT', 'pH',
  'EDTA', 'Heparin', 'HCO₃⁻', 'PaCO₂',
  '①', '②', '③', '④', '⑤', 'A', 'B', 'C',
]);

function auditSvgSpoil(practical) {
  const details = [];
  for (const q of practical) {
    if (!q.image) continue;
    const imgPath = path.join(ROOT, q.image);
    if (!fs.existsSync(imgPath)) continue;
    const texts = svgTexts(imgPath);
    const blob = texts.join('\n');
    const correct = q.choices[q.answerIndex];
    const hits = [];
    for (const tok of correctTokens(correct)) {
      if (ALLOW_IN_SVG.has(tok)) continue;
      if ([...tok].length < 2) continue;
      // skip ultra-generic single morph words if only as part of longer non-matching context — still flag exact text node equality or conclusion-like
      if (texts.some((t) => t === tok || t.includes(tok))) {
        // Ignore if token is only a shared category word appearing in a generic title that doesn't assert diagnosis
        // Flag when full correct appears OR token is the primary diagnosis noun (≥3 chars) in any text node
        if (tok === correct || texts.some((t) => t.includes(tok) && [...tok].length >= 3)) {
          hits.push(tok);
        }
      }
    }
    // Also flag classic spoil patterns regardless of correct match
    const spoilPat = /판정\s*:|→\s*\S+|위반|금속광택|완전\)|관리상태\)|M-spike|단클론/;
    const patHits = texts.filter((t) => spoilPat.test(t));
    if (hits.length || patHits.length) {
      details.push({
        id: q.id,
        image: q.image,
        correct,
        hits: [...new Set(hits)],
        patHits,
        texts,
      });
    }
  }
  return details;
}

function main() {
  const Q = loadQuestions();
  const svgDetails = auditSvgSpoil(Q.practical);

  let absHits = 0;
  let lenHits = 0;
  const absEx = [];
  const lenEx = [];
  for (const [subj, arr] of Object.entries(Q)) {
    for (const q of arr) {
      const ai = q.answerIndex;
      const flags = q.choices.map((c) => ABS.test(c));
      const wAbs = flags.filter((f, i) => i !== ai && f).length;
      if (!flags[ai] && wAbs >= 1) {
        absHits++;
        if (absEx.length < 5) absEx.push({ subj, id: q.id, choices: q.choices, ai });
      }
      if (isLenSevere(q.choices, ai)) {
        lenHits++;
        if (lenEx.length < 5) lenEx.push({ subj, id: q.id, choices: q.choices, ai });
      }
    }
  }

  console.log('=== Answer-spoil audit ===');
  console.log('practical SVG spoil (correct/diagnosis text in figure):', svgDetails.length);
  svgDetails.slice(0, 25).forEach((d) => {
    console.log(' ', d.id, d.image, 'hits=' + d.hits.join('|'), 'pat=' + d.patHits.join('|'));
  });
  if (svgDetails.length > 25) console.log('  ... +' + (svgDetails.length - 25));
  console.log('absolute-word leak patterns:', absHits);
  absEx.forEach((e) => console.log(' ', e.subj, e.id));
  console.log('severe length outliers:', lenHits);
  lenEx.forEach((e) => console.log(' ', e.subj, e.id));
  console.log('TOTAL pattern hits (abs+len):', absHits + lenHits);

  const out = { svgSpoil: svgDetails.length, absHits, lenHits, svgDetails, absEx, lenEx };
  fs.writeFileSync(path.join(ROOT, 'scripts/audit-spoil-report.json'), JSON.stringify(out, null, 2));
  return out;
}

main();
