/**
 * 임상병리사 CBT — 퀴즈 로직
 */
(function () {
  "use strict";

  const NUM_LABELS = ["①", "②", "③", "④", "⑤"];

  /** @type {'home'|'quiz'|'end'} */
  let screen = "home";
  let subjectId = null;
  let questionList = [];
  let index = 0;
  let score = 0;
  let answered = false;
  /** @type {number[]} 틀린 문제 인덱스 */
  let wrongIndices = [];
  /** 틀린 문제 다시보기 모드 */
  let reviewMode = false;

  const $ = (sel) => document.querySelector(sel);
  const el = {
    home: $("#screen-home"),
    quiz: $("#screen-quiz"),
    end: $("#screen-end"),
    subjectList: $("#subject-list"),
    progressLabel: $("#progress-label"),
    scoreLabel: $("#score-label"),
    progressFill: $("#progress-fill"),
    stem: $("#question-stem"),
    choices: $("#choices"),
    feedback: $("#feedback"),
    btnNext: $("#btn-next"),
    endScore: $("#end-score"),
    endPct: $("#end-pct"),
    endSummary: $("#end-summary"),
    btnRetryWrong: $("#btn-retry-wrong"),
    btnHome: $("#btn-home"),
    btnEndHome: $("#btn-end-home"),
  };

  function showScreen(name) {
    screen = name;
    el.home.classList.toggle("active", name === "home");
    el.quiz.classList.toggle("active", name === "quiz");
    el.end.classList.toggle("active", name === "end");
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
        btn.addEventListener("click", () => startQuiz(sub.id, false));
      }
      li.appendChild(btn);
      el.subjectList.appendChild(li);
    });
    showScreen("home");
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startQuiz(id, onlyWrong) {
    subjectId = id;
    const bank = QUESTIONS[id] || [];
    if (onlyWrong && wrongIndices.length > 0) {
      questionList = wrongIndices.map((i) => bank[i]);
      reviewMode = true;
    } else {
      questionList = shuffle(bank);
      reviewMode = false;
      wrongIndices = [];
    }
    if (questionList.length === 0) {
      renderHome();
      return;
    }
    index = 0;
    score = 0;
    answered = false;
    showScreen("quiz");
    renderQuestion();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

    if (isCorrect) {
      score += 1;
    } else if (!reviewMode) {
      // 원본 은행에서의 인덱스를 추적하기 위해 id로 매핑
      const bank = QUESTIONS[subjectId];
      const origIdx = bank.findIndex((x) => x.id === q.id);
      if (origIdx >= 0 && !wrongIndices.includes(origIdx)) {
        wrongIndices.push(origIdx);
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
    el.endScore.innerHTML =
      score + " <span>/ " + total + "</span>";
    el.endPct.textContent = "정답률 " + pct + "%";
    if (reviewMode) {
      el.endSummary.textContent = "틀린 문제 복습을 완료했습니다.";
    } else if (wrongIndices.length === 0) {
      el.endSummary.textContent = "모든 문제를 맞혔습니다.";
    } else {
      el.endSummary.textContent =
        "틀린 문제 " + wrongIndices.length + "문항이 있습니다.";
    }
    el.btnRetryWrong.style.display =
      !reviewMode && wrongIndices.length > 0 ? "block" : "none";
    showScreen("end");
  }

  function goHome() {
    reviewMode = false;
    wrongIndices = [];
    subjectId = null;
    renderHome();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  el.btnNext.addEventListener("click", nextQuestion);
  el.btnHome.addEventListener("click", goHome);
  el.btnEndHome.addEventListener("click", goHome);
  el.btnRetryWrong.addEventListener("click", () => {
    if (subjectId && wrongIndices.length) {
      startQuiz(subjectId, true);
    }
  });

  renderHome();
})();
