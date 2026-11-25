/* Apps Script tests: tools/gurukul-email.gs is loaded into a Node vm with mocked Google services
   (see gas-harness.js). Mail is only recorded, never sent. Made-up email IDs on example.com. */
"use strict";
const { suite } = require("./helpers");
const { load, png, jpg } = require("./gas-harness");
const t = suite("Apps Script (feedback, OTP, tokens, dashboard)");
const A = "asha@example.com", B = "bala@example.com", OUT = "mallory@example.com";
const fresh = o => { const g = load(o); g.setList(A + ", " + B.toUpperCase()); return g; };
const fb = (g, o) => g.post(Object.assign({ message: "The denial list has a typo in CO 45." }, o));
const sec = n => n * 1000;

/* ── doGet and basic routing ── */
{
  const g = fresh();
  const r = g.get();
  t.check(r.ok === true && r.service === "gurukul" && r.approved === 2, "opening the script URL answers ok and the number of approved people", r);
  t.check(g.post("not json").ok === false && g.post("not json").error === "bad request", "a body that is not JSON is refused");
  t.check(g.post("null").ok === false, "a body of null is refused");
  t.check(g.post("[]").ok === false, "an empty list body gives no email and no crash");
  t.check(g.sent.length === 0, "none of those bad calls sent mail");
  t.check(g.post({ action: "nothing-like-this", message: "hello there" }).ok === true, "an unknown action is treated as feedback (documented fall-through)");
}

