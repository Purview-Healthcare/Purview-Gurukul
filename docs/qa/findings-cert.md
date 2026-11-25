# Findings: Certification, OTP lock, Dashboard, feedback, email script

Tester report (Sonnet, medium effort), saved here as received. Triage decisions are in `docs/qa/REPORT.md`.

Run: `node tests/run.js script cert dashboard feedback dates`. Result at the time of the report: 435 checks, 418 passed, 17 failed (11 suspected bugs).

| File | Checks | Passed | Failed |
|---|---|---|---|
| tests/script.test.js (the .gs file in a Node vm with mocked Google services) | 126 | 122 | 4 |
| tests/cert-flows.test.js | 170 | 166 | 4 |
| tests/dashboard.test.js | 70 | 67 | 3 |
| tests/feedback.test.js | 40 | 39 | 1 |
| tests/dates.test.js (India and New York time zones) | 29 | 24 | 5 |

## Suspected bugs

- **B1. "Certificate holders" and per-step "people" over-counted (Dashboard). Medium.** The page sums per-key people counts, so a person holding several certificates is counted several times. index.html `dashSum`, the holders card. The script returns only per-key people counts.
- **B2. Certificate dates follow the device time zone. Medium, owner question.** The same instant prints 1 December in India and 30 November in New York (also at year end, leap day, just after midnight IST). `certDate()` has no time zone; `whenNow`, `dashWhen` behave the same.
- **B3. QA "Date audited" default uses the UTC date. Low to medium.** Between 00:00 and 05:30 IST it shows the previous day. index.html `toISOString().slice(0,10)` in the QA pane and `qaAdd`.
- **B4. QA message "Overall 95.0%, below 95%". Low.** Rounding for display makes a correct "below" verdict look wrong (mean 94.98).
- **B5. Duplicate QA claim references accepted. Low to medium.** The same claim can be counted twice toward the 5 claims and the average.
- **B6. Feedback burst limit is a sliding idle window. Low to medium.** Each send resets the 10-minute timer, so steady traffic (1 a minute) is blocked after 20. Same pattern for OTP hourly and burst counters. gurukul-email.gs.
- **B7. dash-save accepts an invalid status when a reason is given. Low.** Saved as "" (Not recorded).
- **B8. dash-save accepts any id; all rows share one Script Property (about 9 KB). Low.** Full-size rows can overflow; the page then says "Check your connection".
- **B9. The Certification lock is on the page only. Low, informational.** A hand-written access record opens Certification (questions are public in the code anyway). The Dashboard is protected by the signed token. A tab left open stays unlocked past 12 hours.
- **B10. One bad Dashboard row stops the whole Dashboard drawing. Low.** `scope` as a string throws `scope.map is not a function`.
- **B11. A long feedback message is cut silently at 4000 characters. Low.** No `maxlength` on the box.

## Other observations

- OTP send/verify have no lock (small race on the gap and try counter).
- Anyone can use up an approved person's 5 OTPs an hour, or the 30-in-10-minutes total.
- The `not-allowed` reply shows whether an email ID is on the list (needed for a useful message; trade-off).
- `cert-log` trusts the browser; any approved person can add counts for any matching key; a later higher pass counts again.
- The QA certificate is logged on first print only; a failed log is never retried.
- The certified-person fingerprint is an unsalted SHA-256 prefix of the email ID.
- Certificate numbers repeat every 25 days and cannot be verified.
- `by` on Dashboard rows holds the editor's email ID, shown to every approved viewer.
- An unknown `action` falls through to feedback.
- The PNG check reads 4 of the 8 signature bytes.

## Improvement ideas

1. Return distinct people totals from the script (B1).
2. One date function fixed to India time for certificates, summaries, the QA default date and "Updated" (B2, B3).
3. One Script Property per Dashboard row, only the real ids, and a "too large" message.
4. True time windows for the rate limits; count only messages really sent.
5. QA: refuse duplicate references, warn about future dates, two decimals near the pass line.
6. A verification code on certificates with a script lookup.
7. `maxlength=4000` and a counter on the feedback box.
8. Re-lock Certification with a timer at 12 hours.
9. Feedback recipients in Script Properties.
10. Escape closes the Dashboard edit form from anywhere.
11. Retry `cert-log` once and remember unsent logs.

## Questions for the owner

- O1. Is the Date line meant to be the print date while the text shows the date cleared?
- O2. Should all dates be India time?
- O3. Is it acceptable that Certification can be opened by editing local storage?
- O4. Is it acceptable that any approved person can add certificate counts for any key?
- O5. Should a second, higher pass count as a new certificate on the Dashboard?
- O6. Should two QA claims with the same reference be allowed?
- O7. Should every approved person edit Dashboard rows, or only managers?
- O8. Should "certificate holders" mean distinct people across all steps, or the per-step sum (then relabel)?
