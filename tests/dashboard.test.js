/* Dashboard in Chromium, against the real Apps Script code (mocked Google services) seeded with
   made-up counts: locked states, cards and sums agree with the data and with the summary text and the
   print view, editing and saving, script down, and the 30 day review rule. */
"use strict";
const { suite } = require("./helpers");
const C = require("./cert-common");
const t = suite("Dashboard");
const DAY = 86400000;
const iso = ms => new Date(ms).toISOString();
const people = (...ids) => { const o = {}; ids.forEach(i => { o["fp" + String(i).padStart(14, "0")] = "2026-11-01"; }); return o; };

function seed(g) {
  const now = Date.now();
  g.props.set("DASH_PROJECTS", JSON.stringify({
    abw: { status: "yes", reason: "", manager: "Meera Nair", tl: "Karan Das", scope: ["AR follow-up", "EV"], by: "bala@example.com", at: iso(now - 2 * DAY) },
    hagion: { status: "no", reason: "SOP under <b>revision</b>, due 15 December", manager: "Meera Nair", tl: "", scope: [], by: "bala@example.com", at: iso(now - 5 * DAY) },
    titan: { status: "other", reason: "Tracked live on calls", manager: "", tl: "Isha Rao", scope: ["ARR"], by: "asha@example.com", at: iso(now - 29 * DAY) },
    vec: { status: "yes", reason: "", manager: "Meera Nair", tl: "Karan Das", scope: [], by: "asha@example.com", at: iso(now - 40 * DAY) },
    "spec-dental": { status: "yes", reason: "", manager: "", tl: "", scope: [], by: "asha@example.com", at: iso(now - 30 * DAY + 60000) }
  }));
  const set = (k, n, p) => g.props.set("CERTS_" + k, JSON.stringify({ n, people: p }));
  set("rcm", 12, people(1, 2, 3, 4, 5, 6, 7, 8, 9));
  set("denials", 7, people(1, 2, 3, 4, 5, 6));
  set("proc:abw", 5, people(1, 2, 3, 4));
  set("proc:vec", 2, people(1, 2));
  set("qa:abw", 1, people(1));
  set("spec:vision", 3, people(1, 2, 3));
  set("final", 4, people(1, 2, 3, 4));
  const rec = []; for (let i = 0; i < 60; i++) rec.push({ t: iso(now - i * 3600000), k: i % 2 ? "rcm" : "proc:abw", name: i === 0 ? "<img src=x onerror=window.__xss=1>" : "Learner " + i, pct: 80 + (i % 20) });
  g.props.set("CERT_RECENT", JSON.stringify(rec));
}
const TOTAL = 34, HOLDERS = 29;
const open = async o => { const a = await C.openCert(Object.assign({}, o)); if (!o || o.seed !== false) seed(a.g); return a; };
const go = async a => { await a.page.evaluate(() => { DASH.loaded = false; showPanel("dashPanel"); }); await a.page.waitForTimeout(500); };
const nums = (a, sel) => a.page.$$eval(sel, els => els.map(e => e.textContent.trim()));

