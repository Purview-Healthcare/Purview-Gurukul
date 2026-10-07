/* Purview Gurukul — payer call role play.
   Text role play: the app plays the payer rep (or the patient), the learner picks
   what to say next, and every turn shows the model line and why. Each call is
   four turns; a round in the Scenarios tab runs two calls. The call always
   continues as if the model answer was given, so the transcript stays coherent. */
"use strict";
const CALL_FAM="Payer call role play";
const CALLS=[
{id:"elig",title:"Eligibility and benefits before the visit",who:"Rep",
 setup:"Tomorrow’s patient: Maria Lopez, DOB 02/14/1971, UnitedHealthcare member ID 9A3456789, group 70112. Office visit 99214 with Dr Patel, NPI 1234567890, tax ID 12-3456789. You are calling UHC provider services to verify eligibility and benefits.",
 turns:[
  {rep:"Thank you for calling UnitedHealthcare provider services, this is Dana. How can I help you today?",
   say:"Hi Dana, this is Priya calling on behalf of Dr Patel’s office, NPI 1234567890, tax ID 12-3456789. I’d like to verify eligibility and benefits for Maria Lopez, date of birth February 14, 1971, member ID 9A3456789.",
   wrong:["Hi, I need to check if Maria Lopez is covered.","Hi Dana, can you tell me everything on Maria Lopez’s policy? I don’t have her ID handy, but she was born in 1971.","Hi, this is the billing company. Is Maria Lopez active? She is coming in tomorrow for a knee problem and some other issues she has had for years."],
   why:"Open with who you are and who you represent (name, NPI, tax ID), what you need, and the patient’s two identifiers plus the member ID. The rep verifies you and pulls the record in one step. The reason for the visit is not needed for eligibility."},
  {rep:"I have Maria’s record in front of me. What would you like to know?",
   say:"Is the policy active for date of service March 5, 2026? Please confirm the effective date, any termination date, the plan type, and whether Dr Patel is in network.",
   wrong:["Is she active? Great, thanks.","What is her deductible?","Can you confirm she is active and also tell me her diagnosis history so we can plan the visit?"],
   why:"Coverage for the exact date of service comes first: effective and termination dates, plan type (an HMO needs a PCP referral), network status. Benefits come after. Diagnosis history is not something the payer gives or you need."},
  {rep:"Active since January 1, 2026, no termination date, it is a PPO, and Dr Patel is in network. Anything else?",
   say:"Yes. For CPT 99214 in the office, place of service 11: is prior authorisation or a referral required, what is the copay, how much of the deductible is met, and what are the coinsurance and the remaining out-of-pocket maximum?",
   wrong:["No, that is all. Thank you.","What does she owe for the visit?","Does the plan cover everything Dr Patel might do tomorrow?"],
   why:"Ask benefits per service: CPT plus place of service. Deductible met-to-date tells the front desk what to collect; the authorisation and referral question is what prevents a CO-197 denial next month."},
  {rep:"No authorisation or referral for 99214. Office copay is $30, deductible $1,500 with $1,500 met, 20% coinsurance, out-of-pocket maximum $4,000 with $2,100 met.",
   say:"Thank you. Let me read that back: active PPO from 1/1/2026, Dr Patel in network, 99214 no auth or referral, $30 copay, deductible fully met, 20% coinsurance, $1,900 left on the out-of-pocket maximum. May I have a call reference number, and your name again for my note?",
   wrong:["Perfect, thanks, bye.","Great. Can you also email me a copy of the benefits?","So she owes nothing tomorrow, right?"],
   why:"Read every figure back, then get the reference number and the rep’s name. The note is: date, rep, reference, each benefit, and the DOS you quoted. The patient owes the $30 copay at check-in; a copay applies even when the deductible is met."}
 ]},
{id:"nofile",dn:"No claim on file",title:"Claim not on file, timely filing clock running",who:"Rep",
 setup:"Claim for John Carter, DOB 08/30/1962, Aetna member W123456789, DOS 01/12/2026, billed $450, sent electronically 01/20/2026 through the clearinghouse. Today is 03/25/2026: no payment, no denial. Aetna’s timely filing limit is 120 days from the date of service.",
 turns:[
  {rep:"Aetna provider services, this is Marcus. May I have the provider’s tax ID and NPI?",
   say:"Tax ID 12-3456789, NPI 1234567890, Dr Patel. I’m calling for claim status on John Carter, DOB August 30, 1962, member ID W123456789, date of service January 12, 2026, billed amount $450.",
   wrong:["I’ll give you the tax ID in a second. First, why hasn’t John Carter been paid?","NPI 1234567890. I need status on all our unpaid Aetna claims.","Tax ID 12-3456789. Claim for John Carter, he has had chest pain for months, DOS January 12."],
   why:"Give the rep what they ask for, then the claim identifiers: patient, DOB, member ID, DOS, billed amount. The diagnosis is PHI beyond the minimum necessary for a status call."},
  {rep:"I don’t see any claim for that date of service under this NPI.",
   say:"Could you check under the group NPI 1987654321 as well, and by the patient’s last name with the date of service? If there is still nothing, what is the correct electronic payer ID for this plan, and can you confirm the timely filing limit?",
   wrong:["That can’t be right, we sent it in January.","Okay, I’ll just resend it.","Then please pay it now, it has been two months."],
   why:"Before you resubmit, rule out a search miss: billing versus rendering NPI, name spelling. Then confirm where the claim should have gone and how long you have left."},
  {rep:"Nothing under the group NPI either. Payer ID 60054 is correct. Timely filing is 120 days from the date of service.",
   say:"Thank you. We hold the clearinghouse acceptance report dated January 20, 2026. If we resubmit today and a timely filing question comes up later, what proof does Aetna accept: the clearinghouse report with Aetna’s acceptance, or something else?",
   wrong:["Fine, we will resubmit.","Can you backdate the claim for us?","What is your supervisor’s name? This is Aetna’s fault."],
   why:"120 days from 1/12 is 5/12, so there is time. Resubmit now, and establish what proof of timely filing Aetna accepts so a later CO-29 denial can be overturned with it."},
  {rep:"A clearinghouse report showing Aetna accepted the claim within the limit is accepted on reconsideration. Anything else?",
   say:"No, that is everything. May I have a reference number and your name for my note? I’m noting: no claim on file under either NPI, payer ID 60054 confirmed, filing limit 120 days to May 12, resubmitting today, 1/20 acceptance report kept as proof.",
   wrong:["No, thanks.","Can you send me an email confirming it is not on file?","Yes, can you tell me which of our other claims are missing?"],
   why:"Close with the reference number and a note the next person can act on: what was found, what was confirmed, what you are doing next and by when."}
 ]},
{id:"noauth",dn:"Authorization absent or missing",title:"CO-197: no authorisation on file",who:"Rep",
 setup:"MRI lumbar spine (72148) for Aisha Khan, DOB 05/02/1988, Cigna member U55566677, DOS 02/10/2026, POS 22 outpatient hospital, billed by Riverside Imaging (NPI 1098765432, tax ID 98-7654321). Denied CO-197, precertification absent. The ordering office, Dr Rao (NPI 1456789012), says an authorisation was obtained.",
 turns:[
  {rep:"Cigna provider services, this is Lena. How can I help?",
   say:"Hi Lena, this is Priya from the billing office for Riverside Imaging, NPI 1098765432, tax ID 98-7654321. I’m calling about claim 2026041234 for Aisha Khan, DOB May 2, 1988, member ID U55566677, DOS February 10, 2026, denied CO-197 for no authorisation.",
   wrong:["Hi, your company denied an MRI for no auth and we definitely had one.","Hi Lena, I need to appeal a claim.","Hi, I’m calling about Aisha Khan. She has had back pain for years and really needed this MRI."],
   why:"Identify yourself and the claim, and state the denial neutrally. The claim number gets the rep to the right place fastest. The patient’s history is not relevant to an authorisation question."},
  {rep:"I see it. The claim denied because no authorisation was on file for CPT 72148 on that date.",
   say:"Could you check whether an authorisation exists for this member around that date under the ordering physician, Dr Rao, NPI 1456789012, or under a different CPT? If there is one, can the claim be reprocessed with that number?",
   wrong:["Can you just approve it now?","The ordering office said they got one, so please pay the claim.","Then we will bill the patient."],
   why:"Most ‘no auth’ denials have an authorisation sitting under another provider, code or date. Find it before anything else: a reprocess beats an appeal, and the patient cannot be billed for a missing auth on an in-network claim."},
  {rep:"There is authorisation A77812 for 72148, issued to Dr Rao’s office on February 3 and valid through March 5. It is not linked to your facility.",
   say:"Thank you. Can the claim be reprocessed with A77812, since the service and dates match and it was obtained for this MRI? If not, what exactly is needed: does the authorisation have to be amended to add our facility, and who requests that, the ordering office or us?",
   wrong:["Great, so you will pay it. Bye.","That is your mistake, not ours.","Okay, I’ll write the auth number on the claim and resend it."],
   why:"Ask for the reprocess first. If the authorisation must be amended, get exactly who does it and how. Resending a claim with a number that is not linked to your facility denies again."},
  {rep:"Our authorisation team can add the facility if the ordering office requests it; then submit a corrected claim with the number. Otherwise you would need a retro-authorisation within 60 days of the service.",
   say:"Understood. I’ll ask Dr Rao’s office today to have our facility added to A77812, then submit a corrected claim with it. May I have a reference number and your name? Noting: auth A77812 found, not linked to facility, ordering office to amend, corrected claim after, retro-auth deadline April 11, 2026.",
   wrong:["Okay, thanks.","Can you call Dr Rao’s office for us?","We will just appeal it."],
   why:"Leave with the fix, the owner of each step and the deadline. 60 days from 2/10 is 4/11, and the note says so. Appeals are for when the authorisation genuinely does not exist."}
 ]},
{id:"cob",dn:"Other payer is primary",title:"CO-22: other insurance may be primary",who:"Rep",
 setup:"Office visit for Robert Hayes, DOB 11/05/1958, age 67, Blue Cross member XYZ123456789 through his former employer, DOS 03/02/2026. Denied CO-22: this care may be covered by another payer per coordination of benefits. Registration lists only Blue Cross.",
 turns:[
  {rep:"Blue Cross provider line, this is Sam. Tax ID and NPI please.",
   say:"Tax ID 12-3456789, NPI 1234567890. I’m calling about a CO-22 denial on claim 7788990011 for Robert Hayes, DOB November 5, 1958, member ID XYZ123456789, DOS March 2, 2026.",
   wrong:["Why do you keep denying our claims for other insurance?","NPI 1234567890. Robert Hayes was denied. Please reprocess.","Tax ID 12-3456789. The patient only has Blue Cross, so the denial is wrong."],
   why:"Lead with the identifiers and the denial code. Whether the patient ‘only has Blue Cross’ is exactly what you are calling to find out."},
  {rep:"The denial is correct per our records: the member is listed with other coverage.",
   say:"What other coverage do you have on file: the carrier, the type of policy, the effective date, and whether it is listed as primary? And where did that come from, the member, the employer, or a COB questionnaire?",
   wrong:["The patient says he has nothing else. Can you reprocess?","Which one should we bill?","Can you give me the other carrier’s member ID and his claims history with them?"],
   why:"You need the carrier, the effective date and why Blue Cross believes it is primary. The source tells you whether a COB update by the member will fix it or whether you really do bill someone else first."},
  {rep:"We show Medicare Part B effective January 1, 2024, and no COB update from the member since 2023.",
   say:"Thank you. Is Mr Hayes actively employed with the employer group on this policy? If the group has 20 or more employees and he is still working, Blue Cross is primary under the Medicare Secondary Payer rules; if this is retiree coverage, Medicare is primary and we will bill Medicare first.",
   wrong:["So we bill Medicare. Thanks.","Please make Blue Cross primary.","Can you just pay it as secondary?"],
   why:"Age 65 and over with an employer plan is not automatically Medicare-primary. Active employment at a group of 20 or more employees makes the group plan primary. Ask the one question that decides the order."},
  {rep:"The group is retiree coverage, so Medicare is primary. Once Medicare processes, we pay secondary. The member should also update COB with us.",
   say:"Understood. We will bill Medicare Part B as primary, then send the claim with the Medicare remittance to Blue Cross as secondary, and ask Mr Hayes to call Blue Cross to update his COB. May I have a reference number and your name? Noting: retiree plan, Medicare primary from 1/1/2024, member to update COB.",
   wrong:["Okay, bye.","Can you update the COB for him now?","We will appeal with a letter from the patient."],
   why:"The fix is a billing-order change plus a member COB update, not an appeal. Record the reference number and tell registration to correct the insurance order for every future visit."}
 ]},
{id:"paidpt",dn:"Claim paid to patient",title:"Payment went to the patient",who:"Rep",
 setup:"Claim for Emily Chen, DOB 09/09/1990, Humana member H00112233, DOS 01/28/2026, billed $600, allowed $500. The remittance shows $380 paid and $120 patient responsibility, but no payment reached the practice. The registration packet has no signed assignment of benefits.",
 turns:[
  {rep:"Humana provider services, this is Jordan.",
   say:"Hi Jordan, Priya from Dr Patel’s office, NPI 1234567890, tax ID 12-3456789. I’m calling about claim 3344556677 for Emily Chen, DOB September 9, 1990, member ID H00112233, DOS January 28, 2026. The remittance shows $380 paid but we have not received it. Can you confirm who the payment was issued to?",
   wrong:["Hi, we were never paid for Emily Chen.","Hi Jordan, Humana lost our cheque.","Hi, I need Emily Chen’s payment details, including her bank information."],
   why:"State the facts and ask the one question that explains them: who received the payment. The member’s bank details are never yours to ask for."},
  {rep:"The $380 was issued to the member on February 14, cheque number 44812, because no assignment of benefits is on file.",
   say:"Thank you. Could you confirm whether the cheque has been cashed? And if we put a signed assignment of benefits on file now, will future claims pay to the provider?",
   wrong:["Please stop payment and reissue it to us.","That is illegal, the money is ours.","Okay, we will write it off."],
   why:"Humana paid correctly: without an AOB the member gets the money. Confirm the cheque details for the patient conversation and fix the cause for next time."},
  {rep:"Cashed on February 20. Yes, with an AOB on file future claims pay to the provider; this payment cannot be reissued.",
   say:"Understood. We will contact Ms Chen for the $380 she received plus her $120 patient responsibility, and get a signed AOB on file before her next visit. May I have a reference number and your name for the note?",
   wrong:["Then Humana needs to pay us again.","Okay, thanks.","Can you call the patient and tell her to pay us?"],
   why:"The balance becomes a patient collection: the $380 she received plus her own $120 share, $500 in total. Document the cheque number and date for the statement, and get the AOB signed."},
  {rep:"Reference 2026-0325-7781, Jordan. Anything else?",
   say:"That is all. Read-back: paid to member, cheque 44812 dated 2/14, cashed 2/20, $380; no AOB on file; patient to be billed $500 ($380 plus $120); AOB to be obtained; reference 2026-0325-7781, Jordan. Thank you.",
   wrong:["No. Bye.","Yes, can you also tell me what else Emily has been paid for this year?","Yes, can you note that the provider disputes this?"],
   why:"The read-back locks the facts for the patient statement and the audit trail. The member’s other payments are PHI you do not need; there is nothing to dispute."}
 ]},
{id:"medneclcd",dn:"Medically not necessary",title:"CO-50: not medically necessary (Medicare LCD)",who:"Rep",
 setup:"Vitamin D test (82306) for Daniel Ruiz, Medicare ID 1EG4-TE5-MK73, DOS 02/02/2026, denied CO-50 with remark N115 (decision based on a Local Coverage Determination). Diagnosis on the claim: Z00.00, general adult exam. No GA modifier. The remittance is dated 02/20/2026.",
 turns:[
  {rep:"Novitas Medicare provider contact center, this is Tara. Please provide the PTAN, NPI and tax ID.",
   say:"PTAN AB1234, NPI 1234567890, tax ID 12-3456789. Calling about claim 02026ABC1234 for Daniel Ruiz, Medicare ID 1EG4-TE5-MK73, DOS February 2, 2026, CPT 82306 denied CO-50 with remark N115.",
   wrong:["I don’t have the PTAN. Can you look it up by the doctor’s name?","NPI 1234567890. Medicare denied a vitamin D test and the doctor says it was necessary.","PTAN AB1234. The patient’s Social Security number is 123-45-6789."],
   why:"The MAC verifies you by PTAN, NPI and tax ID. Identify the patient by the MBI, never an SSN. Remark N115 already tells you an LCD was applied; say so."},
  {rep:"Correct. Diagnosis Z00.00 is not on the covered list in the LCD for vitamin D assay testing.",
   say:"Which LCD applies, so we can check the covered diagnoses against the record? If the physician documented a covered diagnosis at the visit that was left off the claim, is a corrected claim appropriate, or does this need a redetermination with records?",
   wrong:["Can you add a covered diagnosis for us?","What diagnosis would get it paid?","Please send it for medical review now."],
   why:"Never ask the payer which code pays; that is upcoding. Ask for the policy, then check the record. A documented covered diagnosis left off the claim is a coding error fixed by a corrected claim; anything else is a redetermination."},
  {rep:"The vitamin D assay LCD; it is on our website. If the record supports a covered diagnosis that was omitted, submit a corrected claim. Otherwise a redetermination can be requested within 120 days of the remittance date, with records attached.",
   say:"Thank you. We will review the visit note with the coder. If a covered diagnosis is documented we will send a corrected claim; if not, and the physician still believes the test was necessary, we will request redetermination with the note before the 120-day deadline. Was an ABN required for this test, and can the patient be billed without one?",
   wrong:["We will just bill the patient.","Okay, a corrected claim with a covered code is coming.","Can you tell me what the doctor wrote in the note?"],
   why:"The patient can be billed for an LCD denial only if a valid ABN was signed before the test, shown by the GA modifier. Without it the provider absorbs the cost. Ask, and never promise a ‘covered code’ you have not seen in the record."},
  {rep:"No GA modifier on the claim, so the patient cannot be billed unless an ABN is on file. Reference 7788-2026, this is Tara.",
   say:"Thank you, Tara, reference 7788-2026. Noting: CO-50/N115 under the vitamin D LCD, Z00.00 not covered, corrected claim only if the record supports a documented covered diagnosis, otherwise redetermination by June 20, 2026, no ABN so the patient is not liable.",
   wrong:["Thanks, bye.","We will get the patient to sign an ABN now.","Noting that Medicare refused to help."],
   why:"A backdated ABN is not valid. The note separates the three paths: corrected claim, redetermination (120 days from 2/20 is 6/20), or provider write-off."}
 ]},
{id:"timely",dn:"Timely filing expired",title:"CO-29: timely filing has expired",who:"Rep",
 setup:"Claim for Grace Okafor, DOB 06/18/1983, Cigna member U9988776, DOS 09/15/2025, billed $320, denied CO-29. Cigna’s limit is 90 days. The clearinghouse shows a submission on 09/18/2025 rejected for an invalid member ID, then a corrected submission accepted on 01/05/2026.",
 turns:[
  {rep:"Cigna provider services, this is Omar. How can I help?",
   say:"Hi Omar, Priya from Dr Patel’s office, NPI 1234567890, tax ID 12-3456789. Claim 5566778899 for Grace Okafor, DOB June 18, 1983, member ID U9988776, DOS September 15, 2025, denied CO-29. I’d like to confirm the receipt date you have and the filing limit.",
   wrong:["Hi, you denied our claim for timely filing but we sent it in September.","Hi Omar. I want to appeal a timely filing denial.","Hi, Grace Okafor’s claim was denied. What do we do?"],
   why:"Get the payer’s own receipt date before arguing anything. The gap between what you sent and what they received is the whole case."},
  {rep:"First receipt was January 5, 2026, which is 112 days after the date of service. The limit is 90 days.",
   say:"Our clearinghouse shows a submission on September 18, 2025 that was rejected for an invalid member ID, so it never reached Cigna. Does Cigna accept a clearinghouse rejection report as proof of timely filing, or only an acceptance report from Cigna?",
   wrong:["We submitted on September 18, so please reprocess it.","The rejection was your clearinghouse’s fault.","Fine, we will bill the patient."],
   why:"Honest framing: a rejected claim was never received, and most payers do not count it. Ask what proof the payer accepts before you build the reconsideration."},
  {rep:"A rejection for an invalid member ID is not proof of timely filing; the claim has to have been accepted. You can submit a reconsideration, but it would likely be upheld.",
   say:"Understood. Was the member ID on file at the time different from what we had, for example a new card issued in 2025? If the member’s ID changed and the plan can confirm it, we would include that in the reconsideration.",
   wrong:["Then we will appeal anyway with everything we have.","Can you make an exception this once?","The patient will have to pay then."],
   why:"Look for the one fact that could change the outcome. Without it, a CO-29 with no proof of acceptance is a write-off, and an in-network patient cannot be billed for it."},
  {rep:"The ID did not change in 2025. Reference 0325-4411, Omar.",
   say:"Thank you, Omar, reference 0325-4411. Noting: first accepted receipt 1/5/2026, 112 days, limit 90; 9/18 submission rejected for invalid ID so not accepted as proof; reconsideration unlikely; recommend timely filing write-off plus a front-end fix: verify the member ID at check-in and work clearinghouse rejections within 48 hours.",
   wrong:["Thanks.","Noting that Cigna refused to pay.","We will bill the patient $320."],
   why:"The note names the root cause and the process fix. A timely filing denial is a contractual write-off; billing the patient for it breaks the network contract."}
 ]},
{id:"ptbill",dn:"Claim applied towards deductible",title:"Patient’s spouse calls about a bill",who:"Caller",
 setup:"Inbound call. A woman says she is calling about a statement for $260 for Thomas Reed, DOS 02/11/2026. The Blue Cross EOB shows billed $400, allowed $260, applied to deductible $260, paid $0, in network.",
 turns:[
  {rep:"Hi, I got a bill for $260 for my husband Thomas and I don’t understand it. His insurance should have covered this.",
   say:"I can help with that. For privacy I need to verify a few details first. May I have Thomas’s full name and date of birth, and may I check that you are listed on his account as someone we can speak to?",
   wrong:["Sure. The visit was coded 99213 with diagnosis I10 and the insurance applied it to the deductible.","Insurance never covers everything. You owe $260.","I can only talk to Thomas. Goodbye."],
   why:"A spouse is not automatically authorised. Verify identity and check for a signed release naming her before discussing anything. You do not refuse outright; you verify."},
  {rep:"Thomas Reed, March 3, 1979. Yes, he listed me on the form when he registered.",
   say:"Thank you, I see you on his release. The visit on February 11 was billed at $400. Blue Cross, which is in network, allowed $260 and applied all of it to Thomas’s deductible, so the plan paid nothing and the $260 is his share. The $140 difference is written off by us under the contract; nobody pays that.",
   wrong:["The insurance just didn’t pay. You need to call them.","You owe $260 because the insurance denied the claim.","The doctor charges $400 and insurance only gave us $260, so you owe the rest."],
   why:"Explain the four numbers in order: billed, allowed, applied to deductible, paid. Say clearly that the contractual write-off is not the patient’s. Never call a deductible a denial."},
  {rep:"So why is it the deductible? We pay a lot in premiums.",
   say:"Thomas’s plan has a yearly deductible that he pays before the plan starts paying its share. This was his first visit of the year, so the whole allowed amount counted toward it. His EOB from Blue Cross will show the same $260, and what he has met now carries forward for the rest of 2026.",
   wrong:["You should ask your employer for a better plan.","That is how insurance works, I’m afraid.","I can discount it if you pay today."],
   why:"Translate the plan rule without blaming the patient or the payer, and point to the EOB so they can confirm it themselves. Do not offer discounts you are not authorised to give."},
  {rep:"Okay, that makes sense. We can’t pay it all this month though.",
   say:"That is fine. We can set up a payment plan: would $65 a month over four months work? I’ll note the arrangement on the account and send a confirmation. Is this number the best one to reach you on?",
   wrong:["Then it will go to collections.","Just pay what you can, whenever.","I’ll waive it, don’t worry."],
   why:"Offer the practice’s standard plan, document it and confirm contact details. Routinely waiving patient cost sharing can breach the payer contract and, for federal programs, the anti-kickback rules."}
 ]},
{id:"overpay",dn:"Claim paid and applied towards offset",title:"Payer asks for a refund",who:"Rep",
 setup:"Aetna letter OP-55821: overpayment of $185 on claim 1122334455 for Linda Park, member W987654321, DOS 11/04/2025, reason ‘duplicate payment’. The practice ledger shows two Aetna payments of $185 on that claim, posted 11/20/2025 and 12/02/2025. Patient balance $0.",
 turns:[
  {rep:"Aetna overpayment recovery, this is Nia.",
   say:"Hi Nia, Priya from Dr Patel’s office, tax ID 12-3456789, NPI 1234567890, calling about overpayment letter OP-55821 for Linda Park, member W987654321, DOS November 4, 2025, claim 1122334455. I’d like to confirm the reason and the amount before we refund.",
   wrong:["Hi, we got a refund letter and we don’t owe you anything.","Hi, please just take it out of our next payment.","Hi Nia, what is this about?"],
   why:"Reconcile before you pay anything. Identify the letter and say what you are checking."},
  {rep:"The claim was paid twice in error: $185 on November 18 and again on November 30. We are requesting $185 back.",
   say:"Our ledger agrees: two payments of $185 on that claim. What are the options to return it, a refund cheque or an offset against future remittances, and what is the deadline? Will the reversal show on an 835 so our posting matches?",
   wrong:["We will keep it as a credit for the patient.","Can we keep it until the end of the year?","Send us a cheque and we will refund the patient instead."],
   why:"Confirm, then ask how and by when. The refund goes back to the payer that overpaid, never to the patient. Asking about the 835 keeps the posting trail clean."},
  {rep:"Either a cheque within 30 days, or an offset on the next remittance; the offset shows as a reversal on the 835 with a WO code.",
   say:"We will take the offset so the reversal appears on the 835. Please note that we accept an offset of $185 against claim 1122334455. May I have a reference number and your name?",
   wrong:["We will think about it.","Offset it, and also apply it to Linda Park’s other balances.","Cheque, and we will send it when we can."],
   why:"An offset with a WO line on the 835 is the easiest to post and to audit. Agree, get it in the payer’s record, document it."},
  {rep:"Reference OP-55821-C, Nia. Anything else?",
   say:"No. Noting: duplicate payment confirmed, $185 offset accepted on the next remittance, reversal to post against claim 1122334455 when the 835 arrives, reference OP-55821-C, Nia. We treat every overpayment like Medicare’s 60-day rule: identified, confirmed, returned.",
   wrong:["Thanks, bye.","Can you also check whether you overpaid any other claims?","Noting that we disagree but will comply."],
   why:"The note tells the payment poster exactly what to expect and why. The 60-day rule is Medicare law; applying the same discipline everywhere keeps the credit-balance report clean."}
 ]},
{id:"appeal",dn:"Procedure inconsistent with modifier",title:"Appeal status follow-up",who:"Rep",
 setup:"Appeal faxed on 02/05/2026 (fax confirmation 2026020511) to UnitedHealthcare for a CO-4 denial (procedure inconsistent with modifier) on claim 9988776655, Kevin Brooks, DOB 12/01/1969, member 123456789, DOS 12/10/2025, billed $1,250. Today is 03/22/2026: no response after 45 days.",
 turns:[
  {rep:"UnitedHealthcare provider services, this is Alex. Tax ID and NPI?",
   say:"Tax ID 12-3456789, NPI 1234567890. I’m checking the status of an appeal faxed on February 5, 2026, confirmation 2026020511, for claim 9988776655, Kevin Brooks, DOB December 1, 1969, member ID 123456789, DOS December 10, 2025.",
   wrong:["Why haven’t you answered our appeal?","NPI 1234567890. I want to appeal a claim for Kevin Brooks.","Tax ID 12-3456789. Has Kevin Brooks been paid yet?"],
   why:"An appeal status call needs the appeal’s own identifiers: date sent, method, confirmation number. Be clear it is a status check so you do not accidentally open a second appeal."},
  {rep:"I see the appeal, received February 6, in review, no decision yet. Standard turnaround is 30 days.",
   say:"It has been 45 days, past the 30-day standard. Can you escalate it, or tell me what is holding it, and whether any additional documentation is needed from us?",
   wrong:["Okay, I’ll call back next month.","This is unacceptable, let me speak to a supervisor.","Can you just overturn it now?"],
   why:"State the fact (past the standard) and ask for the two things that move it: an escalation and anything missing. Calm and specific gets more than angry."},
  {rep:"I have escalated it to the appeals team with a 10-business-day follow-up. No additional documentation is needed.",
   say:"Thank you. So I should expect a decision by about April 3. If it is upheld, what is the next level and how long do we have? May I have the escalation reference and your name?",
   wrong:["Great, thanks.","If it is upheld we will sue.","Can you tell me now whether it will be approved?"],
   why:"Convert ‘10 business days’ into a date, and learn the next step before you need it. Both go in the note with the reference number."},
  {rep:"Escalation reference ESC-449120, Alex. The next level is a second-level appeal within 60 days of the decision letter.",
   say:"Thank you, Alex. Noting: appeal received 2/6, in review, escalated 3/22 ESC-449120, follow-up by 4/3, no documents needed, second-level appeal within 60 days of the decision if upheld. I’ll diarise the follow-up.",
   wrong:["Thanks.","Noting that UHC delays appeals on purpose.","Please send the decision to the patient as well."],
   why:"The note has every date and the next action. A diarised follow-up is what separates a worked claim from a forgotten one."}
 ]}
];
/* Expand a call into quiz turns for mountQuiz: each turn carries the transcript so far. */
function callTurns(call){
  const e=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const who=call.who||"Rep";
  return call.turns.map((t,k)=>{
    const o=sOpts(t.say,t.wrong);
    let pre='<div class="call"><div class="callhead"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>'+e(call.title)+'<span class="turn">turn '+(k+1)+' of '+call.turns.length+'</span></div>';
    if(k===0) pre+='<div class="callsetup">'+e(call.setup)+'</div>';
    for(let j=0;j<k;j++) pre+='<div class="callline rep"><i>'+e(who)+'</i><span>'+e(call.turns[j].rep)+'</span></div><div class="callline you"><i>You</i><span>'+e(call.turns[j].say)+'</span></div>';
    pre+='<div class="callline rep now"><i>'+e(who)+'</i><span>'+e(t.rep)+'</span></div></div>';
    return {pre:pre,q:(k===0?"The call opens. ":"")+"What do you say?",options:o.options,correct:o.correct,ex:t.why,cat:"Payer call: "+call.title,call:call.id};
  });
}
/* A round of role play: whole calls, in order, until there are at least n turns. */
function buildCallRound(n){
  n=n||8; const out=[]; const cs=shuffle(CALLS.slice());
  for(const c of cs){ if(out.length>=n) break; out.push.apply(out,callTurns(c)); }
  return out;
}

