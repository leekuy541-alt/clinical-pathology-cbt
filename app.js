/**
 * 임상병리사 CBT — 퀴즈 로직
 * 국가고시 모의 · 과목별 연습 · 혼합 시험 채점
 */
(function () {
  "use strict";

  const NUM_LABELS = ["①", "②", "③", "④", "⑤"];
  const STORAGE_KEY = "cbt-exam-counts-v2";
  const SUBJECT_COUNT_PRESETS = [10, 20, 35, 50];

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

  /** @type {'home'|'count'|'exam-config'|'quiz'|'end'} */
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
  /** 혼합/모의 시험 여부 */
  let examMode = false;
  /** @type {{subjectId:string,id:string,selected:number|null,correct:boolean,answered:boolean}[]} */
  let sessionAnswers = [];
  /** 중간 제출 후 결과 화면인지 */
  let midSubmit = false;
  /** pending subject for count picker */
  let pendingSubjectId = null;

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

  function applyGradedState(q, selected) {
    const correct = q.answerIndex;
    const isCorrect = selected === correct;
    const buttons = el.choices.querySelectorAll(".choice-btn");
    buttons.forEach((btn) => {
      btn.disabled = false;
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
    renderFeedback(q, selected, isCorrect);
  }

  function renderQuestion() {
    const q = questionList[index];
    const total = questionList.length;
    const n = index + 1;
    const prev = sessionAnswers[index];
    answered = !!(prev && prev.answered);

    el.progressLabel.textContent =
      (reviewMode ? "복습 " : "") + "Q " + n + "/" + total;
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

    recomputeScore();
    updateWrongRefsFromSession();
    applyGradedState(q, selected);
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
      '<p class="insight-text"><strong>잘 맞춘 과목 TOP</strong>' +
      fmt(strong) +
      "</p>";
    html +=
      '<p class="insight-text"><strong>취약 과목 TOP</strong>' +
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

    if (reviewMode) {
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
      !reviewMode && wrongRefs.length > 0 ? "block" : "none";
    if (canResume && el.btnRetryWrong.style.display === "block") {
      el.btnRetryWrong.classList.remove("btn-primary");
      el.btnRetryWrong.classList.add("btn-secondary");
    } else {
      el.btnRetryWrong.classList.add("btn-primary");
      el.btnRetryWrong.classList.remove("btn-secondary");
    }
    showScreen("end");
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

  renderHome();
})();
