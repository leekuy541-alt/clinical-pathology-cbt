/**
 * 임상병리사 CBT — 퀴즈 로직
 * 국가고시 모의 · 과목별 연습 · 혼합 시험 채점
 */
(function () {
  "use strict";

  const NUM_LABELS = ["①", "②", "③", "④", "⑤"];
  const STORAGE_KEY = "cbt-exam-counts-v1";
  const SUBJECT_COUNT_PRESETS = [10, 20, 35, 50];

  /** 관례 배분(참고) — 필기 전공 175 (공통 40 미포함) */
  const PRESET_A = {
    histopathology: 32,
    physiology: 26,
    "clinical-chemistry": 40,
    hematology: 30,
    "immuno-transfusion": 15,
    microbiology: 32,
  };
  const PRESET_A_PRACTICAL = 0;

  /** 전체 모의 240 = 175 + 실기형 65 */
  const PRESET_B_PRACTICAL = 65;

  /** 빠른 모의 50 — A 비례 축소(최대잔여법) */
  const PRESET_C = {
    histopathology: 9,
    physiology: 7,
    "clinical-chemistry": 12,
    hematology: 9,
    "immuno-transfusion": 4,
    microbiology: 9,
  };
  const PRESET_C_PRACTICAL = 0;

  const MAJOR_IDS = [
    "histopathology",
    "physiology",
    "clinical-chemistry",
    "hematology",
    "immuno-transfusion",
    "microbiology",
  ];

  /** @type {'home'|'count'|'exam-config'|'quiz'|'end'} */
  let screen = "home";
  let subjectId = null;
  let questionList = [];
  let index = 0;
  let score = 0;
  let answered = false;
  /** @type {{subjectId:string,id:string}[]} */
  let wrongRefs = [];
  /** 틀린 문제 다시보기 모드 */
  let reviewMode = false;
  /** 혼합/모의 시험 여부 */
  let examMode = false;
  /** @type {Record<string,{correct:number,total:number}>} */
  let subjectStats = {};
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
    choices: $("#choices"),
    feedback: $("#feedback"),
    btnNext: $("#btn-next"),
    endScore: $("#end-score"),
    endPct: $("#end-pct"),
    endPassHint: $("#end-pass-hint"),
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
    return { counts: Object.assign({}, PRESET_A), practical: PRESET_A_PRACTICAL };
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
    const picked = sampleN(bank, n).map((q) =>
      Object.assign({}, q, {
        subjectId: id,
        paperTag: subjectName(id),
        isPractical: false,
      })
    );
    beginSession(picked, {
      examMode: false,
      reviewMode: false,
      subjectId: id,
    });
  }

  function openExamConfig() {
    el.customCounts.classList.add("hidden");
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
    return MAJOR_IDS.reduce(
      (sum, id) => sum + ((QUESTIONS[id] && QUESTIONS[id].length) || 0),
      0
    );
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
      "문항 (전공 " +
      majorSum +
      " + 실기형 " +
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
    if (key === "A") {
      counts = Object.assign({}, PRESET_A);
      practical = PRESET_A_PRACTICAL;
    } else if (key === "B") {
      counts = Object.assign({}, PRESET_A);
      practical = PRESET_B_PRACTICAL;
    } else if (key === "C") {
      counts = Object.assign({}, PRESET_C);
      practical = PRESET_C_PRACTICAL;
    } else {
      return;
    }
    saveCounts(counts, practical);
    startExamSession(counts, practical);
  }

  /**
   * Build mixed exam paper.
   * Major draws per subject, then optional practical sample across all banks
   * excluding already drawn ids. Full shuffle for CBT feel.
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
      const pool = [];
      MAJOR_IDS.forEach((id) => {
        (QUESTIONS[id] || []).forEach((q) => {
          if (!usedKeys.has(id + "::" + q.id)) {
            pool.push(
              Object.assign({}, q, {
                subjectId: id,
                paperTag: "실기 대비 · " + subjectName(id),
                isPractical: true,
              })
            );
          }
        });
      });
      sampleN(pool, practical).forEach((q) => {
        usedKeys.add(q.subjectId + "::" + q.id);
        paper.push(q);
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
    questionList = list;
    examMode = !!opts.examMode;
    reviewMode = !!opts.reviewMode;
    subjectId = opts.subjectId || null;
    if (!reviewMode) {
      wrongRefs = [];
    }
    subjectStats = {};
    questionList.forEach((q) => {
      const sid = q.subjectId || subjectId || "unknown";
      const key = q.isPractical ? sid + "|practical" : sid;
      if (!subjectStats[key]) {
        subjectStats[key] = {
          correct: 0,
          total: 0,
          label: q.isPractical
            ? "실기 대비 · " + subjectName(sid)
            : subjectName(sid),
          subjectId: sid,
          isPractical: !!q.isPractical,
        };
      }
      subjectStats[key].total += 1;
    });
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

  function renderQuestion() {
    answered = false;
    const q = questionList[index];
    const total = questionList.length;
    const n = index + 1;

    el.progressLabel.textContent =
      (reviewMode ? "복습 " : "") + "Q " + n + "/" + total;
    el.scoreLabel.textContent = "점수 " + score;
    el.progressFill.style.width = (n / total) * 100 + "%";

    if (examMode && q.paperTag) {
      el.questionTag.hidden = false;
      el.questionTag.textContent = q.paperTag;
    } else if (!examMode && q.paperTag) {
      el.questionTag.hidden = false;
      el.questionTag.textContent = q.paperTag;
    } else {
      el.questionTag.hidden = true;
      el.questionTag.textContent = "";
    }

    el.stem.textContent = q.stem;

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
    el.btnNext.classList.add("btn-hidden");
    el.btnNext.disabled = true;
  }

  function onAnswer(selected) {
    if (answered) return;
    answered = true;
    const q = questionList[index];
    const correct = q.answerIndex;
    const isCorrect = selected === correct;
    const sid = q.subjectId || subjectId;

    if (isCorrect) {
      score += 1;
      const key = q.isPractical ? sid + "|practical" : sid;
      if (subjectStats[key]) subjectStats[key].correct += 1;
    } else if (!reviewMode) {
      const already = wrongRefs.some(
        (r) => r.subjectId === sid && r.id === q.id
      );
      if (!already) {
        wrongRefs.push({ subjectId: sid, id: q.id });
      }
    }

    el.scoreLabel.textContent = "점수 " + score;

    const buttons = el.choices.querySelectorAll(".choice-btn");
    buttons.forEach((btn) => {
      btn.disabled = true;
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
    el.btnNext.classList.remove("btn-hidden");
    el.btnNext.disabled = false;
    el.btnNext.textContent =
      index + 1 >= questionList.length ? "결과 보기" : "다음 문제";
  }

  function renderFeedback(q, selected, isCorrect) {
    const correctLabel = NUM_LABELS[q.answerIndex];
    let html = "";
    html +=
      '<div class="feedback-result ' +
      (isCorrect ? "is-correct" : "is-wrong") +
      '">' +
      (isCorrect ? "정답" : "오답") +
      "</div>";
    html +=
      '<p class="feedback-answer">정답: ' +
      correctLabel +
      " " +
      escapeHtml(q.choices[q.answerIndex]) +
      "</p>";
    html +=
      '<div class="feedback-section"><h3>해설</h3><p>' +
      escapeHtml(q.explainCorrect) +
      "</p></div>";

    const wrongLines = [];
    q.choices.forEach((choice, i) => {
      if (i === q.answerIndex) return;
      const why = q.explainWrong[i] || "";
      if (!why) return;
      wrongLines.push(
        "<li><span class=\"choice-ref\">" +
          NUM_LABELS[i] +
          "</span>" +
          escapeHtml(why) +
          "</li>"
      );
    });
    if (wrongLines.length) {
      html +=
        '<div class="feedback-section"><h3>오선 해설</h3><ul class="wrong-list">' +
        wrongLines.join("") +
        "</ul></div>";
    }

    el.feedback.innerHTML = html;
    el.feedback.classList.add("visible");
    el.feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function nextQuestion() {
    if (!answered) return;
    if (index + 1 >= questionList.length) {
      showEnd();
      return;
    }
    index += 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showEnd() {
    const total = questionList.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    el.endScore.innerHTML = score + " <span>/ " + total + "</span>";
    el.endPct.textContent = "정답률 " + pct + "%";

    // Per-subject breakdown
    const keys = Object.keys(subjectStats);
    let breakdownHtml = "";
    if (keys.length > 0) {
      breakdownHtml += '<h3 class="breakdown-title">과목별 성적</h3><ul class="breakdown-list">';
      keys.forEach((key) => {
        const st = subjectStats[key];
        const sp =
          st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
        breakdownHtml +=
          "<li><span class=\"bd-name\">" +
          escapeHtml(st.label) +
          '</span><span class="bd-score">' +
          st.correct +
          "/" +
          st.total +
          " (" +
          sp +
          "%)</span></li>";
      });
      breakdownHtml += "</ul>";
    }
    el.endBreakdown.innerHTML = breakdownHtml;

    // Pass hint (참고) — only for exam mode with major subjects
    if (examMode && !reviewMode) {
      const overallOk = pct >= 60;
      let allSubjectsOk = true;
      let anyMajor = false;
      keys.forEach((key) => {
        const st = subjectStats[key];
        if (st.isPractical) return;
        anyMajor = true;
        const sp = st.total > 0 ? (st.correct / st.total) * 100 : 0;
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
    } else if (wrongRefs.length === 0) {
      el.endSummary.textContent = "모든 문제를 맞혔습니다.";
    } else {
      el.endSummary.textContent =
        "틀린 문제 " + wrongRefs.length + "문항이 있습니다.";
    }
    el.btnRetryWrong.style.display =
      !reviewMode && wrongRefs.length > 0 ? "block" : "none";
    showScreen("end");
  }

  function goHome() {
    reviewMode = false;
    wrongRefs = [];
    subjectId = null;
    examMode = false;
    pendingSubjectId = null;
    renderHome();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // —— Events ——
  el.btnNext.addEventListener("click", nextQuestion);
  el.btnHome.addEventListener("click", goHome);
  el.btnEndHome.addEventListener("click", goHome);
  el.btnRetryWrong.addEventListener("click", startReviewWrong);
  el.btnNational.addEventListener("click", openExamConfig);
  el.btnCountBack.addEventListener("click", () => {
    pendingSubjectId = null;
    renderHome();
  });
  el.btnExamBack.addEventListener("click", goHome);
  el.btnToggleCustom.addEventListener("click", () => {
    el.customCounts.classList.toggle("hidden");
    if (!el.customCounts.classList.contains("hidden")) {
      renderCustomCountInputs(defaultCounts());
    }
  });
  el.btnExamStart.addEventListener("click", () => {
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
