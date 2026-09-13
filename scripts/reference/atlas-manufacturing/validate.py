"""
Atlas Precision Aerostructures — full validation run.

Runs actual causal discovery (bootstrapped PC, causal-learn) and actual
effect estimation (Double ML, cross-fitted gradient boosting, sandwich SEs)
on the freshly generated synthetic log, then checks whether the pipeline
recovers the planted ground truth. Every number in this report is a real
computed output — nothing here is hand-typed.
"""
import numpy as np
import pandas as pd
from itertools import combinations
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.model_selection import KFold
from sklearn.linear_model import LinearRegression

from causallearn.search.ConstraintBased.PC import pc

from generate_data import gen, TRUE_EFFECT, SEED

NODES = [
    "spec_complexity",
    "halcyon_forge",
    "material_lead_time",
    "machine_queue_length",
    "export_flag",
    "approval_duration",
    "carrier_express",
    "line_side_delivery_delay",
]
LABEL = {
    "spec_complexity": "Spec Complexity",
    "halcyon_forge": "Halcyon Forge Dependency",
    "material_lead_time": "Material Lead Time",
    "machine_queue_length": "Machine Queue Length",
    "export_flag": "Export Flag",
    "approval_duration": "Approval Duration",
    "carrier_express": "Express Carrier",
    "line_side_delivery_delay": "Line-Side Delivery Delay",
}
PLANTED_EDGES = {
    ("spec_complexity", "halcyon_forge"),
    ("spec_complexity", "machine_queue_length"),
    ("spec_complexity", "line_side_delivery_delay"),
    ("halcyon_forge", "material_lead_time"),
    ("material_lead_time", "line_side_delivery_delay"),
    ("machine_queue_length", "approval_duration"),
    ("export_flag", "approval_duration"),
    ("approval_duration", "line_side_delivery_delay"),
    ("carrier_express", "line_side_delivery_delay"),
}
ALL_PAIRS = list(combinations(NODES, 2))


def skeleton_adjacency(sub: pd.DataFrame) -> set:
    """Run PC on a subsample, return the set of adjacent (unordered) node pairs."""
    data = sub[NODES].to_numpy(dtype=float)
    cg = pc(data, alpha=0.05, indep_test="fisherz", node_names=NODES, show_progress=False, verbose=False)
    g = cg.G.graph
    n = len(NODES)
    adj = set()
    for i in range(n):
        for j in range(i + 1, n):
            if g[i, j] != 0 or g[j, i] != 0:
                pair = frozenset((NODES[i], NODES[j]))
                adj.add(pair)
    return adj


def bootstrapped_discovery(df: pd.DataFrame, n_runs=20, sub_size=2000, seed=SEED):
    rng = np.random.default_rng(seed + 999)
    freq = {frozenset(p): 0 for p in ALL_PAIRS}
    for _ in range(n_runs):
        sub = df.sample(n=sub_size, random_state=int(rng.integers(0, 1_000_000)))
        adj = skeleton_adjacency(sub)
        for pair in adj:
            if pair in freq:
                freq[pair] += 1
    stability = {pair: cnt / n_runs for pair, cnt in freq.items()}
    return stability


def discovery_metrics(stability: dict, threshold=0.6):
    planted_frozen = {frozenset(p) for p in PLANTED_EDGES}
    discovered = {pair for pair, f in stability.items() if f >= threshold}
    tp = len(discovered & planted_frozen)
    fp = len(discovered - planted_frozen)
    fn = len(planted_frozen - discovered)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    missed = planted_frozen - discovered
    spurious = discovered - planted_frozen
    return {
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "missed": [tuple(sorted(p)) for p in missed],
        "spurious": [tuple(sorted(p)) for p in spurious],
        "discovered_count": len(discovered),
    }


