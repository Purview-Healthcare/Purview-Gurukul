/* Errors and recovery: storage blocked, full or corrupted, and the Apps Script answering with
   500, HTML instead of JSON, nothing at all, or a hang. The app must not crash, must tell the
   person what happened in plain words, and must not lose saved progress. Made-up data only. */
"use strict";
const { suite, PAGE } = require("./helpers");

const ACCESS = { email: "tester@example.com", until: Date.now() + 6 * 3600000, token: "t.1" };
const KEYS = ["gk_basics_read", "gk_sop_read", "gk_spec_read", "gk_cert", "gk_cert_access", "gk_name"];
const GOOD_CERT = { v: 2, name: "Test Person", train: { rcm: { name: "Test Person", date: "1 June 2026", score: 18, n: 20, pct: 90, id: "GK-R-ABC123" } }, last: {}, qa: { abw: { rows: [{ ref: "C1", date: "2026-06-01", score: 98 }] } } };
const seed = (o) => Object.entries(o).map(([k, v]) => "try{localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(typeof v === "string" ? v : JSON.stringify(v)) + ")}catch(e){}").join(";");

/* a fresh page; `mode` is read on every script call so a test can change what the script does */
let SHARED = null;
async function launch(opts) {
  opts = opts || {};
  const { chromium } = require("playwright");
  if (!SHARED) SHARED = await chromium.launch();
  const context = await SHARED.newContext({ viewport: { width: 1280, height: 900 } });
  const st = { mode: opts.mode || "json", json: opts.json || { ok: false, error: "x" }, calls: [] };
  await context.route(/^https:\/\/script\.google(usercontent)?\.com\//, async route => {
    let body = {}; try { body = JSON.parse(route.request().postData() || "{}"); } catch (e) {}
    st.calls.push(body);
    const m = typeof st.mode === "function" ? st.mode(body) : st.mode;
    if (m === "hang") return;
    if (m === "abort") return route.abort("failed");
    if (m === "500") return route.fulfill({ status: 500, contentType: "application/json", body: '{"ok":false,"error":"boom"}' });
    if (m === "500html") return route.fulfill({ status: 500, contentType: "text/html", body: "<html><body>Error 500</body></html>" });
    if (m === "html") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html><body><h1>Sign in to Google</h1></body></html>" });
    if (m === "empty") return route.fulfill({ status: 200, contentType: "application/json", body: "" });
    if (m === "null") return route.fulfill({ status: 200, contentType: "application/json", body: "null" });
    if (m === "array") return route.fulfill({ status: 200, contentType: "application/json", body: "[1,2]" });
    if (m === "truncated") return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":tru' });
    const j = typeof st.json === "function" ? st.json(body) : st.json;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(j) });
  });
  if (opts.clock) await context.clock.install();
  await context.addInitScript(() => { window.print = () => {}; window.addEventListener("unhandledrejection", e => { window.__rej = (window.__rej || []).concat(String(e.reason)); }); });
  if (opts.init) await context.addInitScript(opts.init);
  const page = await context.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/net::ERR|Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(250);
  return { browser: { close: () => context.close().catch(() => {}) }, context, page, errors, st };
}
const tab = async (page, p) => { await page.click('.navtab[data-panel="' + p + '"]'); await page.waitForTimeout(120); };
const toast = page => page.evaluate(() => $("#toast").textContent);
const panelsAll = ["askPanel", "basicsPanel", "browsePanel", "sopPanel", "specPanel", "quizPanel", "certPanel", "dashPanel"];
async function visitAll(page) { for (const p of panelsAll) await tab(page, p); }
const rejections = page => page.evaluate(() => window.__rej || []);

/* answer every question of the open assessment correctly (the paper is captured as it is built) */
async function passRcm(page) {
  await page.evaluate(() => { const d = CERT_BY.rcm, o = d.build; d.build = () => { const q = o(); window.__qs = q; return q; }; });
  await page.click('#certTiles .certtile[data-t="rcm"]');
  await page.fill("#certName", "Test Person"); await page.dispatchEvent("#certName", "change");
  await page.click('.certpane:not([hidden]) .cstart'); await page.waitForTimeout(150);
  const n = await page.evaluate(() => window.__qs.length);
  for (let i = 0; i < n; i++) {
    const k = await page.evaluate(i => window.__qs[i].correct, i);
    await page.click('.certpane:not([hidden]) .opt[data-i="' + k + '"]');
    await page.click('.certpane:not([hidden]) .dqnext');
  }
  await page.waitForTimeout(200);
}

