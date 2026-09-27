# 임상병리사 CBT

국가고시 대비 모바일 친화 컴퓨터기반 평가 (GitHub Pages).

**Live:** https://leekuy541-alt.github.io/clinical-pathology-cbt/

## 문항 은행 (비밀번호 보호)

- 모든 문항은 사용자가 제공한 교재 PDF 3권(1교시·2교시·3교시)에서만 가져왔습니다. 이전 자체 제작 문항은 모두 삭제했습니다.
- 교재는 저작권이 있는 출판물이므로 **문항 평문·페이지 이미지는 저장소에 없습니다.**
  `data/bank.enc.json`(문항)과 `data/img/*.bin`(그림)은 AES-256-GCM 암호문이며,
  키는 비밀번호에서 PBKDF2-SHA256(310,000회, 고정 salt)로 유도합니다.
- 첫 화면에서 비밀번호를 입력하면 브라우저(WebCrypto)에서 복호화합니다. 「이 기기에서 기억」을 켜면 유도된 키를 localStorage에 저장해 다시 묻지 않습니다. 홈 하단 「이 기기에서 잠그기」로 지울 수 있습니다.
- 각 문항 해설 아래에 `출처: 1교시 교재 조직병리학 p.965 1번` 형식으로 원문 위치를 표시합니다. 교재 해설은 그대로 옮겼고, 해설이 없는 문항은 정답만 표시합니다.
- 교재 문항은 해설이 원래 보기 번호를 가리키므로 보기 순서를 섞지 않습니다(`fixedOrder`).

## 기능

- **국시 유형 응시** — 1교시(100) / 2교시(115) / 3교시 실기(65) / 필기 215 / 전체 280 (과목 문항이 배분보다 적으면 있는 만큼만 출제)
- **과목별 연습** — 홈에서 과목별 문항 수를 보고 과목을 골라 10/20/35/50/전체
- 오답노트, 오늘의 수업, 학습 현황 (은행 버전이 바뀌면 옛 기록은 자동 초기화)

## 구조

- `index.html` / `styles.css` / `app.js` — UI·퀴즈 로직
- `unlock.js` — 잠금 화면, 복호화, 암호화 그림 로딩
- `questions.js` — `SUBJECTS` + 빈 `QUESTIONS` 틀 (`scripts/assemble-questions.js` 생성)
- `data/bank.enc.json`, `data/img/*.bin` — 암호화된 문항·그림
- `scripts/build-encrypted-bank.js` — 저장소 밖 평문 은행(`/workspace/cbt-materials/kukshi/bank/`)을 암호화

## 빌드

```bash
# 평문 은행은 저장소 밖: /workspace/cbt-materials/kukshi/bank/bank.json + img/*.jpg
node scripts/assemble-questions.js
CBT_SITE_PASSWORD=... node scripts/build-encrypted-bank.js   # 환경변수 없으면 box-secrets.json 사용
```

## 스키마 (복호화 후)

`{ id, stem, choices[5], answerIndex 0-4, explainCorrect, explainWrong[5], source, topic, book, fixedOrder, year?, law?, major?, image? }`

- `id`: `k{교시}-{교재쪽}-{문번}` (예 `k2-254-40`), 실전모의고사 `k3m-{과목}-{회차}-{문번}`
- `image`: `img:{파일명}` → 암호화된 `data/img/*.bin` 을 복호화해 표시
- 실기(`practical`) 문항은 `major`로 원 과목을 표시
