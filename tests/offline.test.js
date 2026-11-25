/* Offline and the service worker: the worker registers, every file in its list is cached, the
   app still works with the network cut, a version bump replaces the old cache, and nothing the
   page needs is missing from the cache list. Runs against a small local web server on a free
   port (the app registers its worker only on https or on "localhost"). */
"use strict";
const fs = require("fs"), path = require("path"), http = require("http");
const { ROOT, suite } = require("./helpers");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const APP = (swSrc.match(/const APP = \[([\s\S]*?)\];/)[1].match(/"[^"]+"/g) || []).map(s => s.slice(1, -1));
const VER = (swSrc.match(/const VER = PRE \+ "([^"]+)"/) || [])[1];
const PRE = (swSrc.match(/const PRE = "([^"]+)"/) || [])[1];

/* a tiny server; `state` lets a test change what is served, as a new release would */
function serve(state) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      state.hits.push(q.url);
      let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
      if (state.down) { r.writeHead(503); return r.end("down"); }
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404, { "Content-Type": "text/html" }); return r.end("<h1>404 not found page</h1>"); }
      let body = fs.readFileSync(f);
      if (p === "/sw.js" && state.ver) body = Buffer.from(body.toString().replace('PRE + "' + VER + '"', 'PRE + "' + state.ver + '"'));
      if (p === "/index.html" && state.marker) body = Buffer.from(body.toString().replace("<title>", "<!--" + state.marker + "--><title>"));
      r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" }); r.end(body);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const t = suite("Offline and the service worker");
  t.check(APP.length >= 20 && !!VER && !!PRE, "the worker's file list and version were read (" + APP.length + " files, " + PRE + VER + ")", { APP: APP.length, VER });

  const state = { hits: [], ver: "", marker: "", down: false };
  const srv = await serve(state), base = "http://localhost:" + srv.address().port + "/";
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort("failed"));
  const calls = []; await context.route(/^https:\/\/script\.google(usercontent)?\.com\//, r => { calls.push(1); r.abort("failed"); });
  const page = await context.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => { window.print = () => {}; });

  /* ---- register and cache ---- */
  await page.goto(base, { waitUntil: "load" });
  const reg = await page.evaluate(async () => { try { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 15000))]); return { ok: true, scope: r.scope, active: !!r.active }; } catch (e) { return { ok: false, err: e.message }; } });
  t.check(reg.ok && reg.active, "the service worker registers and becomes active on localhost", reg);
  await page.waitForTimeout(800);
  const keys = await page.evaluate(() => caches.keys());
  t.check(keys.includes(PRE + VER), "the cache named after the current version exists (" + PRE + VER + ")", keys);
  const cached = await page.evaluate(async v => { const c = await caches.open(v); const out = {}; for (const r of await c.keys()) { const m = await c.match(r); out[new URL(r.url).pathname + new URL(r.url).search] = { ok: m.ok, n: (await m.clone().arrayBuffer()).byteLength }; } return out; }, PRE + VER);
  const missing = APP.filter(a => { const u = a === "./" ? "/" : "/" + a.slice(2); return !cached[u]; });
  t.check(!missing.length, "every file in the worker's list is in the cache (" + APP.length + " of " + APP.length + ")", missing);
  t.check(Object.values(cached).every(v => v.ok && v.n > 0), "every cached file is a real, non-empty answer (no cached errors)", Object.entries(cached).filter(([k, v]) => !v.ok || !v.n));

  /* what the page really loaded must all be in the list */
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(400);
  const needed = await page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.startsWith(location.origin)).map(r => new URL(r.name).pathname + new URL(r.name).search));
  const listed = new Set(APP.map(a => a === "./" ? "/" : "/" + a.slice(2)));
  const notListed = [...new Set(needed)].filter(u => !listed.has(u) && !listed.has(u.split("?")[0]));
  t.check(!notListed.length, "every file the page loads is in the cache list", notListed);
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const refs = [...html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"#]+)"/g)].map(m => m[1]).filter(u => !/^(https?:|data:|mailto:|tel:)/.test(u) && !/['+]/.test(u));
  const unlisted = refs.filter(u => !listed.has("/" + u) && !listed.has("/" + u.split("?")[0]));
  t.check(!unlisted.length, "every local file named in index.html (scripts, icons, manifest, logo) is in the cache list", unlisted);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  const mIcons = (manifest.icons || []).map(i => "/" + i.src.replace(/^\.\//, "").split("?")[0]);
  t.check(mIcons.length > 0 && mIcons.every(i => [...listed].some(l => l.split("?")[0] === i)), "every icon in the install manifest is cached", mIcons.filter(i => ![...listed].some(l => l.split("?")[0] === i)));
  t.check(APP.every(a => a === "./" || fs.existsSync(path.join(ROOT, a.split("?")[0]))), "every file named in the cache list exists in the repository");

  /* ---- offline ---- */
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  const off = await page.evaluate(() => ({ title: document.title, tabs: document.querySelectorAll(".navtab").length, data: typeof DATA !== "undefined" && DATA.length, basics: typeof BASICS_MODULES !== "undefined", sops: typeof SOP_CLIENTS !== "undefined" && SOP_CLIENTS.length, spec: typeof SPEC_TRACKS !== "undefined" && SPEC_TRACKS.length }));
  t.check(off.tabs === 8 && off.data > 50 && off.basics && off.sops >= 4 && off.spec >= 3, "offline: the page reloads with all tabs, denials, course, playbooks and specialties", off);
  const ans = await page.evaluate(() => { $("#q").value = "what is a deductible"; ask(); const h = document.querySelector("#answers .card"); return h ? h.textContent.length : 0; });
  t.check(ans > 100, "offline: Ask answers a question", ans);
  for (const p of ["basicsPanel", "browsePanel", "sopPanel", "specPanel", "quizPanel", "certPanel", "dashPanel"]) { await page.click('.navtab[data-panel="' + p + '"]'); await page.waitForTimeout(100); }
  const panelsOk = await page.evaluate(() => [...document.querySelectorAll(".panel")].length > 5);
  t.check(panelsOk && !errors.length, "offline: every tab opens with no page errors", errors.slice(0, 3));
  const logo = await page.evaluate(() => { const i = document.querySelector("#pvImg"); return i && i.complete && i.naturalWidth > 0; });
  t.check(logo, "offline: the logo image still shows");
  const deep = await page.goto(base + "?from=home-screen", { waitUntil: "load" }).then(r => r && r.status()).catch(e => "err " + e.message);
  t.check(await page.evaluate(() => !!document.querySelector(".navtab")) && deep === 200, "offline: opening the app with extra text on the address still works", deep);
  const nopage = await page.goto(base + "no-such-page", { waitUntil: "load" }).then(r => r && r.status()).catch(e => "err " + e.message);
  t.check(await page.evaluate(() => !!document.querySelector(".navtab")), "offline: an unknown address inside the app falls back to the app", nopage);
  await page.goto(base, { waitUntil: "load" });
  await page.click('.navtab[data-panel="basicsPanel"]');
  const lesson = await page.evaluate(() => { const d = document.querySelector("#basicsTree details.les"); let p = d.parentElement; while (p && p.id !== "basicsTree") { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; } d.open = true; return d; }).then(() => page.waitForTimeout(300)).then(() => page.evaluate(() => !!document.querySelector("#basicsTree details.les[open] .lesbody")));
  t.check(lesson, "offline: a course topic opens with its content");
  await page.click('.navtab[data-panel="certPanel"]');
  await page.fill("#clEmail", "someone@example.com"); await page.click("#clSend"); await page.waitForTimeout(500);
  const msg = await page.textContent("#clErr");
  t.check(/connect|reach|network/i.test(msg) && !errors.length, "offline: asking for an OTP gives a plain connection message, not a crash", msg);
  await context.setOffline(false);

  /* ---- a bad answer from the server must not replace the cached app ---- */
  const bad = await page.goto(base + "typo-page", { waitUntil: "load" }).then(r => r.status());
  await page.waitForTimeout(400);
  await context.setOffline(true);
  await page.goto(base, { waitUntil: "load" }).catch(() => {});
  const stillApp = await page.evaluate(() => !!document.querySelector(".navtab") && document.body.textContent.indexOf("404 not found page") < 0);
  t.check(bad === 404 && stillApp, "a mistyped address that returns 404 online does not replace the cached app (offline start still works afterwards)", { status: bad, stillApp });
  const viaIndex = await page.goto(base + "index.html", { waitUntil: "load" }).catch(() => null);
  const idxOk = await page.evaluate(() => !!document.querySelector(".navtab") && document.body.textContent.indexOf("404 not found page") < 0);
  t.check(idxOk, "a mistyped address that returns 404 online does not replace the cached index.html copy (offline start from /index.html still works afterwards)", { idxOk });
  await context.setOffline(false);
  await page.goto(base, { waitUntil: "load" });

  /* a server error on a script must not be stored as the script */
  state.down = true; await page.reload({ waitUntil: "load" }).catch(() => {}); state.down = false;
  await page.waitForTimeout(300);
  await context.setOffline(true);
  await page.goto(base, { waitUntil: "load" }).catch(() => {});
  const afterDown = await page.evaluate(() => ({ tabs: document.querySelectorAll(".navtab").length, data: typeof DATA !== "undefined" ? DATA.length : 0 }));
  t.check(afterDown.tabs === 8 && afterDown.data > 50, "a short server outage (503) is not cached over the app: offline still works afterwards", afterDown);
  await context.setOffline(false);
  await page.goto(base, { waitUntil: "load" });

  /* ---- version bump ---- */
  const oldMarkerBefore = await page.evaluate(() => document.documentElement.outerHTML.includes("RELEASE-MARK"));
  state.ver = "v9999-test"; state.marker = "RELEASE-MARK";
  const upd = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); await new Promise(res => setTimeout(res, 2500)); return { waiting: !!r.waiting, active: !!r.active, ks: await caches.keys() }; });
  t.check(upd.ks.includes(PRE + "v9999-test"), "a new worker version creates its own new cache", upd);
  t.check(!upd.ks.includes(PRE + VER), "the old version's cache is deleted once the new worker takes over", upd.ks);
  const bar = await page.evaluate(() => { const b = document.querySelector("#updbar"); return b ? !b.hidden : null; });
  t.check(bar === true, "after an update the page shows its 'new version' bar", bar);
  await page.reload({ waitUntil: "load" });
  const fresh = await page.evaluate(() => document.documentElement.outerHTML.includes("RELEASE-MARK"));
  t.check(!oldMarkerBefore && fresh, "after the bump a normal reload shows the new release at once (network first)", { oldMarkerBefore, fresh });
  await context.setOffline(true);
  await page.goto(base, { waitUntil: "load" });
  const freshOffline = await page.evaluate(() => document.documentElement.outerHTML.includes("RELEASE-MARK") && document.querySelectorAll(".navtab").length === 8);
  t.check(freshOffline, "offline after the bump the new release is what is served from the cache", freshOffline);
  const cachedNew = await page.evaluate(async () => { const c = await caches.open("purview-gurukul-v9999-test"); return (await c.keys()).length; });
  t.check(cachedNew >= APP.length, "the new cache holds the whole app list (" + cachedNew + " entries)", cachedNew);
  await context.setOffline(false);

  /* ---- script is never cached or served by the worker ---- */
  const scriptCached = await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k); for (const r of await c.keys()) if (/script\.google/.test(r.url)) out.push(r.url); } return out; });
  t.check(!scriptCached.length, "no answer from the Apps Script is ever stored in the offline cache", scriptCached);
  t.check(!/POST/.test(swSrc.replace(/if \(req\.method !== "GET"\) return;/, "")), "the worker only handles GET requests");
  t.check(errors.length === 0, "no page errors during the whole offline run", errors.slice(0, 3));

  await browser.close(); srv.close();
  t.done();
})().catch(e => { console.log("  FAIL  offline test crashed  ->  " + e.stack); process.exitCode = 1; });
