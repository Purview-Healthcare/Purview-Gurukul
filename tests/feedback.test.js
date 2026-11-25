/* Feedback in Chromium against the real Apps Script code (mocked Google services): open the form,
   empty and long messages, screenshots (PNG ok, other files refused, more than 3), send, double
   click, script down and the mail-app fallback. Pictures are made here from plain colours. */
"use strict";
const zlib = require("zlib");
const { suite } = require("./helpers");
const C = require("./cert-common");
const t = suite("Feedback");

function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function makePng(w, h) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 200)]); const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const shot = (name, w, h) => ({ name, mimeType: "image/png", buffer: makePng(w || 60, h || 40) });

(async () => {
  let down = false, busy = false;
  const a = await C.openCert({ signedIn: false, over: async b => { if (b.action || !b.message) return undefined; if (down) return "abort"; if (busy) return { ok: false, error: "busy" }; return undefined; } });
  const p = a.page;
  const calls = () => a.calls.filter(c => !c.action);
  const toast = () => p.textContent("#toast");
  t.check(await p.isVisible("#fbOpen"), "open: the Feedback button is on the page");
  await p.evaluate(() => showPanel("certPanel")); await p.click("#fbOpen");
  t.check(await p.isVisible("#fbForm") && /Certification — locked/.test(await p.inputValue("#fbCtx")), "open: the form opens and says where the person was (Certification, locked)", await p.inputValue("#fbCtx"));
  t.check(await p.isVisible("#fbSend") && !(await p.isVisible("#fbMail")) && await p.isVisible("#fbShots"), "open: with the script set, Send feedback and screenshots are offered and Open in email is not");
  t.check(/shreya\.k@purview-healthcare\.com, sweety\.t@purviewservices\.com/.test(await p.textContent("#fbTo")), "open: shows who it goes to");
  await p.click("#fbSend");
  t.check(/Write a line/.test(await toast()) && calls().length === 0, "empty: an empty message is not sent");
  await p.fill("#fbMsg", "  ab  "); await p.click("#fbSend");
  t.check(calls().length === 0, "empty: a 2 letter message is not sent");
  await p.fill("#fbMsg", "A real message"); await p.fill("#fbEmail", "not an email"); await p.click("#fbSend");
  t.check(/Check the email address/.test(await toast()) && calls().length === 0, "email: a bad reply email is refused on the page");
  await p.fill("#fbEmail", "a@b.com, c@d.com"); await p.click("#fbSend");
  t.check(calls().length === 0, "email: two addresses in the email box are refused");
  await p.fill("#fbEmail", "");

  /* screenshots */
  await p.setInputFiles("#fbFile", [shot("one.png")]); await p.waitForTimeout(300);
  t.check(await p.$$eval("#fbThumbs .fbthumb", e => e.length) === 1 && await p.isVisible("#fbPhiRow"), "screenshots: a PNG is added and the no-patient-details box appears");
  await p.click("#fbSend");
  t.check(/Tick the box/.test(await toast()) && calls().length === 0, "screenshots: sending is blocked until the no-patient-details box is ticked");
  await p.setInputFiles("#fbFile", [{ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") }]); await p.waitForTimeout(200);
  t.check(/Only images/.test(await toast()) && await p.$$eval("#fbThumbs .fbthumb", e => e.length) === 1, "screenshots: a text file is refused");
  await p.setInputFiles("#fbFile", [{ name: "doc.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") }]); await p.waitForTimeout(200);
  t.check(/Only images/.test(await toast()), "screenshots: a PDF is refused");
  await p.setInputFiles("#fbFile", [{ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("this is not a picture") }]); await p.waitForTimeout(300);
  t.check(/could not be read/.test(await toast()) && await p.$$eval("#fbThumbs .fbthumb", e => e.length) === 1, "screenshots: a text file renamed .png is refused as unreadable");
  await p.setInputFiles("#fbFile", [{ name: "pic.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>1</script></svg>') }]); await p.waitForTimeout(300);
  t.check(await p.evaluate(() => FB_FILES.every(f => /^image\/(png|jpeg)$/.test(f.type) && f.data.indexOf("<svg") < 0)), "screenshots: an SVG is refused or redrawn as a plain PNG/JPG, never sent as SVG");
  await p.evaluate(() => { FB_FILES = FB_FILES.filter(f => f.type === "image/png" && /one/.test(f.name)); fbDrawThumbs(); });
  await p.setInputFiles("#fbFile", [shot("two.png"), shot("three.png", 3000, 1500), shot("four.png")]); await p.waitForTimeout(900);
  t.check(await p.$$eval("#fbThumbs .fbthumb", e => e.length) === 3 && /Up to 3/.test(await toast()), "screenshots: the 4th is refused with a message (3 kept)", await toast());
  const sizes = await p.$$eval("#fbThumbs .fbthumb span", e => e.map(x => x.textContent));
  t.check(/2000×1000/.test(sizes[2]), "screenshots: a 3000 by 1500 picture is shrunk to 2000 by 1000", sizes);
  await p.click('#fbThumbs button[data-i="0"]');
  t.check(await p.$$eval("#fbThumbs .fbthumb", e => e.length) === 2, "screenshots: the x removes one");
  await p.setInputFiles("#fbFile", [shot("again.png")]); await p.waitForTimeout(300);
  await p.check("#fbPhi");

  /* script down, then back */
  down = true; await p.fill("#fbName", "Asha <i>Rao</i>"); await p.fill("#fbEmail", "asha@example.com");
  await p.click("#fbSend"); await p.waitForTimeout(400);
  t.check(/Not sent/.test(await p.textContent("#fbErr")) && await p.isVisible("#fbMail") && await p.isVisible("#fbCopy"), "script down: says Not sent and offers Open in email and Copy instead");
  t.check(await p.inputValue("#fbMsg") === "A real message" && await p.$$eval("#fbThumbs .fbthumb", e => e.length) === 3, "script down: the message and the screenshots are kept");
  const mailto = await p.evaluate(() => fbMailto());
  t.check(/^mailto:shreya\.k@purview-healthcare\.com,sweety\.t@purviewservices\.com\?subject=/.test(mailto) && /A%20real%20message/.test(mailto) && /asha%40example\.com|asha@example\.com/.test(decodeURIComponent(mailto)), "script down: the mail-app fallback has both recipients, the message and the sender");
  t.check(await p.isEnabled("#fbSend") && /Send feedback/.test(await p.textContent("#fbSend")), "script down: Send feedback is usable again");
  busy = true; down = false; await p.click("#fbSend"); await p.waitForTimeout(400);
  t.check(/Too many messages/.test(await p.textContent("#fbErr")), "script busy: says too many messages, try shortly");
  busy = false;
  await p.dblclick("#fbSend"); await p.waitForTimeout(900);
  t.check(calls().length === 3 && a.g.sent.length === 1, "send: a double click sends only one message (3 calls in all: down, busy, then one good send)", calls().length + " calls, " + a.g.sent.length + " mails");
  const last = calls()[calls().length - 1];
  t.check(last.message === "A real message" && last.website === "" && last.name === "Asha <i>Rao</i>" && last.email === "asha@example.com" && last.type === "Content correction", "send: the payload has message, name, email, type, and an empty trap field");
  t.check(last.attachments.length === 3 && last.attachments.every(f => Buffer.from(f.data, "base64").slice(0, 4).toString("hex") === "89504e47" && f.data.indexOf("data:") < 0), "send: three attachments, each a real PNG, with no data: prefix");
  const mail = a.g.sent[a.g.sent.length - 1];
  t.check(a.g.sent.length === 1 && mail.to === a.g.exp.FEEDBACK_TO.join(",") && mail.replyTo === "asha@example.com" && mail.attachments.length === 3, "send: one mail to the two maintainers only, reply-to the sender, 3 screenshots", mail && { to: mail.to, r: mail.replyTo });
  t.check(mail.attachments.every(x => /^[\w .-]+\.png$/.test(x.name)), "send: attachment names are clean", mail.attachments.map(x => x.name));
  t.check(await p.isVisible("#fbDone") && /went by email to .* and .*, with 3 screenshots/.test(await p.textContent("#fbDoneTo")), "send: the page confirms with the recipients and 3 screenshots", await p.textContent("#fbDoneTo"));
  t.check(await p.inputValue("#fbMsg") === "" && await p.$$eval("#fbThumbs .fbthumb", e => e.length) === 0, "send: the message and screenshots are cleared after sending");
  t.check(await p.evaluate(() => localStorage.getItem("gk_name")) === "Asha <i>Rao</i>", "send: the name is remembered for next time");
  await p.click("#fbAgain");
  t.check(await p.isVisible("#fbForm"), "send: Send another message opens the form again");
  /* long message */
  await p.fill("#fbMsg", "long ".repeat(1200)); await p.click("#fbSend"); await p.waitForTimeout(500);
  const sent2 = a.g.sent[a.g.sent.length - 1];
  t.check(a.g.sent.length === 2 && sent2.body.indexOf("long ".repeat(1200).trim()) < 0, "long: a 6000 character message is cut to 4000 by the script");
  t.check(/4000|too long|limit/i.test(await p.textContent("#fbForm") + await p.textContent("#fbDone")), "long: the person is told that only the first 4000 characters were sent", "no warning on the page; the end of the message is dropped silently");
  /* html in message */
  await p.click("#fbAgain"); await p.fill("#fbMsg", "<script>alert(1)</script> & <b>bold</b>"); await p.click("#fbSend"); await p.waitForTimeout(400);
  const s3 = a.g.sent[a.g.sent.length - 1];
  t.check(s3.body.indexOf("<script>alert(1)</script> & <b>bold</b>") > 0 && !s3.htmlBody, "html: a message with tags goes as plain text only (no HTML mail body)");
  t.check(!(await p.evaluate(() => window.__xss)), "html: nothing runs on the page");
  /* escape and outside click */
  await p.keyboard.press("Escape");
  t.check(!(await p.isVisible("#fbWrap")), "close: Escape closes the form");
  await p.click("#fbOpen"); await p.mouse.click(5, 5);
  t.check(!(await p.isVisible("#fbWrap")), "close: a click outside the form closes it");
  await p.click("#fbOpen");
  t.check(await p.isVisible("#fbForm") && await p.inputValue("#fbMsg") === "" , "close: reopening starts with an empty message");
  t.check(!a.errors.length, "feedback: no page errors", a.errors);
  await a.browser.close();

  /* the script itself refuses a flood even if the page is skipped */
  const b = await C.openCert({ signedIn: false });
  for (let i = 0; i < 21; i++) b.g.post({ message: "flood message " + i });
  await b.page.click("#fbOpen"); await b.page.fill("#fbMsg", "one more please"); await b.page.click("#fbSend"); await b.page.waitForTimeout(400);
  t.check(/Too many messages/.test(await b.page.textContent("#fbErr")), "flood: after 20 messages in 10 minutes the page says too many messages, and offers the mail app");
  await b.browser.close();
  t.done();
})().catch(e => { console.log("  FAIL  feedback test crashed  ->  " + e.stack); process.exitCode = 1; });
