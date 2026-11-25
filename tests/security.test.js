/* Security and privacy: no secrets or personal data in committed files, no internal links,
   every place that puts text into the page escapes it (search box, names, QA fields, the
   Dashboard reply from the script, values read back from localStorage), external links are
   safe. All data is made up; the script is mocked. */
"use strict";
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const { ROOT, suite, openApp, tab } = require("./helpers");

const PAY = "<img src=x onerror=window.__x=1>";
const ACCESS = { email: "tester@example.com", until: Date.now() + 6 * 3600000, token: "t.1" };
const initAccess = "localStorage.setItem('gk_cert_access'," + JSON.stringify(JSON.stringify(ACCESS)) + ");";

function committed() {
  return execSync("git ls-files", { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean)
    .filter(f => !/^(tests|docs)\//.test(f) && !/\.(png|ico)$/.test(f));
}
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

/* did the payload run, or turn into a real element? */
async function injected(page) {
  return page.evaluate(() => { const o = { ran: window.__x !== undefined, imgs: document.querySelectorAll('img[src="x"]').length }; window.__x = undefined; return o; });
}
const clean = r => !r.ran && r.imgs === 0;

(async () => {
  const t = suite("Security and privacy");
  const files = committed();
  const text = files.map(f => [f, read(f)]);

  /* ---------- 1. secrets, personal data, internal links in committed files ---------- */
  const secretRe = /(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[abp]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{32,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/;
  t.check(!text.filter(([f, c]) => secretRe.test(c)).length, "no API keys, tokens or private keys in any committed file", text.filter(([f, c]) => secretRe.test(c)).map(x => x[0]));

  const assign = /\b(password|passwd|secret|api[_-]?key|apikey|auth[_-]?token|access[_-]?token)\b\s*[:=]\s*["'][A-Za-z0-9+\/_\-]{12,}["']/i;
  t.check(!text.filter(([f, c]) => assign.test(c)).length, "no hard-coded password, secret or key value assigned in code", text.filter(([f, c]) => assign.test(c)).map(x => x[0]));

  const gs = read("tools/gurukul-email.gs");
  t.check(/getProperty\(\s*"GK_SECRET"\s*\)/.test(gs) && !/GK_SECRET["']?\s*[:=]\s*["'][^"']{6,}/.test(gs), "the script's signing secret is read from Script Properties, never written in the code");
  t.check(!/CERT_EMAILS["']?\s*[:=]\s*["'][^"']*@/.test(gs) && !/CERT_EMAILS\s*=\s*\[/.test(gs), "the approved email list is not written in the public script");

  const phone = /(\(\d{3}\)\s?\d{3}[-.\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b|\b1[-. ]8(00|33|44|55|66|77|88)[-. ]\d{3}[-. ]\d{4}\b|\+\d{1,3}[ -]\d{5,}|\b\d{3} \d{3} \d{4}\b)/;
  const phones = []; text.forEach(([f, c]) => { if (/\.(js|html|gs|webmanifest)$/.test(f)) c.split("\n").forEach((l, i) => { const m = l.match(phone); if (m) phones.push(f + ":" + (i + 1) + " " + m[0]); }); });
  t.check(!phones.length, "no phone or fax numbers anywhere in the app files", phones.slice(0, 5));

  const mails = new Set(); text.forEach(([f, c]) => { if (/\.(js|html|gs)$/.test(f)) (c.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).forEach(m => mails.add(m.toLowerCase())); });
  const okMail = m => /^(shreya\.k@purview-healthcare\.com|sweety\.t@purviewservices\.com|name@purview-healthcare\.com)$/.test(m) || /@example\.(com|org)$/.test(m);
  t.check([...mails].every(okMail), "only the two feedback recipients and generic examples appear as email addresses", [...mails].filter(m => !okMail(m)));

  const internal = /(sharepoint|drive\.google|docs\.google|onedrive|1drv\.ms|\.internal\b|intranet|\.corp\b|\.local\b|\\\\[a-z0-9_-]+\\[a-z$]|\bsmb:\/\/|file:\/\/\/|localhost:\d{2,5}|192\.168\.|10\.\d+\.\d+\.\d+|\.slack\.com|teams\.microsoft\.com|atlassian\.net|notion\.so)/i;
  const hitsI = []; text.forEach(([f, c]) => { if (/\.(js|html|gs|webmanifest)$/.test(f)) c.split("\n").forEach((l, i) => { const m = l.match(internal); if (m) hitsI.push(f + ":" + (i + 1) + " " + m[0]); }); });
  t.check(!hitsI.length, "no SharePoint, Drive, OneDrive, internal host or network-share links", hitsI.slice(0, 5));

  const plain = []; text.forEach(([f, c]) => { if (/\.(js|html|gs)$/.test(f)) (c.match(/\bhttp:\/\/[^\s"'<>)]+/g) || []).forEach(u => { if (!/^http:\/\/www\.w3\.org\//.test(u)) plain.push(f + " " + u); }); });
  t.check(!plain.length, "no plain http:// links (every outside link is https)", plain.slice(0, 5));

  /* patient-like data: identifiers must be obviously made up */
  const ein = [], npi = []; text.forEach(([f, c]) => { if (/\.(js|html)$/.test(f)) { (c.match(/\b\d{2}-\d{7}\b/g) || []).forEach(x => ein.push(f + " " + x)); (c.match(/NPI[:\s#]*\d{10}\b/gi) || []).forEach(x => npi.push(f + " " + x)); } });
  const fakeTax = x => /(12-3456789|98-7654321|00-0000000|11-1111111|99-9999999)$/.test(x);
  t.check(ein.every(fakeTax), "every tax ID (EIN pattern) in the content is a visibly made-up one", ein.filter(x => !fakeTax(x)));
  const luhnNpi = n => { const s = "80840" + n; let sum = 0; for (let i = s.length - 1, d = 0; i >= 0; i--, d++) { let v = +s[i]; if (d % 2 === 1) { v *= 2; if (v > 9) v -= 9; } sum += v; } return sum % 10 === 0; };
  const realNpi = npi.filter(x => luhnNpi(x.match(/\d{10}/)[0]));
  t.check(realNpi.length === 0, "no NPI in the content passes the real NPI check digit (so none can be a real provider)", realNpi);
  const ssn = []; text.forEach(([f, c]) => { if (/\.(js|html)$/.test(f)) (c.match(/\b\d{3}-\d{2}-\d{4}\b/g) || []).forEach(x => ssn.push(f + " " + x)); });
  t.check(ssn.every(x => /123-45-6789/.test(x)), "the only Social Security style number is the textbook placeholder 123-45-6789", ssn);
  const addr = []; text.forEach(([f, c]) => { if (/\.(js|html)$/.test(f)) (c.match(/\b\d{2,5}\s+(?:[NSEW]\.?\s+)?[A-Z][a-z]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.|Lane|Ln\.?|Suite|Ste\.?)\b/g) || []).forEach(x => addr.push(f + " " + x)); });
  t.check(!addr.length, "no street addresses in the app files", addr.slice(0, 5));
  const npiSeq = npi.map(x => x.match(/\d{10}/)[0]).filter(n => !/^(1234567890|1987654321|1098765432|1456789012)$/.test(n));
  t.check(!npiSeq.length, "every NPI shown in the role-play calls is one of the four known placeholder numbers", npiSeq);

  /* ---------- 2. external links ---------- */
  const unsafeTarget = []; text.forEach(([f, c]) => { if (/\.(js|html)$/.test(f)) (c.match(/<a\b[^>]*target=["']_blank["'][^>]*>/g) || []).forEach(a => { if (!/rel=["'][^"']*noopener/.test(a)) unsafeTarget.push(f + " " + a.slice(0, 80)); }); });
  t.check(!unsafeTarget.length, "every link that opens a new tab carries rel=noopener", unsafeTarget.slice(0, 3));
  const winOpen = []; text.forEach(([f, c]) => { if (/\.(js|html)$/.test(f)) c.split("\n").forEach((l, i) => { if (/window\.open\(/.test(l) && !/noopener/.test(l)) winOpen.push(f + ":" + (i + 1)); }); });
  t.check(!winOpen.length, "no window.open call without noopener", winOpen);

  /* ---------- 3. injection in the page ---------- */
  const A = await openApp({ script: () => ({ ok: false, error: "x" }) });
  const { page } = A;
  await page.fill("#q", PAY); await page.press("#q", "Enter"); await page.waitForTimeout(300);
  let r = await injected(page);
  t.check(clean(r), "Ask: an HTML payload typed in the search box is shown as text, never run", r);
  t.check((await page.textContent("#answers")).includes("<img src=x"), "Ask: the typed payload is echoed back literally as text");

  await tab(page, "basicsPanel");
  await page.fill("#bq", PAY); await page.waitForTimeout(250);
  r = await injected(page);
  t.check(clean(r), "RCM Basics search box: payload typed live is not run", r);
  await page.press("#bq", "Enter"); await page.waitForTimeout(250);
  r = await injected(page);
  t.check(clean(r), "RCM Basics search box: payload with Enter is not run", r);

  const hlOut = await page.evaluate(() => ({ a: hl("Medicare & Medicaid", ["amp"]), b: hl('say "hello" now', ["quot"]), c: hl("A < B", ["lt;"]) }));
  t.check(!/&<mark>/.test(hlOut.a) && !/&<mark>/.test(hlOut.b), "search highlighting never cuts through an escaped character such as &amp; or &quot;", hlOut);

  const escOut = await page.evaluate(() => esc("a'b\"c<d>&"));
  t.check(!escOut.includes("<") && !escOut.includes(">") && !escOut.includes('"'), "the escape helper handles < > & and double quotes", escOut);

  /* feedback form: nothing typed becomes markup; mailto body keeps extra headers out */
  const fbOk = await page.evaluate(p => {
    $("#fbName").value = p; $("#fbMsg").value = "hello&cc=evil@example.com\r\nBcc: evil@example.com " + p; $("#fbEmail").value = "a@b.com";
    const u = fbMailto(); const q = u.split("?")[1] || "";
    return { keys: q.split("&").map(x => x.split("=")[0]), raw: u.slice(0, 40), hasCrlf: /\r|\n/.test(u) };
  }, PAY);
  t.check(fbOk.keys.join(",") === "subject,body" && !fbOk.hasCrlf, "feedback mail link: user text cannot add extra headers (cc, bcc) to the mail", fbOk);
  r = await injected(page);
  t.check(clean(r), "feedback name and message: payload is not run", r);

  /* values read back from localStorage */
  await A.browser.close();
  const L = await openApp({
    script: () => ({ ok: false, error: "x" }),
    init: "localStorage.setItem('gk_name'," + JSON.stringify(PAY) + ");" +
      "localStorage.setItem('gk_cert_access',JSON.stringify({email:" + JSON.stringify(PAY) + ",until:Date.now()+3e6,token:'t'}));" +
      "localStorage.setItem('gk_cert',JSON.stringify({v:2,name:" + JSON.stringify(PAY) + ",train:{rcm:{name:" + JSON.stringify(PAY) + ",date:" + JSON.stringify(PAY) + ",score:" + JSON.stringify(PAY) + ",n:20,pct:90,id:" + JSON.stringify(PAY) + "}},last:{},qa:{abw:{reviewer:" + JSON.stringify(PAY) + ",rows:[{ref:" + JSON.stringify(PAY) + ",date:" + JSON.stringify(PAY) + ",score:99}]}}}));" +
      "localStorage.setItem('gk_basics_read',JSON.stringify([" + JSON.stringify(PAY) + "]));localStorage.setItem('gk_sop_read',JSON.stringify([" + JSON.stringify(PAY) + "]));localStorage.setItem('gk_spec_read',JSON.stringify([" + JSON.stringify(PAY) + "]));"
  });
  for (const p of ["askPanel", "basicsPanel", "browsePanel", "sopPanel", "specPanel", "quizPanel", "certPanel", "dashPanel"]) await tab(L.page, p);
  r = await injected(L.page);
  t.check(clean(r), "payloads stored in the saved name, access, certificate and progress keys are not run on any tab", r);
  await tab(L.page, "certPanel");
  for (const k of ["rcm", "qa"]) { await L.page.click('#certTiles .certtile[data-t="' + k + '"]'); await L.page.waitForTimeout(100); }
  r = await injected(L.page);
  t.check(clean(r), "payloads in a stored certificate and QA rows are not run when the certificate tabs show them", r);
  await L.page.click('#certTiles .certtile[data-t="rcm"]');
  await L.page.click('.certpane:not([hidden]) .cprint'); await L.page.waitForTimeout(200);
  r = await injected(L.page);
  t.check(clean(r), "printing a stored certificate with payload text in its fields does not run it", r);
  await L.page.click('#certTiles .certtile[data-t="qa"]');
  const qaBtn = await L.page.$('.certpane:not([hidden]) .qalogprint'); if (qaBtn) { await qaBtn.click(); await L.page.waitForTimeout(150); }
  r = await injected(L.page);
  t.check(clean(r), "printing the QA record with payload text does not run it", r);
  const who = await L.page.evaluate(() => ({ cert: $("#certAccessWho").textContent, dash: $("#dashWho") && $("#dashWho").textContent }));
  t.check(who.cert === PAY, "the signed-in email is shown as plain text even when it contains markup", who);
  await L.page.evaluate(() => { document.querySelectorAll('#printSheet img').forEach(i => i.remove()); });
  const pctPay = await L.page.evaluate(() => { window.__x = undefined; localStorage.setItem("gk_cert", JSON.stringify({ v: 2, name: "A", train: { rcm: { name: "A", date: "1 Jan 2026", score: 18, n: 20, pct: "<img src=x onerror=window.__x=1>", id: "GK-R-1" } }, last: {}, qa: {} })); certRefresh(); certPrint(CERT_BY.rcm, document.querySelector('.certpane[data-k="rcm"]')); const pr = document.querySelector("#printSheet"); return pr.querySelectorAll('img[src="x"]').length + (window.__x ? 1 : 0); });
  t.check(pctPay === 0, "a tampered score field in the stored certificate is not run when printed (numbers are escaped too)", "injected: " + pctPay);
  await L.browser.close();

  /* QA fields typed by the user */
  const Q = await openApp({ script: () => ({ ok: false }), init: initAccess });
  await tab(Q.page, "certPanel");
  await Q.page.click('#certTiles .certtile[data-t="qa"]');
  await Q.page.fill('.certpane:not([hidden]) .qaref', PAY); await Q.page.fill('.certpane:not([hidden]) .qascore', "97");
  await Q.page.fill('.certpane:not([hidden]) .qarev', PAY);
  await Q.page.click('.certpane:not([hidden]) .qaadd'); await Q.page.waitForTimeout(150);
  await Q.page.click('.certpane:not([hidden]) .qalogprint'); await Q.page.waitForTimeout(150);
  r = await injected(Q.page);
  t.check(clean(r), "QA claim reference and reviewer name typed in as markup are shown as text, on screen and in the printout", r);
  const qaTxt = await Q.page.textContent(".certpane:not([hidden]) .qatable tbody");
  t.check(qaTxt.includes("<img src=x"), "the QA row shows the typed text literally");
  await Q.page.fill("#certName", PAY); await Q.page.dispatchEvent("#certName", "change"); await Q.page.waitForTimeout(100);
  r = await injected(Q.page);
  t.check(clean(r), "certificate name typed as markup is not run on screen", r);
  await Q.browser.close();

  /* the script's Dashboard reply: every field is attacker-controlled text as far as the page is concerned */
  const reply = {
    ok: true,
    projects: { abw: { status: "yes", reason: PAY, manager: PAY, tl: PAY, scope: [PAY, "ok"], by: PAY, at: new Date().toISOString() }, hagion: { status: "no", reason: PAY, manager: "M", tl: "T", scope: [PAY], by: "B", at: PAY } },
    counts: { rcm: { n: 3, people: 2 }, "proc:abw": { n: PAY, people: PAY }, ["qa:" + PAY]: { n: 1, people: 1 } },
    recent: [{ name: PAY, k: "rcm", pct: PAY, t: PAY }, { name: PAY, k: "proc:" + PAY, pct: 90, t: new Date().toISOString() }]
  };
  const D = await openApp({ script: b => (b.action === "dash-get" ? reply : { ok: true }), init: initAccess });
  await tab(D.page, "dashPanel"); await D.page.waitForTimeout(500);
  r = await injected(D.page);
  t.check(clean(r), "Dashboard: markup in manager, team lead, reason, scope, updated-by, counts and recent names is shown as text, never run", r);
  const shown = await D.page.evaluate(() => document.querySelector("#dashProjects").textContent.includes("<img src=x"));
  t.check(shown, "Dashboard: the text from the script is still displayed (escaped, not dropped)");
  await D.page.click(".dedit-btn >> nth=0"); await D.page.waitForTimeout(150);
  r = await injected(D.page);
  t.check(clean(r), "Dashboard edit form: markup in the saved values is not run when the form opens", r);
  const form = await D.page.evaluate(() => ({ m: document.querySelector("[name=dmanager]").value, ok: !!document.querySelector("#dashEdit form") }));
  t.check(form.m === PAY, "Dashboard edit form: the saved value comes back unchanged in the input", form);
  await D.browser.close();

  /* an odd status string from the reply goes into class and data attributes */
  const badStatus = 'yes" onmouseover="window.__x=1" data-z="';
  const S = await openApp({ script: b => (b.action === "dash-get" ? { ok: true, projects: { abw: { status: badStatus, reason: "r" } }, counts: {}, recent: [] } : { ok: true }), init: initAccess });
  await tab(S.page, "dashPanel"); await S.page.waitForTimeout(400);
  const attr = await S.page.evaluate(() => { const c = document.querySelector('#dashProjects .dcard[data-id="abw"]'); return c ? { onm: c.hasAttribute("onmouseover"), spans: [...document.querySelectorAll("#dashProjects [onmouseover]")].length } : { missing: true }; });
  t.check(!attr.onm && !attr.spans, "Dashboard: an unexpected status value from the script cannot add attributes (such as onmouseover) to a card", attr);
  await S.browser.close();

  /* ---------- 4. links in the rendered app ---------- */
  const V = await openApp({ script: () => ({ ok: false }) });
  await V.page.evaluate(() => { document.querySelectorAll("details").forEach(d => d.open = true); });
  for (const p of ["basicsPanel", "sopPanel", "specPanel", "browsePanel"]) { await tab(V.page, p); await V.page.waitForTimeout(500); }
  const links = await V.page.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => ({ h: a.getAttribute("href"), t: a.target, r: a.rel })));
  const ext = links.filter(l => /^[a-z]+:/i.test(l.h) && !/^(mailto:|tel:)/i.test(l.h));
  t.check(ext.length > 0 && ext.every(l => /^https:\/\//i.test(l.h)), "every outside link on the page is https (" + ext.length + " checked)", ext.filter(l => !/^https:\/\//i.test(l.h)).slice(0, 3));
  t.check(links.filter(l => l.t === "_blank").every(l => /noopener/.test(l.r)), "every link that opens a new tab has rel=noopener on the live page", links.filter(l => l.t === "_blank" && !/noopener/.test(l.r)).slice(0, 3));
  t.check(!links.some(l => /^\s*(javascript|data|vbscript):/i.test(l.h)), "no javascript:, data: or vbscript: links on the page");
  const srcUrls = await V.page.evaluate(() => { const out = []; (typeof SOURCES !== "undefined" ? [SOURCES] : []).forEach(s => out.push(JSON.stringify(s))); return out.join("").match(/https?:\/\/[^"\\]+/g) || []; });
  t.check(srcUrls.every(u => u.startsWith("https://")), "every official-source link in the data is https (" + srcUrls.length + " checked)", srcUrls.filter(u => !u.startsWith("https://")).slice(0, 3));
  t.check(!V.errors.length, "no page errors while checking links", V.errors.slice(0, 3));
  await V.browser.close();

  t.done();
})().catch(e => { console.log("  FAIL  security test crashed  ->  " + e.stack); process.exitCode = 1; });
