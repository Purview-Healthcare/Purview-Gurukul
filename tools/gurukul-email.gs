/* Purview Gurukul: email script (Google Apps Script web app)
   ----------------------------------------------------------
   The Gurukul site is static, so it cannot send email by itself. This one small
   web app does the two jobs that need email:

     1. Feedback. Each message from the Feedback button, with up to three
        screenshots, is emailed straight to the maintainers in FEEDBACK_TO.
        Nothing is stored: no sheet, no log, no copy. Recipients are fixed here,
        so the web app cannot be used to email anyone else, and only real PNG or
        JPG images go through as attachments.

     2. Certification lock. The Certification page opens only for approved email
        IDs. The page asks for an email ID; if it is on the approved list, this
        script emails a 6-digit one-time password (OTP) to it, and checks the OTP
        when it is typed in. An OTP works once, for 10 minutes, with 5 tries. Only
        a fingerprint of each OTP is kept, in Google's short-term cache.

   The approved list is NOT in this file, because the Gurukul code is public. It
   lives in this project's Script Properties, where only you can see it.

   One-time setup, by the owner of the Google account that should send the mail
   (about five minutes):
     1. Open https://script.google.com/home and click "New project".
        Name it "Gurukul email script".
     2. Delete the sample code, paste this whole file, and click Save.
     3. Click Project Settings (the gear icon on the left). Under "Script
        Properties" click "Add script property":
          Property:  CERT_EMAILS
          Value:     the approved email IDs, separated by commas
        Click "Save script properties". Edit this value any time to add or
        remove people; it takes effect straight away, with no new deployment.
     4. Click Deploy > New deployment. Under "Select type" choose "Web app".
          Description:     Gurukul email
          Execute as:      Me
          Who has access:  Anyone
        Click Deploy, then "Authorize access" and allow sending email as you.
     5. Copy the "Web app" URL. It ends in /exec. Put it in SCRIPT_URL in
        index.html, or send it to whoever maintains Gurukul.
   Check: opening the URL in a browser shows {"ok":true,"service":"gurukul",...}
   with "approved" equal to the number of email IDs on the list.

   Mail goes out from the account that deployed the script, named "Purview Gurukul".
   A free Google account can send to about 100 recipients a day; a feedback message
   goes to two people and an OTP to one.
   If you edit this file later, use Deploy > Manage deployments > Edit > New version,
   so the URL stays the same. */

const FEEDBACK_TO = ["shreya.k@purview-healthcare.com", "sweety.t@purviewservices.com"];
const MAX_MESSAGE = 4000;      // characters
const BURST_LIMIT = 20;        // feedback messages from everyone together...
const BURST_WINDOW = 600;      // ...in any 10 minutes (seconds)
const MAX_FILES = 3;           // screenshots per message
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

const OTP_MINUTES = 10;        // an OTP works this long
const OTP_TRIES = 5;           // wrong guesses before it is cancelled
const OTP_GAP = 60;            // seconds before the same email ID can ask again
const OTP_PER_HOUR = 5;        // OTPs per email ID per hour
const OTP_BURST = 30;          // OTPs for everyone together in any 10 minutes
const ACCESS_HOURS = 12;       // how long the Certification page stays open on that device

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

function doGet() {
  return json_({ ok: true, service: "gurukul", feedback: true, otp: true, approved: approved_().length });
}