/* ── feedback ── */
{
  const g = fresh();
  t.check(fb(g, { message: "" }).error === "empty", "feedback: empty message is refused");
  t.check(fb(g, { message: "  ab " }).error === "empty", "feedback: a 2 character message is refused");
  t.check(g.sent.length === 0, "feedback: refused messages send no mail");
  t.check(fb(g, { website: "http://spam.example.com" }).ok === true && g.sent.length === 0, "feedback: the hidden trap field says ok but sends nothing");
  const r = fb(g, { message: "x".repeat(9000), type: "Bug", where: "Ask", name: "Asha" });
  t.check(r.ok && g.sent[0].body.indexOf("x".repeat(4000)) > 0 && g.sent[0].body.indexOf("x".repeat(4001)) < 0, "feedback: a very long message is cut to 4000 characters");
  t.check(g.sent[0].to === g.exp.FEEDBACK_TO.join(",") && g.sent[0].to.split(",").length === 2, "feedback: goes only to the two fixed maintainers", g.sent[0].to);
  t.check(!("replyTo" in g.sent[0]), "feedback: no reply-to when no email was given");
  fb(g, { email: "not-an-email" });
  t.check(!("replyTo" in g.sent[1]), "feedback: no reply-to when the email is not valid");
  fb(g, { email: "rita@example.com", name: "Rita" });
  t.check(g.sent[2].replyTo === "rita@example.com" && g.sent[2].to.indexOf("rita") < 0, "feedback: a valid email becomes reply-to only, never a recipient");
  fb(g, { email: "a@b.com, evil@x.com" });
  t.check(!("replyTo" in g.sent[3]) && g.sent[3].to.indexOf("evil") < 0, "feedback: two addresses in the email box are refused as reply-to");
  fb(g, { type: "Bug\r\nBcc: evil@x.com", where: "Ask\nBcc: evil@x.com", name: "N\r\nBcc: evil@x.com" });
  t.check(!/\nBcc:/i.test(g.sent[4].subject) && g.sent[4].to.indexOf("evil") < 0 && !/\n\s*Bcc:/.test(g.sent[4].body.split("\n\n")[0]), "feedback: line breaks in type, where and name cannot inject a header line");
  fb(g, { message: "line one\r\nline two\u0000\u0007" });
  t.check(/line one\nline two\n/.test(g.sent[5].body) && g.sent[5].body.indexOf("\u0000") < 0, "feedback: message keeps line breaks and drops control characters");
  fb(g, { message: { a: 1 } });
  t.check(g.sent.length === 7, "feedback: an object as message is turned into text, not a crash (known odd: sends [object Object])", g.sent.length);
}
{
  const g = fresh();
  let busy = null;
  for (let i = 0; i < 21; i++) { const r = fb(g); if (!r.ok) { busy = i; break; } }
  t.check(busy === 20 && g.sent.length === 20, "feedback: burst limit stops the 21st message in 10 minutes", { busy, sent: g.sent.length });
  g.clock.now += sec(601);
  t.check(fb(g).ok === true, "feedback: sending works again after the 10 minute window");
  const h = fresh();
  for (let i = 0; i < 20; i++) { fb(h); h.clock.now += sec(60); }
  t.check(fb(h).ok === true, "feedback: 20 messages spread over 20 minutes are not blocked (each stays within the limit per 10 minutes)", "blocked although only ~10 in any 10 minutes");
}
{
  const g = fresh();
  const files = [{ name: "shot.png", data: png() }, { name: "photo.jpg", data: jpg() }, { name: "third.png", data: png(100) }, { name: "fourth.png", data: png() }];
  const r = fb(g, { attachments: files });
  const a = g.sent[0].attachments;
  t.check(r.ok && a.length === 3, "attachments: at most 3 go through even if 4 are sent", a && a.length);
  t.check(a[0].type === "image/png" && a[1].type === "image/jpeg", "attachments: type is decided from the file's first bytes");
  const g2 = fresh();
  fb(g2, { attachments: [{ name: "evil.png", data: Buffer.from("MZ this is a program").toString("base64") }, { name: "page.png", data: Buffer.from("<html><script>1</script>").toString("base64") }, { name: "x.gif", data: Buffer.from("GIF89a1234567890").toString("base64") }] });
  t.check(!g2.sent[0].attachments, "attachments: a program, a web page and a GIF named .png are all dropped", g2.sent[0].attachments);
  fb(g2, { attachments: [{ name: "x.png", data: "###not base64###" }, { name: "y.png" }, null, { name: "z.png", data: "" }, "str"] });
  t.check(!g2.sent[1].attachments && g2.sent[1].body.indexOf("Screenshots") < 0, "attachments: bad base64, missing data, empty data and junk entries are skipped");
  fb(g2, { attachments: "not a list" });
  t.check(g2.sent.length === 3 && !g2.sent[2].attachments, "attachments: a value that is not a list is ignored");
  fb(g2, { attachments: [{ name: "a.png", data: "data:image/png;base64," + png() }] });
  t.check(g2.sent[3].attachments && g2.sent[3].attachments.length === 1, "attachments: a data: URL prefix is accepted");
  const big = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]), Buffer.alloc(4 * 1024 * 1024 + 1)]).toString("base64");
  fb(g2, { attachments: [{ name: "big.png", data: big }] });
  t.check(!g2.sent[4].attachments, "attachments: a file over 4 MB is dropped");
  const ok35 = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3.5 * 1024 * 1024)]).toString("base64");
  fb(g2, { attachments: [{ name: "a.jpg", data: ok35 }, { name: "b.jpg", data: ok35 }, { name: "c.jpg", data: ok35 }] });
  t.check(g2.sent[5].attachments.length === 2, "attachments: three files of 3.5 MB: the total cap of 8 MB drops the third", g2.sent[5].attachments && g2.sent[5].attachments.length);
  fb(g2, { attachments: [{ name: "../../etc/passwd.png", data: png() }, { name: "<b>x</b>.jpg", data: jpg() }, { name: "स्क्रीन.png", data: png() }] });
  const nm = g2.sent[6].attachments.map(x => x.name);
  t.check(nm.every(n => !/[\/\\<>]/.test(n) && /\.(png|jpg)$/.test(n)), "attachments: file names lose slashes and tags and end in .png or .jpg", nm);
  t.check(nm[2] === "screenshot-3.png", "attachments: a name with no usable letters becomes screenshot-N", nm[2]);
  fb(g2, { attachments: [{ name: "report.exe", data: png() }, { name: "a".repeat(200) + ".png", data: png() }] });
  const n2 = g2.sent[7].attachments.map(x => x.name);
  t.check(n2[0] === "report.png" && n2[1].length <= 64, "attachments: a wrong extension is replaced by the real type and long names are cut", n2);
  t.check(fb(fresh(), { attachments: [{ name: "tiny.png", data: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64") }] }).ok === true, "attachments: a 4 byte file starting like a PNG does not crash the script");
}
{
  const g = load({ mailFails: true }); g.setList(A);
  t.check(fb(g).ok === false && fb(g).error === "send failed", "feedback: if the mail service fails the page gets a clean error, not a crash");
}

/* ── otp-send ── */
{
  const g = fresh();
  t.check(g.post({ action: "otp-send", email: "nope" }).error === "bad-email", "otp-send: a bad email ID is refused");
  t.check(g.post({ action: "otp-send", email: "" }).error === "bad-email", "otp-send: an empty email ID is refused");
  t.check(g.post({ action: "otp-send", email: OUT }).error === "not-allowed" && !g.sent.length, "otp-send: an email ID not on the list gets no mail");
  const e = load(); 
  t.check(e.post({ action: "otp-send", email: A }).error === "no-list", "otp-send: with an empty approved list the answer is no-list");
  e.setList("  ,;  not-an-email ");
  t.check(e.post({ action: "otp-send", email: A }).error === "no-list", "otp-send: a list holding only junk counts as empty");
  const r = g.post({ action: "otp-send", email: "  " + A.toUpperCase() + " " });
  t.check(r.ok && r.minutes === 10 && g.sent.length === 1, "otp-send: capital letters and spaces around the email ID are tolerated");
  const m = g.sent[0];
  t.check(m.to === A && !m.cc && !m.bcc, "otp-send: the OTP mail goes only to that one email ID", m.to);
  t.check(/^\d{6}$/.test(g.codeOf()) && m.subject.indexOf(g.codeOf()) > 0, "otp-send: the OTP is 6 digits");
  t.check(JSON.stringify(m).indexOf(B) < 0 && JSON.stringify(m).indexOf("shreya") < 0, "otp-send: the mail never names anybody else");
  const stored = JSON.stringify([...g.cacheMap.entries()].filter(e => /^otp:/.test(e[0])));
  t.check(/^\[\["otp:/.test(stored) && stored.indexOf(g.codeOf()) < 0, "otp-send: the plain code is not kept in the cache, only a fingerprint", stored);
  t.check(g.post({ action: "otp-send", email: A }).error === "wait", "otp-send: a second request inside 60 seconds is told to wait");
  g.clock.now += sec(61);
  t.check(g.post({ action: "otp-send", email: A }).ok === true, "otp-send: after 61 seconds another OTP can be sent");
  for (let i = 0; i < 3; i++) { g.clock.now += sec(61); g.post({ action: "otp-send", email: A }); }
  g.clock.now += sec(61);
  t.check(g.post({ action: "otp-send", email: A }).error === "limit", "otp-send: the 6th OTP within an hour is refused", g.sent.length);
  g.clock.now += sec(3600);
  t.check(g.post({ action: "otp-send", email: A }).ok === true, "otp-send: an hour later the limit is clear");
}
{
  const g = load(); const many = []; for (let i = 0; i < 40; i++) many.push("u" + i + "@example.com"); g.setList(many.join(","));
  let blocked = -1;
  for (let i = 0; i < 40; i++) { const r = g.post({ action: "otp-send", email: many[i] }); if (!r.ok) { blocked = i; t.check(r.error === "busy", "otp-send: the global burst error is busy"); break; } }
  t.check(blocked === 30 && g.sent.length === 30, "otp-send: after 30 OTPs in 10 minutes for everyone, the next is refused", blocked);
  t.check(g.sent.every((m, i) => m.to === many[i]), "otp-send: each of the 30 mails went to its own address only");
  g.clock.now += sec(601);
  t.check(g.post({ action: "otp-send", email: many[35] }).ok === true, "otp-send: the global burst clears after 10 minutes");
  const h = load(); h.setList(many.join(","));
  t.check(h.sent.length === 0 && (() => { const r = h.post({ action: "otp-send", email: many[0] }); return r.ok && h.sent.length === 1; })(), "otp-send: mail quota is counted only for sent mails");
}
{
  const g = load({ mailFails: true }); g.setList(A);
  const r = g.post({ action: "otp-send", email: A });
  t.check(r.ok === false && !g.cacheMap.has("otp:" + A) && !g.cacheMap.has("otpgap:" + A), "otp-send: if the mail cannot be sent, no OTP is stored and no waiting time starts");
}

/* ── otp-verify ── */
{
  const g = fresh();
  g.post({ action: "otp-send", email: A });
  const code = g.codeOf();
  const wrong = code === "000000" ? "111111" : "000000";
  const w1 = g.post({ action: "otp-verify", email: A, code: wrong });
  t.check(w1.error === "wrong" && w1.left === 4, "otp-verify: a wrong code says wrong with 4 tries left", w1);
  t.check(g.post({ action: "otp-verify", email: A, code: wrong }).left === 3, "otp-verify: tries count down");
  t.check(g.post({ action: "otp-verify", email: B, code }).error === "expired" || g.post({ action: "otp-verify", email: B, code }).ok === false, "otp-verify: another person's email ID cannot use this code");
  const spaced = code.slice(0, 3) + " " + code.slice(3);
  const ok = g.post({ action: "otp-verify", email: A.toUpperCase(), code: spaced });
  t.check(ok.ok === true && ok.email === A && ok.hours === 12 && ok.token, "otp-verify: the right code (typed with a space, email in capitals) opens access for 12 hours", Object.assign({}, ok, { token: "..." }));
  t.check(g.post({ action: "otp-verify", email: A, code }).error === "expired", "otp-verify: the same code cannot be used twice");
}
{
  const g = fresh();
  g.post({ action: "otp-send", email: A });
  const code = g.codeOf(), wrong = code === "123456" ? "654321" : "123456";
  let last;
  for (let i = 0; i < 5; i++) last = g.post({ action: "otp-verify", email: A, code: wrong });
  t.check(last.error === "too-many", "otp-verify: the 5th wrong try cancels the OTP", last);
  t.check(g.post({ action: "otp-verify", email: A, code }).error === "expired", "otp-verify: after 5 wrong tries even the right code no longer works");
}
{
  const g = fresh();
  g.post({ action: "otp-send", email: A });
  const code = g.codeOf();
  g.clock.now += sec(599);
  const near = g.post({ action: "otp-verify", email: A, code: "x" });
  t.check(near.error === "wrong", "otp-verify: at 9 minutes 59 seconds the OTP is still alive");
  g.clock.now += sec(2);
  t.check(g.post({ action: "otp-verify", email: A, code }).error === "expired", "otp-verify: after 10 minutes the right code is expired");
  const g2 = fresh(); g2.post({ action: "otp-send", email: A });
  t.check(g2.post({ action: "otp-verify", email: OUT, code: "123456" }).error === "not-allowed", "otp-verify: an email ID off the list is refused");
  t.check(g2.post({ action: "otp-verify", email: A, code: "" }).error === "wrong", "otp-verify: an empty code counts as a wrong try");
  t.check(g2.post({ action: "otp-verify", email: A, code: "12345" }).error === "wrong", "otp-verify: a 5 digit code is wrong");
  const c = g2.codeOf();
  t.check(g2.post({ action: "otp-verify", email: A, code: c + "9" }).ok === true, "otp-verify: extra digits after the 6 are ignored (the code is cut to 6)");
  const g3 = fresh(); g3.post({ action: "otp-send", email: A });
  t.check(g3.post({ action: "otp-verify", email: A, code: Number(g3.codeOf()) }).ok === true || /^0/.test(g3.codeOf()), "otp-verify: a code sent as a number works (unless it starts with 0)");
  const g4 = fresh(); g4.post({ action: "otp-send", email: A }); const c4 = g4.codeOf();
  g4.clock.now += sec(61); g4.post({ action: "otp-send", email: A });
  t.check(g4.post({ action: "otp-verify", email: A, code: c4 }).ok === false || c4 === g4.codeOf(), "otp-verify: asking for a new OTP makes the earlier code stop working");
}

/* ── tokens ── */
{
  const g = fresh();
  const v = g.login(A), tok = v.token;
  t.check(g.exp.tokenEmail_({ token: tok }) === A, "token: a fresh token names its owner");
  t.check(g.post({ action: "dash-get", token: tok }).ok === true, "token: a valid token opens dash-get");
  const [body, sig] = tok.split(".");
  const forged = Buffer.from(B + "|" + (g.clock.now + 1e9)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_") + "." + sig;
  t.check(g.post({ action: "dash-get", token: forged }).error === "no-access", "token: a changed body (another email and a longer time) with the old signature is refused");
  const sigBad = body + "." + sig.slice(0, -2) + (sig.slice(-2) === "AA" ? "BB" : "AA");
  t.check(g.post({ action: "dash-get", token: sigBad }).error === "no-access", "token: a changed signature is refused");
  for (const bad of ["", "abc", ".", "." + sig, body + ".", undefined, null, 123, {}]) if (g.post({ action: "dash-get", token: bad }).ok) t.check(false, "token: junk token accepted: " + JSON.stringify(bad));
  t.check(true, "token: empty, missing, short and wrongly typed tokens are all refused");
  g.clock.now += 12 * 3600 * 1000 + 1000;
  t.check(g.post({ action: "dash-get", token: tok }).error === "no-access", "token: after 12 hours the token is expired");
  const h = fresh(); const tk = h.login(B).token;
  h.setList(A);
  t.check(h.post({ action: "dash-get", token: tk }).error === "no-access", "token: when the email ID is removed from the list the token stops working at once");
  h.setList(A + "," + B);
  t.check(h.post({ action: "dash-get", token: tk }).ok === true, "token: and works again if the email ID is added back");
  const other = load(); other.setList(A);
  t.check(other.post({ action: "dash-get", token: tok }).error === "no-access", "token: a token from a script with another secret is refused");
  t.check(g.exp.tokenEmail_({ token: g.exp.token_("nobody@example.com", g.clock.now + 5e6) }) === "", "token: a correctly signed token for an email ID not on the list is refused");
  t.check(g.exp.tokenEmail_({ token: g.exp.token_(A, g.clock.now - 5) }) === "", "token: a correctly signed token already past its time is refused");
  const secret1 = g.props.get("GK_SECRET");
  t.check(!!secret1 && secret1.length >= 64, "token: the secret is made on first use and kept only in Script Properties");
}

/* ── dashboard actions without access ── */
{
  const g = fresh(); const tok = g.login(A).token;
  for (const act of ["dash-get", "dash-save", "cert-log"]) {
    const base = { action: act, id: "abw", status: "yes", k: "rcm", name: "Asha", pct: 90 };
    t.check(g.post(base).error === "no-access", act + ": refused without a token");
    t.check(g.post(Object.assign({ token: "x.y" }, base)).error === "no-access", act + ": refused with a bad token");
    t.check(g.post(Object.assign({ token: "x.y", email: A }, base)).error === "no-access", act + ": an email field in the body does not replace a token");
  }
  t.check(!g.props.has("DASH_PROJECTS") && !g.props.has("CERTS_rcm"), "refused calls wrote nothing to Script Properties");
}

/* ── dash-save ── */
{
  const g = fresh(); const tok = g.login(A).token;
  const save = o => g.post(Object.assign({ action: "dash-save", token: tok, id: "abw", status: "yes" }, o));
  let r = save({ manager: "M".repeat(200), tl: "T".repeat(200), scope: ["a", "b", "c"] });
  t.check(r.ok && r.row.manager.length === 80 && r.row.tl.length === 80, "dash-save: manager and team lead are cut to 80 characters");
  r = save({ scope: Array.from({ length: 20 }, (_, i) => "item " + i + "x".repeat(100)) });
  t.check(r.row.scope.length === 12 && r.row.scope.every(s => s.length <= 60), "dash-save: scope keeps at most 12 items of 60 characters", r.row.scope.length);
  r = save({ scope: "AR follow-up, EV , ,PCC" });
  t.check(JSON.stringify(r.row.scope) === JSON.stringify(["AR follow-up", "EV", "PCC"]), "dash-save: a comma separated scope is split and cleaned", r.row.scope);
  t.check(save({ id: "Bad Id!" }).error === "bad-id" && save({ id: "" }).error === "bad-id" && save({ id: "a/b" }).error === "bad-id" && save({ id: "../x" }).error === "bad-id", "dash-save: ids with spaces, slashes or nothing are refused");
  t.check(save({ id: "ABW" }).ok && save({ id: "ABW" }).id === "abw", "dash-save: an id in capitals is saved in small letters");
  r = save({ id: "a".repeat(60) });
  t.check(r.error === "bad-id" || r.id.length <= 40, "dash-save: a 60 character id is cut to 40 (and then accepted)");
  t.check(save({ status: "no", reason: "" }).error === "reason-needed", "dash-save: No without a reason is refused");
  t.check(save({ status: "other", reason: "   " }).error === "reason-needed", "dash-save: Other with a blank reason is refused");
  t.check(save({ status: "", reason: "" }).error === "reason-needed", "dash-save: no status and no reason is refused");
  r = save({ status: "no", reason: "SOP under revision, due 15 December" });
  t.check(r.ok && r.row.status === "no" && r.row.reason.indexOf("SOP") === 0, "dash-save: No with a reason is saved");
  r = save({ status: "yes", reason: "this should go" });
  t.check(r.ok && r.row.reason === "", "dash-save: a reason sent with Yes is dropped");
  r = save({ status: "maybe", reason: "who knows" });
  t.check(r.ok === false, "dash-save: a status that is not yes, no or other is refused", r.ok ? "saved with status '" + r.row.status + "'" : r);
  r = save({ status: "no", reason: "r".repeat(2000) });
  t.check(r.row.reason.length === 600, "dash-save: reason is cut to 600 characters");
  r = save({ status: "no", reason: "a\r\nb" });
  t.check(r.row.reason === "a\nb", "dash-save: reason keeps its line break");
  r = save({});
  t.check(r.row.by === A && /^2026-11-25T10:00:00/.test(r.row.at), "dash-save: the row records who saved it and when (from the real email in the token, not the body)", r.row);
  r = save({ by: B, at: "1999-01-01" });
  t.check(r.row.by === A && r.row.at.indexOf("1999") !== 0, "dash-save: a sender cannot set 'by' or 'at' themselves");
  t.check(!!JSON.parse(g.props.get("DASH_PROJECTS")).abw, "dash-save: rows are kept under DASH_PROJECTS");
  const d = g.post({ action: "dash-get", token: tok });
  t.check(d.projects.abw.status === "yes" && d.counts && Array.isArray(d.recent), "dash-get: returns the saved rows, counts and recent list");
  t.check(save({ id: "totally-unknown-project" }).ok === false, "dash-save: an id that is not a real project or track is refused (any id is saved today)", "saved any id");
}
{
  const g = fresh(); const tok = g.login(A).token;
  let failed = null;
  for (let i = 0; i < 30 && !failed; i++) { const r = g.post({ action: "dash-save", token: tok, id: "p" + i, status: "no", reason: "r".repeat(600), manager: "M".repeat(80), tl: "T".repeat(80), scope: Array.from({ length: 12 }, () => "s".repeat(60)) }); if (!r.ok) failed = i; }
  t.check(failed === null || failed >= 7, "dash-save: seven full rows (4 processes and 3 tracks at maximum size) all fit in one Script Property", "the property is full after " + failed + " full rows");
}

/* ── cert-log ── */
{
  const g = fresh(); const tok = g.login(A).token, tokB = g.login(B).token;
  const log = (o, tk) => g.post(Object.assign({ action: "cert-log", token: tk || tok, k: "rcm", name: "Asha Rao", pct: 90 }, o));
  t.check(log({}).ok && JSON.parse(g.props.get("CERTS_rcm")).n === 1, "cert-log: counts a certificate under its key");
  log({}); log({}, tokB);
  const c = JSON.parse(g.props.get("CERTS_rcm"));
  t.check(c.n === 3 && Object.keys(c.people).length === 2, "cert-log: 3 certificates by 2 people count as n=3, people=2", c);
  const all = JSON.stringify([...g.props.entries()].filter(([k]) => k !== "CERT_EMAILS" && k !== "GK_SECRET" && k !== "DASH_PROJECTS"));
  t.check(all.indexOf("example.com") < 0 && all.indexOf("asha@") < 0, "cert-log: no raw email ID is stored in the certificate counts or recent list");
  t.check(Object.keys(c.people).every(k => /^[A-Za-z0-9+/=]{16}$/.test(k)), "cert-log: people are stored as 16 character fingerprints");
  for (const k of ["", "bad", "RCM", "proc:", "proc:ABW", "proc:a b", "qa:abw/x", "x:abw", "final2", "spec:vision;drop"]) if (log({ k }).ok) t.check(false, "cert-log: key accepted: " + JSON.stringify(k));
  t.check(["rcm", "denials", "final", "proc:abw", "qa:abw", "spec:vision", "spec:dental-2"].every(k => log({ k }).ok), "cert-log: the seven good key shapes are accepted");
  t.check(!g.props.has("CERTS_proc:ABW") && !g.props.has("CERTS_x:abw"), "cert-log: bad keys create no property");
  const pcts = [[150, 100], [-20, 0], ["abc", 0], [89.6, 90], [null, 0], [undefined, 0], ["95", 95], [NaN, 0]];
  const got = pcts.map(([p]) => { g.post({ action: "cert-log", token: tok, k: "final", name: "P", pct: p }); return JSON.parse(g.props.get("CERT_RECENT"))[0].pct; });
  t.check(JSON.stringify(got) === JSON.stringify(pcts.map(p => p[1])), "cert-log: pct is rounded and kept between 0 and 100", got);
  t.check(log({ name: "N".repeat(300) }) && JSON.parse(g.props.get("CERT_RECENT"))[0].name.length === 80, "cert-log: name is cut to 80 characters");
  for (let i = 0; i < 80; i++) log({ name: "P" + i });
  const rec = JSON.parse(g.props.get("CERT_RECENT"));
  t.check(rec.length === 60 && rec[0].name === "P79" && rec[59].name === "P20", "cert-log: the recent list keeps the newest 60, newest first", [rec.length, rec[0].name]);
  t.check(JSON.parse(g.props.get("CERTS_rcm")).n >= 80, "cert-log: counts keep growing beyond the 60 shown");
}
{
  const g = fresh(); const tok = g.login(A).token;
  let firstFail = null;
  for (let i = 0; i < 80 && !firstFail; i++) { const r = g.post({ action: "cert-log", token: tok, k: "rcm", name: "Long Name ".repeat(8).slice(0, 80), pct: 100 }); if (!r.ok) firstFail = i; }
  t.check(firstFail === null, "cert-log: 60 certificates with 80 character names still fit in the recent list property", "fails at certificate " + firstFail + " (property too large)");
  if (firstFail) t.check(JSON.parse(g.props.get("CERTS_rcm")).n === firstFail, "cert-log: when the recent list cannot be saved, the count is not left one too high", "count " + JSON.parse(g.props.get("CERTS_rcm")).n + " but " + firstFail + " logged");
}
{
  const g = fresh(); const tok = g.login(A).token;
  g.post({ action: "dash-save", token: tok, id: "abw", status: "yes" });
  g.post({ action: "cert-log", token: tok, k: "rcm", name: "X", pct: 80 });
  const everything = JSON.stringify([...g.props.entries()]) + JSON.stringify(g.sent.map(m => m.to));
  const mails = g.sent.map(m => m.to);
  t.check(mails.every(m => m === A || m === B), "no mail in the whole session went to an address other than the person signing in", mails);
  const dump = JSON.stringify(g.post({ action: "dash-get", token: tok }));
  t.check(dump.indexOf(B) < 0, "dash-get never shows an approved person's email ID who did not edit anything");
  t.check(g.post({ action: "dash-get", token: tok }).email === A, "dash-get tells the page whose access it is");
}
t.done();