(async () => {
  /* ── locked ── */
  {
    const a = await C.openCert({ signedIn: false });
    await a.page.evaluate(() => showPanel("dashPanel")); await a.page.waitForTimeout(150);
    t.check(await a.page.isVisible("#dashLock") && /verify your email ID with the OTP/.test(await a.page.textContent("#dashLockMsg")), "locked: without Certification access the Dashboard asks for the OTP");
    t.check(a.calls.length === 0, "locked: no call to the script is made while locked");
    t.check(await a.page.isVisible("#dashGoCert") && !(await a.page.isVisible("#dashRetry")), "locked: the button leads to Certification, not Refresh");
    await a.browser.close();
    const b = await C.openCert({ access: { email: C.EMAIL, until: Date.now() + 3600000, token: "" } });
    await b.page.evaluate(() => showPanel("dashPanel")); await b.page.waitForTimeout(150);
    t.check(/Lock now/.test(await b.page.textContent("#dashLockMsg")) && b.calls.length === 0, "locked: access from before the Dashboard existed (no token) asks to lock and verify again");
    await b.browser.close();
    const c = await C.openCert({ access: { email: C.EMAIL, until: Date.now() + 3600000, token: "forged.token" } });
    await c.page.evaluate(() => showPanel("dashPanel")); await c.page.waitForTimeout(400);
    t.check(await c.page.isVisible("#dashLock") && /Lock now/.test(await c.page.textContent("#dashLockMsg")) && !(await c.page.isVisible("#dashBody")), "locked: a forged token is refused by the script and the page shows the lock");
    await c.browser.close();
    const d = await C.openCert({ access: { email: "mallory@example.com", until: Date.now() + 3600000, token: "forged" } });
    await d.page.evaluate(() => showPanel("dashPanel")); await d.page.waitForTimeout(300);
    t.check(!(await d.page.isVisible("#dashBody")) && d.g.sent.length === 0, "locked: another person's made-up access shows no data and sends no mail");
    await d.browser.close();
  }

  /* ── data agrees everywhere ── */
  {
    const a = await open();
    await go(a);
    const p = a.page;
    t.check(await p.isVisible("#dashBody") && !(await p.isVisible("#dashLock")), "loads: with a good token the Dashboard opens");
    t.check((await p.textContent("#dashWho")) === C.EMAIL, "loads: shows whose access it is");
    const ov = await p.textContent("#dashOverview");
    t.check(/3 of 7 up to date/.test(ov) && /Up to date 3/.test(ov) && /Not updated 1/.test(ov) && /Other 1/.test(ov) && /Not recorded 2/.test(ov), "cards: overview counts 3 up to date, 1 not updated, 1 other, 2 not recorded", ov.slice(0, 200));
    const dov = await nums(a, "#dashOverview .dov-b b");
    t.check(dov[0] === String(TOTAL), "cards: certificates issued equals the sum of the data (34)", dov);
    t.check(dov[2] === "1", "cards: one review is due (VEC at 40 days)", dov);
    const stats = await p.$$eval("#dashStats .dstat", els => els.map(e => [e.querySelector(".dl").textContent, +e.querySelector("b").textContent, e.querySelector("em").textContent]));
    const want = { "RCM Basics": 12, "Denial management": 7, "Process training": 7, "QA certification": 1, "Specialty training": 3, "Final readiness": 4 };
    t.check(stats.every(s => want[s[0]] === s[1]) && stats.length === 6, "cards: each step tile equals the data (process 5+2=7)", stats);
    t.check(stats.reduce((x, s) => x + s[1], 0) === TOTAL, "cards: the six step tiles add up to the overview total");
    const bars = await p.$$eval("#dashCerts .drow", els => els.map(e => +e.querySelector("b").textContent));
    t.check(bars.reduce((x, y) => x + y, 0) === TOTAL, "cards: the 'by step' bars add up to the same total", bars);
    const byproj = await p.$$eval("#dashByProject tbody tr", els => els.map(e => [...e.children].map(c => c.textContent)));
    const abw = byproj.find(r => /ABW/.test(r[0]));
    t.check(abw && abw[1] === "5" && abw[2] === "1" && abw[3] === "–", "cards: ABW row in the project table shows process 5, QA 1, specialty dash", abw);
    const sumTable = byproj.reduce((x, r) => x + [1, 2, 3].reduce((y, i) => y + (/^\d+$/.test(r[i]) ? +r[i] : 0), 0), 0);
    t.check(sumTable === TOTAL - 12 - 7 - 4, "cards: project table (process, QA, specialty) adds up to the total less the three core steps", sumTable);
    const sumTxt = await p.evaluate(() => dashSummaryText());
    t.check(new RegExp("Certificates issued: " + TOTAL + " \\(RCM Basics 12, Denial management 7, Process training 7, QA 1, Specialty 3, Final readiness 4\\)").test(sumTxt), "summary text: the same totals as the cards", sumTxt.split("\n")[1]);
    t.check(/ABW Medical \(Process\)\n  Material: Up to date\n  Manager: Meera Nair \| Team lead: Karan Das\n  Scope: AR follow-up, EV\n  Certificates: Process 5, QA 1/.test(sumTxt), "summary text: ABW block has status, owners, scope and counts", sumTxt.split("\n").slice(3, 9).join(" / "));
    t.check(/VEC .*\n  Material: Up to date \[review due\]/.test(sumTxt) && (sumTxt.match(/\[review due\]/g) || []).length === 1, "summary text: exactly one project is marked review due");
    t.check(/Hagion.*\n  Material: Not updated - SOP under <b>revision<\/b>/.test(sumTxt), "summary text: reason is included (plain text for copying)");
    t.check(/Material: Not recorded/.test(sumTxt) && /Updated: never/.test(sumTxt), "summary text: rows with no record say Not recorded and never");
    await p.click("#dashPrint"); await p.waitForTimeout(200);
    const pt = await C.sheetText(p), ph = await C.sheet(p);
    t.check(await C.printed(p) === 1 && pt.indexOf("Certificates issued: " + TOTAL) >= 0 && /RCM Basics 12 · Denial management 7 · Process training 7 · QA 1 · Specialty 3 · Final readiness 4/.test(pt), "print view: totals match the cards and the summary");
    t.check(/ABW Medical.*Up to date.*Meera Nair.*Karan Das.*AR follow-up, EV.*Process 5, QA 1/.test(pt) && /VEC.*review due/.test(pt), "print view: a project row has status, owners, scope, counts, and the review-due note");
    t.check(ph.indexOf("<b>revision</b>") < 0 && pt.indexOf("<b>revision</b>") > 0, "print view: a reason with HTML in it is printed as text");
    const rcard = await p.textContent('#dashProjects .dcard[data-id="hagion"] .dreason');
    t.check(rcard.indexOf("<b>revision</b>") > 0 && (await p.innerHTML('#dashProjects .dcard[data-id="hagion"] .dreason')).indexOf("<b>revision") < 0, "cards: a reason with HTML in it is shown as text");
    const rec = await p.$$eval("#dashRecent li", els => els.length);
    t.check(rec === 60 && /last 60/.test(await p.textContent("#dashRecentN")), "recent: 60 certificates listed and labelled 'last 60'", rec);
    t.check(!(await p.evaluate(() => window.__xss)) && (await p.innerHTML("#dashRecent")).indexOf("<img src=x") < 0, "recent: HTML in a name is shown as text");
    t.check((await p.textContent("#dashOverview .dov-b div:nth-child(2) b")) === "9", "cards: 'certificate holders' counts each person once, however many certificates they hold", "shows " + (await p.textContent("#dashOverview .dov-b div:nth-child(2) b")) + " (sum of per-step people = 29); distinct people in the data = 9");
    const procTile = stats.find(s => s[0] === "Process training");
    t.check(procTile[2] === "4 people", "cards: the Process training tile counts a person once even when they cleared two processes", procTile[2] + " (4 and 2 people overlap: only 4 distinct)");
    t.check(!a.errors.length, "dashboard: no page errors", a.errors);
    await a.browser.close();
  }

  /* ── due for review: 30 days ── */
  {
    const a = await open();
    await go(a);
    const due = id => a.page.getAttribute('#dashProjects .dcard[data-id="' + id + '"]', "data-due");
    t.check(await due("vec") === "1" && await due("abw") === "0", "review: a status 40 days old is due, 2 days old is not");
    t.check(await due("titan") === "0", "review: 29 days old is not due");
    t.check(await due("spec-dental") === "0", "review: 29 days 23 hours 59 minutes old is not due");
    const g = a.g, pj = JSON.parse(g.props.get("DASH_PROJECTS")); pj.abw.at = iso(Date.now() - 30 * DAY - 60000); g.props.set("DASH_PROJECTS", JSON.stringify(pj));
    await go(a);
    t.check(await due("abw") === "1", "review: 30 days and 1 minute old is due");
    t.check(/Review due/.test(await a.page.textContent('#dashProjects .dcard[data-id="abw"]')), "review: the card carries a Review due badge");
    const chip = n => a.page.textContent('#dashFilters .chip[data-f="' + n + '"]');
    t.check(/2$/.test(await chip("due")) && /Review due2/.test(await chip("due")), "review: the Review due filter counts 2", await chip("due"));
    t.check(/Needs attention5/.test(await chip("attention")), "review: Needs attention = not updated (1) + not recorded (2) + due (2) = 5", await chip("attention"));
    await a.page.click('#dashFilters .chip[data-f="due"]');
    t.check(await a.page.$$eval("#dashProjects .dcard:not(.hide)", e => e.length) === 2, "review: the filter shows only the 2 due cards");
    await a.page.click('#dashFilters .chip[data-f="all"]');
    t.check(await a.page.$$eval("#dashProjects .dcard:not(.hide)", e => e.length) === 7, "review: All shows 7 cards");
    await a.browser.close();
  }

  /* ── edit and save ── */
  {
    const a = await open();
    await go(a);
    const p = a.page, form = "#dashEdit form";
    const saves = () => a.calls.filter(c => c.action === "dash-save");
    await p.click('.dedit-btn[data-id="hagion"]');
    t.check(await p.isVisible(form) && /Hagion/.test(await p.textContent("#dmTitle")) && await p.inputValue("[name=dreason]") !== "", "edit: opens with the saved values");
    await p.click(".dseg label.no"); await p.fill("[name=dreason]", "   "); await p.click(form + " button[type=submit]");
    t.check(/pending and by when/.test(await p.textContent(".derr")) && saves().length === 0, "edit: No with a blank reason is refused on the page, nothing sent");
    await p.click(".dseg label.other"); await p.click(form + " button[type=submit]");
    t.check(/why there is no material/.test(await p.textContent(".derr")) && saves().length === 0, "edit: Other with a blank reason is refused on the page");
    await p.evaluate(() => { document.querySelectorAll("input[name=dstatus]").forEach(r => r.checked = false); }); await p.click(form + " button[type=submit]");
    t.check(/Choose Yes, No or Other/.test(await p.textContent(".derr")), "edit: no status chosen is refused");
    await p.click(".dseg label.yes"); await p.fill("[name=dreason]", "will be dropped"); await p.fill("[name=dmanager]", "Meera Nair"); await p.fill("[name=dtl]", "Isha Rao"); await p.fill("[name=dscope]", "AR follow-up, , EV ,PCC");
    await p.dblclick(form + " button[type=submit]"); await p.waitForTimeout(500);
    t.check(saves().length === 1, "edit: a double click on Save sends one request", saves().length);
    const sv = saves()[0];
    t.check(sv.status === "yes" && sv.reason === "" && JSON.stringify(sv.scope) === JSON.stringify(["AR follow-up", "EV", "PCC"]), "edit: Yes sends no reason and a cleaned scope list", sv);
    t.check(!(await p.isVisible(form)), "edit: the form closes after saving");
    const card = '#dashProjects .dcard[data-id="hagion"]';
    t.check(await p.getAttribute(card, "data-st") === "yes" && /Updated .* by asha@example\.com/.test(await p.textContent(card + " .dmeta")), "edit: the card now shows Up to date, updated now by the signed-in person");
    t.check(JSON.parse(a.g.props.get("DASH_PROJECTS")).hagion.status === "yes", "edit: the script holds the new row");
    t.check(/4 of 7 up to date/.test(await p.textContent("#dashOverview")), "edit: the overview moves to 4 of 7");
    t.check(/Isha Rao/.test(await p.textContent(card)), "edit: team lead shown on the card");
    await p.click('.dedit-btn[data-id="hagion"]'); await p.click(".dseg label.no"); await p.fill("[name=dreason]", "Waiting for client sign-off"); await p.focus("[name=dmanager]"); await p.keyboard.press("Enter"); await p.keyboard.press("Enter"); await p.waitForTimeout(500);
    t.check(saves().length === 2, "edit: pressing Enter twice quickly sends one save", saves().length);
    t.check(/Not updated/.test(await p.textContent(card + " .st")) && /sign-off/.test(await p.textContent(card + " .dreason")), "edit: No with a reason shows on the card");
    await p.click('.dedit-btn[data-id="vec"]'); await p.waitForTimeout(150); await p.keyboard.press("Escape");
    t.check(!(await p.isVisible(form)), "edit: Escape closes the form without saving");
    await p.click('.dedit-btn[data-id="vec"]'); await p.click("#dashEdit .dcancel >> nth=1");
    t.check(!(await p.isVisible(form)) && saves().length === 2, "edit: Cancel closes the form without saving");
    await a.browser.close();
  }
  /* ── script trouble ── */
  {
    let mode = "ok";
    const a = await open({ over: async (b, g) => { if (mode === "down" && b.action === "dash-save") return "abort"; if (mode === "false" && b.action === "dash-save") return { ok: false }; if (mode === "noaccess" && b.action === "dash-save") return { ok: false, error: "no-access" }; if (mode === "bad" && b.action === "dash-save") return { ok: false, error: "bad-id" }; if (mode === "html" && b.action === "dash-save") return "<html>"; return undefined; } });
    await go(a);
    const p = a.page, form = "#dashEdit form", card = '#dashProjects .dcard[data-id="abw"]';
    const trySave = async () => { await p.click('.dedit-btn[data-id="abw"]'); await p.click(".dseg label.no"); await p.fill("[name=dreason]", "pending"); await p.click(form + " button[type=submit]"); await p.waitForTimeout(400); };
    mode = "down"; await trySave();
    t.check(await p.isVisible(form) && /Could not save/.test(await p.textContent(".derr")), "script down: Save shows 'Could not save' and keeps the form open");
    t.check(await p.getAttribute(card, "data-st") === "yes" && !(await p.isDisabled(form + " button[type=submit]")), "script down: the card is not changed and Save can be tried again");
    await p.click("#dashEdit .dcancel >> nth=1");
    mode = "false"; await trySave();
    t.check(/Could not save/.test(await p.textContent(".derr")) && await p.getAttribute(card, "data-st") === "yes", "script returns ok:false: it says could not save and the card is unchanged");
    await p.click("#dashEdit .dcancel >> nth=1");
    mode = "noaccess"; await trySave();
    t.check(/Lock now/.test(await p.textContent(".derr")), "script says no access: the person is told to lock and verify again");
    await p.click("#dashEdit .dcancel >> nth=1");
    mode = "html"; await trySave();
    t.check(/Could not save/.test(await p.textContent(".derr")) && !a.errors.length, "script returns a page that is not JSON: handled, no page error", a.errors);
    await p.click("#dashEdit .dcancel >> nth=1");
    mode = "ok"; await trySave();
    t.check(!(await p.isVisible(form)) && await p.getAttribute(card, "data-st") === "no", "script back: the same save now works");
    await a.browser.close();
  }
  {
    let down = true;
    const a = await open({ over: async b => (down && b.action === "dash-get") ? "abort" : undefined });
    await go(a);
    t.check(/Could not reach/.test(await a.page.textContent("#dashLockMsg")) && await a.page.isVisible("#dashRetry"), "script down on load: says it could not reach the script and offers Refresh");
    down = false; await a.page.click("#dashRetry"); await a.page.waitForTimeout(400);
    t.check(await a.page.isVisible("#dashBody") && /3 of 7/.test(await a.page.textContent("#dashOverview")), "script back: Refresh loads the data");
    await a.browser.close();
    const b = await open({ over: async x => x.action === "dash-get" ? { ok: false, error: "weird" } : undefined });
    await go(b);
    t.check(/needs its new version/.test(await b.page.textContent("#dashLockMsg")), "script answers an unknown error: the page suggests updating the script");
    await b.browser.close();
    const c = await open({ over: async x => x.action === "dash-get" ? { ok: true } : undefined });
    await go(c);
    t.check(await c.page.isVisible("#dashBody") && /0 of 7 up to date/.test(await c.page.textContent("#dashOverview")) && /No certificates have been issued/.test(await c.page.textContent("#dashRecent")), "empty answer from the script: shows 0 of 7 and no recent certificates, no crash", c.errors);
    t.check(!c.errors.length, "empty answer: no page errors", c.errors);
    await c.browser.close();
    const d = await open({ over: async x => x.action === "dash-get" ? { ok: true, projects: { abw: { status: "bogus", scope: "not a list", at: "not a date" } }, counts: { rcm: { n: "x", people: null }, weird: { n: 5, people: 1 } }, recent: [{ name: null, k: "zzz", pct: null, t: "bad" }] } : undefined });
    await go(d);
    t.check(await d.page.isVisible("#dashBody") && !d.errors.length, "odd data from the script (bad status, text counts, unknown key, bad dates) does not crash the page", d.errors);
    t.check(await d.page.$$eval("#dashStats b", e => e.every(x => /^\d+$/.test(x.textContent))), "odd data: the tiles still show numbers, not NaN");
    const totalOdd = await d.page.textContent("#dashOverview .dov-b b");
    t.check(totalOdd === "5", "odd data: an unknown key still counts in the total shown (5), so the total can be larger than the six tiles", totalOdd + " vs tiles " + (await d.page.$$eval("#dashStats b", e => e.reduce((x, y) => x + +y.textContent, 0))));
    await d.browser.close();
  }
  /* ── a certificate taken in the app shows up on the dashboard ── */
  {
    const a = await C.openCert();
    await C.showCert(a.page, "denials");
    await C.takeTest(a.page, "Isha Rao", "all"); await a.page.waitForTimeout(300);
    await go(a);
    const stats = await a.page.$$eval("#dashStats .dstat", els => els.map(e => [e.querySelector(".dl").textContent, +e.querySelector("b").textContent]));
    t.check(stats.find(s => s[0] === "Denial management")[1] === 1 && /Isha Rao/.test(await a.page.textContent("#dashRecent")) && /100%/.test(await a.page.textContent("#dashRecent")), "end to end: a denial certificate cleared in the app is counted and listed on the Dashboard");
    t.check(!JSON.stringify([...a.g.props.entries()]).includes("asha@example.com") || JSON.stringify([...a.g.props.entries()].filter(e => !["CERT_EMAILS"].includes(e[0]))).indexOf("asha@example.com") < 0, "end to end: the script never stored the raw email ID of the person who cleared it");
    await a.browser.close();
  }
  t.done();
})().catch(e => { console.log("  FAIL  dashboard test crashed  ->  " + e.stack); process.exitCode = 1; });