def double_ml(df: pd.DataFrame, treatment_col="halcyon_forge", outcome_col="line_side_delivery_delay",
              controls=("spec_complexity", "export_flag", "carrier_express"), n_folds=5, seed=0):
    """Cross-fitted Double ML: GBM nuisance models, partialling-out estimator, sandwich SE."""
    X = df[list(controls)].to_numpy(dtype=float)
    T = df[treatment_col].to_numpy(dtype=float)
    Y = df[outcome_col].to_numpy(dtype=float)
    n = len(df)

    kf = KFold(n_splits=n_folds, shuffle=True, random_state=seed)
    resid_T = np.zeros(n)
    resid_Y = np.zeros(n)

    for train_idx, test_idx in kf.split(X):
        m_y = GradientBoostingRegressor(n_estimators=150, max_depth=3, learning_rate=0.08, random_state=seed)
        m_y.fit(X[train_idx], Y[train_idx])
        resid_Y[test_idx] = Y[test_idx] - m_y.predict(X[test_idx])

        m_t = GradientBoostingClassifier(n_estimators=150, max_depth=3, learning_rate=0.08, random_state=seed)
        m_t.fit(X[train_idx], T[train_idx])
        prop = m_t.predict_proba(X[test_idx])[:, 1]
        resid_T[test_idx] = T[test_idx] - prop

    denom = np.sum(resid_T ** 2)
    theta = np.sum(resid_T * resid_Y) / denom
    # sandwich (heteroskedasticity-robust) variance
    scores = resid_T * (resid_Y - theta * resid_T)
    var = np.sum(scores ** 2) / (denom ** 2)
    se = np.sqrt(var)
    ci_low, ci_high = theta - 1.96 * se, theta + 1.96 * se
    return {"effect": theta, "se": se, "ci_low": ci_low, "ci_high": ci_high}


def naive_effect(df, treatment_col="halcyon_forge", outcome_col="line_side_delivery_delay"):
    g = df.groupby(treatment_col)[outcome_col].mean()
    return float(g[1] - g[0])


def placebo_test(df, seed=1):
    rng = np.random.default_rng(seed)
    shuffled = df.copy()
    shuffled["halcyon_forge"] = rng.permutation(shuffled["halcyon_forge"].to_numpy())
    return double_ml(shuffled)["effect"]


def random_common_cause_refuter(df, seed=2):
    rng = np.random.default_rng(seed)
    noisy = df.copy()
    noisy["__noise__"] = rng.normal(0, 1, len(noisy))
    return double_ml(noisy, controls=("spec_complexity", "export_flag", "carrier_express", "__noise__"))["effect"]


def e_value(effect, outcome_std):
    """VanderWeele continuous-outcome E-value approximation."""
    d = abs(effect) / outcome_std
    rr = np.exp(0.91 * d)
    if rr < 1:
        rr = 1 / rr
    ev = rr + np.sqrt(rr * (rr - 1))
    return round(ev, 2)


def cate_by_tertile(df, treatment_col="halcyon_forge", outcome_col="line_side_delivery_delay",
                     conf_col="spec_complexity"):
    q = df[conf_col].quantile([0, 1 / 3, 2 / 3, 1]).to_numpy()
    labels = ["Low", "Mid", "High"]
    out = []
    for i, lab in enumerate(labels):
        lo, hi = q[i], q[i + 1]
        seg = df[(df[conf_col] >= lo) & (df[conf_col] <= hi)]
        X = seg[["export_flag", "carrier_express"]].to_numpy(dtype=float)
        T = seg[treatment_col].to_numpy(dtype=float)
        Y = seg[outcome_col].to_numpy(dtype=float)
        reg = LinearRegression().fit(np.column_stack([T, X]), Y)
        effect = reg.coef_[0]
        pred = reg.predict(np.column_stack([T, X]))
        resid = Y - pred
        se = np.sqrt(np.sum(resid ** 2) / (len(Y) - 3)) / (np.std(T) * np.sqrt(len(Y)))
        out.append({"label": f"{lab} ({lo:.1f}–{hi:.1f})", "effect": round(float(effect), 3),
                     "ci_low": round(float(effect - 1.96 * se), 3), "ci_high": round(float(effect + 1.96 * se), 3)})
    return out


def structural_recovery(df):
    """Refit the mediator/outcome structural equations, report CV-R2 and coefficient error."""
    from sklearn.model_selection import cross_val_score

    reg = LinearRegression().fit(df[["halcyon_forge"]], df["material_lead_time"])
    coef_treat = reg.coef_[0]

    X_out = df[["material_lead_time", "approval_duration", "carrier_express", "spec_complexity"]]
    Y_out = df["line_side_delivery_delay"]
    gbm = GradientBoostingRegressor(n_estimators=200, max_depth=3, learning_rate=0.06, random_state=0)
    r2_scores = cross_val_score(gbm, X_out, Y_out, cv=5, scoring="r2")

    from generate_data import COEF_TREAT_TO_MLT, COEF_MLT_TO_DELAY

    lin_out = LinearRegression().fit(X_out, Y_out)
    coef_mlt_err = abs(lin_out.coef_[0] - COEF_MLT_TO_DELAY) / COEF_MLT_TO_DELAY * 100
    coef_treat_err = abs(coef_treat - COEF_TREAT_TO_MLT) / COEF_TREAT_TO_MLT * 100

    return {
        "cv_r2": round(float(np.mean(r2_scores)), 3),
        "avg_coef_error_pct": round(float(np.mean([coef_mlt_err, coef_treat_err])), 2),
    }


