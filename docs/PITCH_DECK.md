# CausalOCPM — MIT Research Conclave 2026 · Pitch Deck Content (FINAL, LOCKED)

**Format:** 10 slides + 1 appendix. **6:00 to present (rehearse to 5:30), 4:00 jury Q&A.**
Every number below is the actual output of the pipeline — do not re-round.
This version incorporates every wording correction from review (confounding vs. spurious effect,
counterfactual direction, "controlled validation" not "gold standard," "auditable" not "permanent,"
no regulatory claims, causal support ≠ AI confidence) and the manufacturing rebrand
(Atlas Precision Aerostructures, replacing the old "Northwind / Supplier A" naming).

**Design system:** warm paper `#f4f1e8` · ink `#2c2e1e` · forest green `#3d5a3d` (correct/causal) ·
amber `#b1702c` (naive/wrong/hidden) · danger `#b0413a` (HOLD). Dark ground `#26281c` for slides 1 & 10 only.
Display serif for headlines (Fraunces/Cambria), clean sans for body (Inter/Calibri), mono for numbers.
Footer on slides 2–9: `CausalOCPM · MIT Research Conclave 2026`. No footer on slide 1.
**Never put on a slide:** PC algorithm, Double ML, SCM, DAG, OCEL, E-value, F1, bootstrap, refuter —
those live in your mouth for Q&A only.

---

## SLIDE 1 — TITLE · 0:00–0:15 · dark ground

**Title:** CausalOCPM
**Subtitle:** Causal accountability for autonomous decisions.
**Tagline:** When AI makes the decision, who explains what it caused?
AI can already tell you *why* it chose something. We tell you:
- What that decision actually caused
- What could have happened instead
- Whether the decision deserves to proceed

**Bottom:** «TEAM NAME» · Manipal Institute of Technology

**SPEAKER NOTES (~12s):** "We're «team». CausalOCPM — causal accountability for autonomous decisions. AI can already tell you why it chose something. We tell you what that choice actually caused, what could have happened instead, and whether it deserves to proceed."

---

## SLIDE 2 — THE TRAP · 0:15–1:05 · light ground

**Label:** THE PROBLEM
**Headline:** Your dashboard says specialist visits add 6 days. But how much is actually caused by the decision?

**Body:**
- The dashboard sees a strong relationship.
- Sicker patients are more likely to receive specialists.
- Those patients also tend to stay longer.
- Confounding can inflate the observed effect.

**Visual:** the confounder diagram — one node "Patient Acuity" branching into "Gets a Specialist" and "Longer Hospital Stay." Large number badge: **+6.01 days**, labeled "what the dashboard reports."

**Payoff:** The number is real. The explanation is incomplete.

**SPEAKER NOTES (~48s):** "Every hospital has a version of this chart: patients who saw a specialist stayed six days longer. The dashboard sees a strong relationship, but it doesn't separate cause from coincidence. Sicker patients are more likely to receive specialists, and those patients also tend to stay longer regardless — so part of that six-day number is confounding, not the specialist's effect. The number is real. The explanation is incomplete."

---

## SLIDE 3 — THE DECISION · 1:05–1:35 · light ground

**Label:** NOW ADD AN AI
**Headline:** An AI now makes this call.

**Body:**
- The agent sees the patient's history and hospital events.
- It recommends assigning a specialist.
- It is 93% confident.
- The next step could be automatic execution.

**Visual:** decision card — "CARE COORDINATION AGENT · Assign Specialist · Confidence 93% · [EXECUTE?]"

**Payoff:** Confidence tells us how sure the AI is. It does not tell us what caused the outcome.

**SPEAKER NOTES (~28s):** "Now put an autonomous agent in that seat, making this decision at scale. It sees the patient's history and hospital events, recommends assigning a specialist, and reports 93% confidence. The next step could be automatic execution. If this recommendation were executed without checking the causal evidence, the organization could act on an incomplete understanding of the relationship. Confidence tells you the model is sure of itself — not that the decision is right."

---

## SLIDE 4 — WHAT WE BUILT · 1:35–1:55 · light ground

**Label:** OUR SOLUTION
**Headline:** Three checks, before the action runs.

**Visual:** FIND → REPLAY → VERIFY, three circles connected by arrows.
- **FIND** — Separate the real cause from the apparent relationship.
- **REPLAY** — Test the same decision under an alternative choice.
- **VERIFY** — Check whether the result is stable enough to trust.

**Payoff:** Don't let the AI act on a story we haven't tested.
**Caption:** Runs on the event data businesses already produce. We use causal discovery on the event data to identify relevant confounding structure — separating the causal relationship from the apparent one.

