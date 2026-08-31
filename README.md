# CausalOCPM — A Causal Audit Layer for Agentic AI Decisions

> When AI agents make autonomous decisions, who explains the consequences?

CausalOCPM is a causal-reasoning console for transparent, explainable, and accountable
autonomous business processes. It combines **Object-Centric Process Mining** with
**Structural Causal Models** and **counterfactual reasoning** to reconstruct AI decision
pathways from event logs, discover the true causal drivers of outcomes, estimate their
effects free of confounding, and simulate "what if we had done differently?".

**Live pitch:** Explain · Predict · Simulate.
Shortlisted — AI Innovation Idea Hack, MIT Manipal.

---

## What's in the box

A premium Next.js 15 decision-intelligence console with a 7-view workspace over two
self-contained synthetic scenarios:

| Domain | Tenant | Outcome | Confounder recovered |
| --- | --- | --- | --- |
| **Manufacturing** | Northwind Components Co. | Shipment Delay (days) | Peak-Season Demand inflates supplier correlation ~19% |
| **Healthcare** | Meridian Health System | Discharge Delay (days) | Patient acuity inflates specialist-latency correlation ~15.5% |

_(The old `prihir_synthetic.csv` reference from the original prototype is gone — both
datasets are freshly designed here with planted ground truth.)_

### Views

1. **Overview** — AI executive summary, KPIs, top driver, savings potential.
2. **Data & Discovery** — datasets, variables, discovered causal links, data quality, causal-graph preview, OCEL-style sample events.
3. **Model Performance** — DAG-recovery precision/recall/F1, bootstrap stability, causal-effect accuracy vs planted truth, confounding removed per driver.
4. **Case Inspector** — per-case SHAP-style attribution, counterfactual estimate, similar cases.
5. **Decision Intelligence** — ranked recommended actions with ROI, projected impact trend, an interactive impact simulator, action log.
6. **Copilot** — grounded decision-intelligence assistant (live Claude when `ANTHROPIC_API_KEY` is set, deterministic grounded fallback otherwise).
7. **Settings** — scenario configuration and pipeline toggles.

---

## The pipeline

```
Event Logs → Object Graph → Causal Discovery (DAG) → Structural Causal Model → Counterfactual Simulation & Attribution
```

The offline builder (`scripts/build-causal-fixtures.ts`) synthesises each scenario from
planted causal ground truth, runs the confounding-vs-recovered-effect logic, and validates
the output against a shared Zod contract (`lib/engine/types.ts`) before writing
`lib/data/<domain>.json`. It runs automatically on `prebuild`, so Vercel always ships a
validated fixture.

---

## Run locally

```bash
npm install
npm run gen:data      # regenerate the two validated fixtures (optional; prebuild does this)
npm run dev           # http://localhost:3000
```

Optional — live Copilot:

```bash
cp .env.example .env.local
# set ANTHROPIC_API_KEY=...
```

---

## Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import it in Vercel — framework auto-detected as **Next.js**, no config needed.
3. (Optional) add `ANTHROPIC_API_KEY` as an environment variable for the live Copilot.
4. Deploy. `prebuild` regenerates and validates fixtures during the Vercel build.

Or from the CLI:

```bash
npm i -g vercel
vercel
```

---

## Tech

Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Recharts · Framer Motion · Zod ·
`@anthropic-ai/sdk`. Design language: warm-paper + forest-green editorial, Fraunces display
/ Inter text.
