/* Extra helpers for the learner-side QA tests (not a test file; run.js ignores it). */
"use strict";

/* Plays one quiz to the end. `area` is the selector that holds the quiz, `next` the Next/See results button.
   `pickFn(i, n)` returns the option number to click for question i. Returns what was seen. */
async function playQuiz(page, area, next, pickFn, opts) {
  opts = opts || {};
  const seen = { n: 0, total: 0, correct: 0, wrongShown: 0, wrongWithWhy: 0, wrongNoWhy: [], questions: [], badOptions: [], noFeedback: 0 };
  const nextSel = next.startsWith("#") ? next : area + " " + next;
  for (let guard = 0; guard < 80; guard++) {
    const st = await page.evaluate(a => {
      const root = document.querySelector(a); if (!root) return { missing: true };
      if (root.querySelector(".result .big")) return { done: true };
      const m = /Question (\d+) of (\d+)/.exec((root.querySelector(".qmeta span") || {}).textContent || "");
      if (!m) return { wait: true };
      return { i: +m[1] - 1, total: +m[2], qtext: ((root.querySelector(".qpre") || {}).textContent || "").trim().slice(0, 300) + " || " + root.querySelector(".qtext").textContent.trim(), opts: [...root.querySelectorAll(".opt span:last-child")].map(x => x.textContent) };
    }, area);
    if (st.done) break;
    if (st.missing) break;
    if (st.wait) { await page.waitForTimeout(50); continue; }
    seen.total = st.total; seen.questions.push(st.qtext);
    if (st.opts.some(o => !o.trim()) || new Set(st.opts).size !== st.opts.length) seen.badOptions.push(st.qtext.slice(0, 50));
    const k = Math.min(pickFn(st.i, st.total), st.opts.length - 1);
    const r = await page.evaluate(([a, k, nx]) => {
      const root = document.querySelector(a); root.querySelectorAll(".opt")[k].click();
      const right = root.querySelectorAll(".opt")[k].classList.contains("right");
      const fb = (root.querySelector(".fb") || {}).textContent || "";
      const score = (root.querySelector(".score") || {}).textContent;
      document.querySelector(nx).click();
      return { right, fb, score };
    }, [area, k, nextSel]);
    seen.n++;
    if (r.right) seen.correct++;
    if (!r.fb) seen.noFeedback++;
    if (!r.right) { seen.wrongShown++; if (/Why not [A-D]:/.test(r.fb)) seen.wrongWithWhy++; else seen.wrongNoWhy.push(st.qtext.slice(0, 60)); }
    seen.lastScore = r.score;
  }
  const res = await page.evaluate(a => ({ big: (document.querySelector(a + " .result .big") || {}).textContent || "", pct: (document.querySelector(a + " .result .pct") || {}).textContent || "" }), area);
  seen.big = res.big; seen.pct = res.pct;
  return seen;
}

const checkScore = (s) => s.big === s.correct + " / " + s.total && s.pct === Math.round(s.correct / s.total * 100) + "% correct";

module.exports = { playQuiz, checkScore };
