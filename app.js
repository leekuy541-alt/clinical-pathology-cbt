/**
 * 임상병리사 CBT — 퀴즈 로직
 * 국가고시 모의 · 과목별 연습 · 혼합 시험 채점
 */
(function () {
  "use strict";

  const NUM_LABELS = ["①", "②", "③", "④", "⑤"];
  const STORAGE_KEY = "cbt-exam-counts-v2";
  const STATS_KEY = "cbt-study-stats-v1";
  const NOTEBOOK_KEY = "cbt-wrong-notebook-v1";
  const EXAM_DATE_KEY = "cbt-exam-date-v1";
  const TODAY_LESSON_KEY = "cbt-today-lesson-v1";
  const SUBJECT_COUNT_PRESETS = [10, 20, 35, 50];
  /** 국시 필기 전공·공통 9과목 (합격 가능도 커버리지) */
  const STATS_SUBJECT_IDS = [
    "medical-law",
    "public-health",
    "anatomy",
    "histopathology",
    "physiology",
    "clinical-chemistry",
    "hematology",
    "immuno-transfusion",
    "microbiology",
  ];

  /** 영점 템플릿 */
  const ZERO_COUNTS = {
    "medical-law": 0,
    "public-health": 0,
    anatomy: 0,
    histopathology: 0,
    physiology: 0,
    "clinical-chemistry": 0,
    hematology: 0,
    "immuno-transfusion": 0,
    microbiology: 0,
  };

  /**
   * 관례 배분(참고) — 국시원 공시: 필기215(법규20+이론I 80+이론II 115)+실기65=280
   * 1교시 100 = 법규20 + 이론I 80(공중보건10+해부10+조직35+임상생리25)
   */
  const PRESET_S1 = Object.assign({}, ZERO_COUNTS, {
    "medical-law": 20,
    "public-health": 10,
    anatomy: 10,
    histopathology: 35,
    physiology: 25,
  });
  const PRESET_S1_PRACTICAL = 0;

  /** 2교시 115 = 이론II (화학40+혈액30+면역수혈15+미생물30) */
  const PRESET_S2 = Object.assign({}, ZERO_COUNTS, {
    "clinical-chemistry": 40,
    hematology: 30,
    "immuno-transfusion": 15,
    microbiology: 30,
  });
  const PRESET_S2_PRACTICAL = 0;

  /** 3교시 실기 65 — 사진·도표형 practical 은행에서 추출 */
  const PRESET_S3 = Object.assign({}, ZERO_COUNTS);
  const PRESET_S3_PRACTICAL = 65;

  /** 필기 215 = 1교시+2교시 */
  const PRESET_WRITTEN = Object.assign({}, ZERO_COUNTS, {
    "medical-law": 20,
    "public-health": 10,
    anatomy: 10,
    histopathology: 35,
    physiology: 25,
    "clinical-chemistry": 40,
    hematology: 30,
    "immuno-transfusion": 15,
    microbiology: 30,
  });
  const PRESET_WRITTEN_PRACTICAL = 0;

  /** 전체 280 = 필기215 + 실기65 */
  const PRESET_FULL = Object.assign({}, PRESET_WRITTEN);
  const PRESET_FULL_PRACTICAL = 65;

  const MAJOR_IDS = [
    "medical-law",
    "public-health",
    "anatomy",
    "histopathology",
    "physiology",
    "clinical-chemistry",
    "hematology",
    "immuno-transfusion",
    "microbiology",
  ];

  /** 실기(사진·도표형) 전용 은행 ID */
  const PRACTICAL_BANK_ID = "practical";

  /** @type {'home'|'count'|'exam-config'|'quiz'|'end'|'notebook'} */
  let screen = "home";
  let subjectId = null;
  let questionList = [];
  let index = 0;
  let score = 0;
  let answered = false;
  /** @type {{subjectId:string,id:string,question?:object}[]} */
  let wrongRefs = [];
  /** 틀린 문제 다시보기 모드 */
  let reviewMode = false;
  /** 오답노트에서 시작한 퀴즈 */
  let notebookMode = false;
  /** 혼합/모의 시험 여부 */
  let examMode = false;
  /** @type {{subjectId:string,id:string,selected:number|null,correct:boolean,answered:boolean}[]} */
  let sessionAnswers = [];
  /** 중간 제출 후 결과 화면인지 */
  let midSubmit = false;
  /** pending subject for count picker */
  let pendingSubjectId = null;
  /**
   * Session-local map: question index → { correct, subjectId }
   * Prevents double-counting the same item in one session when re-grading.
   */
  let sessionStatsRecorded = {};

  const $ = (sel) => document.querySelector(sel);
  const el = {
    home: $("#screen-home"),
    count: $("#screen-count"),
    examConfig: $("#screen-exam-config"),
    quiz: $("#screen-quiz"),
    end: $("#screen-end"),
    subjectList: $("#subject-list"),
    countSubjectName: $("#count-subject-name"),
    countOptions: $("#count-options"),
    customCounts: $("#custom-counts"),
    customCountList: $("#custom-count-list"),
    inputPractical: $("#input-practical"),
    customTotal: $("#custom-total"),
    progressLabel: $("#progress-label"),
    scoreLabel: $("#score-label"),
    progressFill: $("#progress-fill"),
    questionTag: $("#question-tag"),
    stem: $("#question-stem"),
    imageWrap: $("#question-image-wrap"),
    image: $("#question-image"),
    choices: $("#choices"),
    feedback: $("#feedback"),
    btnPrev: $("#btn-prev"),
    btnNext: $("#btn-next"),
    btnSubmit: $("#btn-submit"),
    btnResume: $("#btn-resume"),
    endTitle: $("#end-title"),
    endScore: $("#end-score"),
    endPct: $("#end-pct"),
    endPassHint: $("#end-pass-hint"),
    endAnalytics: $("#end-analytics"),
    endBreakdown: $("#end-breakdown"),
    endSummary: $("#end-summary"),
    btnRetryWrong: $("#btn-retry-wrong"),
    btnHome: $("#btn-home"),
    btnEndHome: $("#btn-end-home"),
    btnNational: $("#btn-national"),
    btnCountBack: $("#btn-count-back"),
    btnExamBack: $("#btn-exam-back"),
    btnToggleCustom: $("#btn-toggle-custom"),
    btnExamStart: $("#btn-exam-start"),
    studyDashboard: $("#study-dashboard"),
    statDays: $("#stat-days"),
    statAttempted: $("#stat-attempted"),
    statCorrect: $("#stat-correct"),
    statWrong: $("#stat-wrong"),
    statAccuracy: $("#stat-accuracy"),
    statPass: $("#stat-pass"),
    statSeok: $("#stat-seok"),
    statPassNote: $("#stat-pass-note"),
    statTip: $("#stat-tip"),
    statToday: $("#stat-today"),
    statTodayAcc: $("#stat-today-acc"),
    statStreak: $("#stat-streak"),
    statDday: $("#stat-dday"),
    inputExamDate: $("#input-exam-date"),
    subjectProgress: $("#subject-progress"),
    statGoal: $("#stat-goal"),
    statCoach: $("#stat-coach"),
    endSeokNudge: $("#end-seok-nudge"),
    btnStatsReset: $("#btn-stats-reset"),
    btnNotebook: $("#btn-notebook"),
    notebook: $("#screen-notebook"),
    notebookList: $("#notebook-list"),
    notebookEmpty: $("#notebook-empty"),
    btnNotebookBack: $("#btn-notebook-back"),
    btnNotebookQuizAll: $("#btn-notebook-quiz-all"),
    todayLesson: $("#today-lesson"),
    lessonCoach: $("#lesson-coach"),
    lessonPlan: $("#lesson-plan"),
    btnTodayLesson: $("#btn-today-lesson"),
  };

  function subjectName(id) {
    const s = SUBJECTS.find((x) => x.id === id);
    return s ? s.name : id;
  }

  function showScreen(name) {
    screen = name;
    el.home.classList.toggle("active", name === "home");
    el.count.classList.toggle("active", name === "count");
    el.examConfig.classList.toggle("active", name === "exam-config");
    el.quiz.classList.toggle("active", name === "quiz");
    el.end.classList.toggle("active", name === "end");
    if (el.notebook) el.notebook.classList.toggle("active", name === "notebook");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Shuffle choices once per session item and remap answerIndex + explainWrong
   * so the correct option is equally likely in any slot. Does not mutate the bank.
   */
  function shuffleQuestionChoices(q) {
    const n = (q.choices && q.choices.length) || 0;
    const indices = [];
    for (let i = 0; i < n; i++) indices.push(i);
    const order = shuffle(indices);
    const choices = order.map((i) => q.choices[i]);
    const ewSrc = q.explainWrong || [];
    const explainWrong = order.map((i) => ewSrc[i] || "");
    let answerIndex = 0;
    for (let j = 0; j < order.length; j++) {
      if (order[j] === q.answerIndex) {
        answerIndex = j;
        break;
      }
    }
    return Object.assign({}, q, {
      choices: choices,
      explainWrong: explainWrong,
      answerIndex: answerIndex,
      _shuffled: true,
    });
  }

  /** Sample n items without replacement */
  function sampleN(arr, n) {
    if (n <= 0) return [];
    const shuffled = shuffle(arr);
    return shuffled.slice(0, Math.min(n, shuffled.length));
  }

  function loadSavedCounts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function saveCounts(counts, practical) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ counts: counts, practical: practical })
      );
    } catch (_) {
      /* ignore */
    }
  }


  function emptyStats() {
    return {
      days: {},
      totals: { attempted: 0, correct: 0, wrong: 0 },
      bySubject: {},
      updatedAt: null,
    };
  }

  function loadStudyStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return emptyStats();
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyStats();
      return {
        days: data.days && typeof data.days === "object" ? data.days : {},
        totals: {
          attempted: Math.max(0, Number(data.totals && data.totals.attempted) || 0),
          correct: Math.max(0, Number(data.totals && data.totals.correct) || 0),
          wrong: Math.max(0, Number(data.totals && data.totals.wrong) || 0),
        },
        bySubject:
          data.bySubject && typeof data.bySubject === "object" ? data.bySubject : {},
        updatedAt: data.updatedAt || null,
      };
    } catch (_) {
      return emptyStats();
    }
  }

  function saveStudyStats(stats) {
    try {
      stats.updatedAt = new Date().toISOString();
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function ensureDay(stats, key) {
    if (!stats.days[key]) {
      stats.days[key] = { attempted: 0, correct: 0, wrong: 0 };
    }
    return stats.days[key];
  }

  function ensureSubject(stats, sid) {
    if (!stats.bySubject[sid]) {
      stats.bySubject[sid] = { attempted: 0, correct: 0 };
    }
    return stats.bySubject[sid];
  }

  /**
   * Record one graded answer into cumulative study stats.
   * Same session index is not double-counted; re-grade adjusts correct/wrong only.
   */
  function recordGradedAnswer(sessionIndex, subjectId, isCorrect) {
    const sid = subjectId || "unknown";
    const prev = sessionStatsRecorded[sessionIndex];
    if (prev && prev.correct === isCorrect && prev.subjectId === sid) {
      return;
    }

    const stats = loadStudyStats();
    const day = ensureDay(stats, todayKey());
    const sub = ensureSubject(stats, sid);

    if (!prev) {
      stats.totals.attempted += 1;
      day.attempted += 1;
      sub.attempted += 1;
      if (isCorrect) {
        stats.totals.correct += 1;
        day.correct += 1;
        sub.correct += 1;
      } else {
        stats.totals.wrong += 1;
        day.wrong += 1;
      }
    } else {
      // Re-grade same item in this session: flip correctness, keep attempted.
      if (prev.correct && !isCorrect) {
        stats.totals.correct -= 1;
        day.correct -= 1;
        const prevSub = ensureSubject(stats, prev.subjectId);
        prevSub.correct = Math.max(0, prevSub.correct - 1);
        stats.totals.wrong += 1;
        day.wrong += 1;
      } else if (!prev.correct && isCorrect) {
        stats.totals.wrong = Math.max(0, stats.totals.wrong - 1);
        day.wrong = Math.max(0, day.wrong - 1);
        stats.totals.correct += 1;
        day.correct += 1;
        sub.correct += 1;
        if (prev.subjectId !== sid) {
          const prevSub = ensureSubject(stats, prev.subjectId);
          /* attempted stays on original subject if subject somehow changes */
        }
      }
      // Clamp non-negative
      stats.totals.correct = Math.max(0, stats.totals.correct);
      stats.totals.wrong = Math.max(0, stats.totals.wrong);
      day.correct = Math.max(0, day.correct);
      day.wrong = Math.max(0, day.wrong);
    }

    sessionStatsRecorded[sessionIndex] = { correct: isCorrect, subjectId: sid };
    saveStudyStats(stats);
  }

  /** Flush any answered-but-not-yet-recorded items (mid-submit / full end safety). */
  function syncSessionStats() {
    sessionAnswers.forEach((a, i) => {
      if (!a || !a.answered) return;
      const q = questionList[i] || {};
      const sid = a.subjectId || q.subjectId || subjectId || "unknown";
      recordGradedAnswer(i, sid, !!a.correct);
    });
  }

  function clearStudyStats() {
    sessionStatsRecorded = {};
    try {
      localStorage.removeItem(STATS_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function sumWindow(stats, dayKeys) {
    let attempted = 0;
    let correct = 0;
    dayKeys.forEach((k) => {
      const d = stats.days[k];
      if (!d) return;
      attempted += d.attempted || 0;
      correct += d.correct || 0;
    });
    return { attempted: attempted, correct: correct };
  }

  function lastNDayKeys(n) {
    const keys = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      keys.push(y + "-" + m + "-" + day);
    }
    return keys;
  }

  /**
   * 합격 가능도 (연습 추정) — NOT an official prediction.
   *
   * Formula (clamp 0–99):
   *   accuracy = recent7d accuracy if recentAttempted >= 10, else all-time
   *   accPts      = accuracy * 55          // 0–55  (국시 총점 60% 바에 가중)
   *   coveragePts = (subjectsAttempted/9) * 20  // 0–20
   *   floorPts    = avg(subject meets ~40% floor among attempted subjects) * 15  // 0–15
   *   volumePts   = min(9, totals.attempted / 40)  // 0–9 volume bonus (cap)
   *   barBonus    = (accuracy >= 0.60 ? 5 : 0)     // overall ≥60% nudge
   *   score = floor(accPts + coveragePts + floorPts + volumePts + barBonus)
   */
  function computePassReadiness(stats) {
    const totals = stats.totals;
    const allAttempted = totals.attempted || 0;
    const allCorrect = totals.correct || 0;
    const allAcc = allAttempted > 0 ? allCorrect / allAttempted : 0;

    const weekKeys = lastNDayKeys(7);
    const recent = sumWindow(stats, weekKeys);
    const useRecent = recent.attempted >= 10;
    const accuracy = useRecent
      ? recent.correct / recent.attempted
      : allAcc;

    let subjectsAttempted = 0;
    let floorHits = 0;
    let floorDenom = 0;
    let weakest = null; // { id, pct, attempted }
    STATS_SUBJECT_IDS.forEach((id) => {
      const st = stats.bySubject[id];
      if (!st || !st.attempted) return;
      subjectsAttempted += 1;
      const pct = st.correct / st.attempted;
      floorDenom += 1;
      if (pct >= 0.4) floorHits += 1;
      if (
        !weakest ||
        pct < weakest.pct ||
        (pct === weakest.pct && st.attempted > weakest.attempted)
      ) {
        weakest = { id: id, pct: pct, attempted: st.attempted };
      }
    });

    const coverage = subjectsAttempted / STATS_SUBJECT_IDS.length;
    const floorRate = floorDenom > 0 ? floorHits / floorDenom : 0;

    const accPts = accuracy * 55;
    const coveragePts = coverage * 20;
    const floorPts = floorRate * 15;
    const volumePts = Math.min(9, allAttempted / 40);
    const barBonus = accuracy >= 0.6 ? 5 : 0;

    let score = Math.floor(accPts + coveragePts + floorPts + volumePts + barBonus);
    if (allAttempted === 0) score = 0;
    score = Math.max(0, Math.min(99, score));

    let tip = "문항을 더 풀어보세요";
    if (allAttempted === 0) {
      tip = "문항을 더 풀어보세요";
    } else if (weakest && weakest.pct < 0.6) {
      tip = "취약: " + subjectName(weakest.id);
    } else if (subjectsAttempted < STATS_SUBJECT_IDS.length) {
      tip = "여러 과목을 골고루 풀어보세요";
    } else if (accuracy < 0.6) {
      tip = "정답률을 60% 이상으로 올려보세요";
    } else {
      tip = "좋은 페이스입니다. 꾸준히 복습하세요";
    }

    return {
      score: score,
      accuracy: accuracy,
      tip: tip,
      useRecent: useRecent,
      weakest: weakest,
      subjectsAttempted: subjectsAttempted,
    };
  }

  /**
   * 전국수석 가능도 (연습 추정) — NOT an official ranking prediction.
   *
   * Stricter than pass readiness; stays low until elite performance.
   * Formula (clamp 0–99):
   *   Prefer recent accuracy (7d if recentAttempted >= 15, else all-time)
   *   accPts      = ((max(0, accuracy - 0.85) / 0.15) ** 1.5) * 42
   *                 // ~0 below 85%; hard scale toward 90%+ (at 90%≈8, 95%≈26, 100%=42)
   *   coveragePts = (subjectsAttempted / 9) * 18          // need full subject coverage
   *   floorPts    = (subjects with ≥80% among attempted) / attempted * 22
   *   volumePts   = min(14, totals.attempted / 50)         // hundreds of attempts
   *   eliteGate   = (acc≥90% && full 9 subjects && all floors≥80%) ? 6 : 0
   *   nbBonus     = open wrong-notebook items (if NOTEBOOK_KEY):
   *                 0 open → +3; ≤8 → +1; else 0  (low pressure = slight bonus)
   *   score = floor(sum), clamp 0–99; 0 if no attempts
   */
  function computeSeokReadiness(stats) {
    const totals = stats.totals;
    const allAttempted = totals.attempted || 0;
    const allCorrect = totals.correct || 0;
    const allAcc = allAttempted > 0 ? allCorrect / allAttempted : 0;

    const weekKeys = lastNDayKeys(7);
    const recent = sumWindow(stats, weekKeys);
    const useRecent = recent.attempted >= 15;
    const accuracy = useRecent
      ? recent.correct / recent.attempted
      : allAcc;

    let subjectsAttempted = 0;
    let floorHits = 0;
    let floorDenom = 0;
    let weakest = null;
    STATS_SUBJECT_IDS.forEach((id) => {
      const st = stats.bySubject[id];
      if (!st || !st.attempted) return;
      subjectsAttempted += 1;
      const pct = st.correct / st.attempted;
      floorDenom += 1;
      if (pct >= 0.8) floorHits += 1;
      if (
        !weakest ||
        pct < weakest.pct ||
        (pct === weakest.pct && st.attempted > weakest.attempted)
      ) {
        weakest = { id: id, pct: pct, attempted: st.attempted };
      }
    });

    const coverage = subjectsAttempted / STATS_SUBJECT_IDS.length;
    const floorRate = floorDenom > 0 ? floorHits / floorDenom : 0;
    const allFloorsMet = floorDenom > 0 && floorHits === floorDenom;

    const t = Math.max(0, Math.min(1, (accuracy - 0.85) / 0.15));
    const accPts = Math.pow(t, 1.5) * 42;
    const coveragePts = coverage * 18;
    const floorPts = floorRate * 22;
    const volumePts = Math.min(14, allAttempted / 50);
    const eliteGate =
      accuracy >= 0.9 &&
      subjectsAttempted === STATS_SUBJECT_IDS.length &&
      allFloorsMet
        ? 6
        : 0;

    let nbBonus = 0;
    let notebookOpen = 0;
    try {
      const nb = loadNotebook();
      notebookOpen = nb && Array.isArray(nb.items) ? nb.items.length : 0;
      if (allAttempted > 0) {
        if (notebookOpen === 0) nbBonus = 3;
        else if (notebookOpen <= 8) nbBonus = 1;
      }
    } catch (_) {
      nbBonus = 0;
    }

    let score = Math.floor(
      accPts + coveragePts + floorPts + volumePts + eliteGate + nbBonus
    );
    if (allAttempted === 0) score = 0;
    score = Math.max(0, Math.min(99, score));

    // Tip coaches toward 수석
    let tip = "수석 코칭: 문항을 더 풀어 기반을 쌓자";
    if (allAttempted === 0) {
      tip = "수석 코칭: 오늘 한 과목부터 시작하자";
    } else if (notebookOpen >= 5) {
      tip = "오답노트 " + notebookOpen + "문항 복습";
    } else if (weakest && weakest.pct < 0.8) {
      tip = "수석 코칭: 취약 " + subjectName(weakest.id) + " 집중";
    } else if (subjectsAttempted < STATS_SUBJECT_IDS.length) {
      tip = "전 과목 커버";
    } else if (accuracy < 0.9) {
      tip = "정답률 90%+ 유지";
    } else if (notebookOpen > 0) {
      tip = "오답노트 " + notebookOpen + "문항 복습";
    } else {
      tip = "수석 코칭: 고난도·취약 유형을 더 깎자";
    }

    // Warm but firm 선생님 voice — one actionable next step
    let coach = "오늘은 기본 문항부터 차분히 풀어보자.";
    if (allAttempted === 0) {
      coach = "첫걸음이 중요해. 오늘은 한 과목만 제대로 풀자.";
    } else if (notebookOpen >= 8) {
      coach = "오늘은 오답노트부터 다시 풀자. 수석은 틀린 걸 끝까지 잡는 데서 나와.";
    } else if (weakest && weakest.pct < 0.75) {
      const wname = subjectName(weakest.id);
      const sessionHint =
        weakest.id === "clinical-chemistry" ||
        weakest.id === "hematology" ||
        weakest.id === "immuno-transfusion" ||
        weakest.id === "microbiology"
          ? " 2교시 위주로."
          : weakest.id === "medical-law" ||
              weakest.id === "public-health" ||
              weakest.id === "anatomy" ||
              weakest.id === "physiology"
            ? " 1교시 위주로."
            : "";
      coach =
        wname +
        " 정답률이 낮아." +
        sessionHint +
        " 오늘은 여기부터 붙잡자.";
    } else if (subjectsAttempted < STATS_SUBJECT_IDS.length) {
      coach = "빈 과목이 남아 있어. 전 과목 커버 없이 수석은 어렵다고 생각해.";
    } else if (accuracy < 0.9) {
      coach = "정답률을 90% 위로 끌어올리자. 대충 맞힌 문항도 다시 봐.";
    } else if (notebookOpen > 0) {
      coach = "페이스는 좋아. 오답노트 " + notebookOpen + "문항만 오늘 비우자.";
    } else {
      coach = "훌륭해. 오늘은 약한 유형만 골라 한 세트 더 가자.";
    }

    return {
      score: score,
      accuracy: accuracy,
      tip: tip,
      coach: coach,
      useRecent: useRecent,
      weakest: weakest,
      notebookOpen: notebookOpen,
    };
  }

  function emptyNotebook() {
    return { items: [], updatedAt: null };
  }

  function loadNotebook() {
    try {
      const raw = localStorage.getItem(NOTEBOOK_KEY);
      if (!raw) return emptyNotebook();
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyNotebook();
      const items = Array.isArray(data.items) ? data.items : [];
      return {
        items: items.filter(function (it) {
          return it && it.id != null && it.subjectId != null;
        }),
        updatedAt: data.updatedAt || null,
      };
    } catch (_) {
      return emptyNotebook();
    }
  }

  function saveNotebook(nb) {
    try {
      nb.updatedAt = new Date().toISOString();
      localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(nb));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function notebookItemKey(subjectId, id) {
    return String(subjectId) + "::" + String(id);
  }

  /**
   * Upsert a wrong answer into the notebook (dedupe by subjectId+id).
   * Keeps item until the user deletes it — correct later answers do not remove it.
   */
  function upsertWrongNotebookItem(q, sid, wrongChoice) {
    if (!q || q.id == null) return;
    const subjectId = sid || q.subjectId || "unknown";
    const nb = loadNotebook();
    const key = notebookItemKey(subjectId, q.id);
    const now = new Date().toISOString();
    let found = -1;
    for (let i = 0; i < nb.items.length; i++) {
      if (notebookItemKey(nb.items[i].subjectId, nb.items[i].id) === key) {
        found = i;
        break;
      }
    }
    const base = {
      id: q.id,
      subjectId: subjectId,
      stem: q.stem || "",
      choices: Array.isArray(q.choices) ? q.choices.slice() : [],
      answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : 0,
      explainCorrect: q.explainCorrect || "",
      explainWrong: Array.isArray(q.explainWrong) ? q.explainWrong.slice() : [],
      wrongChoice: wrongChoice,
      savedAt: now,
    };
    if (q.image) base.image = q.image;
    if (found >= 0) {
      const prev = nb.items[found];
      base.savedAt = now;
      // Prefer richer snapshot from current question; keep prior image if missing
      if (!base.image && prev.image) base.image = prev.image;
      nb.items[found] = base;
    } else {
      nb.items.push(base);
    }
    saveNotebook(nb);
    updateNotebookButton();
  }

  function removeNotebookItem(subjectId, id) {
    const nb = loadNotebook();
    const key = notebookItemKey(subjectId, id);
    nb.items = nb.items.filter(function (it) {
      return notebookItemKey(it.subjectId, it.id) !== key;
    });
    saveNotebook(nb);
    updateNotebookButton();
  }

  function notebookItemToQuestion(it) {
    const q = {
      id: it.id,
      stem: it.stem,
      choices: Array.isArray(it.choices) ? it.choices.slice() : [],
      answerIndex: it.answerIndex,
      explainCorrect: it.explainCorrect || "",
      explainWrong: Array.isArray(it.explainWrong) ? it.explainWrong.slice() : [],
      subjectId: it.subjectId,
      paperTag: "오답노트",
    };
    if (it.image) q.image = it.image;
    return q;
  }

  function formatNotebookDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function updateNotebookButton() {
    if (!el.btnNotebook) return;
    const n = loadNotebook().items.length;
    el.btnNotebook.textContent = "오답노트 (" + n + ")";
  }

  function renderNotebookScreen() {
    const nb = loadNotebook();
    const items = nb.items.slice().sort(function (a, b) {
      return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
    });
    updateNotebookButton();
    if (el.btnNotebookQuizAll) {
      el.btnNotebookQuizAll.disabled = items.length === 0;
    }
    if (!el.notebookList) return;
    el.notebookList.innerHTML = "";
    if (el.notebookEmpty) {
      el.notebookEmpty.hidden = items.length > 0;
    }
    items.forEach(function (it) {
      const li = document.createElement("li");
      li.className = "notebook-item";
      const head = document.createElement("div");
      head.className = "notebook-item-head";
      const tag = document.createElement("span");
      tag.className = "notebook-tag";
      tag.textContent = subjectName(it.subjectId);
      const date = document.createElement("span");
      date.className = "notebook-date";
      date.textContent = formatNotebookDate(it.savedAt);
      head.appendChild(tag);
      head.appendChild(date);
      const stem = document.createElement("p");
      stem.className = "notebook-stem";
      stem.textContent = it.stem || "";
      const actions = document.createElement("div");
      actions.className = "notebook-item-actions";
      const btnRetry = document.createElement("button");
      btnRetry.type = "button";
      btnRetry.className = "btn btn-primary";
      btnRetry.textContent = "다시 풀기";
      btnRetry.addEventListener("click", function () {
        startNotebookQuiz([it]);
      });
      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-secondary";
      btnDel.textContent = "삭제";
      btnDel.addEventListener("click", function () {
        if (!window.confirm("이 문항을 오답노트에서 삭제할까요?")) return;
        removeNotebookItem(it.subjectId, it.id);
        renderNotebookScreen();
      });
      actions.appendChild(btnRetry);
      actions.appendChild(btnDel);
      li.appendChild(head);
      li.appendChild(stem);
      li.appendChild(actions);
      el.notebookList.appendChild(li);
    });
  }

  function openNotebook() {
    renderNotebookScreen();
    showScreen("notebook");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNotebookQuiz(items) {
    if (!items || !items.length) return;
    const list = shuffle(items.map(notebookItemToQuestion));
    beginSession(list, {
      examMode: false,
      reviewMode: false,
      notebookMode: true,
      subjectId: null,
    });
  }

  function todayLessonDateKey() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch (_) {
      return todayKey();
    }
  }

  function loadTodayLessonCache() {
    try {
      const raw = localStorage.getItem(TODAY_LESSON_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      if (data.date !== todayLessonDateKey()) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function saveTodayLessonCache(meta) {
    try {
      localStorage.setItem(
        TODAY_LESSON_KEY,
        JSON.stringify({
          date: todayLessonDateKey(),
          coach: meta.coach || "",
          planLines: Array.isArray(meta.planLines) ? meta.planLines.slice() : [],
          paperTag: meta.paperTag || "오늘의 수업",
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function lessonTagQuestion(q, sid, label) {
    const out = Object.assign({}, q, {
      subjectId: sid,
      paperTag: "오늘의 수업 · " + label,
    });
    return out;
  }

  function pickReadySubjectIds() {
    return STATS_SUBJECT_IDS.filter(function (id) {
      return (QUESTIONS[id] || []).length > 0;
    });
  }

  /**
   * Curated tutor assignment: notebook + weakest / starter / coverage mix.
   * Target ~15–25 items. Plan text cached per Seoul calendar day.
   */
  function buildTodayLesson() {
    const stats = loadStudyStats();
    const seok = computeSeokReadiness(stats);
    const nb = loadNotebook();
    const attempted = (stats.totals && stats.totals.attempted) || 0;
    const list = [];
    const planLines = [];
    const used = {};
    let coach = seok.coach || "오늘은 선생님이 고른 세트부터 가자.";

    function markUsed(sid, id) {
      used[String(sid) + "::" + String(id)] = true;
    }
    function isUsed(sid, id) {
      return !!used[String(sid) + "::" + String(id)];
    }

    function addNotebookPortion(cap) {
      const items = Array.isArray(nb.items) ? nb.items.slice() : [];
      if (!items.length) return 0;
      const take = Math.min(items.length, Math.max(1, cap));
      const picked = sampleN(items, take);
      picked.forEach(function (it) {
        markUsed(it.subjectId, it.id);
        const q = notebookItemToQuestion(it);
        q.paperTag = "오늘의 수업 · 오답노트";
        list.push(q);
      });
      if (picked.length) {
        planLines.push("오답노트 " + picked.length + "문항");
      }
      return picked.length;
    }

    function addSubjectSample(sid, n, labelPrefix) {
      const bank = QUESTIONS[sid] || [];
      if (!bank.length || n <= 0) return 0;
      const available = bank.filter(function (q) {
        return !isUsed(sid, q.id);
      });
      const picked = sampleN(available, n);
      const label = subjectName(sid);
      picked.forEach(function (q) {
        markUsed(sid, q.id);
        list.push(lessonTagQuestion(q, sid, label));
      });
      if (picked.length) {
        planLines.push(
          (labelPrefix ? labelPrefix + " " : "") + label + " " + picked.length + "문항"
        );
      }
      return picked.length;
    }

    function addPracticalSample(n) {
      const bank = QUESTIONS[PRACTICAL_BANK_ID] || [];
      if (!bank.length || n <= 0) return 0;
      const picked = sampleN(bank, n);
      picked.forEach(function (q) {
        const sid = q.major || PRACTICAL_BANK_ID;
        list.push(
          Object.assign({}, q, {
            subjectId: sid,
            paperTag: "오늘의 수업 · 실기",
            isPractical: true,
          })
        );
      });
      if (picked.length) {
        planLines.push("실기 " + picked.length + "문항");
      }
      return picked.length;
    }

    function undercoveredSubjectId() {
      let best = null;
      let bestAtt = Infinity;
      pickReadySubjectIds().forEach(function (id) {
        const st = stats.bySubject[id];
        const att = st ? st.attempted || 0 : 0;
        if (att < bestAtt) {
          bestAtt = att;
          best = id;
        }
      });
      return best;
    }

    if (attempted === 0 && (!nb.items || nb.items.length === 0)) {
      const starters = ["medical-law", "anatomy"].filter(function (id) {
        return (QUESTIONS[id] || []).length > 0;
      });
      const sid = starters[0] || pickReadySubjectIds()[0] || null;
      if (sid) {
        addSubjectSample(sid, 15, "입문");
        coach =
          "첫걸음이 중요해. 오늘은 " +
          subjectName(sid) +
          "부터 차분히 풀어보자.";
      }
    } else if (seok.notebookOpen >= 1 && nb.items && nb.items.length > 0) {
      // Notebook first, capped ~8–12 of the mix
      const nbCap = Math.min(12, nb.items.length);
      addNotebookPortion(nbCap);
      const room = Math.max(0, 25 - list.length);
      if (seok.weakest && (QUESTIONS[seok.weakest.id] || []).length > 0 && room > 0) {
        const weakTake = Math.min(15, Math.max(list.length >= 15 ? Math.min(10, room) : 10, room));
        addSubjectSample(seok.weakest.id, Math.min(weakTake, room), "약점");
      }
      if (list.length < 15) {
        const fillId =
          undercoveredSubjectId() ||
          (seok.weakest && seok.weakest.id) ||
          pickReadySubjectIds()[0];
        if (fillId) {
          addSubjectSample(fillId, 15 - list.length, "보충");
        }
      }
      coach = seok.coach;
    } else if (seok.weakest && seok.weakest.pct < 0.8) {
      addSubjectSample(seok.weakest.id, 15, "약점");
      if ((QUESTIONS[PRACTICAL_BANK_ID] || []).length > 0 && list.length < 20) {
        addPracticalSample(Math.min(5, 25 - list.length));
      }
      coach = seok.coach;
    } else {
      // All strong + empty notebook: undercovered / weakest-ish 15 + optional 실기 5
      const pickId =
        undercoveredSubjectId() ||
        (seok.weakest && seok.weakest.id) ||
        pickReadySubjectIds()[0];
      if (pickId) {
        addSubjectSample(pickId, 15, "집중");
      }
      if ((QUESTIONS[PRACTICAL_BANK_ID] || []).length > 0) {
        addPracticalSample(5);
      }
      coach = seok.coach || "페이스는 좋아. 오늘은 약한 유형과 실기를 섞어 한 세트 가자.";
    }

    if (list.length === 0) {
      const fallback = pickReadySubjectIds()[0];
      if (fallback) {
        addSubjectSample(fallback, 15, "입문");
        coach = "오늘은 " + subjectName(fallback) + "부터 시작하자.";
      }
    }

    let finalList = shuffle(list);
    if (finalList.length > 25) {
      finalList = finalList.slice(0, 25);
    }

    return {
      list: finalList,
      planLines: planLines,
      coach: coach,
      paperTag: "오늘의 수업",
    };
  }

  function resolveTodayLessonMeta() {
    const cached = loadTodayLessonCache();
    if (cached && cached.planLines && cached.planLines.length) {
      return {
        coach: cached.coach,
        planLines: cached.planLines,
        paperTag: cached.paperTag || "오늘의 수업",
        fromCache: true,
      };
    }
    const built = buildTodayLesson();
    saveTodayLessonCache(built);
    return {
      coach: built.coach,
      planLines: built.planLines,
      paperTag: built.paperTag,
      list: built.list,
      fromCache: false,
    };
  }

  function renderTodayLesson() {
    if (!el.todayLesson) return;
    const meta = resolveTodayLessonMeta();
    if (el.lessonCoach) {
      el.lessonCoach.textContent = meta.coach || "약점과 오답을 보고 수업을 배정합니다.";
    }
    if (el.lessonPlan) {
      el.lessonPlan.innerHTML = "";
      (meta.planLines || []).forEach(function (line) {
        const li = document.createElement("li");
        li.textContent = line;
        el.lessonPlan.appendChild(li);
      });
      if (!(meta.planLines && meta.planLines.length)) {
        const li = document.createElement("li");
        li.textContent = "준비된 문항으로 수업을 구성합니다.";
        el.lessonPlan.appendChild(li);
      }
    }
    if (el.btnTodayLesson) {
      const ready = pickReadySubjectIds().length > 0 ||
        (QUESTIONS[PRACTICAL_BANK_ID] || []).length > 0 ||
        loadNotebook().items.length > 0;
      el.btnTodayLesson.disabled = !ready;
    }
  }

  function startTodayLesson() {
    const built = buildTodayLesson();
    // Keep same-day plan text stable; list may refresh on start
    const cached = loadTodayLessonCache();
    if (!cached) {
      saveTodayLessonCache(built);
    }
    if (!built.list || !built.list.length) return;
    beginSession(built.list, {
      examMode: false,
      reviewMode: false,
      notebookMode: false,
      subjectId: null,
    });
  }

  /** 연속 학습일 — 오늘(또는 오늘 아직 안 풀었으면 어제)까지 이어진 연속 일수 */
  function computeStreak(stats) {
    const practiced = function (d) {
      const rec = stats.days[d];
      return !!(rec && (rec.attempted || 0) > 0);
    };
    const keyOf = function (offset) {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
      );
    };
    let offset = practiced(keyOf(0)) ? 0 : 1;
    let streak = 0;
    while (practiced(keyOf(offset))) {
      streak += 1;
      offset += 1;
    }
    return streak;
  }

  function loadExamDate() {
    try {
      const v = localStorage.getItem(EXAM_DATE_KEY);
      return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    } catch (_) {
      return null;
    }
  }

  function saveExamDate(v) {
    try {
      if (v) localStorage.setItem(EXAM_DATE_KEY, v);
      else localStorage.removeItem(EXAM_DATE_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function renderDday() {
    if (!el.statDday) return;
    const examDate = loadExamDate();
    if (el.inputExamDate && examDate) el.inputExamDate.value = examDate;
    if (!examDate) {
      el.statDday.textContent = "미설정";
      el.statDday.classList.remove("is-soon", "is-past");
      return;
    }
    const parts = examDate.split("-").map(Number);
    const target = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((target - today) / 86400000);
    el.statDday.classList.remove("is-soon", "is-past");
    if (diff > 0) {
      el.statDday.textContent = "D-" + diff;
      if (diff <= 30) el.statDday.classList.add("is-soon");
    } else if (diff === 0) {
      el.statDday.textContent = "D-DAY";
      el.statDday.classList.add("is-soon");
    } else {
      el.statDday.textContent = "종료 (D+" + -diff + ")";
      el.statDday.classList.add("is-past");
    }
  }

  /** 홈 대시보드 과목별 누적 정답률 바 — 행을 누르면 그 과목 연습 시작 */
  function renderSubjectProgress(stats) {
    if (!el.subjectProgress) return;
    el.subjectProgress.innerHTML = "";
    STATS_SUBJECT_IDS.forEach(function (id) {
      const st = stats.bySubject[id];
      const attempted = st ? st.attempted || 0 : 0;
      const correct = st ? st.correct || 0 : 0;
      const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "subject-progress-row" + (pct === null ? " is-empty" : "");
      const barClass =
        pct === null ? "" : pct >= 70 ? "is-strong" : pct >= 40 ? "is-mid" : "is-weak";
      row.innerHTML =
        '<span class="sp-head"><span class="sp-name">' +
        escapeHtml(subjectName(id)) +
        '</span><span class="sp-score">' +
        (pct === null ? "미응시" : correct + "/" + attempted + " · " + pct + "%") +
        "</span></span>" +
        '<span class="chart-bar-track"><span class="chart-bar-fill ' +
        barClass +
        '" style="width:' +
        (pct === null ? 0 : pct) +
        '%"></span></span>';
      row.addEventListener("click", function () {
        openCountPicker(id);
      });
      el.subjectProgress.appendChild(row);
    });
  }

  function renderStudyDashboard() {
    if (!el.studyDashboard) return;
    const stats = loadStudyStats();
    const daysPracticed = Object.keys(stats.days).filter((k) => {
      const d = stats.days[k];
      return d && (d.attempted || 0) > 0;
    }).length;
    const attempted = stats.totals.attempted || 0;
    const correct = stats.totals.correct || 0;
    const wrong = stats.totals.wrong || 0;
    const accPct = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
    const pass = computePassReadiness(stats);
    const seok = computeSeokReadiness(stats);

    if (el.statDays) el.statDays.textContent = String(daysPracticed);
    if (el.statAttempted) el.statAttempted.textContent = String(attempted);
    if (el.statCorrect) el.statCorrect.textContent = String(correct);
    if (el.statWrong) el.statWrong.textContent = String(wrong);
    if (el.statAccuracy) {
      el.statAccuracy.textContent = accPct === null ? "—" : accPct + "%";
    }
    if (el.statPass) el.statPass.textContent = pass.score + "%";
    if (el.statSeok) el.statSeok.textContent = seok.score + "%";
    if (el.statPassNote) {
      const recentBit = seok.useRecent
        ? " (수석: 최근 7일 정답률 반영)"
        : pass.useRecent
          ? " (합격: 최근 7일 정답률 반영)"
          : "";
      el.statPassNote.textContent =
        "연습용 추정이며 공식 합격·순위 예측이 아닙니다." + recentBit;
    }
    if (el.statTip) el.statTip.textContent = seok.tip;
    const todayRec = stats.days[todayKey()] || { attempted: 0, correct: 0 };
    if (el.statToday) el.statToday.textContent = String(todayRec.attempted || 0);
    if (el.statTodayAcc) {
      el.statTodayAcc.textContent =
        (todayRec.attempted || 0) > 0
          ? Math.round(((todayRec.correct || 0) / todayRec.attempted) * 100) + "%"
          : "—";
    }
    if (el.statStreak) el.statStreak.textContent = computeStreak(stats) + "일";
    renderDday();
    renderSubjectProgress(stats);
    if (el.statGoal) el.statGoal.textContent = "목표: 전국수석";
    if (el.statCoach) {
      el.statCoach.hidden = false;
      el.statCoach.innerHTML =
        '<span class="study-coach-label">선생님</span>' +
        escapeHtml(seok.coach);
    }
    updateNotebookButton();
    renderTodayLesson();
  }

  function onResetStats() {
    if (
      !window.confirm(
        "학습 기록(일수·푼 문항·합격·수석 가능도)을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }
    clearStudyStats();
    renderStudyDashboard();
  }


  function defaultCounts() {
    const saved = loadSavedCounts();
    if (saved && saved.counts) {
      const c = {};
      MAJOR_IDS.forEach((id) => {
        c[id] = Math.max(0, Number(saved.counts[id]) || 0);
      });
      return {
        counts: c,
        practical: Math.max(0, Number(saved.practical) || 0),
      };
    }
    return { counts: Object.assign({}, PRESET_WRITTEN), practical: PRESET_WRITTEN_PRACTICAL };
  }

  function renderHome() {
    renderStudyDashboard();
    el.subjectList.innerHTML = "";
    SUBJECTS.forEach((sub) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "subject-btn";
      const ready = sub.status === "ready";
      btn.disabled = !ready;
      const count =
        ready && QUESTIONS[sub.id]
          ? QUESTIONS[sub.id].length + "문항"
          : sub.description;
      btn.innerHTML =
        '<span class="name">' +
        escapeHtml(sub.name) +
        "</span>" +
        '<span class="meta">' +
        escapeHtml(count) +
        "</span>" +
        '<span class="badge ' +
        (ready ? "badge-ready" : "badge-prep") +
        '">' +
        (ready ? "응시 가능" : "준비중") +
        "</span>";
      if (ready) {
        btn.addEventListener("click", () => openCountPicker(sub.id));
      }
      li.appendChild(btn);
      el.subjectList.appendChild(li);
    });
    showScreen("home");
  }

  function openCountPicker(id) {
    pendingSubjectId = id;
    const bank = QUESTIONS[id] || [];
    el.countSubjectName.textContent = subjectName(id);
    el.countOptions.innerHTML = "";
    SUBJECT_COUNT_PRESETS.forEach((n) => {
      if (n > bank.length) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "count-opt-btn";
      btn.textContent = n + "문항";
      btn.addEventListener("click", () => startSubjectPractice(id, n));
      el.countOptions.appendChild(btn);
    });
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "count-opt-btn count-opt-all";
    allBtn.textContent = "전체 (" + bank.length + ")";
    allBtn.addEventListener("click", () => startSubjectPractice(id, bank.length));
    el.countOptions.appendChild(allBtn);
    showScreen("count");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startSubjectPractice(id, n) {
    const bank = QUESTIONS[id] || [];
    const isPrac = id === PRACTICAL_BANK_ID;
    const picked = sampleN(bank, n).map((q) =>
      Object.assign({}, q, {
        subjectId: isPrac ? (q.major || PRACTICAL_BANK_ID) : id,
        paperTag: isPrac
          ? "실기 · " + subjectName(q.major || id)
          : subjectName(id),
        isPractical: isPrac,
      })
    );
    beginSession(picked, {
      examMode: false,
      reviewMode: false,
      subjectId: id,
    });
  }

  function openExamConfig() {
    if (el.customCounts) el.customCounts.classList.remove("hidden");
    renderCustomCountInputs(defaultCounts());
    showScreen("exam-config");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCustomCountInputs(state) {
    el.customCountList.innerHTML = "";
    MAJOR_IDS.forEach((id) => {
      const li = document.createElement("li");
      li.className = "custom-row";
      const bankLen = (QUESTIONS[id] || []).length;
      li.innerHTML =
        "<label for=\"input-" +
        id +
        '">' +
        escapeHtml(subjectName(id)) +
        ' <span class="bank-cap">/ ' +
        bankLen +
        "</span></label>" +
        '<div class="stepper">' +
        '<button type="button" class="step-btn" data-step="-1" data-for="' +
        id +
        '" aria-label="감소">−</button>' +
        '<input type="number" id="input-' +
        id +
        '" min="0" max="' +
        bankLen +
        '" inputmode="numeric" value="' +
        (state.counts[id] || 0) +
        '" />' +
        '<button type="button" class="step-btn" data-step="1" data-for="' +
        id +
        '" aria-label="증가">+</button>' +
        "</div>";
      el.customCountList.appendChild(li);
    });
    el.inputPractical.value = String(state.practical || 0);
    el.inputPractical.max = String(totalBankSize());
    wireSteppers();
    updateCustomTotal();
  }

  function totalBankSize() {
    return ((QUESTIONS[PRACTICAL_BANK_ID] && QUESTIONS[PRACTICAL_BANK_ID].length) || 0);
  }

  function readCustomState() {
    const counts = {};
    MAJOR_IDS.forEach((id) => {
      const input = document.getElementById("input-" + id);
      const bankLen = (QUESTIONS[id] || []).length;
      let v = input ? parseInt(input.value, 10) : 0;
      if (isNaN(v) || v < 0) v = 0;
      if (v > bankLen) v = bankLen;
      counts[id] = v;
      if (input) input.value = String(v);
    });
    let practical = parseInt(el.inputPractical.value, 10);
    if (isNaN(practical) || practical < 0) practical = 0;
    const maxP = totalBankSize();
    if (practical > maxP) practical = maxP;
    el.inputPractical.value = String(practical);
    return { counts: counts, practical: practical };
  }

  function updateCustomTotal() {
    const s = readCustomState();
    const majorSum = MAJOR_IDS.reduce((a, id) => a + s.counts[id], 0);
    const total = majorSum + s.practical;
    el.customTotal.textContent =
      "합계 " +
      total +
      "문항 (필기 " +
      majorSum +
      " + 실기 " +
      s.practical +
      ")";
  }

  function wireSteppers() {
    el.examConfig.querySelectorAll(".step-btn").forEach((btn) => {
      btn.onclick = () => {
        const forId = btn.getAttribute("data-for");
        const step = Number(btn.getAttribute("data-step"));
        const input =
          forId === "practical"
            ? el.inputPractical
            : document.getElementById("input-" + forId);
        if (!input) return;
        let v = parseInt(input.value, 10) || 0;
        v += step;
        if (v < 0) v = 0;
        const max =
          forId === "practical"
            ? totalBankSize()
            : (QUESTIONS[forId] || []).length;
        if (v > max) v = max;
        input.value = String(v);
        updateCustomTotal();
      };
    });
    el.examConfig.querySelectorAll('input[type="number"]').forEach((inp) => {
      inp.oninput = updateCustomTotal;
      inp.onchange = updateCustomTotal;
    });
  }

  function applyPreset(key) {
    let counts;
    let practical;
    if (key === "S1") {
      counts = Object.assign({}, PRESET_S1);
      practical = PRESET_S1_PRACTICAL;
    } else if (key === "S2") {
      counts = Object.assign({}, PRESET_S2);
      practical = PRESET_S2_PRACTICAL;
    } else if (key === "S3") {
      counts = Object.assign({}, PRESET_S3);
      practical = PRESET_S3_PRACTICAL;
    } else if (key === "WRITTEN") {
      counts = Object.assign({}, PRESET_WRITTEN);
      practical = PRESET_WRITTEN_PRACTICAL;
    } else if (key === "FULL") {
      counts = Object.assign({}, PRESET_FULL);
      practical = PRESET_FULL_PRACTICAL;
    } else {
      return;
    }
    saveCounts(counts, practical);
    startExamSession(counts, practical);
  }

  /**
   * Build mixed exam paper.
   * Major draws per subject, then optional practical sample from image bank.
   * Full shuffle for CBT feel.
   */
  function buildExamPaper(counts, practical) {
    const usedKeys = new Set();
    const paper = [];

    MAJOR_IDS.forEach((id) => {
      const n = counts[id] || 0;
      if (n <= 0) return;
      const bank = QUESTIONS[id] || [];
      const available = bank.filter((q) => !usedKeys.has(id + "::" + q.id));
      const picked = sampleN(available, n);
      picked.forEach((q) => {
        usedKeys.add(id + "::" + q.id);
        paper.push(
          Object.assign({}, q, {
            subjectId: id,
            paperTag: subjectName(id),
            isPractical: false,
          })
        );
      });
    });

    if (practical > 0) {
      const bank = QUESTIONS[PRACTICAL_BANK_ID] || [];
      const available = bank.filter(
        (q) => !usedKeys.has(PRACTICAL_BANK_ID + "::" + q.id)
      );
      sampleN(available, practical).forEach((q) => {
        const major = q.major || PRACTICAL_BANK_ID;
        usedKeys.add(PRACTICAL_BANK_ID + "::" + q.id);
        paper.push(
          Object.assign({}, q, {
            subjectId: major,
            paperTag: "실기 · " + subjectName(major),
            isPractical: true,
          })
        );
      });
    }

    return shuffle(paper);
  }

  function startExamSession(counts, practical) {
    saveCounts(counts, practical);
    const paper = buildExamPaper(counts, practical);
    if (paper.length === 0) {
      renderHome();
      return;
    }
    beginSession(paper, {
      examMode: true,
      reviewMode: false,
      subjectId: null,
    });
  }

  function beginSession(list, opts) {
    questionList = list.map((q) =>
      q && q._shuffled ? q : shuffleQuestionChoices(q)
    );
    examMode = !!opts.examMode;
    reviewMode = !!opts.reviewMode;
    notebookMode = !!opts.notebookMode;
    subjectId = opts.subjectId || null;
    if (!reviewMode) {
      wrongRefs = [];
    }
    sessionAnswers = questionList.map((q) => ({
      subjectId: q.subjectId || subjectId || "unknown",
      id: q.id,
      selected: null,
      correct: false,
      answered: false,
    }));
    midSubmit = false;
    sessionStatsRecorded = {};
    index = 0;
    score = 0;
    answered = false;
    showScreen("quiz");
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startReviewWrong() {
    if (!wrongRefs.length) return;
    const list = [];
    wrongRefs.forEach((ref) => {
      if (ref.question && ref.question._shuffled) {
        list.push(ref.question);
        return;
      }
      const bank = QUESTIONS[ref.subjectId] || [];
      const q = bank.find((x) => x.id === ref.id);
      if (q) {
        list.push(
          Object.assign({}, q, {
            subjectId: ref.subjectId,
            paperTag: subjectName(ref.subjectId),
            isPractical: false,
          })
        );
      }
    });
    if (!list.length) return;
    beginSession(shuffle(list), {
      examMode: examMode,
      reviewMode: true,
      subjectId: subjectId,
    });
  }

  function recomputeScore() {
    score = sessionAnswers.reduce((n, a) => n + (a.answered && a.correct ? 1 : 0), 0);
    el.scoreLabel.textContent = "점수 " + score;
  }

  function updateWrongRefsFromSession() {
    if (reviewMode) return;
    const next = [];
    const seen = new Set();
    sessionAnswers.forEach((a, i) => {
      if (!a.answered || a.correct) return;
      const q = questionList[i];
      const sid = a.subjectId || (q && q.subjectId) || subjectId;
      const key = sid + "::" + a.id;
      if (seen.has(key)) return;
      seen.add(key);
      next.push({ subjectId: sid, id: a.id, question: q });
    });
    wrongRefs = next;
  }

  function updateNavButtons() {
    const total = questionList.length;
    const atFirst = index <= 0;
    const atLast = index >= total - 1;
    if (el.btnPrev) {
      el.btnPrev.disabled = atFirst;
      el.btnPrev.classList.remove("btn-hidden");
    }
    if (el.btnNext) {
      el.btnNext.classList.remove("btn-hidden");
      if (atLast) {
        el.btnNext.textContent = "결과 보기";
        el.btnNext.disabled = false;
      } else {
        el.btnNext.textContent = "다음 문제";
        el.btnNext.disabled = false;
      }
    }
  }

  function clearChoiceExplains() {
    el.choices.querySelectorAll(".choice-explain").forEach((node) => {
      node.remove();
    });
  }

  function insertChoiceExplain(li, kind, title, body) {
    const div = document.createElement("div");
    div.className = "choice-explain choice-explain--" + kind;
    div.innerHTML =
      '<div class="choice-explain-label">' +
      escapeHtml(title) +
      '</div><p class="choice-explain-body">' +
      escapeHtml(body) +
      "</p>";
    li.appendChild(div);
    return div;
  }

  /**
   * Restore graded highlights + under-choice explanations.
   * @param {{scroll?: boolean}} [opts] scroll=true scrolls correct choice into view (wrong answers).
   */
  function applyGradedState(q, selected, opts) {
    opts = opts || {};
    const correct = q.answerIndex;
    const isCorrect = selected === correct;
    const buttons = el.choices.querySelectorAll(".choice-btn");
    buttons.forEach((btn) => {
      // 채점 후에는 잠금 — 정답 공개 후 재선택으로 통계가 부풀지 않도록
      btn.disabled = true;
      btn.classList.remove("correct", "wrong-selected", "dimmed");
      const i = Number(btn.dataset.index);
      if (i === correct) {
        btn.classList.add("correct");
      } else if (i === selected && !isCorrect) {
        btn.classList.add("wrong-selected");
      } else {
        btn.classList.add("dimmed");
      }
    });
    renderFeedback(q, selected, isCorrect, opts);
  }

  function renderFeedback(q, selected, isCorrect, opts) {
    opts = opts || {};
    clearChoiceExplains();

    const correct = q.answerIndex;
    const correctLabel = NUM_LABELS[correct];
    const items = el.choices.querySelectorAll("li");
    let correctExplainEl = null;

    const correctLi = items[correct];
    const whyCorrect = q.explainCorrect || "";
    if (correctLi && whyCorrect) {
      correctExplainEl = insertChoiceExplain(
        correctLi,
        "correct",
        "정답 해설",
        whyCorrect
      );
    }

    // Compact result only — do not repeat the explanation here.
    el.feedback.innerHTML =
      '<div class="feedback-result ' +
      (isCorrect ? "is-correct" : "is-wrong") +
      '">' +
      (isCorrect ? "정답" : "오답") +
      '</div><p class="feedback-answer">정답: ' +
      correctLabel +
      "</p>";
    el.feedback.classList.add("visible");

    if (opts.scroll && correctExplainEl) {
      setTimeout(function () {
        correctExplainEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 30);
    }
  }

  function renderQuestion() {
    const q = questionList[index];
    const total = questionList.length;
    const n = index + 1;
    const prev = sessionAnswers[index];
    answered = !!(prev && prev.answered);

    el.progressLabel.textContent =
      (reviewMode || notebookMode ? "복습 " : "") + "Q " + n + "/" + total;
    recomputeScore();
    el.progressFill.style.width = (n / total) * 100 + "%";

    if ((examMode || q.paperTag) && q.paperTag) {
      el.questionTag.hidden = false;
      el.questionTag.textContent = q.paperTag;
    } else {
      el.questionTag.hidden = true;
      el.questionTag.textContent = "";
    }

    el.stem.textContent = q.stem;

    if (el.imageWrap && el.image) {
      if (q.image) {
        el.imageWrap.hidden = false;
        el.image.src = q.image;
        el.image.alt = "문항 그림";
      } else {
        el.imageWrap.hidden = true;
        el.image.removeAttribute("src");
      }
    }

    el.choices.innerHTML = "";
    q.choices.forEach((text, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.dataset.index = String(i);
      btn.innerHTML =
        '<span class="choice-num">' +
        NUM_LABELS[i] +
        '</span><span class="choice-text">' +
        escapeHtml(text) +
        "</span>";
      btn.addEventListener("click", () => onAnswer(i));
      li.appendChild(btn);
      el.choices.appendChild(li);
    });

    el.feedback.classList.remove("visible");
    el.feedback.innerHTML = "";

    if (answered && prev) {
      applyGradedState(q, prev.selected);
    }

    updateNavButtons();
  }

  function onAnswer(selected) {
    if (answered) return; // 이미 채점된 문항은 재선택 불가
    const q = questionList[index];
    const correct = q.answerIndex;
    const isCorrect = selected === correct;
    const sid = q.subjectId || subjectId;

    sessionAnswers[index] = {
      subjectId: sid,
      id: q.id,
      selected: selected,
      correct: isCorrect,
      answered: true,
    };
    answered = true;

    recordGradedAnswer(index, sid, isCorrect);
    if (!isCorrect) {
      // Prefer bank (unshuffled) snapshot so review re-shuffles cleanly
      let snap = q;
      let fromBank = null;
      const banks = [];
      if (typeof QUESTIONS !== "undefined") {
        if (QUESTIONS[sid]) banks.push(QUESTIONS[sid]);
        if (QUESTIONS[PRACTICAL_BANK_ID]) banks.push(QUESTIONS[PRACTICAL_BANK_ID]);
      }
      for (let bi = 0; bi < banks.length; bi++) {
        fromBank = banks[bi].find(function (x) {
          return x && x.id === q.id;
        });
        if (fromBank) break;
      }
      if (fromBank) {
        snap = Object.assign({}, fromBank, { subjectId: sid });
        if (q.isPractical) snap.isPractical = true;
      } else {
        // Strip session shuffle flag so next review can reshuffle
        snap = Object.assign({}, q, { subjectId: sid });
        delete snap._shuffled;
      }
      const wrongText =
        typeof selected === "number" && q.choices && q.choices[selected] != null
          ? q.choices[selected]
          : selected;
      upsertWrongNotebookItem(snap, sid, wrongText);
    }
    recomputeScore();
    updateWrongRefsFromSession();
    applyGradedState(q, selected, { scroll: true });
    updateNavButtons();
  }

  function nextQuestion() {
    if (index + 1 >= questionList.length) {
      showEnd({ fromSubmit: false });
      return;
    }
    index += 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevQuestion() {
    if (index <= 0) return;
    index -= 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmitMid() {
    if (
      !window.confirm("지금 제출하면 중간 분석이 표시됩니다. 계속할까요?")
    ) {
      return;
    }
    showEnd({ fromSubmit: true });
  }

  function computeAnalysis() {
    const bySubject = {};
    let correct = 0;
    let attempted = 0;
    const total = questionList.length;

    sessionAnswers.forEach((a, i) => {
      const q = questionList[i] || {};
      const sid = a.subjectId || q.subjectId || subjectId || "unknown";
      const isPractical = !!q.isPractical;
      const key = isPractical ? sid + "|practical" : sid;
      if (!bySubject[key]) {
        bySubject[key] = {
          subjectId: sid,
          label: isPractical
            ? "실기 · " + subjectName(sid)
            : subjectName(sid),
          isPractical: isPractical,
          correct: 0,
          attempted: 0,
          total: 0,
        };
      }
      bySubject[key].total += 1;
      if (a.answered) {
        bySubject[key].attempted += 1;
        attempted += 1;
        if (a.correct) {
          bySubject[key].correct += 1;
          correct += 1;
        }
      }
    });

    return { correct: correct, attempted: attempted, total: total, bySubject: bySubject };
  }

  function renderSubjectChart(bySubject) {
    const keys = Object.keys(bySubject);
    if (!keys.length) return "";
    let html = '<h3 class="breakdown-title">과목별 성적</h3><div class="subject-chart">';
    keys.forEach((key) => {
      const st = bySubject[key];
      const pct = st.attempted > 0 ? Math.round((st.correct / st.attempted) * 100) : 0;
      const barClass =
        st.attempted === 0
          ? ""
          : pct >= 70
            ? "is-strong"
            : pct >= 40
              ? "is-mid"
              : "is-weak";
      html +=
        '<div class="chart-row">' +
        '<div class="chart-row-head">' +
        '<span class="bd-name">' +
        escapeHtml(st.label) +
        "</span>" +
        '<span class="bd-score">' +
        st.correct +
        "/" +
        st.attempted +
        " (" +
        pct +
        "%)</span>" +
        "</div>" +
        '<div class="chart-bar-track" role="img" aria-label="' +
        escapeHtml(st.label) +
        " " +
        pct +
        '%">' +
        '<div class="chart-bar-fill ' +
        barClass +
        '" style="width:' +
        pct +
        '%"></div>' +
        "</div>" +
        "</div>";
    });
    html += "</div>";
    return html;
  }

  function renderInsights(bySubject) {
    const rows = Object.keys(bySubject)
      .map((k) => {
        const st = bySubject[k];
        const pct = st.attempted > 0 ? (st.correct / st.attempted) * 100 : -1;
        return Object.assign({}, st, { pct: pct });
      })
      .filter((st) => st.attempted > 0);

    let html = '<div class="insight-block"><h3 class="breakdown-title">강점 · 취약</h3>';
    if (!rows.length) {
      html +=
        '<p class="insight-text">아직 응시한 문항이 없습니다. 미응시 문항은 오답으로 치지 않습니다.</p></div>';
      return html;
    }

    rows.sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label, "ko"));
    const topN = Math.min(2, rows.length);
    const strong = rows.slice(0, topN);
    const weakSorted = rows.slice().sort(function (a, b) {
      return a.pct - b.pct || a.label.localeCompare(b.label, "ko");
    });
    const weak = weakSorted.slice(0, topN);

    function fmt(list) {
      return list
        .map(function (s) {
          return escapeHtml(s.label) + " (" + Math.round(s.pct) + "%)";
        })
        .join(", ");
    }

    html +=
      '<p class="insight-text"><strong>잘 맞춘 과목 TOP</strong> ' +
      fmt(strong) +
      "</p>";
    html +=
      '<p class="insight-text"><strong>취약 과목 TOP</strong> ' +
      fmt(weak) +
      "</p></div>";
    return html;
  }

  function renderTypeBreakdown(bySubject) {
    const keys = Object.keys(bySubject);
    if (!keys.length) return "";
    let html =
      '<div class="insight-block"><h3 class="breakdown-title">유형</h3><div class="type-chips">';
    keys.forEach((key) => {
      const st = bySubject[key];
      html +=
        '<span class="type-chip">' +
        escapeHtml(st.label) +
        " " +
        st.attempted +
        "/" +
        st.total +
        "</span>";
    });
    html += "</div></div>";
    return html;
  }

  function showEnd(opts) {
    const fromSubmit = !!(opts && opts.fromSubmit);
    midSubmit = fromSubmit;
    syncSessionStats();
    const analysis = computeAnalysis();
    const pct =
      analysis.attempted > 0
        ? Math.round((analysis.correct / analysis.attempted) * 100)
        : 0;

    if (el.endTitle) {
      el.endTitle.textContent = fromSubmit ? "중간 분석" : "응시 결과";
    }
    el.endScore.innerHTML =
      analysis.correct +
      " <span>/ " +
      analysis.attempted +
      " / " +
      analysis.total +
      "</span>";
    el.endPct.textContent =
      "정답률 " +
      pct +
      "%" +
      (fromSubmit ? " · 중간 제출 (미응시 " + (analysis.total - analysis.attempted) + "문항)" : "");

    const analyticsHtml =
      renderSubjectChart(analysis.bySubject) +
      renderInsights(analysis.bySubject) +
      renderTypeBreakdown(analysis.bySubject);
    if (el.endAnalytics) {
      el.endAnalytics.innerHTML = analyticsHtml;
      el.endBreakdown.innerHTML = "";
    } else {
      el.endBreakdown.innerHTML = analyticsHtml;
    }

    const keys = Object.keys(analysis.bySubject);
    if (examMode && !reviewMode && !fromSubmit) {
      const overallOk = pct >= 60;
      let allSubjectsOk = true;
      let anyMajor = false;
      keys.forEach((key) => {
        const st = analysis.bySubject[key];
        if (st.isPractical) return;
        anyMajor = true;
        const denom = st.attempted > 0 ? st.attempted : st.total;
        const sp = denom > 0 ? (st.correct / denom) * 100 : 0;
        if (sp < 40) allSubjectsOk = false;
      });
      let hint =
        "합격 참고(전공 과목에 필기 총점 60%·과목 40% 기준 적용): ";
      if (!anyMajor) {
        hint += "전공 응시 문항 없음.";
      } else if (overallOk && allSubjectsOk) {
        hint += "총점·과목 기준을 충족(참고).";
      } else {
        const parts = [];
        if (!overallOk) parts.push("총점 60% 미달");
        if (!allSubjectsOk) parts.push("일부 과목 40% 미달");
        hint += parts.join(" · ") + ".";
      }
      hint +=
        " 법규·공중보건·해부생리 등 공통 영역은 제외된 모의입니다.";
      el.endPassHint.textContent = hint;
      el.endPassHint.hidden = false;
    } else {
      el.endPassHint.textContent = "";
      el.endPassHint.hidden = true;
    }

    const isTodayLessonSession = questionList.some(function (q) {
      return q && q.paperTag && String(q.paperTag).indexOf("오늘의 수업") === 0;
    });

    if (notebookMode) {
      el.endSummary.textContent = "오답노트 복습을 완료했습니다.";
    } else if (isTodayLessonSession) {
      el.endSummary.textContent =
        "오늘의 수업 완료. 오답노트 확인하고 내일도 이어서.";
    } else if (reviewMode) {
      el.endSummary.textContent = "틀린 문제 복습을 완료했습니다.";
    } else if (fromSubmit && analysis.attempted === 0) {
      el.endSummary.textContent = "응시한 문항이 없습니다.";
    } else if (wrongRefs.length === 0 && analysis.attempted > 0) {
      el.endSummary.textContent = fromSubmit
        ? "지금까지 응시한 문항을 모두 맞혔습니다."
        : "모든 문제를 맞혔습니다.";
    } else if (wrongRefs.length === 0) {
      el.endSummary.textContent = "";
    } else {
      el.endSummary.textContent =
        "틀린 문제 " + wrongRefs.length + "문항이 있습니다.";
    }

    const canResume =
      fromSubmit && sessionAnswers.some((a) => !a.answered);
    if (el.btnResume) {
      el.btnResume.hidden = !canResume;
    }
    el.btnRetryWrong.style.display =
      !reviewMode && !notebookMode && wrongRefs.length > 0 ? "block" : "none";
    if (canResume && el.btnRetryWrong.style.display === "block") {
      el.btnRetryWrong.classList.remove("btn-primary");
      el.btnRetryWrong.classList.add("btn-secondary");
    } else {
      el.btnRetryWrong.classList.add("btn-primary");
      el.btnRetryWrong.classList.remove("btn-secondary");
    }

    if (el.endSeokNudge) {
      const seokNow = computeSeokReadiness(loadStudyStats());
      const nudge = seokNow && seokNow.tip ? seokNow.tip : "";
      if (nudge) {
        el.endSeokNudge.hidden = false;
        el.endSeokNudge.textContent = "수석까지 · " + nudge;
      } else {
        el.endSeokNudge.hidden = true;
        el.endSeokNudge.textContent = "";
      }
    }

    showScreen("end");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resumeSession() {
    const unanswered = sessionAnswers.findIndex((a) => !a.answered);
    if (unanswered < 0) {
      showEnd({ fromSubmit: false });
      return;
    }
    midSubmit = false;
    if (sessionAnswers[index] && sessionAnswers[index].answered) {
      index = unanswered;
    }
    showScreen("quiz");
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    reviewMode = false;
    notebookMode = false;
    wrongRefs = [];
    subjectId = null;
    examMode = false;
    pendingSubjectId = null;
    midSubmit = false;
    sessionAnswers = [];
    questionList = [];
    renderHome();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // —— Events ——
  if (el.btnPrev) el.btnPrev.addEventListener("click", prevQuestion);
  el.btnNext.addEventListener("click", nextQuestion);
  el.btnHome.addEventListener("click", goHome);
  el.btnEndHome.addEventListener("click", goHome);
  el.btnRetryWrong.addEventListener("click", startReviewWrong);
  if (el.btnSubmit) el.btnSubmit.addEventListener("click", onSubmitMid);
  if (el.btnResume) el.btnResume.addEventListener("click", resumeSession);
  if (el.btnNational) el.btnNational.addEventListener("click", openExamConfig);
  el.btnCountBack.addEventListener("click", () => {
    pendingSubjectId = null;
    renderHome();
  });
  if (el.btnExamBack) el.btnExamBack.addEventListener("click", goHome);
  if (el.btnToggleCustom) {
    el.btnToggleCustom.addEventListener("click", () => {
      el.customCounts.classList.toggle("hidden");
      if (!el.customCounts.classList.contains("hidden")) {
        renderCustomCountInputs(defaultCounts());
      }
    });
  }
  if (el.btnExamStart) el.btnExamStart.addEventListener("click", () => {
    const s = readCustomState();
    startExamSession(s.counts, s.practical);
  });
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyPreset(btn.getAttribute("data-preset"));
    });
  });
  if (el.btnStatsReset) {
    el.btnStatsReset.addEventListener("click", onResetStats);
  }
  if (el.inputExamDate) {
    el.inputExamDate.addEventListener("change", function () {
      saveExamDate(el.inputExamDate.value || null);
      renderDday();
    });
  }
  if (el.btnNotebook) {
    el.btnNotebook.addEventListener("click", openNotebook);
  }
  if (el.btnNotebookBack) {
    el.btnNotebookBack.addEventListener("click", goHome);
  }
  if (el.btnNotebookQuizAll) {
    el.btnNotebookQuizAll.addEventListener("click", function () {
      const items = loadNotebook().items;
      if (!items.length) return;
      startNotebookQuiz(items);
    });
  }
  if (el.btnTodayLesson) {
    el.btnTodayLesson.addEventListener("click", startTodayLesson);
  }

  renderHome();
})();
