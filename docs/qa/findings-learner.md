# Findings: learner side and content

Tester report (Sonnet, medium effort), saved here as received. Triage decisions are in `docs/qa/REPORT.md`.

Files: `tests/learner-flows.test.js` (84 checks), `tests/content.test.js` (29), `tests/edge-input.test.js` (56), helper `tests/qa-helpers.js`. Result at the time of the report: 169 checks, 164 passed, 5 failed (4 suspected bugs).

## Suspected bugs

1. **Theory quiz running score shows in the wrong place. Medium.** With a Day quiz half done on RCM Basics, answering in Quiz > Theory updates the Day quiz's score line and leaves the Theory one at "0 / 0". index.html `answer(i)`: `$(".score")` takes the first `.score` on the page; it should be scoped to `#quizArea`.
2. **A very long question (about 32,000 characters) throws "Regular expression too large". Low.** No answer card appears. index.html `bScore` builds a regular expression from the whole question with no length limit (reached from `ask()`, `bSearch`, `bQuery`).
3. **Highlighting can break text containing & or quotes. Low.** `hl()` escapes first and then marks matches inside the escaped HTML, so a search word "amp" or "quot" splits an entity and shows "&amp".
4. **Em dashes in 5 topics and 7 questions. Low, style.** The test plan listed this as a content rule.

## What passed

Content integrity (unique ids over 191 topics, every see-also resolves, every question has one correct answer and three distinct wrong ones with a why-not each, every module has at least 5 questions, generated rounds always valid, sources are https, update dates match). Ask (codes, every denial by name, all chips, empty and odd input, typed HTML shown as text). RCM Basics (read marks, counters, reset, search, all six day quizzes: score, why-not, retry, print). All Denials, the four playbooks, the "What changed" panel, the three specialty tracks. Quiz tab (Theory, Call, Scenario, Everything). Storage blocked and 11 kinds of corrupted saved data. Double clicks. Phone and desktop layout with no sideways scroll. No page errors.

## Notes (not bugs)

17 denials have no codes on purpose; codes 22 and 96 each belong to two denials; "Original Medicare covers:" appears in two tracks with different answers; `us-fun-facts` has no sources on purpose.

## Improvement ideas

1. Self-contained question wording for mixed rounds ("Original Medicare covers (vision)").
2. When a code belongs to two denials, show both with a "which one" hint.
3. A length limit of about 300 characters on both search boxes.
4. Shorten the "Asked ..." echo on long questions.
5. Cap the Ask answer list or add "Clear answers".
6. Scroll the quiz result into view on a phone.
7. Announce quiz feedback to screen readers.
8. A "forget my name" link, since computers are shared.
9. Drop unknown topic ids from saved read lists.