(async () => {
  const t = suite("Errors and recovery");

  /* ---------- 1. storage blocked completely (private mode, blocked cookies) ---------- */
  const blockInit = "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('The operation is insecure.','SecurityError')}});Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('The operation is insecure.','SecurityError')}});";
  let A = await launch({ init: blockInit });
  t.check(A.errors.length === 0, "storage blocked: the page loads with no errors", A.errors);
  await visitAll(A.page);
  t.check(A.errors.length === 0, "storage blocked: every tab opens with no errors", A.errors);
  let ask = await A.page.evaluate(() => { $("#q").value = "what is a copay"; ask(); return !!document.querySelector("#answers .card"); });
  t.check(ask, "storage blocked: Ask still answers");
  await tab(A.page, "basicsPanel");
  const mark = await A.page.evaluate(() => { const d = document.querySelector("#basicsTree details.les"); let p = d.parentElement; while (p && p.id !== "basicsTree") { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; } d.open = true; ensureBody(d); const b = d.querySelector("[data-mark]"); b.click(); return { on: b.classList.contains("on"), txt: b.textContent.trim() }; });
  t.check(A.errors.length === 0 && mark.txt.length > 0, "storage blocked: ticking a topic as read does not crash", { mark, errors: A.errors });
  await A.page.click("#fbOpen"); await A.page.fill("#fbMsg", "hello there"); await A.page.fill("#fbName", "Tester");
  const fbOk = await A.page.evaluate(() => fbReady(false));
  t.check(fbOk !== false && A.errors.length === 0, "storage blocked: the feedback form still works", A.errors);
  await A.page.click("#fbWrap .fbx, #fbClose").catch(() => {});
  /* OTP verified but the sign-in cannot be remembered */
  A.st.json = b => (b.action === "otp-send" ? { ok: true, minutes: 10 } : b.action === "otp-verify" ? { ok: true, email: "tester@example.com", hours: 12, token: "t.1" } : { ok: false });
  await tab(A.page, "certPanel");
  await A.page.fill("#clEmail", "tester@example.com"); await A.page.click("#clSend"); await A.page.waitForTimeout(300);
  await A.page.fill("#clCode", "123456"); await A.page.click("#clVerify"); await A.page.waitForTimeout(400);
  const stillLocked = await A.page.evaluate(() => ({ lockShown: !$("#certLock").hidden, body: !$("#certBody").hidden, toast: $("#toast").textContent, err: $("#clErr").textContent }));
  t.check(!(stillLocked.lockShown && /is open/i.test(stillLocked.toast)), "storage blocked: after a correct OTP the page never says 'Certification is open' while it stays locked", stillLocked);
  t.check(!stillLocked.lockShown || stillLocked.err.length > 0, "storage blocked: if the sign-in cannot be kept, the person is told why (not left at an unchanged lock screen)", stillLocked);
  t.check((await rejections(A.page)).length === 0, "storage blocked: no unhandled promise errors", await rejections(A.page));
  await A.browser.close();

  /* ---------- 2. every storage method throws; and quota exceeded on writes ---------- */
  const methodsInit = "const f=()=>{throw new DOMException('denied','SecurityError')};Storage.prototype.getItem=f;Storage.prototype.setItem=f;Storage.prototype.removeItem=f;Storage.prototype.clear=f;";
  A = await launch({ init: methodsInit });
  await visitAll(A.page);
  t.check(A.errors.length === 0, "every storage call throwing: the page and all tabs run with no errors", A.errors);
  await A.browser.close();

  const quotaInit = "Storage.prototype.setItem=function(){throw new DOMException('The quota has been exceeded.','QuotaExceededError')};";
  A = await launch({ init: seed({ gk_cert_access: ACCESS, gk_cert: GOOD_CERT }) + ";" + quotaInit });
  await visitAll(A.page);
  t.check(A.errors.length === 0, "storage full: every tab opens with no errors", A.errors);
  await tab(A.page, "basicsPanel");
  const full = await A.page.evaluate(() => { const d = document.querySelector("#basicsTree details.les"); let p = d.parentElement; while (p && p.id !== "basicsTree") { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; } d.open = true; ensureBody(d); d.querySelector("[data-mark]").click(); return $("#toast").textContent + "|" + $("#toast").className; });
  t.check(A.errors.length === 0, "storage full: ticking a topic does not crash", A.errors);
  t.check(/full|space|could not save|not saved|private|storage/i.test(full), "storage full: the person is told that progress could not be saved", full);
  await tab(A.page, "certPanel");
  const before = await A.page.evaluate(() => $('.certtile[data-t="rcm"] .cts').textContent.trim());
  t.check(/Cleared 90%/.test(before), "storage full: certificates saved earlier still show", before);
  await A.browser.close();

  A = await launch({ init: seed({ gk_cert_access: ACCESS }) + ";" + quotaInit });
  await tab(A.page, "certPanel");
  await passRcm(A.page);
  const tst = await A.page.evaluate(() => ({ toast: $("#toast").textContent, status: $('.certtile[data-t="rcm"] .cts').textContent.trim(), print: !document.querySelector('.certpane[data-k="rcm"] .cprint').hidden }));
  t.check(A.errors.length === 0, "storage full: finishing an assessment does not crash", A.errors);
  t.check(!(/certificate issued/i.test(tst.toast) && !tst.print), "storage full: the app does not announce 'certificate issued' when the certificate was not saved and cannot be printed", tst);
  await A.browser.close();

  /* ---------- 3. corrupted JSON in every gk_* key ---------- */
  const variants = ["{not json", "null", '{"a":1}', "12345", "[null]", '{"v":2,"train":null,"last":null,"qa":5}', '{"v":2,"train":{"rcm":null},"last":{"rcm":5},"qa":{"abw":null}}', '{"v":2,"train":{"rcm":{"pct":"x"}},"qa":{"abw":{"rows":"abc"}}}', '{"v":2,"qa":{"abw":{"rows":[null,5,{"score":"zz"}]}}}', '{"email":5,"until":"x"}', "x".repeat(5000)];
  const { chromium } = require("playwright");
  for (const key of KEYS) {
    const fails = [];
    const ctx = await SHARED.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/^https:\/\/script\.google/, r => r.abort("failed"));
    for (const v of variants) {
      const pg = await ctx.newPage(); const errs = [];
      await pg.addInitScript(seed({ [key]: v }) + ";window.print=()=>{};");
      pg.on("pageerror", e => errs.push(e.message));
      try {
        await pg.goto(PAGE, { waitUntil: "load" });
        await pg.evaluate(() => { document.querySelectorAll(".navtab").forEach(b => b.click()); document.querySelectorAll("#certTiles .certtile").forEach(b => b.click()); });
        await pg.waitForTimeout(60);
      } catch (e) { errs.push("driver: " + e.message.slice(0, 80)); }
      const alive = await pg.evaluate(() => document.querySelectorAll(".navtab").length === 8).catch(() => false);
      if (errs.length || !alive) fails.push({ v: v.slice(0, 40), errors: errs.slice(0, 2), alive });
      await pg.close();
    }
    await ctx.close();
    t.check(!fails.length, "corrupted " + key + ": " + variants.length + " different broken values all load, with every tab and certificate tile opening cleanly", fails.slice(0, 3));
  }

  /* a corrupted key must not wipe a different key */
  A = await launch({ init: seed({ gk_cert_access: ACCESS, gk_cert: GOOD_CERT, gk_basics_read: "{broken" }) });
  await tab(A.page, "basicsPanel");
  await A.page.evaluate(() => { const d = document.querySelector("#basicsTree details.les"); let p = d.parentElement; while (p && p.id !== "basicsTree") { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; } d.open = true; ensureBody(d); d.querySelector("[data-mark]").click(); });
  const keep = await A.page.evaluate(() => ({ cert: JSON.parse(localStorage.getItem("gk_cert")).train.rcm.pct, read: JSON.parse(localStorage.getItem("gk_basics_read")).length, acc: !!localStorage.getItem("gk_cert_access") }));
  t.check(keep.cert === 90 && keep.acc, "a corrupted course-progress key leaves the saved certificate and sign-in untouched", keep);
  t.check(keep.read === 1, "after a corrupted progress key, the next tick starts a clean list and saves", keep);
  await A.browser.close();

  /* a certificate record must survive a reload and a failing script */
  A = await launch({ init: "if(!sessionStorage.__s){sessionStorage.__s=1;" + seed({ gk_cert_access: ACCESS, gk_cert: GOOD_CERT, gk_basics_read: ["a", "b"], gk_name: "Saved Name" }) + "}", mode: "500" });
  await visitAll(A.page); await A.page.reload({ waitUntil: "load" }); await A.page.waitForTimeout(200);
  const kept = await A.page.evaluate(() => ({ cert: JSON.parse(localStorage.getItem("gk_cert")).train.rcm.pct, rows: JSON.parse(localStorage.getItem("gk_cert")).qa.abw.rows.length, read: JSON.parse(localStorage.getItem("gk_basics_read")).length, nm: localStorage.getItem("gk_name") }));
  t.check(kept.cert === 90 && kept.rows === 1 && kept.read === 2 && kept.nm === "Saved Name", "saved certificates, QA rows, progress and name are unchanged after visiting every tab with the script failing and reloading", kept);
  await A.browser.close();

  /* ---------- 4. the script: every kind of bad answer, on every call ---------- */
  const BAD = [["500", "a 500 answer with JSON"], ["500html", "a 500 answer with an error page"], ["html", "a Google sign-in HTML page instead of JSON"], ["empty", "an empty answer"], ["null", "the JSON word null"], ["array", "a JSON list instead of an object"], ["truncated", "a cut-off JSON answer"], ["abort", "no network"]];
  const seedAll = seed({ gk_cert_access: ACCESS, gk_cert: GOOD_CERT, gk_basics_read: ["x"], gk_name: "Kept Name" });
  for (const [mode, label] of BAD) {
    const B = await launch({ init: "if(!sessionStorage.__s){sessionStorage.__s=1;" + seedAll + "}", mode });
    const r = {};
    /* dashboard */
    await tab(B.page, "dashPanel"); await B.page.waitForTimeout(400);
    r.dash = await B.page.evaluate(() => ({ lock: !$("#dashLock").hidden, msg: $("#dashLockMsg").textContent, retry: !$("#dashRetry").hidden }));
    /* feedback */
    await B.page.click("#fbOpen"); await B.page.fill("#fbMsg", "Please fix the typo in topic three."); await B.page.click("#fbSend"); await B.page.waitForTimeout(500);
    r.fb = await B.page.evaluate(() => ({ err: !$("#fbErr").hidden && $("#fbErr").textContent, kept: $("#fbMsg").value, btn: $("#fbSend").disabled, mail: !$("#fbMail").hidden }));
    await B.page.evaluate(() => fbClose());
    /* otp send: sign out first */
    await B.page.evaluate(() => { localStorage.removeItem("gk_cert_access"); });
    await tab(B.page, "certPanel");
    await B.page.fill("#clEmail", "tester@example.com"); await B.page.click("#clSend"); await B.page.waitForTimeout(500);
    r.otp = await B.page.evaluate(() => ({ err: $("#clErr").hidden ? "" : $("#clErr").textContent, btnOff: $("#clSend").disabled, label: $("#clSend").textContent }));
    const ok = r.dash.lock && r.dash.msg.length > 20 && r.dash.retry === false || r.dash.lock;
    t.check(r.dash.lock && r.dash.msg.length > 20, "script answers " + label + ": the Dashboard shows a plain message instead of data", r.dash);
    t.check(r.fb.err && /Not sent/.test(r.fb.err) && r.fb.kept.includes("typo") && !r.fb.btn && r.fb.mail, "script answers " + label + ": feedback says 'Not sent', keeps the typed message, re-enables the button and offers the mail app", r.fb);
    t.check(r.otp.err.length > 10 && !r.otp.btnOff && r.otp.label.indexOf("Sending") < 0, "script answers " + label + ": asking for an OTP shows a message and the button works again", r.otp);
    const left = await B.page.evaluate(() => ({ cert: JSON.parse(localStorage.getItem("gk_cert")).train.rcm.pct, read: JSON.parse(localStorage.getItem("gk_basics_read")).length }));
    t.check(!B.errors.length && (await rejections(B.page)).length === 0 && left.cert === 90 && left.read === 1, "script answers " + label + ": no page errors or unhandled errors, and saved progress and certificates are intact", { errors: B.errors.slice(0, 2), left, rej: await rejections(B.page) });
    await B.browser.close();
  }

  /* ---------- 5. a script that never answers ---------- */
  const H = await launch({ mode: "hang", clock: true, init: seed({ gk_cert_access: ACCESS, gk_cert: GOOD_CERT }) });
  await tab(H.page, "dashPanel"); await H.page.waitForTimeout(150);
  const loadingFirst = await H.page.evaluate(() => $("#dashBody").classList.contains("loading") || !$("#dashLock").hidden);
  t.check(loadingFirst, "script hangs: the Dashboard shows a loading state while it waits");
  await H.page.clock.runFor(21000); await H.page.waitForTimeout(300);
  const hd = await H.page.evaluate(() => ({ lock: !$("#dashLock").hidden, msg: $("#dashLockMsg").textContent, loading: $("#dashBody").classList.contains("loading") }));
  t.check(hd.lock && /could not reach|connection/i.test(hd.msg) && !hd.loading, "script hangs: after 20 seconds the Dashboard gives up with a connection message and stops loading", hd);
  await H.page.click("#fbOpen"); await H.page.fill("#fbMsg", "Waiting forever test"); await H.page.click("#fbSend"); await H.page.waitForTimeout(100);
  const sending = await H.page.evaluate(() => ({ off: $("#fbSend").disabled, txt: $("#fbSend").textContent }));
  t.check(sending.off && /Sending/.test(sending.txt), "script hangs: feedback shows 'Sending' and blocks a second click while it waits", sending);
  await H.page.clock.runFor(21000); await H.page.waitForTimeout(300);
  const fb2 = await H.page.evaluate(() => ({ off: $("#fbSend").disabled, err: !$("#fbErr").hidden && $("#fbErr").textContent, kept: $("#fbMsg").value }));
  t.check(!fb2.off && /Not sent/.test(fb2.err) && fb2.kept.includes("Waiting"), "script hangs: after 20 seconds feedback reports 'Not sent', keeps the message and lets the person retry or use email", fb2);
  await H.page.evaluate(() => { fbClose(); localStorage.removeItem("gk_cert_access"); }); await tab(H.page, "certPanel");
  await H.page.fill("#clEmail", "tester@example.com"); await H.page.click("#clSend"); await H.page.waitForTimeout(100);
  const sOff = await H.page.evaluate(() => $("#clSend").disabled);
  await H.page.clock.runFor(21000); await H.page.waitForTimeout(300);
  const otpH = await H.page.evaluate(() => ({ off: $("#clSend").disabled, err: $("#clErr").textContent }));
  t.check(sOff && !otpH.off && otpH.err.length > 10, "script hangs: the OTP button waits, then recovers with a message after 20 seconds", { sOff, otpH });
  t.check(H.errors.length === 0, "script hangs: no page errors", H.errors);
  await H.browser.close();

  /* ---------- 6. odd but 'ok' Dashboard replies ---------- */
  const shapes = [
    ["no projects, counts or recent at all", { ok: true }],
    ["null fields", { ok: true, projects: null, counts: null, recent: null }],
    ["projects as a list", { ok: true, projects: [], counts: [], recent: [] }],
    ["recent as an object", { ok: true, projects: {}, counts: {}, recent: { a: 1 } }],
    ["recent rows that are not objects", { ok: true, projects: {}, counts: {}, recent: [null, 5, "x", { name: null, k: 5, t: "bad date" }] }],
    ["counts with text, negative and huge numbers", { ok: true, projects: {}, counts: { rcm: { n: "many", people: -4 }, final: { n: 1e21, people: null }, "proc:abw": 7 }, recent: [] }],
    ["project rows that are not objects", { ok: true, projects: { abw: "text", hagion: null, titan: 5 }, counts: {}, recent: [] }],
    ["a project with an unknown status and no date", { ok: true, projects: { abw: { status: "maybe", reason: "r" } }, counts: {}, recent: [] }],
    ["a project with a very old and a future date", { ok: true, projects: { abw: { status: "yes", at: "1970-01-01" }, hagion: { status: "yes", at: "2999-12-31T00:00:00Z" }, titan: { status: "yes", at: "not a date" } }, counts: {}, recent: [] }],
    ["a 10,000 character reason", { ok: true, projects: { abw: { status: "no", reason: "r".repeat(10000), manager: "m".repeat(3000) } }, counts: {}, recent: [] }],
    ["scope sent as text instead of a list", { ok: true, projects: { abw: { status: "yes", scope: "AR follow-up, Eligibility" } }, counts: {}, recent: [] }],
    ["a recent row whose key is not text", { ok: true, projects: {}, counts: {}, recent: [{ name: "A B", k: 5, pct: 90, t: "2026-01-01" }] }]
  ];
  for (const [label, reply] of shapes) {
    const B = await launch({ json: reply, init: seed({ gk_cert_access: ACCESS }) });
    await tab(B.page, "dashPanel"); await B.page.waitForTimeout(350);
    const st = await B.page.evaluate(() => ({ cards: document.querySelectorAll("#dashProjects .dcard").length, lock: !$("#dashLock").hidden }));
    t.check(!B.errors.length && (st.cards > 0 || st.lock), "Dashboard reply with " + label + ": renders or shows a message, no page errors", { errors: B.errors.slice(0, 2), st });
    await B.browser.close();
  }

  /* ---------- 7. saving a Dashboard row when the script fails ---------- */
  const E = await launch({ mode: b => (b.action === "dash-get" ? "json" : "500"), json: { ok: true, projects: {}, counts: {}, recent: [] }, init: seed({ gk_cert_access: ACCESS }) });
  await tab(E.page, "dashPanel"); await E.page.waitForTimeout(300);
  await E.page.click(".dedit-btn >> nth=0"); await E.page.click('#dashEdit .dseg label.no');
  await E.page.fill('textarea[name="dreason"]', "Pending the March update"); await E.page.fill('input[name="dmanager"]', "Made Up Manager");
  await E.page.click('#dashEdit button[type="submit"]'); await E.page.waitForTimeout(400);
  const sv = await E.page.evaluate(() => ({ open: !!document.querySelector("#dashEdit form"), err: (document.querySelector("#dashEdit .derr") || {}).textContent, reason: (document.querySelector('#dashEdit [name="dreason"]') || {}).value, mgr: (document.querySelector('#dashEdit [name="dmanager"]') || {}).value, btn: (document.querySelector('#dashEdit button[type="submit"]') || {}).disabled }));
  t.check(sv.open && /could not save/i.test(sv.err) && sv.reason.includes("March") && sv.mgr === "Made Up Manager" && !sv.btn, "Dashboard save fails: the form stays open with what was typed and a 'Could not save' message", sv);
  t.check(!E.errors.length, "Dashboard save fails: no page errors", E.errors);
  await E.browser.close();

  /* ---------- 8. other recovery paths ---------- */
  const T = await launch({ json: { ok: false, error: "no-access" }, init: seed({ gk_cert_access: ACCESS }) });
  await tab(T.page, "dashPanel"); await T.page.waitForTimeout(300);
  const tk = await T.page.evaluate(() => $("#dashLockMsg").textContent);
  t.check(/expired|Lock now/.test(tk), "a rejected or expired access token tells the person to lock and verify again", tk);
  await T.browser.close();

  const X = await launch({ init: seed({ gk_cert_access: { email: "tester@example.com", until: Date.now() - 1000, token: "t" } }) });
  await tab(X.page, "certPanel");
  const exp = await X.page.evaluate(() => ({ lock: !$("#certLock").hidden, body: !$("#certBody").hidden }));
  t.check(exp.lock && !exp.body, "an expired sign-in puts the lock screen back", exp);
  await X.browser.close();

  await SHARED.close();
  t.done();
})().catch(e => { console.log("  FAIL  recovery test crashed  ->  " + e.stack); process.exitCode = 1; });
