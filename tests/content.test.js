/* Content integrity: ids, cross-links, question banks, generated questions, sources and updates.
   Everything is read from the loaded page (made-up data is not needed; this is the real content). */
"use strict";
const { suite, openApp } = require("./helpers");

(async () => {
  const t = suite("Content integrity");
  const { browser, page, errors } = await openApp();
  const ev = fn => page.evaluate(fn);

  /* ---------- lessons ---------- */
  const ids = await ev(() => {
    const all = B_LESSONS.concat(S_LESSONS, X_LESSONS), seen = {}, dup = [];
    all.forEach(l => { if (seen[l.id]) dup.push(l.id); seen[l.id] = 1; });
    return { n: all.length, dup, b: B_LESSONS.length, s: S_LESSONS.length, x: X_LESSONS.length,
      noId: all.filter(l => !l.id || typeof l.id !== "string").length,
      badChars: all.filter(l => !/^[a-z0-9][a-z0-9-]*$/.test(l.id)).map(l => l.id) };
  });
  t.check(ids.n > 150 && !ids.dup.length, "no two lessons share an id across the course, playbooks and specialties", ids.dup);
  t.check(!ids.noId && !ids.badChars.length, "every lesson id is a plain lowercase word with dashes", ids.badChars);

  const shape = await ev(() => {
    const bad = [];
    B_LESSONS.concat(S_LESSONS, X_LESSONS).forEach(l => {
      if (!l.title || !String(l.title).trim()) bad.push(l.id + ": title");
      if (!l.line || !String(l.line).trim()) bad.push(l.id + ": line");
      if (l.body && l.body.some(p => typeof p !== "string" || !p.trim())) bad.push(l.id + ": empty body paragraph");
      (l.terms || []).forEach(x => { if (!Array.isArray(x) || x.length !== 2 || !x[0] || !x[1]) bad.push(l.id + ": term " + JSON.stringify(x)); });
      (l.tips || []).forEach(x => { if (typeof x !== "string" || !x.trim()) bad.push(l.id + ": empty tip"); });
      if (l.remember !== undefined && !String(l.remember).trim()) bad.push(l.id + ": empty remember");
      (typeof cmpTables === "function" ? cmpTables(l) : []).forEach(c => {
        if (!c.head || !c.rows || !c.rows.length) bad.push(l.id + ": compare table empty");
        else c.rows.forEach(r => { if (r.length !== c.head.length) bad.push(l.id + ": compare row width " + r.length + " vs " + c.head.length); });
      });
    });
    return bad;
  });
  t.check(!shape.length, "every lesson has a title and one-line answer, and no empty paragraph, term, tip or table cell", shape.slice(0, 5));

  const see = await ev(() => {
    const bad = [];
    B_LESSONS.concat(S_LESSONS, X_LESSONS).forEach(l => (l.see || []).forEach(x => {
      if (!Array.isArray(x) || x.length !== 2) { bad.push(l.id + " malformed " + JSON.stringify(x)); return; }
      if (x[0] === "denial") { if (!DATA.some(d => d.name === x[1])) bad.push(l.id + " -> denial " + x[1]); }
      else if (x[0] === "basics") { if (!B_BY_ID[x[1]]) bad.push(l.id + " -> basics " + x[1]); }
      else if (x[0] === "sop") { if (!S_BY_ID[x[1]]) bad.push(l.id + " -> sop " + x[1]); }
      else if (x[0] === "spec") { if (!X_BY_ID[x[1]]) bad.push(l.id + " -> spec " + x[1]); }
      else bad.push(l.id + " unknown kind " + x[0]);
      if (x[1] === l.id) bad.push(l.id + " points to itself");
    }));
    return bad;
  });
  t.check(!see.length, "every 'see also' reference points at a real denial or topic", see.slice(0, 8));

  const kindMatch = await ev(() => {
    // a basics reference must not resolve only via another set (kind label vs set)
    const bad = [];
    B_LESSONS.concat(S_LESSONS, X_LESSONS).forEach(l => (l.see || []).forEach(x => {
      const set = x[0] === "basics" ? B_BY_ID : x[0] === "sop" ? S_BY_ID : x[0] === "spec" ? X_BY_ID : null;
      if (set && !set[x[1]] && (B_BY_ID[x[1]] || S_BY_ID[x[1]] || X_BY_ID[x[1]])) bad.push(l.id + " " + x[0] + ":" + x[1] + " is in a different set");
    }));
    return bad;
  });
  t.check(!kindMatch.length, "'see also' kinds (basics, sop, spec) match where the topic really lives", kindMatch);

  const mods = await ev(() => {
    const bad = [];
    const shorts = {};
    BASICS_MODULES.forEach(m => { if (shorts[m.short]) bad.push("dup basics short " + m.short); shorts[m.short] = 1; if (!m.lessons.length) bad.push("empty module " + m.id); });
    SOP_CLIENTS.forEach(c => c.modules.forEach(m => { if (shorts[m.short]) bad.push("dup short " + m.short); shorts[m.short] = 1; if (!m.lessons.length) bad.push("empty module " + m.id); }));
    SPEC_TRACKS.forEach(c => c.modules.forEach(m => { if (shorts[m.short]) bad.push("dup short " + m.short); shorts[m.short] = 1; if (!m.lessons.length) bad.push("empty module " + m.id); }));
    const mid = {}; BASICS_MODULES.concat(...SOP_CLIENTS.map(c => c.modules), ...SPEC_TRACKS.map(c => c.modules)).forEach(m => { if (mid[m.id]) bad.push("dup module id " + m.id); mid[m.id] = 1; });
    return bad;
  });
  t.check(!mods.length, "module ids and short names are unique and no module is empty", mods);

  /* ---------- question banks ---------- */
  const bankCheck = async (label, expr, minN) => {
    const r = await page.evaluate(src => {
      const bank = eval(src), bad = [];
      bank.forEach((x, i) => {
        const id = "#" + i + " " + String(x.q).slice(0, 50);
        const isStr = v => typeof v === "string" && v.trim().length > 0;
        if (!isStr(x.q)) bad.push(id + ": empty question");
        if (!isStr(x.correct)) bad.push(id + ": empty correct answer");
        if (!Array.isArray(x.wrongs) || x.wrongs.length !== 3) { bad.push(id + ": needs exactly 3 wrongs"); return; }
        if (x.wrongs.some(w => !isStr(w))) bad.push(id + ": empty wrong option");
        if (x.wrongs.includes(x.correct)) bad.push(id + ": correct is also a wrong");
        if (new Set(x.wrongs).size !== x.wrongs.length) bad.push(id + ": duplicate wrong options");
        if (new Set(x.wrongs.concat(x.correct).map(s => String(s).trim().toLowerCase())).size !== 4) bad.push(id + ": options equal when case and spaces are ignored");
        if (!Array.isArray(x.whyNot) || x.whyNot.length !== x.wrongs.length) bad.push(id + ": whyNot does not line up");
        else if (x.whyNot.some(w => !isStr(w))) bad.push(id + ": empty whyNot");
        if (!isStr(x.t)) bad.push(id + ": no topic");
      });
      return { n: bank.length, bad };
    }, expr);
    t.check(r.n >= minN && !r.bad.length, label, r.bad.slice(0, 5).concat("n=" + r.n));
    return r;
  };
  await bankCheck("every RCM Basics question has one correct answer, three distinct wrongs and a why-not for each", "RCM_BANK", 150);
  await bankCheck("every playbook question has one correct answer, three distinct wrongs and a why-not for each", "SOP_QUIZ", 300);
  await bankCheck("every specialty question has one correct answer, three distinct wrongs and a why-not for each", "SPEC_QUIZ", 200);

  const topics = await ev(() => {
    const bad = [];
    const bs = new Set(BASICS_MODULES.map(m => m.short)), ss = new Set(), xs = new Set();
    SOP_CLIENTS.forEach(c => c.modules.forEach(m => ss.add(m.short))); SPEC_TRACKS.forEach(c => c.modules.forEach(m => xs.add(m.short)));
    RCM_BANK.forEach(q => { if (!bs.has(q.t)) bad.push("RCM " + q.t); });
    SOP_QUIZ.forEach(q => { if (!ss.has(q.t)) bad.push("SOP " + q.t); });
    SPEC_QUIZ.forEach(q => { if (!xs.has(q.t)) bad.push("SPEC " + q.t); });
    const thin = [];
    ss.forEach(s => { if (SOP_QUIZ.filter(q => q.t === s).length < 5) thin.push(s + ":" + SOP_QUIZ.filter(q => q.t === s).length); });
    xs.forEach(s => { if (SPEC_QUIZ.filter(q => q.t === s).length < 5) thin.push(s + ":" + SPEC_QUIZ.filter(q => q.t === s).length); });
    bs.forEach(s => { if (!RCM_BANK.some(q => q.t === s)) thin.push("basics " + s + ":0"); });
    return { bad: Array.from(new Set(bad)), thin };
  });
  t.check(!topics.bad.length, "every question belongs to a module that exists", topics.bad);
  t.check(!topics.thin.length, "every module has at least 5 questions so its assessment is full-size", topics.thin);

  const dupQ = await ev(() => {
    const seen = {}, dup = [];
    SOP_QUIZ.concat(SPEC_QUIZ, RCM_BANK).forEach(q => { const k = q.t + "|" + q.q.trim().toLowerCase(); if (seen[k] && seen[k] !== q.correct) dup.push(q.q.slice(0, 60)); seen[k] = q.correct; });
    return dup;
  });
  t.check(!dupQ.length, "no question text appears twice in one topic with two different right answers", dupQ.slice(0, 5));

  const tf = await ev(() => {
    // "all of the above" style trap: an option claiming to be both/all while only one is correct is hard to test; check for lazy options
    const bad = [];
    SOP_QUIZ.concat(SPEC_QUIZ, RCM_BANK).forEach(q => q.wrongs.concat(q.correct).forEach(o => { if (/^(all|none) of the above$/i.test(o.trim())) bad.push(q.q.slice(0, 50)); }));
    return bad;
  });
  t.check(!tf.length, "no question uses 'all of the above' or 'none of the above' as an option", tf.slice(0, 4));

  /* ---------- generated and authored round builders ---------- */
  const gen = await ev(() => {
    const bad = [], seenAll = [];
    const chk = (src, qs) => qs.forEach((q, i) => {
      const id = src + " #" + i + " " + String(q.q).slice(0, 40);
      if (!q.q || !String(q.q).trim()) bad.push(id + ": empty question");
      const want = /^True or false/.test(q.q) ? 2 : 4;
      if (!Array.isArray(q.options) || q.options.length !== want) { bad.push(id + ": options not " + want); return; }
      if (new Set(q.options).size !== want) bad.push(id + ": duplicate options " + JSON.stringify(q.options));
      if (q.options.some(o => !String(o).trim())) bad.push(id + ": empty option");
      if (!(q.correct >= 0 && q.correct < want)) bad.push(id + ": correct index " + q.correct);
      if (q.whyNot && typeof q.whyNot === "object") q.options.forEach((o, k) => { if (k !== q.correct && q.whyNot[o] !== undefined && !String(q.whyNot[o]).trim()) bad.push(id + ": empty whyNot for " + o); });
      const blob = [q.q, q.options.join("|"), q.ex || "", q.pre || ""].join(" ");
      if (/undefined|NaN|\[object Object\]|null\b/.test(blob)) bad.push(id + ": broken text " + blob.slice(0, 120));
    });
    for (let r = 0; r < 6; r++) {
      chk("AR", buildRoundAR("All"));
      chk("RCM", buildRoundRCM("All"));
      chk("SOP", buildRoundSOP("All"));
      chk("SPEC", buildRoundSpec("All"));
      chk("SCEN", buildScenarioRound("All", 10));
      chk("ALL", buildEverything());
    }
    fams.forEach(f => { chk("ARfam " + f, buildRoundAR(f)); chk("callfam " + f, buildFamilyCall(f)); chk("scenfam " + f, buildFamilyScenario(f)); });
    SCEN_FAMS.forEach(f => chk("scen " + f, buildScenarioRound(f, 10)));
    chk("calls", buildCallRound(8));
    DATA.forEach(d => { chk("denialTheory " + d.name, buildDenialKind(d, "theory")); chk("denialCall " + d.name, buildDenialKind(d, "call")); chk("denialScen " + d.name, buildDenialKind(d, "scenario")); });
    return bad;
  });
  t.check(!gen.length, "every generated question (denials, scenarios, calls, mixed) has distinct options (4, or 2 for true or false), a valid answer and no broken text", gen.slice(0, 6));

  const rounds = await ev(() => {
    const out = {};
    out.ar = buildRoundAR("All").length; out.scen = buildScenarioRound("All", 10).length; out.all = buildEverything().length; out.calls = buildCallRound(8).length;
    out.rcm = buildRoundRCM("All").length;
    return out;
  });
  t.check(rounds.ar >= 8 && rounds.scen === 10 && rounds.rcm === 10 && rounds.all >= 8 && rounds.calls >= 4, "each quiz type deals a usable number of questions", rounds);

  const newSet = await ev(() => {
    const a = buildRoundRCM("All").map(q => q.q).join("|"), b = buildRoundRCM("All").map(q => q.q).join("|");
    const c = buildScenarioRound("All", 10).map(q => q.q).join("|"), d = buildScenarioRound("All", 10).map(q => q.q).join("|");
    return { rcmDiffers: a !== b, scenDiffers: c !== d };
  });
  t.check(newSet.rcmDiffers && newSet.scenDiffers, "two rounds in a row are not the same set of questions", newSet);

  /* ---------- calls ---------- */
  const calls = await ev(() => {
    const bad = [];
    const idseen = {};
    CALLS.forEach(c => {
      if (idseen[c.id]) bad.push("dup call id " + c.id); idseen[c.id] = 1;
      if (!c.title || !c.setup || !c.turns.length) bad.push(c.id + ": missing title/setup/turns");
      if (c.dn && !DATA.some(d => d.name === c.dn)) bad.push(c.id + ": dn does not resolve " + c.dn);
      c.turns.forEach((tn, i) => {
        const w = tn.wrong || [];
        if (!tn.rep || !tn.say || !tn.why) bad.push(c.id + " turn " + i + ": empty rep/say/why");
        if (w.length !== 3) bad.push(c.id + " turn " + i + ": wrong count " + w.length);
        if (w.includes(tn.say)) bad.push(c.id + " turn " + i + ": say is also wrong");
        if (new Set(w).size !== w.length) bad.push(c.id + " turn " + i + ": dup wrongs");
        if ((tn.whyNot || []).length !== w.length) bad.push(c.id + " turn " + i + ": whyNot count");
      });
    });
    return bad;
  });
  t.check(!calls.length, "every scripted call has a clear next line, three distinct wrong lines and a reason for each", calls.slice(0, 6));

  /* ---------- denial library ---------- */
  const den = await ev(() => {
    const bad = [], names = {};
    DATA.forEach(d => {
      if (names[d.name]) bad.push("dup name " + d.name); names[d.name] = 1;
      if (!d.name || !d.summary || !d.denial_wording) bad.push(d.name + ": missing name/summary/wording");
      if (!Array.isArray(d.codes) || d.codes.some(c => !String(c).trim())) bad.push(d.name + ": codes");
      if (!Array.isArray(d.actions) || !d.actions.length || d.actions.some(a => !String(a).trim())) bad.push(d.name + ": actions");
      if (!Array.isArray(d.questions) || !d.questions.length) bad.push(d.name + ": questions");
      if (!fams.includes(d.family)) bad.push(d.name + ": family " + d.family + " not in the family list");
      if (d.url && !/^https:\/\//.test(d.url)) bad.push(d.name + ": url not https " + d.url);
    });
    return bad;
  });
  t.check(!den.length, "every denial has a name, summary, actions and a known family, with unique names", den.slice(0, 6));

  /* ---------- sources ---------- */
  const src = await ev(() => {
    const bad = [], urls = {};
    Object.entries(BASICS_SOURCES).forEach(([id, list]) => {
      if (!B_BY_ID[id] && !S_BY_ID[id] && !X_BY_ID[id]) bad.push("sources for unknown topic " + id);
      if (!Array.isArray(list) || (!list.length && id !== "us-fun-facts")) bad.push(id + ": empty list");
      (list || []).forEach(s => {
        const title = Array.isArray(s) ? s[0] : s && s.title, url = Array.isArray(s) ? s[1] : s && s.url;
        if (!title || !String(title).trim()) bad.push(id + ": source without a title");
        if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(String(url))) bad.push(id + ": bad link " + url);
        if (/\s/.test(String(url))) bad.push(id + ": space in link " + url);
        if (!/^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(SOURCES_REVIEWED)) bad.push("SOURCES_REVIEWED format " + SOURCES_REVIEWED);
      });
      const ts = (list || []).map(s => Array.isArray(s) ? s[1] : s.url); if (new Set(ts).size !== ts.length) bad.push(id + ": same link listed twice");
    });
    return Array.from(new Set(bad));
  });
  t.check(!src.length, "every source entry has a title and a clean https link, belongs to a real topic and is not repeated", src.slice(0, 6));

  const noSrc = await ev(() => B_LESSONS.filter(l => !BASICS_SOURCES[l.id]).map(l => l.id));
  t.check(noSrc.length === 0, "every RCM Basics topic lists at least one official source", noSrc.slice(0, 10).concat("missing=" + noSrc.length));

  /* ---------- client updates ---------- */
  const upd = await ev(() => {
    const bad = [];
    SOP_CLIENTS.forEach(c => {
      (c.updates || []).forEach(u => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(u.date) || isNaN(Date.parse(u.date))) bad.push(c.id + ": bad date " + u.date);
        if (!u.title || !u.summary) bad.push(c.id + " " + u.date + ": missing title/summary");
        (u.lessons || []).forEach(id => { const l = S_BY_ID[id]; if (!l) bad.push(c.id + " " + u.date + ": lesson " + id + " unknown"); else if (l.mod.client !== c) bad.push(c.id + " " + u.date + ": lesson " + id + " is in another client"); });
        if (Date.parse(u.date + "T12:00:00") > Date.now() + 86400000) bad.push(c.id + ": update dated in the future " + u.date);
      });
      c.modules.forEach(m => m.lessons.forEach(l => {
        if (l.upd) { const u = (c.updates || []).find(u => u.date === l.upd); if (!u) bad.push(l.id + ": upd " + l.upd + " has no matching update"); else if (!(u.lessons || []).includes(l.id)) bad.push(l.id + ": upd " + l.upd + " but not listed in that update"); }
      }));
      (c.updates || []).forEach(u => (u.lessons || []).forEach(id => { const l = S_BY_ID[id]; if (l && l.upd !== u.date && !(c.updates || []).some(o => o.date === l.upd && (o.lessons || []).includes(id))) bad.push(id + ": listed in update " + u.date + " but its own upd is " + l.upd); }));
    });
    return bad;
  });
  t.check(!upd.length, "client updates have valid dates, and the topics they list carry matching Updated dates", upd.slice(0, 6));

  const clients = await ev(() => {
    const bad = [];
    SOP_CLIENTS.concat(SPEC_TRACKS).forEach(c => {
      ["id", "name", "short", "blurb", "updated", "truth"].forEach(k => { if (!c[k] || !String(c[k]).trim()) bad.push(c.id + ": " + k + " empty"); });
    });
    const ids = SOP_CLIENTS.concat(SPEC_TRACKS).map(c => c.id); if (new Set(ids).size !== ids.length) bad.push("duplicate client/track ids");
    return bad;
  });
  t.check(!clients.length, "every client playbook and specialty track has a name, blurb, last-updated line and source-of-truth note", clients);

  /* ---------- rendered text ---------- */
  await ev(() => { document.querySelectorAll("#basicsTree details, #sopTree details, #specTree details").forEach(d => { d.open = true; }); });
  await page.waitForTimeout(1500);
  const rend = await ev(() => {
    const bad = [];
    document.querySelectorAll("#basicsTree details.les, #sopTree details.les, #specTree details.les").forEach(d => {
      const txt = d.textContent;
      const m = txt.match(/undefined|NaN|\[object Object\]|\bnull\b/);
      if (m) bad.push(d.dataset.id + ": " + m[0] + " near " + txt.slice(Math.max(0, txt.indexOf(m[0]) - 30), txt.indexOf(m[0]) + 30));
      if (!d.querySelector(".lesbody")) bad.push(d.dataset.id + ": no body");
    });
    return { n: document.querySelectorAll("details.les").length, bad };
  });
  t.check(rend.n >= 190 && !rend.bad.length, "all topics render with no 'undefined', 'NaN', 'null' or '[object Object]' in the text", rend.bad.slice(0, 5));

  const rendOther = await ev(() => {
    const bad = [];
    const txt = document.body.innerText;
    const m = txt.match(/undefined|NaN|\[object Object\]/); if (m) bad.push("page: " + m[0]);
    document.querySelectorAll("img").forEach(i => { if (!i.alt && !i.hidden) bad.push("image with no alt text: " + (i.src || "").slice(-30)); });
    return bad;
  });
  t.check(!rendOther.length, "the visible page has no broken text and every image has alt text", rendOther);

  const brokenLinks = await ev(() => {
    const bad = [];
    document.querySelectorAll(".srcs a").forEach(a => { if (!/^https:\/\//.test(a.getAttribute("href")) || a.target !== "_blank" || !/noopener/.test(a.rel)) bad.push(a.getAttribute("href")); });
    return { n: document.querySelectorAll(".srcs a").length, bad };
  });
  t.check(brokenLinks.n > 100 && !brokenLinks.bad.length, "every rendered source link is https and opens in a new tab safely", brokenLinks.bad.slice(0, 4));

  const dashes = await ev(() => {
    const all = B_LESSONS.concat(S_LESSONS, X_LESSONS), hit = [];
    all.forEach(l => { const s = JSON.stringify([l.title, l.line, l.body, l.terms, l.tips, l.remember, l.compare, l.flow]); if (/—/.test(s)) hit.push(l.id); });
    const qh = SOP_QUIZ.concat(SPEC_QUIZ, RCM_BANK).filter(q => /—/.test(JSON.stringify(q))).length;
    return { lessons: hit, questions: qh };
  });
  t.check(!dashes.lessons.length && !dashes.questions, "lessons and questions contain no em dashes (house style in the test plan)", { lessons: dashes.lessons.slice(0, 8), questions: dashes.questions });

  const dblspace = await ev(() => {
    const bad = [];
    SOP_QUIZ.concat(SPEC_QUIZ, RCM_BANK).forEach(q => { [q.q, q.correct].concat(q.wrongs, q.whyNot).forEach(s => { if (/\s{2,}|^\s|\s$/.test(String(s).replace(/<[^>]+>/g, ""))) bad.push(String(s).slice(0, 50)); }); });
    return bad;
  });
  t.check(dblspace.length === 0, "question and answer text has no stray double spaces or edge spaces", dblspace.slice(0, 4).concat("n=" + dblspace.length));

  const html = await ev(() => {
    // question text is inserted as HTML: tags must be balanced and only simple
    const bad = [];
    SOP_QUIZ.concat(SPEC_QUIZ, RCM_BANK).forEach(q => { const o = (q.q.match(/<b>/g) || []).length, c = (q.q.match(/<\/b>/g) || []).length; if (o !== c) bad.push(q.q.slice(0, 60)); if (/<(script|img|iframe|a )/i.test(q.q)) bad.push("risky tag " + q.q.slice(0, 40)); });
    return bad;
  });
  t.check(!html.length, "question text uses only balanced bold tags (it is shown as HTML)", html.slice(0, 4));

  t.check(!errors.length, "no page errors while loading and rendering all content", errors);
  await browser.close();
  t.done();
})().catch(e => { console.log("  FAIL  content test crashed  ->  " + e.message); process.exitCode = 1; });
