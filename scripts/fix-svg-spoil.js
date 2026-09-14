#!/usr/bin/env node
/**
 * Strip answer-spoiling labels from practical SVGs.
 * Keep raw visual cues; remove diagnosis conclusions, 판정 lines, → cell names, etc.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'images');

/** Exact text content replacements: old -> new (empty = delete whole <text>…</text>) */
const REPLACE = {
  // Cell type conclusions
  '다엽핵 · 호중성 과립 → 호중구': '',
  '2엽핵 · 굵은 호산성 과립 → 호산구': '',
  '큰 원형핵 · 적은 세포질 → 림프구': '',
  '큰 세포 · 높은 N/C · 핵소체 → 아세포': '',
  '작은 보라 과립 조각 = 혈소판': '',
  '낫모양(겸상) 적혈구': '',
  '표적세포(target cell)': '',
  '조각난·헬멧형 적혈구 (schistocyte)': '',
  '중앙 색소 · 중간 창백 · 외연 색소': '중앙·중간·외연 색소 분포',
  '중앙 창백부 ≈ 1/3, 크기 균일': '중앙 창백 · 크기 분포',

  // ABO 판정
  '판정: O형 (전방 Anti-A/−B 모두 −)': '',
  '판정 예: A형 Rh(D)+': '',
  '판정 예: B형 Rh(D)−': '',
  '판정: AB형': '',

  // Micro conclusions
  'E. coli: 금속광택 집락': '',
  '금속광택': '',
  'β(완전)': '①',
  'α(부분)': '②',
  'γ(없음)': '③',
  '유당발효(+)=분홍 / (−)=무색': '집락 색 비교',
  '구균(cocci)': '',
  '간균(rods)': '',
  '진한 보라(G+)': '',
  '분홍~적색(G−)': '',
  '보라색 간균 (G+ rods)': '',
  '비교: G+ 구균': '',
  '비교: 연한 간균': '',
  '적색 간균 (AFB+)': '',
  'AFB = 적색 잔류': '적색 잔류',
  '비항산균은 탈색 후 청색': '탈색 후 대비 염색',
  '기포(+) = catalase +': '기포(+)',
  '수초 내 보라 = oxidase +': '보라(+)',
  '억제대 직경으로 S/I/R 판정': '억제대 직경 측정',
  '특이 밴드 패턴으로 판정': '밴드 패턴',
  '균사·분생자 관찰 (진균)': '균사·분생자 관찰',
  '가열 용해 혈액 · 갈색 배지': '갈색 배지',

  // Parasite name spoilers
  '두꺼운 피막 · 타원 — Ascaris 수정란형': '두꺼운 피막 · 타원형',
  '얇은 피막 · 분할란 — 구충란형': '얇은 피막 · 분할란',
  '두꺼운 방사선조 피막 — 조충란': '두꺼운 방사선조 피막',
  '배 모양 · 쌍핵 — Giardia 영양형': '배 모양 · 쌍핵',
  'Maltese cross — 콜레스테롤/전분 등': '십자형 굴절',
  '원주(cast) — 원통형 구조': '원통형 구조',

  // LJ rule names
  '1점이 +3s 초과 → 1₃s 위반': '',
  '연속 2점이 +2s 쪽 → 2₂s': '',
  '일방향 지속 상승 = trend(추세)': '',
  '점들이 ±2s 내 · 관리상태': '점들이 ±2s 내',

  // Chemistry / other conclusions
  'Gap = 20 → 독성 알코올 등 의심': 'Gap = 20',
  'γ M-spike': 'γ 영역 피크',
  '단클론 피크 의심': '',
  '정상: HbA 주밴드': '주밴드 위치',
  '응집 = 부적합': '응집(+)',
  '응집− = 적합': '응집(−)',
  '수혈 전 적합성 확인': '',
  'pH와 PaCO₂/HCO₃ 방향 조합으로 감별': 'pH · PaCO₂ · HCO₃⁻',
  '당원·진균벽 등 = 자홍(magenta)': '자홍(magenta) 반응',
  'Beer 법칙: 흡광 ∝ 농도': '흡광도 측정',
  '혈장층 높이 = ESR': '혈장층 높이',
  '패드를 표준색표와 비교 판독': '패드 발색',
  '대칭 균형 장착 필요': '로터 장착',
  'WBC: 4모서리 · RBC: 중앙': '모서리·중앙 구역',
  '항원-항체 결합 후 발색': '발색 반응',
  '산성뇨에서 흔히 관찰': '',

  // Titles that include diagnosis — soften
  'Western blot 모식 (HIV 확인)': 'Western blot 모식',
  '정상 적혈구 도말 모식': '적혈구 도말 모식',
  '분쇄적혈구 모식': '적혈구 형태 모식',
  '항산균 염색 모식도': '항산 염색 모식도',
  '백혈구 모식 (Wright)': 'Wright 염색 모식',
  '말초혈액 도말 모식': '혈액 도말 모식',
  '혈청단백전기영동 (정상)': '혈청단백전기영동',
  '정상 심전도 파형 모식': '심전도 파형 모식',
};

function stripTextElements(svg, textsToRemove) {
  // Remove entire <text>...</text> whose inner text is empty replacement
  return svg.replace(/<text\b[^>]*>[^<]*<\/text>/g, (m) => {
    const inner = m.replace(/^<text\b[^>]*>/, '').replace(/<\/text>$/, '');
    const trimmed = inner.trim();
    if (Object.prototype.hasOwnProperty.call(REPLACE, trimmed)) {
      const neu = REPLACE[trimmed];
      if (neu === '') return '';
      return m.replace(trimmed, neu);
    }
    return m;
  });
}

let changed = 0;
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
  const p = path.join(DIR, file);
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  s = stripTextElements(s, REPLACE);
  // collapse leftover blank lines from removals
  s = s.replace(/\n{3,}/g, '\n\n');
  if (s !== orig) {
    fs.writeFileSync(p, s);
    changed++;
    console.log('fixed', file);
  }
}
console.log('SVG files changed:', changed);
