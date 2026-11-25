/* Runs every tests/*.test.js file one after another and prints a total.
   Usage: node tests/run.js            (all files)
          node tests/run.js smoke cert (only files whose name contains one of the words) */
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const dir = __dirname, only = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith(".test.js") && (!only.length || only.some(w => f.includes(w)))).sort();
let pass = 0, fail = 0, broken = [];
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: "utf8", timeout: 600000 });
  const out = (r.stdout || "") + (r.stderr || "");
  process.stdout.write(out);
  const p = (out.match(/^  pass  /mg) || []).length, x = (out.match(/^  FAIL  /mg) || []).length;
  pass += p; fail += x;
  if (r.status !== 0 && !x) { broken.push(f); fail++; }
}
console.log("\n==== " + files.length + " files, " + pass + " checks passed, " + fail + " failed" + (broken.length ? " (crashed: " + broken.join(", ") + ")" : "") + " ====");
process.exitCode = fail ? 1 : 0;
