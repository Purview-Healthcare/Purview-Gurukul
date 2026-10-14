/* Purview Gurukul: feedback relay (Google Apps Script web app)
   ------------------------------------------------------------
   The Gurukul site is static, so it cannot send email by itself. This tiny web
   app receives a feedback message from the site and emails it straight to the
   maintainers below. It stores nothing: no sheet, no log, no copy. The
   recipients are fixed here, so the web app cannot be used to email anyone else.

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

    const body =
      "Type: " + type + "\n" +
      "Where: " + (where || "-") + "\n" +
      "From: " + (name || "(not given)") + (replyTo ? " <" + replyTo + ">" : "") + "\n" +
      "Page: " + (page || "-") + "\n\n" +
      message + "\n\n" +
      "Sent from the Feedback button in Purview Gurukul." + (replyTo ? " Reply to this email to answer the sender." : "") + "\n";

    const mail = {
      to: TO.join(","),
      subject: "Gurukul feedback: " + type + (where ? " — " + where : ""),
      body: body,
      name: "Purview Gurukul"
    };
    if (replyTo) mail.replyTo = replyTo;
    MailApp.sendEmail(mail);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: "send failed" });
  }
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