function doPost(e) {
  let d;
  try { d = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (err) { return json_({ ok: false, error: "bad request" }); }
  if (!d || typeof d !== "object") return json_({ ok: false, error: "bad request" });
  try {
    if (d.action === "otp-send") return json_(otpSend_(d));
    if (d.action === "otp-verify") return json_(otpVerify_(d));
    return json_(feedback_(d));
  } catch (err) {
    return json_({ ok: false, error: "send failed" });
  }
}

/* ── 1. feedback ───────────────────────────────────────────────────────────── */
function feedback_(d) {
  if (d.website) return { ok: true };                      // hidden trap field: only bots fill it
  const message = text_(d.message, MAX_MESSAGE);
  if (message.length < 3) return { ok: false, error: "empty" };

  const cache = CacheService.getScriptCache();
  const sent = Number(cache.get("burst") || 0);
  if (sent >= BURST_LIMIT) return { ok: false, error: "busy" };
  cache.put("burst", String(sent + 1), BURST_WINDOW);

  const type = line_(d.type, 60) || "Feedback";
  const where = line_(d.where, 200);
  const name = line_(d.name, 80);
  const email = line_(d.email, 120);
  const page = line_(d.page, 300);
  const replyTo = EMAIL_RE.test(email) ? email : "";
  const files = screenshots_(d.attachments);

  const body =
    "Type: " + type + "\n" +
    "Where: " + (where || "-") + "\n" +
    "From: " + (name || "(not given)") + (replyTo ? " <" + replyTo + ">" : "") + "\n" +
    "Page: " + (page || "-") + "\n" +
    (files.length ? "Screenshots: " + files.length + " attached\n" : "") + "\n" +
    message + "\n\n" +
    "Sent from the Feedback button in Purview Gurukul." + (replyTo ? " Reply to this email to answer the sender." : "") + "\n";

  const mail = {
    to: FEEDBACK_TO.join(","),
    subject: "Gurukul feedback: " + type + (where ? " — " + where : ""),
    body: body,
    name: "Purview Gurukul"
  };
  if (replyTo) mail.replyTo = replyTo;
  if (files.length) mail.attachments = files;
  MailApp.sendEmail(mail);
  return { ok: true };
}

/* up to MAX_FILES real PNG or JPG images, each checked by its first bytes, within the size limits */
function screenshots_(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  let total = 0;
  list.slice(0, MAX_FILES).forEach(function (f, i) {
    if (!f || typeof f.data !== "string") return;
    let bytes;
    try { bytes = Utilities.base64Decode(f.data.replace(/^data:[^,]*,/, "")); } catch (err) { return; }
    if (!bytes || !bytes.length || bytes.length > MAX_FILE_BYTES || total + bytes.length > MAX_TOTAL_BYTES) return;
    const u = function (k) { return (bytes[k] + 256) % 256; };
    const png = bytes.length > 8 && u(0) === 0x89 && u(1) === 0x50 && u(2) === 0x4e && u(3) === 0x47;
    const jpg = bytes.length > 3 && u(0) === 0xff && u(1) === 0xd8 && u(2) === 0xff;
    if (!png && !jpg) return;
    total += bytes.length;
    const base = line_(f.name, 60).replace(/\.[a-z0-9]+$/i, "").replace(/[^\w .-]+/g, "").trim() || ("screenshot-" + (i + 1));
    out.push(Utilities.newBlob(bytes, png ? "image/png" : "image/jpeg", base + (png ? ".png" : ".jpg")));
  });
  return out;
}

/* ── 2. certification lock: one-time password by email ─────────────────────── */
function approved_() {
  const raw = PropertiesService.getScriptProperties().getProperty("CERT_EMAILS") || "";
  return raw.split(/[\s,;]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(function (s) { return EMAIL_RE.test(s); });
}

function otpSend_(d) {
  const email = line_(d.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "bad-email" };
  const list = approved_();
  if (!list.length) return { ok: false, error: "no-list" };
  if (list.indexOf(email) < 0) return { ok: false, error: "not-allowed" };

  const cache = CacheService.getScriptCache();
  if (cache.get("otpgap:" + email)) return { ok: false, error: "wait", seconds: OTP_GAP };
  const count = Number(cache.get("otpcount:" + email) || 0);
  if (count >= OTP_PER_HOUR) return { ok: false, error: "limit" };
  const burst = Number(cache.get("otpburst") || 0);
  if (burst >= OTP_BURST) return { ok: false, error: "busy" };

  const code = otpCode_(), salt = Utilities.getUuid(), until = Date.now() + OTP_MINUTES * 60000;
  MailApp.sendEmail({
    to: email,
    subject: "Your Purview Gurukul OTP is " + code,
    body: "Your one-time password (OTP) for the Purview Gurukul Certification page is:\n\n" + code +
      "\n\nIt works once, for " + OTP_MINUTES + " minutes. If you did not ask for it, you can ignore this email.\n",
    htmlBody: '<p>Your one-time password (OTP) for the Purview Gurukul Certification page is:</p>' +
      '<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0">' + code + '</p>' +
      '<p>It works once, for ' + OTP_MINUTES + ' minutes. If you did not ask for it, you can ignore this email.</p>',
    name: "Purview Gurukul"
  });
  cache.put("otp:" + email, JSON.stringify({ s: salt, h: digest_(salt + code), t: 0, x: until }), OTP_MINUTES * 60);
  cache.put("otpgap:" + email, "1", OTP_GAP);
  cache.put("otpcount:" + email, String(count + 1), 3600);
  cache.put("otpburst", String(burst + 1), 600);
  return { ok: true, minutes: OTP_MINUTES };
}

function otpVerify_(d) {
  const email = line_(d.email, 120).toLowerCase();
  const code = String(d.code == null ? "" : d.code).replace(/\D/g, "").slice(0, 6);
  if (approved_().indexOf(email) < 0) return { ok: false, error: "not-allowed" };
  const cache = CacheService.getScriptCache(), key = "otp:" + email, raw = cache.get(key);
  if (!raw) return { ok: false, error: "expired" };
  const rec = JSON.parse(raw);
  const left = Math.floor((rec.x - Date.now()) / 1000);
  if (left <= 0) { cache.remove(key); return { ok: false, error: "expired" }; }
  if (code.length === 6 && digest_(rec.s + code) === rec.h) {
    cache.remove(key);                                       // an OTP works once
    return { ok: true, email: email, hours: ACCESS_HOURS };
  }
  rec.t = (rec.t || 0) + 1;
  if (rec.t >= OTP_TRIES) { cache.remove(key); return { ok: false, error: "too-many" }; }
  cache.put(key, JSON.stringify(rec), Math.max(1, left));
  return { ok: false, error: "wrong", left: OTP_TRIES - rec.t };
}

/* six random digits from a random UUID (48 bits, so every code is equally likely in practice) */
function otpCode_() {
  const hex = Utilities.getUuid().replace(/-/g, "");
  return ("000000" + (parseInt(hex.slice(0, 12), 16) % 1000000)).slice(-6);
}
function digest_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

/* ── helpers ───────────────────────────────────────────────────────────────── */
/* one line of plain text: no line breaks or control characters, trimmed and capped */
function line_(s, max) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
/* the message itself keeps its line breaks */
function text_(s, max) {
  return String(s == null ? "" : s).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
