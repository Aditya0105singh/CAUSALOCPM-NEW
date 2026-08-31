# Defending CausalOCPM — presenter's Q&A

The questions a judge is likely to ask about the causal methodology and the
"is it actually running" gap — and the answer to **lead with** for each. Say the
bold line first; expand only if pushed. Numbers here match the console and the
executive report. A styled version of this sheet is also published as an Artifact.

---

## The 30-second answer

> Traditional process mining confuses correlation with causation. A factory sees
> Supplier A next to long delays and drops it — and the delays don't move, because
> the real reason was that complex orders were routed to Supplier A and are just
> slower. CausalOCPM builds the causal graph from the event log, removes that
> confounding with Double Machine Learning, and recovers the true effect: **6.6
> days**, not the **7.84** a dashboard reports. Then it simulates what actually
> helps and prices it — **~$479K/yr**. Same pipeline, no changes, works on a
> hospital's length-of-stay data too.

## If you only hold three lines

1. **Lead with effect recovery, not F1.** "We planted 6.66, the pipeline recovered
   6.6, a naive estimate would say 7.84." The whole thesis in one sentence.
2. **"Is it real?" → "It's synthetic data with a known answer — that's the point."**
   You cannot validate causal inference on real data because you never observe the
   counterfactual.
3. **Novelty in one line:** first framework to unify object-centric process mining
   with structural causal models — discovery, confounding adjustment,
   counterfactuals, and case attribution as one pipeline.

---

## 1 · The method

### Why can't you just use correlation to find the root cause? · *Common*
**Say first:** Correlation carries the effect of everything you didn't measure.

In our manufacturing log, complex orders are preferentially routed to Supplier A
*and* take longer regardless of supplier. That shared cause — order complexity —
inflates the raw Supplier A → delay correlation by about 18%. Act on it, drop
Supplier A, and the delay barely moves, because you treated a symptom. CausalOCPM
finds that confounding path and adjusts it out.

### Why the PC algorithm for causal discovery? · *Likely*
**Say first:** It's constraint-based — fast, and it assumes no functional form.

