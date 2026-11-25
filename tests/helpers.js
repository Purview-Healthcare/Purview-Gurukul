/* Shared helpers for the Gurukul test files.
   Each test file is a plain Node script: it runs its checks, prints one line per
   check ("  pass  ..." or "  FAIL  ..."), and exits with code 1 if any check failed.
   Run every file with:  node tests/run.js        (or one file: node tests/<name>.test.js)
   The browser is the Chromium that Playwright already has; no install is needed.
   Outside services are never called: the Google Apps Script URL is answered by a
   mock (see mockScript), and only made-up data is used. */
"use strict";
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "index.html");

function suite(title) {
  let fails = 0, passes = 0;
  console.log("\n" + title);
  return {
    check(ok, name, detail) {
      if (ok) { passes++; console.log("  pass  " + name); }
      else { fails++; console.log("  FAIL  " + name + (detail !== undefined ? "  ->  " + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 400) : "")); }
      return !!ok;
    },
    done() {
      console.log("  " + passes + " passed, " + fails + " failed");
      process.exitCode = fails ? 1 : 0;
      return { passes, fails };
    }
  };
}

/* The Apps Script web app, answered locally. `handler(body)` returns the JSON reply;
   by default every call fails as if the service were down. Every request is recorded. */
async function mockScript(context, handler) {
  const calls = [];
  await context.route(/^https:\/\/script\.google(usercontent)?\.com\//, async route => {
    let body = {};
    try { body = JSON.parse(route.request().postData() || "{}"); } catch (e) {}
    calls.push(body);
    if (!handler) return route.abort("failed");
    const reply = await handler(body, route.request());
    if (reply === "abort") return route.abort("failed");
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(reply) });
  });
  return calls;
}

/* A fresh browser page on the app, with page errors collected in `errors`. */
async function openApp(opts) {
  opts = opts || {};
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const context = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts.context || {}));
  const calls = await mockScript(context, opts.script);
  if (opts.init) await context.addInitScript(opts.init);
  await context.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  await page.goto(PAGE, { waitUntil: "load" });
  await page.waitForTimeout(300);
  return { browser, context, page, errors, calls };
}

async function tab(page, panel) {
  await page.click('.navtab[data-panel="' + panel + '"]');
  await page.waitForTimeout(150);
}

module.exports = { ROOT, PAGE, suite, openApp, mockScript, tab };