def confounding_sensitivity_sweep(df, strengths=(0.05, 0.1, 0.15, 0.2, 0.25, 0.3), seed=5):
    """Inject a synthetic unmeasured confounder U at increasing strength
    (correlated with both treatment and outcome), withhold it from the
    DML controls (as if it were truly unmeasured), and record how the
    recovered estimate degrades. This is the sweep used for the
    'how strong would a hidden confounder need to be' sensitivity chart."""
    rng = np.random.default_rng(seed)
    u = rng.normal(0, 1, len(df))
    out = []
    for s in strengths:
        biased = df.copy()
        # U nudges treatment probability and adds directly to outcome, at
        # increasing strength s (fraction of the observed effect's scale)
        biased["halcyon_forge"] = np.where(
            rng.random(len(df)) < s, (u > 0).astype(int), biased["halcyon_forge"]
        )
        biased["line_side_delivery_delay"] = biased["line_side_delivery_delay"] + s * 6 * u
        est = double_ml(biased)["effect"]
        out.append(round(float(est), 2))
    return list(strengths), out


def ten_seed_robustness(n_seeds=10):
    causal, naive = [], []
    for s in range(n_seeds):
        import importlib
        import generate_data as gd
        gd.SEED = 90000 + s * 137
        gd.rng = np.random.default_rng(gd.SEED)
        df_s = gd.gen()
        causal.append(double_ml(df_s)["effect"])
        naive.append(naive_effect(df_s))
    return {
        "causal_mean": round(float(np.mean(causal)), 3),
        "causal_std": round(float(np.std(causal)), 3),
        "causal_lo": round(float(np.min(causal)), 3),
        "causal_hi": round(float(np.max(causal)), 3),
        "naive_lo": round(float(np.min(naive)), 3),
        "naive_hi": round(float(np.max(naive)), 3),
    }


