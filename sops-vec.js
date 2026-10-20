/* Purview Gurukul — Purview SOPs: VEC client playbook (Village Eye Care).
   Built from two VEC documents: the VEC AR Work Flow SOP (version 1.0, drafted April 2026)
   and the PCC and EV Standard Operating Procedure (version 1.0, effective June 2026).
   Staff names, the contact list with its email addresses, and the screenshots are
   deliberately left out; the documents remain the source of truth.
   Loaded after sops-titan.js; it adds one client to SOP_CLIENTS and its questions to SOP_QUIZ. */
"use strict";
(function(){
if(typeof SOP_CLIENTS==="undefined"||typeof SOP_QUIZ==="undefined") return;

const SRC_AR="VEC AR Work Flow SOP, version 1.0, drafted April 2026 (internal).";
const SRC_EV="PCC and EV Standard Operating Procedure, version 1.0, effective June 2026 (internal).";

SOP_CLIENTS.push(
{id:"vec",name:"VEC (Village Eye Care)",short:"VEC",updated:"AR SOP April 2026; PCC/EV SOP June 2026",
 truth:"The VEC AR SOP and the PCC/EV SOP are the source of truth; changes are agreed on the weekly client call.",
 blurb:"Purview runs eligibility verification (EV), patient care coordination (PCC), claim submission, posting and AR for VEC, an eye care practice with several locations. Its claims are medical, vision and MNCL (medically necessary contact lens) claims. This playbook covers the front end (PCC and EV), the AR workflow and handoffs, how claims are closed, and the top denials and COB rules.",
 modules:[
{id:"vec-a",short:"VEC basics",title:"How the VEC account works",blurb:"The client, Purview’s teams and reports, the AR flow, and how claims are allocated and followed up.",lessons:[
 {id:"vec-who",title:"VEC: the client and the work",
  keywords:["vec","village eye care","vec client","who is vec","eye care client","vec process","vec teams","vec reports","vec weekly report","vec monthly report","report – pv","report pv tab","mncl","medically necessary contact lenses","vec vision claims","vec point of contact","barti","ecr vec"],
  line:"VEC is an eye care practice. Purview handles its eligibility verification (EV), patient calls and scheduling (PCC), claim submission, payment posting and AR, for three kinds of claims: medical, vision and MNCL (medically necessary contact lenses).",
  body:[
   "**The client.** VEC (Village Eye Care) is an eye care practice with several locations, each with a location manager. Patients come for routine eye exams, medical eye visits (for example a stye, redness or pink eye), contact lens fittings and co-management visits around cataract surgery.",
   "**Three kinds of claims.** **Vision** claims go to vision plans such as VSP, VSP Essential, EyeMed and Davis Vision. **Medical** claims go to medical insurance (for example UHC, or payers checked through Availity). **MNCL** claims are for medically necessary contact lenses. AR follows up all three.",
   "**Purview’s teams.** PCC and EV work before the visit (calls, scheduling, insurance checks); Submission bills the claims; Posting posts payments; AR follows up every unpaid claim. Each team has a Purview lead. On VEC’s side, a client AR contact handles client assistance and mails paper claim drafts, and an MNCL contact mails MNCL claim drafts.",
   "**Reports.** A weekly report (Submission, EV, AR and MNCL work) is discussed on the weekly call. A monthly report adds Posting and is published before the 15th of each month. Both links go in the Vision and Medical sheets under the **Report – PV** tab.",
   "**Systems.** **TriZetto** is the clearinghouse: it shows when a payer accepted a claim, holds payer reports and EOBs, and resubmits medical claims. Claim notes go in the **Barti** claim form, documents such as authorization letters are uploaded to the **ECR**, and medical records come from the exam system."
  ],
  compare:{title:"Who does what",head:["Team","Work"],rows:[["PCC (Patient Care Coordinator)","Patient calls, scheduling, demographics and insurance entry, messages and confirmations"],["EV (Eligibility Verification)","Checks medical and vision insurance and benefits before the visit"],["Submission","Bills claims, including claims AR marks Need to Submit"],["Posting","Posts payments, including paid claims AR sends over as not yet posted"],["AR","Follows every unpaid claim to payment, patient billing or an approved write-off"],["VEC client contacts","Client assistance, approvals, and mailing paper and MNCL claim drafts"]]},
  terms:[["MNCL","Medically necessary contact lenses: lenses covered because of a medical condition, billed as their own claim type."],["TriZetto","The clearinghouse: claim acceptance, payer reports and EOBs, and resubmission of medical claims."],["Report – PV","The tab in VEC’s Vision and Medical sheets where Purview’s report links go."]],
  remember:"VEC = eye care. Medical, vision and MNCL claims. Purview runs PCC, EV, Submission, Posting and AR.",
  source:SRC_AR+" "+SRC_EV},
 {id:"vec-flow",title:"The VEC AR flow, from claim to payment",
  keywords:["vec ar flow","vec workflow","vec claim lifecycle","vec payer acknowledgement","claim adjudication vec","era eob vec","payment review vec","vec paid correctly","vec underpayment","vec appeal flow"],
  line:"Every VEC claim moves the same way: submission, payer acknowledgement, adjudication, ERA/EOB, posting, then a payment review. If it was not paid correctly, AR follows it up and corrects, reprocesses or appeals it, and it goes back to the payer.",
  flow:{steps:["**Charge entry / claim submission**","**Payer acknowledgement**: the payer accepts the claim (TriZetto shows when)","**Claim adjudication**: the payer decides","**ERA / EOB received**","**Payment posting**","**Payment review**: was the claim paid correctly?","Not paid correctly → **denial or underpayment** → **AR follow-up** → **correction, reprocessing or appeal** → back to the payer"],to:"Paid correctly: close the claim"},
  body:[
   "**Paid is not the same as paid correctly.** Before closing, AR checks the payment against the EOB and what was expected, and looks for any denied line. An underpayment is worked like a denial.",
   "**Where AR starts.** AR works the outstanding AR report: claims with no response, denials and underpayments. The next topic shows how they are prioritised and how often each status is followed up."
  ],
  remember:"Submit → acknowledged → adjudicated → ERA/EOB → posted → reviewed. Not right → follow up → correct, reprocess or appeal.",
  source:SRC_AR},
 {id:"vec-allocation",title:"VEC allocation and follow-up timelines",
  keywords:["vec allocation","vec age bucket","outstanding ar report vec","vec follow up tat","vec tat","vec follow up days","vec claim in process","vec set to pay","pa filed","vec prior authorization filed","email inquiry sent","vec paper claim","vec daily allocation","vec reallocation"],
  line:"Sort the outstanding AR report by age bucket and work the oldest buckets first. Each status has its own follow-up time: vision payers are quick (2 to 15 days), medical payers mostly 20 days, and client assistance 7 days for both.",
  compare:{title:"Follow-up timelines (days)",head:["Status","Vision payers","Medical payers"],rows:[["Claim Filed","5","20"],["Claim In Process","7","20"],["Set To Pay","7","20"],["Appeal Sent","14","20"],["MR Sent","14","20"],["Email Inquiry Sent","7","—"],["Paper Claim","15","20"],["PA Filed (prior authorization filed)","2","—"],["Client Assistance","7","7"],["Corrected Claim","5","20"]]},
  body:[
   "**Weekly, then daily.** The weekly allocation is pulled from the outstanding AR report and sorted by age bucket, with priority on the older buckets. It is assigned to the team day by day; production is matched against the allocation to find what is still pending, and that is reallocated as needed.",
   "**Why the timelines differ.** Vision plans process quickly, so a vision claim in process is checked again in a week, and a filed prior authorization (PA Filed) in 2 days. Medical payers take longer, so most medical statuses wait 20 days."
  ],
  tips:["‘Set To Pay’ means the payer has approved payment: follow it up until the money arrives and is posted.","‘PA Filed’ means a prior authorization has been filed with the vision plan: check it again in 2 days."],
  remember:"Oldest age buckets first. Vision: 2–15 days by status. Medical: 20 days. Client assistance: 7 days.",
  source:SRC_AR}
]},
{id:"vec-b",short:"VEC PCC and EV",title:"The front end: PCC and EV",blurb:"Patient calls and scheduling, what eligibility verification checks, and the five EV scenarios.",lessons:[
 {id:"vec-pcc",title:"PCC: calls, scheduling and patient details",
  keywords:["vec pcc","pcc vec","patient care coordinator","vec scheduling","schedule appointment vec","vec demographics","vec required fields","vec appointment types","vec self pay copay","vec new patient copay","vec established patient copay","156 copay","132 copay","pcc responsibilities","scheduler notes","vec patient notes"],
  line:"PCC (the Patient Care Coordinator team) answers and makes the patient calls, books the right appointment, enters the demographics and insurance, checks eligibility and tells the patient what they will owe. If medical insurance is missing, PCC tells the patient the copay: $156 for a new patient, $132 for an established patient.",
  compare:{title:"What PCC records",head:["Where","What"],rows:[["Demographics","First and last name, date of birth, email, cell phone, last four digits of the SSN, physical address, insurance details, and subscriber details if the patient is not the subscriber"],["Relationship column","A family member who is also a patient"],["Patient notes","Self-pay; insurance to be given at the visit; the EV notes for every scheduled patient"],["Scheduler notes","The patient’s concern for a medical or urgent visit (for example a stye, redness or pink eye)"]]},
  body:[
   "**Before booking.** Confirm the type of appointment, verify the insurance eligibility and which services the plan covers, and tell the patient any copay due at the visit.",
   "**Talk about medical billing.** While scheduling, discuss medical billing and tell the patient any medical copay. If medical insurance is missing, the copay to quote is $156 for a new patient and $132 for an established patient.",
   "**Appointment types.** Routine exam, medical concern, urgent appointment, soft or specialty contact lens dispense, dilation, Rx check, myopia/Ortho-K, lab edge down, and co-management visits for cataract surgery. Book the right doctor and location as the patient asks.",
   "**Everything else PCC handles.** Rescheduling, patient messages, receipts on request, updates on contact lens and glasses orders, sending prescriptions and portal access, confirmations, online appointment requests, faxes, voicemails, missed calls, and outbound calls for missing information."
  ],
  terms:[["Patient Care Coordinator (PCC)","The team that handles patient calls, scheduling, and patient and insurance details before the visit."]],
  remember:"Right appointment → demographics and insurance → eligibility checked and copay told → notes. Medical insurance missing: copay $156 new, $132 established.",
  source:SRC_EV},
 {id:"vec-ev",title:"EV: what to check for medical and vision insurance",
  keywords:["vec ev","ev vec","ev check","what does ev check","eligibility verification vec","vec medical insurance verification","vec vision insurance verification","vec routine exam covered","medical cpt routine cpt","policy termination date vec","which insurance primary vec","vec vision benefits","lens frames exam","essentials benefit","cl fit","retinal imaging","auth and pre","vec auth"],
  line:"EV checks every patient’s medical and vision insurance before the visit. For medical insurance it notes whether a routine exam is covered, the copay, deductible and coinsurance for both the medical and the routine CPT, the termination date and which plan is primary. For vision it uploads the benefits by category, with the Auth and PRE.",
  compare:[
   {title:"Medical insurance: what EV notes",head:["Item","Why"],rows:[["Is a routine exam covered?","Decides whether a routine visit can be billed to the medical plan"],["Copay, deductible and coinsurance, separately for the medical CPT and the routine CPT","The patient’s cost depends on the visit type"],["Policy termination date","A terminated policy cannot be billed"],["Which insurance is primary","When the patient has more than one policy"]]},
   {title:"Vision insurance: what EV uploads",head:["Benefit category","Covers"],rows:[["Lens","Glasses lenses"],["Frames","Glasses frames"],["Exam","The routine eye exam"],["Essentials","VSP’s Essential (medical eye care) benefits"],["CL Fit","Contact lens fitting"],["MNCL","Medically necessary contact lenses"],["Retinal Imaging","Photos of the retina"]]}
  ],
  body:[
   "**For every patient,** EV uploads the vision benefit details together with the authorization (Auth) and the PRE.",
   "**Why it matters later.** When a claim is denied as a routine service or as covered by another payer, AR checks the EV comments first, to see whether the claim was billed the way EV recorded the coverage."
  ],
  remember:"Medical: routine covered? cost shares for the medical and routine CPT, termination date, which is primary. Vision: seven benefit categories, plus the Auth and PRE.",
  source:SRC_EV+" "+SRC_AR},
 {id:"vec-ev-scenarios",title:"The five VEC EV scenarios",
  keywords:["vec ev scenario","ev scenarios","vec vision insurance missing","no insurance on file vec","medical insurance missing vec","vsp essential plan check","vec routine and medical insurance","text patient for insurance","voicemail then text","self pay in notes"],
  line:"Five scenarios cover what EV does: call the patient for missing insurance (and text if the call goes to voicemail), note self-pay when there is none, upload only the Essential benefits and PRE when a VSP plan has Essential on a medical visit, and verify both plans on a routine visit with both.",
  compare:{title:"The five EV scenarios",head:["#","Situation","Action","If no answer, or the outcome"],rows:[["1","Routine exam; vision insurance missing; medical insurance on file","Check whether the medical plan covers a routine exam; if not, call the patient for the vision insurance","Text the patient for the vision insurance details"],["2","No insurance on file","Call for both medical and vision insurance","Text for both; if the patient has none, note self-pay"],["3","Medical exam; medical insurance missing; vision insurance on file","Call for the medical insurance","Text for the medical insurance details"],["4","Medical exam; medical insurance and VSP","Check whether the VSP plan includes Essential","If it does, upload only the Essential benefits and the PRE"],["5","Routine exam; routine (vision) and medical insurance","Verify both","Upload the PRE, the Lens, Frames, Exam and Essentials benefits, and the Auth"]]},
  body:[
   "**Call first, then text.** Whenever EV needs insurance details from a patient, it calls; if the call goes to voicemail, it sends a text asking for the same details.",
   "**Self-pay is written down.** If the patient confirms they have no insurance for the visit, EV records self-pay in the patient notes."
  ],
  remember:"Missing insurance → call, then text. None → self-pay in the notes. Medical visit with VSP → check for Essential. Routine visit with both → verify both, upload the PRE, benefits and Auth.",
  source:SRC_EV}
]},
{id:"vec-c",short:"VEC AR",title:"Working VEC AR",blurb:"How a claim is worked, client assistance and handoffs to other teams, and the three ways a claim is closed.",lessons:[
 {id:"vec-ar-work",title:"Working a VEC claim: TriZetto, portals, calls and notes",
  keywords:["vec ar workflow","trizetto","trizetto accepted","trizetto payer reports","vec payer portal","uhc portal vec","availity vec","call payer vec","barti claim form","vec claim notes","vec claim status"],
  line:"Start in TriZetto: when did the payer accept the claim, and is an EOB in the payer reports? No response → check the payer’s portal (for example UHC or Availity); no status there → call the payer. Then take the next action and note it in the Barti claim form.",
  flow:{steps:["**TriZetto**: confirm when the payer accepted the claim for processing","EOB posted in TriZetto → read it in the **payer reports**","Accepted but no response → check the **payer portal** (for example UHC, Availity)","No status on the portal → **call the payer**","Status confirmed → take the **next action** for the scenario","Update the **notes in the Barti claim form**"],to:"The claim’s next status and follow-up date"},
  body:[
   "**Not on file?** If the payer has no record of the claim, follow the Claim Not on File steps: look for the clearinghouse proof of acceptance before refiling.",
   "**A note every time.** Whatever the outcome (in process, set to pay, denied, not on file), the note goes in the claim form so the next person sees the history."
  ],
  remember:"TriZetto → payer reports → payer portal → call → act → note in the claim form.",
  source:SRC_AR},
 {id:"vec-handoffs",title:"VEC client assistance and handoffs to other teams",
  keywords:["vec client assistance","client assistance sheet","location manager","vec adjustment approval","vec patient billing approval","vec dx review","need to submit","vec internal sheet","need to contact patient","vec pcc follow up","sent to posting","posting eod path","vec 48 hours","vec weekly meeting"],
  line:"When AR needs something from VEC (an approval, a DX review, records or a paper claim filed), it asks the client AR contact and the location manager by chat and, if there is no answer, logs the claim on the Client Assistance sheet. Work for other Purview teams goes through the VEC internal sheet: Need to Submit, Need to Contact Patient, Sent to Posting.",
  compare:[
   {title:"Client assistance: when AR needs VEC",head:["Need","Examples"],rows:[["An approval","Patient billing approval, adjustment approval"],["A clinical or coding check","DX review"],["Documents","Specific medical records, filing-related materials, an ECR that AR cannot find"],["Paper claims","Filing a paper claim once billing sends the draft"]]},
   {title:"Handoffs to other Purview teams",head:["AR action","Where it goes","Who acts"],rows:[["Need to Submit (claim not on file)","VEC internal sheet, plus an email giving the number of claims and the date added","Submission submits and adds the comment and date"],["Need to Contact Patient","VEC internal sheet, PCC tab, plus an email to the PCC team","PCC follows up with the patient and adds the comment and date"],["Sent to Posting (paid but not posted)","EOB uploaded to the Posting EOD path; VEC sheet, Posting tab","Posting posts it and updates the details"]]}
  ],
  body:[
   "**The client assistance routine.** Send a chat to VEC’s AR contact and the location’s manager. If they answer, work the claim as they say. If not, add it to the **Client Assistance sheet**, which is updated every Wednesday, payer by payer.",
   "**48 hours.** Each handoff email must be closed within 48 hours; if it will take longer, send an email saying so. Open items from every handoff are reviewed in the weekly meeting."
  ],
  remember:"Need VEC → chat → no answer → Client Assistance sheet (Wednesdays). Need a Purview team → VEC internal sheet and an email → 48 hours.",
  source:SRC_AR},
 {id:"vec-closure",title:"Closing a VEC claim: paid, patient billable or uncollectable",
  keywords:["vec claim closure","close claim vec","paid closed vec","patient billable","vec patient responsibility","uncollectable","vec uncollectible","vec write off","rca root cause analysis","preventive action","vec contractual adjustment","cob before patient"],
  line:"A claim closes one of three ways: paid (posted correctly, no insurance balance left), patient billable (the payer assigned patient responsibility and no other insurance applies), or uncollectable (every follow-up and appeal done, and the write-off approved by the client).",
  compare:{title:"The three ways a claim closes",head:["Outcome","Check before closing","Status"],rows:[["Paid","Payment posted correctly against the EOB/EFT, not underpaid, no denied line, contractual applied, no insurance balance","Paid/Closed"],["Patient billable","The EOB shows the patient’s copay, deductible or coinsurance; any other active insurance billed first (COB); payment and contractual applied; the balance moved to patient billing","Patient Responsibility"],["Uncollectable","All follow-ups and appeals done; the root cause analysis (RCA) and preventive action sent to the office; client approval obtained; write-off applied","Uncollectable/Closed"]]},
  body:[
   "**Underpayments are not closed as paid.** Verify the payment is correct and not an underpayment, and review the claim for denials before closing it.",
   "**COB before the patient.** If another active insurance exists, bill that COB claim before billing the patient.",
   "**Learn from write-offs.** For an uncollectable claim, send the office the root cause and the preventive action, so the same error does not happen again."
  ],
  remember:"Paid: correct, no denials, no insurance balance. Patient billable: COB first, then the patient. Uncollectable: every appeal done, RCA sent, approval obtained.",
  source:SRC_AR}
]},
{id:"vec-d",short:"VEC denials",title:"Top denials and COB",blurb:"Routine exams denied by medical plans, COB between medical and vision plans, claims not on file, other-payer denials and medical-records requests.",lessons:[
 {id:"vec-pr96",title:"VEC routine exams denied by medical (PR-96)",
  keywords:["vec pr 96","vec pr96","vec routine denied by medical","vec routine exam denied","vec routine denial","billed as per ev","vec ev comments","refile with coding change","appeal with copy of benefits","vsp essential","transfer to vsp","another vision plan"],
  line:"When a medical plan denies a routine exam as PR-96, first check that the claim was billed as the EV said. If it was, call for reprocessing; if the payer refuses, see whether a coding change allows a refile, and otherwise appeal with a copy of the benefits. If routine is not covered and the DX is medical, check for VSP Essential; without it, transfer the claim to VSP or another vision plan.",
  flow:{steps:["Check the **EV comments**: was the claim billed the way EV recorded the coverage?","Not billed per EV → check whether Purview billed it, confirm the right coverage, and send feedback to the internal team","Billed per EV and still denied → **call the payer** to reprocess","Payer refuses → can a **coding change** be made? Yes → refile","No coding change → **appeal** with a copy of the benefits","Routine not covered and the **DX is medical** → does the patient have **VSP Essential**? Yes → bill it; no → transfer to **VSP or another vision plan**"],to:"Note it in the claim form tab"},
  body:[
   "**Why this happens.** A routine eye exam is often not a benefit of the medical plan. EV records whether the medical plan covers a routine exam, so that record is the first thing to check."
  ],
  remember:"PR-96 on a routine exam → billed per EV? → call → coding change → appeal with the benefits → medical DX: VSP Essential, otherwise VSP or another vision plan.",
  source:SRC_AR},
 {id:"vec-cob",title:"VEC COB: medical first, then VSP Essential or VSP",
  keywords:["vec cob","cob claims vec","vec bill medical first","medical diagnosis eye exam","vsp essential cob","ptr","vec patient responsibility after medical","bill regular vsp","eyemed cob","davis vision cob","dv cob","refraction adjust","refraction charge"],
  line:"When the exam finds a medical diagnosis and the patient has medical insurance, bill medical first. If medical leaves patient responsibility (all applied to the deductible, or a partial payment), bill VSP Essential if the patient has it, otherwise the regular VSP plan. EyeMed and Davis Vision do not take COB claims: adjust the refraction charge and bill the rest to the patient.",
  compare:{title:"After medical pays, or applies it to the deductible",head:["Patient’s vision plan","What to do with the patient responsibility"],rows:[["VSP with Essential","Bill VSP Essential"],["VSP without Essential","Bill the regular VSP plan"],["EyeMed or Davis Vision","No COB: adjust the refraction charge and bill the remaining patient responsibility to the patient"]]},
  body:[
   "**When it applies.** Medical goes first only when the exam finds a medical diagnosis and the patient has a medical plan.",
   "**What is left (PTR).** Medical may apply the whole amount to the deductible or pay only part. The claim then goes to VSP Essential if the patient has it, otherwise to the regular VSP plan.",
   "**EyeMed and Davis Vision (DV)** do not cover COB claims. Adjust the refraction charge and bill the remaining patient responsibility to the patient."
  ],
  terms:[["PTR","Patient responsibility left after a payer processes the claim."],["Refraction","The test that measures the glasses prescription; it is part of a routine exam."],["VSP Essential","VSP’s medical eye care benefit, billed after the medical plan when the patient has it."]],
  remember:"Medical DX and a medical plan → medical first → patient responsibility → VSP Essential, otherwise VSP. EyeMed or Davis Vision: no COB → adjust the refraction, bill the patient.",
  source:SRC_AR},
 {id:"vec-nof",title:"VEC claim not on file: proof first, then refile",
  keywords:["vec not on file","claim not on file vec","vec claim not on file","vec nof","vec clearinghouse proof","proof of submission vec","vec proof of acceptance","vec reconsideration with proof","vec tfl","vec timely filing","vsp authorization","auth letter ecr","refile through trizetto","billing team refile"],
  line:"When the payer says the claim is not on file, look in the clearinghouse for proof that the payer accepted it. With proof: push the payer on the call, and send a reconsideration with the proof if needed. Without proof: check timely filing and eligibility, then refile (through the billing team, or through TriZetto for a medical claim).",
  flow:{steps:["On the call, the payer confirms the claim is **not on file**","Check the **clearinghouse** for proof the payer accepted the claim","Proof found → probe further with the payer; send a **reconsideration with the proof** if needed","No proof → check the **timely filing limit** on the call","Check **eligibility** (by call or on the payer portal)","VSP or VSP Essential → pull the **authorization** and upload the auth letter to the **ECR**","Send the claim to the **billing team** to refile; a **medical** claim, AR refiles through **TriZetto**"],to:"Note it in the claim form"},
  body:[
   "**Why proof comes first.** The clearinghouse acceptance shows the claim reached the payer. With it, the payer can be asked to find and process the claim instead of treating it as new.",
   "**Who refiles.** AR sends the claim to the billing team to refile (the Need to Submit handoff); a medical claim AR refiles itself through TriZetto."
  ],
  remember:"Not on file → clearinghouse proof? Yes: reconsideration with the proof. No: timely filing and eligibility → (VSP: auth letter to the ECR) → refile.",
  source:SRC_AR},
 {id:"vec-other-payer",title:"VEC claims denied as covered by another payer",
  keywords:["vec covered by another payer","vec other payer denial","vec cob denial","billed per ev comment","vec claim history","same payer paid","vec reprocess","vec pcc patient follow up","vec correct payer"],
  line:"First check that the claim went to the payer the EV named; if not, correct it, bill the right payer and tell the internal team. If it did, look at recent claim history: if the same payer paid recently, call for reprocessing. If the right payer still cannot be found, task the PCC team to contact the patient.",
  flow:{steps:["Check the **EV comment**: was the claim billed to the payer EV named?","No → correct it, bill the **correct payer**, and send feedback to the internal team","Yes → check **recent claim history**: has this payer paid recently? Yes → call to **reprocess**","Correct payer still unknown after every resource → task the **PCC team** to contact the patient"],to:"Note it in the claim form"},
  body:[
   "**Why EV comes first.** When a patient has more than one policy, EV records which one is primary, so the EV comment shows which payer should have been billed.",
   "**Feedback.** If the claim went to the wrong payer, correct it and tell the internal team, so the same mistake is not repeated."
  ],
  remember:"Billed per EV? No → fix it and give feedback. Yes → this payer paid recently → reprocess. Still unclear → PCC calls the patient.",
  source:SRC_AR},
 {id:"vec-mr",title:"VEC medical-records requests",
  keywords:["vec medical records","vec mr request","vec mr sent","mr fax","mr mail","vec records packet","google drive mail","exam system records","confirm fax number vec","payer requires records vec"],
  line:"For a medical-records denial, ask the payer exactly what is needed, check the filing limit, and confirm the fax number or mailing address. Then send the records with the claim form: by fax yourself, or for mail upload the packet to the Google Drive for VEC’s AR contact to post.",
  flow:{steps:["Call the payer: which documents are needed with the records?","Check the **timely filing limit** so the records arrive in time","Confirm the **fax number or mailing address**","Download the records from the **exam system** and attach the **claim form**","**Fax** the packet, or for **mail** upload it to the Google Drive for VEC’s AR contact to mail","Status **MR Sent** (vision: follow up in 14 days; medical: 20 days)"],to:"Note it in the claim form"},
  body:[
   "**Ask before sending.** A records request can need more than the records. Confirm with the payer exactly which documents to include, so the packet is complete the first time.",
   "**Same packet, two routes.** The records from the exam system plus the claim form: AR faxes it, or uploads it to the Google Drive when it has to be mailed."
  ],
  remember:"Ask what is needed → filing limit → fax number or address → records and claim form → fax, or the Drive for mailing → MR Sent.",
  source:SRC_AR}
]}
]});

const Q=[
{t:"VEC basics",q:"What kind of practice is VEC?",correct:"An eye care practice",wrongs:["A home medical supply company","A hospital system","A physician billing group"],ex:"VEC is an eye care practice; Purview runs its EV, PCC, submission, posting and AR."},
{t:"VEC basics",q:"Which three kinds of claims does VEC AR follow up?",correct:"Medical, vision and MNCL",wrongs:["Medical, dental and pharmacy","Vision, DME and laboratory","Inpatient, outpatient and SNF"],ex:"The AR SOP covers medical, vision and MNCL claims."},
{t:"VEC basics",q:"What does MNCL stand for?",correct:"Medically necessary contact lenses",wrongs:["Medical network claim limit","Minimum non-covered liability","Monthly new claims list"],ex:"MNCL: contact lenses covered because of a medical condition."},
{t:"VEC basics",q:"Where do Purview’s report links go?",correct:"The Report – PV tab in the Vision and Medical sheets",wrongs:["The Client Assistance sheet, payer by payer","The notes in the Barti claim form","The Posting EOD path"],ex:"Weekly and monthly report links are updated under the Report – PV tab."},
{t:"VEC basics",q:"By when does Purview aim to publish the monthly report?",correct:"Before the 15th of each month",wrongs:["On the last day of the month","Every Wednesday","Within 48 hours of the weekly call"],ex:"The monthly report (Submission, EV, Posting, AR, MNCL) is published before the 15th."},
{t:"VEC basics",q:"How is the outstanding AR report sorted for allocation?",correct:"By age bucket, older buckets first",wrongs:["By payer name, A to Z","By balance, smallest first","By date of service, newest first"],ex:"Priority goes to follow-up on claims in the higher age buckets."},
{t:"VEC basics",q:"A vision claim is In Process. When is the next follow-up?",correct:"7 days",wrongs:["2 days","14 days","20 days"],ex:"Vision payers: Claim In Process 7 days; medical payers: 20 days."},
{t:"VEC basics",q:"A medical claim is In Process. When is the next follow-up?",correct:"20 days",wrongs:["7 days","5 days","14 days"],ex:"Medical payers: most statuses follow up at 20 days."},
{t:"VEC basics",q:"A prior authorization has been filed with a vision plan (PA Filed). Follow up in:",correct:"2 days",wrongs:["5 days","7 days","15 days"],ex:"Vision payers: PA Filed (prior authorization filed) is followed up in 2 days."},
{t:"VEC basics",q:"The client assistance follow-up, for vision and medical claims:",correct:"7 days for both",wrongs:["2 days for vision, 20 for medical","14 days for both","20 days for both"],ex:"Client Assistance is 7 days for vision and medical payers alike."},
{t:"VEC basics",q:"A claim shows paid. Before closing it, AR checks:",correct:"That it was paid correctly, with no underpayment or denied line",wrongs:["Only that some payment has posted against the claim in TriZetto","That the patient was sent a statement for the remaining copay","That EV uploaded the vision benefits and the Auth for the visit"],ex:"Payment review: verify the payment is correct, not underpaid, and that no line is denied."},

{t:"VEC PCC and EV",q:"Which of these is NOT one of PCC’s required patient details?",correct:"The patient’s employer",wrongs:["The last four digits of the SSN","The cell phone number","Subscriber details if the patient is not the subscriber"],ex:"Required: name, DOB, email, cell phone, last four of the SSN, address, insurance and subscriber details."},
{t:"VEC PCC and EV",q:"Medical insurance is missing. What copay does PCC quote a new patient?",correct:"$156",wrongs:["$132","$100","$75"],ex:"If medical insurance is missing, PCC tells the patient the copay: $156 for a new patient, $132 for an established patient."},
{t:"VEC PCC and EV",q:"Medical insurance is missing. What copay does PCC quote an established patient?",correct:"$132",wrongs:["$156","$150","$95"],ex:"$132 for an established patient; $156 for a new one."},
{t:"VEC PCC and EV",q:"Before scheduling, PCC must:",correct:"Verify eligibility and coverage, and tell the patient the copay",wrongs:["Collect the full visit fee from the patient in advance, by card","Send a test claim to TriZetto to check the plan is active","Upload the expected EOB to the Posting EOD path for the visit"],ex:"PCC verifies eligibility, confirms what is covered and informs the patient of any copay."},
{t:"VEC PCC and EV",q:"For a medical or urgent visit, where does PCC record the patient’s concern (for example pink eye)?",correct:"In the scheduler notes",wrongs:["In the Client Assistance sheet","In the Report – PV tab","In TriZetto"],ex:"The specific concern for medical or urgent visits goes in the scheduler notes."},
{t:"VEC PCC and EV",q:"For medical insurance, EV records the copay, deductible and coinsurance:",correct:"Separately for the medical CPT and the routine CPT",wrongs:["Only for the medical CPT code on the visit","Only for the routine CPT code on the visit","As one combined amount for the whole visit"],ex:"Cost shares are tracked separately for the medical and the routine CPT code."},
{t:"VEC PCC and EV",q:"Which of these is NOT a vision benefit category that EV uploads?",correct:"Hearing aids",wrongs:["CL Fit","Retinal Imaging","MNCL"],ex:"Lens, Frames, Exam, Essentials, CL Fit, MNCL and Retinal Imaging."},
{t:"VEC PCC and EV",q:"Along with the vision benefits, what does EV upload for all patients?",correct:"The Auth and the PRE",wrongs:["The EOB and the ERA","The claim form","The Client Assistance sheet"],ex:"Benefit details are uploaded with the authorization (Auth) and the PRE."},
{t:"VEC PCC and EV",q:"EV calls a patient for missing insurance and gets voicemail. Next?",correct:"Send a text asking for the same details",wrongs:["Mark the patient as self-pay in the notes","Cancel the appointment until they call back","Bill the medical plan on file anyway"],ex:"In every scenario: call, and if it goes to voicemail, text for the same details."},
{t:"VEC PCC and EV",q:"The patient confirms they have no insurance. EV:",correct:"Records self-pay in the patient notes",wrongs:["Cancels the appointment for that day","Checks VSP Essential for the visit","Sends it to VEC for client assistance"],ex:"Scenario 2: no insurance confirmed → documented as self-pay."},
{t:"VEC PCC and EV",q:"Medical exam, and the patient has medical insurance and VSP. EV checks:",correct:"Whether the VSP plan includes Essential",wrongs:["Whether EyeMed is also active","Whether the routine exam was already billed","Whether the patient is new or established"],ex:"Scenario 4: if the VSP plan has Essential, upload only the Essential benefits and the PRE."},
{t:"VEC PCC and EV",q:"Routine exam, and the patient has routine and medical insurance. EV:",correct:"Verifies both plans and uploads the PRE, benefits and Auth",wrongs:["Verifies only the medical plan and skips vision","Verifies only the vision plan and skips medical","Marks the visit self-pay until the patient calls"],ex:"Scenario 5: verify both; upload the PRE, the Lens, Frames, Exam and Essentials benefits, and the Auth."},

{t:"VEC AR",q:"Where does AR look first for an unpaid claim?",correct:"TriZetto: when the payer accepted the claim",wrongs:["The payer portal, before anything else","A phone call to the payer right away","The Client Assistance sheet"],ex:"Start in TriZetto: acceptance date, and the EOB in payer reports if posted."},
{t:"VEC AR",q:"The claim was accepted, but TriZetto shows no response. Next?",correct:"Check the payer portal (for example UHC or Availity)",wrongs:["Refile the same claim through TriZetto right away","Ask PCC to call the patient for new insurance","Send it to VEC on the Client Assistance sheet"],ex:"Accepted with no response → the payer-specific portal."},
{t:"VEC AR",q:"No status is available on the portal. Next?",correct:"Call the payer",wrongs:["Refile the claim","Wait another 20 days","Write the claim off"],ex:"If the portal shows no status, AR calls the payer for an update."},
{t:"VEC AR",q:"Where does AR write the claim notes?",correct:"In the Barti claim form",wrongs:["In TriZetto","In the Report – PV tab","In the Posting EOD path"],ex:"Once the status is confirmed, AR acts and updates the notes in the Barti claim form."},
{t:"VEC AR",q:"AR needs an adjustment approval from VEC. First step?",correct:"Chat the client AR contact and the location manager",wrongs:["Write it off and note the reason in the claim form","Email the Posting team and ask them to approve it","Add it to the VEC internal sheet under the PCC tab"],ex:"A chat goes to VEC’s AR contact and the location manager; no answer → Client Assistance sheet."},
{t:"VEC AR",q:"VEC does not answer the chat. AR:",correct:"Adds the claim to the Client Assistance sheet",wrongs:["Closes the claim and notes no response","Bills the balance to the patient","Waits for the next weekly client call"],ex:"No response → the claim is updated on the Client Assistance sheet."},
{t:"VEC AR",q:"How often is the Client Assistance sheet updated?",correct:"Every Wednesday, payer by payer",wrongs:["Every day, at the end of the shift","Once a month, before the 15th","Only when VEC asks for an update"],ex:"The Client Assistance sheet is updated every Wednesday and listed payer-wise."},
{t:"VEC AR",q:"AR finds the claim was never filed. Which handoff?",correct:"Need to Submit: the VEC internal sheet and an email to Submission",wrongs:["Sent to Posting: the EOB uploaded to the Posting EOD path","Need to Contact Patient: the PCC tab and an email to PCC","Client Assistance: a chat to VEC, then the assistance sheet"],ex:"Not on file → Need to Submit: added to the VEC internal sheet; Submission is emailed."},
{t:"VEC AR",q:"A claim is paid but not posted. AR:",correct:"Uploads the EOB to the Posting EOD path and sets Sent to Posting",wrongs:["Posts the payment itself in the Barti claim form","Closes the claim as paid and notes the check number","Adds it to the Client Assistance sheet for VEC to post"],ex:"Paid but unposted → EOB to the Posting EOD path, status Sent to Posting."},
{t:"VEC AR",q:"Within how long must a handoff email be closed?",correct:"48 hours",wrongs:["24 hours","5 days","By the weekly meeting"],ex:"The TAT to close these emails is 48 hours; any delay needs an email notification."},
{t:"VEC AR",q:"Before billing a patient their responsibility, AR:",correct:"Bills any other active insurance (COB) first",wrongs:["Asks PCC to call the patient about the bill","Writes off the copay as a courtesy","Sends it to VEC for client assistance"],ex:"Patient billable: verify other active coverage and bill the COB claim before billing the patient."},
{t:"VEC AR",q:"To close a claim as uncollectable, which is required?",correct:"All follow-ups and appeals done, the RCA sent, and approval",wrongs:["One follow-up call to the payer and a note in the claim form","A balance under $50, with no further action needed","The patient’s agreement to pay half of the balance"],ex:"Uncollectable: every follow-up and appeal completed, RCA and preventive action sent to the office, approvals obtained."},

{t:"VEC denials",q:"A routine exam is denied by medical as PR-96. First check:",correct:"Whether the claim was billed as the EV said",wrongs:["Whether the patient paid the copay at the visit","Whether the doctor signed the exam notes","Whether TriZetto rejected the claim at submission"],ex:"Step 1: verify the EV comments and whether the claim was billed as per the EV."},
{t:"VEC denials",q:"Billed as per EV, and still denied PR-96. Next:",correct:"Call the payer to request reprocessing",wrongs:["Bill the routine exam to the patient","Write it off as a non-covered service","Send it to Posting as a zero-pay EOB"],ex:"Step 2: billed per EV and still denied → call the payer to reprocess."},
{t:"VEC denials",q:"The payer refuses to reprocess, and no coding change can be made. You:",correct:"Appeal with a copy of the benefits",wrongs:["Bill the patient for the exam","Write it off as uncollectable","Refile the same claim again"],ex:"No coding change possible → file an appeal with a copy of the benefits."},
{t:"VEC denials",q:"Routine is not covered and the DX is medical. You check:",correct:"Whether the patient has VSP Essential",wrongs:["Whether the patient has dental cover","Whether the claim is on file","Whether the copay was $156"],ex:"Step 3: medical DX → check VSP Essential and bill accordingly."},
{t:"VEC denials",q:"There is no VSP Essential. The routine claim goes to:",correct:"VSP or another vision plan",wrongs:["The patient, in full","Medicaid","The medical plan again"],ex:"If not VSP Essential, transfer the claim to VSP or another vision plan."},
{t:"VEC denials",q:"The exam finds a medical diagnosis, and the patient has medical insurance. Bill:",correct:"The medical insurance first",wrongs:["The vision plan (VSP) first","VSP Essential first","The patient, then medical"],ex:"COB claims: with a medical DX and a medical plan, bill medical first."},
{t:"VEC denials",q:"Medical applied it all to the deductible; the patient has VSP with Essential. Bill:",correct:"VSP Essential",wrongs:["The regular VSP plan","The patient","EyeMed"],ex:"Patient responsibility after medical → VSP Essential if the patient has it."},
{t:"VEC denials",q:"Patient responsibility is left after medical, and the patient has EyeMed. You:",correct:"Adjust the refraction charge and bill the rest to the patient",wrongs:["Bill EyeMed as the secondary payer for the balance","Bill VSP Essential for the remaining balance instead","Write off the whole remaining balance as uncollectable"],ex:"EyeMed and Davis Vision do not cover COB claims: adjust the refraction, bill the patient."},
{t:"VEC denials",q:"The payer says not on file. First:",correct:"Look in the clearinghouse for proof the payer accepted it",wrongs:["Refile the same claim right away through TriZetto","Bill the full balance to the patient as self-pay","Write it off as a timely filing denial without review"],ex:"Step 1: check the clearinghouse for proof of acceptance."},
{t:"VEC denials",q:"Not on file, no clearinghouse proof, VSP plan. Before refiling:",correct:"Check TFL and eligibility, and upload the auth letter to the ECR",wrongs:["Send a reconsideration with the clearinghouse proof","Bill the patient, since the claim was never received","Ask PCC to call the patient for a new insurance card"],ex:"No proof → verify TFL and eligibility; for VSP, pull the auth and upload the letter to the ECR."},
{t:"VEC denials",q:"A medical not-on-file claim is refiled through:",correct:"TriZetto",wrongs:["The VSP portal","The payer’s fax line","The Google Drive"],ex:"For medical not-on-file claims, AR refiles through TriZetto."},
{t:"VEC denials",q:"Denied as covered by another payer; billed as the EV said, and this payer paid recently. You:",correct:"Call the payer to reprocess",wrongs:["Bill the claim to the patient","Write the balance off","Task PCC to call the patient"],ex:"Billed per EV + recent payment from the same payer → call to reprocess."},
{t:"VEC denials",q:"The correct payer cannot be found after every resource. You:",correct:"Task the PCC team to contact the patient",wrongs:["Write the claim off as uncollectable","Bill VSP instead as the likely payer","Bill the full balance to the patient"],ex:"Step 3: PCC follow-up with the patient."},
{t:"VEC denials",q:"A medical-records packet has to be mailed. You:",correct:"Upload it to the Google Drive for VEC’s AR contact to mail",wrongs:["Mail it yourself from the Purview office the same day","Send it through TriZetto as an attachment to the claim","Email it to the payer’s general inbox with the claim form"],ex:"MR mail: download the records, attach the claim form, upload to the Google Drive for mailing."}
];
Q.forEach(x=>{ x.c="vec"; SOP_QUIZ.push(x); });
})();
