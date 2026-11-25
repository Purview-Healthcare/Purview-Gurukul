/* Edge cases: storage blocked or corrupted, odd and huge typing, double clicks, phone and desktop width. */
"use strict";
const { suite, openApp, tab, PAGE } = require("./helpers");
const { playQuiz, checkScore } = require("./qa-helpers");

const TABS = ["askPanel", "basicsPanel", "browsePanel", "sopPanel", "specPanel", "quizPanel", "certPanel", "dashPanel"];

(async () => {
  const t = suite("Edge input and recovery");

  /* ---------- storage blocked: every access to localStorage and sessionStorage throws ---------- */
  {
    const blocked = () => {
      const boom = () => { throw new DOMException("The operation is insecure.", "SecurityError"); };
      Object.defineProperty(window, "localStorage", { get: boom, configurable: true });
      Object.defineProperty(window, "sessionStorage", { get: boom, configurable: true });
    };
    const { browser, page, errors } = await openApp({ init: blocked });
    page.setDefaultTimeout(8000);
    const loaded = await page.evaluate(() => ({ tabs: document.querySelectorAll(".navtab").length, tiles: document.querySelectorAll("#tiles .tile").length }));
    t.check(loaded.tabs === 8 && loaded.tiles >= 5, "with browser storage blocked the app still loads and draws its tabs", loaded);
    for (const p of TABS) await tab(page, p);
    t.check(!errors.length, "with storage blocked every tab opens without a page error", errors.slice(0, 3));
    await tab(page, "basicsPanel");
    await page.evaluate(() => { document.querySelectorAll("#basicsTree details.day, #basicsTree details.mod").forEach(d => d.open = true); });
    await page.locator("#basicsTree details.les").first().locator("summary .ltitle").click();
    await page.locator("#basicsTree details.les").first().locator("[data-mark]").click();
    await page.locator("#basicsTree details.les").first().locator("[data-mark]").click();
    await tab(page, "sopPanel"); await page.evaluate(() => { document.querySelectorAll("#sopTree .les .tick")[0].click(); });
    await tab(page, "specPanel"); await page.evaluate(() => { document.querySelectorAll("#specTree .les .tick")[0].click(); });
    await page.click("#xReset");
    t.check(!errors.length && /^0 of /.test(await page.textContent("#xprog")), "with storage blocked, marking topics read and resetting does not crash", errors.slice(0, 3));
    await tab(page, "quizPanel");
    const s = await playQuiz(page, "#quizArea", "#nextQ", i => i % 2);
    t.check(s.total >= 8 && checkScore(s), "with storage blocked a Theory quiz still runs to the end with a correct score", { big: s.big, correct: s.correct });
    await page.fill("#q", "x").catch(() => {});
    await tab(page, "askPanel"); await page.fill("#q", "CO-22"); await page.click("#go");
    t.check(await page.evaluate(() => !!document.querySelector("#answers .card h2")), "with storage blocked Ask still answers");
    await tab(page, "basicsPanel");
    await page.click("#basicsPanel .band") .catch(() => {});
    await tab(page, "quizPanel");
    await page.evaluate(() => { const a = document.querySelector("#quizArea .printrow .dqprint"); if (a) a.click(); });
    t.check(!errors.length, "with storage blocked Print results does not raise an error", errors.slice(0, 3));
    await browser.close();
  }

  /* ---------- corrupted saved data ---------- */
  const junk = ["{not json", "null", "123", '"text"', '{"a":1}', '[1,2,{"x":1}]', "[null]", "true", "", "[\"basics-fake-id\"]", "\u0000￿"];
  const keys = ["gk_basics_read", "gk_sop_read", "gk_spec_read"];
  const results = [];
  for (const j of junk) {
    const init = `try{ ${JSON.stringify(keys)}.forEach(k=>localStorage.setItem(k, ${JSON.stringify(j)})); localStorage.setItem("gk_name", ${JSON.stringify(j)}); localStorage.setItem("gk_cert", ${JSON.stringify(j)}); }catch(e){}`;
    const { browser, page, errors } = await openApp({ init: new Function(init) });
    page.setDefaultTimeout(6000);
    const r = { j, err: [], prog: [] };
    try {
      for (const p of ["basicsPanel", "sopPanel", "specPanel"]) await tab(page, p);
      r.prog = await page.evaluate(() => [document.querySelector("#bprog").textContent, document.querySelector("#sprog").textContent, document.querySelector("#xprog").textContent]);
      await tab(page, "basicsPanel");
      await page.evaluate(() => { document.querySelectorAll("#basicsTree .les .tick")[0].click(); });
      r.prog2 = await page.textContent("#bprog");
      for (const p of ["certPanel", "dashPanel", "quizPanel", "askPanel"]) await tab(page, p);
    } catch (e) { r.err.push(e.message.slice(0, 80)); }
    r.err = r.err.concat(errors);
    results.push(r);
    await browser.close();
  }
  const bad = results.filter(r => r.err.length);
  t.check(!bad.length, "none of 11 kinds of corrupted saved data (broken text, null, numbers, objects, empty) crashes the app", bad.map(r => JSON.stringify(r.j) + " -> " + r.err[0]).slice(0, 4));
  const wrongProg = results.filter(r => r.prog.some(p => !/^\d+ of \d+ topics read/.test(p) || /NaN/.test(p)) || (r.prog2 && !/^[0-9]+ of/.test(r.prog2)));
  t.check(!wrongProg.length, "after corrupted saved data the progress lines still read as 'N of M topics read'", wrongProg.map(r => JSON.stringify(r.j) + " -> " + r.prog.join(" | ")));
  const counted = results.filter(r => r.prog.some(p => !/^0 of /.test(p)) && r.j !== '["basics-fake-id"]');
  t.check(!counted.length, "saved data that is not a list of topic ids counts as zero topics read", counted.map(r => JSON.stringify(r.j) + " -> " + r.prog.join(" | ")).slice(0, 4));
  const fake = results.find(r => r.j === '["basics-fake-id"]');
  t.check(fake && fake.prog.every(p => /^0 of /.test(p)), "ids of topics that do not exist are not counted as read", fake && fake.prog);
  const nameJunk = results.find(r => r.j === "{not json");
  t.check(nameJunk && !nameJunk.err.length, "a broken saved certificate record does not stop the Certification tab opening");

  /* ---------- odd and huge typing ---------- */
  {
    const { browser, page, errors } = await openApp();
    page.setDefaultTimeout(8000);
    const odd = ["((((", "[[[", "\\", ".*", "+++", "?", "$^", "(?<=a)", "a|b|", "%s %d", "{{7*7}}", "${7*7}", "'; DROP TABLE x;--", "‮right-to-left", "😀😀😀", "\u0000", "   leading and trailing   ", "ＣＯ－２２", "CO--22", "co 22", "22", "0", "-1", "99999999999999999999", "NaN", "undefined", "null", "[object Object]", "<", ">", "&", "&amp;", "&lt;script&gt;", "\"\"", "''", "\n\n\n", "\t"];
    let asked = 0, broke = [];
    for (const q of odd) {
      await tab(page, "askPanel");
      const r = await page.evaluate(q => { try { $("#q").value = q; ask(); const c = document.querySelector("#answers .card"); return { ok: true, text: c ? c.textContent : "" }; } catch (e) { return { ok: false, e: e.message }; } }, odd.length ? q : "");
      asked++;
      if (!r.ok) broke.push(q + " -> " + r.e);
      else if (/undefined|\[object Object\]|NaN/.test(r.text.replace(/Asked.*?(?=(What|Short|Nothing|Low))/s, "")) && !/^(undefined|NaN|null|\[object Object\])$/.test(q.trim())) broke.push(q + " -> text has a broken word");
    }
    t.check(!broke.length, "odd typing in Ask (brackets, slashes, regex symbols, emoji, nulls, fake templates, SQL) never crashes or shows broken text", broke.slice(0, 5));
    const bq = await page.evaluate(odd => { const bad = []; odd.forEach(q => { try { $("#bq").value = q; bQuery(true); } catch (e) { bad.push(q + " -> " + e.message); } }); $("#bq").value = ""; applyFilter(""); return bad; }, odd);
    t.check(!bq.length, "the same odd typing in the RCM Basics search never crashes", bq.slice(0, 4));
    const ent = await page.evaluate(() => { const asked = []; ["&amp;", "&lt;b&gt;", "<b>x</b>"].forEach(q => { $("#q").value = q; ask(); asked.push((document.querySelector("#answers .card-q b") || {}).textContent); }); return asked; });
    t.check(ent.join("|") === "<b>x</b>|&lt;b&gt;|&amp;".split("|").reverse().join("|") || (ent[0] === "&amp;" && ent[1] === "&lt;b&gt;" && ent[2] === "<b>x</b>"), "typed entities and tags are echoed back exactly as typed", ent);
    const t0 = Date.now();
    const hugeRes = await page.evaluate(() => { const q = "claim denied ".repeat(20000); $("#q").value = q; const t = performance.now(); try { ask(); } catch (e) { return { ms: performance.now() - t, threw: e.message.slice(0, 40) }; } return { ms: performance.now() - t, cards: document.querySelectorAll("#answers .card").length }; });
    t.check(hugeRes.ms < 5000, "a 260,000 character question is handled in under 5 seconds", Math.round(hugeRes.ms) + " ms");
    const hugeErr = await page.evaluate(() => { const out = {}; [["ask", 3000], ["ask", 40000], ["search", 3000], ["search", 40000]].forEach(([k, n]) => { const before = document.querySelectorAll("#answers .card").length; try { if (k === "ask") { $("#q").value = "deductible ".repeat(n); ask(); out[k + n] = document.querySelectorAll("#answers .card").length === before + 1 ? "ok" : "no answer"; } else { $("#bq").value = "deductible ".repeat(n); bQuery(true); out[k + n] = "ok"; } } catch (e) { out[k + n] = "threw: " + e.message.slice(0, 50); } }); $("#bq").value = ""; applyFilter(""); return out; });
    t.check(Object.values(hugeErr).every(v => v === "ok"), "a very long question (33,000 characters or more) still gets an answer, in Ask and in the course search", hugeErr);
    const many = await page.evaluate(() => { const t = performance.now(); for (let i = 0; i < 60; i++) { $("#q").value = "what is a copay " + i; ask(); } return { ms: performance.now() - t, cards: document.querySelectorAll("#answers .card").length }; });
    t.check(many.ms < 15000, "asking 60 questions in a row stays fast", Math.round(many.ms) + " ms for 60");
    const kb = await page.evaluate(() => { const i = document.querySelector("#q"); i.focus(); return document.activeElement === i; });
    t.check(kb, "the Ask box takes the keyboard focus");
    t.check(!errors.length, "no page errors from odd, huge or repeated typing", errors.slice(0, 3));
    await browser.close();
  }

  /* ---------- double clicks ---------- */
  {
    const { browser, page, errors } = await openApp();
    page.setDefaultTimeout(8000);
    await tab(page, "basicsPanel");
    await page.evaluate(() => document.querySelectorAll("#basicsTree details.day").forEach(d => d.open = true));
    await page.locator('.dayquiz[data-day="Day 1"] [data-start]').dblclick();
    await page.waitForTimeout(150);
    const dq = await page.evaluate(() => ({ quizzes: document.querySelectorAll('.dayquiz[data-day="Day 1"] .dq').length, q: (document.querySelector('.dayquiz[data-day="Day 1"] .qmeta span') || {}).textContent, score: (document.querySelector('.dayquiz[data-day="Day 1"] .score') || {}).textContent }));
    t.check(dq.quizzes === 1 && /Question 1 of/.test(dq.q), "double-clicking Start on a day quiz starts one quiz at question 1", dq);
    const area = '.dayquiz[data-day="Day 1"] .dqarea';
    await page.locator(area + " .opt").first().dblclick();
    const afterDbl = await page.evaluate(a => ({ score: document.querySelector(a + " .score").textContent, picked: document.querySelectorAll(a + " .opt.right, " + a + " .opt.wrong").length }), area);
    t.check(/\/ 1$/.test(afterDbl.score) && afterDbl.picked >= 1 && afterDbl.picked <= 2, "double-clicking an answer counts it once (score out of 1, not 2)", afterDbl);
    await page.locator(area + " .dqnext").dblclick();
    await page.waitForTimeout(100);
    const nx = await page.evaluate(a => ({ q: document.querySelector(a + " .qmeta span").textContent, answered: document.querySelectorAll(a + " .opt.right, " + a + " .opt.wrong").length, score: document.querySelector(a + " .score").textContent }), area);
    t.check(/Question 2 of/.test(nx.q) && nx.answered === 0, "double-clicking Next moves on one question and does not answer the next one by accident", nx);
    /* rush to the last question, then double-click See results */
    let guard = 0;
    while (guard++ < 40) {
      const meta = await page.textContent(area + " .qmeta span").catch(() => "");
      const m = /Question (\d+) of (\d+)/.exec(meta); if (!m) break;
      await page.locator(area + " .opt").nth(1).click();
      if (+m[1] === +m[2]) { await page.locator(area + " .dqnext").dblclick(); break; }
      await page.locator(area + " .dqnext").click();
    }
    await page.waitForTimeout(200);
    const fin = await page.evaluate(a => ({ results: document.querySelectorAll(a + " .result").length, big: (document.querySelector(a + " .result .big") || {}).textContent, again: !!document.querySelector(a + " .dqagain"), printed: window.__printed || 0 }), area);
    t.check(fin.results === 1 && fin.big && fin.again && !fin.printed, "double-clicking See results shows one result page and does not trigger a button underneath", fin);
    await page.locator(area + " .dqagain").dblclick(); await page.waitForTimeout(150);
    t.check(await page.evaluate(a => document.querySelectorAll(a + " .dq").length === 1 && /Question 1 of/.test(document.querySelector(a + " .qmeta span").textContent), area), "double-clicking 'New set of questions' starts one fresh quiz at question 1");
    /* Theory quiz tab (fresh page, so no other quiz is on screen) */
    await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(250);
    await tab(page, "quizPanel");
    await page.locator("#quizArea .opt").first().dblclick();
    const th = await page.evaluate(() => ({ score: document.querySelector("#quizArea .score").textContent, i: QZ.i, picks: QZ.picks.length }));
    t.check(th.picks === 1 && /\/ 1$/.test(th.score), "double-clicking an answer in the Theory quiz counts it once", th);
    await page.locator("#nextQ").dblclick(); await page.waitForTimeout(100);
    const th2 = await page.evaluate(() => ({ i: QZ.i, picks: QZ.picks.length, answered: QZ.answered }));
    t.check(th2.i === 1 && th2.picks === 1 && !th2.answered, "double-clicking Next in the Theory quiz moves on one question and answers nothing by accident", th2);
    for (let g = 0; g < 30; g++) {
      const last = await page.evaluate(() => QZ.i >= QZ.qs.length - 1);
      await page.evaluate(() => document.querySelector("#quizArea .opt").click());
      if (last) break;
      await page.evaluate(() => document.querySelector("#nextQ").click());
    }
    await page.locator("#nextQ").dblclick(); await page.waitForTimeout(150);
    t.check(await page.evaluate(() => document.querySelectorAll("#quizArea .result").length === 1 && !window.__printed), "double-clicking See results in the Theory quiz shows one result page and prints nothing");
    await page.locator("#again").dblclick(); await page.waitForTimeout(150);
    t.check(await page.evaluate(() => QZ.i === 0 && QZ.picks.length === 0 && document.querySelectorAll("#quizArea .opt").length >= 2), "double-clicking New round starts a fresh round at question 1");
    /* quick repeated mode switching */
    await page.evaluate(() => { for (let i = 0; i < 30; i++) document.querySelectorAll(".qmode")[i % 4].click(); });
    t.check(await page.evaluate(() => document.querySelectorAll("#quizArea .opt").length >= 2), "switching Theory mode 30 times in a row still leaves a playable question");
    await page.evaluate(() => { document.querySelectorAll(".qtype").forEach(b => b.click()); document.querySelectorAll(".qtype").forEach(b => b.click()); });
    for (const [type, sel, nm] of [["call", "#callArea", "the Call tab"], ["all", "#allArea", "the Everything tab"], ["scenario", "#scenArea", "the Scenario tab"]]) {
      await page.evaluate(ty => { for (let i = 0; i < 4; i++) { document.querySelector('.qtype[data-type="theory"]').click(); document.querySelector('.qtype[data-type="' + ty + '"]').click(); } }, type);
      await page.waitForTimeout(100);
      t.check(await page.evaluate(s => document.querySelectorAll(s + " .dq").length === 1, sel), "opening " + nm + " again and again never stacks two quizzes and never leaves it empty");
    }
    t.check(!errors.length, "no page errors from double clicks", errors.slice(0, 3));
    await browser.close();
  }

  /* ---------- phone and desktop width ---------- */
  for (const [label, vp] of [["phone (390 x 844)", { width: 390, height: 844 }], ["desktop (1280 x 900)", { width: 1280, height: 900 }]]) {
    const { browser, page, errors } = await openApp({ context: { viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600 } });
    page.setDefaultTimeout(8000);
    const wide = [];
    const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (const p of TABS) { await tab(page, p); if ((await sideways()) > 1) wide.push(p); }
    t.check(!wide.length, label + ": no tab scrolls sideways", wide);
    await tab(page, "basicsPanel");
    await page.evaluate(() => { document.querySelectorAll("#basicsTree details").forEach(d => d.open = true); });
    await page.waitForTimeout(1500);
    const w1 = await sideways();
    t.check(w1 <= 1, label + ": RCM Basics with every topic open does not scroll sideways", w1);
    const over = await page.evaluate(() => { const vw = document.documentElement.clientWidth, bad = []; document.querySelectorAll("#basicsTree .lesbody, #basicsTree .lesbody *").forEach(e => { if (e.closest(".tblwrap")) return; const r = e.getBoundingClientRect(); if (r.width && r.right > vw + 2) bad.push(e.tagName + "." + e.className + " right=" + Math.round(r.right)); }); return bad.slice(0, 5); });
    t.check(!over.length, label + ": no lesson text or box sticks out past the screen edge (tables scroll inside their own box)", over);
    await tab(page, "sopPanel");
    await page.evaluate(() => { document.querySelectorAll("#sopTree details").forEach(d => d.open = true); });
    await page.waitForTimeout(1500);
    const w2 = await sideways();
    await tab(page, "specPanel");
    await page.evaluate(() => { document.querySelectorAll("#specTree details").forEach(d => d.open = true); });
    await page.waitForTimeout(1500);
    const w3 = await sideways();
    t.check(w2 <= 1 && w3 <= 1, label + ": playbooks and specialties with every topic open do not scroll sideways", { sop: w2, spec: w3 });
    await tab(page, "browsePanel"); await page.click("#expandAll");
    t.check((await sideways()) <= 1, label + ": All Denials expanded does not scroll sideways");
    await tab(page, "quizPanel");
    const s = await playQuiz(page, "#quizArea", "#nextQ", i => i % 3);
    const wq = await sideways();
    t.check(checkScore(s) && wq <= 1, label + ": a Theory quiz and its result page fit the screen", { big: s.big, wq });
    await page.click('.qtype[data-type="call"]'); await page.waitForTimeout(150);
    t.check(await page.evaluate(() => document.querySelectorAll("#callArea .dq").length === 1), label + ": opening the Call tab starts a call round straight away");
    const wc = await sideways();
    t.check(wc <= 1, label + ": the call role play fits the screen", wc);
    await tab(page, "askPanel");
    await page.fill("#q", "no authorization on file for the surgery, what do I do"); await page.click("#go");
    const wa = await sideways();
    const reach = await page.evaluate(() => { const vw = document.documentElement.clientWidth, bad = []; document.querySelectorAll("#answers .card button, #go, #q").forEach(b => { const r = b.getBoundingClientRect(); if (r.width && (r.right > vw + 1 || r.left < -1)) bad.push((b.textContent || b.id).slice(0, 20)); }); return bad; });
    t.check(wa <= 1 && !reach.length, label + ": an answer card fits the screen and its buttons are inside it", { wa, reach });
    if (vp.width < 600) {
      const nav = await page.evaluate(async () => { const out = []; for (const b of document.querySelectorAll(".navtab")) { b.scrollIntoView({ inline: "center", block: "nearest" }); await new Promise(r => setTimeout(r, 30)); const r = b.getBoundingClientRect(); out.push({ id: b.dataset.panel, ok: r.left >= -1 && r.right <= innerWidth + 1, h: Math.round(r.height) }); } return out; });
      t.check(nav.every(x => x.ok), label + ": every tab button can be scrolled into view on the tab strip", nav.filter(x => !x.ok));
      t.check(nav.every(x => x.h >= 32), label + ": tab buttons are tall enough to tap (32 px or more)", nav.map(x => x.id + ":" + x.h));
      const small = await page.evaluate(() => { const bad = []; document.querySelectorAll(".opt, .btn").forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height && r.height < 30) bad.push((b.textContent || "").trim().slice(0, 25) + " h=" + Math.round(r.height)); }); return bad.slice(0, 5); });
      t.check(!small.length, label + ": visible answer and action buttons are at least 30 px tall", small);
    }
    t.check(!errors.length, label + ": no page errors during the walk", errors.slice(0, 3));
    await browser.close();
  }

  t.done();
})().catch(e => { console.log("  FAIL  edge input test crashed  ->  " + e.stack.split("\n").slice(0, 3).join(" | ")); process.exitCode = 1; });
