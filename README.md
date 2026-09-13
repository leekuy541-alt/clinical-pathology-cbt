# 임상병리사 CBT

국가고시 대비 모바일 친화 컴퓨터기반 평가 (GitHub Pages).

**Live:** https://leekuy541-alt.github.io/clinical-pathology-cbt/

## 기능

- **국가고시 모의** — 프리셋 A(필기 전공 175) / B(전체 240) / C(빠른 50), 문항 수 조절·localStorage 저장
- **과목별 연습** — 10/20/35/50/전체 선택 후 무작위 추출(비복원)
- 매 세션 과목 내 셔플 → 전체 셔플(CBT 체감), 시험 모드 과목 태그 표시
- 문항 진입 시 보기 5지 셔플 + `answerIndex`/`explainWrong` 재매핑(정답이 ①에 고정되지 않음). 복습은 같은 보기 순서 유지
- 퀴즈 상단 「← 처음으로」, 하단 「다음 문제」/「결과 보기」+「제출」(중간 분석)
- 결과/제출 분석: 맞힌·응시·전체, 과목별 막대, 강점·취약 TOP, 유형(과목) 칩. 미응시는 오답 아님
- 틀린 문제 다시보기 — `{subjectId, id}`로 혼합 은행 추적. 중간 제출 시 「이어서 풀기」

### 배분 안내

국시원 공시: 필기 215(법규20 + 이론I 80 + 이론II 115) + 실기 65 = **280**.  
전공 세분은 공시되지 않으며 UI의 과목 수는 **「관례 배분(참고)」**. 공통 40(법규·공중보건·해부생리)은 은행 준비 전까지 미포함 → 모의 상한 240.

| 프리셋 | 내용 |
|--------|------|
| A 175 | 조직32 · 생리26 · 임상화학40 · 혈액30 · 면역수혈15 · 미생물32 |
| B 240 | A + 실기형 65(전공 은행 혼합) |
| C 50 | A 비례 축소(최대잔여법) |

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
- `questions.js` — `SUBJECTS` + `QUESTIONS` 전역 (생성물, 600문항)
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
