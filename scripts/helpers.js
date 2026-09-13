/** Build a question object; ensure explainWrong[answerIndex]==="" */
function Q(id, stem, choices, answerIndex, explainCorrect, explainWrong) {
  if (choices.length !== 5) throw new Error(id + ": choices!=5");
  if (answerIndex < 0 || answerIndex > 4) throw new Error(id + ": bad answerIndex");
  if (!Array.isArray(explainWrong) || explainWrong.length !== 5)
    throw new Error(id + ": explainWrong!=5");
  const ew = explainWrong.slice();
  ew[answerIndex] = "";
  return { id, stem, choices, answerIndex, explainCorrect, explainWrong: ew };
}
module.exports = { Q };
