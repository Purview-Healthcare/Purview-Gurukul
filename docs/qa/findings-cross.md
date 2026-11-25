# Findings: security, speed, offline, recovery, screens

Tester report (Sonnet, medium effort), saved here as received. Triage decisions are in `docs/qa/REPORT.md`.

Files: `tests/security.test.js` (42 checks), `tests/speed.test.js` (32), `tests/offline.test.js` (29), `tests/recovery.test.js` (78), `tests/screens.test.js` (54). Result at the time of the report: 235 checks, 218 passed, 17 failed (11 suspected bugs).

## What passed

No secrets, tokens, phone numbers, addresses or internal links in any file (made-up NPIs and tax IDs in calls.js fail the real check digit). HTML typed into every input, stored in every saved key or sent in Dashboard replies stays inert. Every outside link is https with rel=noopener. Zero script calls on load and on learner tabs; four Dashboard opens make one call. Offline over a local server: all 23 files cached, the app works offline, a version bump replaces the cache. Every kind of script failure (500, HTML page, empty, cut-off JSON, no network, never answering) shows a plain message and loses nothing. 5,073 controls clicked at three screen sizes with no errors and no sideways scroll. Images have alt text, buttons have names, print hides the app chrome.

## Suspected bugs

1. **Medium.** A badly shaped saved certificate record (`gk_cert`, for example `rows:"abc"`) stops the page script, so Quiz, Dashboard and feedback stop working until site data is cleared. `certLoad` only checks the version; `qaStats` trusts `rows`.
2. **Medium.** With storage blocked, a correct OTP says "Certification is open" but the page stays locked.
3. **Medium.** With storage full, progress ticks vanish silently and "certificate issued" is announced although nothing was saved (`certSave` and the read toggles swallow the error).
4. **Low to medium.** The offline worker can save a 404 page as the cached index.html (no `r.ok` check in sw.js).
5. **Medium.** The install manifest is not linked from index.html, although the README says the app is installable.
6. **Low.** Search highlighting cuts through escaped characters (`&amp;`, `&quot;`).
7. **Low (own device only).** Stored score numbers are printed on the certificate without escaping.
8. **Low.** The Dashboard status value from the script goes into class attributes without escaping.
9. **Low.** Oddly shaped Dashboard replies (scope as text, null recent rows, a non-text key) stop the Dashboard drawing.
10. **Trivial.** Feedback opened from the Dashboard says "Where: App".
11. **Low (accessibility).** The Ask box has no label; the page has no main or navigation landmarks.

## Measured speed

Total 1,864 KB (595 KB compressed). Load about 190 to 230 ms. First Ask answer 181 ms after asking; eight questions 48 to 77 ms each; a 5,000-character question 178 ms. Course search keystrokes average 9.5 ms, slowest 19 ms. One long task of 100 ms on load. All 191 topics open in 380 ms in total. Memory stable (4 MB heap) with no leak; each Ask answer keeps about 445 page elements.

## Improvement ideas

1. A Content-Security-Policy tag.
2. Escape single quotes in `esc()` too.
3. A visible notice when storage is blocked or full.
4. Check stored data shapes once on load.
5. Cap the Ask answer list.
6. Service worker: cache only good responses, install file by file, refresh big data files in the background.
7. Host the two fonts locally (privacy, offline).
8. A check that the cache version changes whenever a cached file changes.
9. Main and navigation landmarks, a skip link, tab roles, focus kept inside the feedback window.
10. Strip query and hash from the feedback "Page:" line.
11. The feedback recipients' email IDs are in public index.html as well as the script.
12. A note in calls.js that all names and numbers are invented.
13. A larger "Lock now" tap target on phones.
