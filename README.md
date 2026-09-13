# 임상병리사 CBT

국가고시 대비 모바일 친화 컴퓨터기반 평가 (GitHub Pages).

**Live:** https://leekuy541-alt.github.io/clinical-pathology-cbt/


## 문항 난이도

**문항 난이도 = 국시 표준(기초~중급 기출형).**  
교과서·강의 핵심 암기 사실 위주이며, 실무자급 SOP·희귀 트러블슈팅·고난도 감별은 넣지 않습니다.

## 기능

- **국시 유형 응시** — 1교시(100) / 2교시(115) / 3교시 실기(65) / 필기 215 / 전체 280
- **과목별 연습** — 홈에서 접어 둔 선택 메뉴 (10/20/35/50/전체)
- 매 세션 셔플(CBT 체감), 시험 모드 과목 태그
- 문항 진입 시 보기 5지 셔플 + `answerIndex`/`explainWrong` 재매핑
- 퀴즈 상단 「← 처음으로」, 「제출」+ 분석, `questionList` 유지
- 「이전 문제」/「다음 문제」로 미응답·재방문 자유 이동 (재선택 시 점수 갱신)
- 실기(사진·도표형) 이미지 문항 · 3교시/전체280의 실기 65는 practical 은행에서 추출

### 배분 안내

국시원 공시: 필기 215(법규20 + 이론I 80 + 이론II 115) + 실기 65 = **280**.  
과목 세분은 공시되지 않으며 UI의 과목 수는 **「관례 배분(참고)」**.

| 모드 | 내용 |
|------|------|
| 1교시 100 | 법규20 + 공중보건10 + 해부생리개론10 + 조직35 + 임상생리25 |
| 2교시 115 | 임상화학40 + 혈액30 + 면역수혈15 + 미생물30 |
| 3교시 65 | 실기 65 · **사진·도표형** (`practical` 이미지 은행) |
| 필기 215 | 1교시 + 2교시 |
| 전체 280 | 필기 215 + 실기 65 |

## 과목

| ID | 과목 | 은행(대략) |
|----|------|------------|
| medical-law | 의료관계법규 | 80+ |
| public-health | 공중보건학개론 | 50+ |
| anatomy | 해부생리학개론 | 50+ |
| histopathology | 조직병리학 | 100 |
| physiology | 임상생리학 | 100 |
| clinical-chemistry | 임상화학 | 100 |
| hematology | 혈액학 | 100 |
| immuno-transfusion | 면역혈청학·수혈의학 | 100 |
| microbiology | 임상미생물학 | 100 |
| practical | 실기(사진·도표형) | 80+ (SVG 모식도) |

## 구조

- `index.html` / `styles.css` / `app.js` — UI·퀴즈 로직
- `questions.js` — `SUBJECTS` + `QUESTIONS` 전역 (생성물)
- `data/*.json` — 문항 원본 (`practical.json` = 실기 이미지 문항)
- `images/*.svg` — 원작 SVG 모식도 (국시 실기형)
- `scripts/assemble-questions.js` — JSON → `questions.js` 조립
- `scripts/gen-common-banks.js` — 법규·공중보건·해부 은행 생성
- `scripts/gen-student-majors.js` / `gen-student-majors2.js` — 전공 6과목 국시 수험생 수준 재생성
- `scripts/helpers.js` — 문항 스키마 헬퍼

## 재생성

```bash
node scripts/gen-common-banks.js   # 공통 3과목 재생성 시
node scripts/assemble-questions.js
node --check questions.js app.js
```

## 스키마

`{ id, stem, choices[5], answerIndex 0-4, explainCorrect, explainWrong[5], image?, major? }`  
정답 인덱스의 `explainWrong`은 `""`.  
실기 문항은 `image`(예: `images/prac-01.svg`)와 전공 태그 `major`를 포함할 수 있다.