/* ── Generated call for any denial in the library ─────────────────────────────
   Four turns built from the denial's own ask-the-payer questions and resolution
   steps (GEN.whichAsk / GEN.whichDo in the app), with distractors from other
   denials. Patient, payer, claim number and dates are invented each time. */
const CALL_PAYERS=["Aetna","Cigna","UnitedHealthcare","Blue Cross Blue Shield","Humana","Anthem"];
const CALL_REPS=["Dana","Marcus","Lena","Sam","Jordan","Tara","Omar","Nia","Alex","Chris","Morgan","Riley"];
const CALL_PATIENTS=["Maria Lopez","John Carter","Aisha Khan","Robert Hayes","Emily Chen","Daniel Ruiz","Grace Okafor","Thomas Reed","Linda Park","Kevin Brooks","Sofia Rossi","Ahmed Ali","Nora Walsh","Victor Nguyen"];
const CALL_CLOSES=["Okay, thanks, bye.","Can you email me a summary of this call?","Please note that the provider disputes this denial.","Can you tell me what else is pending for this patient?","Thanks. I’ll call back if we need anything.","Can you just reprocess it while I wait?","Fine. We will bill the patient then."];
function denialCall(d){
  const e=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const P=a=>a[Math.floor(Math.random()*a.length)];
  const payer=P(CALL_PAYERS), rep=P(CALL_REPS), pt=P(CALL_PATIENTS);
  const mm=1+Math.floor(Math.random()*3), dd=1+Math.floor(Math.random()*28), dos=(mm<10?"0":"")+mm+"/"+(dd<10?"0":"")+dd+"/2026";
  const claim=String(Math.floor(1e9+Math.random()*9e9)), ref=String(Math.floor(1e5+Math.random()*9e5))+"-"+rep.slice(0,2).toUpperCase();
  const code=(d.codes&&d.codes.length)?"code "+d.codes[0]:"";
  // Some denials share every question with others; then any of its questions is right and
  // the distractors come from denials that do not list that line.
  const askAny=()=>{ const mine=(d.questions||[]); if(!mine.length) return null; const right=P(mine); const own=LINE_OWNERS[norm(right)]||new Set();
    const seen=new Set(mine.map(norm)), pool=[]; DATA.forEach(x=>{ if(x===d||own.has(x.name)) return; (x.questions||[]).forEach(t=>{ const k=norm(t); if(!seen.has(k)){ seen.add(k); pool.push(t); } }); });
    if(pool.length<3) return null; const o=sOpts(right,shuffle(pool).slice(0,3)); return {options:o.options,correct:o.correct,explain:"This denial’s list shares some questions with related denials; the other three lines belong to denials of a different kind."}; };
  const a1=GEN.whichAsk(d,DATA)||askAny();
  let a2=null; if(a1) for(let k=0;k<6;k++){ const t=GEN.whichAsk(d,DATA)||askAny(); if(t&&t.options[t.correct]!==a1.options[a1.correct]){ a2=t; break; } }
  const act=GEN.whichDo(d,DATA);
  const setup="You are calling "+payer+" about claim "+claim+" for "+pt+", DOS "+dos+", denied "+(code?code+", ":"")+d.name+". The remittance says: “"+d.denial_wording+"”";
  const title="Call: "+d.name;
  const turns=[];
  if(!a1&&!act) return [];
  const opening=payer+" provider services, this is "+rep+". I have claim "+claim+" for "+pt+", date of service "+dos+". It denied with "+(code||"the code on your remittance")+": ‘"+d.denial_wording+"’. What do you need?";
  if(a1) turns.push({rep:opening,q:"What do you ask first?",options:a1.options,correct:a1.correct,say:a1.options[a1.correct],
    ex:"This is one of the questions the library lists for "+d.name+". "+(a1.explain||"")});
  if(a2) turns.push({rep:"Let me check that for you… yes, I can confirm it. Anything else?",
    q:"What else do you ask before you close?",options:a2.options,correct:a2.correct,say:a2.options[a2.correct],
    ex:"A second question from this denial’s list. Ask everything you need in one call; a second call costs another queue."});
  const close="No, that is everything. May I have the call reference number and your name? Read-back: claim "+claim+", "+pt+", DOS "+dos+", denied "+(code?code+" ":"")+d.name+", and the answers you gave me are in my note.";
  const closeOpts=sOpts(close,shuffle(CALL_CLOSES.slice()).slice(0,3));
  turns.push({rep:(turns.length?"Is there anything else I can help with today?":opening+" … Anything else before we close?"),q:"How do you close the call?",options:closeOpts.options,correct:closeOpts.correct,say:close,
    ex:"Read back the identifiers and the denial, then get the reference number and the rep’s name. That is the proof the call happened."});
  if(act) turns.push({rep:"Reference "+ref+", this is "+rep+". Have a good day.",after:"Call ended. Back at your desk:",q:"What is the right next step for this denial?",options:act.options,correct:act.correct,say:null,
    ex:(act.explain||"")+" The call gives you facts; the resolution step is yours."});
  return turns.map((t,k)=>{
    let pre='<div class="call"><div class="callhead"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>'+e(title)+'<span class="turn">turn '+(k+1)+' of '+turns.length+'</span></div>';
    if(k===0) pre+='<div class="callsetup">'+e(setup)+'</div>';
    for(let j=0;j<k;j++){ pre+='<div class="callline rep"><i>Rep</i><span>'+e(turns[j].rep)+'</span></div>'; if(turns[j].say) pre+='<div class="callline you"><i>You</i><span>'+e(turns[j].say)+'</span></div>'; }
    pre+='<div class="callline rep now"><i>Rep</i><span>'+e(t.rep)+'</span></div>'+(t.after?'<div class="callsetup">'+e(t.after)+'</div>':'')+'</div>';
    return {pre:pre,q:t.q,options:t.options,correct:t.correct,ex:t.ex,cat:"Payer call: "+d.name,call:"gen-"+d.name,d:d};
  });
}
