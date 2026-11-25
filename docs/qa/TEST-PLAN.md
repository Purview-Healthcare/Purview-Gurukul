# Purview Gurukul: full test round (November 2026)

## 1. What the app is

A static training website (GitHub Pages, installable as an app) for Purview Healthcare's RCM teams, mostly freshers. There is no server of its own. Everything a learner does (topics read, quiz results, certificates) is kept in that person's own browser. One small Google Apps Script web app (`tools/gurukul-email.gs`) does the few jobs that need a server: feedback email, the one-time password (OTP) lock, and the Dashboard data.

### Who uses it (roles)

| Role | What they can do | How they get in |
|---|---|---|
| Learner (anyone with the link) | Ask, RCM Basics, All Denials, Purview SOPs (client playbooks), Specialties, Quiz, Feedback | Open the site |
| Approved person (email ID on the private list) | Everything above, plus Certification (take assessments, print certificates, record QA claims) and the Dashboard (view and edit project status, see certificate counts) | Email ID on `CERT_EMAILS`, then a 6-digit OTP by email; access lasts 12 hours on that device |
| Maintainers | Receive feedback emails | Fixed recipients in the script |
| Script owner | Holds the approved list, the secret, and all Dashboard data in Script Properties | Google account |

### Main workflows

1. Ask a question in plain words and get the matching denial, course topic, playbook topic or specialty topic.
2. Read the RCM Basics course module by module, mark topics read, take each day's quiz, print results.
3. Browse the denial library, open a denial, quiz on it (theory, call role play, scenario).
4. Read a client playbook (ABW, Hagion, Titan, VEC), see "What changed" updates, take the playbook assessment.
5. Read a specialty track (Vision, Dental, Behavioral health), take its assessment.
6. Quiz tab: Theory, Call, Scenario, Everything.
7. Certification: verify email ID by OTP, enter name, take an assessment (RCM Basics, Denial management, Process, Specialty, Final readiness), pass at 80% or more, print the certificate; for Quality, record at least 5 audited claims at 95% average or more, then print.
8. Dashboard: after OTP, see every project and track with material status, owners and scope; edit a row; see certificate counts by step and project and the recent list; print a summary.
9. Feedback: write a message, attach up to 3 screenshots, send by the script (or the user's mail app when the script is not set).

### Numbers and calculations

- Assessment score = correct / total, rounded to a whole percent; pass mark 80%. A lower later score never replaces an earlier pass.
- Final readiness test: 40 questions, 20 RCM Basics and 20 AR and denial management, scored by area; an area below 70% is named for revision.
- Paper sizes: 20 questions for most certificates; specialty papers spread over the track's modules.
- Quality: average of the recorded claim scores; needs at least 5 claims and 95% or more, after the process training is cleared.
- Dashboard: certificate count per key, people count per key (distinct fingerprints), sums by step and by project, "due for review" after 30 days.
- Client updates: "Updated" badge for 30 days after the update date.
- Review reminder: quarterly.

### What it connects to

- The Apps Script web app at `SCRIPT_URL` (OTP, feedback, Dashboard). Mocked in every test.
- The user's mail app (mailto) when the script is not available.
- Google Fonts. Official source links (only as links).
- The browser's local storage and the offline cache (service worker).

### Questions (rules that are unclear)

- Q1. The certificate "Date" line is the print date, while the body shows the date the test was cleared. Is the print date the wanted one? (Assumed yes: that is what was asked on 25 November.)
- Q2. Certificate dates and the "Updated" badge use the device clock and time zone. Teams work in India, often on US night shifts. Should dates be fixed to India time? (Recommended: yes for certificates; see the report.)
- Q3. The feedback recipients' email IDs are written in the public script file. Should they move to Script Properties like the approved list?
- Q4. Dashboard certificate counts trust the browser that reports them (any approved person could add counts). Acceptable for an internal tool?

## 2. Test plan

Each area below is a test file in `tests/`. Check names are plain English. Outside services are always mocked; data is made up.

| # | Area | Test file | Planned checks |
|---|---|---|---|
| 1 | Every main workflow end to end, per role (learner, approved person) | `learner-flows.test.js`, `cert-flows.test.js`, `dashboard.test.js` | 40 |
| 2 | Bugs and edge cases: empty, wrong, huge, duplicate, odd input (search, names, QA scores, feedback, dashboard fields) | spread over the files above, plus `edge-input.test.js` | 30 |
| 3 | Who sees what: Certification and Dashboard locked without OTP, expired access, other email's token, no cross-client data, no private data in public files | `access.test.js`, `script.test.js` | 20 |
| 4 | Numbers: scores, pass mark, final test by area, QA average, dashboard sums agree with cards, print and summary text | `numbers.test.js` | 25 |
| 5 | Dates and time: IST, midnight, month and year end, 30-day badge, 30-day review, 12-hour access, OTP 10 minutes | `dates.test.js` | 15 |
| 6 | Two at once: double clicks on start/submit/save, two tabs saving progress or certificates, two saves on one Dashboard row | `concurrency.test.js` | 10 |
| 7 | Uploads, downloads, emails: screenshots (type, size, count), feedback content, printouts (no private data), OTP email | `feedback.test.js`, `script.test.js` | 20 |
| 8 | Every screen in Chromium: no errors, every button, phone width, keyboard, print layout | `screens.test.js`, `smoke.test.js` | 25 |
| 9 | Errors and recovery: script down, slow, bad JSON, storage blocked, storage full or corrupted | `recovery.test.js` | 15 |
| 10 | Speed: load time, file sizes, work on each keypress in search, repeated calls | `speed.test.js` | 10 |
| 11 | Basic security: OTP and token rules in the script, every script action checks access, HTML in names and messages is shown as text, no secrets in code | `script.test.js`, `security.test.js` | 25 |
| 12 | Content integrity: unique ids, every "see also" link resolves, every question valid, sources resolve, no em dashes or broken text in user-facing data | `content.test.js` | 15 |

Planned total: about 250 checks. Themes: the app has one (light) theme; there is no dark mode, so "all themes" means the one theme plus print.

Testers run in parallel (at most 3 at a time), report suspected bugs with evidence in `docs/qa/findings-*.md`, and do not change app code. Every suspected bug is checked against the rules above before it is fixed; each fix gets a check that fails before and passes after; then every test is run again.
