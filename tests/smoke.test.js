/* Smoke test: every tab opens, every topic has content, every question explains its wrong
   options, the assessments and certificates build, Ask answers, and the page fits a phone. */
"use strict";
const fs = require("fs"), path = require("path");
const { ROOT, suite, openApp, tab } = require("./helpers");

(async () => {
  const t = suite("Smoke test");
  const { browser, context, page, errors } = await openApp();

  const tabs = await page.evaluate(() => [...document.querySelectorAll(".navtab")].map(b => b.dataset.panel));
  for (const p of tabs) await tab(page, p);
  t.check(tabs.length === 8, "all 8 tabs open", tabs.join(","));

  const s = await page.evaluate(() => {
    document.querySelectorAll("#sopTree details, #specTree details, #basicsTree details").forEach(d => d.open = true);
    return { clients: SOP_CLIENTS.map(c => c.id), tracks: SPEC_TRACKS.map(c => c.id) };
  });
  await page.waitForTimeout(1200);
  const body = await page.evaluate(() => {
    const les = [...document.querySelectorAll("#sopTree details.les, #specTree details.les")];
    return { n: les.length, empty: les.filter(d => !d.querySelector(".lesbody")).map(d => d.dataset.id) };
  });
  t.check(body.n > 100 && !body.empty.length, "every playbook and specialty topic opens with content", body);

  const q = await page.evaluate(() => {
    const all = SOP_QUIZ.concat(SPEC_QUIZ);
    return { n: all.length, bad: all.filter(x => !x.q || !x.correct || !Array.isArray(x.wrongs) || x.wrongs.length !== 3 || !Array.isArray(x.whyNot) || x.whyNot.length !== 3).map(x => x.q) };
  });
  t.check(q.n > 300 && !q.bad.length, "every playbook and specialty question has three wrong options, each with a why-not", q.bad.slice(0, 3));

  const certs = await page.evaluate(() => CERT_DEFS.map(d => { try { const q = d.build ? d.build() : []; return { k: d.k, n: q.length, ok: q.every(x => x.options && x.options.length === 4) }; } catch (e) { return { k: d.k, err: e.message }; } }));
  t.check(certs.every(c => !c.err && (c.n === 0 || c.ok)), "every certificate question paper builds with four options per question", certs.filter(c => c.err || !c.ok));

  await tab(page, "askPanel");
  const asks = [];
  for (const [qq, want] of [["what is a deductible", /deductible/i], ["vec routine 92 denial", /routine 92/i], ["what is aba therapy", /ABA/], ["how to bill emdr", /EMDR/]]) {
    const h = await page.evaluate(x => { $("#q").value = x; ask(); const h = document.querySelector("#answers .card h2"); return h ? h.textContent.trim() : ""; }, qq);
    asks.push(want.test(h) ? null : qq + " -> " + h);
  }
  t.check(asks.every(x => !x), "Ask answers common questions with the right topic", asks.filter(Boolean));

  const m = await context.newPage();
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(page.url(), { waitUntil: "load" });
  const wide = [];
  for (const p of tabs) { await m.click('.navtab[data-panel="' + p + '"]'); await m.waitForTimeout(120); if (await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) wide.push(p); }
  t.check(!wide.length, "phone width: no tab scrolls sideways", wide);

  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const listed = (sw.match(/"\.\/[^"]+"/g) || []).map(x => x.slice(3, -1)).filter(Boolean);
  const missing = listed.filter(f => !fs.existsSync(path.join(ROOT, f.split("?")[0])));
  const scripts = (fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/<script src="([^"]+)"/g) || []).map(x => x.slice(13, -1)).filter(f => !/^https?:/.test(f));
  t.check(!missing.length && scripts.every(f => listed.includes(f)), "the offline cache lists every app file, and every listed file exists", { missing, notCached: scripts.filter(f => !listed.includes(f)) });

  t.check(!errors.length, "no page errors", errors);
  await browser.close();
  t.done();
})().catch(e => { console.log("  FAIL  smoke test crashed  ->  " + e.message); process.exitCode = 1; });
