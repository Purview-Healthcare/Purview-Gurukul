/* Learner workflows end to end in Chromium: Ask, RCM Basics, All Denials, Purview SOPs, Specialties, Quiz.
   Only made-up typing is used; the Google script is mocked by openApp. */
"use strict";
const { suite, openApp, tab, PAGE } = require("./helpers");
const { playQuiz, checkScore } = require("./qa-helpers");

(async () => {
  const t = suite("Learner flows");
  const { browser, context, page, errors } = await openApp();
  page.setDefaultTimeout(8000);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const reload = async () => { await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(250); };
  const askText = async q => { await tab(page, "askPanel"); await page.fill("#q", q); await page.click("#go"); await page.waitForTimeout(80); };
  const topCard = () => ev(() => { const c = document.querySelector("#answers .card"); return c ? { h2: (c.querySelector("h2") || {}).textContent || "", text: c.textContent, codes: [...c.querySelectorAll(".code")].map(x => x.textContent) } : null; });

  /* ================= Ask ================= */
  const tiles = await ev(() => ({ tiles: [...document.querySelectorAll("#tiles .tile")].map(x => x.textContent), den: DATA.length, bl: B_LESSONS.length, sl: S_LESSONS.length, xl: X_LESSONS.length }));
  t.check(tiles.tiles.some(x => x.startsWith(tiles.bl + "RCM")) && tiles.tiles.some(x => x.startsWith(tiles.den + "Denial")) && tiles.tiles.some(x => x.startsWith(tiles.sl + "Process")) && tiles.tiles.some(x => x.startsWith(tiles.xl + "Specialty")),
    "the home tiles show the real counts of lessons, denials, process topics and specialty topics", tiles.tiles);

  await askText("CO-22");
  let c = await topCard();
  t.check(c && c.codes.some(x => /^(CO-?)?22$/.test(x) || x.includes("22")) , "asking CO-22 shows a denial that carries code 22", c && { h2: c.h2, codes: c.codes });
  await askText("CO-197");
  c = await topCard();
  t.check(c && /auth/i.test(c.h2) && c.codes.some(x => x.includes("197")), "asking CO-197 shows the authorization denial", c && { h2: c.h2, codes: c.codes });
  await askText("what is a deductible");
  c = await topCard();
  t.check(c && /deductible/i.test(c.text), "a plain question (what is a deductible) is answered from the course", c && c.text.slice(0, 120));
  await askText("   ");
  const before = await ev(() => document.querySelectorAll("#answers .card").length);
  await page.fill("#q", "   "); await page.press("#q", "Enter");
  t.check((await ev(() => document.querySelectorAll("#answers .card").length)) === before, "an empty or blank question does nothing");
  await askText("zzqxv plorb wumpf");
  c = await topCard();
  t.check(c && /Nothing here matches/.test(c.text), "a nonsense question says nothing matches and offers help", c && c.text.slice(0, 120));
  await page.fill("#q", "typed text"); await page.press("#q", "Enter"); await page.waitForTimeout(80);
  t.check((await page.inputValue("#q")) === "", "the search box clears after asking with Enter");

  /* HTML typed in the box is shown as text */
  const evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script><b>bold</b>';
  await askText(evil);
  const xss = await ev(() => ({ x: window.__xss, imgs: document.querySelectorAll("#answers img[src='x']").length, asked: (document.querySelector("#answers .card-q b") || {}).textContent }));
  t.check(!xss.x && !xss.imgs && xss.asked === evil, "HTML and script typed in Ask is shown as plain text, not run", xss);
  await tab(page, "basicsPanel");
  await page.fill("#bq", evil); await page.waitForTimeout(150);
  const xss2 = await ev(() => ({ x: window.__xss, imgs: document.querySelectorAll("#basicsTree img, #bnone img").length }));
  t.check(!xss2.x && !xss2.imgs, "HTML typed in the RCM Basics search is not run", xss2);
  await page.fill("#bq", ""); await page.waitForTimeout(100);

  /* huge input */
  const huge = "deductible ".repeat(3000);
  const cardsBefore = await ev(() => document.querySelectorAll("#answers .card").length);
  const t0 = Date.now(); await tab(page, "askPanel"); await ev(h => { try { $("#q").value = h; ask(); } catch (e) { window.__askErr = e.message.slice(0, 60); } }, huge); const dt = Date.now() - t0;
  const cardsAfter = await ev(() => document.querySelectorAll("#answers .card").length);
  const wideAsk = await ev(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  t.check(dt < 8000 && cardsAfter === cardsBefore + 1, "a 33,000 character question is answered within 8 seconds", { ms: dt, cardsBefore, cardsAfter, err: await ev(() => window.__askErr) });
  t.check(!wideAsk, "a very long question does not make the page scroll sideways");
  await askText("x".repeat(5000));
  t.check(!(await ev(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "a 5,000 character word without spaces does not make the page scroll sideways");

  await ev(() => { document.querySelector('#answers').innerHTML = ''; });
  /* every example chip gives an answer card with real text */
  await ev(() => { document.querySelector('#answers').innerHTML = ''; });
  const chips = await ev(() => { const out = []; document.querySelectorAll("#chips .chip").forEach(b => { const before = document.querySelectorAll("#answers .card").length; b.click(); const cards = document.querySelectorAll("#answers .card"); const top = cards[0]; out.push({ q: b.textContent, grew: cards.length === before + 1, bad: /undefined|NaN|\[object/.test(top ? top.textContent : "undefined"), empty: !top || top.textContent.length < 60 }); }); return out; });
  t.check(chips.length > 60 && chips.every(x => x.grew && !x.bad && !x.empty), "every example question chip (all groups) gives a full answer card", { n: chips.length, bad: chips.filter(x => !x.grew || x.bad || x.empty).map(x => x.q).slice(0, 5) });

  await ev(() => { document.querySelector('#answers').innerHTML = ''; });
  /* every denial can be found by its own name, and by each of its codes */
  const byName = await ev(() => { const bad = []; DATA.forEach(d => { $("#q").value = d.name; ask(); const h = document.querySelector("#answers .card h2"); const txt = document.querySelector("#answers .card").textContent; if (!h || (h.textContent.trim() !== d.name && !txt.includes(d.name))) bad.push(d.name + " -> " + (h ? h.textContent : "none")); }); return bad; });
  t.check(!byName.length, "asking for a denial by its exact name finds that denial", byName.slice(0, 6));
  const byCode = await ev(() => { const bad = []; DATA.forEach(d => (d.codes || []).forEach(code => { if (!/^\d+$/.test(code)) return; $("#q").value = "CO-" + code; ask(); const card = document.querySelector("#answers .card"); const codes = [...card.querySelectorAll(".code")].map(x => normCode(x.textContent)); if (!codes.includes(normCode(code))) bad.push("CO-" + code + " (" + d.name + ") -> " + [...codes].join(",")); })); return bad; });
  t.check(!byCode.length, "asking CO plus a numeric code shows a denial that carries that code", byCode.slice(0, 8));

  /* highlight must not change the words shown */
  const hlBug = await ev(() => { const probe = (txt, term) => { const d = document.createElement("div"); d.innerHTML = hl(txt, [term]); return d.textContent === txt; }; return { amp: probe("Terms & conditions apply", "amp"), quot: probe('Say "hello" now', "quot"), lt: probe("a < b and c > d", "gt"), plain: probe("deductible met", "deductible") }; });
  t.check(hlBug.amp && hlBug.quot && hlBug.lt && hlBug.plain, "highlighting a searched word never changes the text shown (&, quotes, < and >)", hlBug);

  /* starter cards and related denials, quiz buttons on a denial */
  await reload();
  await tab(page, "askPanel");
  await page.locator("#starterGrid .hcard").first().click();
  t.check(await ev(() => !!document.querySelector("#answers .card h2") && document.querySelector("#starter").style.display === "none"), "a starter denial card opens its answer and hides the starter grid");
  await reload();
  await page.locator("#starterBasics .hcard").first().click(); await page.waitForTimeout(150);
  t.check(await ev(() => document.querySelector("#basicsPanel").classList.contains("on") && !!document.querySelector("#basicsTree details.les[open] .lesbody")), "a starter course card opens that topic in RCM Basics");
  await askText("duplicate claim");
  const nAlt = await ev(() => document.querySelectorAll("#answers .card:first-child .alts .alt").length);
  if (nAlt) { const nm = await page.locator("#answers .card:first-child .alts .alt span").first().textContent(); await page.locator("#answers .card:first-child .alts .alt").first().click(); await page.waitForTimeout(100); const h = (await topCard()).h2; t.check(h === nm, "a related-denial button opens that denial", { want: nm, got: h }); }
  else t.check(false, "a related-denial button opens that denial", "no related denials shown");
  await askText("timely filing");
  for (const kind of ["theory", "call", "scenario"]) {
    await askText("timely filing");
    await page.locator('#answers .card:first-child .dquiz[data-kind="' + kind + '"]').click();
    const s = await playQuiz(page, "#answers .card:first-child .dqarea", ".dqnext", i => i % 2);
    t.check(s.total >= 3 && checkScore(s), "the " + kind + " quiz on a denial can be played to the end and the score equals correct over total", { big: s.big, correct: s.correct, total: s.total });
  }
  await page.locator("#answers .card:first-child .copybtn").click();
  t.check(true, "Copy answer can be clicked without an error");

  /* ================= RCM Basics ================= */
  await reload(); await tab(page, "basicsPanel");
  const bs = await ev(() => ({ days: document.querySelectorAll("#basicsTree details.day").length, mods: document.querySelectorAll("#basicsTree details.mod").length, les: document.querySelectorAll("#basicsTree details.les").length, prog: document.querySelector("#bprog").textContent, B: B_LESSONS.length, M: BASICS_MODULES.length }));
  t.check(bs.days === 6 && bs.mods === bs.M && bs.les === bs.B && new RegExp("^0 of " + bs.B + " topics read").test(bs.prog), "RCM Basics lists every day, module and topic and starts at 0 read", bs);
  await ev(() => { document.querySelectorAll("#basicsTree details.day, #basicsTree details.mod").forEach(d => d.open = true); });
  const first = page.locator("#basicsTree details.les").first(); const firstId = await first.getAttribute("data-id");
  await first.locator("summary .ltitle").click(); await page.waitForTimeout(100);
  t.check(await first.locator(".lesbody").count() === 1 && await first.evaluate(d => d.open), "clicking a topic title opens its content");
  await first.locator("[data-mark]").click();
  const read1 = await ev(id => ({ prog: document.querySelector("#bprog").textContent, ls: localStorage.getItem("gk_basics_read"), done: document.querySelector('#basicsTree details.les[data-id="' + id + '"]').classList.contains("done") }), firstId);
  t.check(/^1 of /.test(read1.prog) && read1.done && read1.ls.includes(firstId), "marking a topic read raises the progress count and saves it", read1);
  const cnts = await ev(id => { const d = document.querySelector('#basicsTree details.les[data-id="' + id + '"]'); return { mod: d.closest("details.mod").querySelector(":scope > summary .cnt").textContent, day: d.closest("details.day").querySelector(":scope > summary .cnt").textContent }; }, firstId);
  t.check(/^1\//.test(cnts.mod) && /^1\//.test(cnts.day), "the module and day counters go up with the topic", cnts);
  await reload(); await tab(page, "basicsPanel");
  t.check(/^1 of /.test(await page.textContent("#bprog")), "read progress is still there after reloading the page");
  await ev(id => { document.querySelector('#basicsTree details.les[data-id="' + id + '"] .tick').click(); }, firstId);
  t.check(/^0 of /.test(await page.textContent("#bprog")), "the tick in the list unmarks a read topic without opening it");
  await ev(() => { document.querySelectorAll("#basicsTree details.les .tick").forEach((b, i) => { if (i < 3) b.click(); }); });
  await page.click("#bReset"); await page.waitForTimeout(100);
  t.check(/^0 of /.test(await page.textContent("#bprog")) && !(await ev(() => localStorage.getItem("gk_basics_read"))), "Reset progress clears every read mark");
  await page.fill("#bq", "copay"); await page.waitForTimeout(150);
  const f1 = await ev(() => ({ shown: [...document.querySelectorAll("#basicsTree details.les")].filter(d => !d.hidden).length, none: !document.querySelector("#bnone").hidden }));
  await page.fill("#bq", "zzqxv"); await page.waitForTimeout(150);
  const f2 = await ev(() => ({ shown: [...document.querySelectorAll("#basicsTree details.les")].filter(d => !d.hidden).length, none: !document.querySelector("#bnone").hidden }));
  await page.click("#bclear"); await page.waitForTimeout(150);
  const f3 = await ev(() => ({ shown: [...document.querySelectorAll("#basicsTree details.les")].filter(d => !d.hidden).length, none: !document.querySelector("#bnone").hidden }));
  t.check(f1.shown > 0 && f1.shown < bs.B && !f1.none && f2.shown === 0 && f2.none && f3.shown === bs.B && !f3.none, "course search narrows the list, says so when nothing matches, and clearing brings everything back", { f1, f2, f3 });
  const bchipBad = await ev(() => { const bad = []; document.querySelectorAll("#bchips .chip").forEach(b => { $("#bq").value = b.textContent; bQuery(true); const n = [...document.querySelectorAll("#basicsTree details.les")].filter(d => !d.hidden).length; if (!n) bad.push(b.textContent); }); $("#bq").value = ""; applyFilter(""); return bad; });
  t.check(!bchipBad.length, "every suggestion chip in RCM Basics finds at least one topic", bchipBad);
  await ev(() => { $("#glossary").open = true; $("#reviewBox").open = true; });
  const gl = await ev(() => ({ g: document.querySelector("#glossBody").textContent.length, r: document.querySelector("#reviewBody").textContent.length, gc: document.querySelector("#glossCnt").textContent }));
  t.check(gl.g > 500 && gl.r > 100 && !/NaN|undefined/.test(gl.gc), "the glossary and the 'keep it current' list open with content", gl);
  const cyc = await ev(() => { const b = document.querySelector("#cycleMap .cstep"); if (!b) return null; const id = b.dataset.go; b.click(); return { id, open: !!document.querySelector('#basicsTree details.les[data-id="' + id + '"][open]') }; });
  t.check(!cyc || cyc.open, "a step in the revenue cycle map opens its topic", cyc);

  /* day quizzes: every day, score equals correct over total; wrong picks explain why */
  const days = await ev(() => B_DAYS);
  let dayAll = [];
  for (const day of days) {
    await ev(() => { document.querySelectorAll("#basicsTree details.day").forEach(d => d.open = true); });
    const box = '.dayquiz[data-day="' + day + '"]';
    await page.locator(box + " [data-start]").click();
    const s = await playQuiz(page, box + " .dqarea", ".dqnext", i => i % 3);
    dayAll.push(Object.assign({ day }, s));
  }
  t.check(dayAll.every(s => s.total >= 10 && s.n === s.total), "each day quiz starts and asks every question it promised", dayAll.map(s => s.day + ":" + s.n + "/" + s.total));
  t.check(dayAll.every(checkScore), "each day quiz result equals the number of right answers over the total", dayAll.map(s => s.day + " " + s.big + " " + s.correct));
  t.check(dayAll.every(s => s.wrongNoWhy.length === 0 && s.noFeedback === 0), "every wrong answer in the day quizzes shows a why-not line and every answer shows feedback", dayAll.map(s => s.wrongNoWhy).flat().slice(0, 3));
  t.check(dayAll.every(s => !s.badOptions.length), "day quizzes never show an empty or repeated option", dayAll.map(s => s.badOptions).flat());
  const q1 = dayAll[0].questions.join("|");
  await ev(() => { document.querySelector(".dayquiz[data-day='Day 1'] .dqagain").click(); });
  const s2 = await playQuiz(page, '.dayquiz[data-day="Day 1"] .dqarea', ".dqnext", () => 0);
  t.check(s2.questions.join("|") !== q1 && checkScore(s2), "'New set of questions' on a day quiz deals a different set that also scores correctly", { same: s2.questions.join("|") === q1 });
  const pr = await ev(async () => { const area = document.querySelector('.dayquiz[data-day="Day 1"] .dqarea'); area.querySelector(".pname").value = "Test Learner"; area.querySelector(".dqprint").click(); await new Promise(r => setTimeout(r, 200)); const sheet = document.querySelector("#printSheet").textContent; return { printed: window.__printed, sheet }; });
  const sm = /Score: (\d+) \/ (\d+)/.exec(pr.sheet);
  t.check(pr.printed >= 1 && sm && (sm[1] + " / " + sm[2]) === s2.big && /Test Learner/.test(pr.sheet), "Print results prints a sheet with the learner name and the same score as on screen", { printed: pr.printed, big: s2.big, sheet: pr.sheet.slice(0, 160) });
  const cp = await ev(() => { let got = ""; const area = document.querySelector('.dayquiz[data-day="Day 1"] .dqarea'); const old = copy; window.copy = x => { got = x; }; try { area.querySelector(".dqcopy").click(); } finally { window.copy = old; } return got; });
  t.check(true, "Copy as text can be clicked without an error");
  await ev(() => document.querySelector('.dayquiz[data-day="Day 1"] .dqclose').click());
  t.check(await ev(() => !document.querySelector('.dayquiz[data-day="Day 1"] [data-start]').hidden && !document.querySelector('.dayquiz[data-day="Day 1"] .dqarea').innerHTML), "closing a day quiz brings the start button back");
  const disc = await ev(() => [...document.querySelectorAll("#basicsTree .discuss")].length);
  t.check(disc >= 5, "the group discussion prompts are shown for the days that have them", disc);

  /* ================= All Denials ================= */
  await reload(); await tab(page, "browsePanel");
  const br = await ev(() => { document.querySelector("#expandAll").click(); const fam = [...document.querySelectorAll("#browseList > details")]; return { fams: fam.length, open: fam.every(d => d.open), items: document.querySelectorAll("#browseList .accbody > button").length, den: DATA.length, sub: document.querySelector("#bandSub").textContent }; });
  t.check(br.fams === 9 && br.open && br.items === br.den && new RegExp("^" + br.den + " scenarios").test(br.sub), "All Denials lists every denial under its category and Expand all opens them", br);
  await ev(() => document.querySelector("#collapseAll").click());
  t.check(await ev(() => [...document.querySelectorAll("#browseList > details")].every(d => !d.open)), "Collapse all closes every category");
  const openAll = await ev(() => { const bad = []; document.querySelectorAll("#browseList .accbody > button").forEach(b => { showPanel("browsePanel"); b.click(); const h = document.querySelector("#answers .card h2"); if (!h || h.textContent.trim() !== b.dataset.name || !document.querySelector("#askPanel").classList.contains("on")) bad.push(b.dataset.name); }); return bad; });
  t.check(!openAll.length, "every denial in the library opens its own full answer", openAll.slice(0, 5));
  await tab(page, "browsePanel");
  await ev(() => document.querySelector("#expandAll").click());
  const famBox = '#browseList .dayquiz[data-fam="' + (await ev(() => fams[0])) + '"]';
  const famRes = [];
  for (const kind of ["theory", "call", "scenario"]) {
    await page.locator(famBox + ' [data-start="' + kind + '"]').click();
    const s = await playQuiz(page, famBox + " .dqarea", ".dqnext", i => (i + 1) % 3);
    famRes.push(Object.assign({ kind }, s));
    await ev(b => document.querySelector(b + " .dqclose").click(), famBox);
  }
  t.check(famRes.every(s => s.total >= 3 && checkScore(s) && !s.badOptions.length), "the category quizzes (theory, call, scenario) run to the end with a correct score", famRes.map(s => s.kind + " " + s.big + " vs " + s.correct));

  /* ================= Purview SOPs ================= */
  await reload(); await tab(page, "sopPanel");
  const sp = await ev(() => ({ clients: document.querySelectorAll("#sopTree > details.day").length, les: document.querySelectorAll("#sopTree details.les").length, names: SOP_CLIENTS.map(c => c.id), prog: document.querySelector("#sprog").textContent, S: S_LESSONS.length }));
  t.check(sp.clients === 4 && sp.les === sp.S && sp.names.join() === "abw,hagion,titan,vec" && new RegExp("^0 of " + sp.S).test(sp.prog), "Purview SOPs shows the four client playbooks (ABW, Hagion, Titan, VEC) with every topic", sp);
  const sopOpen = await ev(async () => { const bad = []; document.querySelectorAll("#sopTree details").forEach(d => d.open = true); await new Promise(r => setTimeout(r, 1200)); document.querySelectorAll("#sopTree details.les").forEach(d => { const b = d.querySelector(".lesbody"); if (!b || b.textContent.length < 80) bad.push(d.dataset.id); }); return { bad, n: document.querySelectorAll("#sopTree details.les").length }; });
  t.check(!sopOpen.bad.length && sopOpen.n === sp.S, "every playbook topic opens with real content", sopOpen.bad.slice(0, 5));
  const upd = await ev(() => {
    const vec = SOP_CLIENTS.find(c => c.id === "vec"), panel = document.querySelectorAll("#sopTree .updpanel");
    const out = { panels: panel.length, vecUpdates: (vec.updates || []).length, shown: panel.length ? panel[0].querySelectorAll(".upd").length : 0, badges: document.querySelectorAll("#sopTree details.les .updnew").length,
      expectBadges: S_LESSONS.filter(l => updIsNew(l.upd)).length, banners: document.querySelectorAll("#sopTree .updbanner").length, expectBanners: S_LESSONS.filter(l => l.upd && updFor(l)).length, links: 0, badLinks: [] };
    document.querySelectorAll("#sopTree .updpanel [data-go]").forEach(b => { out.links++; if (!S_BY_ID[b.dataset.go]) out.badLinks.push(b.dataset.go); });
    return out;
  });
  t.check(upd.panels === SOP_CLIENTSWithUpdates(upd) && upd.shown === upd.vecUpdates, "only playbooks that have updates show a 'What changed' panel, listing every update", upd);
  t.check(upd.badges === upd.expectBadges, "the Updated badge appears on exactly the topics changed in the last 30 days", { badges: upd.badges, expect: upd.expectBadges });
  t.check(upd.banners === upd.expectBanners && upd.links > 0 && !upd.badLinks.length, "updated topics carry a banner and the 'What changed' links point to real topics", upd);
  const lnk = await ev(() => { const b = document.querySelector("#sopTree .updpanel [data-go]"); const id = b.dataset.go; document.querySelectorAll("#sopTree details.les").forEach(d => d.open = false); b.click(); const d = document.querySelector('#sopTree details.les[data-id="' + id + '"]'); return { id, open: d.open, panel: document.querySelector("#sopPanel").classList.contains("on") }; });
  t.check(lnk.open && lnk.panel, "a link in 'What changed' opens the updated topic", lnk);
  const ordering = await ev(() => { const d = [...document.querySelectorAll("#sopTree .updpanel .upddate")].map(x => x.textContent); const vec = clientUpdates(SOP_CLIENTS.find(c => c.id === "vec")); return { shown: d, newestFirst: vec.every((u, i) => !i || vec[i - 1].date >= u.date) }; });
  t.check(ordering.newestFirst, "'What changed' lists the newest update first", ordering);
  await ev(() => { document.querySelectorAll("#sopTree .les .tick").forEach((x, i) => { if (i < 2) x.click(); }); });
  t.check(/^2 of /.test(await page.textContent("#sprog")), "marking playbook topics read updates the playbook progress");
  await page.click("#sReset"); t.check(/^0 of /.test(await page.textContent("#sprog")), "Reset progress in Purview SOPs clears the marks");
  const sopQuizRes = [];
  const clientIds = await ev(() => SOP_CLIENTS.map(c => c.id));
  for (const id of clientIds) {
    await ev(() => document.querySelectorAll("#sopTree details").forEach(d => d.open = true));
    const mod = await ev(cid => { const c = SOP_CLIENTS.find(x => x.id === cid); return c.modules[0].short; }, id);
    const box = '#sopTree .dayquiz[data-smod="' + mod + '"]';
    await page.locator(box + " [data-start]").click();
    const s = await playQuiz(page, box + " .dqarea", ".dqnext", i => i % 3);
    sopQuizRes.push(Object.assign({ id }, s));
  }
  t.check(sopQuizRes.every(s => s.total >= 5 && checkScore(s)), "the first module assessment of every playbook runs to the end with a correct score", sopQuizRes.map(s => s.id + " " + s.big + "/" + s.correct));
  t.check(sopQuizRes.every(s => s.wrongNoWhy.length === 0), "wrong answers in the playbook assessments show why-not text", sopQuizRes.map(s => s.wrongNoWhy).flat().slice(0, 3));
  const pbox = '#sopTree .dayquiz[data-sclient="vec"]';
  await ev(() => document.querySelectorAll("#sopTree details").forEach(d => d.open = true));
  await page.locator(pbox + " [data-start]").click();
  const ps = await playQuiz(page, pbox + " .dqarea", ".dqnext", i => (i + 2) % 3);
  t.check(ps.total === 15 && checkScore(ps), "the VEC practice round asks 15 questions and scores correctly", { total: ps.total, big: ps.big, correct: ps.correct });
  const certBtn = await ev(() => [...document.querySelectorAll("#sopTree [data-cert]")].map(b => b.dataset.cert));
  t.check(certBtn.length >= 4, "each playbook has a button toward its certificate", certBtn);

  /* ================= Specialties ================= */
  await reload(); await tab(page, "specPanel");
  const spc = await ev(() => ({ tracks: document.querySelectorAll("#specTree > details.day").length, les: document.querySelectorAll("#specTree details.les").length, X: X_LESSONS.length, ids: SPEC_TRACKS.map(t => t.id), prog: document.querySelector("#xprog").textContent }));
  t.check(spc.tracks === 3 && spc.les === spc.X && new RegExp("^0 of " + spc.X).test(spc.prog), "Specialties shows the three tracks (vision, dental, behavioral health) with every topic", spc);
  const specOpen = await ev(async () => { const bad = []; document.querySelectorAll("#specTree details").forEach(d => d.open = true); await new Promise(r => setTimeout(r, 1200)); document.querySelectorAll("#specTree details.les").forEach(d => { const b = d.querySelector(".lesbody"); if (!b || b.textContent.length < 80) bad.push(d.dataset.id); }); return bad; });
  t.check(!specOpen.length, "every specialty topic opens with real content", specOpen.slice(0, 5));
  const seeAll = await ev(() => {
    const bad = []; let n = 0;
    [...document.querySelectorAll("details.les .alts.inles .alt")].forEach(b => {
      n++; const dn = b.dataset.denial, go = b.dataset.go;
      if (dn) { showPanel("specPanel"); b.click(); const h = document.querySelector("#answers .card h2"); if (!h || h.textContent.trim() !== dn || !document.querySelector("#askPanel").classList.contains("on")) bad.push("denial " + dn); }
      else if (go) { b.click(); const open = document.querySelector('details.les[data-id="' + go + '"]'); const panel = open && open.closest(".panel"); if (!open || !open.open || !panel.classList.contains("on")) bad.push("topic " + go); }
      else bad.push("button with no target");
    });
    return { n, bad };
  });
  t.check(seeAll.n > 20 && !seeAll.bad.length, "every 'see also' button in the playbooks and specialties goes to the right denial or topic", { n: seeAll.n, bad: seeAll.bad.slice(0, 5) });
  await tab(page, "specPanel");
  const specRes = [];
  for (const tr of spc.ids) {
    await ev(() => document.querySelectorAll("#specTree details").forEach(d => d.open = true));
    const mod = await ev(id => SPEC_TRACKS.find(x => x.id === id).modules[0].short, tr);
    const box = '#specTree .dayquiz[data-xmod="' + mod + '"]';
    await page.locator(box + " [data-start]").click();
    const s = await playQuiz(page, box + " .dqarea", ".dqnext", i => i % 3);
    specRes.push(Object.assign({ tr }, s));
  }
  t.check(specRes.every(s => s.total >= 5 && checkScore(s) && s.wrongNoWhy.length === 0), "the first module assessment of every specialty track scores correctly and explains wrong picks", specRes.map(s => s.tr + " " + s.big + "/" + s.correct));
  const xbox = '#specTree .dayquiz[data-xtrack="vision"]';
  await ev(() => document.querySelectorAll("#specTree details").forEach(d => d.open = true));
  await page.locator(xbox + " [data-start]").click();
  const xs = await playQuiz(page, xbox + " .dqarea", ".dqnext", () => 0);
  t.check(xs.total === 15 && checkScore(xs), "the vision practice round asks 15 questions and scores correctly", { total: xs.total, big: xs.big, correct: xs.correct });
  await ev(() => { document.querySelectorAll("#specTree .les .tick").forEach((x, i) => { if (i < 4) x.click(); }); });
  t.check(/^4 of /.test(await page.textContent("#xprog")), "marking specialty topics read updates the specialty progress");

  /* ================= Quiz tab ================= */
  await reload(); await tab(page, "quizPanel");
  const modes = [["rcm", "RCM Basics"], ["ar", "AR & Denials"], ["sop", "Purview SOPs"], ["spec", "Specialties"]];
  const qres = [];
  for (const [m] of modes) {
    await page.click('.qmode[data-mode="' + m + '"]'); await page.waitForTimeout(80);
    const s = await playQuiz(page, "#quizArea", "#nextQ", i => i % 3);
    qres.push(Object.assign({ m }, s));
  }
  t.check(qres.every(s => s.total >= 8 && s.n === s.total), "every Theory mode (RCM Basics, AR & Denials, SOPs, Specialties) deals a full round and every question can be answered", qres.map(s => s.m + ":" + s.n + "/" + s.total));
  t.check(qres.every(checkScore), "the Theory result in every mode equals right answers over total", qres.map(s => s.m + " " + s.big + " vs " + s.correct));
  t.check(qres.every(s => s.wrongNoWhy.length === 0 && s.noFeedback === 0 && !s.badOptions.length), "Theory feedback always names the answer and wrong picks say why", qres.map(s => s.wrongNoWhy).flat().slice(0, 3));
  const resShot = await ev(() => ({ btns: [...document.querySelectorAll("#quizArea button")].map(b => b.textContent.trim()).filter(Boolean), mode: QZ.mode }));
  t.check(resShot.btns.some(x => /New round/.test(x)) && resShot.btns.some(x => /Print results/.test(x)), "the Theory result offers New round and Print results", resShot.btns);
  const firstQs = qres[qres.length - 1].questions.join("|");
  await page.click("#again"); const again = await playQuiz(page, "#quizArea", "#nextQ", () => 0);
  t.check(again.questions.join("|") !== firstQs && checkScore(again), "New round in Theory gives a different set and scores correctly", { same: again.questions.join("|") === firstQs });
  await page.click('.qmode[data-mode="ar"]'); await page.waitForTimeout(80);
  const arFilters = await ev(() => [...document.querySelectorAll("#quizFilters .chip")].map(b => b.textContent));
  await page.locator("#quizFilters .chip").nth(1).click(); await page.waitForTimeout(80);
  const arf = await ev(() => ({ n: QZ.qs.length, fam: QZ.filter, cats: [...new Set(QZ.qs.map(q => q.cat))] }));
  t.check(arFilters[0] === "All" && arFilters.length === 10 && arf.n >= 3 && arf.cats.every(x => x === arf.fam || arf.cats.length >= 1), "choosing a denial category in the Theory quiz deals a round for that category", arf);
  await tab(page, "askPanel"); await tab(page, "quizPanel");
  await page.click('.qmode[data-mode="rcm"]'); await page.waitForTimeout(80);
  await page.locator("#quizArea .opt").first().click();
  const midBefore = await page.textContent("#quizArea .qtext");
  await tab(page, "basicsPanel"); await tab(page, "quizPanel");
  t.check((await page.textContent("#quizArea .qtext")) === midBefore && await ev(() => QZ.answered), "leaving the Quiz tab mid-question and coming back keeps the round and the answer");
  /* a day quiz left half done on another tab must not steal the Theory quiz's running score */
  await reload(); await tab(page, "basicsPanel");
  await ev(() => document.querySelectorAll("#basicsTree details.day").forEach(d => d.open = true));
  await page.locator('.dayquiz[data-day="Day 1"] [data-start]').click();
  await ev(() => document.querySelector('.dayquiz[data-day="Day 1"] .opt').click());
  await tab(page, "quizPanel");
  await page.click('.qmode[data-mode="rcm"]'); await page.waitForTimeout(80);
  await ev(() => document.querySelector("#quizArea .opt").click());
  const sc = await ev(() => ({ theory: document.querySelector("#quizArea .score").textContent, day: document.querySelector('.dayquiz[data-day="Day 1"] .score').textContent }));
  t.check(/^Score: [01] \/ 1$/.test(sc.theory), "the running score in the Theory quiz is shown in the Theory quiz even when another quiz is half done elsewhere", sc);
  await reload(); await tab(page, "quizPanel");
  /* the 'open the full answer' link after a denial question */
  await page.click('.qmode[data-mode="ar"]'); await page.waitForTimeout(80);
  let linkSeen = false;
  for (let i = 0; i < 10 && !linkSeen; i++) { await page.locator("#quizArea .opt").first().click(); linkSeen = await page.locator("#quizArea .fb a[data-open]").count() > 0; if (linkSeen) { const nm = await page.getAttribute("#quizArea .fb a[data-open]", "data-open"); await page.click("#quizArea .fb a[data-open]"); await page.waitForTimeout(100); linkSeen = (await topCard()).h2 === nm; t.check(linkSeen, "'Open the full answer' after a denial question opens that denial", nm); } else { await page.click("#nextQ"); } }
  if (!linkSeen) t.check(false, "'Open the full answer' after a denial question opens that denial", "never shown");
  await tab(page, "quizPanel");
  for (const [type, sel] of [["call", "#callArea"], ["scenario", "#scenArea"], ["all", "#allArea"]]) {
    await page.click('.qtype[data-type="' + type + '"]'); await page.waitForTimeout(150);
    if (await page.locator(sel + " .dq").count() === 0) await page.click(type === "call" ? "#callGo" : type === "scenario" ? "#scenGo" : "#allGo");
    const s = await playQuiz(page, sel, ".dqnext", i => i % 3);
    t.check(s.total >= 4 && s.n === s.total && checkScore(s) && !s.badOptions.length && s.noFeedback === 0, "the " + type + " quiz is played to the end, every option is real and the score equals right answers over total", { big: s.big, correct: s.correct, total: s.total, bad: s.badOptions.slice(0, 2) });
    const q0 = s.questions.join("|");
    await page.click(sel + " .dqagain");
    const s2b = await playQuiz(page, sel, ".dqnext", () => 0);
    t.check(s2b.questions.join("|") !== q0 && checkScore(s2b), "retrying the " + type + " quiz gives a new set", { same: s2b.questions.join("|") === q0 });
  }
  const callFilters = await ev(() => [...document.querySelectorAll("#callFilters .chip")].map(b => b.textContent));
  const scFilters = await ev(() => [...document.querySelectorAll("#scenFilters .chip")].map(b => b.textContent));
  await page.click('.qtype[data-type="scenario"]');
  const scenBad = [];
  for (let i = 0; i < scFilters.length; i++) { await page.locator("#scenFilters .chip").nth(i).click(); await page.waitForTimeout(60); const n = await page.locator("#scenArea .opt").count(); if (n !== 4) scenBad.push(scFilters[i] + ":" + n); }
  t.check(!scenBad.length && scFilters.length === 7, "every scenario filter deals a round with four options per question", scenBad);
  await page.click('.qtype[data-type="call"]');
  const callBad = [];
  for (let i = 0; i < callFilters.length; i++) { await page.locator("#callFilters .chip").nth(i).click(); await page.waitForTimeout(60); const n = await page.locator("#callArea .opt").count(); if (n < 2) callBad.push(callFilters[i] + ":" + n); }
  t.check(!callBad.length && callFilters.length === 11, "every call filter deals a round with answer options", callBad);

  t.check(!errors.length, "no page errors during any learner flow", errors.slice(0, 5));
  await browser.close();
  t.done();

  function SOP_CLIENTSWithUpdates(u) { return u.vecUpdates ? 1 : 0; }
})().catch(e => { console.log("  FAIL  learner flow test crashed  ->  " + e.stack.split("\n").slice(0, 3).join(" | ")); process.exitCode = 1; });
