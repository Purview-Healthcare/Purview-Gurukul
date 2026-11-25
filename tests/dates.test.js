/* Dates: which date the certificate prints, and in which time zone. The same instant is opened on a
   device in India (Asia/Kolkata) and one in New York; the app's clock is fixed so the results do not
   depend on when the test runs. Findings are in docs/qa/findings-cert.md. */
"use strict";
const { suite } = require("./helpers");
const C = require("./cert-common");
const t = suite("Dates and time zones");

async function printed(zone, instant) {
  const a = await C.openCert({ context: { timezoneId: zone }, fixedTime: instant });
  await C.showCert(a.page, "rcm");
  await C.takeTest(a.page, "Asha Rao", "all");
  await a.page.click(".certpane:not([hidden]) .cprint"); await a.page.waitForTimeout(150);
  const text = await C.sheetText(a.page);
  const out = { line: (text.match(/Trainer signature(\d+ \w+ \d{4})Date/) || [])[1], body: (text.match(/questions\) on (\d+ \w+ \d{4})/) || [])[1], stored: await a.page.evaluate(() => certLoad().train.rcm.date), errors: a.errors };
  await a.browser.close();
  return out;
}
const U = (...a) => Date.UTC(...a);
const cases = [
  ["month end", U(2026, 10, 30, 20, 0), "1 December 2026", "30 November 2026"],
  ["year end", U(2026, 11, 31, 20, 0), "1 January 2027", "31 December 2026"],
  ["leap day", U(2028, 1, 28, 20, 0), "29 February 2028", "28 February 2028"],
  ["not a leap year", U(2027, 1, 28, 20, 0), "1 March 2027", "28 February 2027"],
  ["just before midnight in India", U(2026, 10, 25, 18, 29), "25 November 2026", "25 November 2026"],
  ["just after midnight in India", U(2026, 10, 25, 18, 31), "26 November 2026", "25 November 2026"]
];

(async () => {
  const diffs = [];
  for (const [name, instant, ist, ny] of cases) {
    const [i, n] = await Promise.all([printed("Asia/Kolkata", instant), printed("America/New_York", instant)]);
    t.check(i.line === ist && i.body === ist && i.stored === ist, name + ": a device in India prints " + ist + " on the Date line, in the text and in the saved record", i);
    t.check(n.line === ny && n.body === ny, name + ": a device in New York prints " + ny + " for the same instant", n);
    t.check(i.line === n.line, name + ": the same instant prints the same date on every device (India time)", "India " + i.line + " vs New York " + n.line);
    t.check(!i.errors.length && !n.errors.length, name + ": no page errors");
  }
  /* the Date line is the print day, the text is the day it was cleared (Q1) */
  {
    const a = await C.openCert({ context: { timezoneId: "Asia/Kolkata" }, fixedTime: U(2026, 10, 25, 6, 0) });
    await a.page.evaluate(() => { const c = certLoad(); c.train.rcm = { name: "Asha Rao", date: "20 November 2026", score: 18, n: 20, pct: 90, id: "GK-R-TEST01" }; certSave(c); });
    await C.showCert(a.page, "rcm");
    await a.page.click(".certpane:not([hidden]) .cprint"); await a.page.waitForTimeout(150);
    const text = await C.sheetText(a.page);
    t.check(/on 20 November 2026/.test(text) && /Trainer signature25 November 2026Date/.test(text), "print day: the text keeps the day it was cleared (20 November) and the Date line shows the day it was printed (25 November)", text.slice(100, 400));
    await a.browser.close();
  }
  /* dashboard dates follow the device zone as well */
  for (const [zone, want] of [["Asia/Kolkata", "1 Dec 2026"], ["America/New_York", "30 Nov 2026"]]) {
    const a = await C.openCert({ context: { timezoneId: zone } });
    a.g.props.set("DASH_PROJECTS", JSON.stringify({ abw: { status: "yes", reason: "", manager: "", tl: "", scope: [], by: "bala@example.com", at: "2026-11-30T20:00:00.000Z" } }));
    await a.page.evaluate(() => { DASH.loaded = false; showPanel("dashPanel"); }); await a.page.waitForTimeout(500);
    const m = await a.page.textContent('#dashProjects .dcard[data-id="abw"] .dmeta');
    t.check(m.indexOf(want) >= 0, "dashboard: 'Updated' for 30 Nov 20:00 UTC reads " + want + " on a device in " + zone, m);
    await a.browser.close();
  }
  /* access length uses the device clock, so a device with a clock set back keeps access longer */
  {
    const a = await C.openCert({ signedIn: false, fixedTime: U(2026, 10, 25, 10, 0) });
    await a.page.evaluate(() => showPanel("certPanel"));
    await C.sendOtp(a.page, C.EMAIL);
    await a.page.fill("#clCode", a.g.codeOf()); await a.page.click("#clVerify"); await a.page.waitForTimeout(300);
    const rec = await a.page.evaluate(() => JSON.parse(localStorage.getItem("gk_cert_access")));
    t.check(Math.abs(rec.until - (U(2026, 10, 25, 10, 0) + 12 * 3600000)) < 60000, "access: 12 hours counts from the moment of the OTP on the device clock", new Date(rec.until).toISOString());
    const shown = await a.page.textContent("#certAccessUntil");
    t.check(/\d\d:\d\d/.test(shown), "access: the page shows until what time access is open", shown);
    await a.browser.close();
  }
  t.done();
})().catch(e => { console.log("  FAIL  dates test crashed  ->  " + e.stack); process.exitCode = 1; });
