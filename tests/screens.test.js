/* Screens: every tab at desktop, tablet and phone size; every visible button, chip and topic
   header clicked once; page and console errors collected; no sideways scrolling; images have
   alt text; buttons and fields have names; the keyboard reaches the main controls; the print
   stylesheet hides the app's chrome. The script is mocked; window.print is stubbed. */
"use strict";
const { PAGE, suite } = require("./helpers");

const ACCESS = { email: "tester@example.com", until: Date.now() + 6 * 3600000, token: "t.1" };
const DASH = {
  ok: true,
  projects: { abw: { status: "yes", reason: "", manager: "Made Up Manager", tl: "Made Up Lead", scope: ["AR follow-up", "Eligibility"], by: "tester@example.com", at: new Date().toISOString() }, hagion: { status: "no", reason: "SOP under revision, expected 15 March", manager: "M Two", tl: "L Two", scope: ["AR follow-up"], by: "tester@example.com", at: "2020-01-01T00:00:00Z" }, "spec-dental": { status: "other", reason: "tracked live on calls" } },
  counts: { rcm: { n: 12, people: 9 }, denials: { n: 7, people: 6 }, "proc:abw": { n: 4, people: 4 }, "qa:abw": { n: 1, people: 1 }, final: { n: 2, people: 2 } },
  recent: [{ name: "Test Person", k: "rcm", pct: 90, t: new Date().toISOString() }]
};
const PANELS = [["askPanel", "Ask"], ["basicsPanel", "RCM Basics"], ["browsePanel", "All Denials"], ["sopPanel", "Purview SOPs"], ["specPanel", "Specialties"], ["quizPanel", "Quiz"], ["certPanel", "Certification"], ["dashPanel", "Dashboard"]];
const SIZES = [["desktop 1280x900", 1280, 900], ["tablet 768x1024", 768, 1024], ["phone 390x844", 390, 844]];

/* click every visible, unclicked control in a panel; returns how many were clicked */
const CLICK_ALL = async ([panel, cap]) => {
  window.__ck = window.__ck || new WeakSet();
  const SKIP = "#fbPick, #updReload, #certLockNow, #fbMail, a[href]";
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !el.disabled && !el.closest("[hidden]") && !el.closest("#fbWrap"); };
  let n = 0;
  while (n < cap) {
    const p = document.getElementById(panel); if (!p) break;
    const el = [...p.querySelectorAll("button, summary, [role=button]")].find(e => !window.__ck.has(e) && vis(e) && !e.matches(SKIP));
    if (!el) break;
    window.__ck.add(el); el.click(); n++;
    await new Promise(r => setTimeout(r, 8));
  }
  return n;
};

