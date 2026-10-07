/* Purview Gurukul — scenario quiz.
   Each generator builds one case with fresh numbers and returns
   {q, options, correct, ex, cat}. Money is kept to whole dollars so the
   arithmetic can be done in the head. Uses esc()/shuffle()/pick() from the
   app script at call time. */
"use strict";
const SCEN_FAMS=["Payment math","In vs out of network","HMO, PPO, POS, EPO","Primary & secondary (COB)","Medicare & Medicaid","Work & accident claims","Payer call role play"];
const $m=n=>"$"+Math.round(n).toLocaleString("en-US");
const rint=(a,b,step)=>{ step=step||1; return a+step*Math.floor(Math.random()*(Math.floor((b-a)/step)+1)); };
function sOpts(correct,wrongs,fmt){
  // keep options distinct; pad with nearby distractors if needed
  fmt=fmt||(x=>x); const seen=new Set([fmt(correct)]), out=[];
  wrongs.forEach(w=>{ const f=fmt(w); if(!seen.has(f)&&out.length<3){ seen.add(f); out.push(f); } });
  let bump=5; while(out.length<3){ const f=fmt(typeof correct==="number"?correct+bump:correct+" (variant)"); if(!seen.has(f)){ seen.add(f); out.push(f); } bump+=5; }
  const options=shuffle([fmt(correct)].concat(out));
  return {options:options,correct:options.indexOf(fmt(correct))};
}
function pmSetup(){ const A=rint(60,400,10), B=A+rint(20,200,10), D=rint(0,Math.max(0,A-30),10), c=pick([10,20,20,20,30,40]); return {A:A,B:B,D:D,c:c}; }
const DOW_M=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SCEN_GEN=[
/* ── payment math (in-network) ── */
{fam:"Payment math",make(){ const s=pmSetup(), rem=s.A-s.D, coins=rem*s.c/100, pat=s.D+coins, ins=rem-coins;
  const o=sOpts(pat,[s.D+s.A*s.c/100, s.D+(s.B-s.D)*s.c/100, coins, s.B-s.A],$m);
  return Object.assign(o,{q:"In-network claim. Billed <b>"+$m(s.B)+"</b>, allowed <b>"+$m(s.A)+"</b>. The plan pays "+(100-s.c)+"% / patient "+s.c+"% after the deductible, and <b>"+$m(s.D)+"</b> of the deductible is still unmet. What is the <b>patient's responsibility</b>?",
    ex:"Everything is calculated on the allowed amount, never the billed amount. Allowed "+$m(s.A)+" − deductible "+$m(s.D)+" = "+$m(rem)+". Patient coinsurance "+s.c+"% of "+$m(rem)+" = "+$m(coins)+". Patient = "+$m(s.D)+" + "+$m(coins)+" = "+$m(pat)+". Plan pays "+$m(ins)+". The "+$m(s.B-s.A)+" above the allowed is a contractual adjustment the provider writes off."}); }},
{fam:"Payment math",make(){ const s=pmSetup(), rem=s.A-s.D, coins=rem*s.c/100, ins=rem-coins;
  const o=sOpts(ins,[s.A*(100-s.c)/100, s.B*(100-s.c)/100, rem, s.A-s.D-s.c],$m);
  return Object.assign(o,{q:"In-network. Billed "+$m(s.B)+", allowed <b>"+$m(s.A)+"</b>, deductible remaining <b>"+$m(s.D)+"</b>, plan pays "+(100-s.c)+"% after the deductible. How much does the <b>plan pay</b>?",
    ex:"Allowed "+$m(s.A)+" − deductible "+$m(s.D)+" = "+$m(rem)+". Plan share "+(100-s.c)+"% of "+$m(rem)+" = "+$m(ins)+". Patient owes "+$m(s.D)+" + "+$m(coins)+" = "+$m(s.D+coins)+"."}); }},
{fam:"Payment math",make(){ const s=pmSetup(), rem=s.A-s.D, coins=rem*s.c/100, pat=s.D+coins, ins=rem-coins, w=s.B-s.A;
  const o=sOpts(w,[s.B-ins, pat, 0],$m);
  return Object.assign(o,{q:"In-network provider. Billed <b>"+$m(s.B)+"</b>, allowed <b>"+$m(s.A)+"</b>, plan paid "+$m(ins)+", patient owes "+$m(pat)+". What is the <b>contractual adjustment</b> the provider writes off?",
    ex:"Contractual adjustment = billed − allowed = "+$m(s.B)+" − "+$m(s.A)+" = "+$m(w)+". It appears on the remittance as CO-45 and is never billed to the patient. Allowed = plan paid + patient responsibility ("+$m(ins)+" + "+$m(pat)+" = "+$m(s.A)+")."}); }},
{fam:"Payment math",make(){ const A=rint(90,250,10), C=pick([20,25,30,40,50]);
  const o=sOpts("Patient "+$m(C)+"; plan "+$m(A-C),["Patient "+$m(A-C)+"; plan "+$m(C),"Patient "+$m(C)+"; plan "+$m(A),"Patient "+$m(C+A*0.2)+"; plan "+$m(A*0.8-C)]);
  return Object.assign(o,{q:"In-network office visit, allowed <b>"+$m(A)+"</b>. The plan has a <b>"+$m(C)+" copay</b> for office visits and waives the deductible and coinsurance for them. Who pays what?",
    ex:"A copay is a flat amount collected at the visit. Patient pays the "+$m(C)+" copay; the plan pays the rest of the allowed amount, "+$m(A)+" − "+$m(C)+" = "+$m(A-C)+". Billed charges above the allowed are written off."}); }},
{fam:"Payment math",make(){ const A=rint(60,200,10), D=A+rint(50,400,10), B=A+rint(20,120,10);
  const o=sOpts(A,[D,B,A*0.2],$m);
  return Object.assign(o,{q:"In-network. Billed "+$m(B)+", allowed <b>"+$m(A)+"</b>. The patient still has <b>"+$m(D)+"</b> of deductible to meet this year. What does the patient owe on this claim?",
    ex:"The deductible is taken from the allowed amount, and it cannot exceed the allowed amount. The whole "+$m(A)+" goes to the deductible, the plan pays $0, the provider writes off "+$m(B-A)+", and the patient's remaining deductible drops to "+$m(D-A)+"."}); }},
{fam:"Payment math",make(){ const s=pmSetup(); const rem=s.A-s.D, coins=rem*s.c/100, P=s.D+coins; const R=Math.max(5,P-rint(5,Math.max(5,P-5),5));
  const o=sOpts(R,[P,s.A-R,s.D],$m);
  return Object.assign(o,{q:"In-network. Allowed <b>"+$m(s.A)+"</b>, deductible remaining "+$m(s.D)+", patient coinsurance "+s.c+"%. The patient has only <b>"+$m(R)+"</b> left before reaching the annual out-of-pocket maximum. What does the patient owe?",
    ex:"Normally the patient would owe "+$m(s.D)+" + "+s.c+"% of "+$m(rem)+" = "+$m(P)+". But cost sharing stops at the out-of-pocket maximum, so the patient pays only the remaining "+$m(R)+" and the plan pays "+$m(s.A-R)+". After this claim the plan pays 100% of allowed amounts for the rest of the year."}); }},
{fam:"Payment math",make(){ const s=pmSetup(), rem=s.A-s.D, coins=rem*s.c/100, pat=s.D+coins, ins=rem-coins, w=s.B-s.A;
  const line=(a,p,i,x)=>"Allowed "+$m(a)+" · patient "+$m(p)+" · plan "+$m(i)+" · write-off "+$m(x);
  const o=sOpts(line(s.A,pat,ins,w),[line(s.B,pat,ins,w),line(s.A,ins,pat,w),line(s.A,pat+w,ins,0)]);
  return Object.assign(o,{q:"Billed <b>"+$m(s.B)+"</b>, allowed <b>"+$m(s.A)+"</b>, in-network, deductible remaining "+$m(s.D)+", patient coinsurance "+s.c+"%. Which EOB breakdown is correct?",
    ex:"Allowed "+$m(s.A)+" splits into patient "+$m(pat)+" ("+$m(s.D)+" deductible + "+$m(coins)+" coinsurance) and plan "+$m(ins)+". Billed − allowed = "+$m(w)+" is the contractual write-off. The allowed amount, not the billed amount, is the base for every split."}); }},
/* ── in vs out of network ── */
{fam:"In vs out of network",make(){ const A=rint(80,300,10), B=A+rint(40,250,10), D=rint(0,A-30,10), c=pick([30,40,50]); const rem=A-D, coins=rem*c/100, inNet=D+coins, total=inNet+(B-A);
  const o=sOpts(total,[inNet,B-A,D+B*c/100],$m);
  return Object.assign(o,{q:"<b>Out-of-network</b> (non-participating) provider. Billed <b>"+$m(B)+"</b>, plan's allowed <b>"+$m(A)+"</b>, out-of-network coinsurance "+c+"%, deductible remaining "+$m(D)+". No surprise-billing protection applies. What is the <b>most the patient can be billed</b>?",
    ex:"Cost sharing on the allowed amount: "+$m(D)+" + "+c+"% of "+$m(rem)+" = "+$m(inNet)+". Because there is no contract, the provider may also balance bill the difference between billed and allowed, "+$m(B)+" − "+$m(A)+" = "+$m(B-A)+". Total "+$m(inNet)+" + "+$m(B-A)+" = "+$m(total)+". An in-network provider would have written that "+$m(B-A)+" off."}); }},
{fam:"In vs out of network",make(){ const A=rint(80,300,10), B=A+rint(40,250,10), par=Math.random()<0.5;
  const right=par?"The provider writes it off as a contractual adjustment (CO-45)":"The patient — a non-participating provider may balance bill it, where the law allows";
  const wrong=par?"The patient — the provider may balance bill it":"The provider must write it off as a contractual adjustment";
  const o=sOpts(right,[wrong,"The payer pays it as an out-of-network allowance","The secondary payer picks it up automatically"]);
  return Object.assign(o,{q:"Billed <b>"+$m(B)+"</b>, allowed <b>"+$m(A)+"</b>. The provider is <b>"+(par?"in-network (participating)":"out-of-network (non-participating)")+"</b>. Who is responsible for the "+$m(B-A)+" difference?",
    ex:par?"A participating provider's contract makes the allowed amount payment in full. The "+$m(B-A)+" is a contractual adjustment, written off and never billed to the patient.":"With no contract, the allowed amount is only what the plan pays on. The "+$m(B-A)+" can be balance billed to the patient, unless Medicare limits, Medicaid rules or the No Surprises Act apply."}); }},
{fam:"In vs out of network",make(){ const A=rint(400,2000,50), B=A+rint(300,2500,50), c=20;
  const o=sOpts("No — the patient owes only in-network cost sharing ("+c+"% of "+$m(A)+" = "+$m(A*c/100)+"); the "+$m(B-A)+" is settled between the hospital and the plan",["Yes — the full "+$m(B-A)+" because the hospital is out of network","Yes, but only half of the "+$m(B-A),"No — the plan must pay the full billed "+$m(B)]);
  return Object.assign(o,{q:"A PPO patient is treated in an <b>out-of-network emergency room</b>. Billed <b>"+$m(B)+"</b>, plan allowed <b>"+$m(A)+"</b>, in-network coinsurance "+c+"%, deductible met. Can the hospital balance bill the patient the difference?",
    ex:"The federal No Surprises Act (2022) bans balance billing for emergency care and for out-of-network providers at in-network facilities. The patient pays what they would have paid in network; the provider and plan resolve the rest through negotiation or arbitration."}); }},
/* ── plan types ── */
{fam:"HMO, PPO, POS, EPO",make(){ const o=sOpts("Denied — an HMO requires a PCP referral; request a retro referral from the PCP, otherwise the balance follows the plan's rules",["Paid at the in-network rate — referrals are only needed for surgery","Paid at the out-of-network rate","Denied for timely filing"]);
  return Object.assign(o,{q:"An <b>HMO</b> member books directly with an in-network dermatologist. No referral is on file. How does the claim adjudicate?",ex:"HMO plans gate specialist care through the primary care physician. Without a referral the specialist claim denies. Eligibility verification should have caught the plan type and the referral requirement before the visit."}); }},
{fam:"HMO, PPO, POS, EPO",make(){ const A=rint(100,400,10), B=A+rint(50,300,10), c=pick([30,40]); const plan=A*(100-c)/100, pat=A*c/100;
  const o=sOpts("Covered at the out-of-network level: plan pays "+$m(plan)+", patient owes "+$m(pat)+" plus up to "+$m(B-A)+" balance bill",["Not covered — PPO plans are in-network only","Plan pays the full "+$m(A)+"; patient owes nothing","Patient owes only "+$m(pat)+"; the "+$m(B-A)+" is written off"]);
  return Object.assign(o,{q:"A <b>PPO</b> member sees an <b>out-of-network</b> orthopaedist. Billed "+$m(B)+", plan allowed "+$m(A)+", out-of-network coinsurance "+c+"%, deductible met. What happens?",ex:"PPOs cover out-of-network care at a lower benefit level. The plan pays "+(100-c)+"% of its allowed "+$m(A)+" = "+$m(plan)+"; the patient owes "+c+"% = "+$m(pat)+", and because the provider has no contract it may balance bill the remaining "+$m(B-A)+"."}); }},
{fam:"HMO, PPO, POS, EPO",make(){ const o=sOpts("Not covered — HMOs have no out-of-network benefit for non-emergency care; the patient is responsible if they were told in advance",["Covered at 50%","Covered in full after the deductible","Covered if the provider sends records"]);
  return Object.assign(o,{q:"An <b>HMO</b> member chooses an out-of-network physical therapist for routine therapy. How is the claim handled?",ex:"HMO plans pay only in-network providers, except for emergencies. Non-emergency out-of-network care is the patient's responsibility, so the office should tell the patient before the first visit and get a signed acknowledgment."}); }},
{fam:"HMO, PPO, POS, EPO",make(){ const o=sOpts("Paid — EPOs do not require referrals, but the provider must be in network",["Denied — referral required","Paid at the out-of-network rate","Pended for a PCP assignment"]);
  return Object.assign(o,{q:"An <b>EPO</b> member sees an in-network cardiologist without a referral. Result?",ex:"EPO = Exclusive Provider Organization: no PCP or referral requirement like a PPO, but no out-of-network coverage like an HMO. In-network without a referral is fine."}); }},
{fam:"HMO, PPO, POS, EPO",make(){ const o=sOpts("Covered at the plan's out-of-network level, with higher cost sharing than in network",["Not covered — POS plans are in-network only","Covered at the in-network level because a referral exists","Denied — POS plans never cover imaging"]);
  return Object.assign(o,{q:"A <b>POS</b> member gets a PCP referral and has a knee MRI at an out-of-network imaging centre. Coverage?",ex:"Point-of-Service plans require a PCP and referrals like an HMO, but cover out-of-network care like a PPO, at a higher deductible or coinsurance."}); }},
{fam:"HMO, PPO, POS, EPO",make(){ const o=sOpts("Usually the provider — a contracted provider that skipped a required authorization cannot bill the patient; appeal with medical necessity or request a retro-authorization",["The patient, always","The payer must still pay the claim","Medicare, as payer of last resort"]);
  return Object.assign(o,{q:"A PPO patient has an MRI at an in-network imaging centre. The plan requires <b>prior authorization</b> for MRIs and none was obtained. The claim denies CO-197. Who bears the cost?",ex:"Most contracts make authorization the provider's duty; the denial is a contractual write-off unless a retro-auth or appeal succeeds. Prior authorization applies to any plan type, not only HMOs."}); }},
{fam:"HMO, PPO, POS, EPO",make(){ const o=sOpts("Paid — routine OB/GYN care is exempt from the HMO referral requirement",["Denied — no referral","Paid at the out-of-network level","Pended until the PCP confirms"]);
  return Object.assign(o,{q:"An <b>HMO</b> member sees an in-network OB/GYN for an annual well-woman visit with no referral. Result?",ex:"Federal rules let women see an in-network OB/GYN for routine care (Pap tests, well-woman visits, obstetric care) without a referral, even on HMO plans."}); }},
{fam:"HMO, PPO, POS, EPO",make(){ const rows={HMO:["Yes","Yes","Emergencies only"],PPO:["No","No","Yes"],POS:["Yes","Yes","Yes"],EPO:["No","No","Emergencies only"]}; const t=pick(Object.keys(rows)); const r=rows[t];
  const fmt=x=>"PCP "+x[0]+" · referrals "+x[1]+" · out-of-network "+x[2]; const others=Object.keys(rows).filter(k=>k!==t).map(k=>rows[k]);
  const o=sOpts(fmt(r),others.map(fmt));
  return Object.assign(o,{q:"Which rule set describes a <b>"+t+"</b> plan? (PCP required · referrals required · out-of-network coverage)",ex:"HMO: PCP yes, referrals yes, OON emergencies only. PPO: no, no, yes. POS: yes, yes, yes (at higher cost). EPO: no, no, emergencies only."}); }},
/* ── COB ── */
{fam:"Primary & secondary (COB)",make(){ let m1=rint(1,12), m2=rint(1,12); while(m2===m1) m2=rint(1,12); const d1=rint(1,28), d2=rint(1,28), y1=rint(1978,1992), y2=rint(1978,1992);
  const momFirst=(m1<m2); const mom="Mother (born "+DOW_M[m1-1]+" "+d1+", "+y1+")", dad="Father (born "+DOW_M[m2-1]+" "+d2+", "+y2+")";
  const o=sOpts(momFirst?"Mother's plan":"Father's plan",[momFirst?"Father's plan":"Mother's plan","The older parent's plan","Whichever plan the parents choose"]);
  return Object.assign(o,{q:"A child is covered by both parents' employer plans. "+mom+". "+dad+". Which plan is <b>primary</b> for the child?",ex:"Birthday rule: the parent whose birthday (month and day) comes first in the calendar year is primary. "+(momFirst?DOW_M[m1-1]:DOW_M[m2-1])+" comes before "+(momFirst?DOW_M[m2-1]:DOW_M[m1-1])+". The year of birth and who is older do not matter."}); }},
{fam:"Primary & secondary (COB)",make(){ const y1=rint(2008,2016), y2=y1+rint(1,6); const m=rint(1,12), d=rint(1,28);
  const o=sOpts("The mother's plan — it has covered its parent longer (since "+y1+")",["The father's plan — it is newer","The older parent's plan","Both plans pay 50%"]);
  return Object.assign(o,{q:"Both parents were born on "+DOW_M[m-1]+" "+d+" (different years). The mother's plan has covered her since "+y1+", the father's plan since "+y2+". Which is primary for their child?",ex:"When parents share a birthday, the plan that has covered a parent for the longer time is primary."}); }},
{fam:"Primary & secondary (COB)",make(){ const o=sOpts("Plan A — the plan that covers the patient as the subscriber (employee) is primary",["Plan B — dependent coverage pays first","Whichever plan has the lower deductible","The plan that received the claim first"]);
  return Object.assign(o,{q:"The patient is the <b>employee/subscriber</b> on Plan A and a <b>dependent</b> on a spouse's Plan B. Which plan is primary for the patient?",ex:"COB rule: your own employer coverage is primary over coverage you hold as someone's dependent. Bill Plan A first and send Plan B the claim with Plan A's EOB."}); }},
{fam:"Primary & secondary (COB)",make(){ const A1=rint(100,400,10), D=rint(0,A1-40,10), c=20; const R=D+(A1-D)*c/100, P1=A1-R; const A2=pick([A1,A1-10,A1+10,A1-20]); const pay=Math.min(R,Math.max(0,A2-P1));
  const o=sOpts(pay,[R,A2,Math.max(0,A2-P1)===pay?A2-P1+10:A2-P1,0],$m);
  return Object.assign(o,{q:"Primary plan: allowed <b>"+$m(A1)+"</b>, paid <b>"+$m(P1)+"</b>, patient responsibility "+$m(R)+" ("+$m(D)+" deductible + "+c+"% coinsurance). The secondary plan's own allowed amount is <b>"+$m(A2)+"</b> and it coordinates on a non-duplication basis. How much does the <b>secondary</b> pay?",
    ex:"The secondary pays the patient responsibility left by the primary, but never more than its own allowed amount minus what the primary already paid. Cap = "+$m(A2)+" − "+$m(P1)+" = "+$m(Math.max(0,A2-P1))+". Patient responsibility = "+$m(R)+". Secondary pays the smaller: "+$m(pay)+". Anything left is the patient's."}); }},
{fam:"Primary & secondary (COB)",make(){ const o=sOpts("Resubmit the secondary claim with the primary's EOB/remittance attached (or the primary's payment data in the 837)",["Appeal with medical records","Bill the patient the full balance","Resubmit to the primary"]);
  return Object.assign(o,{q:"A secondary claim returns with remark <b>MA04: secondary payment cannot be considered without the identity and payment information of the primary payer</b>. What is the fix?",ex:"Secondary payers adjudicate from the primary's adjudication. Send the primary EOB (or the COB segments of the electronic claim) showing allowed, paid and patient responsibility."}); }},
{fam:"Primary & secondary (COB)",make(){ const o=sOpts("Aetna is primary; Medicaid pays last, and the patient cannot be balance billed",["Medicaid is primary because it is government coverage","Both pay 50%","Medicaid only, since the patient qualifies for it"]);
  return Object.assign(o,{q:"A patient has <b>Aetna</b> through their employer and also <b>Medicaid</b>. How do you bill?",ex:"Medicaid is always the payer of last resort. Bill Aetna first, then Medicaid with the Aetna EOB. Medicaid patients may not be balance billed."}); }},
{fam:"Primary & secondary (COB)",make(){ const o=sOpts("Medicare is primary; TRICARE For Life pays second",["TRICARE For Life is primary","Medicare only — TRICARE does not cover retirees","The patient chooses"]);
  return Object.assign(o,{q:"A 72-year-old military retiree has <b>Medicare Parts A and B</b> and <b>TRICARE For Life</b>. Order of payment?",ex:"TRICARE For Life is the Medicare wraparound for retirees 65 and over: Medicare pays first, TFL pays the remaining cost sharing. If Medicare benefits are exhausted, TFL becomes primary."}); }},
/* ── Medicare & Medicaid ── */
{fam:"Medicare & Medicaid",make(){ const A=rint(60,400,5)*1; const AA=Math.round(A/5)*5; const mc=AA*0.8, pt=AA*0.2;
  const o=sOpts("Medicare "+$m(mc)+"; patient "+$m(pt),["Medicare "+$m(AA)+"; patient $0","Medicare "+$m(pt)+"; patient "+$m(mc),"Medicare "+$m(mc)+"; patient "+$m(pt+20)]);
  return Object.assign(o,{q:"Medicare <b>Part B</b> patient, no secondary coverage, Part B deductible already met. Medicare fee schedule allowed <b>"+$m(AA)+"</b>. Who pays what?",ex:"Part B pays 80% of the fee schedule amount after the deductible: 80% of "+$m(AA)+" = "+$m(mc)+". The patient owes the 20% coinsurance, "+$m(pt)+". A participating provider writes off anything billed above "+$m(AA)+"."}); }},
{fam:"Medicare & Medicaid",make(){ const A=rint(150,500,5), D=pick([283,183,83,53]); const rem=A-D, mc=rem*0.8, pt=D+rem*0.2;
  const o=sOpts(pt,[A*0.2,D,A*0.2+D],$m);
  return Object.assign(o,{q:"Medicare Part B allowed <b>"+$m(A)+"</b>. The patient still has <b>"+$m(D)+"</b> of the 2026 Part B deductible ($283) to meet and has no Medigap. What does the patient owe?",ex:"Deductible first: "+$m(D)+". Remaining "+$m(A)+" − "+$m(D)+" = "+$m(rem)+". Medicare pays 80% = "+$m(mc)+"; the patient owes 20% = "+$m(rem*0.2)+". Total patient = "+$m(D)+" + "+$m(rem*0.2)+" = "+$m(pt)+"."}); }},
{fam:"Medicare & Medicaid",make(){ const A=rint(60,400,5); const o=sOpts(0,[A*0.2,A*0.8,20],$m);
  return Object.assign(o,{q:"Medicare Part B allowed <b>"+$m(A)+"</b>, deductible met. The patient has a <b>Medigap Plan G</b> policy. What does the <b>patient</b> owe?",ex:"Medicare pays 80% ("+$m(A*0.8)+"). The claim crosses over automatically to the Medigap plan, which pays the 20% coinsurance ("+$m(A*0.2)+"). Patient owes $0. Medigap exists to cover Original Medicare's cost sharing."}); }},
{fam:"Medicare & Medicaid",make(){ const n=pick([12,18,45,120,350]); const big=n>=20;
  const o=sOpts(big?"The employer group health plan is primary; Medicare is secondary":"Medicare is primary; the employer plan is secondary",[big?"Medicare is primary; the employer plan is secondary":"The employer plan is primary; Medicare is secondary","Medicare only — working people cannot use employer coverage","The patient chooses each year"]);
  return Object.assign(o,{q:"A 68-year-old is <b>still working</b> and covered by the employer's group health plan. The employer has <b>"+n+" employees</b>. The patient also has Medicare. Who is primary?",ex:"Medicare Secondary Payer rule for age: when the beneficiary (or spouse) is actively employed and the employer has <b>20 or more</b> employees, the group plan is primary. With fewer than 20 employees, or retiree coverage, Medicare is primary. This employer has "+n+" employees, so "+(big?"the group plan":"Medicare")+" pays first."}); }},
{fam:"Medicare & Medicaid",make(){ const plan=pick(["Humana Medicare Advantage PPO","Aetna Medicare HMO","UnitedHealthcare Medicare Advantage"]);
  const o=sOpts("To "+plan.split(" ")[0]+" — a Medicare Advantage plan replaces Original Medicare; Medicare itself will deny the claim",["To the Medicare Administrative Contractor","To Medicare first, then "+plan.split(" ")[0]+" as secondary","To Medicaid"]);
  return Object.assign(o,{q:"The patient's card reads <b>"+plan+"</b>. Where does the claim go?",ex:"Part C plans administer the member's Medicare benefits. Bill the plan at its payer ID; Original Medicare rejects claims for members enrolled in Medicare Advantage."}); }},
{fam:"Medicare & Medicaid",make(){ const A=rint(50,300,10), B=A+rint(30,200,10);
  const o=sOpts("No — balance billing Medicaid patients is prohibited; the "+$m(B-A)+" is written off",["Yes — any provider can bill the difference","Yes, if the patient signs a waiver","Only half of it"]);
  return Object.assign(o,{q:"<b>Medicaid</b> patient. Billed <b>"+$m(B)+"</b>, Medicaid allowed and paid <b>"+$m(A)+"</b>. Can the provider bill the patient the remaining "+$m(B-A)+"?",ex:"Providers who accept Medicaid must accept its payment as payment in full. The difference is a write-off; billing the patient violates the Medicaid participation agreement."}); }},
{fam:"Medicare & Medicaid",make(){ const A=rint(60,400,5);
  const o=sOpts("No — bill Medicaid as secondary; QMB patients cannot be billed any Medicare cost sharing",["Yes — the 20% is always the patient's","Yes, after three statements","Only if Medicaid denies"]);
  return Object.assign(o,{q:"A dual-eligible patient (Medicare + Medicaid, QMB). Medicare allowed <b>"+$m(A)+"</b> and paid <b>"+$m(A*0.8)+"</b>. Can you bill the patient the remaining "+$m(A*0.2)+"?",ex:"Qualified Medicare Beneficiaries are protected from all Medicare deductibles, coinsurance and copays. Submit the claim to Medicaid as secondary; whatever Medicaid does not pay is written off, never billed to the patient."}); }},
/* ── work & accident ── */
{fam:"Work & accident claims",make(){ const o=sOpts("Workers' compensation pays in full; the patient owes nothing; the claim needs the date of injury and the WC claim number",["BCBS is primary; workers' comp pays the copay","The patient pays the deductible, workers' comp pays the rest","Medicare, because it was an injury"]);
  return Object.assign(o,{q:"An employee hurts their back <b>lifting at work</b>. They also have employer BCBS coverage. Who pays, and what does the patient owe?",ex:"Work-related injury: the employer's workers' compensation carrier is primary and pays in full with no patient cost sharing. The health plan is billed only for care unrelated to the injury. Complete box 10a and box 14 (date of injury)."}); }},
{fam:"Work & accident claims",make(){ const o=sOpts("Auto no-fault / PIP coverage is primary up to its limit; UnitedHealthcare is secondary",["UnitedHealthcare is primary because it is health insurance","The patient pays and claims from the auto insurer","The other driver's insurer pays first"]);
  return Object.assign(o,{q:"A patient is injured in a <b>car accident</b>. They have UnitedHealthcare through work and personal injury protection (PIP) on their auto policy. Order of payment?",ex:"Accident-related care goes first to the liability or no-fault carrier. The health plan is secondary and may deny with 'other payer responsible' until the auto claim is exhausted or denied. Document the date of accident, carrier, claim number and adjuster."}); }},
{fam:"Work & accident claims",make(){ const o=sOpts("The store's liability insurer is primary; Medicare may pay conditionally and recovers from the settlement",["Medicare is primary because the patient is 70","Medicaid pays first","The patient must pay until the lawsuit ends"]);
  return Object.assign(o,{q:"A 70-year-old Medicare patient <b>slips in a store</b> and the store's liability insurer accepts responsibility. Who pays the ER claim?",ex:"Under Medicare Secondary Payer rules, liability insurance is primary for accident-related care. Medicare can make a conditional payment so care is not delayed, then recovers it from the settlement. The case must be reported to Medicare."}); }},
{fam:"Work & accident claims",make(){ const o=sOpts("Bill the health plan — workers' compensation covers only the work injury",["Bill workers' compensation — the patient has an open claim","Bill both and let them coordinate","The patient pays cash"]);
  return Object.assign(o,{q:"A patient has an <b>open workers' compensation claim</b> for a shoulder injury and comes in with the flu. Which payer do you bill for the flu visit?",ex:"Workers' compensation pays only for treatment of the accepted work injury. Unrelated care goes to the patient's regular health plan with the patient's normal cost sharing."}); }}
];
function buildScenarioRound(filter,n){
  n=n||10;
  // Role play: whole calls, each four turns in order (calls.js).
  if(typeof buildCallRound==="function"){
    if(filter===CALL_FAM) return buildCallRound(8);
    if(filter==="All"&&Math.random()<0.5){ const call=buildCallRound(1); return call.concat(buildScenarioRound("All-nocall",n-call.length)); }
  }
  if(filter==="All-nocall") filter="All";
  const gens=SCEN_GEN.filter(g=>filter==="All"||g.fam===filter);
  const qs=[]; const seen=new Set(); let guard=0;
  const order=[]; while(order.length<n*3){ order.push.apply(order,shuffle(gens)); }
  for(const g of order){ if(qs.length>=n||guard++>200) break; const x=g.make(); const key=x.q.replace(/\d/g,"#"); if(filter==="All"&&seen.has(key)) continue; if(qs.some(y=>y.q===x.q)) continue; seen.add(key); x.cat=g.fam; qs.push(x); }
  return qs;
}