**SPEAKER NOTES (~20s):** "Our system does three things. Find the real cause — separate what the decision caused from what merely came with it. Replay the alternative — what would have happened the other way. Verify — check whether the result holds up. We don't let the AI act on a story we haven't tested."

---

## SLIDE 5 — LIVE DEMO · 1:55–3:35 · screen share, no slide

**Run the deployed console — healthcare scenario — the Causal Decision Gate.**

**01 · FIND** — Dashboard saw **+6.01 days**.

**02 · MEASURE** — 6.01 → **5.25 days**. Say: *"The system estimates the causal effect: 5.25 days. The remaining 0.76 days is the confounding component."*

**03 · REPLAY** — Actual **10.9 days** → Alternative **6.8 days** — 4.1-day difference. Say: *"This is the estimated causal difference between the actual and alternative decisions for this case."*

**04 · VERIFY** —
```
AI CONFIDENCE        93%
CAUSAL SUPPORT       87%
                     6-point confidence gap
```
Say: *"The agent was 93% confident, but the causal evidence supports the decision at 87%. That six-point gap tells us the agent's confidence is stronger than the causal evidence behind it."* — **never** say "confidence drops to 87%"; causal support is not a recalibration of the AI's own number.

**Verdict:** 🟡 **REVIEW**

**Then:** click **Decision Audit Record** → the receipt (slide 7).
**Optional (+10s):** switch domain → one Atlas Precision Aerostructures decision → 🔴 **HOLD**.
**BACKUP:** 90-second screen recording if wifi fails.

---

## SLIDE 6 — THE GATE · 3:35–3:55 · light ground

**Label:** WHAT'S NEW
**Headline:** We put a checkpoint between the AI and the action.

**Visual:**
```
        AI AGENT
   "Assign Specialist" · 93%
           │
           ▼
   ┌───────────────────────────┐
   │  CAUSAL GATE              │
   │  IS THIS CAUSAL?          │
   │   does evidence support   │
   │   the causal relationship?│
   │  IS IT ROBUST?            │
   │   does the result stay    │
   │   stable under validation?│
   │  IS CONFIDENCE JUSTIFIED? │
   │   does causal support     │
   │   match stated confidence?│
   └──────────┬────────────────┘
       ┌──────┼──────┐
       ▼      ▼      ▼
     PASS  REVIEW   HOLD
   strong  mixed/   weak or
   evidence uncertain contradictory
```

**Payoff:** Most systems explain a decision after it happens. We check it before it happens.

**SPEAKER NOTES (~20s):** "We moved the check in front of the agent. Every decision passes through three questions — is this causal, is it robust, is the confidence justified — and comes out PASS, REVIEW, or HOLD. Most systems explain a decision after it happens. We check it before. And every decision that passes through this gate leaves an auditable record."

---

## SLIDE 7 — THE RECEIPT · 3:55–4:15 · light ground

**Label:** THE ARTIFACT
**Headline:** Every decision gets a causal receipt.

**Contents:**
- What the AI decided
- What the data appeared to show
- What the system found was actually caused
- What would have happened under another decision
- Why the final verdict was reached

**Payoff:** Not a log of what the AI did. A record of the evidence behind the decision.

**SPEAKER NOTES (~20s):** "And it produces this. Not the usual log of inputs and output — a record of the evidence behind the decision: the reported effect, the causal effect, the confounding, the counterfactual, and the verdict. This creates an auditable evidence trail that can be reviewed after the decision."

---

## SLIDE 8 — PROOF · 4:15–4:55 · light ground

**Label:** IS THIS REAL?
**Headline:** We knew the right answer before we ran the test.

**Body:**
- We deliberately created data with a known causal answer.
- We asked the system to recover that answer.
- We tested healthcare and precision manufacturing.
- The same pipeline worked across both domains.

**Visual — grouped bar chart, two clusters:**

*Healthcare — Specialist Assignment → Length of Stay:*
`Dashboard 6.01` · `CausalOCPM 5.25` · `Planted truth 5.27` → **0.4% error**

*Precision Manufacturing — Atlas Precision Aerostructures, Halcyon Forge dependency → Line-Side Delivery Delay:*
`Dashboard 8.78` · `CausalOCPM 6.65` · `Planted truth 6.66` → **0.2% error**

**Payoff:** Same system. Different domain.

