/* Purview Gurukul — Purview SOPs: Hagion client playbook (Joppa Trading and Medical Supplies).
   Built from three internal Hagion documents: the Process Flow SOP and the NikoHealth
   Navigation SOP (both drafted December 2025) and the Update Tracker (entries to
   6 October 2026). Staff names, phone numbers and the screenshots, which show
   patient details, are deliberately left out; the documents remain the source of truth.
   Loaded after sops-abw.js; it adds one client to SOP_CLIENTS and its questions to SOP_QUIZ. */
"use strict";
(function(){
if(typeof SOP_CLIENTS==="undefined"||typeof SOP_QUIZ==="undefined") return;

const SRC_FLOW="Hagion Process Flow SOP, December 2025 (internal).";
const SRC_NAV="Hagion NikoHealth Navigation SOP, December 2025 (internal).";
const SRC_TRACK="Hagion Update Tracker, entries to 6 October 2026 (internal).";

SOP_CLIENTS.push(
{id:"hagion",name:"Hagion (Joppa Trading and Medical Supplies)",short:"Hagion",updated:"Update Tracker to 6 October 2026",
 truth:"Rules change by email and in client meetings and are logged in the Update Tracker; the Hagion SOPs and the newest tracker entry are the source of truth.",
 blurb:"Purview submits the orders and works the AR for Joppa Trading and Medical Supplies (JOPPA), a home medical supply company, inside its NikoHealth system. Most claims go to Texas Medicaid plans (Superior, Molina, TMHP) and Medicare. This playbook covers who does what, the NikoHealth screens, the billing and modifier rules, AR and denials, and every dated update.",
 modules:[
{id:"hag-a",short:"Hagion basics",title:"How the Hagion account works",blurb:"The client, the split of work between Purview and the client, and the medical-supply basics you need first.",lessons:[
 {id:"hag-who",title:"Hagion and Joppa Trading: the client and the work",
  keywords:["hagion","joppa","joppa trading","joppa trading and medical supplies","who is hagion","hagion client","dme client","medical supply company","nikohealth client","order to invoice","hagion process"],
  line:"Hagion is Purview’s account for Joppa Trading and Medical Supplies (JOPPA), a company that delivers medical equipment and supplies to patients at home. Purview turns its orders into claims in NikoHealth and follows each one until the invoice is closed.",
  body:[
   "**The client.** JOPPA is a durable medical equipment (DME) and medical supply company. Think grab bars, raised toilet seats, walker attachments and pill-box alarms, and a large volume of incontinence supplies: briefs, pull-ups, underpads and wipes. Most patients are on Texas Medicaid plans or Medicare.",
   "**The system.** All work happens in **NikoHealth**, the client’s DME software: patients, orders, billing and notes. Payer portals (Availity, My CGS for Medicare equipment, WellMed and the plans’ own sites) are used for status and EOBs. Texas Medicaid fee-for-service claims are the one exception: they go through the TMHP portal, never through NikoHealth.",
   "**The life of an order.** The client creates an order (status **New**) and moves it to **Ready to Fulfill** once the paperwork and the authorization are uploaded. Purview checks it, sets up the items, codes, charges and insurance, ships it in the system, and submits it (status **Submitted**). The order then shows in Billing as an invoice. Purview follows it up, works any denial, and changes it to **Closed** once it is paid or finished under a rule.",
   "**The documents behind this playbook.** Two SOPs, the Process Flow SOP and the NikoHealth Navigation SOP, plus the **Update Tracker**, where every new rule is logged with its date and its source: email, meeting, SOP, or Purview’s own internal analysis of denials."
  ],
  compare:{title:"Order statuses in NikoHealth",head:["Status","Who sets it","What it means"],rows:[["New","Client","Order created; paperwork or authorization not ready"],["Ready to Fulfill","Client","Ready for Purview to validate and submit, within 24 hours"],["Submitted","Purview","Claim sent; note written as ‘Billed on [date]’"],["Closed","Purview","Paid and documented, or closed under a tracker rule"]]},
  terms:[["DME","Durable medical equipment: equipment for use at home, such as walkers or shower chairs; medical supplies such as incontinence products travel the same way here."],["Order","The client’s request to supply items to a patient; it becomes a claim when Purview submits it."],["Invoice","The billing record NikoHealth creates once an order is shipped, with an Invoice ID and an Order ID."],["Ready to Fulfill","The order status that tells Purview the paperwork is complete and billing can start."],["– PV","The tag at the end of every note that shows Purview did the work."]],
  tips:["If an order is still New, it is not ours yet. Do not start it; the client moves it to Ready to Fulfill.","Before you work any claim, check that it was billed through NikoHealth. For DOS in November 2025 and earlier, another billing company billed some items, and those claims are not ours."],
  remember:"New → Ready to Fulfill (client) → validate, set up, ship, submit (Purview) → follow up → Closed. Every step leaves a note ending in – PV.",
  source:SRC_FLOW+" "+SRC_NAV},
 {id:"hag-roles",title:"Who does what: Purview and the client",
  keywords:["purview responsibility","client responsibility","hagion responsibilities","turnaround time","tat 24 hours","24 hours","who uploads authorization","who gets authorization","portal access","client intervention report","weekly report","patient contact spreadsheet","dos since october 2025","ar scope hagion","aging 30 days"],
  line:"Purview validates and submits every Ready to Fulfill order within 24 hours and works the AR for dates of service from 1 October 2025. The client gets the authorizations, uploads the documents, moves orders to Ready to Fulfill, and answers the client intervention report.",
  body:[
   "**Submission, Purview’s part.** Validate and process every order in **Ready to Fulfill** within a 24-hour turnaround, so it is complete, accurate and compliant before it becomes a claim. Submit only to a payer with a valid authorization, using the ship date as the date of service.",
   "**Submission, the client’s part.** Move New orders to Ready to Fulfill, obtain the authorizations, upload the supporting documents (the Title 19 form, the authorization and the rest) into NikoHealth, and send anything extra Purview asks for.",
   "**AR, Purview’s part.** Follow up claims with **DOS from 1 October 2025**: claim follow-up, denials and payment tracking. Work every claim aged **more than 30 days**, based on the Submitted status in NikoHealth, through Availity, My CGS, WellMed and the payer portals. Check rejections and denials daily once a claim shows Submitted. Clean up pending EOBs and ERAs so balances are right. Appeal with the standard cover sheet. Close the invoice once paid, after documenting the payment and the patient responsibility.",
   "**AR, the client’s part.** Give access to the payer portals, review the client intervention report and respond, and supply information or documents when a follow-up needs them.",
   "**What goes back to the client.** Accounts that need patient contact, active insurance details, or patient billing go on the shared spreadsheet. Weekly, Purview sends a production report and a client intervention report."
  ],
  compare:{title:"The split of work",head:["Task","Purview","Client"],rows:[["Move orders from New to Ready to Fulfill","—","Yes"],["Authorizations","Bill only where a valid one exists","Obtain and upload"],["Title 19 form and documents","Check every order against them","Upload into NikoHealth"],["Validate and submit orders","Yes, within 24 hours","—"],["AR follow-up and denials","Yes, DOS from 1 Oct 2025, over 30 days old","Answer questions, give portal access"],["Patient contact, insurance updates, patient billing","List on the spreadsheet","Handle"],["Weekly reports","Send production and client intervention reports","Review and respond"]]},
  terms:[["TAT","Turnaround time: here, 24 hours from Ready to Fulfill to a validated, submitted order."],["Client intervention report","The weekly list of accounts that need the client’s decision or action."],["Aging","How old a claim is; Hagion AR works claims older than 30 days."]],
  tips:["A missing authorization or Title 19 form is the client’s to fix. Ask for it; never submit without it.","The 24 hours start when the order turns Ready to Fulfill, not when you open it."],
  remember:"Ready to Fulfill to submitted in 24 hours. AR from DOS 1 Oct 2025, claims over 30 days. Client: authorizations, uploads, answers.",
  source:SRC_FLOW},
 {id:"hag-dme",title:"Medical-supply basics: rental or purchase, Title 19, and Medicare files",
  keywords:["rental or purchase","rental","purchase","capped rental","title 19","title xix","form 19","title 19 form","authorization","medicare file","how to identify medicare","delivery form","dme prescription","incontinence supplies","briefs","pull ups","underpads","wipes","does medicare cover incontinence","texas medicaid plans","superior","molina"],
  line:"Each item is billed either as a rental or as a purchase. Texas Medicaid orders arrive with a Title 19 form and an authorization; Medicare orders arrive with two delivery forms and a DME prescription instead.",
  body:[
   "**Rental or purchase.** HCPCS codes on the all-payer **Rental Category** list are billed as rentals; every other code is billed as a purchase. Superior and Molina are the exception: every claim to them is a **purchase**, never a rental, so never use the RR modifier for them.",
   "**Capped rental (Medicare).** Medicare rents some equipment month by month for up to 13 months, then the patient owns it. Each month’s claim carries modifiers that say which month it is; the Hagion billing module has the table.",
   "**The Title 19 (Title XIX) form.** The Texas Medicaid physician order form for equipment and supplies. It lists what was ordered, and Purview uses it to confirm the HCPCS codes and the charges on every order before submitting. The expected amount entered for each code comes from it too.",
   "**Authorization.** Submit only to a payer for which a valid authorization exists. When a patient has more than one insurance, bill the one whose authorization was approved. The ship date used as the date of service must fall inside the authorization’s date range.",
   "**Spotting a Medicare file.** It has **no authorization form and no Title 19 form**. Instead it holds two delivery forms and a prescription titled ‘Durable Medical Equipment Prescription / Order’.",
   "**Incontinence supplies.** Briefs and pull-ups (T codes), underpads (A4554) and wipes (A4335) are Medicaid items here. **Medicare does not cover incontinence supplies**, so they are never billed to Medicare. They also do not need an authorization, which matters when a payer denies them for one."
  ],
  compare:{title:"The payers you will see most",head:["Payer","What to know"],rows:[["Medicare","No authorization or Title 19 form; two delivery forms and a DME prescription. Rentals carry RR plus a month modifier plus KX. No incontinence supplies. Status and EOBs on My CGS."],["Superior (Texas Medicaid plan)","Purchases only, never RR. Appeal any denial. The client’s Superior contract ends in November 2026, so every submission must be right."],["Molina (Texas Medicaid plan)","Purchases only, never RR. Briefs and pull-ups (T codes) go without modifiers."],["TMHP (Texas Medicaid)","Never submitted through NikoHealth; the two systems do not talk. Submit in the TMHP portal."]]},
  terms:[["HCPCS","The code set for equipment and supplies, such as A4554 for underpads or T-codes for briefs."],["Rental Category list","The all-payer list of HCPCS codes that are billed as rentals."],["Capped rental","Medicare equipment rented month by month for up to 13 months."],["Title 19 (Title XIX) form","The Texas Medicaid order form listing the items, codes and charges; every order is checked against it."],["TMHP","Texas Medicaid & Healthcare Partnership, which runs Texas Medicaid’s own claims portal."],["Superior and Molina","Texas Medicaid managed care plans; most Hagion volume goes to them."]],
  tips:["No Title 19 form and no authorization in the file? Check for two delivery forms and a DME prescription: it is a Medicare order.","Incontinence supplies on a Medicare order are a red flag. Medicare will not pay them; ask before you bill."],
  remember:"Rental list → rental; everything else → purchase; Superior and Molina → always purchase. Medicaid file: Title 19 plus authorization. Medicare file: two delivery forms plus a DME prescription.",
  source:SRC_FLOW+" "+SRC_TRACK}
]},
{id:"hag-b",short:"NikoHealth",title:"NikoHealth, screen by screen",blurb:"Logging in, finding the patient, setting up an order, billing it, and writing the note.",lessons:[
 {id:"hag-niko-patient",title:"Logging in and finding the patient",
  keywords:["niko","nikohealth","niko health","login niko","niko dashboard","main menu niko","patients tab","patient search","search patient niko","patient demographics","prescriptions","insurance information","medical records","add diagnosis patient","documents tab"],
  line:"Log in, check the dashboard, then use the three main menus at the top: Patients for people and paperwork, Orders for what was ordered, Billing for claims, invoices and payments.",
  flow:{steps:["Open the NikoHealth login page, enter your username and password, click **Login**","Review the **Dashboard**","Click **Patients** in the main menu","Search by **patient name**, **patient ID** or **date of birth**","Select the record: the **Patient Demographics** screen opens"]},
  body:[
   "**The main menu.** Across the top of the screen: **Patients** (profiles, demographics, documents), **Orders** (new and existing orders) and **Billing** (claims, invoices and payments).",
   "**Patient Demographics has five sections.** **Patient Details** to view and update basic information. **Prescriptions**, active and past. **Insurance Information**, where you add a new insurance or remove an old one. **Medical Records**, where you add or update the diagnosis (DX) codes and medications exactly as the Title 19 form shows them. **Documents**, for anything else that belongs on the record.",
   "**Why the DX lives here first.** When you bill an order and the diagnosis you need is not in the list, it is because it is not on the patient yet. Add it in Medical Records, then go back to the order and pick it."
  ],
  terms:[["Dashboard","The first screen after login; a summary of what needs attention."],["Patient Demographics","The patient’s main screen, with Details, Prescriptions, Insurance, Medical Records and Documents."],["Medical Records","Where diagnosis codes and medications are added, matching the Title 19 form."]],
  tips:["Search by name and date of birth together when two patients share a name.","Your login is yours alone. Never share it or work in someone else’s session."],
  remember:"Patients → search by name, ID or DOB → Demographics: Details, Prescriptions, Insurance, Medical Records, Documents.",
  source:SRC_NAV},
 {id:"hag-niko-order",title:"Setting up an order: items, codes, charges, ship date",
  keywords:["orders tab","ready to fulfill filter","modify order","cost sharing","cost sharing tab","add items","view suggested price","suggested price","charges and expected amount","expected amount","apply to all","rental or purchase option","quick ship","ship date","non inventoried","shipping label","date of service niko","dos ship date","order setup","dos for orders","dos for hagion orders","hagion dos","what is the dos","which date is the dos","date of service hagion","date of service for orders"],
  line:"Open the Ready to Fulfill order, set up every item on the Cost sharing tab to match the Title 19 authorization, enter charges equal to the expected amount, save, then Quick Ship it with the ship date as the date of service.",
  flow:{steps:["**Orders** → filter the status to **Ready to Fulfill** → select the order","Click **Plus (+)** → **Modify** → **Cost sharing** tab","Add the items and check they match the Title 19 authorization","Enter the **HCPCS** code for each item and the **diagnosis (DX)** code → **Next**","Choose the insurance to bill → **Apply to all** (bill the payer that holds the valid authorization)","Click the **$** on each item and turn **off** View Suggested Price","Choose **rental** or **purchase**","Enter the **Charges** and the **Expected amount** for each HCPCS from the Title 19 form → **Save**","**Plus (+)** → **Quick Ship** → delivery method **Non-Inventoried**","Ship Date = the **DOS** or an earlier date, inside the authorization’s date range → Shipping label **N/A**"],to:"Billing: the shipped order appears with its Invoice ID and Order ID"},
  body:[
   "**Charges equal the expected amount.** If the item is charged at $350, the expected or allowed amount is $350 as well. Matching them removes any reason for the payer to cut the payment and gets the full value of the claim from the start. Turning off View Suggested Price keeps NikoHealth’s suggested prices from replacing the Title 19 figures.",
   "**Which date is the DOS.** The ship date is used as the date of service. To set it, check the supply sheet’s shipping date first. If there is none, use the delivery form. If neither exists, use the current or the previous day’s date. Whatever you pick must fall inside the authorization’s dates.",
   "**After shipping.** The order moves to the Billing tab with an Invoice ID and an Order ID, ready for the diagnosis, modifiers and authorization numbers."
  ],
  terms:[["Cost sharing tab","The order screen where items, HCPCS codes, insurance, rental or purchase, and charges are set."],["View Suggested Price","NikoHealth’s own price suggestion; switched off so the Title 19 charges stand."],["Quick Ship","The step that marks the order shipped so it can be billed."],["Non-Inventoried","The delivery method used for these orders."]],
  tips:["Every item on the order must match the Title 19 authorization. An extra or missing item is a question for the client, not a guess.","Bill the insurance that holds the valid authorization, even when the patient has more than one plan."],
  remember:"Ready to Fulfill → Modify → Cost sharing: items, HCPCS, DX, insurance, View Suggested Price off, rental or purchase, charges = expected → Save → Quick Ship with ship date = DOS.",
  source:SRC_NAV+" "+SRC_TRACK},
 {id:"hag-niko-billing",title:"Billing the order: diagnosis, modifiers, authorization numbers, submit",
  keywords:["billing tab","billing navigation","add dx code","diagnosis on order","add modifier niko","modifier per line","authorization number","prior authorization number","authorization for entire order","authorization for specific item","submit order","submit claim niko","finalize order"],
  line:"In Billing, open the order, add the diagnosis, add modifiers line by line, enter the authorization number for the whole order or for one item, save, check everything, then submit.",
  flow:{steps:["Click **Billing**: the screen shows the order’s charges, date of service and units","Click **Plus (+)** → **Modify**","Add the **diagnosis (DX)**; if it is not listed, add it to the patient account first and come back","Add **modifiers** on each line item that needs one","Enter the **authorization number**: once for the whole order, or under one line item for a specific HCPCS","Click **Save**, verify the order details","Click **Plus (+)** → **Submit**"],to:"Notes: write ‘Billed on [date]’ and change the status to Submitted"},
  body:[
   "**Two places for the authorization number.** When one authorization covers the whole order, enter it once for the order. When a specific HCPCS code has its own authorization, enter it on that line item.",
   "**Modifiers sit on the line, not the order.** Each item gets its own modifiers, so a rental line and a purchase line on the same order can carry different ones. The Hagion billing module lists which to use.",
   "**Check before you submit.** Charges, DOS and units shown on the billing screen should match what you set up on the order and what the Title 19 form allows."
  ],
  terms:[["Line item","One item on the order, with its own HCPCS code, units, modifiers and, if needed, its own authorization number."],["Order-level authorization","One authorization number entered for every item on the order."]],
  tips:["A diagnosis that will not appear in the list is missing from the patient, not from the order. Fix the patient first.","Submit only after Save and a final check. A corrected claim later costs far more time."],
  remember:"Billing → Modify → DX → modifiers per line → authorization (order or line) → Save → verify → Submit.",
  source:SRC_NAV},
 {id:"hag-niko-notes",title:"Notes and statuses: ‘Billed on’, the subject, and – PV",
  keywords:["notes niko","notes posting","billed on","subject billing","follow up subject","denial subject","pv","- pv","purview tag","change status","status submitted","status closed","submission note","invoice number in note","note format hagion"],
  line:"Every action gets a short note on the patient account with the right subject and ‘– PV’ at the end, and the order status follows the work: Submitted when billed, Closed when paid.",
  body:[
   "**Where.** Patient account → **Notes** tab → type a short note → choose the **Subject**.",
   "**After submitting.** Write **‘Billed on [date]’** with the subject **Billing**, and change the order status to **Submitted**. The submission note must also name the **invoice number**, **where it was submitted** (NikoHealth, or the TMHP portal), the **items submitted**, and the **bill date**.",
   "**Follow-ups and denials.** Use the subject that fits the update, such as **Follow-Up** or **Denial**, and keep the note short: what you checked, what you found, what happens next.",
   "**Always end with ‘– PV’.** It shows Purview did the work. A note without it reads as the client’s.",
   "**When paid.** Document the payment details and any patient responsibility in the note, then change the status to **Closed**."
  ],
  compare:{title:"Notes that pass review",head:["Situation","Example note"],rows:[["Submitted","Billed on 10/06/2026 to Superior via NikoHealth. Invoice #[number]. Items: A4554, T-code briefs. – PV"],["Follow-up","Superior portal: claim in process, received 10/07/2026. Follow up on 10/21/2026. – PV"],["Denial worked","A4335 denied for invalid modifier. Added U9, corrected claim sent 10/08/2026. – PV"],["Paid and closed","Paid $[amount], check date [date]. Patient responsibility $0. Status changed to Closed. – PV"]]},
  terms:[["Subject","The note category: Billing, Follow-Up, Denial and so on."],["– PV","Purview’s tag at the end of every note."],["Change Status","The control on the patient account used to set Submitted or Closed."]],
  tips:["Write the invoice number, where you submitted, the items and the bill date. Those four answer most client questions.","Never close an invoice without the payment details and patient responsibility in the note."],
  remember:"Short note, right subject, ends in – PV. Billed → ‘Billed on [date]’ + Submitted. Paid → payment documented + Closed.",
  source:SRC_NAV+" "+SRC_TRACK}
]},
{id:"hag-c",short:"Hagion billing",title:"Billing rules: checks, modifiers and payers",blurb:"The checks before every submission, the modifier rules for rentals, purchases and supplies, and what each payer expects.",lessons:[
 {id:"hag-submit-checks",title:"Before you submit: the checks every order passes",
  keywords:["before submission","submission checks","validate order","form 19","title 19 check","expected amount","charge equals expected","multiple insurance","which insurance to bill","valid authorization","date of service rule","supply sheet","delivery form","24 hour","tmhp orders","tmhp order","tmhp portal","submit tmhp","do not submit tmhp in niko"],
  line:"Within 24 hours of Ready to Fulfill, check the codes, the modifiers, the Title 19 match, the charges and the authorization, then submit with the ship date as the DOS.",
  flow:{steps:["Right **HCPCS** code for every item; rental-list codes as rentals, the rest as purchases","Right **modifiers** for the payer and the item","Validate against the **Title 19 form**: codes and charges","**Expected amount = charge**, both from the Title 19 form","A **valid authorization** exists for this payer; with several insurances, bill the one whose authorization was approved","**Ship date = DOS** or earlier, inside the authorization dates","Not a TMHP order? Submit in NikoHealth. TMHP order? Submit in the TMHP portal instead"],to:"Submitted, with the note"},
  body:[
   "**Why charges must equal the expected amount.** A charge above the expected amount gives the payer a reason to cut the payment; matching them gets the full value from the start. The tracker’s own example: an alarm pill box charged at $350 is expected at $350.",
   "**Choosing the DOS.** Supply sheet shipping date first, then the delivery form, then the current or previous day’s date, and always inside the authorization’s dates.",
   "**TMHP orders.** Orders for Texas Medicaid itself (TMHP) are never submitted through NikoHealth, because the two systems do not communicate. They go through the TMHP portal; the fee schedules are public at public.tmhp.com/FeeSchedules."
  ],
  terms:[["Form 19","Another name for the Title 19 (Title XIX) form."],["Valid authorization","An approved authorization from the payer being billed, covering the items and the date of service."]],
  tips:["If the codes or charges on the order do not match the Title 19 form, stop and ask. Submitting a mismatch guarantees a denial.","A patient with Superior and Molina: bill the plan that approved the authorization, not the one listed first."],
  remember:"HCPCS, modifiers, Title 19, charge = expected, valid authorization, ship date = DOS. TMHP goes through its own portal.",
  source:SRC_FLOW+" "+SRC_TRACK},
 {id:"hag-modifiers",title:"Modifiers: Medicare rentals, purchases and incontinence supplies",
  keywords:["modifier","modifiers hagion","rr modifier","kh modifier","ki modifier","kj modifier","kx modifier","nu modifier","ue modifier","ga modifier","gz modifier","ua modifier","u9 modifier","capped rental modifiers","rental modifiers","medicare rental modifiers","first month rental","diaper modifier","pull up modifier","underpads modifier","wipes modifier","a4554","a4335","a6250","t codes","t series"],
  line:"Medicare rentals carry RR, a month modifier and KX; new purchases carry NU and used ones UE. Incontinence supplies follow their own rules: underpads UA, wipes U9, briefs and pull-ups no modifier at all.",
  compare:[
   {title:"Medicare capped rentals, month by month",head:["Rental month","Modifiers"],rows:[["1st month","RR KH KX"],["2nd and 3rd month","RR KI KX"],["4th to 13th month","RR KJ KX"],["If denied for the KX criteria","Use GA or GZ instead of KX"]]},
   {title:"What each modifier tells the payer",head:["Modifier","Meaning"],rows:[["RR","The item is a rental (Medicare rentals only; never for Superior or Molina)"],["KH","First month of a capped rental"],["KI","Second or third month of a capped rental"],["KJ","Months 4 to 13 of a capped rental"],["KX","All Medicare coverage criteria and medical-necessity requirements are met and documented"],["NU","New equipment, purchased outright"],["UE","Used (refurbished or reused) equipment"],["GA","A waiver of liability (an ABN) is on file"],["GZ","Expected to be denied as not reasonable and necessary; no ABN on file"]]},
   {title:"Incontinence supplies (Medicaid plans)",head:["Item","HCPCS","Modifier"],rows:[["Underpads","A4554","UA"],["Wipes","A4335","U9"],["Skin protectant (when denied for an invalid modifier)","A6250","UA"],["Briefs and pull-ups","T codes","None: no NU, no KX"]]}
  ],
  body:[
   "**Rentals versus purchases.** RR marks a rental and is only used for Medicare rentals. Superior and Molina bill everything as a purchase, so RR never goes to them. A purchased item is NU when new and UE when used.",
   "**The capped-rental clock.** Medicare pays a capped rental month by month for up to 13 months. KH, KI and KJ tell Medicare which month this claim is for, and KX says the coverage criteria are documented. If Medicare denies because the KX criteria are not met, the claim goes again with GA (an ABN is on file) or GZ (no ABN) instead of KX.",
   "**Incontinence supplies.** Briefs and pull-ups go without any modifier; Molina denies T codes that carry NU or KX. Underpads take UA and wipes take U9. Medicare never gets incontinence supplies at all."
  ],
  terms:[["ABN","Advance Beneficiary Notice: the Medicare waiver a patient signs before a service that may not be covered; GA says one is on file."],["Capped rental","Medicare equipment rented for up to 13 months; each month has its own modifier."],["T codes","The Medicaid HCPCS series for adult briefs and pull-ups."]],
  tips:["Read the payer before the modifier. The same item is RR with Medicare and a plain purchase with Superior or Molina.","An invalid-modifier denial on supplies has a fixed fix: A4335 gets U9; A4554 and A6250 get UA; Molina T codes lose their modifiers. Then send a corrected claim."],
  remember:"Medicare rental: RR + KH (month 1), KI (2–3), KJ (4–13) + KX; GA/GZ if KX is denied. Purchase: NU new, UE used. Underpads UA, wipes U9, briefs and pull-ups none.",
  source:SRC_FLOW+" "+SRC_TRACK},
 {id:"hag-payers",title:"Payer rules: Medicare, Superior, Molina and TMHP",
  keywords:["payer rules hagion","medicare hagion","superior","superior healthplan","molina","tmhp","texas medicaid","superior appeal","superior contract","coverage terminated superior","coverage terminated molina","molina rules","medicare partially paid","which payer first","work priority hagion","old inventory"],
  line:"Most of the work is Superior and Molina, oldest claims first. Superior denials are appealed, TMHP claims never go through NikoHealth, and Medicare neither covers incontinence supplies nor gets chased for small partial payments: it is adjusted.",
  compare:{title:"Payer by payer",head:["Payer","Rules from the SOPs and the tracker"],rows:[["Medicare","Spot it by the two delivery forms and the DME prescription. Rentals: RR + month modifier + KX. No incontinence supplies. A partially paid Medicare claim is adjusted (September 2026)."],["Superior","Purchases only, never RR. Any denial is appealed. Coverage terminated: check whether Superior or Molina is active; if active, submit only the codes that need no authorization. The client’s Superior contract ends in November 2026."],["Molina","Purchases only, never RR. T codes without modifiers. Coverage terminated: same check as Superior."],["TMHP","Not through NikoHealth; submit in the TMHP portal. Fee schedules at public.tmhp.com/FeeSchedules."],["Any payer","Eligibility can be checked in NikoHealth. Status and EOBs on Availity, My CGS, WellMed and the plans’ portals."]]},
  body:[
   "**Where the work is.** Since August 2026 the instruction is to work mostly on **Superior and Molina**, and to clear the **old inventory** first. Earlier, in January 2026, January dates of service were the priority.",
   "**Superior is time-sensitive.** The client’s Superior contract ends in November 2026, so Superior submissions must go out right the first time.",
   "**Coverage terminated on a Medicaid plan.** Check whether the member is active with Molina or Superior. If active, resubmit only the codes that do not need an authorization; the others need the authorization from the plan that is active."
  ],
  terms:[["Superior","Superior HealthPlan, a Texas Medicaid managed care plan."],["Molina","A Texas Medicaid managed care plan."],["My CGS","The Medicare equipment contractor’s portal used for Medicare status and EOBs."],["Old inventory","Claims that have waited longest without resolution; worked first."]],
  tips:["When a Superior claim denies, the default is an appeal with the standard cover sheet, not a phone call to argue.","Never bill incontinence supplies to Medicare. If one slipped through, it is a corrected-routing problem, not an appeal."],
  remember:"Superior: appeal, and get it right before November. Molina: no modifiers on T codes. TMHP: its own portal. Medicare: no incontinence; partial payment adjusted.",
  source:SRC_FLOW+" "+SRC_TRACK}
]},
{id:"hag-d",short:"Hagion AR",title:"AR follow-up, denials and closing invoices",blurb:"The daily AR routine, the denial rules one by one, and when an invoice is closed.",lessons:[
 {id:"hag-ar",title:"The AR routine: daily, weekly, and what counts as follow-up",
  keywords:["ar routine hagion","ar workflow","daily checks","rejections","rejected status","clearinghouse rejection","rejected claims","availity","my cgs","wellmed","payer portals","eob cleanup","era","pending eob","standard cover sheet","appeal cover sheet","weekly report","paid claim list","november 2025 claims","other billing company","eligibility niko"],
  line:"Every day: check rejections, denials and new EOBs for submitted claims. Work claims over 30 days old with DOS from 1 October 2025. Weekly: send the production and client intervention reports.",
  flow:{steps:["Daily: once a claim shows **Submitted**, check Availity and the payer portals for **rejections and denials**","Daily: check the portals, the clearinghouse and NikoHealth for **new EOBs**, and clear pending EOBs and ERAs","Work claims **over 30 days** old (DOS from **1 October 2025**) by their Submitted status: Availity, My CGS, WellMed, payer portals","Fix what you can under the rules; appeal with the **standard cover sheet**","Patient contact, insurance updates or patient billing needed → the **shared spreadsheet**","Paid → document the payment and patient responsibility → **Closed**","Weekly: **production report** and **client intervention report**"]},
  body:[
   "**‘Rejected’ in Billing.** A Rejected status means the claim was stopped at the **clearinghouse**, before it reached the payer. Most of the time the cause is an **outdated or invalid diagnosis code**. Filter Billing by Rejected and rework those claims promptly with a valid diagnosis.",
   "**Old claims that are not ours.** For DOS in **November 2025 and earlier**, JOPPA used a different billing company for some items. Ignore any claim in the portal from those months that was not billed through NikoHealth.",
   "**The Paid Claim List.** When a claim is paid, look at the check date. If it falls between **1 October 2025 and 31 January 2026**, the claim goes on the Paid Claim List.",
   "**Eligibility.** You can verify eligibility inside NikoHealth before you chase a payer about coverage."
  ],
  terms:[["Clearinghouse rejection","A claim stopped before it reached the payer; shown as Rejected in Billing."],["ERA","Electronic remittance advice: the electronic EOB."],["Standard cover sheet","The template that goes on top of every appeal."],["Paid Claim List","The list of claims paid with check dates from 1 Oct 2025 to 31 Jan 2026."]],
  tips:["Rejected is not denied. The payer has never seen a rejected claim, so fix the diagnosis and resubmit fast.","A clean EOB queue means true balances. Pending EOBs left unposted make every AR number wrong."],
  remember:"Daily: rejections, denials, EOBs. Work DOS from 1 Oct 2025 over 30 days. Rejected = diagnosis problem at the clearinghouse. Weekly: two reports.",
  source:SRC_FLOW+" "+SRC_TRACK},
 {id:"hag-denials",title:"Denials, rule by rule",
  keywords:["denial hagion","denials hagion","invalid modifier denial","denied invalid modifier","denied for invalid modifier","t codes invalid modifier","molina denied t codes","molina denied","molina t codes denied","dx invalid","invalid diagnosis","authorization denial incontinence","incontinence no authorization","covered by another payer","need primary eob","primary eob","duplicate denial","maximum benefits exhausted","units exceeded","timely filing hagion","tfl expired","partially paid 70","70 percent","reprocessing","ask for reprocessing","corrected claim hagion","superior denied","coverage terminated","close the claim"],
  line:"Most Hagion denials have a fixed answer in the tracker: correct and resubmit, ask the payer to reprocess, appeal, or close. Find the denial in the table and follow it exactly.",
  compare:{title:"The denial rules",head:["Denial or situation","What to do"],rows:[
   ["Rejected in Billing (clearinghouse)","Usually an outdated or invalid diagnosis: correct the DX and resubmit."],
   ["Invalid diagnosis (DX) denial","Billing → filters: find a paid claim for the same HCPCS with a valid DX, change the DX to that one, and send a corrected claim."],
   ["A4335 (wipes) denied for invalid modifier","Use U9 and send a corrected claim."],
   ["A4554 (underpads) or A6250 denied for invalid modifier","Use UA and send a corrected claim."],
   ["Molina denies T codes for invalid modifier","Remove NU and KX; send a corrected claim with no modifiers."],
   ["A4335, A4554 or T codes denied for authorization","Incontinence supplies need no authorization: ask the payer to send the claim back for reprocessing."],
   ["A4335 or A4554 denied as covered by another payer, but the T codes on the claim paid","Ask the rep to reprocess: the same payer already paid the other codes."],
   ["Partially paid, one or two codes denied for ‘need primary EOB’","Ask for reprocessing, since a payment was received. Do not add it to client assistance."],
   ["Superior denies for any reason","Appeal, with the standard cover sheet."],
   ["Superior or Molina: coverage terminated","Check whether Molina or Superior is active; if active, submit only the codes that need no authorization."],
   ["Two claims, same patient, DOS and HCPCS: one paid, the other denied as duplicate","Change the denied claim from Submitted to Closed."],
   ["Maximum benefits exhausted, units exceeded, and another provider billed","Change the status from Submitted to Closed."],
   ["Timely filing expired, and it is a true denial","Note it and change the status to Closed."],
   ["Partially paid at more than 70%","Send it for posting and change the status from Submitted to Closed."],
   ["Medicare claim partially paid","Adjust the claim."],
   ["Incontinence supplies billed to Medicare","Medicare does not cover them. Do not bill them to Medicare; check the patient’s other coverage and ask the client if unsure."]
  ]},
  body:[
   "**Reprocess, correct, appeal, or close.** Ask for **reprocessing** when the payer’s own records prove it wrong: no authorization is needed, or it already paid other lines on the claim. Send a **corrected claim** when our claim was wrong: the modifier or the diagnosis. **Appeal** when the payer’s decision needs a formal challenge; for Superior that is every denial. **Close** when the tracker says the claim is finished: duplicate already paid, benefits used by another provider, true timely-filing denial, or over 70% paid.",
   "**Write the rule into the note.** ‘Closed per tracker: duplicate of paid claim, same DOS and HCPCS. – PV’ survives a review; ‘closed’ does not."
  ],
  terms:[["Reprocessing","Asking the payer to process the same claim again because its own decision was wrong."],["Corrected claim","A replacement claim fixing our own error, such as a modifier or a diagnosis."],["Client assistance","Accounts parked for the client’s decision; ‘need primary EOB’ partial denials do not go there."]],
  tips:["Before you appeal or correct, check whether other lines on the same claim were paid. A partial payment often means one call for reprocessing fixes it.","If a denial is not in the table, it is a question for the client intervention report, not a guess."],
  remember:"Our error → corrected claim. Payer’s error → reprocessing. Superior → appeal. Duplicate paid, benefits used elsewhere, true TFL, over 70% paid → Closed. Medicare partial → adjust.",
  source:SRC_TRACK},
 {id:"hag-closing",title:"Closing invoices and patient responsibility",
  keywords:["close invoice","closing invoice","closed status","patient responsibility hagion","deductible coinsurance copay","document payment","client intervention","open status accounts","when to close","patient billing hagion","spreadsheet patient"],
  line:"An invoice is closed only after the payment and the patient’s share are written in the note. When the payer applied everything to the patient’s share, the client decides, so it goes to client intervention instead.",
  flow:{steps:["Payment received → write the **payment details** and the **patient responsibility** in the note","Paid, and the rest is the patient’s deductible, coinsurance or copay (open accounts) → document and **close** the account in NikoHealth","Processed, but the whole allowed amount went to the patient’s deductible, coinsurance or copay (open accounts) → document and add to **client intervention**","Patient contact, insurance updates or patient billing needed → the **shared spreadsheet** for the client"]},
  body:[
   "**Why the split.** A paid claim with a small patient share is finished for us: the client handles patient billing. A claim where the payer paid nothing because everything went to the patient’s share needs the client’s decision first.",
   "**Status discipline.** Submitted means we are still waiting; Closed means nothing more is expected from the payer. A closed invoice with no payment note fails review."
  ],
  terms:[["Patient responsibility","The deductible, coinsurance or copay the EOB assigns to the patient."],["Client intervention","The weekly report of accounts that need the client’s decision."]],
  tips:["Copy the EOB figures into the note before you change the status, never after.","Patient billing is the client’s job here. List the account on the spreadsheet; do not bill the patient yourself."],
  remember:"Document first, then close. Paid with a patient share → close. All to the patient’s share → client intervention.",
  source:SRC_FLOW+" "+SRC_TRACK}
]},
{id:"hag-e",short:"Hagion updates",title:"The Update Tracker: what changed, and when",blurb:"Every dated rule from the tracker, newest first, and how to use it.",lessons:[
 {id:"hag-updates",title:"Every tracker update, newest first",
  keywords:["update tracker","hagion updates","latest update hagion","what changed hagion","new rule hagion","tracker","update log","source of update","internal analysis"],
  line:"New Hagion rules arrive by email, in meetings, through the SOP, or from Purview’s own internal analysis of denials. Each is logged with its date; when two entries disagree, follow the newer one.",
  compare:{title:"Update Tracker, newest first",head:["Date","Update","Source"],rows:[
   ["6 Oct 2026","Paid, and the rest is patient responsibility (open accounts): document and close in NikoHealth. Allowed amount all applied to patient responsibility: document and add to client intervention.","Tracker"],
   ["8 Sep 2026","Medicare claim partially paid: adjust it.","Meeting"],
   ["12 Aug 2026","Work mostly on Superior and Molina; clear old inventory first. The Superior contract ends in November: submit Superior correctly.","Email and meeting"],
   ["5 Aug 2026","Briefs and pull-ups: no NU or KX. Underpads: UA. The entry also says ‘U9 for diaper codes’, while every other entry gives U9 to wipes (A4335) and no modifier to briefs and pull-ups: confirm with your lead before using U9 on a brief.","Email"],
   ["30 Jul 2026","Timely filing expired and a true denial: note it and close.","Internal analysis"],
   ["21 Jul 2026","Partially paid with one or two codes denied for ‘need primary EOB’: ask for reprocessing; not client assistance.","Internal analysis"],
   ["14 Jul 2026","TMHP fee schedules: public.tmhp.com/FeeSchedules.","Email and meeting"],
   ["7 Jul 2026","Incontinence supplies denied for authorization: reprocess. Covered by another payer while T codes paid: reprocess. Duplicate of a paid claim: close. Over 70% paid: posting and close. Max benefits used by another provider: close. Superior denials: appeal. Coverage terminated: check Superior or Molina. Invalid DX: copy a paid claim’s DX, corrected claim. Eligibility can be checked in NikoHealth. Medicare does not cover A4335, A4554 or T codes.","Email, meeting, internal analysis"],
   ["28 May 2026","A6250 denied for invalid modifier: UA and a corrected claim. Molina T codes denied for invalid modifier: remove NU and KX, corrected claim.","Internal analysis"],
   ["7 May 2026","Briefs and pull-ups: no modifiers. Underpads A4554: UA. Wipes A4335: U9.","Email"],
   ["6 Mar 2026","Incontinence supplies were billed to Medicare; Medicare does not accept them.","Email"],
   ["5 Mar 2026","A4554 denied for invalid modifier: UA and a corrected claim.","Internal analysis"],
   ["20 Feb 2026","TMHP orders are not submitted through NikoHealth; use the TMHP portal.","Email"],
   ["10 Feb 2026","A4335 denied for invalid modifier: U9 and a corrected claim.","Internal analysis"],
   ["31 Jan 2026","Paid Claim List: checks dated 1 Oct 2025 to 31 Jan 2026. DOS in November 2025 or earlier not billed through NikoHealth: ignore.","Email and meeting"],
   ["30 Jan 2026","A Medicare file has no authorization or Title 19 form; it has two delivery forms and a DME prescription.","Email and meeting"],
   ["20 Jan 2026","January dates of service worked on priority.","Meeting"],
   ["January 2026","Rejected claims: fix the diagnosis. Charges equal the expected amount. Several insurances: bill the one with the approved authorization. Superior and Molina: purchases, no RR. DOS: supply sheet, then delivery form, then current or previous day. Submission notes: invoice number, where submitted, items, bill date.","Email and meeting"],
   ["18 Dec 2025","Modifier rules approved in the SOP: RR, KX, KH/KI/KJ, NU, UE.","SOP"]
  ]},
  body:[
   "**How to use the tracker.** Before working a claim type you have not seen for a while, scan the newest entries. A later entry replaces an earlier one; the SOPs give the base process and the tracker the exceptions.",
   "**Internal analysis entries.** Several rules came from Purview’s own review of denial patterns, such as the modifier fixes for A4335, A4554 and A6250. They are as binding as client instructions once they are in the tracker.",
   "**Spotted something new?** A rule you hear in a meeting is not a rule until it is in the tracker. Ask for it to be logged, and send changes for this playbook through Feedback."
  ],
  terms:[["Source of update","Where a rule came from: email, meeting, SOP, or internal analysis."],["Internal analysis","Purview’s own review of denial patterns that produced a rule."]],
  tips:["Three early entries are dated January 2025 in the tracker, before the SOP existed; they belong to January 2026 and appear here that way.","When the SOP and the tracker differ, the newer tracker entry wins."],
  remember:"Newest entry wins. Sources: email, meeting, SOP, internal analysis. Not in the tracker, not a rule yet.",
  source:SRC_TRACK}
]}
]});

/* ── Assessments: short, per module; the practice round and the process certificate draw across all five ── */
const Q=[
{t:"Hagion basics",q:"Who is the Hagion client?",correct:"Joppa Trading and Medical Supplies, a home medical supply (DME) company",wrongs:["A hospital billing group in Florida","A physician practice on athenahealth","A pharmacy benefit manager"],ex:"The Process Flow SOP is the Joppa Trading and Medical Supplies workflow; Purview bills its orders in NikoHealth."},
{t:"Hagion basics",q:"Which order status tells Purview an order is ready to be validated and submitted?",correct:"Ready to Fulfill",wrongs:["New","Submitted","Closed"],ex:"The client moves orders from New to Ready to Fulfill; Purview validates and submits them within 24 hours."},
{t:"Hagion basics",q:"What is Purview’s turnaround time for Ready to Fulfill orders?",correct:"24 hours",wrongs:["48 hours","5 business days","30 days"],ex:"The Process Flow SOP: validate and process all Ready to Fulfill orders within a 24-hour TAT."},
{t:"Hagion basics",q:"Who obtains the authorizations and uploads the Title 19 form?",correct:"The client",wrongs:["Purview","The patient","The payer"],ex:"Client responsibility: obtain authorizations and upload supporting documents such as the Title 19 form into the PMS."},
{t:"Hagion basics",q:"Hagion AR covers claims with dates of service from:",correct:"1 October 2025, once they are more than 30 days old",wrongs:["1 January 2025, any age","The first day of the current month","Only claims over 120 days old"],ex:"AR starts with DOS from 10/01/2025, and claims aged more than 30 days are worked."},
{t:"Hagion basics",q:"An order file has no authorization and no Title 19 form, but two delivery forms and a DME prescription. It is most likely:",correct:"A Medicare order",wrongs:["A Superior order","A TMHP order","An incomplete order to send back"],ex:"The January 2026 update: Medicare files have no authorization or Title 19 form; they have two delivery forms and a ‘Durable Medical Equipment Prescription / Order’."},
{t:"Hagion basics",q:"How are items billed to Superior and Molina?",correct:"Always as purchases, never with the RR modifier",wrongs:["As rentals with RR","As rentals for the first three months","As purchases only if the item is new"],ex:"Tracker: billing to Superior and Molina, all claims are purchases, not rentals, and RR is not used."},
{t:"Hagion basics",q:"Does Medicare cover incontinence supplies such as A4335, A4554 and the T codes?",correct:"No, never bill them to Medicare",wrongs:["Yes, with the KX modifier","Yes, after the first month","Only with an authorization"],ex:"Tracker, March and July 2026: Medicare does not cover or accept incontinence supplies."},
{t:"NikoHealth",q:"Which three menus sit across the top of NikoHealth?",correct:"Patients, Orders and Billing",wrongs:["Claims, Payments and Reports","Charges, Holds and Notes","Scheduling, Clinical and Billing"],ex:"The Navigation SOP: the main menu holds Patients, Orders and Billing."},
{t:"NikoHealth",q:"You can search for a patient in NikoHealth by:",correct:"Name, patient ID or date of birth",wrongs:["Invoice number only","Phone number only","Claim number only"],ex:"Patient search uses the patient name, patient ID or date of birth."},
{t:"NikoHealth",q:"The diagnosis you need does not appear when you bill the order. You:",correct:"Add it to the patient’s Medical Records first, then return to the order and select it",wrongs:["Type it into the note","Bill without a diagnosis","Use the diagnosis from another patient"],ex:"If the DX is not visible, add the new diagnosis to the patient account, then return to the order."},
{t:"NikoHealth",q:"On the Cost sharing tab, before entering charges, you:",correct:"Turn off View Suggested Price",wrongs:["Turn on View Suggested Price","Delete the insurance","Set every item to rental"],ex:"Select the $ on the item and turn off View Suggested Price, so the Title 19 charges stand."},
{t:"NikoHealth",q:"What should the expected amount be for each HCPCS?",correct:"The same as the charge, both taken from the Title 19 form",wrongs:["Half the charge","Whatever NikoHealth suggests","Zero until the payer pays"],ex:"Charges and expected amounts come from the Title 19 guidelines and must match; that removes any reason for the payer to cut the payment."},
{t:"NikoHealth",q:"In Quick Ship, the delivery method and shipping label are set to:",correct:"Non-Inventoried and N/A",wrongs:["Inventoried and Standard","Courier and Prepaid","Pickup and None"],ex:"Quick Ship: delivery method Non-Inventoried, shipping label N/A."},
{t:"NikoHealth",q:"What ship date do you enter in Quick Ship?",correct:"The date of service or an earlier date, inside the authorization’s date range",wrongs:["Today’s date, always","The date the order was created","Any date after the authorization ends"],ex:"The ship date is the DOS or a prior date, and it must fall within the valid authorization dates."},
{t:"NikoHealth",q:"A specific HCPCS on the order has its own authorization. Where does that number go?",correct:"On that line item, in its authorization field",wrongs:["Only in the note","On the patient’s insurance screen","Nowhere; one number covers everything"],ex:"For a specific HCPCS, the authorization number goes under the corresponding line item; an order-wide one goes at the order level."},
{t:"NikoHealth",q:"Every Hagion note ends with:",correct:"– PV",wrongs:["Your initials","The invoice number","– JOPPA"],ex:"Always add – PV at the end of the note to show the work was done by Purview."},
{t:"NikoHealth",q:"You have just submitted an order. The note and status are:",correct:"‘Billed on [date]’ with subject Billing, and status Submitted",wrongs:["‘Sent’ with subject Follow-Up, status Closed","No note needed, status Ready to Fulfill","‘Billed’ with subject Denial, status New"],ex:"If the order is submitted, note ‘Billed on [date]’ using subject Billing, and change the status to Submitted."},
{t:"Hagion billing",q:"Which of these is NOT one of the checks before submitting an order?",correct:"Calling the patient to confirm delivery",wrongs:["Correct HCPCS for each item","Modifiers that fit the payer and item","Charges validated against the Title 19 form"],ex:"The checks: HCPCS, modifiers, Title 19 validation, expected amount equal to charge, valid authorization, ship date as DOS."},
{t:"Hagion billing",q:"A patient has two insurances. Which one do you bill?",correct:"The one whose authorization was approved",wrongs:["The one listed first","The one that pays more","Both at once"],ex:"Tracker: select the correct insurance to bill based on the authorization approval."},
{t:"Hagion billing",q:"There is no shipping date on the supply sheet. What do you use as the DOS?",correct:"The delivery form date; if there is none, the current or previous day’s date",wrongs:["The order creation date","The authorization start date","Leave the DOS blank"],ex:"Tracker: verify the supply sheet shipping date, then the delivery form, and if neither exists use the current or previous day’s date."},
{t:"Hagion billing",q:"An order is for Texas Medicaid itself (TMHP). How is it submitted?",correct:"Through the TMHP portal, not NikoHealth",wrongs:["Through NikoHealth like any order","Through Availity","By fax to Superior"],ex:"Tracker: TMHP orders are not submitted through NikoHealth because the two systems do not communicate."},
{t:"Hagion billing",q:"A Medicare capped rental in its first month carries which modifiers?",correct:"RR KH KX",wrongs:["RR KI KX","RR KJ KX","NU KX"],ex:"Medicare rentals: month 1 RR KH KX; months 2–3 RR KI KX; months 4–13 RR KJ KX."},
{t:"Hagion billing",q:"Month 5 of a Medicare capped rental carries:",correct:"RR KJ KX",wrongs:["RR KH KX","RR KI KX","UE KX"],ex:"KJ covers months 4 through 13 of a capped rental."},
{t:"Hagion billing",q:"Medicare denies a rental because the KX criteria are not met. The tracker says to:",correct:"Use GA or GZ instead of KX",wrongs:["Add KX twice","Switch the item to a purchase with NU","Bill the patient directly"],ex:"Medicare rentals: use GA/GZ instead of KX if denied. GA means an ABN is on file; GZ means none is."},
{t:"Hagion billing",q:"NU and UE tell the payer that a purchased item is:",correct:"NU new, UE used (refurbished or reused)",wrongs:["NU used, UE new","Both mean rented","NU non-covered, UE urgent"],ex:"The SOP: NU for new equipment purchased outright; UE for previously used equipment."},
{t:"Hagion billing",q:"Which modifier goes on underpads (A4554) for a Medicaid plan?",correct:"UA",wrongs:["U9","NU","None"],ex:"Tracker, May and August 2026: underpads A4554 take the UA modifier."},
{t:"Hagion billing",q:"Briefs and pull-ups (T codes) are billed with:",correct:"No modifier at all, not even NU or KX",wrongs:["NU KX","UA","RR"],ex:"Tracker: no modifiers for pull-up and diaper codes; Molina denies T codes that carry NU or KX."},
{t:"Hagion billing",q:"What is the current instruction on where to focus AR work?",correct:"Mostly Superior and Molina, oldest inventory first",wrongs:["Medicare only","Newest claims first","Whatever payer has the most money"],ex:"Tracker, August 2026: work mostly on Superior and Molina, and on old inventory as soon as possible."},
{t:"Hagion AR",q:"A claim shows ‘Rejected’ in the Billing tab. What usually happened?",correct:"The clearinghouse stopped it, most often for an outdated or invalid diagnosis code",wrongs:["The payer denied it for authorization","The patient refused the delivery","It was paid and needs closing"],ex:"Tracker: Rejected means a denial at the clearinghouse before reaching the payer, usually an invalid diagnosis; filter by Rejected and rework the DX."},
{t:"Hagion AR",q:"A claim is denied for an invalid diagnosis. The fix is:",correct:"Find a paid claim for the same HCPCS with a valid DX, use that DX, and send a corrected claim",wrongs:["Appeal with the same DX","Close the claim","Bill the patient"],ex:"Tracker, July 2026: check Billing filters for the same HCPCS paid with a valid DX, change the DX and submit a corrected claim."},
{t:"Hagion AR",q:"A4335 (wipes) is denied for an invalid modifier. You:",correct:"Use the U9 modifier and send a corrected claim",wrongs:["Use UA and appeal","Remove all modifiers and close","Bill Medicare instead"],ex:"Tracker, February 2026: A4335 invalid modifier → U9 and a corrected claim."},
{t:"Hagion AR",q:"A4554 (underpads) is denied for an invalid modifier. You:",correct:"Use the UA modifier and send a corrected claim",wrongs:["Use U9 and send a corrected claim","Use KX and appeal","Close the claim"],ex:"Tracker, March 2026: A4554 invalid modifier → UA and a corrected claim."},
{t:"Hagion AR",q:"Molina denies T codes for an invalid modifier. You:",correct:"Remove NU and KX and send a corrected claim with no modifiers",wrongs:["Add UA","Appeal with medical records","Change the codes to A4554"],ex:"Tracker, May 2026: remove NU and KX and submit a corrected claim without any modifiers."},
{t:"Hagion AR",q:"A4335, A4554 or T codes are denied for no authorization. You:",correct:"Ask the payer to reprocess: incontinence supplies need no authorization",wrongs:["Request a retro-authorization","Bill the patient","Close the claim"],ex:"Tracker, July 2026: incontinence supplies do not require authorization; ask to send the claim back for reprocessing."},
{t:"Hagion AR",q:"A claim was partially paid, but one or two codes were denied for ‘need primary EOB’. You:",correct:"Ask for reprocessing, and do not add it to client assistance",wrongs:["Add it to client assistance","Close it as paid","Send a corrected claim with a new DX"],ex:"Tracker, July 2026: a payment was received, so ask for reprocessing; these denials do not go to client assistance."},
{t:"Hagion AR",q:"Superior denies a claim. The rule is:",correct:"Appeal it",wrongs:["Close it","Bill Molina instead","Adjust it off"],ex:"Tracker, July 2026: if Superior denied for any reason, send an appeal."},
{t:"Hagion AR",q:"Two claims for the same patient, DOS and HCPCS: one paid, the other denied as a duplicate. You:",correct:"Change the denied claim’s status from Submitted to Closed",wrongs:["Appeal the duplicate","Resubmit the duplicate","Refund the paid claim"],ex:"Tracker, July 2026: change the denied duplicate to Closed."},
{t:"Hagion AR",q:"A claim is partially paid at more than 70%. You:",correct:"Send it for posting and change the status to Closed",wrongs:["Appeal the remaining 30%","Leave it Submitted","Add it to client intervention"],ex:"Tracker, July 2026: over 70% partially paid, send for posting and change Submitted to Closed."},
{t:"Hagion AR",q:"A Medicare claim is partially paid. The September 2026 rule is to:",correct:"Adjust the claim",wrongs:["Appeal it","Bill the patient for the rest","Leave it Submitted"],ex:"Tracker, September 2026 meeting: for Medicare claims that have been partially paid, adjust the claim."},
{t:"Hagion AR",q:"A claim paid, and the remaining balance is the patient’s deductible or copay (open account). You:",correct:"Document it and close the account in NikoHealth",wrongs:["Add it to client intervention","Appeal for the balance","Bill the patient yourself"],ex:"Tracker, October 2026: paid with the rest as patient responsibility → document and close."},
{t:"Hagion AR",q:"The payer applied the whole allowed amount to the patient’s deductible (open account). You:",correct:"Document it and add the account to client intervention",wrongs:["Close it straight away","Appeal for full payment","Write it off"],ex:"Tracker, October 2026: allowed amount fully applied to patient responsibility → document and add to client intervention."},
{t:"Hagion updates",q:"Two tracker entries disagree. Which do you follow?",correct:"The newer entry",wrongs:["The older entry","Whichever is shorter","The SOP, always"],ex:"The tracker logs rules by date; a later entry replaces an earlier one."},
{t:"Hagion updates",q:"Which of these is NOT a source of update in the tracker?",correct:"A patient’s phone call",wrongs:["Email","Meeting","Internal analysis"],ex:"Tracker sources are email, meeting, SOP and Purview’s internal analysis."},
{t:"Hagion updates",q:"A paid claim has a check date of 15 December 2025. Where else does it go?",correct:"On the Paid Claim List",wrongs:["On client intervention","On the patient spreadsheet","Nowhere"],ex:"Tracker, January 2026: paid claims with check dates from 1 Oct 2025 to 31 Jan 2026 go on the Paid Claim List."},
{t:"Hagion updates",q:"You find a portal claim with DOS October 2025 that was not billed through NikoHealth. You:",correct:"Ignore it: another billing company billed some items until November 2025",wrongs:["Work it as Hagion AR","Close it in NikoHealth","Bill it again through NikoHealth"],ex:"Tracker: for DOS in November 2025 and earlier, JOPPA used a different billing company for certain items; ignore claims not billed through NikoHealth."},
{t:"Hagion updates",q:"Why must Superior submissions be right the first time now?",correct:"The client’s Superior contract ends in November 2026",wrongs:["Superior stopped accepting appeals","Superior moved to TMHP","Superior only pays rentals"],ex:"Tracker, August 2026: Superior contract ends from November; make sure to do Superior submissions correctly."}
];
Q.forEach(x=>{ x.c="hagion"; SOP_QUIZ.push(x); });
})();