(async () => {
  const t = suite("Screens");
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  let totalClicks = 0; const tapSmall = {};

  for (const [label, w, h] of SIZES) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, permissions: ["clipboard-read", "clipboard-write"] });
    await context.route(/^https:\/\/script\.google(usercontent)?\.com\//, async route => {
      let b = {}; try { b = JSON.parse(route.request().postData() || "{}"); } catch (e) {}
      const reply = b.action === "dash-get" ? DASH : b.action === "otp-send" ? { ok: true, minutes: 10 } : { ok: true };
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(reply) });
    });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort("failed"));
    await context.addInitScript(a => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; try { localStorage.setItem("gk_cert_access", JSON.stringify(a)); } catch (e) {} }, ACCESS);
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error" && !/net::ERR|Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
    page.on("dialog", d => d.accept().catch(() => {}));
    await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(300);

    const perTab = {};
    for (const [id, name] of PANELS) {
      await page.click('.navtab[data-panel="' + id + '"]'); await page.waitForTimeout(250);
      const on = await page.evaluate(i => document.getElementById(i).classList.contains("on"), id);
      const wide = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      const n = await page.evaluate(CLICK_ALL, [id, 400]);
      await page.waitForTimeout(150);
      const wide2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      perTab[id] = { on, n, wide: wide.sw > wide.cw + 1, wide2: wide2.sw > wide2.cw + 1, name };
      totalClicks += n;
      /* controls too small to tap on a phone */
      if (w === 390) tapSmall[id] = await page.evaluate(pid => [...document.getElementById(pid).querySelectorAll("button, summary, input:not([type=hidden]), select, textarea")].filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !e.closest("[hidden]") && (r.height < 24 || r.width < 24); }).map(e => (e.id || e.className || e.tagName).toString().slice(0, 30)), id);
    }
    t.check(PANELS.every(([id]) => perTab[id].on), label + ": every one of the 8 tabs opens", PANELS.filter(([id]) => !perTab[id].on));
    t.check(PANELS.every(([id]) => perTab[id].n > 0 || id === "dashPanel"), label + ": every tab has controls and each was clicked (" + PANELS.map(([id]) => perTab[id].n).join("/") + " clicks)", perTab);
    t.check(!PANELS.some(([id]) => perTab[id].wide || perTab[id].wide2), label + ": no tab scrolls sideways, before or after its controls are used", PANELS.filter(([id]) => perTab[id].wide || perTab[id].wide2).map(x => x[1]));
    t.check(errors.length === 0, label + ": no page errors or console errors while every control was clicked", errors.slice(0, 4));

    /* top bar controls */
    await page.click('.navtab[data-panel="askPanel"]');
    await page.click("#fbOpen"); await page.waitForTimeout(100);
    const modal = await page.evaluate(() => ({ open: !$("#fbWrap").hidden, chips: [...document.querySelectorAll("#fbTypes .chip")].length }));
    for (const c of await page.$$("#fbTypes .chip")) await c.click();
    t.check(modal.open && modal.chips >= 4, label + ": the feedback window opens and its type chips can be clicked", modal);
    const fbBox = await page.evaluate(() => { const r = document.querySelector("#fbWrap .fbcard").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; });
    t.check(fbBox.l >= -1 && fbBox.r <= fbBox.w + 1, label + ": the feedback window fits the screen width", fbBox);
    await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    const escClosed = await page.evaluate(() => $("#fbWrap").hidden);
    t.check(escClosed, label + ": Escape closes the feedback window", { escClosed });
    if (!escClosed) await page.click("#fbClose");
    await page.click("#fbOpen"); await page.click("#fbClose");
    t.check(await page.evaluate(() => $("#fbWrap").hidden), label + ": the feedback window's close button works");
    t.check(errors.length === 0, label + ": no errors after the feedback window", errors.slice(0, 3));
    await context.close();
  }
  console.log("  info  clicked " + totalClicks + " controls across 3 sizes");
  const smallPhone = Object.entries(tapSmall).filter(([k, v]) => v.length);
  console.log("  info  phone controls under 24x24 px: " + (smallPhone.length ? smallPhone.map(([k, v]) => k + ": " + v.length + " (" + [...new Set(v)].slice(0, 4).join(", ") + ")").join("; ") : "none"));
  t.check(smallPhone.every(([k, v]) => v.length <= 5), "phone: no tab has more than 5 controls smaller than 24 x 24 px", smallPhone.map(([k, v]) => k + ":" + v.length));

  /* ---------- accessibility and structure (desktop) ---------- */
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  await context.route(/^https:\/\/script\.google/, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(DASH) }));
  await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort("failed"));
  await context.addInitScript(a => { window.print = () => {}; try { localStorage.setItem("gk_cert_access", JSON.stringify(a)); } catch (e) {} }, ACCESS);
  const page = await context.newPage(); const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("dialog", d => d.accept());
  await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(300);
  const struct = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, vp: !!document.querySelector('meta[name="viewport"]'), h1: document.querySelectorAll("h1").length, main: !!document.querySelector("main, [role=main]"), nav: !!document.querySelector("nav, [role=navigation]"), theme: !!document.querySelector('meta[name="theme-color"]'), manifest: !!document.querySelector('link[rel="manifest"]') }));
  t.check(/^en/.test(struct.lang) && struct.title.length > 3 && struct.vp, "the page has a language, a title and a phone viewport setting", struct);
  t.check(struct.h1 >= 1, "the page has a main heading (h1)", struct);
  t.check(struct.main && struct.nav, "the page has main and navigation landmarks for screen readers", struct);
  t.check(struct.theme, "the page sets a theme colour for the phone browser bar", struct);
  t.check(struct.manifest, "the page links its install manifest (needed for 'install as an app' and the home-screen icon)", struct);

  /* open everything so images and buttons from every tab exist */
  for (const [id] of PANELS) { await page.click('.navtab[data-panel="' + id + '"]'); await page.evaluate(CLICK_ALL, [id, 150]); }
  await page.evaluate(() => document.querySelectorAll("details").forEach(d => { d.open = true; d.dispatchEvent(new Event("toggle")); }));
  await page.waitForTimeout(600);
  const a11y = await page.evaluate(() => {
    const noAlt = [...document.querySelectorAll("img")].filter(i => !i.hasAttribute("alt")).map(i => i.outerHTML.slice(0, 70));
    const svgBad = [...document.querySelectorAll('svg[role="img"]')].filter(s => !s.getAttribute("aria-label") && !s.querySelector("title")).length;
    const name = e => (e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || e.getAttribute("title") || (e.textContent || "").replace(/\s+/g, " ").trim() || (e.querySelector("img[alt]") || {}).alt || "");
    const btns = [...document.querySelectorAll("button, [role=button], summary")].filter(e => !e.closest("#printSheet"));
    const noName = btns.filter(b => !name(b)).map(b => (b.id || b.className || b.tagName) + "");
    const inputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=file]):not([type=radio]):not([type=checkbox]), textarea, select")].filter(i => !i.closest("#printSheet"));
    const noLabel = inputs.filter(i => !(i.getAttribute("aria-label") || i.getAttribute("aria-labelledby") || i.getAttribute("title") || (i.id && document.querySelector('label[for="' + i.id + '"]')) || i.closest("label"))).map(i => i.id || i.name || i.className || i.tagName);
    const dupIds = (() => { const c = {}; document.querySelectorAll("[id]").forEach(e => { c[e.id] = (c[e.id] || 0) + 1; }); return Object.keys(c).filter(k => c[k] > 1); })();
    const brokenRef = [...document.querySelectorAll("[aria-labelledby]")].filter(e => e.getAttribute("aria-labelledby").split(/\s+/).some(id => !document.getElementById(id))).length;
    return { imgs: document.querySelectorAll("img").length, noAlt, svgBad, buttons: btns.length, noName, inputs: inputs.length, noLabel, dupIds, brokenRef };
  });
  console.log("  info  checked " + a11y.imgs + " images, " + a11y.buttons + " buttons and " + a11y.inputs + " fields");
  t.check(a11y.noAlt.length === 0, "every image has an alt attribute", a11y.noAlt.slice(0, 3));
  t.check(a11y.svgBad === 0, "every SVG marked as an image has a text name", a11y.svgBad);
  t.check(a11y.noName.length === 0, "every button has a name a screen reader can read", [...new Set(a11y.noName)].slice(0, 5));
  t.check(a11y.noLabel.length === 0, "every text field has a label, not only a placeholder", [...new Set(a11y.noLabel)].slice(0, 6));
  t.check(a11y.dupIds.length === 0, "no id is used twice on the page", a11y.dupIds.slice(0, 5));
  t.check(a11y.brokenRef === 0, "every aria-labelledby points at an element that exists", a11y.brokenRef);

  /* keyboard */
  await page.click('.navtab[data-panel="askPanel"]'); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(300);
  const seen = [];
  for (let i = 0; i < 45; i++) { await page.keyboard.press("Tab"); seen.push(await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return "body"; const cs = getComputedStyle(a); return (a.id ? "#" + a.id : "") + "." + (a.className || "").toString().split(" ")[0] + "|" + a.tagName + "|" + (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? "outline" : cs.boxShadow !== "none" ? "shadow" : "none"); })); }
  const has = s => seen.some(x => x.includes(s));
  t.check(has(".navtab") && has("#q") && has("#go"), "keyboard Tab reaches the tab bar, the question box and the Ask button", seen.slice(0, 20));
  t.check(has("#fbOpen"), "keyboard Tab reaches the Send feedback button", seen.slice(0, 20));
  const noRing = seen.filter(x => x !== "body" && x.endsWith("|none"));
  t.check(noRing.length <= 3, "a focused control shows a visible focus ring or shadow (" + noRing.length + " of " + seen.length + " Tab stops show none)", noRing.slice(0, 5));
  await page.focus('.navtab[data-panel="basicsPanel"]'); await page.keyboard.press("Enter"); await page.waitForTimeout(120);
  t.check(await page.evaluate(() => document.getElementById("basicsPanel").classList.contains("on")), "pressing Enter on a focused tab opens it");
  await page.focus("#bq"); await page.keyboard.type("copay"); await page.keyboard.press("Enter"); await page.waitForTimeout(250);
  t.check(await page.evaluate(() => !!document.querySelector("#basicsTree details.les[open]")), "typing a search in RCM Basics and pressing Enter opens the top topic from the keyboard alone");
  await page.click('.navtab[data-panel="askPanel"]'); await page.focus("#q"); await page.keyboard.type("what is a copay"); await page.keyboard.press("Enter"); await page.waitForTimeout(250);
  t.check(await page.evaluate(() => !!document.querySelector("#answers .card")), "the question box answers when Enter is pressed");
  const sum = await page.evaluate(() => [...document.querySelectorAll("details > summary")].filter(s => { const r = s.getBoundingClientRect(); return r.width > 0; }).length);
  t.check(sum > 0, "topic headers are real summary elements (keyboard and screen reader friendly)", sum);

  /* the feedback window names the tab it was opened from */
  const ctxNames = {};
  for (const [id, name] of PANELS) { await page.evaluate(i => document.querySelector('.navtab[data-panel="' + i + '"]').click(), id); await page.waitForTimeout(80); ctxNames[name] = await page.evaluate(() => { fbOpen(); const v = $("#fbCtx").value; fbClose(); return v; }); }
  const badCtx = PANELS.filter(([id, name]) => !ctxNames[name].startsWith(name)).map(([id, name]) => name + " -> " + ctxNames[name]);
  t.check(!badCtx.length, "feedback from each tab says which tab it came from (Ask, RCM Basics, ..., Dashboard)", badCtx);

  /* print stylesheet */
  await page.emulateMedia({ media: "print" });
  for (const id of ["askPanel", "basicsPanel", "sopPanel", "certPanel"]) {
    await page.evaluate(i => document.querySelector('.navtab[data-panel="' + i + '"]').click(), id); await page.waitForTimeout(150);
    const vis = await page.evaluate(() => { const v = s => [...document.querySelectorAll(s)].some(e => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0); return { topbar: v(".topbar"), nav: v(".navtab"), fb: v("#fbOpen"), search: v(".searchbar"), hero: v(".hero"), footer: v("footer"), upd: v("#updbar") }; });
    t.check(!vis.topbar && !vis.nav && !vis.fb && !vis.search && !vis.hero && !vis.footer && !vis.upd, "print layout (" + id.replace("Panel", "") + "): the top bar, tabs, search, feedback button and footer are hidden", vis);
  }
  await page.evaluate(() => { $("#printSheet").innerHTML = "<div class='phead'><span>Purview Gurukul</span></div><h1>Print test sheet</h1>"; document.body.classList.add("printing"); });
  const pr = await page.evaluate(() => { const shown = [...document.body.children].filter(e => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0 && e.tagName !== "SCRIPT").map(e => e.id || e.className || e.tagName); return { shown, sheet: getComputedStyle($("#printSheet")).display }; });
  t.check(pr.sheet === "block" && pr.shown.every(x => x === "printSheet" || /^(printSheet|toast)$/.test(x)), "while printing a sheet, only the sheet is shown (nothing else from the app)", pr);
  await page.evaluate(() => document.body.classList.remove("printing"));
  const sheetHidden = await page.evaluate(() => getComputedStyle($("#printSheet")).display);
  t.check(sheetHidden === "none", "outside of printing, the hidden print sheet stays hidden", sheetHidden);
  await page.emulateMedia({ media: "screen" });

  t.check(errs.length === 0, "no page errors in the accessibility and print runs", errs.slice(0, 3));
  await context.close(); await browser.close();
  t.done();
})().catch(e => { console.log("  FAIL  screens test crashed  ->  " + e.stack); process.exitCode = 1; });
