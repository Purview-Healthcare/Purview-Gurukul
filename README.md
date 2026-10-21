# Purview Gurukul

Static training app for Purview Healthcare's RCM teams, published with GitHub Pages. No backend: progress, quiz results and certificates live in the viewer's browser and print from the page.

## Files

- `index.html` – the whole app (styles, markup, engine).
- `basics.js` – the RCM Basics course (modules, topics, quiz bank, discussion prompts, plain-language aliases).
- `scenarios.js`, `calls.js` – generated scenario cases and payer-call role play.
- `sources.js` – official source links per topic and the quarterly review schedule.
- `sops.js` – general Purview SOP placeholders.
- `sops-abw.js` – the ABW Medical client playbook and its assessment questions, from the AR Notes Reference Guide, the consolidated Client Operations Manual and the ABW athenaOne SOPs (navigation, Missing Slips, Hold and MGR Hold, kick codes, Zero Pay, Unpostables, patient AR and reports); names, contacts, account numbers and screenshots deliberately left out.
- `sops-hagion.js` – the Hagion (Joppa Trading and Medical Supplies) client playbook and its assessment questions, from the Process Flow SOP, the NikoHealth Navigation SOP, the Update Tracker and the client meeting minutes (staff names, phone numbers, shared-drive links and screenshots with patient details left out). It adds itself to the client list, so it also appears as a process in Certification.
- `sops-titan.js` – the Titan (Northwestern Medicine ARR) client playbook and its assessment questions, from Titan's collector manual and RevX guide, the NWM ARR training and reference guide, the Known Billing Issues list and the Epic navigation SOP (phone and fax numbers, addresses, hospital tax IDs and NPIs, staff names, internal links and patient details left out). It also adds itself to the client list and appears as a process in Certification.
- `sops-vec.js` – the VEC (Village Eye Care) client playbook and its assessment questions, from the VEC AR Work Flow SOP and the PCC and EV SOP (staff names, the contact list with its email addresses, and screenshots left out). It also adds itself to the client list and appears as a process in Certification.
- `sw.js` – offline cache; bump `VER` on every release.
- `tools/gurukul-email.gs` – the Google Apps Script that does Gurukul's email: it sends feedback (with up to three screenshots) straight to the maintainers, and it sends and checks the one-time password that opens the Certification page for approved email IDs. The approved list is kept in the script's Script Properties (`CERT_EMAILS`), not in this public code. Setup steps are at the top of the file; put its web app URL in `SCRIPT_URL` in `index.html`. Until then, Feedback opens the user's own mail app and Certification stays locked.
