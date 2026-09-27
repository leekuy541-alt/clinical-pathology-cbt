/**
 * 임상병리사 CBT — 과목 목록 (scripts/assemble-questions.js 생성)
 * 문항은 암호화된 data/bank.enc.json 에서 unlock.js 가 복호화해 QUESTIONS 에 채운다.
 */
var SUBJECTS = [
  {
    "id": "medical-law",
    "name": "의료관계법규",
    "status": "ready",
    "description": "1교시 교재+3교시 모의고사 · 의료법·의료기사법·감염병예방법·지역보건법·혈액관리법"
  },
  {
    "id": "public-health",
    "name": "공중보건학",
    "status": "ready",
    "description": "1교시 교재+3교시 모의고사 · 공중보건학"
  },
  {
    "id": "anatomy",
    "name": "해부생리학",
    "status": "ready",
    "description": "1교시 교재+3교시 모의고사 · 해부생리학"
  },
  {
    "id": "histopathology",
    "name": "조직병리학",
    "status": "ready",
    "description": "1교시 교재+3교시 모의고사 · 조직학·병리학·진단세포학·조직검사학"
  },
  {
    "id": "physiology",
    "name": "임상생리학",
    "status": "ready",
    "description": "1교시 교재+3교시 모의고사 · 심전도·뇌파·근전도·호흡·초음파"
  },
  {
    "id": "clinical-chemistry",
    "name": "임상화학",
    "status": "ready",
    "description": "2교시 교재+3교시 모의고사 · 임상화학·생화학·요화학·핵의학"
  },
  {
    "id": "hematology",
    "name": "혈액학",
    "status": "ready",
    "description": "2교시 교재+3교시 모의고사 · 혈액학"
  },
  {
    "id": "immuno-transfusion",
    "name": "면역혈청학·수혈의학",
    "status": "ready",
    "description": "2교시 교재+3교시 모의고사 · 수혈검사학·면역혈청학"
  },
  {
    "id": "microbiology",
    "name": "임상미생물학",
    "status": "ready",
    "description": "2교시 교재+3교시 모의고사 · 임상미생물학·기생충학"
  },
  {
    "id": "practical",
    "name": "실기(3교시)",
    "status": "ready",
    "description": "3교시 교재 · 사진·도표형 실기"
  }
];

var QUESTIONS = {
  "medical-law": [],
  "public-health": [],
  "anatomy": [],
  "histopathology": [],
  "physiology": [],
  "clinical-chemistry": [],
  "hematology": [],
  "immuno-transfusion": [],
  "microbiology": [],
  "practical": [],
};