def main():
    df = gen()
    lines = []
    def p(s=""):
        print(s)
        lines.append(s)

    p("=" * 70)
    p("ATLAS PRECISION AEROSTRUCTURES — VALIDATION REPORT")
    p(f"rows={len(df)}  seed={SEED}  captured=2026-09-13")
    p("=" * 70)

    naive = naive_effect(df)
    p(f"\n[1] NAIVE GROUP-MEAN DIFFERENCE (Halcyon Forge vs. rest)")
    p(f"    naive effect            = {naive:.3f} days")

    p(f"\n[2] BOOTSTRAPPED PC DISCOVERY (Fisher-Z, alpha=0.05, 20 subsamples x 2000 rows)")
    stability = bootstrapped_discovery(df)
    dm = discovery_metrics(stability)
    p(f"    precision={dm['precision']}  recall={dm['recall']}  F1={dm['f1']}")
    p(f"    true positives={dm['tp']}  false positives={dm['fp']}  false negatives={dm['fn']}")
    p(f"    missed edges: {[(LABEL[a], LABEL[b]) for a, b in dm['missed']]}")
    p(f"    spurious edges: {[(LABEL[a], LABEL[b]) for a, b in dm['spurious']]}")
    p(f"    edge stability (planted pairs):")
    for a, b in sorted(PLANTED_EDGES):
        f = stability.get(frozenset((a, b)), 0.0)
        p(f"      {LABEL[a]:26s} -- {LABEL[b]:26s}  {f*100:5.1f}%")

    p(f"\n[3] DOUBLE ML EFFECT ESTIMATION (5-fold cross-fit, GBM nuisance, sandwich SE)")
    ml = double_ml(df)
    err_pct = abs(ml["effect"] - TRUE_EFFECT) / TRUE_EFFECT * 100
    p(f"    planted true effect     = {TRUE_EFFECT:.3f} days")
    p(f"    Double ML estimate      = {ml['effect']:.3f} days  (95% CI [{ml['ci_low']:.3f}, {ml['ci_high']:.3f}])")
    p(f"    recovery error          = {err_pct:.2f}%")
    p(f"    naive vs causal gap     = {naive - ml['effect']:.3f} days  ({(naive - ml['effect']) / naive * 100:.1f}% of naive)")

    p(f"\n[4] REFUTATION TESTS")
    placebo = placebo_test(df)
    p(f"    placebo (permuted treatment) effect = {placebo:+.3f} days  (expect ~0)")
    rcc = random_common_cause_refuter(df)
    p(f"    random-common-cause re-estimate      = {rcc:.3f} days  (expect stable near {ml['effect']:.2f})")

    outcome_std = float(df["line_side_delivery_delay"].std())
    ev = e_value(ml["effect"], outcome_std)
    p(f"    VanderWeele E-value                  = {ev}")

    p(f"\n[5] CATE BY SPEC-COMPLEXITY TERTILE")
    cate = cate_by_tertile(df)
    for seg in cate:
        p(f"    {seg['label']:16s} effect={seg['effect']:+.3f}  CI=[{seg['ci_low']:+.3f}, {seg['ci_high']:+.3f}]")

    p(f"\n[6] STRUCTURAL COEFFICIENT RECOVERY")
    sr = structural_recovery(df)
    p(f"    outcome model 5-fold CV-R2           = {sr['cv_r2']}")
    p(f"    avg structural-coefficient error     = {sr['avg_coef_error_pct']}%")

    p(f"\n[7] CONFOUNDING SENSITIVITY SWEEP")
    strengths, sweep = confounding_sensitivity_sweep(df)
    for s, e in zip(strengths, sweep):
        p(f"    assumed hidden-confounder strength {s:.2f}  ->  estimate {e:.2f} days")

    p(f"\n[8] 10-SEED ROBUSTNESS (fresh dataset regenerated 10x, full estimation rerun)")
    tenseed = ten_seed_robustness()
    p(f"    causal estimate  = {tenseed['causal_mean']} +/- {tenseed['causal_std']}  "
      f"range [{tenseed['causal_lo']}, {tenseed['causal_hi']}]")
    p(f"    naive estimate range = [{tenseed['naive_lo']}, {tenseed['naive_hi']}]")

    p("\n" + "=" * 70)
    p("SUMMARY")
    p("=" * 70)
    p(f"Planted true effect:     {TRUE_EFFECT:.3f} days")
    p(f"Naive dashboard:         {naive:.3f} days")
    p(f"Double ML recovered:     {ml['effect']:.3f} days  ({err_pct:.2f}% error)")
    p(f"Discovery F1:            {dm['f1']}  (precision {dm['precision']}, recall {dm['recall']})")
    p(f"E-value:                 {ev}")
    p(f"Placebo:                 {placebo:+.3f}")
    p(f"10-seed:                 {tenseed['causal_mean']} +/- {tenseed['causal_std']}")

    with open("validate-report.txt", "w") as f:
        f.write("\n".join(lines))

    # machine-readable summary for the Next.js fixture builder
    import json
    summary = {
        "seed": SEED, "rows": len(df),
        "trueEffect": TRUE_EFFECT, "naiveEffect": round(naive, 3),
        "dmlEffect": round(ml["effect"], 3), "dmlCiLow": round(ml["ci_low"], 3), "dmlCiHigh": round(ml["ci_high"], 3),
        "discovery": dm,
        "edgeStability": {f"{LABEL[a]} -> {LABEL[b]}": round(stability.get(frozenset((a, b)), 0.0), 3) for a, b in sorted(PLANTED_EDGES)},
        "placebo": round(placebo, 3), "randomCommonCause": round(rcc, 3), "eValue": ev,
        "cate": cate,
        "structuralRecovery": sr,
        "sensitivitySweep": {"strengths": strengths, "estimates": sweep},
        "tenSeed": tenseed,
        "outcomeStd": round(outcome_std, 3),
        "outcomeMean": round(float(df["line_side_delivery_delay"].mean()), 3),
        "treatedPct": round(float(df["halcyon_forge"].mean()) * 100, 1),
    }
    with open("validate-summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print("\nwrote validate-report.txt and validate-summary.json")


if __name__ == "__main__":
    main()
