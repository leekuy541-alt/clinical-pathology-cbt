# 임상병리사 CBT

국가고시 대비 모바일 친화 컴퓨터기반 평가 (GitHub Pages).

**Live:** https://leekuy541-alt.github.io/clinical-pathology-cbt/

## 과목 (각 100문항, 5지선다)

| ID | 과목 |
|----|------|
| histopathology | 조직병리학 |
| clinical-chemistry | 임상화학 |
| hematology | 혈액학 |
| microbiology | 임상미생물학 |
| immuno-transfusion | 면역혈청학·수혈의학 |
| physiology | 임상생리학 |

## 구조

- `index.html` / `styles.css` / `app.js` — UI·퀴즈 로직 (`questionList` 유지)
- `questions.js` — `SUBJECTS` + `QUESTIONS` 전역 (생성물)
- `data/*.json` — 문항 원본
- `scripts/assemble-questions.js` — JSON → `questions.js` 조립
- `scripts/helpers.js` — 문항 스키마 헬퍼

## 재생성

```bash
node scripts/assemble-questions.js
node --check questions.js app.js
```

## 스키마

`{ id, stem, choices[5], answerIndex 0-4, explainCorrect, explainWrong[5] }`  
정답 인덱스의 `explainWrong`은 `""`.
