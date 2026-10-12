# Purview Gurukul

Static training app for Purview Healthcare's RCM teams, published with GitHub Pages. No backend: progress, quiz results and certificates live in the viewer's browser and print from the page.

## Files

- `index.html` – the whole app (styles, markup, engine).
- `basics.js` – the RCM Basics course (modules, topics, quiz bank, discussion prompts, plain-language aliases).
- `scenarios.js`, `calls.js` – generated scenario cases and payer-call role play.
- `sources.js` – official source links per topic and the quarterly review schedule.
- `sops.js` – general Purview SOP placeholders.
- `sops-abw.enc.js` – the ABW Medical client playbook, **encrypted**. The Purview SOPs tab opens it with the team passcode.
- `sw.js` – offline cache; bump `VER` on every release.

## Client playbooks are encrypted

The repository is public, so client playbooks are committed only as ciphertext (AES-256-GCM; key derived from the team passcode with PBKDF2-SHA-256, 600,000 rounds). The page decrypts in the browser; nothing is sent anywhere. The plaintext source (`sops-abw.js`) is git-ignored and must never be committed.

To edit a playbook:

```bash
# decrypt to JSON for reading
SOP_PASSCODE='the team passcode' node tools/sop-lock.js unlock sops-abw.enc.js sops-abw.plain.json
# edit the JavaScript source (sops-abw.js, kept outside the repo), then re-encrypt
SOP_PASSCODE='the team passcode' node tools/sop-lock.js lock sops-abw.js sops-abw.enc.js
```

Changing the passcode is the same `lock` command with the new passcode; everyone then unlocks again with the new one.
