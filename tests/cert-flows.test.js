/* Certification flows in Chromium: the OTP lock, the 12 hour access, the name rule, every kind of
   assessment (all right, all wrong, the 80% line), the certificate printout, the final test by area,
   and the Quality (QA claims) certificate. The Apps Script is the real script code behind a mock. */
"use strict";
const { suite, openApp } = require("./helpers");
const C = require("./cert-common");
const t = suite("Certification flows");
const dayMonthYear = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

(async () => {
  /* ── the lock ── */
  {
    const a = await C.openCert({ signedIn: false });
    const p = a.page;
    await p.evaluate(() => showPanel("certPanel"));
    t.check(await p.isVisible("#certLock") && !(await p.isVisible("#certBody")), "locked: without access Certification shows the email box and hides the assessments");
    await p.evaluate(() => showPanel("dashPanel")); await p.waitForTimeout(100);
    t.check(await p.isVisible("#dashLock") && !(await p.isVisible("#dashBody")), "locked: the Dashboard is locked too without access");
    await p.evaluate(() => showPanel("certPanel"));
    await C.sendOtp(p, "not-an-email");
    t.check(/full email ID/.test(await p.textContent("#clErr")) && a.calls.length === 0, "lock: a bad email ID is refused on the page, no call is made");
    await C.sendOtp(p, "mallory@example.com");
    t.check(/not approved/.test(await p.textContent("#clErr")) && a.g.sent.length === 0, "lock: an email ID not on the list gets the not-approved message and no mail");
    await C.sendOtp(p, "  ASHA@Example.com ");
    t.check(await p.isVisible("#clStep2") && a.g.sent.length === 1 && a.g.sent[0].to === C.EMAIL, "lock: a good email ID gets one OTP mail to that address and moves to the code step");
    t.check(/asha@example\.com/.test(await p.textContent("#clSent")), "lock: the page says which email ID the OTP went to");
    t.check(await p.isDisabled("#clResend") && /in \d+ s/.test(await p.textContent("#clResend")), "lock: Send OTP again counts down before it can be used");
    const code = a.g.codeOf(), bad = code === "111111" ? "222222" : "111111";
    await p.fill("#clCode", "12ab"); await p.click("#clVerify");
    t.check(/6-digit/.test(await p.textContent("#clErr")), "lock: a short code is refused on the page");
    await p.fill("#clCode", "ab12cd34ef56");
    t.check(await p.inputValue("#clCode") === "123456", "lock: letters typed in the code box are dropped");
    await p.fill("#clCode", bad); await p.click("#clVerify"); await p.waitForTimeout(250);
    t.check(/not right\. 4 tries left/.test(await p.textContent("#clErr")), "lock: a wrong OTP says 4 tries left", await p.textContent("#clErr"));
    for (let i = 0; i < 3; i++) { await p.fill("#clCode", bad); await p.click("#clVerify"); await p.waitForTimeout(150); }
    t.check(/1 try left/.test(await p.textContent("#clErr")), "lock: it counts down to 1 try left (singular)", await p.textContent("#clErr"));
    await p.fill("#clCode", code); await p.click("#clVerify"); await p.waitForTimeout(300);
    t.check(await p.isVisible("#certBody") && !(await p.isVisible("#certLock")), "lock: the right OTP opens Certification");
    const rec = await p.evaluate(() => JSON.parse(localStorage.getItem("gk_cert_access")));
    const hrs = (rec.until - Date.now()) / 3600000;
    t.check(rec.email === C.EMAIL && hrs > 11.9 && hrs <= 12.01 && rec.token.indexOf(".") > 0, "access: saved on this device for 12 hours with the token", { email: rec.email, hrs });
    t.check(!(await p.evaluate(() => JSON.stringify(localStorage)).then(s => /\b\d{6}\b/.test(s.replace(/\d{13}/g, "")))) , "access: the OTP itself is not kept in the browser");
    await p.reload(); await p.waitForTimeout(300); await p.evaluate(() => showPanel("certPanel"));
    t.check(await p.isVisible("#certBody"), "access: still open after the page is reloaded");
    await p.fill("#certName", "Someone"); await p.click("#certLockNow");
    t.check(await p.isVisible("#certLock") && !(await p.evaluate(() => localStorage.getItem("gk_cert_access"))) && await p.inputValue("#certName") === "", "lock now: closes Certification, removes the access record and clears the name box");
    await p.evaluate(() => showPanel("dashPanel")); await p.waitForTimeout(100);
    t.check(await p.isVisible("#dashLock"), "lock now: the Dashboard is locked as well");
    t.check(!a.errors.length, "lock: no page errors", a.errors);
    await a.browser.close();
  }
  /* ── expiry ── */
  {
    const a = await C.openCert({ access: { email: C.EMAIL, until: Date.now() - 1000, token: "x.y" } });
    await a.page.evaluate(() => showPanel("certPanel"));
    t.check(await a.page.isVisible("#certLock"), "expiry: an access record that ran out 1 second ago keeps Certification locked");
    await a.browser.close();
    const b = await C.openCert({ access: { email: C.EMAIL, until: Date.now() + 11.9 * 3600000, token: "x.y" } });
    await b.page.evaluate(() => showPanel("certPanel"));
    t.check(await b.page.isVisible("#certBody"), "expiry: access with 11.9 hours left is still open");
    await b.page.evaluate(() => { const r = JSON.parse(localStorage.getItem("gk_cert_access")); r.until = Date.now() + 700; localStorage.setItem("gk_cert_access", JSON.stringify(r)); });
    await b.page.waitForTimeout(1000);
    t.check(await b.page.isVisible("#certBody"), "expiry: while the page stays open Certification is not re-locked at the 12 hour mark (only when a tab is opened)");
    await b.page.evaluate(() => { showPanel("askPanel"); showPanel("certPanel"); });
    t.check(await b.page.isVisible("#certLock"), "expiry: opening the tab again after the time has passed locks it");
    await b.browser.close();
    const c = await C.openCert({ access: { email: "mallory@example.com", until: Date.now() + 3600000, token: "" } });
    await c.page.evaluate(() => showPanel("certPanel"));
    t.check(!(await c.page.isVisible("#certBody")), "lock: a hand-written access record opens Certification without any OTP (the lock is only on the page; questions are public in the code)");
    await c.page.evaluate(() => showPanel("dashPanel")); await c.page.waitForTimeout(150);
    t.check(await c.page.isVisible("#dashLock") && /Lock now/.test(await c.page.textContent("#dashLockMsg")), "lock: the same fake record cannot open the Dashboard (the server checks the token)");
    await c.browser.close();
  }

  /* ── name rule ── */
  {
    const a = await C.openCert();
    const p = a.page;
    await C.showCert(p, "rcm");
    await p.click(".certpane:not([hidden]) .cstart");
    t.check(await p.evaluate(() => !document.querySelector(".certpane:not([hidden]) .carea").innerHTML), "name: Start does nothing while the name box is empty");
    t.check(/Enter your name/.test(await p.textContent("#toast")), "name: it tells the person to enter a name");
    await p.fill("#certName", "     "); await p.click(".certpane:not([hidden]) .cstart");
    t.check(await p.evaluate(() => !document.querySelector(".certpane:not([hidden]) .carea").innerHTML), "name: spaces only count as empty");
    t.check(!a.errors.length, "name: no page errors", a.errors);
    await a.browser.close();
  }

  /* ── every kind: all wrong, boundary, all right, best score kept, certificate ── */
  const kinds = [["rcm", "RCM Basics", "", ""], ["denials", "Denial management", "", ""], ["proc", "ABW Medical process", "abw", ""], ["spec", "Vision specialty", "", "vision"], ["final", "final readiness test", "", ""]];
  for (const [tile, label, proc, spec] of kinds) {
    const a = await C.openCert();
    const p = a.page, key = await p.evaluate(([tl, pr, sp]) => { CERT_PROC = pr || CERT_PROC; CERT_SPEC = sp || CERT_SPEC; return certKey(tl); }, [tile, proc, spec]);
    await C.showCert(p, tile, proc, spec);
    const r0 = await C.takeTest(p, "Asha Rao", 0);
    const n = r0.n;
    t.check(n === (tile === "final" ? 40 : 20), label + ": the paper has " + (tile === "final" ? 40 : 20) + " questions", n);
    t.check(r0.big === "0 / " + n && /^0% correct/.test(r0.pct), label + ": all wrong shows 0 and 0%", r0.big + " " + r0.pct);
    let st = await p.evaluate(k => ({ train: certLoad().train[k], last: certLoad().last[k] }), key);
    t.check(!st.train && st.last && st.last.pct === 0, label + ": all wrong clears nothing and records the last try", st);
    t.check(await p.evaluate(() => document.querySelector(".certpane:not([hidden]) .cprint").hidden), label + ": no Print certificate button after failing");
    t.check(a.calls.filter(c => c.action === "cert-log").length === 0, label + ": a fail is not counted on the Dashboard");
    await p.click(".certpane:not([hidden]) .dqclose");
    const need = Math.ceil(n * 0.8);
    const rLow = await C.takeTest(p, "Asha Rao", need - 1);
    t.check(rLow.big === (need - 1) + " / " + n && !(await p.evaluate(k => certLoad().train[k], key)), label + ": " + (need - 1) + " of " + n + " (" + Math.round((need - 1) / n * 100) + "%) is not a pass");
    await p.click(".certpane:not([hidden]) .dqclose");
    const rPass = await C.takeTest(p, "Asha Rao", need);
    const pct = Math.round(need / n * 100);
    t.check(rPass.pct.indexOf(pct + "%") === 0 && pct >= 80, label + ": " + need + " of " + n + " shows " + pct + "% (correct divided by total, rounded)", rPass.pct);
    st = await p.evaluate(k => certLoad().train[k], key);
    t.check(st && st.pct === pct && st.score === need && st.n === n && /^GK-[A-Z0-9-]+-[A-Z0-9]{6}$/.test(st.id), label + ": exactly 80% clears it and a certificate number is made", st);
    await p.waitForTimeout(250);
    t.check(a.calls.filter(c => c.action === "cert-log" && c.k === key && c.pct === pct).length === 1, label + ": the pass is counted once on the Dashboard with the right key and score");
    await p.click(".certpane:not([hidden]) .dqclose");
    const id1 = st.id;
    const rAll = await C.takeTest(p, "Asha Rao", "all");
    st = await p.evaluate(k => certLoad().train[k], key);
    t.check(st.pct === 100 && st.id !== undefined, label + ": a later 100% replaces the 80% result");
    await p.click(".certpane:not([hidden]) .dqclose");
    await C.takeTest(p, "Asha Rao", need - 2);
    st = await p.evaluate(k => ({ t: certLoad().train[k], l: certLoad().last[k] }), key);
    t.check(st.t.pct === 100 && st.l.pct < 80, label + ": a later lower score does not replace the pass (last try is shown separately)", st);
    t.check(/stands|Below/.test(await p.textContent("#toast")), label + ": the page tells the person the earlier certificate stands");
    await p.click(".certpane:not([hidden]) .dqclose");
    await C.takeTest(p, "Asha Rao", need);
    st = await p.evaluate(k => certLoad().train[k], key);
    t.check(st.pct === 100, label + ": a later 80% after a 100% keeps the 100%");
    await p.click(".certpane:not([hidden]) .dqclose");
    const logs = a.calls.filter(c => c.action === "cert-log").length;
    t.check(logs === 2, label + ": Dashboard counted 2 certificates (the 80% and the 100% improvement), not the repeats", logs);
    /* print */
    await p.click(".certpane:not([hidden]) .cprint"); await p.waitForTimeout(200);
    const html = await C.sheet(p), text = await C.sheetText(p);
    t.check(await C.printed(p) === 1 && /Asha Rao/.test(text), label + ": Print opens the print dialog once with the name");
    t.check(/with a score of 100% \((\d+) of \1 questions\)/.test(text) || tile === "final", label + ": printout shows 100% and all questions right");
    const dm = text.match(/Trainer signature(\d+ \w+ \d{4})Date/);
    t.check(dm && dm[1] === dayMonthYear(new Date()), label + ": the Date line is filled with today", dm && dm[1]);
    t.check(/Certificate no\. GK-[A-Z0-9-]+-[A-Z0-9]{6}/.test(text), label + ": printout has a certificate number");
    if (tile === "final") t.check(/Certificate of Readiness/.test(text) && /By area: RCM Basics 20\/20 \(100%\) · AR and denial management 20\/20 \(100%\)/.test(text), "final: printout shows both areas at 20 of 20", text.slice(150, 600));
    t.check(!a.errors.length, label + ": no page errors", a.errors);
    await a.browser.close();
  }

  /* ── final test by area ── */
  {
    const a = await C.openCert();
    const p = a.page;
    await C.showCert(p, "final");
    const r = await C.takeTest(p, "Asha Rao", 32);
    const areas = await p.evaluate(() => [...document.querySelectorAll(".certpane:not([hidden]) .arearow")].map(x => x.textContent));
    const ar = await p.evaluate(() => { const a = {}; window.__qs.forEach(q => { a[q.area] = (a[q.area] || 0) + 1; }); return a; });
    t.check(ar["RCM Basics"] === 20 && ar["AR and denial management"] === 20, "final: 40 questions are 20 from RCM Basics and 20 from AR and denial management", ar);
    t.check(areas.length === 2 && /RCM Basics20 \/ 20 · 100%/.test(areas[0]) && /12 \/ 20 · 60%/.test(areas[1]), "final: 32 right (first 20 RCM, 12 denial) shows each area's own score", areas);
    const txt = await p.textContent(".certpane:not([hidden]) .verdict");
    t.check(/Ready\. Cleared at 80%/.test(txt) && /AR and denial management \(below 70%\)/.test(txt), "final: 80% overall clears it, and names the area below 70% for revision", txt);
    await p.click(".certpane:not([hidden]) .dqclose");
    const b = await C.takeTest(p, "Asha Rao", 20);
    const v = await p.textContent(".certpane:not([hidden]) .verdict");
    t.check(/Not yet\. 50% is below/.test(v) && /Revise AR and denial management/.test(v), "final: 20 of 40 is Not yet and names the area to revise", v);
    t.check(b.big === "20 / 40", "final: score line reads 20 / 40", b.big);
    await a.browser.close();
    const c = await C.openCert(); await C.showCert(c.page, "final");
    await C.takeTest(c.page, "Asha Rao", 0);
    t.check(/RCM Basics and AR and denial management/.test(await c.page.textContent(".certpane:not([hidden]) .verdict")), "final: all wrong names both areas for revision");
    await c.browser.close();
    const d = await C.openCert(); await C.showCert(d.page, "final");
    await C.takeTest(d.page, "Asha Rao", 14 + 0); // 14 of 40 in RCM only
    const dv = await d.page.textContent(".certpane:not([hidden]) .verdict");
    t.check(/Not yet\. 35% is below/.test(dv) && /14 \/ 20/.test(await d.page.textContent(".certpane:not([hidden]) .areas")), "final: 14 of 40 reads 35% and shows 14 / 20 for the first area");
    await d.browser.close();
  }

  /* ── name shown as text; name edited; old name ── */
  {
    const nasty = '<img src=x onerror="window.__xss=1">&amp; "Q" Rao';
    const a = await C.openCert();
    const p = a.page;
    await C.showCert(p, "rcm");
    await C.takeTest(p, nasty, "all");
    await p.click(".certpane:not([hidden]) .cprint"); await p.waitForTimeout(200);
    const html = await C.sheet(p), text = await C.sheetText(p);
    t.check(text.indexOf(nasty) >= 0 && html.indexOf("<img src=x") < 0, "name: HTML typed as a name is printed as plain text on the certificate");
    t.check(!(await p.evaluate(() => window.__xss)), "name: nothing typed in the name runs as code");
    await p.evaluate(() => showPanel("dashPanel")); await p.waitForTimeout(300);
    t.check(!(await p.evaluate(() => window.__xss)), "name: the same name in the Dashboard recent list does not run as code");
    const rec = await p.evaluate(() => document.querySelector("#dashRecent").innerHTML);
    t.check(rec.indexOf("<img src=x") < 0, "name: the Dashboard shows the HTML name as text", rec.slice(0, 200));
    await a.browser.close();
    const b = await C.openCert(); await C.showCert(b.page, "rcm");
    const long = "N".repeat(300);
    await C.takeTest(b.page, long, "all");
    await b.page.click(".certpane:not([hidden]) .cprint"); await b.page.waitForTimeout(200);
    t.check((await C.sheetText(b.page)).indexOf(long) >= 0, "name: a 300 letter name is printed in full (no limit on the page; the Dashboard keeps 80)");
    t.check(b.g.props.get("CERT_RECENT") && JSON.parse(b.g.props.get("CERT_RECENT"))[0].name.length === 80, "name: the Dashboard recent list keeps only the first 80 characters");
    await b.browser.close();
  }

  /* ── Quality (QA) ── */
  {
    const a = await C.openCert();
    const p = a.page;
    await p.evaluate(() => { showPanel("certPanel"); CERT_PROC = "abw"; certShow("qa"); });
    const pane = ".certpane:not([hidden])";
    const stat = () => p.textContent(pane + " .certstat"), sum = () => p.textContent(pane + " .qasum");
    t.check(/Not started/.test(await stat()) && /After process training|Not started/.test(await p.textContent("#certTiles .certtile[data-t=qa] .cts")), "QA: before the process training it shows not started");
    const add = async (ref, score, date) => { await p.fill(pane + " .qaref", ref); await p.evaluate(s => { document.querySelector(".certpane:not([hidden]) .qascore").value = s; }, score); if (date) await p.fill(pane + " .qadate", date); await p.click(pane + " .qaadd"); await p.waitForTimeout(60); };
    const rows = () => p.evaluate(() => (certLoad().qa.abw || { rows: [] }).rows.length);
    await add("", "90"); t.check(await rows() === 0 && /claim reference/.test(await p.textContent("#toast")), "QA: an empty claim reference is refused");
    await add("CLM-1", ""); t.check(await rows() === 0 && /between 0 and 100/.test(await p.textContent("#toast")), "QA: an empty score is refused");
    await add("CLM-1", "-1"); t.check(await rows() === 0, "QA: a negative score is refused");
    await add("CLM-1", "100.5"); t.check(await rows() === 0, "QA: a score over 100 is refused");
    await add("CLM-1", "101"); t.check(await rows() === 0, "QA: 101 is refused");
    await add("CLM-1", "abc"); t.check(await rows() === 0, "QA: text in the score box is refused");
    await add("CLM-1", "0"); t.check(await rows() === 1, "QA: a score of 0 is accepted (a real audit result)");
    await p.click(pane + " .xrow"); t.check(await rows() === 0, "QA: the x button removes a claim row");
    await add("CLM-<b>1</b>", "96.5");
    t.check((await p.innerHTML(pane + " .qatable tbody")).indexOf("<b>1</b>") < 0, "QA: HTML typed in a claim reference is shown as text");
    await add("CLM-2", "96.5"); await add("CLM-2", "96.5");
    t.check(await rows() === 3, "QA: the same claim reference can be recorded twice (duplicates are not stopped)");
    t.check(await rows() !== 3, "QA: a duplicate claim reference is refused or flagged, so one claim cannot be counted twice", "3 rows, two of them CLM-2");
    await p.click(pane + " .xrow"); await p.click(pane + " .xrow");
    await add("CLM-3", "100"); await add("CLM-4", "94"); await add("CLM-5", "95"); await add("CLM-6", "99.5");
    t.check(/5 claims audited · overall 97\.0%/.test(await sum()), "QA: summary shows the claim count and average", await sum());
    const avg = await p.evaluate(() => qaStats(certLoad(), "abw").avg);
    t.check(Math.abs(avg - (96.5 + 100 + 94 + 95 + 99.5) / 5) < 1e-9, "QA: the average is the plain mean of the scores", avg);
    t.check(/Clear the process training first|needs process training/i.test(await stat()), "QA: 5 claims at 97.0% still need the process training first", await stat());
    t.check(await p.evaluate(pn => document.querySelector(pn + " .cprint").hidden, pane), "QA: no certificate button before the training is cleared");
    /* clear the training for ABW */
    await p.evaluate(() => { const c = certLoad(); c.train["proc:abw"] = { name: "Asha Rao", date: certDate(), score: 20, n: 20, pct: 100, id: "GK-P-ABW-TEST01" }; certSave(c); certRefresh(); });
    t.check(/Cleared · 97\.0% over 5 claims/.test(await stat()), "QA: with the training cleared, 5 claims at 97.0% is Cleared", await stat());
    await p.evaluate(() => { const c = certLoad(); c.qa.abw.rows.pop(); certSave(c); certRefresh(); });
    t.check(/more claim.* needed/.test(await stat()), "QA: 4 claims says 1 more claim is needed", await stat());
    await add("CLM-7", "96"); t.check(/Cleared/.test(await stat()), "QA: back to 5 claims clears it again");
    /* the 95 line */
    await p.evaluate(() => { const c = certLoad(); c.qa.abw.rows = [95, 95, 95, 95, 95].map((s, i) => ({ ref: "R" + i, date: "2026-11-01", score: s })); certSave(c); certRefresh(); });
    t.check(/Cleared · 95\.0% over 5 claims/.test(await stat()), "QA: exactly 95.0% average clears it");
    await p.evaluate(() => { const c = certLoad(); c.qa.abw.rows = [95, 95, 95, 95, 94.9].map((s, i) => ({ ref: "R" + i, date: "2026-11-01", score: s })); certSave(c); certRefresh(); });
    t.check(/below 95%/.test(await stat()), "QA: an average of 94.98% does not clear it", await stat());
    t.check(!/Overall 95\.0%, below 95%/.test(await stat()), "QA: the message does not say '95.0%, below 95%' (rounding makes it look wrong)", await stat());
    await p.evaluate(() => { const c = certLoad(); c.qa.abw.rows = [100, 100, 100, 100, 70].map((s, i) => ({ ref: "R" + i, date: "2026-11-01", score: s })); certSave(c); certRefresh(); });
    t.check(/Overall 94\.0%, below 95%/.test(await stat()), "QA: one 70 among four 100s gives 94.0% and is below the line");
    await p.evaluate(() => { const c = certLoad(); c.qa.abw.rows = [96, 97, 98, 99, 100].map((s, i) => ({ ref: "R" + i, date: "2026-11-01", score: s })); certSave(c); certRefresh(); });
    await p.fill(pane + " .qarev", "Ravi <b>QA</b>"); await p.dispatchEvent(pane + " .qarev", "change");
    await p.click(pane + " .qalogprint"); await p.waitForTimeout(200);
    const log = await C.sheetText(p), logHtml = await C.sheet(p);
    t.check(/QA record: Asha Rao/.test(log) && /5 claims audited · overall 98\.0%/.test(log) && /R0.*R4/.test(log), "QA print log: shows the name, 5 claims and the 98.0% average", log.slice(0, 300));
    t.check(logHtml.indexOf("<b>QA</b>") < 0 && /QA reviewer: Ravi <b>QA<\/b>/.test(log), "QA print log: reviewer name is shown as text");
    t.check(await C.printed(p) === 1, "QA print log: the print dialog opened once");
    await p.click(pane + " .cprint"); await p.waitForTimeout(200);
    const cert = await C.sheetText(p);
    t.check(/Certificate of Quality/.test(cert) && /5 audited production claims/.test(cert) && /98\.0%/.test(cert) && /Asha Rao/.test(cert), "QA certificate: shows the name, 5 claims and 98.0%", cert.slice(0, 300));
    const dm = cert.match(/Team lead signature(\d+ \w+ \d{4})Date/);
    t.check(dm && dm[1] === dayMonthYear(new Date()), "QA certificate: the Date line is filled", dm && dm[1]);
    t.check(/Certificate no\. GK-Q-ABW-[A-Z0-9]{6} · issued \d+ \w+ \d{4}/.test(cert), "QA certificate: has a number and an issued date", cert.slice(300, 700));
    await p.waitForTimeout(250);
    t.check(a.calls.filter(c => c.action === "cert-log" && c.k === "qa:abw").length === 1 && a.calls.filter(c => c.k === "qa:abw")[0].pct === 98, "QA certificate: counted once on the Dashboard with the rounded average");
    await p.click(pane + " .cprint"); await p.waitForTimeout(150);
    t.check(a.calls.filter(c => c.k === "qa:abw").length === 1, "QA certificate: printing again does not count it twice");
    t.check(!a.errors.length, "QA: no page errors", a.errors);
    await a.browser.close();
  }
  /* ── QA default audit date vs certificate date: same device, same instant ── */
  {
    const inst = Date.UTC(2026, 10, 30, 20, 0, 0);   // 1 December 01:30 in India
    const a = await C.openCert({ context: { timezoneId: "Asia/Kolkata" }, fixedTime: inst });
    await a.page.evaluate(() => { showPanel("certPanel"); CERT_PROC = "abw"; certShow("qa"); });
    const dflt = await a.page.inputValue(".certpane:not([hidden]) .qadate");
    t.check(dflt === "2026-12-01", "QA: the default 'Date audited' is the device's date (India 1 December), as the certificate's Date line is", "default is " + dflt + " while the certificate date would be 1 December 2026");
    await a.browser.close();
  }
  t.done();
})().catch(e => { console.log("  FAIL  cert-flows crashed  ->  " + e.stack); process.exitCode = 1; });
