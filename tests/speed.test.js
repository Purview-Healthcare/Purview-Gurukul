/* Speed and efficiency: file sizes, load time (file:// and a local http server), time to the first
   usable Ask, cost of each search keystroke, long tasks, how often the script is called, and
   memory after opening every topic. Measured numbers are printed as "  info  ..." lines
   (they are also copied into docs/qa/findings-cross.md). Budgets are generous on purpose:
   they catch a real regression, not machine noise. */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib"), http = require("http");
const { ROOT, PAGE, suite, openApp, tab } = require("./helpers");

const info = s => console.log("  info  " + s);
const ACCESS = { email: "tester@example.com", until: Date.now() + 6 * 3600000, token: "t.1" };
const initAccess = "localStorage.setItem('gk_cert_access'," + JSON.stringify(JSON.stringify(ACCESS)) + ");";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end("no"); }
      r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" }); r.end(fs.readFileSync(f));
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

(async () => {
  const t = suite("Speed and efficiency");

  /* ---------- file sizes ---------- */
  const names = ["index.html", "basics.js", "scenarios.js", "calls.js", "sources.js", "sops.js", "sops-abw.js", "sops-hagion.js", "sops-titan.js", "sops-vec.js", "specialties.js", "spec-vision.js", "spec-dental.js", "spec-bh.js", "sw.js", "manifest.webmanifest", "purview-logo.png", "icon-192.png", "icon-512.png", "icon-180.png", "favicon-32.png"];
  let raw = 0, gz = 0; const rows = [];
  for (const n of names) { const b = fs.readFileSync(path.join(ROOT, n)); const g = zlib.gzipSync(b).length; raw += b.length; gz += g; rows.push(n + " " + Math.round(b.length / 1024) + " KB (" + Math.round(g / 1024) + " KB gzip)"); }
  info("file sizes: " + rows.join("; "));
  info("total " + Math.round(raw / 1024) + " KB raw, " + Math.round(gz / 1024) + " KB gzipped (GitHub Pages serves gzip)");
  t.check(gz < 1024 * 1024, "everything the app needs is under 1 MB when compressed", Math.round(gz / 1024) + " KB");
  t.check(raw < 3.5 * 1024 * 1024, "everything the app needs is under 3.5 MB uncompressed", Math.round(raw / 1024) + " KB");
  const big = rows.filter((x, i) => fs.statSync(path.join(ROOT, names[i])).size > 600 * 1024);
  t.check(!big.length, "no single file is over 600 KB", big);
  const png = names.filter(n => n.endsWith(".png")).filter(n => fs.statSync(path.join(ROOT, n)).size > 100 * 1024);
  t.check(!png.length, "no image is over 100 KB", png);
  const inlineBytes = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/data:image\/[a-z+]+;base64,[A-Za-z0-9+\/=]{20000,}/g) || [];
  t.check(!inlineBytes.length, "no large inline base64 image inside index.html", inlineBytes.length);

  /* ---------- load time: file:// ---------- */
  const loadTimes = [];
  for (let i = 0; i < 3; i++) {
    const A = await openApp({ script: () => ({ ok: false }) });
    const m = await A.page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
    loadTimes.push(m); await A.browser.close();
  }
  const fl = med(loadTimes.map(x => x.load)), fd = med(loadTimes.map(x => x.dcl));
  info("file:// load: DOMContentLoaded " + fd + " ms, load " + fl + " ms (median of 3; runs " + loadTimes.map(x => x.load).join("/") + ")");
  t.check(fl < 3000, "the page loads in under 3 s from a local file (measured " + fl + " ms)", loadTimes);

  /* ---------- load time + first usable Ask over http ---------- */
  const srv = await serve(), base = "http://127.0.0.1:" + srv.address().port + "/";
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const calls = [];
  await ctx.route(/^https:\/\/script\.google(usercontent)?\.com\//, r => { calls.push(r.request().postData()); r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":false,"error":"x"}' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ["longtask"] }); } catch (e) {} window.print = () => {}; });
  const t0 = Date.now(); await page.goto(base, { waitUntil: "load" }); const wall = Date.now() - t0;
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), res: performance.getEntriesByType("resource").length }; });
  info("http load: DOMContentLoaded " + nav.dcl + " ms, load " + nav.load + " ms, wall " + wall + " ms, " + nav.res + " requests");
  t.check(nav.load < 3000, "the page loads in under 3 s over a local web server (measured " + nav.load + " ms)", nav);
  t.check(nav.res <= 25, "the page makes at most 25 requests to start (measured " + nav.res + ")", nav.res);
  const t1 = await page.evaluate(async () => {
    const s = performance.now(); document.querySelector("#q").value = "what is a deductible"; ask();
    await new Promise(r => requestAnimationFrame(() => r()));
    const card = document.querySelector("#answers .card h2, #answers .card .answer-h");
    return { ms: Math.round(performance.now() - s), ok: !!card, sinceNav: Math.round(performance.now()) };
  });
  info("time to first usable Ask: answer drawn " + t1.ms + " ms after the question; " + t1.sinceNav + " ms after navigation start");
  t.check(t1.ok && t1.ms < 500, "the first question is answered in under 500 ms (measured " + t1.ms + " ms)", t1);
  t.check(t1.sinceNav < 4000, "a first answer is on screen within 4 s of opening the page (measured " + t1.sinceNav + " ms)", t1);
  const lt = await page.evaluate(() => window.__lt.slice());
  const ltMax = lt.length ? Math.max(...lt) : 0, ltSum = lt.reduce((a, b) => a + b, 0);
  info("long tasks (over 50 ms) while loading and answering: " + lt.length + (lt.length ? " (" + lt.join(", ") + " ms; total " + ltSum + " ms)" : ""));
  t.check(ltMax < 1000, "no single long task blocks the page for a second or more (longest " + ltMax + " ms)", lt);
  t.check(calls.length === 0, "the page calls the script zero times on load and a first question", calls.length);

  /* ---------- keystroke cost ---------- */
  const q30 = "what is the deductible on a plan".slice(0, 30);
  const ks = await page.evaluate(async q => {
    document.querySelector('.navtab[data-panel="basicsPanel"]').click();
    const el = document.querySelector("#bq"); el.focus(); el.value = ""; const out = [];
    for (let i = 1; i <= q.length; i++) { el.value = q.slice(0, i); const s = performance.now(); el.dispatchEvent(new Event("input", { bubbles: true })); out.push(Math.round((performance.now() - s) * 10) / 10); await new Promise(r => requestAnimationFrame(() => r())); }
    return out;
  }, q30);
  const ksMax = Math.max(...ks), ksAvg = ks.reduce((a, b) => a + b, 0) / ks.length;
  info("RCM Basics search, " + ks.length + " keystrokes, handler time: average " + ksAvg.toFixed(1) + " ms, slowest " + ksMax + " ms (" + ks.join(" ") + ")");
  t.check(ks.length === 30 && ksMax < 100, "every one of 30 typed characters is handled in under 100 ms in the course search (slowest " + ksMax + " ms)", ks);
  t.check(ksAvg < 40, "the average keystroke in the course search costs under 40 ms (" + ksAvg.toFixed(1) + " ms)", ksAvg);
  const keyReal = await page.evaluate(async () => {
    const el = document.querySelector("#bq"); el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true }));
    const s = performance.now(); const q = "who pays first when there are two plans"; const ts = [];
    for (let i = 1; i <= q.length; i++) { el.value = q.slice(0, i); const a = performance.now(); el.dispatchEvent(new Event("input", { bubbles: true })); ts.push(performance.now() - a); }
    return { total: Math.round(performance.now() - s), max: Math.round(Math.max(...ts)) };
  });
  info("a longer 38-character course search typed with no pauses: total " + keyReal.total + " ms, slowest keystroke " + keyReal.max + " ms");
  t.check(keyReal.max < 100, "even typing without pauses, no keystroke takes 100 ms or more (slowest " + keyReal.max + " ms)", keyReal);

  const askT = await page.evaluate(async () => {
    document.querySelector('.navtab[data-panel="askPanel"]').click();
    const qs = ["what is a deductible", "why was this claim denied for timely filing", "who pays first when a patient has two insurances", "vec routine 92 denial", "how do I appeal a denied claim to the payer", "what is aba therapy", "co-97 bundled service", "what does the payer say when the auth is missing"];
    const out = [];
    for (const q of qs) { document.querySelector("#q").value = q; const s = performance.now(); ask(); out.push(Math.round(performance.now() - s)); await new Promise(r => requestAnimationFrame(() => r())); }
    return out;
  });
  info("Ask answers (8 questions, ask() to card drawn): " + askT.join(", ") + " ms");
  t.check(Math.max(...askT) < 300, "each Ask question is answered in under 300 ms (slowest " + Math.max(...askT) + " ms)", askT);
  const qS = await page.evaluate(() => { const q = "x".repeat(5000); document.querySelector("#q").value = q; const s = performance.now(); ask(); return Math.round(performance.now() - s); });
  t.check(qS < 1500, "a 5,000-character question is handled in under 1.5 s (measured " + qS + " ms)", qS);

  /* ---------- opening every topic: time and memory ---------- */
  const cdp = await ctx.newCDPSession(page);
  const heap = async () => { await cdp.send("HeapProfiler.collectGarbage"); const m = await cdp.send("Performance.getMetrics"); const g = n => (m.metrics.find(x => x.name === n) || {}).value; return { mb: Math.round(g("JSHeapUsedSize") / 1048576 * 10) / 10, nodes: g("Nodes"), listeners: g("JSEventListeners") }; };
  await cdp.send("Performance.enable");
  const before = await heap();
  const open = await page.evaluate(async () => {
    const slow = []; let n = 0; const t0 = performance.now();
    for (const tabId of ["basicsPanel", "sopPanel", "specPanel"]) {
      document.querySelector('.navtab[data-panel="' + tabId + '"]').click();
      const list = [...document.querySelectorAll("#" + tabId + " details.les")];
      for (const d of list) { const s = performance.now(); let p = d.parentElement; while (p && p.tagName !== "BODY") { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; } d.open = true; d.dispatchEvent(new Event("toggle")); const dt = performance.now() - s; n++; if (dt > 150) slow.push(Math.round(dt) + " ms " + d.dataset.id); }
    }
    return { n, slow, total: Math.round(performance.now() - t0) };
  });
  await page.waitForTimeout(500);
  const after = await heap();
  info("opened " + open.n + " topics in " + open.total + " ms; slow topics (over 150 ms): " + (open.slow.length ? open.slow.slice(0, 5).join(", ") : "none"));
  info("memory: before " + before.mb + " MB heap, " + before.nodes + " DOM nodes; after opening every topic " + after.mb + " MB, " + after.nodes + " nodes, " + after.listeners + " listeners");
  t.check(open.n > 150, "every course, playbook and specialty topic was opened (" + open.n + ")", open);
  t.check(open.slow.length === 0, "no single topic takes 150 ms or more to open", open.slow.slice(0, 5));
  t.check(after.mb < 200, "the page uses under 200 MB of JavaScript memory after every topic is open (" + after.mb + " MB)", after);
  t.check(after.nodes < 400000, "the page holds under 400,000 DOM nodes after every topic is open (" + after.nodes + ")", after);

  /* switching tabs and re-opening many times must not keep growing */
  const g0 = await heap();
  for (let i = 0; i < 12; i++) await page.evaluate(() => { for (const p of ["askPanel", "basicsPanel", "browsePanel", "sopPanel", "specPanel", "quizPanel", "certPanel", "dashPanel"]) document.querySelector('.navtab[data-panel="' + p + '"]').click(); });
  await page.waitForTimeout(300);
  const g1 = await heap();
  info("after 12 rounds of visiting every tab: heap " + g0.mb + " -> " + g1.mb + " MB, nodes " + g0.nodes + " -> " + g1.nodes + ", listeners " + g0.listeners + " -> " + g1.listeners);
  t.check(g1.nodes - g0.nodes < 2000, "visiting every tab 12 times does not keep adding page elements (" + (g1.nodes - g0.nodes) + " added)", [g0, g1]);
  t.check(g1.mb - g0.mb < 15, "visiting every tab 12 times does not keep growing memory (" + (g1.mb - g0.mb).toFixed(1) + " MB added)", [g0, g1]);
  t.check(g1.listeners - g0.listeners < 500, "visiting every tab 12 times does not keep adding event listeners (" + (g1.listeners - g0.listeners) + " added)", [g0, g1]);

  /* asking 60 questions: answers pile up in the page */
  const a0 = await heap();
  await page.evaluate(() => { document.querySelector('.navtab[data-panel="askPanel"]').click(); for (let i = 0; i < 60; i++) { document.querySelector("#q").value = ["what is a copay", "co-97", "timely filing denial", "what is cob"][i % 4]; ask(); } });
  const a1 = await heap();
  info("after 60 Ask questions: " + heapLine(a0, a1));
  t.check(await page.evaluate(() => document.querySelectorAll("#answers > .card").length) <= 100, "answers do not grow without limit in the Ask tab (60 questions kept at most 100 cards)");
  t.check(errs.length === 0, "no page errors during the speed run", errs.slice(0, 3));
  await ctx.close(); await browser.close();

  /* ---------- calls to the script ---------- */
  const C = await openApp({ script: b => (b.action === "dash-get" ? { ok: true, projects: {}, counts: {}, recent: [] } : { ok: true }), init: initAccess });
  await C.page.waitForTimeout(300);
  t.check(C.calls.length === 0, "with a saved sign-in, opening the app still makes zero script calls", C.calls.map(c => c.action));
  for (const p of ["basicsPanel", "browsePanel", "sopPanel", "specPanel", "quizPanel", "askPanel"]) await tab(C.page, p);
  t.check(C.calls.length === 0, "the learner tabs never call the script", C.calls.map(c => c.action));
  for (let i = 0; i < 4; i++) { await tab(C.page, "certPanel"); await tab(C.page, "askPanel"); }
  t.check(C.calls.length === 0, "opening Certification again and again makes zero script calls", C.calls.map(c => c.action));
  for (let i = 0; i < 4; i++) { await tab(C.page, "dashPanel"); await C.page.waitForTimeout(200); await tab(C.page, "askPanel"); }
  const dg = C.calls.filter(c => c.action === "dash-get").length;
  info("Dashboard opened 4 times in a row: " + dg + " dash-get call(s)");
  t.check(dg === 1, "opening the Dashboard 4 times fetches its data once, then reuses it (" + dg + " fetches)", C.calls.map(c => c.action));
  await tab(C.page, "dashPanel"); await C.page.waitForTimeout(200);
  await C.page.click("#dashReload"); await C.page.waitForTimeout(300);
  t.check(C.calls.filter(c => c.action === "dash-get").length === 2, "the Refresh button fetches fresh data");
  await C.browser.close();

  const N = await openApp({ script: () => ({ ok: false }) });
  for (const p of ["certPanel", "dashPanel", "certPanel", "dashPanel"]) await tab(N.page, p);
  t.check(N.calls.length === 0, "a visitor who is not signed in causes zero script calls when opening Certification or the Dashboard", N.calls.map(c => c.action));
  await N.browser.close();

  t.done();
  srv.close();
})().catch(e => { console.log("  FAIL  speed test crashed  ->  " + e.stack); process.exitCode = 1; });

function heapLine(a, b) { return "heap " + a.mb + " -> " + b.mb + " MB, nodes " + a.nodes + " -> " + b.nodes; }
