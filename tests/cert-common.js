/* Shared by the certification, dashboard, feedback and dates tests: a mock of the Apps Script that is
   the real script code (via gas-harness) so the page and the server are checked together, a way to
   sign in without typing, and helpers to answer assessments. Made-up data only. */
"use strict";
const { openApp } = require("./helpers");
const { load } = require("./gas-harness");
const EMAIL = "asha@example.com", OTHER = "bala@example.com";

/* a live copy of the script; `over(body)` may answer first (return undefined to fall through) */
function server(over) {
  const g = load({ start: Date.now() }); g.setList(EMAIL + "," + OTHER);
  const handler = async body => {
    if (over) { const r = await over(body, g); if (r !== undefined) return r; }
    return g.post(body);
  };
  return { g, handler };
}
/* the access record the page keeps after a good OTP (token from the script itself) */
function accessFor(g, email, hours) {
  const v = g.login(email || EMAIL);
  return { email: v.email, until: Date.now() + (hours || 12) * 3600000, token: v.token };
}
/* open the app, optionally already signed in */
async function openCert(o) {
  o = o || {};
  const s = server(o.over);
  const acc = o.signedIn === false ? null : (o.access || accessFor(s.g, o.email));
  if (acc && o.fixedTime && !o.access) acc.until = o.fixedTime + 12 * 3600000;
  const init = [];
  if (acc) init.push(`try{localStorage.setItem("gk_cert_access",${JSON.stringify(JSON.stringify(acc))});}catch(e){}`);
  if (o.fixedTime) init.push(`(${function (ms) { const R = Date, off = ms - R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; }})(${o.fixedTime})`);
  if (o.initExtra) init.push(o.initExtra);
  if (o.storage) init.push(`try{ ${Object.keys(o.storage).map(k => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(o.storage[k])});`).join("")} }catch(e){}`);
  const app = await openApp({ script: s.handler, context: o.context, init: new Function(init.join("\n")) });
  app.s = s; app.g = s.g; app.page.setDefaultTimeout(6000);
  /* keep the questions of every quiz so tests know the right answers */
  await app.page.evaluate(() => { const orig = mountQuiz; window.__qs = null; mountQuiz = function (area, makeQs, a, b, c, d) { const qs = makeQs(); window.__qs = qs; return orig(area, () => qs, a, b, c, d); }; });
  return app;
}
async function showCert(page, tile, proc, spec) {
  await page.evaluate(([t, p, s]) => { showPanel("certPanel"); if (p) { CERT_PROC = p; } if (s) { CERT_SPEC = s; } certShow(t); }, [tile, proc || "", spec || ""]);
}
/* start the open assessment and answer; `right` = how many of the first questions to get right (rest wrong) */
async function takeTest(page, name, right) {
  await page.fill("#certName", name === undefined ? "Asha Rao" : name);
  await page.click(".certpane:not([hidden]) .cstart");
  return page.evaluate(nc => {
    const area = document.querySelector(".certpane:not([hidden]) .carea"), qs = window.__qs;
    if (!qs) return { n: 0 };
    for (let i = 0; i < qs.length; i++) {
      const want = i < nc ? qs[i].correct : (qs[i].correct + 1) % 4;
      area.querySelectorAll(".opt")[want].click();
      area.querySelector(".dqnext").click();
    }
    return { n: qs.length, big: (area.querySelector(".big") || {}).textContent, pct: (area.querySelector(".pct") || {}).textContent, text: area.textContent };
  }, right === "all" ? 999 : right);
}
const sheet = page => page.evaluate(() => document.getElementById("printSheet").innerHTML);
const sheetText = page => page.evaluate(() => document.getElementById("printSheet").textContent);
const printed = page => page.evaluate(() => window.__printed || 0);
const sendOtp = async (page, email) => { await page.fill("#clEmail", email); await page.click("#clSend"); await page.waitForTimeout(250); };
module.exports = { server, accessFor, openCert, showCert, takeTest, sheet, sheetText, printed, sendOtp, EMAIL, OTHER };
