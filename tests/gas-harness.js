/* Loads tools/gurukul-email.gs into a Node vm with hand-written mocks of the Google services.
   Nothing is sent anywhere: MailApp only records what it was asked to send. The clock is ours
   (set clock.now), so expiry can be tested without waiting. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const SRC = fs.readFileSync(path.join(__dirname, "..", "tools", "gurukul-email.gs"), "utf8");

function signed(buf) { return Array.from(buf, b => (b > 127 ? b - 256 : b)); }   // Apps Script bytes are signed
function toBuf(x, enc) { return Array.isArray(x) || x instanceof Uint8Array ? Buffer.from(x.map ? x.map(b => (b + 256) % 256) : x) : Buffer.from(String(x), "utf8"); }
const B64 = /^[A-Za-z0-9+/_-]*={0,2}$/;

function load(opts) {
  opts = opts || {};
  const clock = { now: opts.start || Date.UTC(2026, 10, 25, 10, 0, 0) };
  const props = new Map(); const sent = [];
  const limit = opts.propLimit === undefined ? 9 * 1024 : opts.propLimit;   // Apps Script: about 9 KB per property value
  const cacheMap = new Map();
  const cache = {
    get(k) { const e = cacheMap.get(k); if (!e) return null; if (e.exp <= clock.now) { cacheMap.delete(k); return null; } return e.v; },
    put(k, v, s) { cacheMap.set(k, { v: String(v), exp: clock.now + (s === undefined ? 600 : s) * 1000 }); },
    remove(k) { cacheMap.delete(k); }
  };
  const FakeDate = class extends Date {
    constructor(...a) { if (a.length) super(...a); else super(clock.now); }
    static now() { return clock.now; }
  };
  const blob = (bytes, type, name) => ({ bytes, type, name, getDataAsString() { return toBuf(bytes).toString("utf8"); }, getContentType() { return type; }, getName() { return name; } });
  const sandbox = {
    Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, parseInt, isNaN, console,
    PropertiesService: { getScriptProperties() { return {
      getProperty: k => props.has(k) ? props.get(k) : null,
      setProperty(k, v) { v = String(v); if (limit && Buffer.byteLength(v) > limit) throw new Error("Exception: Property value too large: " + k); props.set(k, v); },
      getProperties() { const o = {}; props.forEach((v, k) => { o[k] = v; }); return o; },
      deleteProperty(k) { props.delete(k); }
    }; } },
    CacheService: { getScriptCache() { return cache; } },
    LockService: { getScriptLock() { return { waitLock() {}, releaseLock() {} }; } },
    MailApp: { sendEmail(m) { if (opts.mailFails) throw new Error("mail quota"); const c = JSON.parse(JSON.stringify(Object.assign({}, m, { attachments: undefined }))); if (m.attachments) c.attachments = m.attachments.map(a => ({ name: a.name, type: a.type, size: toBuf(a.bytes).length })); sent.push(c); } },
    ContentService: { MimeType: { JSON: "JSON" }, createTextOutput(s) { return { s, setMimeType() { return this; }, getContent() { return s; } }; } },
    Utilities: {
      Charset: { UTF_8: "UTF_8" }, DigestAlgorithm: { SHA_256: "SHA_256" },
      getUuid() { return crypto.randomUUID(); },
      base64Encode(x) { return toBuf(x).toString("base64"); },
      base64Decode(s) { if (!B64.test(String(s).replace(/\s+/g, ""))) throw new Error("Invalid base64"); return signed(Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64")); },
      base64EncodeWebSafe(x) { return toBuf(x).toString("base64").replace(/\+/g, "-").replace(/\//g, "_"); },
      base64DecodeWebSafe(s) { if (!B64.test(String(s))) throw new Error("Invalid base64"); return signed(Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64")); },
      computeDigest(alg, v) { return signed(crypto.createHash("sha256").update(toBuf(v)).digest()); },
      computeHmacSha256Signature(v, k) { return signed(crypto.createHmac("sha256", toBuf(k)).update(toBuf(v)).digest()); },
      newBlob: blob
    }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(SRC, ctx, { filename: "gurukul-email.gs" });
  const run = code => vm.runInContext(code, ctx);
  const exp = run("({doGet,doPost,FEEDBACK_TO,approved_,tokenEmail_,token_,sign_,digest_,otpCode_,line_,text_,EMAIL_RE,RECENT_MAX,OTP_MINUTES,ACCESS_HOURS,BURST_LIMIT,MAX_FILE_BYTES})");
  const post = body => JSON.parse(exp.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).getContent());
  return { clock, props, sent, cacheMap, post, get: () => JSON.parse(exp.doGet().getContent()), exp, run,
    setList(list) { props.set("CERT_EMAILS", list); },
    /* full sign-in: send the OTP, read it from the recorded mail, verify; returns the verify reply */
    login(email) { const r = post({ action: "otp-send", email }); if (!r.ok) return r; const m = sent[sent.length - 1]; const code = /\n\n(\d{6})\n/.exec(m.body)[1]; return post({ action: "otp-verify", email, code }); },
    codeOf(i) { const m = sent[i === undefined ? sent.length - 1 : i]; return /\n\n(\d{6})\n/.exec(m.body)[1]; }
  };
}
/* a tiny real PNG / JPG header plus padding, as base64 */
function png(extra) { return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(extra || 32, 1)]).toString("base64"); }
function jpg(extra) { return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(extra || 32, 2)]).toString("base64"); }
module.exports = { load, png, jpg, crypto };
