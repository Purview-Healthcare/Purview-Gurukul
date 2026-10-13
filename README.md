# Purview Gurukul

Static training app for Purview Healthcare's RCM teams, published with GitHub Pages. No backend: progress, quiz results and certificates live in the viewer's browser and print from the page.

## Files

- `index.html` – the whole app (styles, markup, engine).
- `basics.js` – the RCM Basics course (modules, topics, quiz bank, discussion prompts, plain-language aliases).
- `scenarios.js`, `calls.js` – generated scenario cases and payer-call role play.
- `sources.js` – official source links per topic and the quarterly review schedule.
- `sops.js` – general Purview SOP placeholders.
- `sops-abw.js` – the ABW Medical client playbook and its assessment questions (names, contacts and account numbers deliberately left out).
- `sw.js` – offline cache; bump `VER` on every release.
