# Atlas Precision Aerostructures — reference-run evidence

Every manufacturing number in the console is the actual output of a from-scratch run of
`scripts/reference/atlas-manufacturing/{generate_data,validate}.py` — **real** bootstrapped
PC discovery (`causal-learn`) and **real** Double ML effect estimation (5-fold cross-fitted
`sklearn` gradient boosting, sandwich SEs), not hand-typed figures. Captured 2026-09-13.

This replaces the old "Supplier A / Northwind" dataset (docs/reference-run/prihir_synthetic.csv.gz,
docs/reference-run/validate-report.txt, docs/reference-run/discovery-ablation.txt — kept for
history, no longer used by the app).

## Files
| File | What it is |
|---|---|
| `validate-report.txt` | Full run output — discovery metrics, Double ML estimate, refutation tests, CATE, structural recovery, the confounding sensitivity sweep, 10-seed robustness |
| `validate-summary.json` | The same numbers, machine-readable — this is what `scripts/lib/domainConfig.ts`'s manufacturing spec was transcribed from |
| `atlas_precision_synthetic.csv.gz` | The generated 20,000-row event log (seed 71831) |

## Headline numbers

| | Value |
|---|---|
| Planted true effect (Halcyon Forge → delay, mediated) | **5.78 days** |
| Naive group-mean difference | **7.605 days** |
| Double ML estimate | **6.175 days** · 95% CI [6.077, 6.272] · error **6.83%** |
| Confounding removed | 1.43 days (18.8% of naive) |
| Autonomous discovery | precision 1.00 · recall 0.889 · **F1 0.941** · 0 spurious |
| Missed edge | Spec Complexity → Halcyon Forge Dependency — a **threshold effect** (flat below the tight-tolerance cutoff, then a step up), not a smooth trend, so Fisher-Z's linear test barely sees it even though the dependency is real |
| Structural model | 5-fold CV-R² 0.734 · avg coefficient recovery error 3.15% |
| Placebo test | −0.009 ≈ 0 |
| Random common cause | 6.169 (stable) |
| VanderWeele E-value | 5.72 |
| 10-seed robustness | causal 6.104 ± 0.039, range [6.055, 6.180]; naive range [7.433, 7.564] |
| CATE by spec-complexity tertile | Low +6.37 · Mid +6.11 · High +7.51 (rises sharply where the threshold concentrates Halcyon's book) |

## Why this dataset exists

The manufacturing scenario was originally a generic "Supplier A / Supplier B" story. It was
rebranded to a named precision-aerospace sourcing network (Atlas Precision Aerostructures —
Halcyon Forge, Meridian Tool & Die, Vantage Alloys, Solaris Components) for the pitch. Rather
than relabel the *old* validated numbers under new names, this is a genuinely fresh run: new
seed, new sample size (20,000 vs the old 15,000), new planted coefficients, and a deliberately
different (and arguably harder to detect) confounding mechanism — a threshold/step effect
instead of a smooth sigmoid, because a large-enough sample can still linearly detect a smooth
monotonic trend.

## Reproduce

```bash
cd scripts/reference/atlas-manufacturing
python generate_data.py   # writes atlas_precision_synthetic.csv
python validate.py        # writes validate-report.txt + validate-summary.json
```

Requires `numpy`, `pandas`, `scikit-learn`, `causal-learn`.
