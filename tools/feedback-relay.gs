/* Purview Gurukul: feedback relay (Google Apps Script web app)
   ------------------------------------------------------------
   The Gurukul site is static, so it cannot send email by itself. This tiny web
   app receives a feedback message from the site, with up to three screenshots,
   and emails it straight to the maintainers below. It stores nothing: no sheet,
   no log, no copy. The recipients are fixed here, so the web app cannot be used
   to email anyone else, and only PNG or JPG images go through as attachments.

   One-time setup, by the owner of the Google account that should send the mail
   (about five minutes):
     1. Open https://script.google.com/home and click "New project".
        Name it "Gurukul feedback relay".
     2. Delete the sample code, paste this whole file, and click Save.
     3. Click Deploy > New deployment. Under "Select type" choose "Web app".
          Description:     Gurukul feedback
          Execute as:      Me
          Who has access:  Anyone
        Click Deploy, then "Authorize access" and allow sending email as you.
     4. Copy the "Web app" URL. It ends in /exec.
     5. Put that URL in FEEDBACK_RELAY in index.html, or send it to whoever
        maintains Gurukul. Feedback then goes straight to the inboxes below.
   Check: opening the URL in a browser shows {"ok":true,"service":"gurukul-feedback"}.

   Mail goes out from the account that deployed the script, named "Purview Gurukul".
   A free Google account can send to about 100 recipients a day; each message
   goes to the two people below, so that is about 50 messages a day.
   If you edit this file later, use Deploy > Manage deployments > Edit > New version,
   so the URL stays the same. */

const TO = ["shreya.k@purview-healthcare.com", "sweety.t@purviewservices.com"];
const MAX_MESSAGE = 4000;      // characters
const BURST_LIMIT = 20;        // messages from everyone together...
const BURST_WINDOW = 600;      // ...in any 10 minutes (seconds)
const MAX_FILES = 3;           // screenshots per message
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

function doGet() {
  return json_({ ok: true, service: "gurukul-feedback" });
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (d.website) return json_({ ok: true });                 // hidden trap field: only bots fill it
    const message = text_(d.message, MAX_MESSAGE);
    if (message.length < 3) return json_({ ok: false, error: "empty" });

    const cache = CacheService.getScriptCache();
    const sent = Number(cache.get("burst") || 0);
    if (sent >= BURST_LIMIT) return json_({ ok: false, error: "busy" });
    cache.put("burst", String(sent + 1), BURST_WINDOW);

    const type = line_(d.type, 60) || "Feedback";
    const where = line_(d.where, 200);
    const name = line_(d.name, 80);
    const email = line_(d.email, 120);
    const page = line_(d.page, 300);
    const replyTo = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email) ? email : "";
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
      to: TO.join(","),
      subject: "Gurukul feedback: " + type + (where ? " — " + where : ""),
      body: body,
      name: "Purview Gurukul"
    };
    if (replyTo) mail.replyTo = replyTo;
    if (files.length) mail.attachments = files;
    MailApp.sendEmail(mail);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: "send failed" });
  }
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