PC starts from a fully connected graph and removes edges that fail a
conditional-independence test (Fisher's Z, α = 0.05). We bootstrap it — 20
subsamples of 2,000 rows — and keep only edges stable in ≥ 60% of runs. That
deliberately trades recall for trustworthiness: the last thing we want is a
hallucinated causal link.

### Why Double Machine Learning in Phase 4, not plain backdoor regression? · *Curveball*
**Say first:** Real confounding is nonlinear, and DML partials it out without
assuming linearity.

Standard backdoor regression assumes confounders affect the treatment and the
outcome linearly. Ours don't — the planted confounding edge is a sigmoid. DML
cross-fits gradient-boosted models to residualise *both* the treatment and the
outcome (5-fold, so no fold predicts its own training data), then regresses the
residuals on each other. It's Neyman-orthogonal, so first-stage regularisation
bias cancels; it's semi-parametrically efficient; and the sandwich
(Eicker–Huber–White) standard errors are honest. That's the theory behind the
6.6 ± CI [6.31, 6.89] estimate.

### Why a "mixed" SCM instead of linear regression everywhere? · *Likely*
**Say first:** A linear model on a binary variable can predict probabilities
below 0 or above 1.

We map Logistic Regression to binary nodes and Gradient Boosting to the
continuous outcome. Fitting linear regression to a binary node is the Linear
Probability Model — mathematically broken. A mixed SCM keeps every structural
equation valid.

---

## 2 · Is it real, or a mockup?

### Are these numbers computed live, or hard-coded? · *Common*
**Say first:** The console renders a validated synthetic benchmark; the
algorithms that produce it are the Python pipeline in the repo.

This is deliberate. We built two synthetic event logs where we *planted* the
causal DAG and its coefficients, so we can measure whether the pipeline recovers
a truth we already know. The console presents that benchmark. The bootstrapped
PC, Double ML, and SHAP implementations live in `src/phase2–5`.

**If they push:** The honest headline isn't "the UI is live" — it's "on data
with a known answer, Double ML recovered 6.6 days against a planted 6.66, under
1% error, while the naive estimate was off by 18%." That is the claim a demo on
real data physically cannot make.

### Why synthetic data? Why not a real log like BPI 2019? · *Likely*
**Say first:** On real data you never observe the counterfactual, so you can't
prove the method is right.

Causal validation *requires* ground truth. We plant a nonlinear confounding edge
(`order_complexity → supplier_a`, sigmoid steepness 0.7 — tuned so it is genuinely
too nonlinear for PC to find alone), plus realistic mess: ~2% outliers, concept
drift after row 10,000, Q4 seasonal pressure, business-hour-weighted irregular
timestamps. Then we check recovery with `validate.py`.

### So what runs when I click the simulator? · *Likely*
**Say first:** A structural model that re-solves the causal graph every time you
move a lever.

Each lever maps to a node in the DAG. Moving it propagates through the fitted
structural equations — treatment → mediator → outcome — and the predicted delay,
the mediator states, the ROI and the savings all recompute from those equations,
not from a lookup table. The waterfall is the per-path contribution decomposition.

---

## 3 · The numbers

### Your discovery F1 is 0.89. A competitor's README claims 1.0. · *Curveball — you want this one*
**Say first:** 0.89 is the honest autonomous number. 1.0 would mean we overfit,
or we're grading ourselves.

Bootstrapped PC finds 8 of our 9 planted edges. The one it misses is the
nonlinear sigmoid — Fisher's Z tests *linear* conditional independence, so that
edge is mathematically invisible to the algorithm no matter how much data you
give it. PC also keeps one spurious edge that scraped past the bootstrap
threshold. Domain knowledge then does two jobs: it asserts the one known-true
edge, and it prunes the one spurious edge. We report that as **expert-corrected
structure** — never as a discovery score, because measuring recovery of edges you
just hand-added is circular. A "1.000" on this metric is that circular number.

### How do I know the effect estimate isn't cherry-picked? · *Likely*
**Say first:** E-value 4.7, placebo test ≈ 0, and it holds across 10 fresh random
seeds.

The E-value 4.7 means an unmeasured confounder would have to be about as strongly
associated with *both* Supplier A and delay as Supplier A's own effect — before
the result could be explained away. Permuting the treatment (placebo) gives ≈ 0,
as it should. Adding a random noise confounder barely moves the estimate. And
regenerating the dataset 10 times with new seeds returns the same effect within a
small standard deviation.

### Isn't "$479K a year" a made-up figure? · *Common*
**Say first:** It's reduction × cost-per-delay-day × in-scope volume — all three
shown on the report, all configurable.

A 20.5% reduction on an 8.2-day baseline is 1.68 days; roughly 297 in-scope
shipments a year at $960 per delay-day. Change any parameter and the figure
recomputes. The point isn't the exact dollar amount — it's that a *causal*
estimate lets you attach a defensible number at all, where a correlation would
give you a wrong one.

### Why does the naive number differ from the poster's? · *Curveball*
**Say first:** 7.84 is the actual group-mean difference in our 15,000-row log —
measured, not quoted.

Earlier framing rounded it to "~8 days" or expressed the bias as "~20% inflation."
The console shows the exact figure the data produces: naive 7.84, causal 6.6, so
the bias removed is 1.24 days — 18% above the true effect. All three are on
screen so nothing is taken on trust.

---

## 4 · Product & scope

### What's genuinely novel here? · *Common*
**Say first:** First framework to put object-centric process mining and
structural causal models in one pipeline.

Process mining tells you what happened across many interacting object types —
orders, machines, workers, materials, shipments, not just a case ID. SCM tells
you what causes what. Nobody had connected OCEL 2.0 logs → causal DAG →
counterfactual simulation → case-level attribution as a single flow. Celonis does
rule-based what-ifs; it has no causal discovery and no confounding adjustment.

### Does it generalise, or is it two hand-tuned demos? · *Likely*
**Say first:** Same five phases, zero code changes, reproduces on manufacturing
and healthcare.

Manufacturing: supplier choice confounded by order complexity. Healthcare:
specialist assignment confounded by patient acuity. Different domains, different
confounders, one pipeline — F1 0.89 and sub-1.5% effect error on both. The next
step is an "upload your own event log" path that runs the same pipeline on an
arbitrary CSV or OCEL file.

### What would you build next? · *Common*
**Say first:** Bring-your-own-data upload, then scale the estimator past 10M rows.

Upload flow first — data-quality audit, then the same discovery and estimation on
the user's log. Then swap Scikit-learn's gradient boosting for LightGBM and
parallelise the K-fold cross-fitting with Joblib, so Phase 4 stays interactive on
production-scale data. Longer term: a live connector so the causal layer runs
continuously over a streaming event log.

### Why a Next.js console instead of the Streamlit dashboard? · *Likely*
**Say first:** The console is the decision-intelligence layer; the Python stays
the engine.

Streamlit is the fastest way to expose a data-science pipeline, and the reference
build uses it. For a product surface — guided walkthrough, an interactive causal
graph you can drag and trace, a printable executive report — a real front end
gives finer control over the presentation. The causal work is unchanged.