**Note (say, don't put on slide):** "Real-world data does not tell us the true counterfactual answer. Creating data with a known causal answer gives us a controlled way to test whether the system can recover it."

**SPEAKER NOTES (~40s):** "We deliberately created data with a known causal answer and asked the system to recover it. In healthcare, the true effect was 5.27 days; we recovered 5.25 — off by 0.4%. We ran the exact same pipeline, unchanged, on precision manufacturing — Atlas Precision Aerostructures, where tight-tolerance titanium parts get routed to one forge and look like the bottleneck — planted 6.66, recovered 6.65, off by 0.2%. Same system, different domain, zero code changes."

---

## SLIDE 9 — FUTURE CONCEPT · 4:55–5:35 · light ground

**Label:** FUTURE CONCEPT
**Headline:** Score the AI itself, not just one decision.

**Body:**
- One audited decision tells us about one decision.
- Many audited decisions could reveal an agent's trust profile.
- Strong evidence could justify more autonomy.
- Weak evidence could keep a human in the loop.

**Visual — two scorecards, real numbers from our own 40-decision benchmark per agent:**
```
CARE COORDINATION AGENT              SOURCING AGENT — ATLAS PRECISION
40 decisions audited                 40 decisions audited

Causal support        87%            Causal support        76%
Would be blocked        0%           Would be blocked       50%

SCORE   74/100                       SCORE   23/100
🟡 SUPERVISED                        🔴 RESTRICTED
keep a human in the loop             not one decision cleared
                                      the gate unreviewed
```

**Payoff:** Don't ask only: how confident is the AI? Ask: how often does its reasoning hold up?

**SPEAKER NOTES (~40s):** "This is a future concept, not a deployed control system — but we ran it on our own benchmark. Score every decision an agent makes, and you get a trust profile. Care Coordination scores 74 — supervised, keep humans in the loop. The Sourcing Agent at Atlas scores 23 — restricted, not one decision cleared the gate without review. Don't ask only how confident the AI is. Ask how often its reasoning actually holds up."

---

## SLIDE 10 — WHERE IT PLUGS IN + CLOSE · 5:35–6:00 · dark ground

**Visual — pipeline:**
```
Existing enterprise systems
        │
        ▼
    CausalOCPM
        │
        ▼
Causal check before autonomous action
        │
        ▼
Decision receipt + evidence
```

**Where it can run:** Healthcare · Aerospace & Precision Manufacturing · Supply Chain · Finance · Multi-Agent Enterprise
*Any workflow where an AI makes a decision and the outcome matters.*

**Close (large):**
Today, an AI's decision can be written down.
Tomorrow, it will have to be justified.

**Final line, spoken last:**
AI should not earn autonomy from confidence alone. It should earn autonomy from evidence.

**SPEAKER NOTES (~25s):** "It runs on the event data enterprise systems already produce. Today, an AI's decision can be written down. Tomorrow, it will have to be justified. AI should not earn autonomy from confidence alone — it should earn autonomy from evidence. Thank you."

---

## APPENDIX A — LIMITATIONS & METHOD (Q&A only, not presented)

- Causal discovery assumes no unmeasured confounders; clinical judgment / unrecorded severity is not in the event log and cannot be ruled out.
- The benchmark is synthetic — it tests whether the method recovers a known truth when its assumptions hold, not whether those assumptions hold on any given real dataset.
- VanderWeele E-value 7.1 (healthcare) / 7.3 (manufacturing): an unmeasured confounder would need a risk-ratio association above ~7 with both treatment and outcome to overturn the result.
- Method stack (say only if asked): object-centric event reconstruction → bootstrapped PC (Fisher-Z, α 0.05, 20 subsamples, ≥60% edge stability) → mixed structural causal model (logistic + gradient boosting) → Double ML (5-fold cross-fitting, GBM nuisance, sandwich SEs) → placebo / random-common-cause refuters → 10-seed robustness.
- "Is the demo live?" — the console renders validated results from the Python engine; the what-if simulator re-solves the structural equations live. Be explicit about the split.
- "How is this different from Signavio/Celonis?" — conformance checking + rule-based what-ifs vs. a fitted causal model with confounding removed and a real counterfactual. Correlation vs. causation.
- "What's genuinely novel?" — not the algorithms; the operational loop and the artifacts (Causal Gate, Causal Confidence Gap, Decision Audit Record, evidence-based autonomy scoring).

## APPENDIX B — THE SOURCING NETWORK (optional 11th slide, deep-dive only)

**Held back unless asked "does this generalize beyond one example."** See prior discussion: Atlas Precision Aerostructures' four-supplier network —
- **Halcyon Forge** — confounded (looks slow, isn't really; the hero case above)
- **Meridian Tool & Die** — the validated counterfactual alternative
- **Vantage Alloys** — illustrates noise vs. signal (placebo test, bootstrap stability catch this)
- **Solaris Components** — illustrates untested extrapolation (CATE across complexity segments catches this)

Payoff line: "We didn't build four case studies. We pointed one engine at a real sourcing network, and it caught four different failure modes without being told what to look for."
